<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PricingAgreementResource;
use App\Models\PricingAgreement;
use App\Models\PricingAgreementItem;
use App\Models\PricingAgreementVersion;
use App\Models\Product;
use App\Models\User;
use App\Notifications\EdgeRxNotification;
use App\Notifications\Recipients;
use App\Services\PriceResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Phase D2 — locked-price agreements between a customer and a supplier.
 *
 * Lifecycle: DRAFT → PENDING_CUSTOMER → PENDING_ADMIN → ACTIVE → (EXPIRED|TERMINATED)
 */
class PricingAgreementsController extends Controller
{
    public function __construct(private PriceResolver $resolver) {}

    /**
     * GET /api/pricing-agreements
     *
     * Scoping:
     *   ADMIN     → all
     *   SUPPLIER  → where supplier_id = me
     *   CUSTOMER  → where customer_id = me OR scope=MASTER_AND_CHILDREN includes me
     *   MASTER    → where customer_id = me OR any of my children appear in scoped_pharmacy_ids
     */
    public function index(Request $request)
    {
        $u = $request->user();
        $q = PricingAgreement::with(['customer', 'supplier', 'items.product']);

        if ($u->isAdmin()) {
            // no scope
        } elseif ($u->isSupplier()) {
            $q->where('supplier_id', $u->id);
        } elseif ($u->isCustomer()) {
            $q->where(function ($q2) use ($u) {
                $q2->where('customer_id', $u->id);
                // (customer can't see their master's agreements unless scope includes them — implicit via direct customer_id check)
            });
        } elseif ($u->isPharmacyMaster()) {
            $childIds = $u->masterOf()->pluck('users.id')->all();
            $q->where(function ($q2) use ($u, $childIds) {
                $q2->where('customer_id', $u->id)
                   ->orWhereIn('customer_id', $childIds);
            });
        } else {
            return PricingAgreementResource::collection(collect());
        }

        return PricingAgreementResource::collection($q->orderByDesc('created_at')->get());
    }

    public function show(Request $request, $id)
    {
        $a = PricingAgreement::with(['customer', 'supplier', 'items.product'])->findOrFail($id);
        $this->authorizeView($request, $a);
        return new PricingAgreementResource($a);
    }

    /**
     * POST /api/pricing-agreements (supplier creates DRAFT)
     */
    public function store(Request $request)
    {
        $u = $request->user();
        if (!$u->isSupplier() && !$u->isAdmin()) abort(403, 'Only suppliers may draft agreements.');

        $data = $request->validate([
            'customerId'              => 'required|string|exists:users,id',
            'validFrom'               => 'required|date',
            'validTo'                 => 'required|date|after:validFrom',
            'autoRenew'               => 'nullable|boolean',
            'renewNoticeDays'         => 'nullable|integer|min:1|max:365',
            'moqFallbackMode'         => 'nullable|in:FALLBACK_CATALOG,BLOCK,SPLIT',
            'scope'                   => 'nullable|in:CUSTOMER_ONLY,MASTER_AND_CHILDREN,SPECIFIC_CHILDREN',
            'scopedPharmacyIds'       => 'nullable|array',
            'scopedPharmacyIds.*'     => 'string|exists:users,id',
            'bonusesApply'            => 'nullable|boolean',
            'notes'                   => 'nullable|string|max:2000',

            'items'                   => 'required|array|min:1|max:200',
            'items.*.productId'       => 'required|string|exists:products,id',
            'items.*.unitPrice'       => 'required|numeric|min:0|max:1000000',
            'items.*.minOrderQuantity'        => 'nullable|integer|min:1|max:1000000',
            'items.*.maxPeriodQuantity'       => 'nullable|integer|min:1|max:100000000',
            'items.*.committedPeriodQuantity' => 'nullable|integer|min:0|max:100000000',
            'items.*.tierBreaks'              => 'nullable|array',
            'items.*.tierBreaks.*.qty'        => 'required_with:items.*.tierBreaks|integer|min:1',
            'items.*.tierBreaks.*.price'      => 'required_with:items.*.tierBreaks|numeric|min:0',
        ]);

        // Suppliers may only create agreements for products they own
        $productIds = collect($data['items'])->pluck('productId')->unique()->all();
        $myProductIds = Product::where('supplier_id', $u->isSupplier() ? $u->id : null)->whereIn('id', $productIds)->pluck('id')->all();
        if ($u->isSupplier() && count($myProductIds) !== count($productIds)) {
            abort(422, 'One or more products are not owned by you.');
        }

        $supplierId = $u->isSupplier() ? $u->id : (Product::find($productIds[0])?->supplier_id);
        if (!$supplierId) abort(422, 'Cannot determine supplier.');

        $a = null;
        DB::transaction(function () use ($data, $supplierId, &$a) {
            $a = PricingAgreement::create([
                'customer_id'         => $data['customerId'],
                'supplier_id'         => $supplierId,
                'status'              => 'DRAFT',
                'valid_from'          => $data['validFrom'],
                'valid_to'            => $data['validTo'],
                'auto_renew'          => $data['autoRenew'] ?? false,
                'renew_notice_days'   => $data['renewNoticeDays'] ?? 30,
                'moq_fallback_mode'   => $data['moqFallbackMode'] ?? 'FALLBACK_CATALOG',
                'scope'               => $data['scope'] ?? 'CUSTOMER_ONLY',
                'scoped_pharmacy_ids' => $data['scopedPharmacyIds'] ?? null,
                'bonuses_apply'       => $data['bonusesApply'] ?? true,
                'notes'               => $data['notes'] ?? null,
            ]);
            foreach ($data['items'] as $line) {
                PricingAgreementItem::create([
                    'pricing_agreement_id'      => $a->id,
                    'product_id'                => $line['productId'],
                    'unit_price'                => $line['unitPrice'],
                    'min_order_quantity'        => $line['minOrderQuantity'] ?? 1,
                    'max_period_quantity'       => $line['maxPeriodQuantity'] ?? null,
                    'committed_period_quantity' => $line['committedPeriodQuantity'] ?? null,
                    'tier_breaks'               => $line['tierBreaks'] ?? null,
                ]);
            }
        });

        return (new PricingAgreementResource($a->load(['customer', 'supplier', 'items.product'])))
            ->response()->setStatusCode(201);
    }

    /** POST /api/pricing-agreements/{id}/send — supplier sends DRAFT → PENDING_CUSTOMER */
    public function sendToCustomer(Request $request, $id)
    {
        $a = PricingAgreement::findOrFail($id);
        $this->expectSupplierOrAdmin($request, $a);
        if ($a->status !== 'DRAFT') abort(422, 'Only DRAFT agreements can be sent.');

        $a->update([
            'status'              => 'PENDING_CUSTOMER',
            'sent_to_customer_at' => now(),
        ]);
        $this->notifyCustomerForReview($a);
        return new PricingAgreementResource($a->load(['customer', 'supplier', 'items.product']));
    }

    /** POST /api/pricing-agreements/{id}/sign — customer counter-signs PENDING_CUSTOMER → PENDING_ADMIN */
    public function customerSign(Request $request, $id)
    {
        $u = $request->user();
        $a = PricingAgreement::findOrFail($id);
        if (!$u->isCustomer() || $u->id !== $a->customer_id) abort(403, 'Only the named customer may sign.');
        if ($a->status !== 'PENDING_CUSTOMER') abort(422, 'Not awaiting customer signature.');

        $data = $request->validate([
            // C-2 fix: signedPdfPath must look like an upload path or absolute URL,
            // not arbitrary text. We don't yet verify the file exists in storage
            // (depends on uploads pipeline) but we shape-validate.
            'signedPdfPath' => [
                'required', 'string', 'max:1000',
                'regex:#^(/uploads/|/storage/|https?://).+\.(pdf|PDF)$#',
            ],
        ]);

        $a->update([
            'status'                 => 'PENDING_ADMIN',
            'signed_by_customer_at'  => now(),
            'signed_pdf_path'        => $data['signedPdfPath'],
        ]);
        $this->notifyAdminForApproval($a);
        return new PricingAgreementResource($a->load(['customer', 'supplier', 'items.product']));
    }

    /** POST /api/admin/pricing-agreements/{id}/approve — admin activates */
    public function adminApprove(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) abort(403, 'Forbidden.');
        $a = PricingAgreement::with('items')->findOrFail($id);
        if ($a->status !== 'PENDING_ADMIN') abort(422, 'Not awaiting admin approval.');

        DB::transaction(function () use ($a, $request) {
            $a->update([
                'status'                 => 'ACTIVE',
                'approved_by_admin_at'   => now(),
                'approved_by_admin_id'   => $request->user()->id,
            ]);
            // Snapshot v1 (and any future amendments)
            PricingAgreementVersion::create([
                'pricing_agreement_id' => $a->id,
                'version'              => $a->version,
                'snapshot'             => [
                    'agreement' => $a->toArray(),
                    'items'     => $a->items->toArray(),
                ],
                'activated_at'         => now(),
            ]);
        });
        $this->notifyBothOfActivation($a);
        return new PricingAgreementResource($a->fresh()->load(['customer', 'supplier', 'items.product']));
    }

    /** POST /api/admin/pricing-agreements/{id}/reject */
    public function adminReject(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) abort(403, 'Forbidden.');
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $a = PricingAgreement::findOrFail($id);
        if ($a->status !== 'PENDING_ADMIN') abort(422, 'Not awaiting admin approval.');

        $a->update(['status' => 'DRAFT', 'notes' => trim(($a->notes ?? '') . "\n[Admin rejection] " . $data['reason'])]);
        $this->notifySupplierOfAdminReject($a, $data['reason']);
        return new PricingAgreementResource($a->load(['customer', 'supplier', 'items.product']));
    }

    /** POST /api/pricing-agreements/{id}/terminate — early termination (with notice). */
    public function terminate(Request $request, $id)
    {
        $u = $request->user();
        $a = PricingAgreement::findOrFail($id);
        $isParty = ($u->id === $a->customer_id) || ($u->id === $a->supplier_id) || $u->isAdmin();
        if (!$isParty) abort(403, 'Forbidden.');
        if ($a->status !== 'ACTIVE') abort(422, 'Only ACTIVE agreements can be terminated.');

        $data = $request->validate(['reason' => 'required|string|max:500']);
        $a->update([
            'status'             => 'TERMINATED',
            'terminated_at'      => now(),
            'termination_reason' => $data['reason'],
        ]);
        $this->notifyAllOfTermination($a, $data['reason']);
        return new PricingAgreementResource($a);
    }

    /** GET /api/pricing/quote — frontend cart calls this per-line to get the resolved price. */
    public function quote(Request $request)
    {
        $u = $request->user();
        if (!$u->isCustomer() && !$u->isPharmacyMaster()) abort(403, 'Only pharmacies can request a quote.');

        $data = $request->validate([
            'productId'  => 'required|string|exists:products,id',
            'quantity'   => 'required|integer|min:1|max:1000000',
            'pharmacyId' => 'nullable|string|exists:users,id', // master places on behalf of child
        ]);

        $forUserId = $data['pharmacyId'] ?? $u->id;

        // BE-8 fix: when a Pharmacy Master asks for a quote on behalf of a
        // pharmacyId, that pharmacy MUST be one of their child accounts.
        // Without this gate, a master could probe contract pricing for any
        // pharmacy in the system — a privacy leak (reveals which suppliers
        // a competing pharmacy has agreements with, and at what price).
        if ($forUserId !== $u->id) {
            // Anyone other than self requires master + ownership.
            if (!$u->isPharmacyMaster() || !$u->ownsPharmacy($forUserId)) {
                return response()->json([
                    'message' => 'You do not own that pharmacy and cannot request quotes for it.',
                    'errors'  => ['pharmacyId' => ['Forbidden — pharmacy not under your management.']],
                ], 403);
            }
        }

        $product = Product::findOrFail($data['productId']);
        $supplierId = $product->supplier_id;
        if (!$supplierId) abort(422, 'Product has no supplier.');

        try {
            $result = $this->resolver->resolve($forUserId, $supplierId, $product->id, (int) $data['quantity']);
        } catch (\DomainException $e) {
            // C-7 fix: return the standard {message, errors} shape so SPA error
            // handling is uniform across endpoints.
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['quantity' => [$e->getMessage()]],
            ], 422);
        }
        return $result;
    }

    /* ────────── helpers ────────── */

    private function authorizeView(Request $request, PricingAgreement $a): void
    {
        $u = $request->user();
        if ($u->isAdmin()) return;
        if ($u->id === $a->supplier_id) return;
        if ($u->id === $a->customer_id) return;
        if ($u->isPharmacyMaster()) {
            $childIds = $u->masterOf()->pluck('users.id');
            if ($childIds->contains($a->customer_id)) return;
            if (in_array($u->id, $a->scoped_pharmacy_ids ?? [], true)) return;
        }
        // Scope MASTER_AND_CHILDREN: if customer's master, the master can view
        // (handled by master case above). If a scoped child, can view.
        if ($u->isCustomer() && $a->appliesTo($u->id)) return;
        abort(403, 'Forbidden.');
    }

    private function expectSupplierOrAdmin(Request $request, PricingAgreement $a): void
    {
        $u = $request->user();
        if ($u->isAdmin()) return;
        if ($u->isSupplier() && $u->id === $a->supplier_id) return;
        abort(403, 'Forbidden.');
    }

    private function url(): string { return rtrim(config('app.frontend_url'), '/') . '/'; }

    private function notifyCustomerForReview(PricingAgreement $a): void
    {
        $c = User::with('masteredBy')->find($a->customer_id);
        if (!$c) return;
        Recipients::notify($c, new EdgeRxNotification(
            kind: 'agreement_pending_customer',
            title: 'New pricing agreement to review',
            message: "{$a->supplier?->name} sent agreement {$a->agreement_number} for your review and signature.",
            actionUrl: $this->url(),
            data: ['agreementId' => $a->id],
        ));
    }

    private function notifyAdminForApproval(PricingAgreement $a): void
    {
        foreach (User::where('role', 'ADMIN')->get() as $admin) {
            $admin->notify(new EdgeRxNotification(
                kind: 'agreement_pending_admin',
                title: 'Pricing agreement awaiting approval',
                message: "Agreement {$a->agreement_number} between {$a->supplier?->name} and {$a->customer?->name} is signed and awaiting your final approval.",
                actionUrl: $this->url(),
                data: ['agreementId' => $a->id],
            ));
        }
    }

    private function notifyBothOfActivation(PricingAgreement $a): void
    {
        foreach ([$a->customer_id, $a->supplier_id] as $uid) {
            $u = User::with('masteredBy')->find($uid);
            if (!$u) continue;
            Recipients::notify($u, new EdgeRxNotification(
                kind: 'agreement_active',
                title: 'Pricing agreement is now active',
                message: "Agreement {$a->agreement_number} is in effect from {$a->valid_from->toDateString()} to {$a->valid_to->toDateString()}.",
                actionUrl: $this->url(),
                data: ['agreementId' => $a->id],
            ));
        }
    }

    private function notifySupplierOfAdminReject(PricingAgreement $a, string $reason): void
    {
        $s = User::find($a->supplier_id);
        if (!$s) return;
        $s->notify(new EdgeRxNotification(
            kind: 'agreement_admin_rejected',
            title: 'Agreement rejected — back to draft',
            message: $reason,
            actionUrl: $this->url(),
            data: ['agreementId' => $a->id],
        ));
    }

    private function notifyAllOfTermination(PricingAgreement $a, string $reason): void
    {
        foreach ([$a->customer_id, $a->supplier_id] as $uid) {
            $u = User::with('masteredBy')->find($uid);
            if (!$u) continue;
            Recipients::notify($u, new EdgeRxNotification(
                kind: 'agreement_terminated',
                title: 'Pricing agreement terminated',
                message: $reason,
                actionUrl: $this->url(),
                data: ['agreementId' => $a->id],
            ));
        }
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateTransferRequest;
use App\Http\Resources\TransferRequestResource;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\TransferRequestService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransfersController extends Controller
{
    public function __construct(private TransferRequestService $service) {}

    /**
     * C-4 fix: translate raw service-layer DomainException codes into
     * customer-friendly messages. The previous behaviour was to relay the
     * raw exception text (e.g. "invalid_status_for_transition_QC_INSPECTION")
     * which leaked engineering vocabulary to the SPA toast.
     */
    private function explainDomainError(\DomainException $e): string
    {
        $code = $e->getMessage();
        return match (true) {
            str_starts_with($code, 'invalid_status_for_transition_')
                => 'This transfer is no longer in a state that allows that action. Refresh the page to see the latest status.',
            $code === 'listing_already_claimed'
                => 'Another pharmacy already claimed this marketplace listing.',
            $code === 'not_the_invited_target'
                => 'This transfer was offered to a different pharmacy.',
            $code === 'escrow_not_locked'
                => 'Payment cannot be confirmed yet — supplier has not finished QC inspection.',
            $code === 'no_target_user'
                => 'This transfer has no buyer yet — wait for someone to claim the marketplace listing.',
            str_starts_with($code, 'cannot_cancel_in_status_')
                => 'This transfer can no longer be cancelled — items have already shipped or been refunded.',
            default => 'Action could not be completed. Please refresh and try again.',
        };
    }

    /**
     * GET /api/transfers
     *
     * Scoping rules:
     *   ADMIN              → all
     *   SUPPLIER           → where supplier_id = me
     *   CUSTOMER           → where source = me OR target = me
     *                          OR (marketplace listing visible to me)
     *   PHARMACY_MASTER    → where source/target ∈ my children
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $q = TransferRequest::with(['source', 'target', 'supplier', 'inspector', 'items.product']);

        if ($user->isAdmin()) {
            // no scope
        } elseif ($user->isSupplier()) {
            $q->where('supplier_id', $user->id);
        } elseif ($user->isCustomer()) {
            $q->where(function ($q2) use ($user) {
                $q2->where('source_user_id', $user->id)
                   ->orWhere('target_user_id', $user->id)
                   ->orWhere(function ($q3) use ($user) {
                       // Visible marketplace listings: same supplier network, accepted, unclaimed
                       $supplierIds = $this->customersSupplierIds($user);
                       $q3->where('discovery_mode', 'MARKETPLACE')
                          ->where('status', 'ACCEPTED_BY_SUPPLIER')
                          ->whereNull('target_user_id')
                          ->whereIn('supplier_id', $supplierIds)
                          ->where('source_user_id', '!=', $user->id);
                   });
            });
        } elseif ($user->isPharmacyMaster()) {
            $childIds = $user->masterOf()->pluck('users.id');
            $q->where(function ($q2) use ($childIds) {
                $q2->whereIn('source_user_id', $childIds)
                   ->orWhereIn('target_user_id', $childIds);
            });
        } else {
            return TransferRequestResource::collection(collect());
        }

        return TransferRequestResource::collection($q->orderByDesc('created_at')->get());
    }

    public function show(Request $request, $id)
    {
        $t = TransferRequest::with(['source', 'target', 'supplier', 'inspector', 'items.product', 'inspections.inspector'])
            ->findOrFail($id);
        $this->authorizeView($request, $t);
        return new TransferRequestResource($t);
    }

    /** POST /api/transfers — A creates the request (auto routed to SUPPLIER_REVIEW). */
    public function store(CreateTransferRequest $request)
    {
        $t = $this->service->initiate($request->toPayload());
        return (new TransferRequestResource($t->load(['source', 'target', 'supplier', 'items.product'])))
            ->response()->setStatusCode(201);
    }

    /** POST /api/transfers/{id}/supplier/accept — supplier ok's the request. */
    public function supplierAccept(Request $request, $id)
    {
        $t = TransferRequest::findOrFail($id);
        $this->expectSupplier($request, $t);
        $t = $this->service->acceptBySupplier($t);
        return new TransferRequestResource($t->load(['source', 'target', 'supplier', 'items.product']));
    }

    /** POST /api/transfers/{id}/supplier/reject — supplier rejects. */
    public function supplierReject(Request $request, $id)
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $t = TransferRequest::findOrFail($id);
        $this->expectSupplier($request, $t);
        $t = $this->service->rejectBySupplier($t, $data['reason']);
        return new TransferRequestResource($t->load(['source', 'target', 'supplier', 'items.product']));
    }

    /** POST /api/transfers/{id}/target/confirm — B accepts (or claims if marketplace). */
    public function targetConfirm(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->isCustomer() && !$user->isPharmacyMaster()) {
            abort(403, 'Only pharmacies can confirm a transfer.');
        }
        $t = TransferRequest::findOrFail($id);
        try {
            $t = $this->service->confirmByTarget($t, $user);
        } catch (\DomainException $e) {
            abort(422, $this->explainDomainError($e));
        }
        return new TransferRequestResource($t->load(['source', 'target', 'supplier', 'items.product']));
    }

    /** POST /api/transfers/{id}/intake — supplier marks goods physically received. */
    public function intake(Request $request, $id)
    {
        $t = TransferRequest::findOrFail($id);
        $this->expectSupplier($request, $t);
        $t = $this->service->recordIntake($t);
        return new TransferRequestResource($t);
    }

    /** POST /api/transfers/{id}/qc/start — supplier (or their team member) begins inspection. */
    public function qcStart(Request $request, $id)
    {
        $t = TransferRequest::findOrFail($id);
        $this->expectSupplier($request, $t);
        $t = $this->service->startInspection($t, $request->user());
        return new TransferRequestResource($t);
    }

    /** POST /api/transfers/{id}/qc/pass */
    public function qcPass(Request $request, $id)
    {
        $data = $request->validate(['notes' => 'nullable|string|max:1000']);
        $t = TransferRequest::with('items.product')->findOrFail($id);
        $this->expectSupplier($request, $t);
        $t = $this->service->passQc($t, $request->user(), $data['notes'] ?? null);
        return new TransferRequestResource($t->load(['source', 'target', 'supplier', 'items.product']));
    }

    /** POST /api/transfers/{id}/qc/fail */
    public function qcFail(Request $request, $id)
    {
        $data = $request->validate(['reason' => 'required|string|max:1000']);
        $t = TransferRequest::with('items.product')->findOrFail($id);
        $this->expectSupplier($request, $t);
        $t = $this->service->failQc($t, $request->user(), $data['reason']);
        return new TransferRequestResource($t->load(['source', 'target', 'supplier', 'items.product']));
    }

    /** POST /api/transfers/{id}/payment/confirm — B confirms payment, money + goods released. */
    public function confirmPayment(Request $request, $id)
    {
        $user = $request->user();
        $t = TransferRequest::with('items.product')->findOrFail($id);

        // B (or B's master) confirms; supplier or admin can also force-confirm in dispute
        $isB           = $user->id === $t->target_user_id;
        $isBMaster     = $user->isPharmacyMaster() && $user->masterOf()->where('users.id', $t->target_user_id)->exists();
        $isSupplier    = $user->id === $t->supplier_id;
        $isAdmin       = $user->isAdmin();
        if (!($isB || $isBMaster || $isSupplier || $isAdmin)) abort(403, 'Forbidden.');

        try {
            $t = $this->service->confirmPayment($t);
        } catch (\DomainException $e) {
            abort(422, $this->explainDomainError($e));
        }
        return new TransferRequestResource($t->load(['source', 'target', 'supplier', 'items.product']));
    }

    /** POST /api/transfers/{id}/complete — supplier marks shipped + audit PDF stamped. */
    public function complete(Request $request, $id)
    {
        $data = $request->validate(['auditPdfPath' => 'nullable|string|max:1000']);
        $t = TransferRequest::findOrFail($id);
        $this->expectSupplier($request, $t);
        $t = $this->service->markCompleted($t, $data['auditPdfPath'] ?? '');
        return new TransferRequestResource($t);
    }

    /** POST /api/transfers/{id}/cancel — A, B, supplier, or admin cancels (pre-intake only). */
    public function cancel(Request $request, $id)
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $user = $request->user();
        $t = TransferRequest::findOrFail($id);

        // BE-20 / C-1 fix: target (B) can cancel before payment confirmation,
        // and a master can cancel on behalf of either A or B child pharmacy.
        $isSource     = $user->id === $t->source_user_id;
        $isTarget     = $user->id === $t->target_user_id;
        $isSourceMaster = $user->isPharmacyMaster()
            && $t->source_user_id
            && $user->masterOf()->where('users.id', $t->source_user_id)->exists();
        $isTargetMaster = $user->isPharmacyMaster()
            && $t->target_user_id
            && $user->masterOf()->where('users.id', $t->target_user_id)->exists();
        $isSupplier   = $user->id === $t->supplier_id;
        $isAdmin      = $user->isAdmin();
        if (!($isSource || $isTarget || $isSourceMaster || $isTargetMaster || $isSupplier || $isAdmin)) {
            abort(403, 'Forbidden.');
        }

        try {
            $t = $this->service->cancel($t, $user, $data['reason']);
        } catch (\DomainException $e) {
            abort(422, $this->explainDomainError($e));
        }
        return new TransferRequestResource($t);
    }

    /** GET /api/transfers/{id}/audit.pdf — server-rendered audit page (HTML; printable to PDF) */
    public function audit(Request $request, $id)
    {
        $t = TransferRequest::with(['source', 'target', 'supplier', 'inspector', 'items.product', 'inspections.inspector', 'returnOrder', 'purchaseOrder'])
            ->findOrFail($id);
        $this->authorizeView($request, $t);
        return response()
            ->view('transfers.audit', ['t' => $t])
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /* ────────── helpers ────────── */

    private function expectSupplier(Request $request, TransferRequest $t): void
    {
        $u = $request->user();
        if ($u->isAdmin()) return;
        if ($u->isSupplier() && $u->id === $t->supplier_id) return;
        abort(403, 'Only the assigned supplier may perform this action.');
    }

    private function authorizeView(Request $request, TransferRequest $t): void
    {
        $u = $request->user();
        if ($u->isAdmin()) return;
        if ($u->id === $t->source_user_id || $u->id === $t->target_user_id || $u->id === $t->supplier_id) return;

        if ($u->isPharmacyMaster()) {
            $childIds = $u->masterOf()->pluck('users.id');
            if ($childIds->contains($t->source_user_id) || $childIds->contains($t->target_user_id)) return;
        }

        // Marketplace listings visible to peers in the supplier's customer network
        if ($u->isCustomer() && $t->isMarketplaceVisible()) {
            $supplierIds = $this->customersSupplierIds($u);
            if ($supplierIds->contains($t->supplier_id)) return;
        }

        abort(403, 'Forbidden.');
    }

    /** All distinct supplier_ids the customer has placed an order with (their "network"). */
    private function customersSupplierIds(User $customer): \Illuminate\Support\Collection
    {
        return DB::table('orders')->where('customer_id', $customer->id)
            ->distinct()->pluck('supplier_id');
    }
}

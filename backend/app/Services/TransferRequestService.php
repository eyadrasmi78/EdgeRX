<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderHistoryLog;
use App\Models\Product;
use App\Models\TransferQcInspection;
use App\Models\TransferRequest;
use App\Models\TransferRequestItem;
use App\Models\User;
use App\Notifications\EdgeRxNotification;
use App\Notifications\Recipients;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Phase D1 — pharmacy-to-pharmacy transfer state machine.
 *
 * Every state transition lives here. Controllers route HTTP → service method.
 * Notifications fan out via the Recipients helper so masters of either side
 * get bell + email when relevant.
 *
 * Restocking fee: max(flat, percent × refund) — common Kuwait pharma practice.
 */
final class TransferRequestService
{
    /**
     * Default minimum remaining shelf life if a product doesn't override.
     * 9 months is a common Kuwait MoH guideline for B2B pharmacy resale.
     */
    public const DEFAULT_MIN_SHELF_LIFE_MONTHS = 9;

    /**
     * Default cap on transfer qty as % of A's original order qty.
     * Prevents transfers being used as a fake-resale loophole.
     */
    public const DEFAULT_QTY_CAP_PERCENT = 50;

    /* ─────────────────────────────────────────────────────────
     * 1. INITIATE — A creates the request, items pass compliance gates
     * ───────────────────────────────────────────────────────── */
    public function initiate(array $payload): TransferRequest
    {
        return DB::transaction(function () use ($payload) {
            $transfer = TransferRequest::create([
                'source_user_id'        => $payload['source_user_id'],
                'target_user_id'        => $payload['target_user_id'] ?? null,
                'supplier_id'           => $payload['supplier_id'],
                'discovery_mode'        => $payload['discovery_mode'],
                'status'                => 'SUPPLIER_REVIEW',
                'source_order_id'       => $payload['source_order_id'] ?? null,
                'supplier_fee_flat'     => $payload['supplier_fee_flat'] ?? 0,
                'supplier_fee_percent'  => $payload['supplier_fee_percent'] ?? 0,
                'notes'                 => $payload['notes'] ?? null,
            ]);

            $totalRefund = 0;
            foreach ($payload['items'] as $line) {
                TransferRequestItem::create([
                    'transfer_request_id'   => $transfer->id,
                    'product_id'            => $line['product_id'],
                    'quantity'              => $line['quantity'],
                    'unit_price_refund'     => $line['unit_price_refund'],
                    'unit_price_resale'     => $line['unit_price_resale'],
                    'batch_number'          => $line['batch_number'],
                    'lot_number'            => $line['lot_number'] ?? null,
                    'expiry_date'           => $line['expiry_date'],
                    'gs1_barcode'           => $line['gs1_barcode'] ?? null,
                    'temperature_log_path'  => $line['temperature_log_path'] ?? null,
                    'photo_paths'           => $line['photo_paths'] ?? [],
                ]);
                $totalRefund += $line['quantity'] * $line['unit_price_refund'];
            }

            $fee = $this->computeFee($totalRefund, $transfer->supplier_fee_flat, $transfer->supplier_fee_percent);
            $transfer->update([
                'source_refund_amount'   => $totalRefund,
                'supplier_fee_applied'   => $fee,
                'target_purchase_amount' => $totalRefund + $fee,
            ]);

            $this->notifySupplierOfNewRequest($transfer);
            return $transfer->fresh(['items', 'source', 'target', 'supplier']);
        });
    }

    /* ─────────────────────────────────────────────────────────
     * 2. SUPPLIER ACCEPTS  → ACCEPTED_BY_SUPPLIER
     *    For DIRECT: target gets notified to confirm.
     *    For MARKETPLACE: listing becomes visible to supplier's customer network.
     * ───────────────────────────────────────────────────────── */
    public function acceptBySupplier(TransferRequest $t): TransferRequest
    {
        $this->expectStatus($t, ['INITIATED', 'SUPPLIER_REVIEW']);
        $t->update(['status' => 'ACCEPTED_BY_SUPPLIER']);

        if (!$t->isMarketplace() && $t->target_user_id) {
            $this->notifyTargetOfDirectOffer($t);
        }
        $this->notifySourceOfSupplierAccept($t);
        return $t->fresh();
    }

    public function rejectBySupplier(TransferRequest $t, string $reason): TransferRequest
    {
        $this->expectStatus($t, ['INITIATED', 'SUPPLIER_REVIEW']);
        $t->update([
            'status' => 'CANCELLED',
            'qc_failed_reason' => $reason,
            'cancelled_at' => now(),
        ]);
        $this->notifySourceOfRejection($t, $reason);
        return $t->fresh();
    }

    /* ─────────────────────────────────────────────────────────
     * 3. TARGET CONFIRMS  → B_CONFIRMED
     *    For MARKETPLACE: target_user_id is set here (claim-the-listing).
     * ───────────────────────────────────────────────────────── */
    public function confirmByTarget(TransferRequest $t, User $target): TransferRequest
    {
        $this->expectStatus($t, ['ACCEPTED_BY_SUPPLIER']);

        if ($t->isMarketplace()) {
            if ($t->target_user_id && $t->target_user_id !== $target->id) {
                throw new \DomainException('listing_already_claimed');
            }
            $t->target_user_id = $target->id;
        } else {
            if ($t->target_user_id !== $target->id) {
                throw new \DomainException('not_the_invited_target');
            }
        }
        $t->status = 'B_CONFIRMED';
        $t->save();

        $this->notifySupplierOfTargetConfirm($t);
        $this->notifySourceOfTargetConfirm($t);
        return $t->fresh();
    }

    /* ─────────────────────────────────────────────────────────
     * 4. PHYSICAL INTAKE  → QC_INTAKE
     *    Supplier records that A's items have physically arrived.
     * ───────────────────────────────────────────────────────── */
    public function recordIntake(TransferRequest $t): TransferRequest
    {
        $this->expectStatus($t, ['B_CONFIRMED']);
        $t->update(['status' => 'QC_INTAKE']);
        return $t->fresh();
    }

    /* ─────────────────────────────────────────────────────────
     * 5. INSPECTION  → QC_INSPECTION → QC_PASSED|QC_FAILED
     * ───────────────────────────────────────────────────────── */
    public function startInspection(TransferRequest $t, User $inspector): TransferRequest
    {
        $this->expectStatus($t, ['QC_INTAKE']);
        $t->update([
            'status' => 'QC_INSPECTION',
            'qc_inspector_id' => $inspector->id,
        ]);
        return $t->fresh();
    }

    public function passQc(TransferRequest $t, User $inspector, ?string $notes = null): TransferRequest
    {
        $this->expectStatus($t, ['QC_INSPECTION']);
        DB::transaction(function () use ($t, $inspector, $notes) {
            $t->items()->update(['qc_status' => 'PASSED']);
            TransferQcInspection::create([
                'transfer_request_id' => $t->id,
                'inspector_id'        => $inspector->id,
                'inspected_at'        => now(),
                'result'              => 'PASS',
                'notes'               => $notes,
            ]);
            $t->update([
                'status'         => 'AWAITING_B_PAYMENT',
                'qc_passed_at'   => now(),
                'escrow_status'  => 'LOCKED',
            ]);
        });
        $this->notifyTargetOfPaymentDue($t);
        return $t->fresh();
    }

    public function failQc(TransferRequest $t, User $inspector, string $reason): TransferRequest
    {
        $this->expectStatus($t, ['QC_INSPECTION', 'QC_INTAKE']);
        DB::transaction(function () use ($t, $inspector, $reason) {
            $t->items()->update(['qc_status' => 'FAILED', 'qc_failed_reason' => $reason]);
            TransferQcInspection::create([
                'transfer_request_id' => $t->id,
                'inspector_id'        => $inspector->id,
                'inspected_at'        => now(),
                'result'              => 'FAIL',
                'notes'               => $reason,
            ]);
            $t->update([
                'status'           => 'QC_FAILED',
                'qc_failed_reason' => $reason,
                'escrow_status'    => 'NONE', // never locked, nothing to refund
            ]);
        });
        $this->notifyAllOfQcFail($t, $reason);
        return $t->fresh();
    }

    /* ─────────────────────────────────────────────────────────
     * 6. RELEASE  → RELEASED (creates the paired return + purchase legs)
     *    Money: B → supplier → A (net of fee). Goods: → B's incoming.
     * ───────────────────────────────────────────────────────── */
    public function confirmPayment(TransferRequest $t): TransferRequest
    {
        $this->expectStatus($t, ['AWAITING_B_PAYMENT']);
        if ($t->escrow_status !== 'LOCKED') {
            throw new \DomainException('escrow_not_locked');
        }
        if (!$t->target_user_id) {
            throw new \DomainException('no_target_user');
        }

        DB::transaction(function () use ($t) {
            // Aggregate description for the linked Order rows
            $itemSummary = $t->items->map(
                fn($i) => "{$i->quantity}× {$i->product?->name} (batch {$i->batch_number})"
            )->implode(', ');

            // RETURN ORDER LEG — A → supplier (credit note)
            $returnOrder = Order::create([
                'id'              => (string) Str::uuid(),
                'order_number'    => 'RTN-' . now()->format('Y') . '-' . strtoupper(Str::random(5)),
                'product_id'      => $t->items->first()?->product_id,
                'product_name'    => 'TRANSFER RETURN: ' . $itemSummary,
                'customer_id'     => $t->source_user_id,
                'customer_name'   => $t->source?->name ?? '',
                'supplier_id'     => $t->supplier_id,
                'supplier_name'   => $t->supplier?->name ?? '',
                'quantity'        => $t->items->sum('quantity'),
                'status'          => 'Completed',
                'date'            => now(),
            ]);
            OrderHistoryLog::create([
                'order_id' => $returnOrder->id,
                'status'   => 'Completed',
                'timestamp' => now(),
                'note' => "Linked to TransferRequest {$t->id} (return leg, refund " . number_format($t->source_refund_amount, 2) . " KWD)",
            ]);

            // PURCHASE ORDER LEG — supplier → B (sales invoice)
            $purchaseOrder = Order::create([
                'id'              => (string) Str::uuid(),
                'order_number'    => 'TRF-' . now()->format('Y') . '-' . strtoupper(Str::random(5)),
                'product_id'      => $t->items->first()?->product_id,
                'product_name'    => 'TRANSFER PURCHASE: ' . $itemSummary,
                'customer_id'     => $t->target_user_id,
                'customer_name'   => $t->target?->name ?? '',
                'supplier_id'     => $t->supplier_id,
                'supplier_name'   => $t->supplier?->name ?? '',
                'quantity'        => $t->items->sum('quantity'),
                'status'          => 'Received',
                'date'            => now(),
            ]);
            OrderHistoryLog::create([
                'order_id' => $purchaseOrder->id,
                'status'   => 'Received',
                'timestamp' => now(),
                'note' => "Linked to TransferRequest {$t->id} (purchase leg, charge " . number_format($t->target_purchase_amount, 2) . " KWD)",
            ]);

            // Generate paper-trail invoice numbers (real invoicing engine deferred)
            $stamp = now()->format('Ymd') . '-' . strtoupper(Str::random(4));
            $t->update([
                'status'                => 'RELEASED',
                'return_order_id'       => $returnOrder->id,
                'purchase_order_id'     => $purchaseOrder->id,
                'released_at'           => now(),
                'escrow_status'         => 'RELEASED',
                'source_credit_note_no' => 'CN-' . $stamp,
                'target_invoice_no'     => 'INV-' . $stamp,
            ]);
        });

        $this->notifyAllOfRelease($t);
        return $t->fresh(['items', 'returnOrder', 'purchaseOrder']);
    }

    /** B confirms physical receipt → COMPLETED. Audit PDF path stamped. */
    public function markCompleted(TransferRequest $t, string $auditPdfPath): TransferRequest
    {
        $this->expectStatus($t, ['RELEASED']);
        $t->update([
            'status'         => 'COMPLETED',
            'completed_at'   => now(),
            'audit_pdf_path' => $auditPdfPath,
        ]);
        $this->notifyAllOfCompletion($t);
        return $t->fresh();
    }

    /** Cancel — only valid before physical intake. */
    public function cancel(TransferRequest $t, User $by, string $reason): TransferRequest
    {
        if (in_array($t->status, ['QC_INTAKE', 'QC_INSPECTION', 'AWAITING_B_PAYMENT', 'RELEASED', 'COMPLETED', 'CANCELLED', 'QC_FAILED'], true)) {
            throw new \DomainException('cannot_cancel_in_status_' . $t->status);
        }
        $t->update([
            'status'           => 'CANCELLED',
            'qc_failed_reason' => $reason,
            'cancelled_at'     => now(),
        ]);
        $this->notifyAllOfCancellation($t, $by, $reason);
        return $t->fresh();
    }

    /* ─────────────────────────────────────────────────────────
     * COMPLIANCE GATES (called by FormRequest at INITIATED time)
     * ───────────────────────────────────────────────────────── */

    /**
     * @return array<string,string> errorMap keyed by "items.{i}.{field}" => message
     */
    public function complianceErrors(array $items, ?Order $sourceOrder = null): array
    {
        $errors = [];
        foreach ($items as $i => $line) {
            $product = Product::find($line['product_id'] ?? null);
            if (!$product) {
                $errors["items.$i.product_id"] = 'Product not found.';
                continue;
            }

            // Gate 1 — controlled substances are blocked entirely (v1)
            if ($product->is_controlled_substance) {
                $errors["items.$i.product_id"] = 'Controlled substances cannot be transferred via this flow. Contact your supplier directly.';
            }

            // Gate 2 — cold chain requires temperature log
            if ($product->is_cold_chain && empty($line['temperature_log_path'])) {
                $errors["items.$i.temperature_log_path"] = 'Cold-chain products require an uploaded temperature log.';
            }

            // Gate 3 — expiry floor
            $minMonths = $product->transfer_min_shelf_life_months ?: self::DEFAULT_MIN_SHELF_LIFE_MONTHS;
            if (!empty($line['expiry_date'])) {
                $expiry = Carbon::parse($line['expiry_date']);
                $cutoff = now()->addMonths($minMonths);
                if ($expiry->lt($cutoff)) {
                    $errors["items.$i.expiry_date"] = "Expiry must be at least {$minMonths} months from today.";
                }
            }

            // Gate 4 — quantity cap
            if ($sourceOrder && $sourceOrder->product_id === $product->id) {
                $cap = (int) floor(($sourceOrder->quantity ?? 0) * (self::DEFAULT_QTY_CAP_PERCENT / 100));
                if ((int) ($line['quantity'] ?? 0) > $cap) {
                    $errors["items.$i.quantity"] = "May not exceed " . self::DEFAULT_QTY_CAP_PERCENT . "% of original purchase ({$cap} units).";
                }
            }
        }
        return $errors;
    }

    /* ─────────────────────────────────────────────────────────
     * Internals
     * ───────────────────────────────────────────────────────── */

    private function computeFee(float $refund, float $flat, float $percent): float
    {
        $pctFee = round($refund * ($percent / 100), 2);
        return max((float) $flat, $pctFee);
    }

    private function expectStatus(TransferRequest $t, array $allowed): void
    {
        if (!in_array($t->status, $allowed, true)) {
            throw new \DomainException("invalid_status_for_transition_{$t->status}");
        }
    }

    /* ── notifications ──────────────────────────────────────── */

    private function url(): string
    {
        return rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/';
    }

    private function notifySupplierOfNewRequest(TransferRequest $t): void
    {
        $supplier = User::find($t->supplier_id);
        if (!$supplier) return;
        $supplier->notify(new EdgeRxNotification(
            kind: 'transfer_supplier_review',
            title: 'New transfer request to review',
            message: "{$t->source?->name} requests a transfer ({$t->discovery_mode}) — please review.",
            actionUrl: $this->url(),
            data: ['transferId' => $t->id],
        ));
    }

    private function notifySourceOfSupplierAccept(TransferRequest $t): void
    {
        $src = User::with('masteredBy')->find($t->source_user_id);
        if (!$src) return;
        Recipients::notify($src, new EdgeRxNotification(
            kind: 'transfer_accepted_by_supplier',
            title: 'Supplier accepted your transfer',
            message: $t->isMarketplace()
                ? "Your transfer is now listed in {$t->supplier?->name}'s marketplace."
                : "Awaiting confirmation from {$t->target?->name}.",
            actionUrl: $this->url(),
            data: ['transferId' => $t->id],
        ));
    }

    private function notifySourceOfRejection(TransferRequest $t, string $reason): void
    {
        $src = User::with('masteredBy')->find($t->source_user_id);
        if (!$src) return;
        Recipients::notify($src, new EdgeRxNotification(
            kind: 'transfer_rejected',
            title: 'Transfer rejected by supplier',
            message: $reason,
            actionUrl: $this->url(),
            data: ['transferId' => $t->id],
        ));
    }

    private function notifyTargetOfDirectOffer(TransferRequest $t): void
    {
        if (!$t->target_user_id) return;
        $tgt = User::with('masteredBy')->find($t->target_user_id);
        if (!$tgt) return;
        Recipients::notify($tgt, new EdgeRxNotification(
            kind: 'transfer_direct_offer',
            title: 'Transfer offered to you',
            message: "{$t->source?->name} is transferring stock to you via {$t->supplier?->name}. Review and confirm.",
            actionUrl: $this->url(),
            data: ['transferId' => $t->id],
        ));
    }

    private function notifySupplierOfTargetConfirm(TransferRequest $t): void
    {
        $supplier = User::find($t->supplier_id);
        if ($supplier) {
            $supplier->notify(new EdgeRxNotification(
                kind: 'transfer_target_confirmed',
                title: 'Transfer target confirmed',
                message: "{$t->target?->name} confirmed receipt of transfer. Awaiting physical intake.",
                actionUrl: $this->url(),
                data: ['transferId' => $t->id],
            ));
        }
    }

    private function notifySourceOfTargetConfirm(TransferRequest $t): void
    {
        $src = User::with('masteredBy')->find($t->source_user_id);
        if ($src) {
            Recipients::notify($src, new EdgeRxNotification(
                kind: 'transfer_target_confirmed',
                title: 'Buyer confirmed your transfer',
                message: "Ship items to {$t->supplier?->name} for QC inspection.",
                actionUrl: $this->url(),
                data: ['transferId' => $t->id],
            ));
        }
    }

    private function notifyTargetOfPaymentDue(TransferRequest $t): void
    {
        if (!$t->target_user_id) return;
        $tgt = User::with('masteredBy')->find($t->target_user_id);
        if ($tgt) {
            Recipients::notify($tgt, new EdgeRxNotification(
                kind: 'transfer_payment_due',
                title: 'QC passed — payment due',
                message: "{$t->supplier?->name} has approved the transfer. Confirm payment of " . number_format($t->target_purchase_amount, 2) . " KWD to release shipment.",
                actionUrl: $this->url(),
                data: ['transferId' => $t->id],
            ));
        }
    }

    private function notifyAllOfQcFail(TransferRequest $t, string $reason): void
    {
        foreach ([$t->source_user_id, $t->target_user_id] as $uid) {
            if (!$uid) continue;
            $u = User::with('masteredBy')->find($uid);
            if (!$u) continue;
            Recipients::notify($u, new EdgeRxNotification(
                kind: 'transfer_qc_failed',
                title: 'Transfer QC failed',
                message: $reason,
                actionUrl: $this->url(),
                data: ['transferId' => $t->id],
            ));
        }
    }

    private function notifyAllOfRelease(TransferRequest $t): void
    {
        foreach ([$t->source_user_id, $t->target_user_id] as $uid) {
            if (!$uid) continue;
            $u = User::with('masteredBy')->find($uid);
            if (!$u) continue;
            Recipients::notify($u, new EdgeRxNotification(
                kind: 'transfer_released',
                title: 'Transfer released',
                message: $uid === $t->source_user_id
                    ? "Refund of " . number_format($t->source_refund_amount, 2) . " KWD released. Credit note: {$t->source_credit_note_no}"
                    : "Items shipped from {$t->supplier?->name}. Invoice: {$t->target_invoice_no}",
                actionUrl: $this->url(),
                data: ['transferId' => $t->id],
            ));
        }
    }

    private function notifyAllOfCompletion(TransferRequest $t): void
    {
        foreach ([$t->source_user_id, $t->target_user_id, $t->supplier_id] as $uid) {
            if (!$uid) continue;
            $u = User::with('masteredBy')->find($uid);
            if (!$u) continue;
            Recipients::notify($u, new EdgeRxNotification(
                kind: 'transfer_completed',
                title: 'Transfer completed',
                message: 'Audit PDF available for inspection.',
                actionUrl: $this->url(),
                data: ['transferId' => $t->id],
            ));
        }
    }

    private function notifyAllOfCancellation(TransferRequest $t, User $by, string $reason): void
    {
        foreach ([$t->source_user_id, $t->target_user_id, $t->supplier_id] as $uid) {
            if (!$uid || $uid === $by->id) continue;
            $u = User::with('masteredBy')->find($uid);
            if (!$u) continue;
            Recipients::notify($u, new EdgeRxNotification(
                kind: 'transfer_cancelled',
                title: 'Transfer cancelled',
                message: "{$by->name}: {$reason}",
                actionUrl: $this->url(),
                data: ['transferId' => $t->id],
            ));
        }
    }
}

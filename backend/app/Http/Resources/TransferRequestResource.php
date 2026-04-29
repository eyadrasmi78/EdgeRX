<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Privacy-aware: source pharmacy never sees the resale price; target never sees
 * the refund A is getting. Supplier and admin see everything.
 */
class TransferRequestResource extends JsonResource
{
    public function toArray($request): array
    {
        $user = $request->user();
        $isAdmin    = $user?->isAdmin() ?? false;
        $isSupplier = $user && $user->id === $this->supplier_id;
        $isSource   = $user && $user->id === $this->source_user_id;
        $isTarget   = $user && $user->id === $this->target_user_id;

        $items = $this->whenLoaded('items', function () use ($isAdmin, $isSupplier, $isSource, $isTarget) {
            return $this->items->map(function ($item) use ($isAdmin, $isSupplier, $isSource, $isTarget) {
                $row = [
                    'id'              => $item->id,
                    'productId'       => $item->product_id,
                    'productName'     => $item->product?->name,
                    'quantity'        => (int) $item->quantity,
                    'batchNumber'     => $item->batch_number,
                    'lotNumber'       => $item->lot_number,
                    'expiryDate'      => optional($item->expiry_date)->toDateString(),
                    'gs1Barcode'      => $item->gs1_barcode,
                    'isColdChain'     => (bool) ($item->product?->is_cold_chain ?? false),
                    'temperatureLogPath' => $item->temperature_log_path,
                    'photoPaths'      => $item->photo_paths ?? [],
                    'qcStatus'        => $item->qc_status,
                    'qcFailedReason'  => $item->qc_failed_reason,
                ];
                // Refund (A's view of own credit) — visible to A, supplier, admin
                if ($isAdmin || $isSupplier || $isSource) {
                    $row['unitPriceRefund'] = (float) $item->unit_price_refund;
                    $row['lineRefund']      = round($item->quantity * $item->unit_price_refund, 2);
                }
                // Resale (B's price) — visible to B, supplier, admin
                if ($isAdmin || $isSupplier || $isTarget) {
                    $row['unitPriceResale'] = (float) $item->unit_price_resale;
                    $row['lineResale']      = round($item->quantity * $item->unit_price_resale, 2);
                }
                return $row;
            })->values();
        }, []);

        $totals = [];
        if ($isAdmin || $isSupplier || $isSource) {
            $totals['sourceRefundAmount'] = (float) $this->source_refund_amount;
            $totals['supplierFeeApplied'] = (float) $this->supplier_fee_applied;
            $totals['supplierFeeFlat']    = (float) $this->supplier_fee_flat;
            $totals['supplierFeePercent'] = (float) $this->supplier_fee_percent;
        }
        if ($isAdmin || $isSupplier || $isTarget) {
            $totals['targetPurchaseAmount'] = (float) $this->target_purchase_amount;
        }

        return [
            'id'              => $this->id,
            'sourceUserId'    => $this->source_user_id,
            'sourceUserName'  => $this->source?->name,
            'targetUserId'    => $this->target_user_id,
            'targetUserName'  => $this->target?->name,
            'supplierId'      => $this->supplier_id,
            'supplierName'    => $this->supplier?->name,
            'discoveryMode'   => $this->discovery_mode,
            'status'          => $this->status,
            'escrowStatus'    => $this->escrow_status,
            'sourceOrderId'   => $this->source_order_id,
            'returnOrderId'   => $this->return_order_id,
            'purchaseOrderId' => $this->purchase_order_id,
            'sourceCreditNoteNo' => $this->when($isAdmin || $isSupplier || $isSource, $this->source_credit_note_no),
            'targetInvoiceNo'    => $this->when($isAdmin || $isSupplier || $isTarget, $this->target_invoice_no),
            'auditPdfPath'    => $this->audit_pdf_path,
            'qcInspectorId'   => $this->qc_inspector_id,
            'qcInspectorName' => $this->inspector?->name,
            'qcPassedAt'      => optional($this->qc_passed_at)->toIso8601String(),
            'qcFailedReason'  => $this->qc_failed_reason,
            'releasedAt'      => optional($this->released_at)->toIso8601String(),
            'completedAt'     => optional($this->completed_at)->toIso8601String(),
            'cancelledAt'     => optional($this->cancelled_at)->toIso8601String(),
            'notes'           => $this->notes,
            'createdAt'       => optional($this->created_at)->toIso8601String(),
            'totals'          => $totals,
            'items'           => $items,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'orderNumber' => $this->order_number,
            'productId' => $this->product_id,
            'productName' => $this->product_name,
            'customerId' => $this->customer_id,
            'customerName' => $this->customer_name,
            'supplierId' => $this->supplier_id,
            'supplierName' => $this->supplier_name,
            'placedByUserId' => $this->placed_by_user_id,
            'placedByUserName' => $this->whenLoaded('placedBy', fn () => $this->placedBy?->name, null),
            'buyingGroupId' => $this->buying_group_id,
            'buyingGroupName' => $this->whenLoaded('buyingGroup', fn () => $this->buyingGroup?->name, null),
            'quantity' => (int) $this->quantity,
            'bonusQuantity' => $this->bonus_quantity !== null ? (int) $this->bonus_quantity : null,
            'unitOfMeasurement' => $this->unit_of_measurement,
            'status' => $this->status,
            'declineReason' => $this->decline_reason,
            'date' => optional($this->date)->toIso8601String(),
            'statusHistory' => $this->statusHistory->map(fn ($l) => [
                'status' => $l->status,
                'timestamp' => optional($l->timestamp)->toIso8601String(),
                'note' => $l->note,
            ])->values(),
            'returnRequested' => (bool) $this->return_requested,
            'returnReason' => $this->return_reason,
            'returnNote' => $this->return_note,
            // Phase D2 — pricing source
            'pricingSource' => $this->pricing_source,
            'pricingAgreementId' => $this->pricing_agreement_id,
            'pricingAgreementVersion' => $this->pricing_agreement_version !== null ? (int) $this->pricing_agreement_version : null,
            'contractedUnitPrice' => $this->contracted_unit_price !== null ? (float) $this->contracted_unit_price : null,
            'catalogUnitPrice' => $this->catalog_unit_price !== null ? (float) $this->catalog_unit_price : null,
            'savingsAmount' => $this->savings_amount !== null ? (float) $this->savings_amount : null,
        ];
    }
}

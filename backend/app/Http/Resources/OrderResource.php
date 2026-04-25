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
            'supplierName' => $this->supplier_name,
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
        ];
    }
}

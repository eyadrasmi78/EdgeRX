<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PartnershipRequestResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'fromAgentId' => $this->from_agent_id,
            'fromAgentName' => $this->from_agent_name,
            'toForeignSupplierId' => $this->to_foreign_supplier_id,
            'status' => $this->status,
            'date' => optional($this->date)->toIso8601String(),
            'message' => $this->message,
            'productId' => $this->product_id,
            'productName' => $this->product_name,
            'requestType' => $this->request_type,
        ];
    }
}

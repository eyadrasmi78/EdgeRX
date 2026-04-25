<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Privacy-aware shape (locked decision #17):
 *   - Admins see EVERY member fully (id, customer name, committed qty, status, order id)
 *   - Members see ONLY their own row in the same shape
 *   - Other members are hidden entirely from non-admins (filtered upstream in the controller)
 *
 * The `viewerIsAdmin` flag is passed through `additional()` from the resource collection.
 */
class BuyingGroupMemberResource extends JsonResource
{
    public function toArray($request): array
    {
        $viewerIsAdmin = (bool) ($this->additional['viewerIsAdmin'] ?? false);

        return [
            'id' => (int) $this->id,
            'customerId' => $viewerIsAdmin || $this->isOwn($request) ? $this->customer_id : null,
            'customerName' => $viewerIsAdmin || $this->isOwn($request)
                ? ($this->customer?->name)
                : null,
            'committedQuantity' => $viewerIsAdmin || $this->isOwn($request)
                ? ($this->committed_quantity !== null ? (int) $this->committed_quantity : null)
                : null,
            'apportionedBonus' => $viewerIsAdmin || $this->isOwn($request)
                ? ($this->apportioned_bonus !== null ? (int) $this->apportioned_bonus : null)
                : null,
            'status' => $this->status,
            'resultingOrderId' => $viewerIsAdmin || $this->isOwn($request) ? $this->resulting_order_id : null,
            'isOwn' => $this->isOwn($request),
        ];
    }

    private function isOwn($request): bool
    {
        $user = $request->user();
        return $user && $user->id === $this->customer_id;
    }
}

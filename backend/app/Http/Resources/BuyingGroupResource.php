<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BuyingGroupResource extends JsonResource
{
    public function toArray($request): array
    {
        $user = $request->user();
        $viewerIsAdmin = $user?->isAdmin() ?? false;

        $members = $this->whenLoaded('members', function () use ($viewerIsAdmin, $user) {
            $coll = $this->members;
            if (!$viewerIsAdmin && $user) {
                // Members see only their own membership row
                $coll = $coll->where('customer_id', $user->id);
            }
            return BuyingGroupMemberResource::collection($coll)
                ->additional(['viewerIsAdmin' => $viewerIsAdmin])
                ->resolve();
        }, []);

        $accepted = $this->whenLoaded('members', function () {
            return $this->members
                ->where('status', 'ACCEPTED')
                ->sum('committed_quantity');
        }, 0);
        $totalCommitted = $this->whenLoaded('members', function () {
            return $this->members
                ->whereIn('status', ['COMMITTED', 'ACCEPTED'])
                ->sum('committed_quantity');
        }, 0);
        $memberCount = $this->whenLoaded('members', function () {
            return $this->members->count();
        }, 0);
        $acceptedCount = $this->whenLoaded('members', function () {
            return $this->members->where('status', 'ACCEPTED')->count();
        }, 0);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'productId' => $this->product_id,
            'productName' => $this->product?->name,
            'productImage' => $this->product?->image,
            'unitOfMeasurement' => $this->product?->unit_of_measurement,
            'productBonusThreshold' => $this->product?->bonus_threshold,
            'productBonusType' => $this->product?->bonus_type,
            'productBonusValue' => $this->product?->bonus_value !== null
                ? (float) $this->product->bonus_value
                : null,
            'supplierId' => $this->supplier_id,
            'supplierName' => $this->supplier?->name,
            'targetQuantity' => (int) $this->target_quantity,
            'windowEndsAt' => optional($this->window_ends_at)->toIso8601String(),
            'status' => $this->status,
            'createdByAdminId' => $this->created_by_admin_id,
            'releasedAt' => optional($this->released_at)->toIso8601String(),
            'dissolvedAt' => optional($this->dissolved_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),

            // Aggregate stats (visible to all members + admins)
            'aggregate' => [
                'memberCount' => (int) $memberCount,
                'acceptedCount' => (int) $acceptedCount,
                'acceptedQuantity' => (int) $accepted,
                'committedQuantity' => (int) $totalCommitted,
                'thresholdMet' => (int) $accepted >= (int) $this->target_quantity,
                'percentToTarget' => $this->target_quantity > 0
                    ? min(100, (int) round((((int) $accepted) / ((int) $this->target_quantity)) * 100))
                    : 0,
            ],

            'members' => $members,
        ];
    }
}

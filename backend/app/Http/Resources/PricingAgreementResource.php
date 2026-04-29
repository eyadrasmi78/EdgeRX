<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PricingAgreementResource extends JsonResource
{
    public function toArray($request): array
    {
        $u = $request->user();
        $isAdmin = $u?->isAdmin() ?? false;
        $isSupplier = $u && $u->id === $this->supplier_id;
        $isCustomerSide = $u && (
            $u->id === $this->customer_id ||
            ($u->isPharmacyMaster() && $u->masterOf()->where('users.id', $this->customer_id)->exists()) ||
            ($this->scope === 'MASTER_AND_CHILDREN' && $u->id === $this->customer_id)
        );

        $items = $this->whenLoaded('items', function () {
            return $this->items->map(fn($i) => [
                'id'                       => $i->id,
                'productId'                => $i->product_id,
                'productName'              => $i->product?->name,
                'productImage'             => $i->product?->image,
                'unitOfMeasurement'        => $i->product?->unit_of_measurement,
                'unitPrice'                => (float) $i->unit_price,
                'minOrderQuantity'         => (int) $i->min_order_quantity,
                'maxPeriodQuantity'        => $i->max_period_quantity ? (int) $i->max_period_quantity : null,
                'committedPeriodQuantity'  => $i->committed_period_quantity ? (int) $i->committed_period_quantity : null,
                'tierBreaks'               => $i->tier_breaks ?? [],
                'catalogPrice'             => (float) ($i->product?->price ?? 0),
            ])->values();
        }, []);

        return [
            'id'                  => $this->id,
            'agreementNumber'     => $this->agreement_number,
            'customerId'          => $this->customer_id,
            'customerName'        => $this->customer?->name,
            'supplierId'          => $this->supplier_id,
            'supplierName'        => $this->supplier?->name,
            'status'              => $this->status,
            'version'             => (int) $this->version,
            'validFrom'           => optional($this->valid_from)->toDateString(),
            'validTo'             => optional($this->valid_to)->toDateString(),
            'autoRenew'           => (bool) $this->auto_renew,
            'renewNoticeDays'     => (int) $this->renew_notice_days,
            'moqFallbackMode'     => $this->moq_fallback_mode,
            'scope'               => $this->scope,
            'scopedPharmacyIds'   => $this->scoped_pharmacy_ids ?? [],
            'bonusesApply'        => (bool) $this->bonuses_apply,
            'currency'            => $this->currency,
            'sentToCustomerAt'    => optional($this->sent_to_customer_at)->toIso8601String(),
            'signedByCustomerAt'  => optional($this->signed_by_customer_at)->toIso8601String(),
            'approvedByAdminAt'   => optional($this->approved_by_admin_at)->toIso8601String(),
            'approvedByAdminId'   => $this->approved_by_admin_id,
            'terminatedAt'        => optional($this->terminated_at)->toIso8601String(),
            'terminationReason'   => $this->termination_reason,
            'signedPdfPath'       => $this->signed_pdf_path,
            'notes'               => $this->notes,
            'isActive'            => $this->isActive(),
            'isExpired'           => $this->isExpired(),
            'createdAt'           => optional($this->created_at)->toIso8601String(),
            'updatedAt'           => optional($this->updated_at)->toIso8601String(),
            'items'               => $items,
        ];
    }
}

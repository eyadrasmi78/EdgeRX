<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingAgreementItem extends Model
{
    protected $fillable = [
        'pricing_agreement_id', 'product_id',
        'unit_price', 'min_order_quantity',
        'max_period_quantity', 'committed_period_quantity',
        'tier_breaks',
    ];

    protected $casts = [
        'unit_price'                => 'decimal:2',
        'min_order_quantity'        => 'integer',
        'max_period_quantity'       => 'integer',
        'committed_period_quantity' => 'integer',
        'tier_breaks'               => 'array',
    ];

    public function agreement() { return $this->belongsTo(PricingAgreement::class, 'pricing_agreement_id'); }
    public function product()   { return $this->belongsTo(Product::class, 'product_id'); }

    /**
     * Resolve the unit price for a given quantity, walking tier_breaks if any.
     * tier_breaks format: [{qty: 100, price: 5.00}, {qty: 500, price: 4.50}]
     * Tier qty is the *minimum* qty to hit that price.
     */
    public function priceForQuantity(int $qty): float
    {
        $price = (float) $this->unit_price;
        if (empty($this->tier_breaks)) return $price;

        // Tier breaks should be sorted ascending by qty; find the highest break met.
        $sorted = collect($this->tier_breaks)->sortBy('qty')->values();
        foreach ($sorted as $break) {
            if ($qty >= (int) ($break['qty'] ?? 0)) {
                $price = (float) ($break['price'] ?? $price);
            }
        }
        return $price;
    }
}

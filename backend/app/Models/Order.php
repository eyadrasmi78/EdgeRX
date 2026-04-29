<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Order extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'order_number',
        'product_id', 'product_name',
        'customer_id', 'customer_name',
        'supplier_id', 'supplier_name',
        'placed_by_user_id',
        'buying_group_id',
        'quantity', 'bonus_quantity', 'unit_of_measurement',
        'status', 'decline_reason', 'date',
        'return_requested', 'return_reason', 'return_note',
        'pricing_source', 'pricing_agreement_id', 'pricing_agreement_version',
        'contracted_unit_price', 'catalog_unit_price', 'savings_amount',
    ];

    protected $casts = [
        'date' => 'datetime',
        'return_requested' => 'boolean',
        'quantity' => 'integer',
        'bonus_quantity' => 'integer',
        'pricing_agreement_version' => 'integer',
        'contracted_unit_price' => 'decimal:2',
        'catalog_unit_price'    => 'decimal:2',
        'savings_amount'        => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (Order $o) {
            if (empty($o->id)) $o->id = (string) Str::uuid();
        });
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function supplier()
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }

    public function placedBy()
    {
        return $this->belongsTo(User::class, 'placed_by_user_id');
    }

    public function buyingGroup()
    {
        return $this->belongsTo(BuyingGroup::class, 'buying_group_id');
    }

    public function pricingAgreement()
    {
        return $this->belongsTo(PricingAgreement::class, 'pricing_agreement_id');
    }

    public function statusHistory()
    {
        return $this->hasMany(OrderHistoryLog::class, 'order_id')->orderBy('timestamp');
    }

    public function chatRoom()
    {
        return $this->hasOne(ChatRoom::class, 'order_id');
    }
}

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
        'quantity', 'bonus_quantity', 'unit_of_measurement',
        'status', 'decline_reason', 'date',
        'return_requested', 'return_reason', 'return_note',
    ];

    protected $casts = [
        'date' => 'datetime',
        'return_requested' => 'boolean',
        'quantity' => 'integer',
        'bonus_quantity' => 'integer',
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

    public function statusHistory()
    {
        return $this->hasMany(OrderHistoryLog::class, 'order_id')->orderBy('timestamp');
    }

    public function chatRoom()
    {
        return $this->hasOne(ChatRoom::class, 'order_id');
    }
}

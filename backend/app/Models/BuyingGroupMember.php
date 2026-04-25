<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuyingGroupMember extends Model
{
    protected $fillable = [
        'buying_group_id', 'customer_id',
        'committed_quantity', 'apportioned_bonus',
        'status', 'resulting_order_id',
    ];

    protected $casts = [
        'committed_quantity' => 'integer',
        'apportioned_bonus' => 'integer',
    ];

    public function group()    { return $this->belongsTo(BuyingGroup::class, 'buying_group_id'); }
    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function order()    { return $this->belongsTo(Order::class, 'resulting_order_id'); }

    public function isInvited(): bool   { return $this->status === 'INVITED'; }
    public function isCommitted(): bool { return $this->status === 'COMMITTED'; }
    public function isAccepted(): bool  { return $this->status === 'ACCEPTED'; }
    public function isDeclined(): bool  { return $this->status === 'DECLINED'; }
}

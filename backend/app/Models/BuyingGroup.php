<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Phase B — virtual buying group.
 *
 * Status enum (string column, no DB constraint — checked in controllers):
 *   OPEN, COLLECTING, LOCKED, RELEASED, DISSOLVED
 */
class BuyingGroup extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name',
        'product_id', 'supplier_id',
        'target_quantity', 'window_ends_at',
        'status',
        'created_by_admin_id',
        'released_at', 'dissolved_at',
    ];

    protected $casts = [
        'target_quantity' => 'integer',
        'window_ends_at' => 'datetime',
        'released_at' => 'datetime',
        'dissolved_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (BuyingGroup $g) {
            if (empty($g->id)) $g->id = (string) Str::uuid();
            if (empty($g->status)) $g->status = 'OPEN';
        });
    }

    /* ── relations ───────────────────────────────────────── */
    public function product()  { return $this->belongsTo(Product::class, 'product_id'); }
    public function supplier() { return $this->belongsTo(User::class, 'supplier_id'); }
    public function createdBy(){ return $this->belongsTo(User::class, 'created_by_admin_id'); }
    public function members()  { return $this->hasMany(BuyingGroupMember::class, 'buying_group_id'); }
    public function orders()   { return $this->hasMany(Order::class, 'buying_group_id'); }

    /* ── status helpers ──────────────────────────────────── */
    public function isOpen(): bool       { return in_array($this->status, ['OPEN', 'COLLECTING'], true); }
    public function isCollecting(): bool { return $this->status === 'COLLECTING'; }
    public function isLocked(): bool     { return $this->status === 'LOCKED'; }
    public function isReleased(): bool   { return $this->status === 'RELEASED'; }
    public function isDissolved(): bool  { return $this->status === 'DISSOLVED'; }
    public function isTerminal(): bool   { return in_array($this->status, ['RELEASED', 'DISSOLVED'], true); }

    /** Sum of committed_quantity across ACCEPTED members. */
    public function acceptedQuantity(): int
    {
        return (int) $this->members()
            ->where('status', 'ACCEPTED')
            ->sum('committed_quantity');
    }

    /** True iff every non-DECLINED member has ACCEPTED. */
    public function allMembersAccepted(): bool
    {
        $remaining = $this->members()
            ->whereIn('status', ['INVITED', 'COMMITTED'])
            ->count();
        return $remaining === 0
            && $this->members()->where('status', 'ACCEPTED')->exists();
    }

    /** True iff aggregate accepted qty has reached the target. */
    public function thresholdMet(): bool
    {
        return $this->acceptedQuantity() >= (int) $this->target_quantity;
    }

    /** Can the group be released right now? */
    public function canRelease(): bool
    {
        return $this->isOpen() || $this->isLocked()
            ? $this->thresholdMet()
            : false;
    }
}

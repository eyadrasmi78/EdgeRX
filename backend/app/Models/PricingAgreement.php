<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Phase D2 — locked-price agreement.
 *
 * Status: DRAFT, PENDING_CUSTOMER, PENDING_ADMIN, ACTIVE, EXPIRED, TERMINATED.
 */
class PricingAgreement extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'agreement_number',
        'customer_id', 'supplier_id',
        'status', 'version',
        'valid_from', 'valid_to',
        'auto_renew', 'renew_notice_days',
        'moq_fallback_mode', 'scope', 'scoped_pharmacy_ids',
        'bonuses_apply', 'currency',
        'sent_to_customer_at', 'signed_by_customer_at',
        'approved_by_admin_at', 'approved_by_admin_id',
        'terminated_at', 'termination_reason',
        'signed_pdf_path', 'notes',
    ];

    protected $casts = [
        'valid_from'             => 'date',
        'valid_to'               => 'date',
        'auto_renew'             => 'boolean',
        'bonuses_apply'          => 'boolean',
        'renew_notice_days'      => 'integer',
        'version'                => 'integer',
        'scoped_pharmacy_ids'    => 'array',
        'sent_to_customer_at'    => 'datetime',
        'signed_by_customer_at'  => 'datetime',
        'approved_by_admin_at'   => 'datetime',
        'terminated_at'          => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (PricingAgreement $a) {
            if (empty($a->id)) $a->id = (string) Str::uuid();
            if (empty($a->status)) $a->status = 'DRAFT';
            if (empty($a->version)) $a->version = 1;
            if (empty($a->agreement_number)) {
                $a->agreement_number = 'A-' . now()->format('Y') . '-' . strtoupper(Str::random(5));
            }
        });
    }

    /* ── relations ───────────────────────────────────────── */
    public function customer()      { return $this->belongsTo(User::class, 'customer_id'); }
    public function supplier()      { return $this->belongsTo(User::class, 'supplier_id'); }
    public function approvedBy()    { return $this->belongsTo(User::class, 'approved_by_admin_id'); }
    public function items()         { return $this->hasMany(PricingAgreementItem::class); }
    public function versions()      { return $this->hasMany(PricingAgreementVersion::class); }

    /* ── status helpers ──────────────────────────────────── */
    public function isDraft(): bool      { return $this->status === 'DRAFT'; }
    public function isPending(): bool    { return in_array($this->status, ['PENDING_CUSTOMER', 'PENDING_ADMIN'], true); }
    public function isActive(): bool     { return $this->status === 'ACTIVE'
        && $this->valid_from->lte(now()->toDateString())
        && $this->valid_to->gte(now()->toDateString()); }
    public function isExpired(): bool    { return $this->status === 'EXPIRED'
        || ($this->status === 'ACTIVE' && $this->valid_to->lt(now()->toDateString())); }
    public function isTerminated(): bool { return $this->status === 'TERMINATED'; }

    /**
     * Does this agreement apply to the given pharmacy?
     * Used by the price resolver at order time.
     */
    public function appliesTo(string $userId): bool
    {
        if ($userId === $this->customer_id) return true;

        if ($this->scope === 'MASTER_AND_CHILDREN') {
            $childIds = \DB::table('pharmacy_group_members')
                ->where('master_user_id', $this->customer_id)
                ->pluck('pharmacy_user_id');
            return $childIds->contains($userId);
        }

        if ($this->scope === 'SPECIFIC_CHILDREN') {
            return in_array($userId, $this->scoped_pharmacy_ids ?? [], true);
        }

        return false;
    }
}

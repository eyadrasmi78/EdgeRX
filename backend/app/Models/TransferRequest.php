<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Phase D1 — pharmacy-to-pharmacy transfer (paired Return + Purchase legs).
 *
 * Status enum (string column, no DB constraint — checked in services/controllers):
 *   INITIATED, SUPPLIER_REVIEW, ACCEPTED_BY_SUPPLIER, B_CONFIRMED,
 *   QC_INTAKE, QC_INSPECTION, QC_PASSED, QC_FAILED,
 *   AWAITING_B_PAYMENT, RELEASED, COMPLETED, CANCELLED
 *
 * Discovery mode: DIRECT (A names B up-front) | MARKETPLACE (listed once supplier accepts).
 *
 * Escrow status: NONE → LOCKED (when QC_PASSED) → RELEASED (when B pays + ships) | REFUNDED (cancel/QC fail).
 */
class TransferRequest extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'source_user_id', 'target_user_id', 'supplier_id',
        'discovery_mode', 'status',
        'source_order_id', 'return_order_id', 'purchase_order_id',
        'source_refund_amount', 'target_purchase_amount',
        'supplier_fee_flat', 'supplier_fee_percent', 'supplier_fee_applied',
        'escrow_status',
        'qc_inspector_id', 'qc_passed_at', 'qc_failed_reason',
        'audit_pdf_path', 'source_credit_note_no', 'target_invoice_no',
        'notes', 'released_at', 'completed_at', 'cancelled_at',
    ];

    protected $casts = [
        'source_refund_amount'    => 'decimal:2',
        'target_purchase_amount'  => 'decimal:2',
        'supplier_fee_flat'       => 'decimal:2',
        'supplier_fee_percent'    => 'decimal:2',
        'supplier_fee_applied'    => 'decimal:2',
        'qc_passed_at'            => 'datetime',
        'released_at'             => 'datetime',
        'completed_at'            => 'datetime',
        'cancelled_at'            => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (TransferRequest $t) {
            if (empty($t->id))             $t->id             = (string) Str::uuid();
            if (empty($t->status))         $t->status         = 'INITIATED';
            if (empty($t->escrow_status))  $t->escrow_status  = 'NONE';
        });
    }

    /* ── relations ─────────────────────────────────────────── */
    public function source()        { return $this->belongsTo(User::class, 'source_user_id'); }
    public function target()        { return $this->belongsTo(User::class, 'target_user_id'); }
    public function supplier()      { return $this->belongsTo(User::class, 'supplier_id'); }
    public function inspector()     { return $this->belongsTo(User::class, 'qc_inspector_id'); }
    public function items()         { return $this->hasMany(TransferRequestItem::class); }
    public function inspections()   { return $this->hasMany(TransferQcInspection::class); }
    public function sourceOrder()   { return $this->belongsTo(Order::class, 'source_order_id'); }
    public function returnOrder()   { return $this->belongsTo(Order::class, 'return_order_id'); }
    public function purchaseOrder() { return $this->belongsTo(Order::class, 'purchase_order_id'); }

    /* ── status helpers ────────────────────────────────────── */
    public function isOpen(): bool       { return !in_array($this->status, ['COMPLETED', 'CANCELLED', 'QC_FAILED'], true); }
    public function isTerminal(): bool   { return in_array($this->status, ['COMPLETED', 'CANCELLED', 'QC_FAILED'], true); }
    public function awaitingSupplier(): bool { return in_array($this->status, ['INITIATED', 'SUPPLIER_REVIEW'], true); }
    public function awaitingTarget(): bool   { return $this->status === 'ACCEPTED_BY_SUPPLIER'; }
    public function inQc(): bool          { return in_array($this->status, ['QC_INTAKE', 'QC_INSPECTION'], true); }
    public function isReleased(): bool    { return in_array($this->status, ['RELEASED', 'COMPLETED'], true); }
    public function isMarketplace(): bool { return $this->discovery_mode === 'MARKETPLACE'; }

    /**
     * Visibility rule for marketplace listings:
     * Only listings that the supplier has accepted are visible to the supplier's
     * customer network. Pre-acceptance, only A + supplier + admin see it.
     */
    public function isMarketplaceVisible(): bool
    {
        return $this->isMarketplace()
            && in_array($this->status, ['ACCEPTED_BY_SUPPLIER'], true)
            && empty($this->target_user_id);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransferRequestItem extends Model
{
    protected $fillable = [
        'transfer_request_id', 'product_id',
        'quantity',
        'unit_price_refund', 'unit_price_resale',
        'batch_number', 'lot_number', 'expiry_date',
        'gs1_barcode', 'temperature_log_path', 'photo_paths',
        'qc_status', 'qc_failed_reason',
    ];

    protected $casts = [
        'quantity'           => 'integer',
        'unit_price_refund'  => 'decimal:2',
        'unit_price_resale'  => 'decimal:2',
        'expiry_date'        => 'date',
        'photo_paths'        => 'array',
    ];

    public function transferRequest() { return $this->belongsTo(TransferRequest::class); }
    public function product()         { return $this->belongsTo(Product::class, 'product_id'); }
}

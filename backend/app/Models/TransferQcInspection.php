<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransferQcInspection extends Model
{
    protected $fillable = [
        'transfer_request_id', 'inspector_id',
        'inspected_at', 'result', 'notes', 'signature_path',
    ];

    protected $casts = [
        'inspected_at' => 'datetime',
    ];

    public function transferRequest() { return $this->belongsTo(TransferRequest::class); }
    public function inspector()       { return $this->belongsTo(User::class, 'inspector_id'); }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingAgreementVersion extends Model
{
    protected $fillable = [
        'pricing_agreement_id', 'version', 'snapshot', 'activated_at',
    ];

    protected $casts = [
        'snapshot'      => 'array',
        'version'       => 'integer',
        'activated_at'  => 'datetime',
    ];

    public function agreement() { return $this->belongsTo(PricingAgreement::class, 'pricing_agreement_id'); }
}

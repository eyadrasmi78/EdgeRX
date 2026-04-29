<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'generic_name', 'brand_name',
        'dosage_form', 'strength', 'pack_size',
        'registration_number', 'country_of_origin',
        'indication', 'therapeutic_class', 'detailed_category',
        'product_registration_file_name', 'product_registration_data_url',
        'manufacturer', 'supplier_name', 'supplier_id',
        'category', 'category_level1', 'category_level2', 'category_level3',
        'description', 'price', 'unit_of_measurement', 'stock_level', 'sku',
        'image', 'images', 'video',
        'bonus_threshold', 'bonus_type', 'bonus_value',
        'medical_rep_name', 'medical_rep_email', 'medical_rep_phone', 'medical_rep_whatsapp',
        'is_cold_chain', 'is_controlled_substance', 'transfer_min_shelf_life_months',
    ];

    protected $casts = [
        'images' => 'array',
        'price' => 'decimal:2',
        'bonus_value' => 'decimal:2',
        'stock_level' => 'integer',
        'bonus_threshold' => 'integer',
        'is_cold_chain' => 'boolean',
        'is_controlled_substance' => 'boolean',
        'transfer_min_shelf_life_months' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (Product $p) {
            if (empty($p->id)) $p->id = (string) Str::uuid();
        });
    }

    public function supplier()
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }
}

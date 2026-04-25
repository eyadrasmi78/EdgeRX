<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'genericName' => $this->generic_name,
            'brandName' => $this->brand_name,
            'dosageForm' => $this->dosage_form,
            'strength' => $this->strength,
            'packSize' => $this->pack_size,
            'registrationNumber' => $this->registration_number,
            'countryOfOrigin' => $this->country_of_origin,
            'indication' => $this->indication,
            'therapeuticClass' => $this->therapeutic_class,
            'detailedCategory' => $this->detailed_category,
            'productRegistrationFileName' => $this->product_registration_file_name,
            'productRegistrationDataUrl' => $this->product_registration_data_url,
            'manufacturer' => $this->manufacturer,
            'supplierName' => $this->supplier_name,
            'supplierId' => $this->supplier_id,
            'category' => $this->category,
            'categoryLevel1' => $this->category_level1,
            'categoryLevel2' => $this->category_level2,
            'categoryLevel3' => $this->category_level3,
            'description' => $this->description,
            'price' => (float) $this->price,
            'unitOfMeasurement' => $this->unit_of_measurement,
            'stockLevel' => (int) $this->stock_level,
            'sku' => $this->sku,
            'image' => $this->image,
            'images' => $this->images ?? [],
            'video' => $this->video,
            'bonusThreshold' => $this->bonus_threshold !== null ? (int) $this->bonus_threshold : null,
            'bonusType' => $this->bonus_type,
            'bonusValue' => $this->bonus_value !== null ? (float) $this->bonus_value : null,
            'medicalRepName' => $this->medical_rep_name,
            'medicalRepEmail' => $this->medical_rep_email,
            'medicalRepPhone' => $this->medical_rep_phone,
            'medicalRepWhatsapp' => $this->medical_rep_whatsapp,
        ];
    }
}

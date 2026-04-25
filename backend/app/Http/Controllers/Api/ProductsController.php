<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductsController extends Controller
{
    public function index()
    {
        return ProductResource::collection(Product::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['SUPPLIER', 'FOREIGN_SUPPLIER', 'ADMIN'], true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        $data = $this->validateProduct($request);
        $data['id'] = $data['id'] ?? (string) Str::uuid();
        $data['supplier_id'] = $data['supplier_id'] ?? $user->id;
        $data['supplier_name'] = $data['supplier_name'] ?? $user->name;
        $product = Product::create($data);
        return new ProductResource($product);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $product = Product::findOrFail($id);
        if (!$user->isAdmin() && $product->supplier_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        $data = $this->validateProduct($request, partial: true);
        $product->update($data);
        return new ProductResource($product->fresh());
    }

    private function validateProduct(Request $request, bool $partial = false): array
    {
        $rules = [
            'id' => 'nullable|string',
            'name' => ($partial ? 'nullable' : 'required') . '|string|max:255',
            'description' => ($partial ? 'nullable' : 'required') . '|string',
            'manufacturer' => ($partial ? 'nullable' : 'required') . '|string|max:255',
            'supplierName' => 'nullable|string|max:255',
            'supplierId' => 'nullable|string',
            'category' => ($partial ? 'nullable' : 'required') . '|in:Medicine,Device,Supplement,Herb,Equipment',
            'price' => ($partial ? 'nullable' : 'required') . '|numeric|min:0',
            'unitOfMeasurement' => ($partial ? 'nullable' : 'required') . '|string|max:64',
            'stockLevel' => ($partial ? 'nullable' : 'required') . '|integer|min:0',
            'sku' => ($partial ? 'nullable' : 'required') . '|string|max:128',
            'image' => 'nullable|string',
            'images' => 'nullable|array',
            'video' => 'nullable|string',
            'genericName' => 'nullable|string',
            'brandName' => 'nullable|string',
            'dosageForm' => 'nullable|string',
            'strength' => 'nullable|string',
            'packSize' => 'nullable|string',
            'registrationNumber' => 'nullable|string',
            'countryOfOrigin' => 'nullable|string',
            'indication' => 'nullable|string',
            'therapeuticClass' => 'nullable|string',
            'detailedCategory' => 'nullable|string',
            'productRegistrationFileName' => 'nullable|string',
            'productRegistrationDataUrl' => 'nullable|string',
            'categoryLevel1' => 'nullable|string',
            'categoryLevel2' => 'nullable|string',
            'categoryLevel3' => 'nullable|string',
            'bonusThreshold' => 'nullable|integer|min:0',
            'bonusType' => 'nullable|in:percentage,fixed',
            'bonusValue' => 'nullable|numeric|min:0',
            'medicalRepName' => 'nullable|string',
            'medicalRepEmail' => 'nullable|string',
            'medicalRepPhone' => 'nullable|string',
            'medicalRepWhatsapp' => 'nullable|string',
        ];
        $v = $request->validate($rules);

        // map camelCase → snake_case
        $map = [
            'genericName' => 'generic_name', 'brandName' => 'brand_name',
            'dosageForm' => 'dosage_form', 'packSize' => 'pack_size',
            'registrationNumber' => 'registration_number',
            'countryOfOrigin' => 'country_of_origin',
            'therapeuticClass' => 'therapeutic_class',
            'detailedCategory' => 'detailed_category',
            'productRegistrationFileName' => 'product_registration_file_name',
            'productRegistrationDataUrl' => 'product_registration_data_url',
            'supplierName' => 'supplier_name',
            'supplierId' => 'supplier_id',
            'categoryLevel1' => 'category_level1',
            'categoryLevel2' => 'category_level2',
            'categoryLevel3' => 'category_level3',
            'unitOfMeasurement' => 'unit_of_measurement',
            'stockLevel' => 'stock_level',
            'bonusThreshold' => 'bonus_threshold',
            'bonusType' => 'bonus_type',
            'bonusValue' => 'bonus_value',
            'medicalRepName' => 'medical_rep_name',
            'medicalRepEmail' => 'medical_rep_email',
            'medicalRepPhone' => 'medical_rep_phone',
            'medicalRepWhatsapp' => 'medical_rep_whatsapp',
        ];
        $out = [];
        foreach ($v as $k => $val) {
            $out[$map[$k] ?? $k] = $val;
        }
        return $out;
    }
}

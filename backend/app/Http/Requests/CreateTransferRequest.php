<?php

namespace App\Http\Requests;

use App\Models\Order;
use App\Services\TransferRequestService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        $u = $this->user();
        // CUSTOMER or PHARMACY_MASTER may initiate (master acting on behalf of a child uses placedByUserId pattern).
        return $u && ($u->isCustomer() || $u->isPharmacyMaster());
    }

    public function rules(): array
    {
        return [
            'discoveryMode'      => 'required|in:DIRECT,MARKETPLACE',
            'supplierId'         => 'required|string|exists:users,id',
            'targetUserId'       => 'nullable|string|exists:users,id|required_if:discoveryMode,DIRECT',
            'sourceOrderId'      => 'nullable|string|exists:orders,id',
            'supplierFeeFlat'    => 'nullable|numeric|min:0|max:99999',
            'supplierFeePercent' => 'nullable|numeric|min:0|max:100',
            'notes'              => 'nullable|string|max:2000',

            'items'                       => 'required|array|min:1|max:50',
            'items.*.productId'           => 'required|string|exists:products,id',
            'items.*.quantity'            => 'required|integer|min:1|max:100000',
            'items.*.unitPriceRefund'     => 'required|numeric|min:0|max:1000000',
            'items.*.unitPriceResale'     => 'required|numeric|min:0|max:1000000',
            'items.*.batchNumber'         => 'required|string|max:100',
            'items.*.lotNumber'           => 'nullable|string|max:100',
            'items.*.expiryDate'          => 'required|date|after:today',
            'items.*.gs1Barcode'          => 'nullable|string|max:255',
            'items.*.temperatureLogPath'  => 'nullable|string|max:1000',
            'items.*.photoPaths'          => 'nullable|array|max:10',
            'items.*.photoPaths.*'        => 'string|max:1000',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $items = collect($this->input('items', []))->map(fn($i) => [
                'product_id'           => $i['productId'] ?? null,
                'quantity'             => $i['quantity'] ?? null,
                'expiry_date'          => $i['expiryDate'] ?? null,
                'temperature_log_path' => $i['temperatureLogPath'] ?? null,
            ])->toArray();

            $sourceOrder = $this->input('sourceOrderId')
                ? Order::find($this->input('sourceOrderId'))
                : null;

            $service = app(TransferRequestService::class);
            foreach ($service->complianceErrors($items, $sourceOrder) as $key => $msg) {
                $v->errors()->add($key, $msg);
            }

            // Source-order ownership check
            if ($sourceOrder && $sourceOrder->customer_id !== $this->user()->id
                && $sourceOrder->placed_by_user_id !== $this->user()->id) {
                $v->errors()->add('sourceOrderId', 'Source order does not belong to you.');
            }

            // Target may not be self
            if ($this->input('targetUserId') === $this->user()->id) {
                $v->errors()->add('targetUserId', 'Cannot transfer to yourself.');
            }
        });
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'The given data was invalid.',
            'errors' => $validator->errors(),
        ], 422));
    }

    /** Map camelCase input → snake_case payload for the service. */
    public function toPayload(): array
    {
        return [
            'source_user_id'       => $this->user()->id,
            'target_user_id'       => $this->input('targetUserId'),
            'supplier_id'          => $this->input('supplierId'),
            'discovery_mode'       => $this->input('discoveryMode'),
            'source_order_id'      => $this->input('sourceOrderId'),
            'supplier_fee_flat'    => (float) $this->input('supplierFeeFlat', 0),
            'supplier_fee_percent' => (float) $this->input('supplierFeePercent', 0),
            'notes'                => $this->input('notes'),
            'items' => collect($this->input('items'))->map(fn($i) => [
                'product_id'           => $i['productId'],
                'quantity'             => (int) $i['quantity'],
                'unit_price_refund'    => (float) $i['unitPriceRefund'],
                'unit_price_resale'    => (float) $i['unitPriceResale'],
                'batch_number'         => $i['batchNumber'],
                'lot_number'           => $i['lotNumber'] ?? null,
                'expiry_date'          => $i['expiryDate'],
                'gs1_barcode'          => $i['gs1Barcode'] ?? null,
                'temperature_log_path' => $i['temperatureLogPath'] ?? null,
                'photo_paths'          => $i['photoPaths'] ?? [],
            ])->toArray(),
        ];
    }
}

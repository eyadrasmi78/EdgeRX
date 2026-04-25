<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /api/orders. Only customers with APPROVED status may place orders;
 * the controller enforces that — this just validates the payload shape.
 */
class CreateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'productId' => 'required|string|exists:products,id',
            'quantity' => 'required|integer|min:1|max:100000',
            // Server recomputes bonus from the product — this is informational only.
            'bonusQuantity' => 'nullable|integer|min:0|max:100000',
            // When the requester is a Pharmacy Master, they MAY specify a child pharmacy
            // to place the order on behalf of. Controller validates ownership.
            'onBehalfOfCustomerId' => 'nullable|string|exists:users,id',
        ];
    }
}

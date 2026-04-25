<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderHistoryLog;
use App\Models\Product;
use App\Models\ChatRoom;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrdersController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Order::with('statusHistory');

        // ADMIN sees all; CUSTOMER sees own; SUPPLIER/FOREIGN_SUPPLIER see orders involving their products
        if ($user->isCustomer()) {
            $query->where('customer_id', $user->id);
        } elseif ($user->isSupplier()) {
            $query->where('supplier_id', $user->id);
        }

        return OrderResource::collection($query->orderByDesc('date')->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->isCustomer()) {
            return response()->json(['message' => 'Only customers can place orders.'], 403);
        }

        $data = $request->validate([
            'productId' => 'required|string|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'bonusQuantity' => 'nullable|integer|min:0',
        ]);

        $product = Product::findOrFail($data['productId']);

        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'ORD-' . now()->format('Y') . '-' . strtoupper(Str::random(6)),
            'product_id' => $product->id,
            'product_name' => $product->name,
            'customer_id' => $user->id,
            'customer_name' => $user->name,
            'supplier_id' => $product->supplier_id,
            'supplier_name' => $product->supplier_name,
            'quantity' => $data['quantity'],
            'bonus_quantity' => $data['bonusQuantity'] ?? null,
            'unit_of_measurement' => $product->unit_of_measurement,
            'status' => 'Received',
            'date' => now(),
        ]);
        OrderHistoryLog::create([
            'order_id' => $order->id,
            'status' => 'Received',
            'timestamp' => now(),
        ]);

        // Auto-create chat room for the order so chat works immediately
        ChatRoom::firstOrCreate(['order_id' => $order->id]);

        // event(new \App\Events\OrderCreated($order));

        return new OrderResource($order->load('statusHistory'));
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);
        $authorized = $user->isAdmin()
            || ($user->isCustomer() && $order->customer_id === $user->id)
            || ($user->isSupplier() && $order->supplier_id === $user->id);
        if (!$authorized) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'status' => 'nullable|string',
            'note' => 'nullable|string',
            'declineReason' => 'nullable|string',
            'returnRequested' => 'nullable|boolean',
            'returnReason' => 'nullable|in:DAMAGED,BROKEN,INCORRECT_DETAILS,OTHER',
            'returnNote' => 'nullable|string',
            'bonusQuantity' => 'nullable|integer|min:0',
        ]);

        if (isset($data['status']) && $data['status'] !== $order->status) {
            $order->status = $data['status'];
            OrderHistoryLog::create([
                'order_id' => $order->id,
                'status' => $data['status'],
                'timestamp' => now(),
                'note' => $data['note'] ?? null,
            ]);
            if ($data['status'] === 'Declined' && !empty($data['note'])) {
                $order->decline_reason = $data['note'];
            }
        }
        if (array_key_exists('declineReason', $data))   $order->decline_reason = $data['declineReason'];
        if (array_key_exists('returnRequested', $data)) $order->return_requested = (bool) $data['returnRequested'];
        if (array_key_exists('returnReason', $data))    $order->return_reason = $data['returnReason'];
        if (array_key_exists('returnNote', $data))      $order->return_note = $data['returnNote'];
        if (array_key_exists('bonusQuantity', $data))   $order->bonus_quantity = $data['bonusQuantity'];

        $order->save();
        // event(new \App\Events\OrderStatusChanged($order));
        return new OrderResource($order->fresh()->load('statusHistory'));
    }
}

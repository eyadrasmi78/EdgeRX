<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderHistoryLog;
use App\Models\Product;
use App\Models\ChatRoom;
use App\Models\User;
use App\Notifications\EdgeRxNotification;
use App\Notifications\Recipients;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrdersController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Order::with('statusHistory');

        if ($user->isAdmin()) {
            // no scope
        } elseif ($user->isCustomer()) {
            $query->where('customer_id', $user->id);
        } elseif ($user->isSupplier()) {
            $query->where('supplier_id', $user->id);
        } elseif ($user->isPharmacyMaster()) {
            // Master sees orders for any of its child pharmacies
            $childIds = $user->masterOf()->pluck('users.id');
            $query->whereIn('customer_id', $childIds);
        } else {
            return OrderResource::collection(collect());
        }

        return OrderResource::collection($query->orderByDesc('date')->get());
    }

    public function store(CreateOrderRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();

        // Resolve which pharmacy the order is FOR. Default = the requester.
        // Master may specify onBehalfOfCustomerId for one of its children.
        $customer = $user;
        $placedBy = null;

        if (!empty($data['onBehalfOfCustomerId'])) {
            // Only Pharmacy Masters can place on behalf of a child.
            if (!$user->isPharmacyMaster()) {
                return response()->json(['message' => 'Only Pharmacy Masters can place orders on behalf of another customer.'], 403);
            }
            $target = User::find($data['onBehalfOfCustomerId']);
            if (!$target || !$target->isCustomer()) {
                return response()->json(['message' => 'Target pharmacy not found.'], 404);
            }
            if (!$user->ownsPharmacy($target->id)) {
                return response()->json(['message' => 'You do not own this pharmacy.'], 403);
            }
            if (!$target->isApproved()) {
                return response()->json(['message' => 'Target pharmacy not approved.'], 403);
            }
            $customer = $target;
            $placedBy = $user;
        } else {
            // No on-behalf-of: requester must be a customer.
            if (!$user->isCustomer()) {
                return response()->json(['message' => 'Only customers can place orders for themselves.'], 403);
            }
            if (!$user->isApproved()) {
                return response()->json(['message' => 'Account not approved.'], 403);
            }
        }

        $product = Product::findOrFail($data['productId']);

        // Apply bonus rule server-side
        $bonusQty = null;
        if ($product->bonus_threshold && $data['quantity'] >= $product->bonus_threshold) {
            $bonusQty = $product->bonus_type === 'percentage'
                ? (int) floor($data['quantity'] * (((float) $product->bonus_value) / 100))
                : (int) $product->bonus_value;
        }

        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'ORD-' . now()->format('Y') . '-' . strtoupper(Str::random(6)),
            'product_id' => $product->id,
            'product_name' => $product->name,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'supplier_id' => $product->supplier_id,
            'supplier_name' => $product->supplier_name,
            'placed_by_user_id' => $placedBy?->id,
            'quantity' => $data['quantity'],
            'bonus_quantity' => $bonusQty ?? ($data['bonusQuantity'] ?? null),
            'unit_of_measurement' => $product->unit_of_measurement,
            'status' => 'Received',
            'date' => now(),
        ]);
        OrderHistoryLog::create([
            'order_id' => $order->id,
            'status' => 'Received',
            'timestamp' => now(),
            'note' => $placedBy ? "Placed by {$placedBy->name} on behalf of {$customer->name}" : null,
        ]);

        ChatRoom::firstOrCreate(['order_id' => $order->id]);

        // Notify the supplier (no master fan-out — supplier is the sole recipient).
        if ($order->supplier_id) {
            $supplier = User::find($order->supplier_id);
            $supplier?->notify(new EdgeRxNotification(
                kind: 'order_created',
                title: 'New order received',
                message: "{$customer->name} placed an order for {$order->quantity} × {$order->product_name} ({$order->order_number}).",
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['orderId' => $order->id, 'orderNumber' => $order->order_number],
            ));
        }

        return new OrderResource($order->load('statusHistory'));
    }

    public function update(UpdateOrderRequest $request, $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        $authorized = $user->isAdmin()
            || ($user->isCustomer() && $order->customer_id === $user->id)
            || ($user->isSupplier() && $order->supplier_id === $user->id)
            || ($user->isPharmacyMaster() && $user->ownsPharmacy($order->customer_id));
        if (!$authorized) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Suppliers control fulfillment status. Master may confirm receipt / request return on behalf of child.
        $data = $request->validated();

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

        // Fan-out notification to the OTHER party. If supplier acted, notify the customer (and its master).
        // If customer/master acted, notify the supplier.
        $isSupplierActing = $user->id === $order->supplier_id;
        if ($isSupplierActing) {
            $customer = User::with('masteredBy')->find($order->customer_id);
            if ($customer) {
                Recipients::notify($customer, new EdgeRxNotification(
                    kind: 'order_status_changed',
                    title: "Order {$order->order_number} updated",
                    message: "Status is now: {$order->status}." . (!empty($data['note']) ? " Note: {$data['note']}" : ''),
                    actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                    data: ['orderId' => $order->id, 'orderNumber' => $order->order_number, 'status' => $order->status],
                ));
            }
        } elseif ($order->supplier_id) {
            $supplier = User::find($order->supplier_id);
            $supplier?->notify(new EdgeRxNotification(
                kind: 'order_status_changed',
                title: "Order {$order->order_number} updated",
                message: "Status is now: {$order->status}." . (!empty($data['note']) ? " Note: {$data['note']}" : ''),
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['orderId' => $order->id, 'orderNumber' => $order->order_number, 'status' => $order->status],
            ));
        }

        return new OrderResource($order->fresh()->load('statusHistory'));
    }
}

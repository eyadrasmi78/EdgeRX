<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductResource;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderHistoryLog;
use App\Models\ChatRoom;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $items = CartItem::with('product')->where('user_id', $request->user()->id)->get();
        return $items->map(fn ($i) => [
            'product' => $i->product ? (new ProductResource($i->product))->resolve() : null,
            'quantity' => (int) $i->quantity,
        ])->filter(fn ($x) => $x['product'] !== null)->values();
    }

    public function set(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.productId' => 'required|string|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);
        $userId = $request->user()->id;
        DB::transaction(function () use ($userId, $data) {
            CartItem::where('user_id', $userId)->delete();
            foreach ($data['items'] as $i) {
                CartItem::create([
                    'user_id' => $userId,
                    'product_id' => $i['productId'],
                    'quantity' => $i['quantity'],
                ]);
            }
        });
        return $this->index($request);
    }

    public function clear(Request $request)
    {
        CartItem::where('user_id', $request->user()->id)->delete();
        return response()->json(['success' => true]);
    }

    public function checkout(Request $request)
    {
        $user = $request->user();
        if (!$user->isCustomer()) {
            return response()->json(['message' => 'Only customers can check out.'], 403);
        }
        $items = CartItem::with('product')->where('user_id', $user->id)->get();
        if ($items->isEmpty()) {
            return response()->json(['message' => 'Cart is empty.'], 422);
        }

        $orders = [];
        DB::transaction(function () use ($items, $user, &$orders) {
            foreach ($items as $i) {
                $p = $i->product;
                if (!$p) continue;
                // Apply bonus if threshold met
                $bonusQty = null;
                if ($p->bonus_threshold && $i->quantity >= $p->bonus_threshold) {
                    $bonusQty = $p->bonus_type === 'percentage'
                        ? (int) floor($i->quantity * ($p->bonus_value / 100))
                        : (int) $p->bonus_value;
                }
                $order = Order::create([
                    'id' => (string) Str::uuid(),
                    'order_number' => 'ORD-' . now()->format('Y') . '-' . strtoupper(Str::random(6)),
                    'product_id' => $p->id,
                    'product_name' => $p->name,
                    'customer_id' => $user->id,
                    'customer_name' => $user->name,
                    'supplier_id' => $p->supplier_id,
                    'supplier_name' => $p->supplier_name,
                    'quantity' => $i->quantity,
                    'bonus_quantity' => $bonusQty,
                    'unit_of_measurement' => $p->unit_of_measurement,
                    'status' => 'Received',
                    'date' => now(),
                ]);
                OrderHistoryLog::create([
                    'order_id' => $order->id,
                    'status' => 'Received',
                    'timestamp' => now(),
                ]);
                ChatRoom::firstOrCreate(['order_id' => $order->id]);
                $orders[] = $order->load('statusHistory');
                // event(new \App\Events\OrderCreated($order));
            }
            CartItem::where('user_id', $user->id)->delete();
        });

        return [
            'success' => true,
            'orders' => collect($orders)->map(fn ($o) => (new OrderResource($o))->resolve())->values(),
        ];
    }
}

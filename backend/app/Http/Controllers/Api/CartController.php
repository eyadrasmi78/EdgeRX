<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CartSetRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductResource;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderHistoryLog;
use App\Models\ChatRoom;
use App\Models\PricingAgreement;
use App\Models\Product;
use App\Models\User;
use App\Notifications\EdgeRxNotification;
use App\Services\PriceResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CartController extends Controller
{
    public function __construct(private PriceResolver $resolver) {}

    public function index(Request $request)
    {
        $items = CartItem::with('product')
            ->where('user_id', $request->user()->id)
            ->get();

        // Map by-pharmacy where applicable so the SPA's CartDrawer can group masters' carts.
        return $items->map(fn (CartItem $i) => [
            'product' => $i->product ? (new ProductResource($i->product))->resolve() : null,
            'quantity' => (int) $i->quantity,
            'onBehalfOfCustomerId' => $i->on_behalf_of_user_id,
        ])->filter(fn ($x) => $x['product'] !== null)->values();
    }

    public function set(CartSetRequest $request)
    {
        $data = $request->validated();
        $user = $request->user();

        // For masters, every item must specify an onBehalfOfCustomerId that they own.
        // For non-masters, onBehalfOfCustomerId defaults to the user themselves.
        if ($user->isPharmacyMaster()) {
            $childIds = $user->masterOf()->pluck('users.id')->all();
            foreach ($data['items'] as $i) {
                $on = $i['onBehalfOfCustomerId'] ?? null;
                if (!$on) {
                    return response()->json(['message' => 'Pharmacy Masters must specify onBehalfOfCustomerId for every cart item.'], 422);
                }
                if (!in_array($on, $childIds, true)) {
                    return response()->json(['message' => "Pharmacy {$on} is not owned by this master."], 403);
                }
            }
        }

        DB::transaction(function () use ($user, $data) {
            CartItem::where('user_id', $user->id)->delete();
            foreach ($data['items'] as $i) {
                CartItem::create([
                    'user_id' => $user->id,
                    'on_behalf_of_user_id' => $i['onBehalfOfCustomerId'] ?? $user->id,
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

        if (!$user->isCustomer() && !$user->isPharmacyMaster()) {
            return response()->json(['message' => 'Only customers or pharmacy masters can check out.'], 403);
        }
        if (!$user->isApproved()) {
            return response()->json(['message' => 'Account not approved.'], 403);
        }

        $items = CartItem::with('product')->where('user_id', $user->id)->get();
        if ($items->isEmpty()) {
            return response()->json(['message' => 'Cart is empty.'], 422);
        }

        // Pre-fetch the master's children to validate ownership without N+1
        $childIds = $user->isPharmacyMaster()
            ? $user->masterOf()->pluck('users.id')->all()
            : [];

        $orders = [];
        $supplierNotifications = []; // dedupe per supplier

        DB::transaction(function () use ($items, $user, $childIds, &$orders, &$supplierNotifications) {
            foreach ($items as $i) {
                $p = $i->product;
                if (!$p) continue;

                // Resolve customer (the pharmacy the order is FOR)
                $onBehalf = $i->on_behalf_of_user_id ?: $user->id;
                if ($user->isPharmacyMaster()) {
                    if (!in_array($onBehalf, $childIds, true)) continue; // skip orphaned items
                    $customer = User::find($onBehalf);
                } else {
                    $customer = $user;
                }
                if (!$customer || !$customer->isApproved()) continue;

                // Resolve contract pricing (Phase D2). Falls back to catalog if no agreement applies.
                $priced = ['unitPrice' => (float) ($p->price ?? 0), 'pricingSource' => 'CATALOG'];
                if ($p->supplier_id) {
                    try {
                        $priced = $this->resolver->resolve($customer->id, $p->supplier_id, $p->id, (int) $i->quantity);
                    } catch (\DomainException $e) {
                        // BLOCK mode rejects below-MOQ; bubble a clear 422 to the SPA
                        return response()->json([
                            'message' => "Cannot check out item {$p->name}: " . $e->getMessage(),
                        ], 422);
                    }
                }

                // Bonus rules: only apply if (a) catalog pricing OR (b) agreement.bonuses_apply = true
                $bonusQty = null;
                $applyBonus = $priced['pricingSource'] === 'CATALOG'
                    || (($priced['pricingAgreementId'] ?? null)
                        && PricingAgreement::find($priced['pricingAgreementId'])?->bonuses_apply);
                if ($applyBonus && $p->bonus_threshold && $i->quantity >= $p->bonus_threshold) {
                    $bonusQty = $p->bonus_type === 'percentage'
                        ? (int) floor($i->quantity * ($p->bonus_value / 100))
                        : (int) $p->bonus_value;
                }

                $order = Order::create([
                    'id' => (string) Str::uuid(),
                    'order_number' => 'ORD-' . now()->format('Y') . '-' . strtoupper(Str::random(6)),
                    'product_id' => $p->id,
                    'product_name' => $p->name,
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->name,
                    'supplier_id' => $p->supplier_id,
                    'supplier_name' => $p->supplier_name,
                    'placed_by_user_id' => $user->isPharmacyMaster() ? $user->id : null,
                    'quantity' => $i->quantity,
                    'bonus_quantity' => $bonusQty,
                    'unit_of_measurement' => $p->unit_of_measurement,
                    'status' => 'Received',
                    'date' => now(),
                    // Phase D2 — pricing source provenance
                    'pricing_source'              => $priced['pricingSource'],
                    'pricing_agreement_id'        => $priced['pricingAgreementId']      ?? null,
                    'pricing_agreement_version'   => $priced['pricingAgreementVersion'] ?? null,
                    'contracted_unit_price'       => $priced['contractedUnitPrice']     ?? null,
                    'catalog_unit_price'          => $priced['catalogUnitPrice']        ?? null,
                    'savings_amount'              => $priced['savingsAmount']           ?? null,
                ]);
                OrderHistoryLog::create([
                    'order_id' => $order->id,
                    'status' => 'Received',
                    'timestamp' => now(),
                    'note' => $user->isPharmacyMaster()
                        ? "Placed by {$user->name} on behalf of {$customer->name}"
                        : null,
                ]);
                ChatRoom::firstOrCreate(['order_id' => $order->id]);

                $orders[] = $order->load(['statusHistory', 'placedBy', 'buyingGroup']);

                if ($order->supplier_id) {
                    $supplierNotifications[$order->supplier_id][] = $order;
                }
            }
            CartItem::where('user_id', $user->id)->delete();
        });

        // Outside the transaction, fan-out notifications to suppliers (one per supplier, not per order)
        foreach ($supplierNotifications as $supplierId => $supplierOrders) {
            $supplier = User::find($supplierId);
            if (!$supplier) continue;
            $count = count($supplierOrders);
            $first = $supplierOrders[0];
            $supplier->notify(new EdgeRxNotification(
                kind: 'order_created',
                title: $count === 1 ? 'New order received' : "{$count} new orders received",
                message: $count === 1
                    ? "{$first->customer_name} placed an order for {$first->quantity} × {$first->product_name} ({$first->order_number})."
                    : "{$count} new orders just landed in your queue.",
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['orderIds' => array_column($supplierOrders, 'id')],
            ));
        }

        return [
            'success' => true,
            'orders' => collect($orders)->map(fn ($o) => (new OrderResource($o))->resolve())->values(),
        ];
    }
}

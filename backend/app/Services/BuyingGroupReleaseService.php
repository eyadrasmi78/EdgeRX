<?php

namespace App\Services;

use App\Models\BuyingGroup;
use App\Models\ChatRoom;
use App\Models\Order;
use App\Models\OrderHistoryLog;
use App\Models\User;
use App\Notifications\EdgeRxNotification;
use App\Notifications\Recipients;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Encapsulates the "release" transition: BuyingGroup goes from
 * (OPEN|COLLECTING|LOCKED) → RELEASED. Creates one Order per ACCEPTED
 * member, apportions the bonus, links each Order back to the group,
 * fires notifications.
 *
 * If the threshold is NOT met → the group is DISSOLVED instead. No orders.
 *
 * Per locked decision #15: supplier-side view = N independent orders linked
 * by group_id (the "GROUP: …" badge is purely a frontend render hint).
 */
final class BuyingGroupReleaseService
{
    public function __construct(private BuyingGroupBonusApportionment $apportion) {}

    /**
     * @return array{released: bool, orderIds: string[], reason?: string}
     */
    public function release(BuyingGroup $group): array
    {
        if ($group->isTerminal()) {
            return ['released' => false, 'orderIds' => [], 'reason' => 'already_terminal'];
        }

        $accepted = $group->members()->where('status', 'ACCEPTED')->get();
        if ($accepted->isEmpty()) {
            return $this->dissolve($group, 'no_accepted_members');
        }
        if ($group->acceptedQuantity() < (int) $group->target_quantity) {
            return $this->dissolve($group, 'threshold_not_met');
        }

        $product = $group->product;
        if (!$product) {
            return $this->dissolve($group, 'product_missing');
        }

        $shares = $this->apportion->compute($group);

        $orderIds = [];
        DB::transaction(function () use ($group, $accepted, $product, $shares, &$orderIds) {
            foreach ($accepted as $m) {
                $bonusQty = $shares[$m->id] ?? null;
                $order = Order::create([
                    'id' => (string) Str::uuid(),
                    'order_number' => 'ORD-' . now()->format('Y') . '-BG' . strtoupper(Str::random(5)),
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'customer_id' => $m->customer_id,
                    'customer_name' => $m->customer?->name ?? '',
                    'supplier_id' => $product->supplier_id,
                    'supplier_name' => $product->supplier_name,
                    'placed_by_user_id' => null,
                    'buying_group_id' => $group->id,
                    'quantity' => (int) $m->committed_quantity,
                    'bonus_quantity' => $bonusQty,
                    'unit_of_measurement' => $product->unit_of_measurement,
                    'status' => 'Received',
                    'date' => now(),
                ]);
                OrderHistoryLog::create([
                    'order_id' => $order->id,
                    'status' => 'Received',
                    'timestamp' => now(),
                    'note' => "Released from buying group: {$group->name}",
                ]);
                ChatRoom::firstOrCreate(['order_id' => $order->id]);

                $m->update([
                    'apportioned_bonus' => $bonusQty,
                    'resulting_order_id' => $order->id,
                ]);

                $orderIds[] = $order->id;
            }

            $group->update([
                'status' => 'RELEASED',
                'released_at' => now(),
            ]);
        });

        $this->notifyOnRelease($group, $accepted->pluck('customer_id')->all(), $orderIds);

        return ['released' => true, 'orderIds' => $orderIds];
    }

    /** Mark group as DISSOLVED + notify everyone with a reason. */
    public function dissolve(BuyingGroup $group, string $reason = 'admin_cancel'): array
    {
        if ($group->isTerminal()) {
            return ['released' => false, 'orderIds' => [], 'reason' => 'already_terminal'];
        }
        $group->update([
            'status' => 'DISSOLVED',
            'dissolved_at' => now(),
        ]);
        $this->notifyOnDissolve($group, $reason);
        return ['released' => false, 'orderIds' => [], 'reason' => $reason];
    }

    /** Single supplier notification + per-member notification (with bonus). */
    private function notifyOnRelease(BuyingGroup $group, array $memberCustomerIds, array $orderIds): void
    {
        $supplier = User::find($group->supplier_id);
        if ($supplier) {
            $supplier->notify(new EdgeRxNotification(
                kind: 'buying_group_released',
                title: 'Buying group released',
                message: "Group \"{$group->name}\" released " . count($orderIds) . " orders for " . $group->acceptedQuantity() . " × {$group->product?->name}.",
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['groupId' => $group->id, 'orderIds' => $orderIds],
            ));
        }
        foreach ($memberCustomerIds as $cid) {
            $customer = User::with('masteredBy')->find($cid);
            if (!$customer) continue;
            Recipients::notify($customer, new EdgeRxNotification(
                kind: 'buying_group_released',
                title: 'Your buying group order is in!',
                message: "Group \"{$group->name}\" reached its target. Your portion has been placed with {$group->supplier?->name}.",
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['groupId' => $group->id],
            ));
        }
    }

    private function notifyOnDissolve(BuyingGroup $group, string $reason): void
    {
        $msg = match ($reason) {
            'threshold_not_met' => 'Did not reach the bulk threshold — dissolved.',
            'no_accepted_members' => 'No members accepted — dissolved.',
            'admin_cancel' => 'Cancelled by admin.',
            default => 'Dissolved.',
        };
        foreach ($group->members as $m) {
            $customer = User::with('masteredBy')->find($m->customer_id);
            if (!$customer) continue;
            Recipients::notify($customer, new EdgeRxNotification(
                kind: 'buying_group_dissolved',
                title: "Buying group dissolved: {$group->name}",
                message: $msg,
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['groupId' => $group->id, 'reason' => $reason],
            ));
        }
    }
}

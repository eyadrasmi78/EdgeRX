<?php

namespace App\Services;

use App\Models\BuyingGroup;
use App\Models\BuyingGroupMember;
use App\Models\Product;

/**
 * Computes the aggregate bonus for a buying group and apportions it
 * pro-rata across ACCEPTED members.
 *
 * Per locked decision #14 (pro-rata): each member gets a share of the bonus
 * proportional to their committed_quantity / total accepted qty.
 *
 * Edge cases:
 *  - Floor each apportioned share to keep integers; the leftover (rounding remainder)
 *    goes to the LARGEST committed member to keep the math fair.
 *  - If aggregate accepted qty < threshold → no bonus (caller dissolves the group).
 *  - Fixed-bonus rule: aggregate bonus = bonus_value once (not per-member); still apportioned
 *    pro-rata so the largest buyer typically gets it.
 *  - Percentage-bonus rule: aggregate_bonus = floor(total_qty * bonus_value / 100).
 */
final class BuyingGroupBonusApportionment
{
    /**
     * @return array<int, int>  member_id => apportioned_bonus
     */
    public function compute(BuyingGroup $group): array
    {
        /** @var Product|null $p */
        $p = $group->product;
        if (!$p || !$p->bonus_threshold || !$p->bonus_value || !$p->bonus_type) {
            return [];
        }

        /** @var array<BuyingGroupMember> $members */
        $members = $group->members()->where('status', 'ACCEPTED')->get()->all();
        $totalQty = 0;
        foreach ($members as $m) $totalQty += (int) $m->committed_quantity;

        if ($totalQty < (int) $p->bonus_threshold) return [];

        // Aggregate bonus to distribute
        $aggregate = $p->bonus_type === 'percentage'
            ? (int) floor($totalQty * (((float) $p->bonus_value) / 100))
            : (int) $p->bonus_value;

        if ($aggregate <= 0) return [];

        // Pro-rata floor for each member
        $shares = [];
        $assigned = 0;
        foreach ($members as $m) {
            $share = (int) floor(((int) $m->committed_quantity / $totalQty) * $aggregate);
            $shares[$m->id] = $share;
            $assigned += $share;
        }

        // Remainder → assign to largest committed (deterministic; ties broken by lowest member id)
        $remainder = $aggregate - $assigned;
        if ($remainder > 0 && !empty($members)) {
            usort($members, function ($a, $b) {
                $cmp = ((int) $b->committed_quantity) <=> ((int) $a->committed_quantity);
                return $cmp !== 0 ? $cmp : ((int) $a->id) <=> ((int) $b->id);
            });
            // Distribute one unit at a time so we don't dump all remainder on a single member
            // when remainder > member count — fair fallback.
            for ($i = 0; $i < $remainder; $i++) {
                $shares[$members[$i % count($members)]->id] += 1;
            }
        }

        return $shares;
    }
}

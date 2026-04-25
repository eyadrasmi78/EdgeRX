<?php

namespace App\Console\Commands;

use App\Models\BuyingGroup;
use App\Services\BuyingGroupReleaseService;
use Illuminate\Console\Command;

/**
 * Sweeps buying_groups whose window_ends_at has passed and either
 *   - releases them (threshold met → orders created)
 *   - dissolves them (threshold not met → notify + close)
 *
 * Idempotent: terminal groups are skipped. Safe to run on every minute,
 * but realistically scheduled hourly via withSchedule() in bootstrap/app.php.
 */
class AutoReleaseBuyingGroupsCommand extends Command
{
    protected $signature = 'buying-groups:auto-release
                            {--force : Process every non-terminal group, ignoring window_ends_at}';

    protected $description = 'Auto-release expired buying groups (or dissolve them if threshold not met)';

    public function handle(BuyingGroupReleaseService $release): int
    {
        $now = now();
        $force = (bool) $this->option('force');

        $query = BuyingGroup::whereIn('status', ['OPEN', 'COLLECTING', 'LOCKED']);
        if (!$force) {
            $query->whereNotNull('window_ends_at')->where('window_ends_at', '<=', $now);
        }
        $groups = $query->get();

        $released = 0;
        $dissolved = 0;
        $skipped = 0;

        foreach ($groups as $g) {
            $g->load(['product', 'members.customer']);
            if ($g->thresholdMet()) {
                $r = $release->release($g);
                if ($r['released']) {
                    $released++;
                    $this->info("Released {$g->id} ({$g->name}) — " . count($r['orderIds']) . ' orders');
                } else {
                    $skipped++;
                    $this->warn("Skipped {$g->id}: " . ($r['reason'] ?? 'unknown'));
                }
            } else {
                $release->dissolve($g, 'threshold_not_met');
                $dissolved++;
                $this->info("Dissolved {$g->id} ({$g->name}) — threshold not met");
            }
        }

        $this->line('');
        $this->info("Auto-release sweep: released={$released} dissolved={$dissolved} skipped={$skipped} (of " . $groups->count() . ' eligible)');
        return self::SUCCESS;
    }
}

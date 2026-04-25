<?php

namespace App\Console\Commands;

use App\Mail\DailyDigestMail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * Sends one summary email per user covering their notifications from the last 24h.
 *
 * Notifications are still posted in real time to the bell — this is an additional
 * once-a-day catch-up email, NOT a replacement for per-event emails (yet).
 *
 * Skips users with zero recent notifications. Marks digested notifications with
 * `data->digested_at` so we don't double-include them tomorrow if the schedule
 * runs twice (e.g. server clock drift).
 */
class SendDailyDigestCommand extends Command
{
    protected $signature = 'notifications:digest
                            {--since=24 : Look-back window in hours}
                            {--dry-run : Build digests but skip the actual mail send}';

    protected $description = 'Send a daily digest email of recent notifications to each affected user';

    public function handle(): int
    {
        $hours = (int) $this->option('since');
        $dryRun = (bool) $this->option('dry-run');
        $since = Carbon::now()->subHours($hours);
        $appUrl = rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/';

        // Find every notifiable that has unsent + recent notifications.
        $rows = DatabaseNotification::query()
            ->where('created_at', '>=', $since)
            ->where('notifiable_type', User::class)
            ->whereRaw("(data::jsonb -> 'digested_at') IS NULL")
            ->orderBy('notifiable_id')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('notifiable_id');

        $usersDigested = 0;
        $emailsSent = 0;

        foreach ($rows as $userId => $userRows) {
            $user = User::find($userId);
            if (!$user || !$user->email || !filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                continue; // skip the admin/admin demo (email = "admin")
            }

            $items = [];
            foreach ($userRows->take(20) as $n) {
                $data = is_array($n->data) ? $n->data : (json_decode($n->data ?? '{}', true) ?: []);
                $items[] = [
                    'title' => $data['title'] ?? 'Update',
                    'message' => $data['message'] ?? '',
                    'type' => $data['type'] ?? 'info',
                    'when' => optional($n->created_at)->diffForHumans() ?? '',
                ];
            }
            if (empty($items)) continue;

            $usersDigested++;
            if ($dryRun) {
                $this->info("[dry-run] Would send digest to {$user->email} ({$user->name}) — " . count($items) . ' items');
                continue;
            }

            try {
                Mail::to($user->email)->send(new DailyDigestMail($user->name ?? 'there', $items, $appUrl));
                $emailsSent++;
                // Mark digested so we don't re-include on a subsequent run within the window
                foreach ($userRows as $n) {
                    $data = is_array($n->data) ? $n->data : (json_decode($n->data ?? '{}', true) ?: []);
                    $data['digested_at'] = now()->toIso8601String();
                    $n->data = $data;
                    $n->save();
                }
            } catch (\Throwable $e) {
                $this->error("Digest send failed for {$user->email}: " . $e->getMessage());
            }
        }

        $this->info("Digest sweep: users={$usersDigested} sent={$emailsSent}" . ($dryRun ? ' (dry-run)' : ''));
        return self::SUCCESS;
    }
}

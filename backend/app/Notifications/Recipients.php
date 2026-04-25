<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Notification;

/**
 * Centralized notification dispatch — fan out to a customer AND any pharmacy master
 * that owns them. Used by every controller that previously called `$customer->notify(...)`.
 *
 * For non-customer recipients (suppliers, admins) this just forwards to ->notify and
 * the master fan-out is a no-op.
 */
final class Recipients
{
    /** Notify a single user; if they're a customer with a master, also notify the master. */
    public static function notify(User $user, Notification $n): void
    {
        $user->notify($n);

        if ($user->isCustomer()) {
            // Eager-loaded if available; otherwise one extra query — masters are rare so OK.
            $masters = $user->relationLoaded('masteredBy')
                ? $user->masteredBy
                : $user->masteredBy()->get();
            foreach ($masters as $master) {
                $master->notify($n);
            }
        }
    }

    /** Notify every supplier (used for global broadcasts, not currently used). */
    public static function notifyMany(iterable $users, Notification $n): void
    {
        foreach ($users as $u) {
            self::notify($u, $n);
        }
    }
}

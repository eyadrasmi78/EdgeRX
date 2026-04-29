<?php

namespace App\Console\Commands;

use App\Models\PricingAgreement;
use App\Models\User;
use App\Notifications\EdgeRxNotification;
use App\Notifications\Recipients;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Daily sweep: notify customer + supplier when an ACTIVE agreement is within
 * its renew_notice_days window of valid_to. Also auto-flips ACTIVE → EXPIRED
 * past valid_to (or auto-renews if auto_renew = true and no objections).
 *
 * Auto-renew creates a v(n+1) DRAFT clone of the agreement under the supplier,
 * leaving the original to expire naturally — supplier still has to send + customer
 * still has to sign. Auto-renew speeds up admin work, not parties' responsibilities.
 */
class SendAgreementRenewalRemindersCommand extends Command
{
    protected $signature = 'pricing-agreements:renewal-reminders {--dry-run}';
    protected $description = 'Notify parties about imminent agreement expiry; flip past-due agreements to EXPIRED';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $today = now()->toDateString();
        $stats = ['notified' => 0, 'expired' => 0, 'auto_renewed' => 0];

        $active = PricingAgreement::where('status', 'ACTIVE')->get();

        foreach ($active as $a) {
            $validTo = Carbon::parse($a->valid_to);

            // Past expiry → mark EXPIRED (and optionally seed a renewal draft)
            if ($validTo->lt(now()->startOfDay())) {
                if ($dry) {
                    $this->info("[dry] would expire {$a->agreement_number}");
                } else {
                    $a->update(['status' => 'EXPIRED']);
                    $stats['expired']++;
                    $this->notifyExpired($a);
                    if ($a->auto_renew) {
                        $this->seedRenewalDraft($a);
                        $stats['auto_renewed']++;
                    }
                }
                continue;
            }

            // In renewal-notice window → notify both sides
            $noticeStart = $validTo->copy()->subDays((int) $a->renew_notice_days);
            if ($today >= $noticeStart->toDateString()) {
                if ($dry) {
                    $this->info("[dry] would notify {$a->agreement_number} (expires {$validTo->toDateString()})");
                } else {
                    $this->notifyRenewalDue($a, $validTo);
                    $stats['notified']++;
                }
            }
        }

        $this->info("Renewal sweep: notified={$stats['notified']} expired={$stats['expired']} auto_renewed={$stats['auto_renewed']}" . ($dry ? ' (dry-run)' : ''));
        return self::SUCCESS;
    }

    private function notifyRenewalDue(PricingAgreement $a, Carbon $validTo): void
    {
        $msg = "Agreement {$a->agreement_number} expires on {$validTo->toDateString()}. Review and renew if needed.";
        foreach ([$a->customer_id, $a->supplier_id] as $uid) {
            $u = User::with('masteredBy')->find($uid);
            if (!$u) continue;
            Recipients::notify($u, new EdgeRxNotification(
                kind: 'agreement_renewal_due',
                title: 'Pricing agreement expires soon',
                message: $msg,
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['agreementId' => $a->id, 'expiresAt' => $validTo->toDateString()],
            ));
        }
    }

    private function notifyExpired(PricingAgreement $a): void
    {
        foreach ([$a->customer_id, $a->supplier_id] as $uid) {
            $u = User::with('masteredBy')->find($uid);
            if (!$u) continue;
            Recipients::notify($u, new EdgeRxNotification(
                kind: 'agreement_expired',
                title: 'Pricing agreement expired',
                message: "Agreement {$a->agreement_number} expired today. Future orders will use catalog pricing.",
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['agreementId' => $a->id],
            ));
        }
    }

    /**
     * Auto-renew helper: clone the just-expired agreement as a DRAFT v(n+1).
     * Supplier still needs to send + customer still needs to sign.
     */
    private function seedRenewalDraft(PricingAgreement $a): void
    {
        $clone = PricingAgreement::create([
            'customer_id'         => $a->customer_id,
            'supplier_id'         => $a->supplier_id,
            'status'              => 'DRAFT',
            'version'             => $a->version + 1,
            'valid_from'          => now()->toDateString(),
            'valid_to'            => now()->copy()->addYear()->toDateString(),
            'auto_renew'          => $a->auto_renew,
            'renew_notice_days'   => $a->renew_notice_days,
            'moq_fallback_mode'   => $a->moq_fallback_mode,
            'scope'               => $a->scope,
            'scoped_pharmacy_ids' => $a->scoped_pharmacy_ids,
            'bonuses_apply'       => $a->bonuses_apply,
            'notes'               => "Auto-renewed from {$a->agreement_number}",
        ]);
        foreach ($a->items as $it) {
            \App\Models\PricingAgreementItem::create([
                'pricing_agreement_id'      => $clone->id,
                'product_id'                => $it->product_id,
                'unit_price'                => $it->unit_price,
                'min_order_quantity'        => $it->min_order_quantity,
                'max_period_quantity'       => $it->max_period_quantity,
                'committed_period_quantity' => $it->committed_period_quantity,
                'tier_breaks'               => $it->tier_breaks,
            ]);
        }
        // Notify supplier so they can send to customer
        $s = User::find($a->supplier_id);
        if ($s) {
            $s->notify(new EdgeRxNotification(
                kind: 'agreement_auto_renew_draft',
                title: 'Auto-renewal draft created',
                message: "{$a->agreement_number} expired — a renewal draft {$clone->agreement_number} is ready for your review and send.",
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['draftAgreementId' => $clone->id],
            ));
        }
    }
}

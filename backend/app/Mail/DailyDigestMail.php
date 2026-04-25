<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DailyDigestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        /** @var array<int, array{title: string, message: string, type: string, when: string}> */
        public array $items,
        public string $appUrl,
    ) {}

    public function build(): self
    {
        $count = count($this->items);
        return $this->subject("[EdgeRX] Your daily digest — {$count} update" . ($count === 1 ? '' : 's'))
            ->view('emails.daily_digest');
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ChatMessageResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'senderId' => $this->sender_id,
            'senderName' => $this->sender_name,
            'text' => $this->text,
            'timestamp' => optional($this->timestamp)->toIso8601String(),
        ];
    }
}

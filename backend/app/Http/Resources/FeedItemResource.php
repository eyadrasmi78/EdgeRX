<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class FeedItemResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'timestamp' => optional($this->timestamp)->toIso8601String(),
            'authorId' => $this->author_id,
            'authorName' => $this->author_name,
            'authorRole' => $this->author_role,
            'isPinned' => (bool) $this->is_pinned,
            'expiryDate' => optional($this->expiry_date)->toIso8601String(),
            'metadata' => $this->metadata ?: null,
        ];
    }
}

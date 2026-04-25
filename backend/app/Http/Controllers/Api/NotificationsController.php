<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        return $user->notifications()->latest()->limit(50)->get()->map(function ($n) {
            $data = is_array($n->data) ? $n->data : json_decode($n->data ?? '{}', true);
            return [
                'id' => $n->id,
                'type' => $data['type'] ?? 'info',
                'message' => $data['message'] ?? '',
                'timestamp' => optional($n->created_at)->getTimestamp() * 1000,
                'readAt' => optional($n->read_at)->toIso8601String(),
                'data' => $data,
            ];
        });
    }

    public function markRead(Request $request, $id)
    {
        $n = $request->user()->notifications()->where('id', $id)->first();
        if ($n) $n->markAsRead();
        return response()->json(['success' => true]);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['success' => true]);
    }
}

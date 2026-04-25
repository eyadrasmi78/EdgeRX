<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatMessageResource;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChatsController extends Controller
{
    public function rooms(Request $request)
    {
        $user = $request->user();
        $orderQuery = Order::query();
        if ($user->isCustomer()) $orderQuery->where('customer_id', $user->id);
        elseif ($user->isSupplier()) $orderQuery->where('supplier_id', $user->id);
        $orderIds = $orderQuery->pluck('id');

        $rooms = ChatRoom::whereIn('order_id', $orderIds)
            ->with(['messages' => fn ($q) => $q->orderBy('timestamp')])
            ->get();

        return $rooms->map(fn ($r) => [
            'orderId' => $r->order_id,
            'messages' => ChatMessageResource::collection($r->messages)->resolve(),
        ]);
    }

    public function messages(Request $request, $orderId)
    {
        $this->authorizeOrder($request, $orderId);
        ChatRoom::firstOrCreate(['order_id' => $orderId]);
        $msgs = ChatMessage::where('order_id', $orderId)->orderBy('timestamp')->get();
        return ChatMessageResource::collection($msgs);
    }

    public function send(Request $request, $orderId)
    {
        $this->authorizeOrder($request, $orderId);
        $data = $request->validate([
            'text' => 'required|string|max:4000',
        ]);
        ChatRoom::firstOrCreate(['order_id' => $orderId]);
        $user = $request->user();
        $msg = ChatMessage::create([
            'id' => (string) Str::uuid(),
            'order_id' => $orderId,
            'sender_id' => $user->id,
            'sender_name' => $user->name,
            'text' => $data['text'],
            'timestamp' => now(),
        ]);
        // event(new \App\Events\MessageSent($msg));
        return new ChatMessageResource($msg);
    }

    private function authorizeOrder(Request $request, string $orderId): void
    {
        $user = $request->user();
        $order = Order::findOrFail($orderId);
        if (!$user->isAdmin() && $order->customer_id !== $user->id && $order->supplier_id !== $user->id) {
            abort(403, 'Forbidden.');
        }
    }
}

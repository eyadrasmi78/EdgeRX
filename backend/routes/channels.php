<?php

use Illuminate\Support\Facades\Broadcast;

// Future: per-order chat channel + per-user notification channel.
// For 4h-demo we leave broadcasting on the "log" driver.

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('orders.{orderId}', function ($user, $orderId) {
    $order = \App\Models\Order::find($orderId);
    if (!$order) return false;
    return $user->id === $order->customer_id || $user->id === $order->supplier_id || $user->role === 'ADMIN';
});

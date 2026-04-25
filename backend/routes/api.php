<?php

use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\ChatsController;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\NotificationsController;
use App\Http\Controllers\Api\OrdersController;
use App\Http\Controllers\Api\PartnershipsController;
use App\Http\Controllers\Api\ProductsController;
use App\Http\Controllers\Api\UsersController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| EdgeRX API
|--------------------------------------------------------------------------
| Sanctum SPA cookie auth (statefulApi() in bootstrap/app.php).
| Mutating endpoints sit behind auth + per-controller authorization checks.
*/

Route::get('/healthz', fn () => response()->json([
    'status' => 'ok',
    'service' => 'edgerx-api',
    'time' => now()->toIso8601String(),
]));

// --- Public auth ---
Route::post('/auth/login',    [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:6,1');

// --- Authenticated ---
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout',  [AuthController::class, 'logout']);
    Route::get('/auth/me',       [AuthController::class, 'me']);

    // Users (admin scopes inside controller)
    Route::get('/users',                 [UsersController::class, 'index']);
    Route::get('/users/{id}',            [UsersController::class, 'show']);
    Route::patch('/users/{id}',          [UsersController::class, 'update']);
    Route::patch('/users/{id}/status',   [UsersController::class, 'updateStatus'])->middleware('role:ADMIN');
    Route::post('/users/{id}/team-members',                  [UsersController::class, 'addTeamMember']);
    Route::patch('/users/{id}/team-members/{memberId}',      [UsersController::class, 'updateTeamMember']);

    // Products
    Route::get('/products',          [ProductsController::class, 'index']);
    Route::post('/products',         [ProductsController::class, 'store']);
    Route::patch('/products/{id}',   [ProductsController::class, 'update']);

    // Orders
    Route::get('/orders',            [OrdersController::class, 'index']);
    Route::post('/orders',           [OrdersController::class, 'store']);
    Route::patch('/orders/{id}',     [OrdersController::class, 'update']);

    // Cart
    Route::get('/cart',              [CartController::class, 'index']);
    Route::put('/cart',              [CartController::class, 'set']);
    Route::delete('/cart',           [CartController::class, 'clear']);
    Route::post('/cart/checkout',    [CartController::class, 'checkout']);

    // Chats
    Route::get('/chats',                          [ChatsController::class, 'rooms']);
    Route::get('/chats/{orderId}/messages',       [ChatsController::class, 'messages']);
    Route::post('/chats/{orderId}/messages',      [ChatsController::class, 'send']);

    // Feed
    Route::get('/feed',                       [FeedController::class, 'index']);
    Route::post('/feed',                      [FeedController::class, 'store']);
    Route::post('/feed/customer-request',     [FeedController::class, 'customerRequest']);
    Route::post('/feed/advertisement',        [FeedController::class, 'advertisement']);
    Route::post('/feed/admin-news',           [FeedController::class, 'adminNews']);

    // Partnerships
    Route::get('/partnerships',           [PartnershipsController::class, 'index']);
    Route::post('/partnerships',          [PartnershipsController::class, 'store']);
    Route::patch('/partnerships/{id}',    [PartnershipsController::class, 'update']);

    // Notifications
    Route::get('/notifications',                  [NotificationsController::class, 'index']);
    Route::post('/notifications/{id}/read',       [NotificationsController::class, 'markRead']);
    Route::post('/notifications/read-all',        [NotificationsController::class, 'markAllRead']);

    // AI proxy
    Route::post('/ai/analyze-product',    [AIController::class, 'analyzeProduct'])->middleware('throttle:60,1');
    Route::post('/ai/translate-arabic',   [AIController::class, 'translateArabic'])->middleware('throttle:60,1');
});

<?php

use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\ChatsController;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\NotificationsController;
use App\Http\Controllers\Api\OrdersController;
use App\Http\Controllers\Api\PartnershipsController;
use App\Http\Controllers\Api\PharmacyGroupsController;
use App\Http\Controllers\Api\BuyingGroupsController;
use App\Http\Controllers\Api\PricingAgreementsController;
use App\Http\Controllers\Api\ProductsController;
use App\Http\Controllers\Api\TransfersController;
use App\Http\Controllers\Api\UsersController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| EdgeRX API
|--------------------------------------------------------------------------
| Sanctum SPA cookie auth (statefulApi() in bootstrap/app.php).
| Mutating endpoints sit behind auth + per-controller authorization checks.
*/

Route::get('/healthz', HealthController::class);

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
    Route::post('/feed/admin-news',           [FeedController::class, 'adminNews'])->middleware('role:ADMIN');

    // Partnerships
    Route::get('/partnerships',           [PartnershipsController::class, 'index']);
    Route::post('/partnerships',          [PartnershipsController::class, 'store']);
    Route::patch('/partnerships/{id}',    [PartnershipsController::class, 'update']);

    // Pharmacy Master groups (Phase A — Feature 1)
    // /me/pharmacies returns the current master's children (or [] for non-masters)
    Route::get('/me/pharmacies', function (\Illuminate\Http\Request $r) {
        $u = $r->user();
        if (!$u->isPharmacyMaster()) return response()->json([]);
        return \App\Http\Resources\UserResource::collection($u->masterOf()->get());
    });
    // Admin CRUD
    Route::middleware('role:ADMIN')->group(function () {
        Route::get('/admin/pharmacy-groups',                                  [PharmacyGroupsController::class, 'index']);
        Route::post('/admin/pharmacy-groups',                                 [PharmacyGroupsController::class, 'store']);
        Route::get('/admin/pharmacy-groups/{id}',                             [PharmacyGroupsController::class, 'show']);
        Route::patch('/admin/pharmacy-groups/{id}',                           [PharmacyGroupsController::class, 'update']);
        Route::post('/admin/pharmacy-groups/{id}/pharmacies',                 [PharmacyGroupsController::class, 'attach']);
        Route::delete('/admin/pharmacy-groups/{id}/pharmacies/{pharmacyId}',  [PharmacyGroupsController::class, 'detach']);
        Route::delete('/admin/pharmacy-groups/{id}',                          [PharmacyGroupsController::class, 'destroy']);
    });

    // Buying Groups (Phase B — Feature 2)
    Route::get('/buying-groups',                       [BuyingGroupsController::class, 'index']);
    Route::get('/buying-groups/{id}',                  [BuyingGroupsController::class, 'show']);
    Route::post('/buying-groups/{id}/commit',          [BuyingGroupsController::class, 'commit']);
    Route::post('/buying-groups/{id}/accept',          [BuyingGroupsController::class, 'accept']);
    Route::post('/buying-groups/{id}/decline',         [BuyingGroupsController::class, 'decline']);
    Route::middleware('role:ADMIN')->group(function () {
        Route::post('/admin/buying-groups',                           [BuyingGroupsController::class, 'store']);
        Route::post('/admin/buying-groups/{id}/members',              [BuyingGroupsController::class, 'addMember']);
        Route::delete('/admin/buying-groups/{id}/members/{memberId}', [BuyingGroupsController::class, 'removeMember']);
        Route::post('/admin/buying-groups/{id}/release',              [BuyingGroupsController::class, 'adminRelease']);
        Route::post('/admin/buying-groups/{id}/dissolve',             [BuyingGroupsController::class, 'adminDissolve']);
    });

    // Pricing Agreements (Phase D2)
    Route::get('/pricing-agreements',                       [PricingAgreementsController::class, 'index']);
    Route::get('/pricing-agreements/{id}',                  [PricingAgreementsController::class, 'show']);
    Route::post('/pricing-agreements',                      [PricingAgreementsController::class, 'store']);
    Route::post('/pricing-agreements/{id}/send',            [PricingAgreementsController::class, 'sendToCustomer']);
    Route::post('/pricing-agreements/{id}/sign',            [PricingAgreementsController::class, 'customerSign']);
    Route::post('/pricing-agreements/{id}/terminate',       [PricingAgreementsController::class, 'terminate']);
    Route::post('/pricing/quote',                           [PricingAgreementsController::class, 'quote']);
    Route::middleware('role:ADMIN')->group(function () {
        Route::post('/admin/pricing-agreements/{id}/approve', [PricingAgreementsController::class, 'adminApprove']);
        Route::post('/admin/pricing-agreements/{id}/reject',  [PricingAgreementsController::class, 'adminReject']);
    });

    // Pharmacy-to-pharmacy Transfers (Phase D1)
    Route::get('/transfers',                          [TransfersController::class, 'index']);
    Route::get('/transfers/{id}',                     [TransfersController::class, 'show']);
    Route::post('/transfers',                         [TransfersController::class, 'store']);
    Route::post('/transfers/{id}/supplier/accept',    [TransfersController::class, 'supplierAccept']);
    Route::post('/transfers/{id}/supplier/reject',    [TransfersController::class, 'supplierReject']);
    Route::post('/transfers/{id}/target/confirm',     [TransfersController::class, 'targetConfirm']);
    Route::post('/transfers/{id}/intake',             [TransfersController::class, 'intake']);
    Route::post('/transfers/{id}/qc/start',           [TransfersController::class, 'qcStart']);
    Route::post('/transfers/{id}/qc/pass',            [TransfersController::class, 'qcPass']);
    Route::post('/transfers/{id}/qc/fail',            [TransfersController::class, 'qcFail']);
    Route::post('/transfers/{id}/payment/confirm',    [TransfersController::class, 'confirmPayment']);
    Route::post('/transfers/{id}/complete',           [TransfersController::class, 'complete']);
    Route::post('/transfers/{id}/cancel',             [TransfersController::class, 'cancel']);
    Route::get('/transfers/{id}/audit',               [TransfersController::class, 'audit']);

    // Notifications
    Route::get('/notifications',                  [NotificationsController::class, 'index']);
    Route::post('/notifications/{id}/read',       [NotificationsController::class, 'markRead']);
    Route::post('/notifications/read-all',        [NotificationsController::class, 'markAllRead']);

    // AI proxy
    Route::post('/ai/analyze-product',    [AIController::class, 'analyzeProduct'])->middleware('throttle:60,1');
    Route::post('/ai/translate-arabic',   [AIController::class, 'translateArabic'])->middleware('throttle:60,1');
});

<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| EdgeRX API routes
|--------------------------------------------------------------------------
| All /api/* paths run under the Sanctum stateful guard (statefulApi() in
| bootstrap/app.php). Mutating routes go through FormRequests + Policies.
*/

Route::get('/healthz', fn () => response()->json([
    'status' => 'ok',
    'service' => 'edgerx-api',
    'time' => now()->toIso8601String(),
]));

// Phase 2 will fill in:
//   /auth/{login,register,logout,me}
//   /users[, /{id}, /{id}/status, /{id}/team-members]
//   /products
//   /orders
//   /chats
//   /feed
//   /partnerships
//   /notifications
//   /ai/{analyze-product, translate-arabic}
//   /uploads

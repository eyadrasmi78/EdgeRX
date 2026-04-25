<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule) {
        // Sweep buying groups whose deadline passed: release if threshold met, else dissolve.
        $schedule->command('buying-groups:auto-release')
            ->hourly()
            ->withoutOverlapping(10)
            ->onOneServer();

        // Daily notification digest — single email summarising the last 24h of activity.
        // Runs at 09:00 UTC (12:00 Kuwait time = noon).
        $schedule->command('notifications:digest')
            ->dailyAt('09:00')
            ->withoutOverlapping(15)
            ->onOneServer();
    })
    ->withMiddleware(function (Middleware $middleware) {
        // Sanctum SPA: stateful cookie auth on /api/*
        $middleware->statefulApi();

        // CORS on all groups so /sanctum/csrf-cookie + /api/* both honor it
        $middleware->prepend(HandleCors::class);

        // Force JSON responses + 401 (not redirect) on /api/*
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // Aliases for use in routes/policies
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
        ]);

        // Security headers on every response (web + api)
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);

        // Trust DO App Platform's reverse proxy so $request->isSecure() and
        // $request->ip() reflect the real client behind X-Forwarded-* headers.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // JSON 401 on /api/* instead of redirect to login route
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });
    })
    ->create();

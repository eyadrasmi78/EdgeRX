<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // HSTS only when actually served over HTTPS (App Platform terminates TLS)
        if ($request->isSecure() || strtolower($request->header('X-Forwarded-Proto', '')) === 'https') {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // No CSP for API responses by default — they're consumed by JS, not rendered.
        // The frontend's nginx.prod.conf adds its own headers for the SPA.
        return $response;
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Server-side proxy for Gemini calls. Browser never sees the API key.
 * Two endpoints mirror the prototype's frontend/services/aiService.ts.
 */
class AIController extends Controller
{
    private function gemini(string $prompt): ?string
    {
        $key = config('services.gemini.key', env('GEMINI_API_KEY'));
        $model = config('services.gemini.model', env('GEMINI_MODEL', 'gemini-1.5-flash'));
        if (empty($key)) return null;

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$key}";

        try {
            $resp = Http::timeout(20)->post($url, [
                'contents' => [
                    ['parts' => [['text' => $prompt]]],
                ],
            ]);
            if (!$resp->successful()) {
                Log::warning('Gemini error', ['status' => $resp->status(), 'body' => $resp->body()]);
                return null;
            }
            $json = $resp->json();
            return $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
        } catch (\Throwable $e) {
            Log::error('Gemini exception', ['msg' => $e->getMessage()]);
            return null;
        }
    }

    public function analyzeProduct(Request $request)
    {
        $data = $request->validate(['product' => 'required|array']);
        $p = $data['product'];
        $prompt = "You are a medical supply chain expert. In 3 short sentences (and ONLY 3 sentences), describe the typical clinical use of this product and which hospital department would order it.\n"
                . "Name: {$p['name']}\nManufacturer: " . ($p['manufacturer'] ?? '') . "\nCategory: " . ($p['category'] ?? '')
                . "\nDescription: " . ($p['description'] ?? '');
        $text = $this->gemini($prompt);
        return response()->json([
            'text' => $text ?? 'Expert analysis is currently unavailable. Please consult the product brochure or contact the medical representative for clinical guidance.',
        ]);
    }

    public function translateArabic(Request $request)
    {
        $data = $request->validate(['text' => 'required|string|max:8000']);
        $prompt = "Translate the following English medical product description into clear, professional Modern Standard Arabic suitable for healthcare professionals. Output ONLY the Arabic translation, no explanation.\n\n" . $data['text'];
        $text = $this->gemini($prompt);
        return response()->json([
            'text' => $text ?? 'الترجمة العربية غير متوفرة حالياً. يرجى مراجعة كتيب المنتج.',
        ]);
    }
}

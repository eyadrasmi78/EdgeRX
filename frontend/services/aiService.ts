/**
 * Routes to the Laravel-hosted Gemini proxy at /api/ai/*
 * The Gemini API key never reaches the browser.
 */

import { Product } from "../types";
import { api } from "./api";

export const AIService = {
  analyzeProduct: async (product: Product): Promise<string> => {
    try {
      const r = await api.post<{ text: string }>('/ai/analyze-product', { product });
      return r.text || "AI analysis temporarily unavailable.";
    } catch {
      return "AI analysis temporarily unavailable.";
    }
  },

  translateToArabic: async (text: string): Promise<string> => {
    try {
      const r = await api.post<{ text: string }>('/ai/translate-arabic', { text });
      return r.text || "Translation temporarily unavailable.";
    } catch {
      return "Translation temporarily unavailable.";
    }
  },
};

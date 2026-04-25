
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

// Helper to safely get the API key
const getApiKey = (): string | undefined => {
  return process.env.API_KEY;
};

export const AIService = {
  analyzeProduct: async (product: Product): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      return "AI capabilities are not available (Missing API Key).";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        You are a medical supply expert assistant. 
        Analyze the following product details:
        Name: ${product.name}
        Category: ${product.category}
        Description: ${product.description}
        Manufacturer: ${product.manufacturer}

        Please provide a brief, professional summary (max 3 sentences) explaining:
        1. What this is primarily used for.
        2. Who (which medical department) would typically order this.
        Do not use markdown.
      `;

      const response = await ai.models.generateContent({
        // Updated model to 'gemini-3-flash-preview' for basic text tasks as per guidelines
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "Could not generate analysis.";
    } catch (error) {
      console.error("AI Service Error:", error);
      return "AI analysis temporarily unavailable.";
    }
  },

  translateToArabic: async (text: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      return "Translation unavailable (Missing API Key).";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Translate the following medical product description text to Arabic. 
        Provide a direct, accurate and professional translation suitable for medical professionals.
        Do not include any introductory or concluding remarks (like "Here is the translation").
        
        Text: "${text}"
      `;

      const response = await ai.models.generateContent({
        // Updated model to 'gemini-3-flash-preview' for basic text tasks as per guidelines
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "Could not generate translation.";
    } catch (error) {
      console.error("AI Translation Error:", error);
      return "Translation temporarily unavailable.";
    }
  }
};

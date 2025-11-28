import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

/**
 * STANDARDIZED API KEY RETRIEVAL (Nov 2025)
 * Hierarchy:
 * 1. VITE_GEMINI_API_KEY from import.meta.env (Vite - browser)
 * 2. VITE_GEMINI_API_KEY from process.env (Node.js)
 * 3. localStorage.getItem('GEMINI_API_KEY') (dev/testing only - browser)
 * 4. Legacy API_KEY (deprecated, warn user)
 *
 * SECURITY NOTE: localStorage is used ONLY for development/testing.
 * Production apps MUST use environment variables.
 */
export function getApiKey(): string | null {
  // Priority 1: Vite environment variable (browser builds)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }

  // Priority 2: Process environment variable (Node.js or SSR)
  if (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }

  // Priority 3: localStorage (dev/testing only - NOT for production)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const localKey = localStorage.getItem('GEMINI_API_KEY');
      if (localKey) {
        console.warn('[AI] Using API key from localStorage. This is NOT secure for production!');
        return localKey;
      }
    } catch (e) {
      // localStorage may be blocked by privacy settings
    }
  }

  // Priority 4: Legacy support (deprecated)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    console.warn('[AI] Using deprecated API_KEY. Please migrate to VITE_GEMINI_API_KEY.');
    return process.env.API_KEY;
  }

  // Also check legacy VITE_API_KEY
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
    console.warn('[AI] Using deprecated VITE_API_KEY. Please migrate to VITE_GEMINI_API_KEY.');
    return import.meta.env.VITE_API_KEY;
  }

  return null;
}

// This function creates the AI client. It's called only once.
function createClient(): GoogleGenAI {
  const apiKey = getApiKey();

  if (!apiKey) {
    const errorMessage = `[AI CONFIGURATION ERROR]\n\nGemini API key not found!\n\nPlease follow these steps:\n1. Get your API key from: https://makersuite.google.com/app/apikey\n2. Create a .env.local file in the project root\n3. Add this line: VITE_GEMINI_API_KEY=your_actual_api_key_here\n\nWithout a valid API key, AI features will not work.`;

    console.error(errorMessage);

    // Return a safe fallback wrapper that mimics the real API to prevent crashes.
    const fallbackModels = {
      async generateContent(_request: any): Promise<GenerateContentResponse> {
        return {
          get text() { return errorMessage; },
          candidates: [],
        } as unknown as GenerateContentResponse;
      },
      // You can add other methods like generateImages here if needed
    };

    return {
      models: fallbackModels,
    } as unknown as GoogleGenAI;
  }

  try {
    // Correct initialization as per guidelines
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    const errorMessage = `[AI] Failed to initialize GoogleGenAI client: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);

    // Return the same fallback on initialization error
    const fallbackModels = {
      async generateContent(_request: any): Promise<GenerateContentResponse> {
        return {
          get text() { return errorMessage; },
          candidates: [],
        } as unknown as GenerateContentResponse;
      },
    };
    return {
      models: fallbackModels,
    } as unknown as GoogleGenAI;
  }
}

/**
 * Returns a singleton Gemini client.
 * It's created once and reused.
 */
function getGeminiClient(): GoogleGenAI {
  if (!cachedClient) {
    cachedClient = createClient();
  }
  return cachedClient;
}

/**
 * Singleton instance for global access, configured for Gemini Build Studio.
 */
export const ai = getGeminiClient();
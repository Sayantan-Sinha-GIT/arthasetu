// ─── Google Gemini API Client (server-side only) ───
// All Gemini calls must go through this module.
// NEVER import this from client components — the API key must stay server-side.

import { GoogleGenerativeAI, type GenerateContentResult } from '@google/generative-ai';

export const GEMINI_MODELS = {
  /** Primary established model: advisor, financial planner, scheme explanation — high quality & high quota */
  FLASH: 'gemini-3.6-flash',
  /** Dedicated fallback & lightweight tasks: admin scheme drafting, classification, high throughput */
  FLASH_LITE: 'gemini-3.5-flash-lite',
  /** Alternate aliases */
  FLASH_LATEST: 'gemini-flash-latest',
  FLASH_LITE_LATEST: 'gemini-flash-lite-latest',
} as const;

// ─── Client Singleton ───
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Set it in .env.local. ' +
      'Get one from https://aistudio.google.com/apikey'
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

let clientInstance: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!clientInstance) {
    clientInstance = getGeminiClient();
  }
  return clientInstance;
}

// ─── Helper: Generate with a specific model with automatic fallback ───
export async function generateContent(
  model: string,
  systemInstruction: string,
  userMessage: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    disableFallback?: boolean;
  }
): Promise<string> {
  const client = getClient();
  
  const executeGeneration = async (targetModel: string) => {
    const genModel = client.getGenerativeModel({
      model: targetModel,
      systemInstruction,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 4096,
      },
    });

    const result: GenerateContentResult = await retryWithBackoff(
      () => genModel.generateContent(userMessage)
    );

    const text = result.response.text();
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }
    return text;
  };

  try {
    return await executeGeneration(model);
  } catch (primaryError) {
    // If primary model failed and fallback is allowed, try Flash-Lite
    if (!options?.disableFallback && model !== GEMINI_MODELS.FLASH_LITE) {
      console.warn(`⚠️ Primary Gemini model (${model}) failed. Automatically failing over to fallback model (${GEMINI_MODELS.FLASH_LITE})...`, primaryError);
      return await executeGeneration(GEMINI_MODELS.FLASH_LITE);
    }
    throw primaryError;
  }
}

// ─── Helper: Streaming generation with automatic fallback ───
export async function* generateContentStream(
  model: string,
  systemInstruction: string,
  userMessage: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    disableFallback?: boolean;
  }
): AsyncGenerator<string> {
  const client = getClient();

  const getStream = async (targetModel: string) => {
    const genModel = client.getGenerativeModel({
      model: targetModel,
      systemInstruction,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 4096,
      },
    });

    return await retryWithBackoff(
      () => genModel.generateContentStream(userMessage)
    );
  };

  let activeResult;
  try {
    activeResult = await getStream(model);
  } catch (primaryError) {
    if (!options?.disableFallback && model !== GEMINI_MODELS.FLASH_LITE) {
      console.warn(`⚠️ Primary Gemini stream (${model}) failed. Automatically failing over to fallback model (${GEMINI_MODELS.FLASH_LITE})...`, primaryError);
      activeResult = await getStream(GEMINI_MODELS.FLASH_LITE);
    } else {
      throw primaryError;
    }
  }

  for await (const chunk of activeResult.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

// ─── Exponential Backoff on 429 / 503 (rate limit / service availability) ───
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isTransient =
        error instanceof Error &&
        (error.message.includes('429') ||
         error.message.includes('503') ||
         error.message.includes('Service Unavailable') ||
         error.message.includes('RESOURCE_EXHAUSTED') ||
         error.message.includes('Too Many Requests') ||
         error.message.includes('high demand'));

      if (isTransient && attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`Gemini API transient error (429/503). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  // Should never reach here, but TypeScript needs it
  throw new Error('Max retries exceeded');
}

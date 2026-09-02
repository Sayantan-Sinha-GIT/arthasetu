// ─── Google GenAI API Client (server-side only) ───
// All Gemini calls must go through this module using the official @google/genai SDK.
// NEVER import this from client components — the API key must stay server-side.

import { GoogleGenAI, type Content, type Tool, type FunctionCall } from '@google/genai';
import { getErrorMessage } from '@/lib/utils/errors';
import { groqAgentStream, groqGenerateContent, isGroqConfigured } from '@/lib/groq';

export const GEMINI_MODELS = {
  /** Primary established model: advisor, financial planner, scheme explanation — ultra fast & high availability */
  FLASH: 'gemini-3.5-flash',
  /** Dedicated fallback & lightweight tasks: admin scheme drafting, classification, high throughput */
  FLASH_LITE: 'gemini-3.5-flash-lite',
  /** Alternate aliases */
  FLASH_LATEST: 'gemini-3.5-flash',
  FLASH_LITE_LATEST: 'gemini-3.5-flash-lite',
} as const;

// ─── Client Singleton ───
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Set it in .env.local. ' +
      'Get one from https://aistudio.google.com/apikey'
    );
  }
  return new GoogleGenAI({ apiKey });
}

let clientInstance: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
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
    const response = await retryWithBackoff(() =>
        client.models.generateContent({
          model: targetModel,
          contents: userMessage,
          config: {
            systemInstruction,
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxOutputTokens ?? 4096,
          },
        })
    );

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }
    return text;
  };

  try {
    return await executeGeneration(model);
  } catch (primaryError) {
    if (options?.disableFallback) throw primaryError;

    // Tier 2: the lighter Gemini model, which has its own separate quota.
    if (model !== GEMINI_MODELS.FLASH_LITE) {
      console.warn(`⚠️ Primary Gemini model (${model}) failed. Failing over to ${GEMINI_MODELS.FLASH_LITE}...`, primaryError);
      try {
        return await executeGeneration(GEMINI_MODELS.FLASH_LITE);
      } catch (liteError) {
        return await tryGroqFallback(systemInstruction, userMessage, options, liteError);
      }
    }

    // Already on Flash-Lite and it failed — go straight to the other provider.
    return await tryGroqFallback(systemInstruction, userMessage, options, primaryError);
  }
}

/**
 * Tier 3: a different provider entirely.
 *
 * Both Gemini models draw on the same free-tier project quota — 20 requests a
 * day — so when one is exhausted the other usually is too, and failing over
 * between them buys nothing. Groq is a separate account with far more
 * headroom, which is what actually keeps the app answering.
 */
async function tryGroqFallback(
  systemInstruction: string,
  userMessage: string,
  options: { temperature?: number; maxOutputTokens?: number } | undefined,
  geminiError: unknown
): Promise<string> {
  if (!isGroqConfigured()) throw geminiError;
  console.warn('⚠️ Gemini exhausted. Failing over to Groq...', getErrorMessage(geminiError, 'unknown'));
  try {
    return await groqGenerateContent(systemInstruction, userMessage, options);
  } catch (groqError) {
    console.error('All providers failed. Groq:', getErrorMessage(groqError, 'unknown'));
    // Surface the original Gemini failure: it is the more informative one, and
    // the routes already map it to a user-facing message.
    throw geminiError;
  }
}

// ─── Helper: Streaming generation with automatic fallback ───
export async function* generateContentStream(
  model: string,
  systemInstruction: string,
  userMessage: string | Content[],
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    disableFallback?: boolean;
  }
): AsyncGenerator<string> {
  const client = getClient();

  const getStream = async (targetModel: string) => {
    return await retryWithBackoff(() =>
        client.models.generateContentStream({
          model: targetModel,
          contents: Array.isArray(userMessage) ? userMessage : [userMessage],
          config: {
            systemInstruction,
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxOutputTokens ?? 4096,
          },
        })
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

  for await (const chunk of activeResult) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

// ─── Helper: Agent loop for tool execution ───
export async function* generateAgentStream(
  model: string,
  systemInstruction: string,
  userMessage: string | Content[],
  tools: Tool[],
  toolHandler: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    disableFallback?: boolean;
  }
): AsyncGenerator<string> {
  const client = getClient();

  const history: Content[] = typeof userMessage === 'string'
    ? [{ role: 'user', parts: [{ text: userMessage }] }]
    : userMessage;

  const runAgent = async function* (targetModel: string) {
    const chat = client.chats.create({
      model: targetModel,
      config: {
        systemInstruction,
        tools,
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 4096,
      },
      history: history.slice(0, -1),
    });

    const lastMessage = history[history.length - 1];
    const initialMessage = lastMessage?.parts?.[0]?.text ?? (typeof userMessage === 'string' ? userMessage : '');

    let activeStream = await retryWithBackoff(() =>
      chat.sendMessageStream({ message: initialMessage })
    );

    let maxIterations = 5;
    while (maxIterations > 0) {
      maxIterations--;
      const functionCalls: FunctionCall[] = [];
      for await (const chunk of activeStream) {
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          functionCalls.push(...chunk.functionCalls);
        }
        if (chunk.text) {
          yield chunk.text;
        }
      }

      if (functionCalls.length === 0) {
        break;
      }

      // Execute all function calls returned in this turn
      const responses = await Promise.all(
        functionCalls.map(async (call) => {
          let result: unknown;
          try {
            result = await toolHandler(call.name ?? '', call.args ?? {});
          } catch (err) {
            result = { error: getErrorMessage(err) };
          }
          return {
            functionResponse: {
              name: call.name,
              // The SDK's FunctionResponse type is stricter (Record<string,
              // unknown>) than what toolHandler can actually return (e.g.
              // matchSchemes returns an array) — the Gemini API itself
              // accepts any JSON value here, so this cast doesn't change
              // what's sent, just widens the compile-time type to match.
              response: result as Record<string, unknown>,
              id: call.id,
            },
          };
        })
      );

      activeStream = await retryWithBackoff(() =>
        chat.sendMessageStream({ message: responses })
      );
    }
  };

  try {
    for await (const chunk of runAgent(model)) {
      yield chunk;
    }
    return;
  } catch (primaryError) {
    if (options?.disableFallback) throw primaryError;

    if (model !== GEMINI_MODELS.FLASH_LITE) {
      console.warn(`⚠️ Primary Gemini agent (${model}) failed. Failing over to ${GEMINI_MODELS.FLASH_LITE}...`, primaryError);
      try {
        for await (const chunk of runAgent(GEMINI_MODELS.FLASH_LITE)) {
          yield chunk;
        }
        return;
      } catch (liteError) {
        yield* groqAgentFallback(systemInstruction, history, tools, toolHandler, options, liteError);
        return;
      }
    }

    yield* groqAgentFallback(systemInstruction, history, tools, toolHandler, options, primaryError);
  }
}

/**
 * Last resort for the advisor: run the same tool loop on Groq.
 *
 * Both Gemini models share one 20-a-day project quota, so when the primary is
 * exhausted the fallback almost always is too — without a different provider
 * the advisor simply stops answering.
 */
async function* groqAgentFallback(
  systemInstruction: string,
  history: Content[],
  tools: Tool[],
  toolHandler: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  options: { temperature?: number; maxOutputTokens?: number } | undefined,
  geminiError: unknown
): AsyncGenerator<string> {
  if (!isGroqConfigured()) throw geminiError;
  console.warn('⚠️ Gemini exhausted. Failing over the advisor to Groq...', getErrorMessage(geminiError, 'unknown'));
  try {
    yield* groqAgentStream(systemInstruction, history, tools, toolHandler, options);
  } catch (groqError) {
    console.error('All providers failed for the advisor. Groq:', getErrorMessage(groqError, 'unknown'));
    throw geminiError;
  }
}

// ─── Shared Advisor Scope Definition ───
export const ADVISOR_SCOPE_RULES = `
ALLOWED TOPICS:
1. Micro, small, and rural enterprise business planning, setup, operations, expansion, and strategy in India.
2. Indian government financial assistance schemes, credit initiatives, and subsidies (e.g. PMEGP, MUDRA Shishu/Kishore/Tarun, PM Vishwakarma, NLM, AHIDF, state enterprise missions).
3. Product pricing, supplier sourcing, operating expenses, cash flow management, equipment purchases, and revenue calculations.
4. Business registration, documentation literacy, bank loan applications, and collateral-free loan requirements.
5. Polite greetings, introductory small talk, and expressions of gratitude (e.g., "Hello", "Namaste", "Kem cho", "Good morning", "Thank you").

OFF-TOPIC DISALLOWED TOPICS:
1. General programming, writing code, debugging, or computer science homework (e.g., "write python code for a linked list", "build a React app", "sql queries").
2. Academic homework, essays, science/history exam solutions unrelated to running their Indian micro-enterprise.
3. Entertainment, celebrity trivia, gaming, sports scores, movie plots, recipes unrelated to food business, creative fiction.
4. Roleplaying as an unrelated fictional character or general-purpose personal assistant.
`;

/**
 * Fast query classifier for AI Advisor using Gemini Flash-Lite.
 * Returns 'ON_TOPIC' or 'OFF_TOPIC'.
 */
export async function classifyAdvisorQuery(
  userMessage: string
): Promise<'ON_TOPIC' | 'OFF_TOPIC'> {
  const trimmed = userMessage.trim();
  if (!trimmed) return 'ON_TOPIC';

  const systemInstruction = `You are a strict binary scope classifier for ArthaSetu, a dedicated Indian rural micro-enterprise and business loan advisor.
Determine whether the user query is ON_TOPIC or OFF_TOPIC based on the following scope:
${ADVISOR_SCOPE_RULES}

Classification Rules:
- If the user asks about starting a business, raising poultry, tailoring, dairy, grocery, tea stall, handicrafts, government schemes, loans, profit, pricing, marketing, suppliers, or gives a polite greeting/thanks -> output strictly "ON_TOPIC".
- If the user asks for programming code, algorithms (e.g., linked list, binary tree), homework, essays, general trivia, movies, sports, or non-business topics -> output strictly "OFF_TOPIC".
- Output ONLY the single word "ON_TOPIC" or "OFF_TOPIC" with no markdown, punctuation, or explanation.`;

  try {
    const classification = await generateContent(
      GEMINI_MODELS.FLASH_LITE,
      systemInstruction,
      `User query: "${trimmed}"`,
      { temperature: 0.0, maxOutputTokens: 10, disableFallback: true }
    );
    const cleaned = classification.trim().toUpperCase();
    if (cleaned.includes('OFF_TOPIC')) {
      return 'OFF_TOPIC';
    }
    return 'ON_TOPIC';
  } catch (err) {
    console.warn('Advisor scope classification fallback to ON_TOPIC:', err);
    return 'ON_TOPIC'; // Fail open on transient error
  }
}

/**
 * Returns a concise, warm, localized off-topic redirect message.
 */
export function getAdvisorOffTopicRedirect(language = 'en'): string {
  switch (language) {
    case 'hi':
      return 'नमस्ते! मैं **अर्थसेতু (ArthaSetu)** हूँ — आपका समर्पित ग्रामीण व्यवसाय व सरकारी योजना सलाहकार।\n\nमैं सामान्य कोडिंग, होमवर्क या गैर-व्यावसायिक प्रश्नों में सहायता नहीं कर सकता। कृपया अपने व्यवसाय (जैसे पोल्ट्री, डेयरी, सिलाई, दुकान), सरकारी योजनाओं (PMEGP, MUDRA) या वित्तीय योजना से संबंधित प्रश्न पूछें!';
    case 'bn':
      return 'নমস্কার! আমি **অর্থসেতু (ArthaSetu)** — আপনার নিবেদিত গ্রামীণ ব্যবসা ও সরকারি প্রকল্প উপদেষ্টা।\n\nআমি সাধারণ কোডিং, হোমওয়ার্ক বা ব্যবসায়-বহির্ভূত বিষয়ে সহায়তা করতে পারি না। অনুগ্রহ করে আপনার ব্যবসা, সরকারি প্রকল্প (PMEGP, MUDRA) বা আর্থিক পরিকল্পনা সংক্রান্ত প্রশ্ন জিজ্ঞাসা করুন!';
    case 'as':
      return 'নমস্কাৰ! মই **অৰ্থসেতু (ArthaSetu)** — আপোনাৰ গ্ৰামীণ ব্যৱসায় আৰু চৰকাৰী আঁচনিৰ উপদেষ্টা।\n\nঅনুগ্ৰহ কৰি আপোনাৰ ব্যৱসায়, চৰকাৰী অনুদান (PMEGP, MUDRA) বা আৰ্থিক পৰিকল্পনা সম্পৰ্কে প্ৰশ্ন সোধক!';
    default:
      return "Hello! I am **ArthaSetu (अर्थसेतु)** — your dedicated rural business, financial planning, and government scheme advisor.\n\nI can only assist with business planning, enterprise setup, market strategy, and government loan/subsidy schemes (like PMEGP, MUDRA, and NLM). I cannot help with general coding, homework, or unrelated topics.\n\nHow can I help you plan or grow your business today?";
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
         error.message.includes('high demand') ||
         (error as { status?: number })?.status === 429 ||
         (error as { status?: number })?.status === 503);

      if (isTransient && attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`Gemini API transient error (429/503). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Exhausted retries');
}

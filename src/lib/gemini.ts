// ─── Google GenAI API Client (server-side only) ───
// All Gemini calls must go through this module using the official @google/genai SDK.
// NEVER import this from client components — the API key must stay server-side.

import { GoogleGenAI, type Content, type Tool, type FunctionCall } from '@google/genai';
import { getErrorMessage } from '@/lib/utils/errors';
import { groqAgentStream, groqGenerateContent, isGroqConfigured } from '@/lib/groq';
import { looksLikeEverydayBusinessMessage } from '@/lib/advisor/understanding';

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

export interface GenerateContentOptions {
  temperature?: number;
  maxOutputTokens?: number;
  disableFallback?: boolean;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  responseFormatJson?: boolean;
}

// ─── Helper: Generate with a specific model with automatic fallback ───
export async function generateContent(
  model: string,
  systemInstruction: string,
  userMessage: string,
  options?: GenerateContentOptions
): Promise<string> {
  const client = getClient();
  
  const executeGeneration = async (targetModel: string) => {
    const config: Record<string, unknown> = {
      systemInstruction,
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 4096,
    };
    if (options?.responseMimeType) {
      config.responseMimeType = options.responseMimeType;
    }
    if (options?.responseSchema) {
      config.responseSchema = options.responseSchema;
    }

    const response = await retryWithBackoff(() =>
        client.models.generateContent({
          model: targetModel,
          contents: userMessage,
          config,
        }),
      targetModel
    );

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }
    return text;
  };

  // A recent 429 means Gemini is out of quota for the moment. Going through it
  // again only to fail is what made the advisor feel intermittent: the answer
  // eventually arrived from Groq, or the function was killed first. Route
  // straight there while the cool-off lasts.
  if (isGeminiCoolingOff() && !options?.disableFallback && isGroqConfigured()) {
    try {
      return await groqGenerateContent(systemInstruction, userMessage, {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxOutputTokens,
        responseFormatJson: Boolean(options?.responseFormatJson || options?.responseMimeType === 'application/json'),
      });
    } catch {
      // Groq is down too — fall through and give Gemini a chance after all,
      // in case its quota reset early.
    }
  }

  // Flash out of quota a moment ago: begin on Flash-Lite, which has its own.
  const firstModel = pickGeminiModel(model);

  try {
    return await executeGeneration(firstModel);
  } catch (primaryError) {
    if (options?.disableFallback) throw primaryError;

    // Tier 2: Flash-Lite. Gemini's free-tier limits are counted per model, not
    // per project — the usage dashboard shows separate counters for Flash and
    // Flash-Lite — so a rate limit on Flash is exactly when Flash-Lite can still
    // answer. This used to be skipped on a rate limit, on the mistaken belief
    // that both shared one quota, which sent traffic to Groq sooner than needed.
    if (firstModel !== GEMINI_MODELS.FLASH_LITE && !isModelCoolingOff(GEMINI_MODELS.FLASH_LITE)) {
      console.warn(`⚠️ Gemini model (${firstModel}) failed. Failing over to ${GEMINI_MODELS.FLASH_LITE}...`, getErrorMessage(primaryError, 'unknown'));
      try {
        return await executeGeneration(GEMINI_MODELS.FLASH_LITE);
      } catch (liteError) {
        return await tryGroqFallback(systemInstruction, userMessage, options, liteError);
      }
    }

    // Already on Flash-Lite, or it is out of quota too — go to the other provider.
    return await tryGroqFallback(systemInstruction, userMessage, options, primaryError);
  }
}

/**
 * Generate from a document, such as a government circular published as a PDF,
 * plus an instruction. Gemini reads PDFs itself; Groq cannot, so there is no
 * Groq fallback here — only the other Gemini model, which has its own quota.
 */
export async function generateContentFromDocument(
  model: string,
  systemInstruction: string,
  document: { mimeType: string; data: string },
  instruction: string,
  options?: GenerateContentOptions
): Promise<string> {
  const client = getClient();

  const run = async (targetModel: string) => {
    const config: Record<string, unknown> = {
      systemInstruction,
      temperature: options?.temperature ?? 0.2,
      maxOutputTokens: options?.maxOutputTokens ?? 4096,
    };
    if (options?.responseMimeType) config.responseMimeType = options.responseMimeType;

    const response = await retryWithBackoff(
      () =>
        client.models.generateContent({
          model: targetModel,
          contents: [{ role: 'user', parts: [{ inlineData: document }, { text: instruction }] }],
          config,
        }),
      targetModel
    );
    const text = response.text;
    if (!text) throw new Error('Gemini returned an empty response');
    return text;
  };

  const firstModel = pickGeminiModel(model);
  try {
    return await run(firstModel);
  } catch (error) {
    const otherModel = firstModel === GEMINI_MODELS.FLASH_LITE ? GEMINI_MODELS.FLASH : GEMINI_MODELS.FLASH_LITE;
    if (options?.disableFallback || isModelCoolingOff(otherModel)) throw error;
    console.warn(`⚠️ Gemini model (${firstModel}) could not read the document. Trying ${otherModel}...`, getErrorMessage(error, 'unknown'));
    return await run(otherModel);
  }
}

/** The requested model, unless it is out of quota and Flash-Lite is not. */
function pickGeminiModel(model: string): string {
  return model !== GEMINI_MODELS.FLASH_LITE && isModelCoolingOff(model) && !isModelCoolingOff(GEMINI_MODELS.FLASH_LITE)
    ? GEMINI_MODELS.FLASH_LITE
    : model;
}

/**
 * Tier 3: a different provider entirely.
 *
 * Reached once both Gemini models have failed or are out of quota (each has its
 * own small free-tier allowance). Groq is a separate account with far more
 * headroom, which is what keeps the app answering after that.
 */
async function tryGroqFallback(
  systemInstruction: string,
  userMessage: string,
  options: GenerateContentOptions | undefined,
  geminiError: unknown
): Promise<string> {
  if (!isGroqConfigured()) throw geminiError;
  console.warn('⚠️ Gemini exhausted. Failing over to Groq...', getErrorMessage(geminiError, 'unknown'));
  try {
    return await groqGenerateContent(systemInstruction, userMessage, {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxOutputTokens,
      responseFormatJson: Boolean(options?.responseFormatJson || options?.responseMimeType === 'application/json'),
    });
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
        }),
      targetModel
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
/**
 * How long Gemini may produce nothing at all before we give the request to
 * another provider.
 *
 * The advisor runs on a serverless function with a 60s ceiling, and Gemini's
 * observed latency here — 40s to 120s for one answer, tool calls included —
 * regularly exceeds it. When that happens the platform kills the function
 * before a single byte has been streamed, and the user gets the blank
 * "AI assistance is temporarily unavailable" message. Nothing in the old code
 * was watching the clock: it would wait on Gemini indefinitely and lose the
 * whole request rather than spend two seconds asking a provider that was
 * configured, healthy and idle.
 *
 * Only the time to the FIRST token is bounded. Once text is flowing the user
 * is reading it and the answer must not be swapped underneath them.
 */
const FIRST_TOKEN_TIMEOUT_MS = 22000;

/** Marks the give-up above, so the caller can tell it from a real API failure. */
const FIRST_TOKEN_TIMEOUT = 'ARTHASETU_FIRST_TOKEN_TIMEOUT';

function isFirstTokenTimeout(error: unknown): boolean {
  return error instanceof Error && error.message.includes(FIRST_TOKEN_TIMEOUT);
}

/**
 * Passes a stream through untouched, but abandons it if the first chunk does
 * not arrive in time. The underlying generator is closed on the way out so the
 * abandoned request does not keep running.
 */
async function* withFirstTokenDeadline(
  source: AsyncGenerator<string>,
  ms: number
): AsyncGenerator<string> {
  const iterator = source[Symbol.asyncIterator]();
  let awaitingFirst = true;

  while (true) {
    let step: IteratorResult<string>;

    if (awaitingFirst) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        step = await Promise.race([
          iterator.next(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`${FIRST_TOKEN_TIMEOUT}: no output in ${ms}ms`)),
              ms
            );
          }),
        ]);
      } catch (err) {
        try { await iterator.return?.(undefined as never); } catch { /* already closed */ }
        throw err;
      } finally {
        if (timer) clearTimeout(timer);
      }
    } else {
      step = await iterator.next();
    }

    if (step.done) return;
    awaitingFirst = false;
    yield step.value;
  }
}

/**
 * A tool result in the shape Gemini accepts.
 *
 * The API requires an object here. `matchSchemes` returns a list, which was
 * passed straight through on the belief that any JSON value was accepted; it is
 * not — Gemini answers 400 "Proto field is not repeating, cannot start list". So
 * every scheme question failed on Gemini and fell over to Groq, which then had
 * no scheme data and made figures up.
 */
export function toFunctionResponsePayload(result: unknown): Record<string, unknown> {
  if (result && typeof result === 'object' && !Array.isArray(result)) return result as Record<string, unknown>;
  return Array.isArray(result) ? { results: result } : { result };
}

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
      chat.sendMessageStream({ message: initialMessage }),
      targetModel
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
              response: toFunctionResponsePayload(result),
              id: call.id,
            },
          };
        })
      );

      activeStream = await retryWithBackoff(() =>
        chat.sendMessageStream({ message: responses }),
        targetModel
      );
    }
  };

  // See generateContent: skip a provider already known to be out of quota.
  if (isGeminiCoolingOff() && !options?.disableFallback && isGroqConfigured()) {
    let servedByGroq = false;
    try {
      for await (const chunk of groqAgentStream(systemInstruction, history, tools, toolHandler, options)) {
        servedByGroq = true;
        yield chunk;
      }
      return;
    } catch (groqError) {
      // Only safe to retry on Gemini if Groq produced nothing; otherwise the
      // user would see the first half of one answer followed by all of another.
      if (servedByGroq) throw groqError;
      console.warn('Groq unavailable during Gemini cool-off; retrying Gemini.', getErrorMessage(groqError, 'unknown'));
    }
  }

  const firstModel = pickGeminiModel(model);
  // Providers may only be switched before the user has seen any text. After
  // that a failure is reported, not papered over with a second, different answer.
  let yielded = false;
  try {
    for await (const chunk of withFirstTokenDeadline(runAgent(firstModel), FIRST_TOKEN_TIMEOUT_MS)) {
      yielded = true;
      yield chunk;
    }
    return;
  } catch (primaryError) {
    if (options?.disableFallback || yielded) throw primaryError;

    // As above: Flash-Lite has its own quota, so it is tried when Flash is rate
    // limited. Not after a first-token timeout, though — that model was slow,
    // not refused, and the time left belongs to the other provider.
    if (firstModel !== GEMINI_MODELS.FLASH_LITE
        && !isFirstTokenTimeout(primaryError)
        && !isModelCoolingOff(GEMINI_MODELS.FLASH_LITE)) {
      console.warn(`⚠️ Gemini agent (${firstModel}) failed. Failing over to ${GEMINI_MODELS.FLASH_LITE}...`, getErrorMessage(primaryError, 'unknown'));
      try {
        for await (const chunk of withFirstTokenDeadline(runAgent(GEMINI_MODELS.FLASH_LITE), FIRST_TOKEN_TIMEOUT_MS)) {
          yielded = true;
          yield chunk;
        }
        return;
      } catch (liteError) {
        if (yielded) throw liteError;
        yield* groqAgentFallback(systemInstruction, history, tools, toolHandler, options, liteError);
        return;
      }
    }

    yield* groqAgentFallback(systemInstruction, history, tools, toolHandler, options, primaryError);
  }
}

/**
 * Last resort for the advisor: run the same tool loop on Groq, once both
 * Gemini models have failed or are out of their separate free-tier quotas.
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
/** A conversation turn, as much of it as the scope check needs. */
export interface ClassifierTurn {
  role: string;
  content: string;
  id?: string;
}

/**
 * Personal and money details people give when asked for them. None of these
 * read as business on their own — "23 aug 1990" — which is exactly why a scope
 * check that saw one message at a time turned them away.
 */
const PROFILE_DETAIL_PATTERNS: RegExp[] = [
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/,
  /\b\d{4}-\d{1,2}-\d{1,2}\b/,
  /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+\d{2,4}\b/i,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}\b/i,
  /\b(date of birth|dob|born|birthday|my age|years old|my name is|pin ?code|gender|female|male)\b/i,
  /₹|\brupees?\b|\blakhs?\b|\bcrores?\b|\bhazaa?r\b|\bemi\b|\bloans?\b|\bsavings?\b/i,
  /\b[1-9]\d{5}\b/,
  /जन्म|उम्र|आयु|मेरा नाम|रुपये|रुपए|लाख|हजार|টাকা|হাজার|লাখ|জন্ম|বয়স|আমার নাম/,
];

export async function classifyAdvisorQuery(
  userMessage: string,
  recentHistory: ClassifierTurn[] = []
): Promise<'ON_TOPIC' | 'OFF_TOPIC'> {
  const trimmed = userMessage.trim();
  if (!trimmed) return 'ON_TOPIC';

  // Two cases are settled without a model call, which is also quicker and
  // spares the free quota.
  //
  // 1. A reply to a question the advisor just asked is on topic by definition.
  //    "date of birth is 23 aug 1990", sent after the advisor asked for exactly
  //    that, was refused because this check only ever saw the one message. The
  //    page's own greeting does not count: that was not the advisor asking.
  const lastAdvisorTurn = [...recentHistory].reverse().find(
    (turn) => turn?.role === 'assistant' && turn.id !== 'welcome-1' && String(turn.content || '').trim().length > 0
  );
  if (lastAdvisorTurn && /[?？؟]/.test(lastAdvisorTurn.content) && trimmed.split(/\s+/).length <= 40) {
    return 'ON_TOPIC';
  }
  // 2. Personal or money details, whatever came before.
  if (PROFILE_DETAIL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return 'ON_TOPIC';
  }
  // 3. A very short message, or one using everyday words for business, money or
  //    a village trade ("murgi palan", "dukan ke liye paisa").
  if (looksLikeEverydayBusinessMessage(trimmed)) {
    return 'ON_TOPIC';
  }

  const systemInstruction = `You are a strict binary scope classifier for ArthaSetu, a dedicated Indian rural micro-enterprise and business loan advisor.
Determine whether the user query is ON_TOPIC or OFF_TOPIC based on the following scope:
${ADVISOR_SCOPE_RULES}

Classification Rules:
- If the user asks about starting a business, raising poultry, tailoring, dairy, grocery, tea stall, handicrafts, government schemes, loans, profit, pricing, marketing, suppliers, or gives a polite greeting/thanks -> output strictly "ON_TOPIC".
- If the user asks for programming code, algorithms (e.g., linked list, binary tree), homework, essays, general trivia, movies, sports, or non-business topics -> output strictly "OFF_TOPIC".
- If the user is answering or following up on the advisor's previous message (their name, age, date of birth, gender,
  family, location, money, experience, loans, or a yes/no), output "ON_TOPIC".
- When the query is short, vague or ambiguous — a bare mention of money, prices, "kitna", "how much", an unclear
  fragment, or anything you are not confident about — output "ON_TOPIC".
- Output ONLY the single word "ON_TOPIC" or "OFF_TOPIC" with no markdown, punctuation, or explanation.

Bias: only answer "OFF_TOPIC" when the query is CLEARLY unrelated to business, money or livelihood. Our users are
rural micro-entrepreneurs, many with limited literacy, who ask short and imprecise questions; turning one of them
away is far more damaging than letting a borderline question through, and the advisor itself declines off-topic
requests anyway. When in doubt, answer "ON_TOPIC".`;

  // This guard runs before the answer does, so its latency lands on every single
  // reply's time-to-first-word — and it only redirects off-topic questions. It
  // was the dominant cost in the advisor: sharing the main chain meant sharing
  // its retries and its slow model, and measured end to end it accounted for
  // most of the wait before the user saw any text at all.
  //
  // A ten-token yes/no question does not need the strongest available model, it
  // needs the quickest one. Groq answers it in well under a second, so it is
  // asked first when configured and Gemini is kept as the fallback. The hard
  // ceiling stays as a backstop: this check must never be the reason a
  // legitimate question times out, so overrunning it fails open.
  const CLASSIFIER_TIMEOUT_MS = 6000;
  const prompt = lastAdvisorTurn
    ? `Advisor's previous message (the user may be replying to it): "${lastAdvisorTurn.content.slice(-400)}"\nUser query: "${trimmed}"`
    : `User query: "${trimmed}"`;
  const classifyOnce = () =>
    isGroqConfigured()
      // Not 10 tokens, despite the answer being one word: Groq's gpt-oss models
      // spend output tokens on reasoning before they emit any content, so a
      // tight cap yields an empty completion and the check silently fails open.
      // The budget is headroom for that, not a longer answer.
      ? groqGenerateContent(systemInstruction, prompt, { temperature: 0.0, maxOutputTokens: 512 })
      : generateContent(GEMINI_MODELS.FLASH_LITE, systemInstruction, prompt,
          { temperature: 0.0, maxOutputTokens: 10, disableFallback: true });

  try {
    const classification = await Promise.race([
      classifyOnce(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('scope classification timed out')), CLASSIFIER_TIMEOUT_MS)
      ),
    ]);
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
 * Whether a written redirect exists in this language. For any other language
 * the scope check is skipped: an English refusal to someone writing Tamil helps
 * nobody, and the advisor itself declines off-topic requests in their language.
 */
export function hasLocalizedOffTopicRedirect(language = 'en'): boolean {
  return ['en', 'hi', 'bn', 'as'].includes(language);
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

// ─── Retry policy, and why a rate limit is not a retryable error ───
//
// These two failures look alike and must be treated as opposites.
//
// A 503 is genuinely transient: the model is momentarily busy and the same
// request will very likely succeed a second later, so backing off and retrying
// is exactly right.
//
// A 429 is not. It means the free-tier quota is spent, and no amount of waiting
// a few seconds brings it back. Retrying it was actively harmful: each attempt
// re-confirmed the same exhaustion while the clock ran down, and because the
// retry ladder sits *in front of* the provider failover, the request spent its
// entire time budget proving Gemini was unavailable and was killed by the
// serverless duration limit before Groq — which was configured, healthy, and
// idle the whole time — was ever asked. Measured end to end, that was 72s, 85s
// and 102s against a 60s ceiling: the advisor failed while a working provider
// sat unused. A rate limit now fails over instantly instead.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/** Quota spent. Waiting will not help; another provider will. */
export function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Too Many Requests') ||
    message.toLowerCase().includes('quota') ||
    (error as { status?: number })?.status === 429
  );
}

/** Momentary unavailability. Waiting probably will help. */
function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('503') ||
    message.includes('Service Unavailable') ||
    message.includes('high demand') ||
    (error as { status?: number })?.status === 503
  );
}

/**
 * The provider itself failing — overloaded, erroring or unreachable — as
 * opposed to a spent quota or a bad request. Only these trip the circuit breaker.
 */
function isOutageError(error: unknown): boolean {
  if (isTransientError(error)) return true;
  const status = (error as { status?: number })?.status;
  if (typeof status === 'number' && status >= 500) return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /\b50[0-4]\b|INTERNAL|UNAVAILABLE|fetch failed|ECONNRESET|ETIMEDOUT|timed out/i.test(message);
}

/**
 * Once a Gemini model reports exhausted quota, every later call to it in that
 * window hits the same wall. Remembering it — per model, because Flash and
 * Flash-Lite have separate quotas — lets later requests skip straight to the
 * model or provider that can still answer, instead of each one paying the
 * discovery cost again. Short enough that a quota reset is picked up on its own.
 */
const RATE_LIMIT_COOLOFF_MS = 60_000;
const coolingOffUntil = new Map<string, number>();

/**
 * Circuit breaker for outages (not quota): after three provider failures in a
 * row, Gemini is treated as cooling off for a minute so requests go straight
 * to Groq instead of each waiting out the same failure.
 */
let geminiConsecutiveErrors = 0;
let geminiCircuitOpenUntil = 0;

export function noteGeminiSuccess(): void {
  geminiConsecutiveErrors = 0;
}

export function noteGeminiFailure(): void {
  geminiConsecutiveErrors++;
  if (geminiConsecutiveErrors >= 3) {
    geminiCircuitOpenUntil = Date.now() + 60_000;
  }
}

export function isGeminiCircuitOpen(): boolean {
  return Date.now() < geminiCircuitOpenUntil;
}

function noteGeminiRateLimited(model: string): void {
  coolingOffUntil.set(model, Date.now() + RATE_LIMIT_COOLOFF_MS);
}

/** True while this Gemini model is known to be out of quota. */
export function isModelCoolingOff(model: string): boolean {
  return Date.now() < (coolingOffUntil.get(model) ?? 0);
}

/** True while every Gemini model is known to be out of quota or circuit is open. */
export function isGeminiCoolingOff(): boolean {
  return (
    isGeminiCircuitOpen() ||
    (isModelCoolingOff(GEMINI_MODELS.FLASH) && isModelCoolingOff(GEMINI_MODELS.FLASH_LITE))
  );
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  model: string,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      noteGeminiSuccess();
      return result;
    } catch (error: unknown) {
      if (isRateLimitError(error)) {
        // Do not retry, and record it so the next request skips this model
        // rather than rediscovering this.
        noteGeminiRateLimited(model);
        throw error;
      }

      if (isTransientError(error) && attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`Gemini API transient error (503). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (isOutageError(error)) noteGeminiFailure();
      throw error;
    }
  }
  throw new Error('Exhausted retries');
}

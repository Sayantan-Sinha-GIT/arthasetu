// ─── Groq fallback provider (server-side only) ───
//
// Gemini's free tier allows about 20 requests a day per model (Flash and
// Flash-Lite are counted separately), which six routes compete for. Groq's free tier reports a limit of 1,000 requests
// on the same kind of work — fifty times the headroom — so it stands behind
// Gemini as an automatic fallback rather than a replacement.
//
// This suits ArthaSetu's architecture specifically. The project rule is that
// the model never does arithmetic and never invents schemes: the numbers come
// from src/lib/calculator.ts and the schemes from Firestore, and the model
// only explains them in the user's language. That is well within reach of the
// open models Groq serves, so failing over costs little in quality.
//
// NEVER import this from a client component — the API key must stay server-side.

import { getErrorMessage } from '@/lib/utils/errors';

/** Larger model first; the smaller one is both a quality and an outage fallback. */
const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'] as const;

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

let groqConsecutiveErrors = 0;
let groqCircuitOpenUntil = 0;

export function noteGroqSuccess(): void {
  groqConsecutiveErrors = 0;
}

export function noteGroqFailure(): void {
  groqConsecutiveErrors++;
  if (groqConsecutiveErrors >= 3) {
    groqCircuitOpenUntil = Date.now() + 60_000;
  }
}

export function isGroqCircuitOpen(): boolean {
  return Date.now() < groqCircuitOpenUntil;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY) && !isGroqCircuitOpen();
}

export interface GroqOptions {
  temperature?: number;
  maxOutputTokens?: number;
  responseFormatJson?: boolean;
}

/**
 * Groq meters tokens per minute on a rolling window, so a 429 here means "too
 * much in the last sixty seconds", not "out of quota" — unlike Gemini's daily
 * cap, waiting a few seconds genuinely clears it. The advisor's requests are
 * 2,500-3,800 tokens against an 8,000 TPM budget, which is only two or three
 * questions in quick succession; without this a user asking a third question
 * straight away was simply refused.
 *
 * The wait is deliberately bounded. The whole request lives inside a 60s
 * serverless ceiling, and burning that budget waiting would trade a visible
 * error for an invisible timeout, which is worse.
 */
const TPM_RETRY_DELAYS_MS = [4000, 7000];

async function groqFetch(apiKey: string, body: unknown): Promise<Response> {
  const send = () =>
    fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  let res: Response;
  try {
    res = await send();
    for (const delay of TPM_RETRY_DELAYS_MS) {
      if (res.status !== 429) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
      res = await send();
    }
  } catch (err) {
    // Unreachable counts as an outage, the same as a server error.
    noteGroqFailure();
    throw err;
  }

  // Server errors trip the circuit breaker; a 429 or a bad request does not.
  if (res.status >= 500) noteGroqFailure();
  else if (res.ok) noteGroqSuccess();
  return res;
}

async function callGroq(
  model: string,
  systemInstruction: string,
  userMessage: string,
  options?: GroqOptions
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const requestBody: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userMessage },
    ],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxOutputTokens ?? 4096,
  };

  if (options?.responseFormatJson) {
    requestBody.response_format = { type: 'json_object' };
  }

  const res = await groqFetch(apiKey, requestBody);

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(
      `Groq ${model} failed (${res.status}): ${String(json?.error?.message || res.statusText).slice(0, 200)}`
    );
  }

  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`Groq ${model} returned an empty response`);
  }
  return text;
}

/**
 * Generate text via Groq, trying each model in turn.
 *
 * Mirrors the signature of the Gemini helper so it can slot in as a fallback
 * without the calling routes needing to know which provider answered.
 */
export async function groqGenerateContent(
  systemInstruction: string,
  userMessage: string,
  options?: GroqOptions
): Promise<string> {
  let lastError: unknown;
  for (const model of GROQ_MODELS) {
    try {
      return await callGroq(model, systemInstruction, userMessage, options);
    } catch (err) {
      lastError = err;
      console.warn(`Groq model ${model} unavailable:`, getErrorMessage(err, 'unknown error'));
    }
  }
  throw new Error(getErrorMessage(lastError, 'All Groq models failed'));
}

/* ─────────────────────────────────────────────────────────────────────────
   Agentic tool calling

   The advisor is the one route that needs more than plain generation: it
   runs a multi-turn loop where the model asks for calculateFinancials or
   matchSchemes, the server executes it, and the result goes back. Groq
   speaks the OpenAI tool-calling dialect, so the work here is translating
   Gemini's shapes into it and back.

   Deliberately non-streaming: each turn is awaited in full and the final
   answer yielded as one chunk. This is the emergency path, taken only once
   both Gemini models are exhausted, and accumulating OpenAI tool-call
   deltas across a stream is a great deal more machinery to get wrong for a
   difference the user sees as one slightly later reply rather than a
   typewriter effect.
   ───────────────────────────────────────────────────────────────────────── */

interface JsonSchemaNode {
  type?: unknown;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  description?: string;
  [key: string]: unknown;
}

/**
 * Gemini emits schema types as uppercase enums (OBJECT, STRING); JSON Schema —
 * and therefore Groq — wants them lowercase.
 */
function toJsonSchema(node: JsonSchemaNode | undefined): JsonSchemaNode | undefined {
  if (!node || typeof node !== 'object') return node;
  const out: JsonSchemaNode = { ...node };
  if (typeof out.type === 'string') out.type = out.type.toLowerCase();
  if (out.properties) {
    out.properties = Object.fromEntries(
      Object.entries(out.properties).map(([k, v]) => [k, toJsonSchema(v) as JsonSchemaNode])
    );
  }
  if (out.items) out.items = toJsonSchema(out.items);
  return out;
}

// Kept structural and loose rather than importing the SDK's Tool/Content
// types: the caller passes those straight through, and matching their exact
// generics here would couple this provider to the Gemini SDK for no gain.
interface GeminiToolLike {
  functionDeclarations?: { name?: string; description?: string; parameters?: unknown }[];
}
interface GeminiContentLike {
  role?: string;
  parts?: { text?: string }[];
}
interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

export async function* groqAgentStream(
  systemInstruction: string,
  history: GeminiContentLike[],
  tools: GeminiToolLike[],
  toolHandler: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  options?: GroqOptions
): AsyncGenerator<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const openAiTools = tools.flatMap((t) =>
    (t.functionDeclarations || []).map((fn) => ({
      type: 'function' as const,
      function: {
        name: fn.name,
        description: fn.description,
        parameters: toJsonSchema(fn.parameters as JsonSchemaNode | undefined) ?? {
          type: 'object',
          properties: {},
        },
      },
    }))
  );

  const baseMessages: OpenAiMessage[] = [
    { role: 'system', content: systemInstruction },
    ...history.map((c) => ({
      // Gemini calls the assistant turn "model"; OpenAI calls it "assistant".
      role: (c.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: (c.parts || []).map((p) => p.text || '').join(' ').trim(),
    })),
  ];

  // Every model in turn, not just the first.
  //
  // This loop used to be pinned to GROQ_MODELS[0]. Groq meters by tokens per
  // minute per model — 8,000 for this account, against advisor requests of
  // 2,500-3,800 tokens each — so the primary saturates after two or three
  // questions in quick succession, and the advisor then failed outright while
  // the second model sat at zero usage with its own separate budget. The
  // text-only helper in this file already tried both; the advisor's tool loop,
  // which is the path that actually matters, did not.
  //
  // Switching models is only safe before any text has been yielded — once the
  // user is reading an answer it must not be replaced by a different one — so
  // the guard below stops at the first token, exactly like the Gemini path.
  let lastError: unknown;
  for (const model of GROQ_MODELS) {
    let yieldedText = false;
    try {
      yield* runGroqAgent(model, () => { yieldedText = true; });
      return;
    } catch (err) {
      lastError = err;
      if (yieldedText) throw err;
      console.warn(`Groq agent model ${model} unavailable: ${getErrorMessage(err, 'unknown')}`);
    }
  }
  throw new Error(getErrorMessage(lastError, 'All Groq agent models failed'));

  async function* runGroqAgent(model: string, noteYield: () => void): AsyncGenerator<string> {
  // Re-narrowed locally: the guard above is outside this generator, so the
  // compiler treats the captured value as possibly undefined in here.
  const key = apiKey as string;
  // Each attempt starts from the original conversation: a failed run may have
  // appended assistant and tool turns before dying, and replaying those into a
  // different model would corrupt the exchange.
  const messages = baseMessages.map((m) => ({ ...m }));

  // Same ceiling as the Gemini agent loop, so a model that keeps asking for
  // tools cannot spin forever.
  for (let iteration = 0; iteration < 5; iteration++) {
    const res = await groqFetch(key, {
      model,
      messages,
      tools: openAiTools.length ? openAiTools : undefined,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxOutputTokens ?? 4096,
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(
        `Groq agent failed (${res.status}): ${String(json?.error?.message || res.statusText).slice(0, 200)}`
      );
    }

    const message = json?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls;

    if (!toolCalls?.length) {
      const text = (message?.content || '').trim();
      if (text) { noteYield(); yield text; }
      return;
    }

    messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: toolCalls });

    for (const call of toolCalls) {
      let result: unknown;
      try {
        const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
        result = await toolHandler(call.function?.name ?? '', args);
      } catch (err) {
        result = { error: getErrorMessage(err, 'tool failed') };
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result ?? null),
      });
    }
  }

  // Ran out of iterations with the model still asking for tools.
  throw new Error('Groq agent exceeded its tool-call budget');
  }
}

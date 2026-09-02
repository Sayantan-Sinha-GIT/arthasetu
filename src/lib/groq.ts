// ─── Groq fallback provider (server-side only) ───
//
// Gemini's free tier allows 20 requests a day across the whole project, which
// six routes compete for. Groq's free tier reports a limit of 1,000 requests
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

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

interface GroqOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

async function callGroq(
  model: string,
  systemInstruction: string,
  userMessage: string,
  options?: GroqOptions
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userMessage },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxOutputTokens ?? 4096,
    }),
  });

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

import { NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { getGoogleAccessToken } from '@/lib/google-access-token';

/**
 * Server-side speech synthesis.
 *
 * The browser's Web Speech API can only use voices the operating system has
 * installed, and most devices ship English only — so read-aloud produced
 * nothing at all for the 22 Indian languages. Measured on identical text:
 * English spoke for 5.6 seconds, Bengali "completed" in 9ms of silence with no
 * error raised. Nothing on the client can fix that; the audio has to come from
 * somewhere else. This route is that somewhere.
 *
 * Two backends, tried in order:
 *
 *  1. Google Cloud Text-to-Speech — the real product. Purpose-built Indic
 *     voices, and a free tier (millions of characters a month) that suits a
 *     zero-cost deployment. It authenticates with the Firebase service
 *     account, since it rejects API keys.
 *  2. Gemini TTS — covers languages Cloud TTS has no voice for (Bodo,
 *     Santali, Maithili and the like), but its preview quota is very small,
 *     so it is a stopgap rather than the main path.
 *
 * The client only calls this when the device has no local voice, so a user
 * with a working Bengali voice installed still gets instant, offline audio.
 */

/** Gemini TTS returns raw 24 kHz 16-bit mono PCM, which no browser will play. */
const SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

/** Keeps one utterance inside the model's limits and the free quota. */
const MAX_CHARS = 1200;

const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

/**
 * App language code -> Cloud TTS BCP-47 voice locale.
 * Only languages Cloud TTS actually ships a voice for; anything absent here
 * falls through to Gemini, which can approximate far more of them.
 */
const CLOUD_TTS_LOCALES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ur: 'ur-IN',
};

/** Wrap raw PCM in a WAV container so an <audio> element can play it. */
function pcmToWav(pcm: Buffer): Buffer {
  const byteRate = (SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8;
  const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

interface GeminiPart {
  inlineData?: { data?: string; mimeType?: string };
  text?: string;
}

/** The audio is not reliably the first part, so scan for it. */
function findAudioPart(payload: unknown): string | null {
  const parts = (payload as { candidates?: { content?: { parts?: GeminiPart[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const data = part?.inlineData?.data;
    if (typeof data === 'string' && data.length) return data;
  }
  return null;
}

type Synthesised = { body: Buffer; contentType: string };

async function synthesiseWithCloudTts(
  text: string,
  langCode: string
): Promise<Synthesised | null> {
  const languageCode = CLOUD_TTS_LOCALES[langCode];
  if (!languageCode) return null;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return null;

  const token = await getGoogleAccessToken();
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
    }),
  });

  const json = await res.json();
  if (json.audioContent) {
    return { body: Buffer.from(json.audioContent, 'base64'), contentType: 'audio/mpeg' };
  }

  // 403 here almost always means the API is not enabled on the project. Say so
  // loudly once rather than letting it look like a mysterious outage.
  console.warn(
    `Cloud TTS unavailable (${res.status}): ${String(json?.error?.message || '').slice(0, 200)}`
  );
  return null;
}

async function synthesiseWithGemini(text: string): Promise<Synthesised | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const call = async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The TTS models take the transcript and nothing else — wrapping it
          // in an instruction makes the model try to *answer*, and it refuses
          // with "Model tried to generate text, but it should only be used
          // for TTS". Language is inferred from the script.
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          },
        }),
      }
    );
    return res.json();
  };

  let payload = await call();
  let audio = findAudioPart(payload);

  // It occasionally answers with a text part instead of audio; one retry
  // normally settles it. Not worth retrying past a hard error such as quota.
  if (!audio && !payload?.error) {
    payload = await call();
    audio = findAudioPart(payload);
  }

  if (payload?.error) {
    console.warn(`Gemini TTS unavailable: ${String(payload.error.message).slice(0, 200)}`);
    return null;
  }
  if (!audio) return null;

  return { body: pcmToWav(Buffer.from(audio, 'base64')), contentType: 'audio/wav' };
}

export async function POST(req: NextRequest) {
  try {
    const { text, langCode } = await req.json();

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: `text exceeds ${MAX_CHARS} characters` }, { status: 413 });
    }
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === langCode)) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    let result: Synthesised | null = null;
    try {
      result = await synthesiseWithCloudTts(text, langCode);
    } catch (err) {
      console.warn('Cloud TTS error:', err instanceof Error ? err.message : err);
    }
    if (!result) result = await synthesiseWithGemini(text);

    if (!result) {
      return NextResponse.json({ error: 'No speech backend available' }, { status: 503 });
    }

    return new NextResponse(new Uint8Array(result.body), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': String(result.body.length),
        // The same text in the same language always yields the same audio, so
        // let the browser reuse it instead of spending quota on every replay.
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    console.error('TTS API error:', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}

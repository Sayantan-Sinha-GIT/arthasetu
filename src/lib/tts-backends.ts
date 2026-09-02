// ─── Speech synthesis backends (server-side only) ───
//
// The browser's Web Speech API can only use voices the operating system has
// installed, and most devices ship English only, so read-aloud produced
// nothing at all for the 22 Indian languages. These backends generate the
// audio server-side instead, so it works regardless of the device.

import { getGoogleAccessToken } from '@/lib/google-access-token';

export type Synthesised = { body: Buffer; contentType: string };

/**
 * App language code -> the speech locale to actually pronounce it with.
 *
 * Languages with no engine of their own borrow the closest one that shares
 * their script. Reading Maithili with a Hindi voice is imperfect; reading it
 * with an English voice produces nothing, which is what used to happen.
 */
const SPEECH_LOCALE: Record<string, string> = {
  en: 'en',
  hi: 'hi',
  bn: 'bn',
  ta: 'ta',
  te: 'te',
  mr: 'mr',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  ur: 'ur',
  ne: 'ne',
  // No engine of their own — nearest script-compatible voice.
  as: 'bn', // Assamese uses the Bengali-Assamese script
  mni: 'bn', // Manipuri is commonly written in Bengali script
  sa: 'hi', // Sanskrit in Devanagari
  brx: 'hi', // Bodo in Devanagari
  doi: 'hi', // Dogri in Devanagari
  mai: 'hi', // Maithili in Devanagari
  kok: 'mr', // Konkani in Devanagari, closest to Marathi
  ks: 'ur', // Kashmiri in Perso-Arabic
  sd: 'ur', // Sindhi in Perso-Arabic
  // 'or' (Odia) and 'sat' (Santali, Ol Chiki) have no usable voice anywhere,
  // and no other script can approximate them. Those degrade to the client's
  // honest "no voice installed" state rather than mispronouncing them.
};

export function canSynthesise(langCode: string): boolean {
  return Boolean(SPEECH_LOCALE[langCode]);
}

/** Cloud TTS uses full BCP-47 tags rather than bare language subtags. */
const CLOUD_TTS_LOCALES: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', gu: 'gu-IN', kn: 'kn-IN',
  ml: 'ml-IN', mr: 'mr-IN', pa: 'pa-IN', ta: 'ta-IN', te: 'te-IN', ur: 'ur-IN',
};

/**
 * Split text into pieces the endpoint will accept. The public Google endpoint
 * rejects anything much over 200 characters, so this breaks on sentence
 * boundaries — including the danda (।/॥), which ends a sentence in Devanagari
 * and Bengali scripts — and on word boundaries as a last resort.
 */
export function chunkText(text: string, maxLength = 180): string[] {
  const sentences = text.match(/[^.!?।॥]+[.!?।॥]*\s*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxLength) {
      chunks.push(current.trim());
      current = '';
    }
    if (sentence.length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = '';
      let piece = '';
      for (const word of sentence.split(/\s+/)) {
        if (piece && piece.length + word.length + 1 > maxLength) {
          chunks.push(piece.trim());
          piece = '';
        }
        piece += (piece ? ' ' : '') + word;
      }
      if (piece.trim()) chunks.push(piece.trim());
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

/**
 * Google Translate's public speech endpoint. No API key, no billing account,
 * no quota to exhaust — which is what makes it the right fit for a zero-cost
 * prototype, and it covers Bengali, Hindi, Tamil and nine more Indian
 * languages.
 *
 * It is undocumented rather than a supported API, so it is deliberately not
 * the only backend: if it ever stops responding the route falls through, and
 * the client degrades to saying no voice is available rather than breaking.
 */
export async function synthesiseWithGoogleTranslate(
  text: string,
  langCode: string
): Promise<Synthesised | null> {
  const locale = SPEECH_LOCALE[langCode];
  if (!locale) return null;

  const chunks = chunkText(text);
  const parts: Buffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const url =
      'https://translate.google.com/translate_tts?ie=UTF-8' +
      `&q=${encodeURIComponent(chunk)}` +
      `&tl=${locale}` +
      `&client=tw-ob&total=${chunks.length}&idx=${i}&textlen=${chunk.length}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });

    if (!res.ok) {
      console.warn(`Translate TTS chunk ${i} failed for ${langCode}: HTTP ${res.status}`);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    // A short response is an HTML error page, not audio.
    if (buf.length < 500) return null;
    parts.push(buf);
  }

  if (!parts.length) return null;
  // MP3 frames concatenate cleanly, so the pieces play as one clip.
  return { body: Buffer.concat(parts), contentType: 'audio/mpeg' };
}

/**
 * Google Cloud Text-to-Speech — the supported product, with better voices.
 * Off by default: it needs a billing account linked to the project, which the
 * Firebase Spark plan does not have. Set TTS_USE_CLOUD=true once the Cloud
 * Text-to-Speech API is enabled and it takes priority automatically.
 */
export async function synthesiseWithCloudTts(
  text: string,
  langCode: string
): Promise<Synthesised | null> {
  if (process.env.TTS_USE_CLOUD !== 'true') return null;
  const languageCode = CLOUD_TTS_LOCALES[langCode];
  if (!languageCode || !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return null;

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
  console.warn(`Cloud TTS unavailable (${res.status}): ${String(json?.error?.message || '').slice(0, 160)}`);
  return null;
}

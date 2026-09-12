import { NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { ttsRequestSchema } from '@/lib/validation/api-schemas';
import {
  canSynthesise,
  synthesiseWithCloudTts,
  synthesiseWithGoogleTranslate,
  type Synthesised,
} from '@/lib/tts-backends';

/**
 * Server-side speech synthesis.
 *
 * Read-aloud used to be silent in all 22 Indian languages: the Web Speech API
 * can only use voices the operating system has installed, and most devices
 * ship English only. Measured on identical text, English spoke for 5.6
 * seconds while Bengali "completed" in 9ms with no error raised. No client
 * change can fix that — the audio has to be generated elsewhere.
 *
 * The client calls this only when the device has no local voice, so anyone
 * who does have one still gets instant, offline, free audio instead.
 */

/** Keeps one request modest and bounds how much work a single tap can cause. */
const MAX_CHARS = 1200;

export async function POST(req: NextRequest) {
  try {
    const parsed = ttsRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'text is required' },
        { status: 400 }
      );
    }
    const { text, langCode } = parsed.data;
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: `text exceeds ${MAX_CHARS} characters` }, { status: 413 });
    }
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === langCode)) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }
    // Odia and Santali have no usable voice anywhere, and no other script can
    // approximate them. Say so immediately rather than burning a round trip.
    if (!canSynthesise(langCode)) {
      return NextResponse.json({ error: 'No voice for this language' }, { status: 501 });
    }

    let result: Synthesised | null = null;

    // Cloud TTS first when it is switched on (better voices), otherwise
    // straight to the free endpoint. Cloud is off by default because it
    // requires a billing account this project deliberately does not have.
    try {
      result = await synthesiseWithCloudTts(text, langCode);
    } catch (err) {
      console.warn('Cloud TTS error:', err instanceof Error ? err.message : err);
    }

    if (!result) {
      result = await synthesiseWithGoogleTranslate(text, langCode);
    }

    if (!result) {
      return NextResponse.json({ error: 'No speech backend available' }, { status: 503 });
    }

    return new NextResponse(new Uint8Array(result.body), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': String(result.body.length),
        // The same text in the same language always yields the same audio, so
        // let the browser reuse it rather than re-fetching on every replay.
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    console.error('TTS API error:', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}

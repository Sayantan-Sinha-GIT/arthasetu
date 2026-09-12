import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { translateRequestSchema } from '@/lib/validation/api-schemas';

/** Upper bound on strings per request, so one call cannot become an unbounded prompt. */
const MAX_BATCH_ITEMS = 60;

export async function POST(req: NextRequest) {
  try {
    const parsed = translateRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'A supported targetLangCode is required' },
        { status: 400 }
      );
    }
    const { text, texts, targetLangCode } = parsed.data;

    const targetLang = SUPPORTED_LANGUAGES.find(l => l.code === targetLangCode);
    if (!targetLangCode || !targetLang) {
      return NextResponse.json({ error: 'A supported targetLangCode is required' }, { status: 400 });
    }

    // Several strings in one call: the plan report translates its whole
    // narrative (summary, assumptions, risks, steps) at once, as one request
    // against the free quota rather than one per bullet point.
    if (Array.isArray(texts)) {
      const items = texts.slice(0, MAX_BATCH_ITEMS).map((item: unknown) => String(item ?? ''));
      if (!items.some((item) => item.trim())) {
        return NextResponse.json({ translatedTexts: items });
      }

      const systemPrompt = `You are an expert, highly accurate translator for ArthaSetu, a financial advisory app for Indian MSMEs.
Translate every string in the "items" array into ${targetLang.name} (${targetLang.nativeName}), written in ${targetLang.nativeName} script.
Keep numbers, ₹ amounts, percentages, and names or acronyms such as ArthaSetu, PMEGP, MUDRA, EMI and DSCR unchanged.
Respond with ONLY a JSON object of the form {"translations": ["...", "..."]} containing exactly ${items.length} strings, in the same order as the input.`;

      const raw = await generateContent(
        GEMINI_MODELS.FLASH_LITE,
        systemPrompt,
        JSON.stringify({ items }),
        { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: 'application/json' }
      );
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleaned) as { translations?: unknown };
      const translations = Array.isArray(parsed?.translations) ? parsed.translations : null;
      if (!translations || translations.length !== items.length) {
        throw new Error('Translation returned a different number of items');
      }
      return NextResponse.json({
        translatedTexts: translations.map((value, i) =>
          typeof value === 'string' && value.trim() ? value : items[i]
        ),
      });
    }

    if (!text) {
      return NextResponse.json({ error: 'text and targetLangCode are required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert, highly accurate translator for ArthaSetu, a financial advisory app for Indian MSMEs.
Your task is to translate the provided text into ${targetLang.name} (${targetLang.nativeName}).
Keep the formatting intact. Output ONLY the translated text, with no additional commentary, notes, or markdown blocks around it.`;

    const translation = await generateContent(GEMINI_MODELS.FLASH_LITE, systemPrompt, text);

    return NextResponse.json({ translatedText: translation });
  } catch (err) {
    console.error('Translation API error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}

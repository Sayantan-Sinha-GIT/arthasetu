import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';

export async function POST(req: NextRequest) {
  try {
    const { text, targetLangCode } = await req.json();

    if (!text || !targetLangCode) {
      return NextResponse.json({ error: 'text and targetLangCode are required' }, { status: 400 });
    }

    const targetLang = SUPPORTED_LANGUAGES.find(l => l.code === targetLangCode);
    if (!targetLang) {
      return NextResponse.json({ error: 'Unsupported target language' }, { status: 400 });
    }

    const systemPrompt = `You are an expert, highly accurate translator for ArthaSetu, a financial advisory app for Indian MSMEs.
Your task is to translate the provided text into ${targetLang.name} (${targetLang.nativeName}).
Keep the formatting intact. Output ONLY the translated text, with no additional commentary, notes, or markdown blocks around it.`;

    const translation = await generateContent(GEMINI_MODELS.FLASH, systemPrompt, text);

    return NextResponse.json({ translatedText: translation });
  } catch (err) {
    console.error('Translation API error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}

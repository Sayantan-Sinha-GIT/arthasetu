import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { buildSchemeParsingPrompt } from '@/lib/prompts/admin';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { draftSchemeUpdate, NoticeError } from '@/lib/admin/draft-scheme-update';
import { getErrorMessage } from '@/lib/utils/errors';
import type { Scheme } from '@/types';

export const maxDuration = 60;

/**
 * AI drafting for the admin console. Nothing here writes to the database.
 *
 * - With `currentScheme`: detect what an official notice changes in that scheme.
 *   The notice is pasted text (`circularText`) or a link to a web page or PDF
 *   (`sourceUrl`). The response is a checked list of changes for review.
 * - Without it: extract a whole new scheme from circular text, for the new-scheme form.
 */
export async function POST(req: NextRequest) {
  try {
    const { isAdmin, error: authError } = await verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: authError || 'Forbidden: Valid admin credentials required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      circularText,
      currentScheme,
      sourceUrl,
    }: {
      circularText?: unknown;
      currentScheme?: Scheme | null;
      sourceUrl?: unknown;
    } = body;

    if (currentScheme && typeof currentScheme === 'object' && currentScheme.id && currentScheme.name) {
      const draft = await draftSchemeUpdate({
        currentScheme,
        circularText: typeof circularText === 'string' ? circularText : '',
        sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : '',
      });
      return NextResponse.json({ success: true, data: draft });
    }

    if (typeof circularText !== 'string' || circularText.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: 'Government circular text of at least 20 characters is required' },
        { status: 400 }
      );
    }

    const systemPrompt = buildSchemeParsingPrompt(circularText, null);

    const rawResponse = await generateContent(
      GEMINI_MODELS.FLASH_LITE,
      systemPrompt,
      'Parse the government circular and output JSON matching the required schema.',
      { temperature: 0.1, maxOutputTokens: 2048 }
    );

    // Clean JSON response (strip markdown fences if any)
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedData = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      data: parsedData,
      sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : '',
    });
  } catch (error) {
    // A notice that cannot be read is the administrator's to fix, with a message saying how.
    if (error instanceof NoticeError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error drafting scheme with AI:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, 'Failed to parse circular text with AI'),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { buildSchemeParsingPrompt } from '@/lib/prompts/admin';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getErrorMessage } from '@/lib/utils/errors';
import type { Scheme } from '@/types';

export const maxDuration = 60;

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
      circularText: string;
      currentScheme?: Scheme | null;
      sourceUrl?: string;
    } = body;

    if (!circularText || circularText.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: 'Government circular text of at least 20 characters is required' },
        { status: 400 }
      );
    }

    const systemPrompt = buildSchemeParsingPrompt(circularText, currentScheme);

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
      sourceUrl: sourceUrl || '',
    });
  } catch (error) {
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

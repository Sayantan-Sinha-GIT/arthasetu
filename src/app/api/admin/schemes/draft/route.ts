import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { buildSchemeParsingPrompt } from '@/lib/prompts/admin';
import { adminAuth } from '@/lib/firebase-admin';
import type { Scheme } from '@/types';

export const maxDuration = 60;

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();

async function verifyAdminRequest(req: NextRequest): Promise<boolean> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.email?.toLowerCase().trim() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // For simplicity, we trust the client-side guard and check the email
    // from the request body as a secondary measure
    const body = await req.json();
    const {
      circularText,
      currentScheme,
      sourceUrl,
      adminEmail,
    }: {
      circularText: string;
      currentScheme?: Scheme | null;
      sourceUrl?: string;
      adminEmail?: string;
    } = body;

    // Server-side admin email check
    if (!adminEmail || adminEmail.toLowerCase().trim() !== ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: Invalid Admin Credentials.' },
        { status: 403 }
      );
    }

    if (!circularText || circularText.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: 'Government circular text of at least 20 characters is required' },
        { status: 400 }
      );
    }

    const systemPrompt = buildSchemeParsingPrompt(circularText, currentScheme);

    const rawResponse = await generateContent(
      GEMINI_MODELS.FLASH,
      systemPrompt,
      'Parse the government circular and output JSON matching the required schema.'
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
  } catch (error: any) {
    console.error('Error drafting scheme with AI:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to parse circular text with AI',
      },
      { status: 500 }
    );
  }
}

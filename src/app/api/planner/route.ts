import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { buildPlannerPrompt } from '@/lib/prompts/planner';
import { getErrorMessage } from '@/lib/utils/errors';
import type { PlanInputs, CalculatedValues, UserProfile } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      inputs,
      calculatedValues,
      userProfile,
      language = 'en',
    }: {
      inputs: PlanInputs;
      calculatedValues: CalculatedValues;
      userProfile: Partial<UserProfile> | null;
      language: string;
    } = body;

    if (!inputs || !calculatedValues) {
      return NextResponse.json(
        { success: false, error: 'Missing required inputs or calculations' },
        { status: 400 }
      );
    }

    if (!inputs.businessType?.trim() || !inputs.location?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Business type and operating location are required to generate a business plan.' },
        { status: 400 }
      );
    }

    const systemPrompt = buildPlannerPrompt(inputs, calculatedValues, userProfile, language);
    const userQuery = 'Please analyze these exact business figures and generate the structured JSON narrative.';

    // Generate narrative using fast Gemini Flash model
    const rawResult = await generateContent(
      GEMINI_MODELS.FLASH,
      systemPrompt,
      userQuery,
      { temperature: 0.3 }
    );

    // Clean JSON markdown wrapper if present
    let cleanJsonStr = rawResult.trim();
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedNarrative;
    try {
      parsedNarrative = JSON.parse(cleanJsonStr);
    } catch (parseErr) {
      console.warn('JSON parsing fallback for planner narrative:', parseErr);
      parsedNarrative = {
        executiveSummary: rawResult.slice(0, 300),
        keyAssumptions: [
          'Estimated demand reflects standard local rural micro-market capacity.',
          'Operating costs assume regular raw material availability.',
          'Loan calculations assume timely monthly servicing.',
        ],
        riskAnalysis: [
          'Initial revenue ramp-up delay — maintain 1-2 months working capital buffer.',
          'Local market price fluctuations — secure advance vendor agreements.',
        ],
        actionableNextSteps: [
          'Prepare project summary report for bank loan or PMEGP application.',
          'Collect competitive quotations from local equipment suppliers.',
          'Finalize customer supply contracts.',
        ],
      };
    }

    return NextResponse.json({
      success: true,
      narrative: parsedNarrative,
    });
  } catch (error) {
    console.error('Error generating financial plan narrative:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, 'Failed to generate financial plan narrative'),
      },
      { status: 500 }
    );
  }
}

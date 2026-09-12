import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { buildPlannerPrompt } from '@/lib/prompts/planner';
import { getErrorMessage } from '@/lib/utils/errors';
import { plannerRequestSchema } from '@/lib/validation/api-schemas';
import type { PlanInputs, CalculatedValues, UserProfile } from '@/types';

export const maxDuration = 60;

function truncateAtSentenceBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  );
  if (lastSentenceEnd > maxLength * 0.5) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }
  return truncated + '...';
}

function cleanMarkdownFences(raw: string): string {
  let text = raw.trim();
  // Strip code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  } else {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  // Trim outer non-JSON conversational text if { ... } boundary exists
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  // Strip trailing commas before closing braces/brackets
  return text.replace(/,\s*([}\]])/g, '$1');
}

function extractFieldByRegex(raw: string, fieldName: string): string | null {
  // Try complete string: "fieldName"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"
  const regex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const match = raw.match(regex);
  if (match && match[1]) {
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    }
  }

  // If JSON was cut off mid-string without closing quote:
  const incompleteRegex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)+)`);
  const incompleteMatch = raw.match(incompleteRegex);
  if (incompleteMatch && incompleteMatch[1]) {
    const rawVal = incompleteMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    return truncateAtSentenceBoundary(rawVal.trim(), 2000);
  }

  return null;
}

function extractArrayByRegex(raw: string, fieldName: string): string[] | null {
  const regex = new RegExp(`"${fieldName}"\\s*:\\s*\\[([\\s\\S]*?)\\]`);
  const match = raw.match(regex);
  if (match && match[1]) {
    const items: string[] = [];
    const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(match[1])) !== null) {
      if (itemMatch[1]?.trim()) {
        try {
          items.push(JSON.parse(`"${itemMatch[1]}"`));
        } catch {
          items.push(itemMatch[1].replace(/\\"/g, '"'));
        }
      }
    }
    if (items.length > 0) return items;
  }
  return null;
}

export interface PlanNarrative {
  executiveSummary: string;
  keyAssumptions: string[];
  riskAnalysis: string[];
  actionableNextSteps: string[];
}

export const PLANNER_NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
    executiveSummary: { type: 'string' },
    keyAssumptions: { type: 'array', items: { type: 'string' } },
    riskAnalysis: { type: 'array', items: { type: 'string' } },
    actionableNextSteps: { type: 'array', items: { type: 'string' } },
  },
  required: ['executiveSummary', 'keyAssumptions', 'riskAnalysis', 'actionableNextSteps'],
};

export async function POST(req: NextRequest) {
  try {
    const parsed = plannerRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      const missingDetails = parsed.error.issues.some(
        (issue) => issue.path[0] === 'inputs' && (issue.path[1] === 'businessType' || issue.path[1] === 'location')
      );
      return NextResponse.json(
        {
          success: false,
          error: missingDetails
            ? 'Business type and operating location are required to generate a business plan.'
            : 'Missing required inputs or calculations',
        },
        { status: 400 }
      );
    }
    const data = parsed.data as unknown as {
      inputs: PlanInputs;
      calculatedValues: CalculatedValues;
      userProfile?: Partial<UserProfile> | null;
      language: string;
    };
    const { inputs, calculatedValues, language } = data;
    const userProfile = data.userProfile ?? null;

    const systemPrompt = buildPlannerPrompt(inputs, calculatedValues, userProfile, language);
    const userQuery = `Generate the comprehensive financial plan narrative for this ${inputs.businessScale} ${inputs.businessType} enterprise in ${inputs.location}. Ensure all 4 required sections are thoroughly detailed.`;

    // Generate narrative using fast Gemini Flash model with structured JSON enforcement
    const rawResult = await generateContent(
      GEMINI_MODELS.FLASH,
      systemPrompt,
      userQuery,
      {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: PLANNER_NARRATIVE_SCHEMA,
      }
    );

    // Clean JSON markdown wrapper and conversational fluff if present
    const cleanJsonStr = cleanMarkdownFences(rawResult);

    let parsedNarrative: Partial<PlanNarrative> | null = null;
    let parseSucceeded = false;

    try {
      parsedNarrative = JSON.parse(cleanJsonStr);
      if (parsedNarrative && typeof parsedNarrative === 'object') {
        parseSucceeded = true;
      }
    } catch {
      // First parse attempt failed — attempt ONE corrective retry before falling back
      try {
        const correctiveQuery = `${userQuery}\n\nYour previous response could not be parsed as valid JSON. Respond with ONLY a valid JSON object matching this exact structure, with no markdown formatting, no code fences, and no text outside the JSON: { "executiveSummary": string, "keyAssumptions": string[], "riskAnalysis": string[], "actionableNextSteps": string[] }`;
        const retryResult = await generateContent(
          GEMINI_MODELS.FLASH,
          systemPrompt,
          correctiveQuery,
          {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: PLANNER_NARRATIVE_SCHEMA,
          }
        );
        const cleanRetryJsonStr = cleanMarkdownFences(retryResult);
        parsedNarrative = JSON.parse(cleanRetryJsonStr);
        if (parsedNarrative && typeof parsedNarrative === 'object') {
          parseSucceeded = true;
          console.warn('Planner narrative: first parse failed, retry succeeded');
        }
      } catch {
        console.warn('Planner narrative: retry also failed, using regex/sentence-safe fallback');
      }
    }

    if (parseSucceeded && parsedNarrative && typeof parsedNarrative === 'object') {
      if (!parsedNarrative.executiveSummary || typeof parsedNarrative.executiveSummary !== 'string') {
        parsedNarrative.executiveSummary = extractFieldByRegex(rawResult, 'executiveSummary') || 'Business plan viability evaluated based on operational figures.';
      }
      if (!Array.isArray(parsedNarrative.keyAssumptions)) {
        parsedNarrative.keyAssumptions = extractArrayByRegex(rawResult, 'keyAssumptions') || [
          'Estimated demand reflects standard local rural micro-market capacity.',
          'Operating costs assume regular raw material availability.',
          'Loan calculations assume timely monthly servicing.',
        ];
      }
      if (!Array.isArray(parsedNarrative.riskAnalysis)) {
        parsedNarrative.riskAnalysis = extractArrayByRegex(rawResult, 'riskAnalysis') || [
          'Initial revenue ramp-up delay — maintain 1-2 months working capital buffer.',
          'Local market price fluctuations — secure advance vendor agreements.',
        ];
      }
      if (!Array.isArray(parsedNarrative.actionableNextSteps)) {
        parsedNarrative.actionableNextSteps = extractArrayByRegex(rawResult, 'actionableNextSteps') || [
          'Prepare project summary report for bank loan or PMEGP application.',
          'Collect competitive quotations from local equipment suppliers.',
          'Finalize customer supply contracts.',
        ];
      }
    } else {
      // Fall through to regex extraction & sentence-safe fallback
      // 1. Try extracting executiveSummary field value directly via regex
      let summary = extractFieldByRegex(rawResult, 'executiveSummary');

      // 2. If regex extraction failed or produced too short a string, use entire raw response text
      if (!summary || summary.trim().length < 20) {
        const cleanedRaw = rawResult
          .replace(/```(?:json)?/gi, '')
          .replace(/[{}[\]]/g, '')
          .replace(/"(executiveSummary|keyAssumptions|riskAnalysis|actionableNextSteps)"\s*:/g, '')
          .trim();
        summary = cleanedRaw || rawResult.trim();
      }

      // 3. Last-resort safety cap at sentence boundary only if exceeding 2000 chars
      summary = truncateAtSentenceBoundary(summary, 2000);

      parsedNarrative = {
        executiveSummary: summary,
        keyAssumptions: extractArrayByRegex(rawResult, 'keyAssumptions') || [
          'Estimated demand reflects standard local rural micro-market capacity.',
          'Operating costs assume regular raw material availability.',
          'Loan calculations assume timely monthly servicing.',
        ],
        riskAnalysis: extractArrayByRegex(rawResult, 'riskAnalysis') || [
          'Initial revenue ramp-up delay — maintain 1-2 months working capital buffer.',
          'Local market price fluctuations — secure advance vendor agreements.',
        ],
        actionableNextSteps: extractArrayByRegex(rawResult, 'actionableNextSteps') || [
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

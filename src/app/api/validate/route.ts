import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { validateAddressConsistency, isValidPincode } from '@/lib/constants/pincodes';
import type { ApiResponse } from '@/types';

export const maxDuration = 60;

export interface ValidationRequestBody {
  businessType?: string;
  businessCategory?: string;
  state?: string;
  district?: string;
  pinCode?: string;
  availableCapital?: number;
  desiredFunding?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  language?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
  suggestedCategory?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<ValidationResult>>> {
  try {
    const body: ValidationRequestBody = await req.json();
    const {
      businessType = '',
      businessCategory = '',
      state = '',
      district = '',
      pinCode = '',
      desiredFunding = 0,
      monthlyIncome = 0,
      monthlyExpenses = 0,
      language = 'en',
    } = body;

    const errors: Record<string, string> = {};
    const warnings: string[] = [];

    // Deterministic PIN Code & Location Validation
    if (pinCode.trim()) {
      if (!/^[1-9][0-9]{5}$/.test(pinCode.trim())) {
        errors.pinCode = 'PIN code must be 6 digits and cannot start with 0';
      } else if (!isValidPincode(pinCode.trim())) {
        errors.pinCode = 'Invalid or unresolvable Indian PIN code';
      } else if (state.trim()) {
        const consistency = validateAddressConsistency(pinCode.trim(), state.trim(), district.trim());
        if (!consistency.valid) {
          errors.pinCode = consistency.reason || 'PIN code does not match selected state';
        } else if (consistency.warning) {
          warnings.push(consistency.warning);
        }
      }
    }

    // Deterministic Financial Sanity Check (Item 9)
    const monthlyNetProfit = monthlyIncome - monthlyExpenses;
    if (desiredFunding > 0) {
      if (monthlyNetProfit <= 0 && monthlyIncome > 0) {
        warnings.push(
          'Your monthly operating expenses equal or exceed income. Repaying a new loan may require additional cash flow.'
        );
      } else if (monthlyNetProfit > 0 && desiredFunding > 12 * monthlyNetProfit) {
        const coverageRatio = (desiredFunding / (monthlyNetProfit * 12)).toFixed(1);
        warnings.push(
          `Desired funding (₹${desiredFunding.toLocaleString('en-IN')}) is ${coverageRatio}x your estimated annual net profit (₹${(monthlyNetProfit * 12).toLocaleString('en-IN')}). Consider phased financing or government capital subsidies (e.g., PMEGP/MUDRA).`
        );
      }
    }

    // If no text fields to validate with AI, return deterministic result immediately
    if (!businessType.trim() && !district.trim()) {
      return NextResponse.json({
        success: true,
        data: {
          isValid: Object.keys(errors).length === 0,
          errors,
          warnings,
        },
      });
    }

    // AI-Powered Plausibility Check (Gemini Flash-Lite with 5s timeout & fail-open)
    const systemInstruction = `You are a strict Indian rural and micro-enterprise validator for the ArthaSetu platform.
Analyze the user's business inputs for realism and coherence. Support all 22 Indian regional languages and English.

Rules:
1. "businessType": If provided and non-empty, check if this is a genuine enterprise, craft, trade, agriculture, shop, or service (e.g., "पोल्ट्री फार्म", "सरीषार तेलर मिल", "tailoring shop", "tea stall", "kirana"). If it is gibberish, spam, offensive, or random characters (e.g., "asdfghjk", "wallah wallah", "123456", "nonsense"), mark isBusinessValid as false with a friendly localized error. If businessType is empty or not provided, set isBusinessValid as true and businessError as null.
2. "district": Check if the district/city is plausible for the given Indian state "${state}". If clearly contradictory (e.g. State is "Kerala" but district is "Patna"), add an error or warning.
3. Output strictly valid JSON matching this schema:
{
  "isBusinessValid": boolean,
  "businessError": string | null,
  "isLocationValid": boolean,
  "locationError": string | null,
  "suggestedCategory": string | null,
  "advisoryNote": string | null
}
Return ALL text in language: "${language}".`;

    const userPrompt = JSON.stringify({
      businessType,
      declaredCategory: businessCategory,
      state,
      district,
    });

    try {
      // 5-second timeout for fail-open resilience
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('AI validation timeout')), 5000)
      );

      const aiPromise = generateContent(
        GEMINI_MODELS.FLASH_LITE,
        systemInstruction,
        userPrompt,
        { temperature: 0.1, maxOutputTokens: 500 }
      );

      const responseText = await Promise.race([aiPromise, timeoutPromise]);
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (businessType.trim() && parsed.isBusinessValid === false && parsed.businessError) {
        errors.businessType = parsed.businessError;
      }
      if (district.trim() && parsed.isLocationValid === false && parsed.locationError) {
        errors.district = parsed.locationError;
      }
      if (parsed.advisoryNote) {
        warnings.push(parsed.advisoryNote);
      }

      return NextResponse.json({
        success: true,
        data: {
          isValid: Object.keys(errors).length === 0,
          errors,
          warnings,
          suggestedCategory: parsed.suggestedCategory || undefined,
        },
      });
    } catch (aiErr) {
      console.warn('AI validation fallback / fail-open triggered:', aiErr);
      // Fail-open: Let the user proceed with deterministic checks only
      return NextResponse.json({
        success: true,
        data: {
          isValid: Object.keys(errors).length === 0,
          errors,
          warnings,
        },
      });
    }
  } catch (error) {
    console.error('Validation API error:', error);
    // Overall fail-open to never block user progression
    return NextResponse.json({
      success: true,
      data: {
        isValid: true,
        errors: {},
        warnings: [],
      },
    });
  }
}

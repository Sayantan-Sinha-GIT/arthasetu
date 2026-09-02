import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
import { getLanguageMeta } from '@/i18n/languages';
import type { Scheme, UserProfile } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scheme,
      userProfile,
      language = 'en',
    }: {
      scheme: Scheme;
      userProfile: Partial<UserProfile> | null;
      language: string;
    } = body;

    if (!scheme) {
      return NextResponse.json(
        { success: false, error: 'Scheme data is required' },
        { status: 400 }
      );
    }

    const langMeta = getLanguageMeta(language);
    const languageInstruction =
      language === 'en'
        ? 'Respond in English.'
        : `Respond ENTIRELY in ${langMeta.name} (${langMeta.nativeName}), using ${langMeta.nativeName}'s native script throughout — every heading and sentence. Do not respond in English. Keep ₹ figures, numerals, and proper nouns/acronyms (ArthaSetu, PMEGP, MUDRA, scheme names) as-is.`;
    const profileContext = userProfile
      ? `
Entrepreneur Name: ${userProfile.name || 'Entrepreneur'}
Location: ${userProfile.locality ? `${userProfile.locality}, ` : ''}${userProfile.district ? `${userProfile.district}, ` : ''}${userProfile.state || 'India'}
Business: ${userProfile.businessType || 'Micro-Enterprise'} (${userProfile.businessCategory || 'General'})
Available Capital: ₹${(userProfile.availableCapital || 0).toLocaleString('en-IN')}
`
      : 'Rural micro-entrepreneur in India';

    const systemPrompt = `
You are **ArthaSetu**, an expert rural micro-enterprise and government scheme advisor.
Below is a verified government scheme and an entrepreneur's profile.

---
### 🏛️ Government Scheme Details:
- Scheme Name: ${scheme.name} (${scheme.shortName})
- Level: ${scheme.governmentLevel === 'central' ? 'Central Government' : `State Government of ${scheme.state}`}
- Description: ${scheme.description}
- Subsidy Details: ${scheme.benefits.subsidyDetails || 'N/A'}
- Loan Details: ${scheme.benefits.loanDetails || 'N/A'}
- Max Subsidy: ${scheme.benefits.maxSubsidyPercent || 0}%
- Required Documents: ${scheme.requiredDocuments.join(', ')}
- Application Process: ${scheme.applicationProcess}
- Official Portal: ${scheme.officialUrl}

---
### 👤 Entrepreneur Profile:
${profileContext}

---
### 🌐 Language:
${languageInstruction}

---
### 🎯 Your Task:
Explain this scheme to the entrepreneur in plain, warm, and highly actionable language without bureaucratic jargon.
If the entrepreneur's business type is unstated or ambiguous, explain the scheme's general micro-enterprise benefits and include a friendly note inviting them to specify their exact trade (e.g. poultry, tailoring, dairy, grocery) in their profile for tailored calculations.
Provide:
1. **Why this scheme specifically fits your business** (tailored to their location and enterprise)
2. **Exact Financial Breakdown** (illustrate the subsidy calculation with a realistic project cost)
3. **3 Clear Application Steps** (where to apply, which district office or online portal to visit)
4. **Essential Document Checklist** for bank or portal submission
`;

    const explanation = await generateContent(
      GEMINI_MODELS.FLASH,
      systemPrompt,
      'Explain this verified scheme in plain language for the entrepreneur.'
    );

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (error: any) {
    console.error('Error generating scheme explanation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate scheme explanation',
      },
      { status: 500 }
    );
  }
}

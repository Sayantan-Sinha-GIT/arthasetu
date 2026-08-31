import { NextRequest, NextResponse } from 'next/server';
import { generateContent, GEMINI_MODELS } from '@/lib/gemini';
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

    const isHindi = language === 'hi';
    const profileContext = userProfile
      ? `
Entrepreneur Name: ${userProfile.name || 'Entrepreneur'}
Location: ${userProfile.locality ? `${userProfile.locality}, ` : ''}${userProfile.district ? `${userProfile.district}, ` : ''}${userProfile.state || 'India'}
Business: ${userProfile.businessType || 'Micro-Enterprise'} (${userProfile.businessCategory || 'General'})
Available Capital: ₹${(userProfile.availableCapital || 0).toLocaleString('en-IN')}
`
      : 'Rural micro-entrepreneur in India';

    const systemPrompt = isHindi
      ? `
आप **अर्थसेतु (ArthaSetu)** के सरकारी योजना सलाहकार हैं।
नीचे एक वास्तविक सरकारी योजना और ग्रामीण उद्यमी का विवरण दिया गया है।

---
### 🏛️ सरकारी योजना विवरण:
- योजना का नाम: ${scheme.name} (${scheme.shortName})
- स्तर: ${scheme.governmentLevel === 'central' ? 'केंद्र सरकार (Central Government)' : `राज्य सरकार (${scheme.state})`}
- विवरण: ${scheme.description}
- सब्सिडी / लाभ: ${scheme.benefits.subsidyDetails || 'उपलब्ध नहीं'}
- लोन विवरण: ${scheme.benefits.loanDetails || 'उपलब्ध नहीं'}
- अधिकतम सब्सिडी: ${scheme.benefits.maxSubsidyPercent || 0}%
- आवश्यक दस्तावेज: ${scheme.requiredDocuments.join(', ')}
- आवेदन प्रक्रिया: ${scheme.applicationProcess}
- आधिकारिक पोर्टल: ${scheme.officialUrl}

---
### 👤 उद्यमी प्रोफाइल:
${profileContext}

---
### 🎯 आपका कार्य:
इस योजना को उद्यमी के लिए बिल्कुल सरल, व्यावहारिक हिंदी में समझाएं। 
यदि उद्यमी का व्यवसाय अस्पष्ट या अनिर्दिष्ट है, तो सामान्य सूक्ष्म-उद्यम के अनुसार समझाएं और अपनी विशिष्ट गतिविधि (जैसे सिलाई, मुर्गी पालन, किराना) अपडेट करने की सलाह दें।
निम्न 4 बिंदुओं पर स्पष्ट जानकारी दें:
1. **यह योजना आपके लिए क्यों उपयोगी है?** (उद्यमी के व्यवसाय और स्थान के संदर्भ में)
2. **आपको कितना आर्थिक लाभ (सब्सिडी / लोन) मिलेगा?** (सरल उदाहरण सहित)
3. **आवेदन के 3 आसान चरण** (कहाँ जाना है, कौन से पोर्टल पर फॉर्म भरना है)
4. **बैंक जाने से पहले तैयार रखने वाले आवश्यक दस्तावेज**
`
      : `
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

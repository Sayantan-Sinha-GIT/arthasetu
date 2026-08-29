import type { Scheme } from '@/types';

/**
 * System prompt to parse official government circulars into structured Scheme records
 */
export function buildSchemeParsingPrompt(rawCircularText: string, currentScheme?: Scheme | null): string {
  if (currentScheme) {
    return `
You are an expert government policy analyst for ArthaSetu.
An official government circular/notification has been issued updating an EXISTING scheme.

---
### 🏛️ CURRENT SCHEME RECORD:
${JSON.stringify(currentScheme, null, 2)}

---
### 📄 NEW GOVERNMENT CIRCULAR / NOTICE:
${rawCircularText}

---
### 🎯 YOUR TASK:
Analyze the new circular and compare it with the current record.
Identify EVERY field that has changed (e.g. subsidy percentage, max loan limit, eligibility age, required documents, official URL).

Return a strictly valid JSON object conforming to this exact structure:
{
  "summaryOfChanges": "Brief 1-2 sentence explanation of policy changes",
  "proposedChanges": {
    "fieldName": {
      "old": <old_value>,
      "new": <new_value>
    }
  },
  "updatedScheme": <Full updated Scheme object with all changes merged>
}

CRITICAL RULES:
1. Only propose changes that are explicitly stated in the circular.
2. DO NOT invent subsidies or criteria not in the circular.
3. Return ONLY valid JSON, no markdown backticks, no markdown formatting.
`;
  }

  return `
You are an expert government policy analyst for ArthaSetu.
Extract a new structured Scheme record from the provided official government circular or notification.

---
### 📄 GOVERNMENT CIRCULAR / NOTICE:
${rawCircularText}

---
### 🎯 YOUR TASK:
Extract and format the scheme as a valid JSON object matching the ArthaSetu Scheme schema:
{
  "id": "slug-id (e.g. central-scheme-name or state-scheme-name)",
  "name": "Full Official Name of the Scheme",
  "shortName": "Acronym / Short Name",
  "category": "e.g. Micro-Credit, Agriculture, Manufacturing, Handloom, Food Processing",
  "governmentLevel": "central" | "state",
  "state": "State Name (if state level, otherwise empty string)",
  "description": "Clear 2-3 sentence overview of the scheme's purpose",
  "targetBusinessTypes": ["Array of eligible business types / trades"],
  "targetBeneficiaries": ["Array of eligible groups e.g. Rural youth, Women, SC/ST, SHGs"],
  "eligibility": {
    "ageRange": "e.g. 18-45 years",
    "incomeLimit": "e.g. Below ₹3,00,000 / No limit",
    "education": "e.g. 8th Pass for projects > 10 Lakhs",
    "businessStatus": "new" | "existing" | "both",
    "otherConditions": ["Key eligibility criteria"]
  },
  "benefits": {
    "subsidyDetails": "Detailed subsidy description",
    "loanDetails": "Loan and interest rate details",
    "maxSubsidyPercent": 35,
    "maxFundingAmount": 5000000,
    "otherBenefits": ["Additional perks"]
  },
  "requiredDocuments": ["List of documents required"],
  "applicationProcess": "Clear step-by-step application instructions",
  "officialUrl": "https://...",
  "sourceName": "Nodal Ministry or Department",
  "lastVerifiedDate": "${new Date().toISOString().split('T')[0]}",
  "isActive": true
}

CRITICAL RULES:
1. Return ONLY valid JSON.
2. Ensure numerical values for maxSubsidyPercent and maxFundingAmount are numbers (not strings).
`;
}

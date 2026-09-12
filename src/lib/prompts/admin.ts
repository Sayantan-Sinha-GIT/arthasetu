import type { Scheme } from '@/types';
import type { SchemeFieldDefinition } from '@/lib/admin/scheme-update';

const KIND_HINTS: Record<SchemeFieldDefinition['kind'], string> = {
  text: 'text',
  longtext: 'text',
  number: 'number',
  list: 'array of strings',
  select: 'one of the listed values',
  boolean: 'true or false',
};

/**
 * System prompt for detecting what an official notice changes in one existing
 * scheme. The notice itself is sent as the user message (text) or as an
 * attached document (PDF), so it is never mistaken for these instructions.
 */
export function buildSchemeChangePrompt(
  schemeName: string,
  currentValues: Record<string, unknown>,
  fields: SchemeFieldDefinition[]
): string {
  const fieldList = fields
    .map((field) => {
      const options = field.options ? ` — ${field.options.map((option) => `"${option.value}"`).join(', ')}` : '';
      return `- ${field.path}: ${field.label} (${KIND_HINTS[field.kind]}${options})`;
    })
    .join('\n');

  return `You are a government policy analyst for ArthaSetu. You compare an official government notice (circular,
gazette notification, office memorandum or guideline) with ArthaSetu's current record of ONE scheme, and report
exactly which fields of that record the notice changes.

SCHEME: ${schemeName}

CURRENT RECORD (field path -> current value):
${JSON.stringify(currentValues, null, 2)}

FIELDS YOU MAY CHANGE:
${fieldList}

RULES:
1. Report a field only when the notice explicitly states a value for it that differs from the current record.
2. Never guess, infer, or fill in a detail the notice does not state. The same value in different words is not a change.
3. If the notice is about a different scheme, or changes none of these fields, return an empty "changes" array and say
   so in the summary.
4. Give the COMPLETE new value of each changed field: a plain number for number fields (35 for 35%, 5000000 for
   Rs 50 lakh), the whole updated array for array fields (keep current items the notice does not remove), and one of
   the listed values where values are listed.
5. "evidence" is the shortest exact quote from the notice that states the change, under 200 characters.
6. Respond with ONLY this JSON, with no markdown:
{"summaryOfChanges": "One or two plain sentences on what the notice changes.", "changes": [{"field": "benefits.maxSubsidyPercent", "newValue": 35, "evidence": "exact quote"}]}`;
}

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

import type { PlanInputs, CalculatedValues, UserProfile } from '@/types';
import { getLanguageMeta } from '@/i18n/languages';
import {
  DEFAULT_LOAN_INTEREST_RATE_PERCENT,
  DEFAULT_LOAN_TENURE_MONTHS,
  getPlausibilityWarnings,
} from '@/lib/calculator';

export function buildPlannerPrompt(
  inputs: PlanInputs,
  calculated: CalculatedValues,
  userProfile: Partial<UserProfile> | null,
  language: string = 'en'
): string {
  const langMeta = getLanguageMeta(language);
  // e.g. "Tamil (தமிழ்)" — giving the model both the English and native name
  // makes the instruction unambiguous regardless of which language it's for.
  const languageInstruction =
    language === 'en'
      ? 'Respond in English.'
      : `Respond ENTIRELY in ${langMeta.name} (${langMeta.nativeName}) — every string value in the JSON output (executiveSummary, keyAssumptions, riskAnalysis, actionableNextSteps) must be written in natural, plain-spoken ${langMeta.name}, using ${langMeta.nativeName}'s native script. Do NOT respond in English. JSON keys stay in English exactly as shown in the template; only the string VALUES are translated. Keep ₹ figures, numerals, and proper nouns/acronyms (ArthaSetu, PMEGP, MUDRA, DSCR) as-is.`;

  const profileContext = userProfile
    ? `
Entrepreneur Name: ${userProfile.name || 'Entrepreneur'}
State: ${userProfile.state || 'India'}
District: ${userProfile.district || 'Rural/Semi-urban'}
Experience: ${userProfile.businessExperience || 'Beginner'}
`
    : 'Entrepreneur in India';

  // Correct arithmetic on unbelievable inputs produced a report calling a 99.2%
  // net margin "exceptional ... highly bankable". Flagged figures must be
  // questioned in the narrative, never praised.
  const warnings = getPlausibilityWarnings(calculated);
  const plausibilityBlock = warnings.length > 0
    ? `
---
### ⚠️ Figures the application flagged as unrealistic:
${warnings.map((w) => `- ${w.message}`).join('\n')}
You MUST say plainly in executiveSummary that these figures look unrealistic and must be re-checked before approaching a bank, name the inputs to re-check, and make this the first item in riskAnalysis. Do NOT describe the plan as exceptional, highly profitable or highly bankable.
`
    : '';

  const planTypeLine = inputs.planType === 'existing_expansion'
    ? `- Plan Type: Expansion of an existing business (current monthly revenue ₹${(inputs.currentMonthlyRevenue || 0).toLocaleString('en-IN')}, current monthly expenses ₹${(inputs.currentMonthlyExpenses || 0).toLocaleString('en-IN')})`
    : '- Plan Type: New startup';

  return `
You are **ArthaSetu**, a seasoned rural business and micro-finance advisor in India.
Below are the exact deterministic financial calculations for a rural micro-enterprise calculated by the application math engine.

---
### 👤 Entrepreneur Profile:
${profileContext}
- Business Type: ${inputs.businessType}
- Operating Scale: ${inputs.businessScale}
- Location: ${inputs.location}
${planTypeLine}

---
### 📊 Application Calculated Financial Figures (DO NOT recalculate or modify these figures):
- Total Initial Investment Required: ₹${calculated.totalInitialCost.toLocaleString('en-IN')}
- Available Personal Savings: ₹${inputs.availableSavings.toLocaleString('en-IN')}
- Loan / Subsidy Gap: ₹${calculated.fundingGap.toLocaleString('en-IN')}
- Estimated Monthly Loan EMI: ₹${calculated.monthlyLoanEmi.toLocaleString('en-IN')} (${inputs.loanInterestRatePercent ?? DEFAULT_LOAN_INTEREST_RATE_PERCENT}% interest, ${inputs.loanTenureMonths ?? DEFAULT_LOAN_TENURE_MONTHS} months tenure)
- Monthly Gross Revenue: ₹${calculated.monthlyGrossRevenue.toLocaleString('en-IN')}
- Monthly Total Expenses: ₹${calculated.monthlyTotalExpenses.toLocaleString('en-IN')}
- Monthly Net Profit: ₹${calculated.monthlyNetProfit.toLocaleString('en-IN')}
- Net Profit Margin: ${calculated.profitMarginPercent}%
- Break-even Payback Period: ${calculated.breakEvenMonths ? `${calculated.breakEvenMonths} months` : 'Operating at net loss'}
- Monthly Break-even Units: ${calculated.breakEvenUnitsPerMonth} units/month

---
### 🌐 Language:
${languageInstruction}

${plausibilityBlock}
---
### 🎯 Your Task:
Provide the qualitative narrative, critical business assumptions, risk analysis, and immediate execution steps.
SPECIAL INSTRUCTION: If the businessType is ambiguous, vague, or unrecognizable, politely ask the entrepreneur for clarification in the executiveSummary (e.g. "Could you clarify if you produce dairy, poultry, tailoring, or retail goods?") while providing conservative baseline micro-enterprise guidance.
Respond strictly with a valid JSON object matching this structure (remember: string VALUES in ${langMeta.name}, JSON keys unchanged):

\`\`\`json
{
  "executiveSummary": "A concise 2-3 sentence strategic evaluation of business viability, profitability, and bankability based on the local geography.",
  "keyAssumptions": [
    "First core operational assumption regarding capacity and pricing",
    "Second working capital and cash-cycle assumption",
    "Third local demand and supplier availability assumption"
  ],
  "riskAnalysis": [
    "First key risk (e.g. raw material price fluctuation or disease/spoilage) and specific mitigation",
    "Second cash flow or seasonal lull risk and buffer strategy",
    "Third market competition or collection delay risk and safeguard"
  ],
  "actionableNextSteps": [
    "First immediate step for bank proposal / PMEGP or MUDRA documentation",
    "Second step for equipment sourcing and vendor quotations",
    "Third step for pre-booking local wholesale/retail buyers",
    "Fourth step for local trade registration and record-keeping setup"
  ]
}
\`\`\`
`;
}

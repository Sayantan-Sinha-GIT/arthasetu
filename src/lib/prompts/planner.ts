import type { PlanInputs, CalculatedValues, UserProfile } from '@/types';

export function buildPlannerPrompt(
  inputs: PlanInputs,
  calculated: CalculatedValues,
  userProfile: Partial<UserProfile> | null,
  language: string = 'en'
): string {
  const isHindi = language === 'hi';

  const profileContext = userProfile
    ? `
Entrepreneur Name: ${userProfile.name || 'Entrepreneur'}
State: ${userProfile.state || 'India'}
District: ${userProfile.district || 'Rural/Semi-urban'}
Experience: ${userProfile.businessExperience || 'Beginner'}
`
    : 'Entrepreneur in India';

  if (isHindi) {
    return `
आप **अर्थसेतु (ArthaSetu)** के वरिष्ठ वित्तीय सलाहकार हैं।
नीचे एक ग्रामीण/अर्ध-शहरी सूक्ष्म-उद्यमी के व्यवसाय की सही गणितीय गणना दी गई है (जो ऐप द्वारा सटीक रूप से निकाली गई है)।

---
### 👤 उद्यमी प्रोफाइल:
${profileContext}
- व्यवसाय का प्रकार: ${inputs.businessType}
- कार्यक्षेत्र / पैमाना: ${inputs.businessScale}
- स्थान: ${inputs.location}

---
### 📊 ऐप द्वारा गणना किए गए वित्तीय आंकड़े (इन आंकड़ों को बदलें नहीं):
- कुल आवश्यक प्रारंभिक पूंजी (Total Initial Investment): ₹${calculated.totalInitialCost.toLocaleString('en-IN')}
- उद्यमी की अपनी बचत (Available Savings): ₹${inputs.availableSavings.toLocaleString('en-IN')}
- आवश्यक बैंक लोन / सब्सिडी (Funding Gap): ₹${calculated.fundingGap.toLocaleString('en-IN')}
- अनुमानित मासिक लोन ईएमआई (Estimated Monthly EMI): ₹${calculated.monthlyLoanEmi.toLocaleString('en-IN')} (${inputs.loanInterestRatePercent}% ब्याज, ${inputs.loanTenureMonths} महीने)
- मासिक कुल राजस्व (Monthly Gross Revenue): ₹${calculated.monthlyGrossRevenue.toLocaleString('en-IN')}
- मासिक कुल खर्चे (Monthly Total Expenses): ₹${calculated.monthlyTotalExpenses.toLocaleString('en-IN')}
- मासिक शुद्ध लाभ (Monthly Net Profit): ₹${calculated.monthlyNetProfit.toLocaleString('en-IN')}
- शुद्ध लाभ मार्जिन (Profit Margin): ${calculated.profitMarginPercent}%
- ब्रेक-ईवन अवधि (Break-even Payback): ${calculated.breakEvenMonths ? `${calculated.breakEvenMonths} महीने` : 'वर्तमान में घाटा'}
- मासिक ब्रेक-ईवन यूनिट्स: ${calculated.breakEvenUnitsPerMonth} यूनिट्स/महीना

---
---
### 🎯 आपका कार्य:
आपको केवल **गुणात्मक वित्तीय विश्लेषण (Qualitative Narrative)** प्रदान करना है। कोई नया गणित न जोड़ें।
विशेष नियम: यदि व्यवसाय का प्रकार (businessType) अस्पष्ट या निरर्थक है, तो executiveSummary में विनम्रतापूर्वक स्पष्टीकरण मांगें और 2-3 उदाहरण दें, साथ ही सामान्य सूक्ष्म-उद्यम अनुमान प्रदान करें।
सख्त JSON प्रारूप में उत्तर दें:

\`\`\`json
{
  "executiveSummary": "व्यवसाय की व्यवहार्यता, लाभप्रदता और स्थान के अनुसार क्षमता का 2-3 वाक्यों में स्पष्ट सारांश।",
  "keyAssumptions": [
    "कच्चे माल और बिक्री से जुड़ी पहली महत्वपूर्ण धारणा",
    "कामकाजी पूंजी और ग्राहक मांग से जुड़ी दूसरी धारणा",
    "बाजार मूल्य और मौसमी बदलाव से जुड़ी तीसरी धारणा"
  ],
  "riskAnalysis": [
    "पहला बड़ा परिचालन या मौसमी जोखिम और उसका समाधान",
    "दूसरा वित्तीय या नकदी प्रवाह जोखिम और उसका बचाव",
    "तीसरा प्रतिस्पर्धा या स्थानीय जोखिम और सावधानी"
  ],
  "actionableNextSteps": [
    "बैंक लोन / PMEGP या MUDRA आवेदन के लिए पहला कदम",
    "सप्लायर और उपकरण खरीद के लिए दूसरा कदम",
    "स्थानीय बिक्री केंद्र या खरीदार तय करने का तीसरा कदम",
    "आवश्यक स्थानीय परमिट या रिकॉर्ड-कीपिंग शुरू करने का चौथा कदम"
  ]
}
\`\`\`
`;
  }

  return `
You are **ArthaSetu**, a seasoned rural business and micro-finance advisor in India.
Below are the exact deterministic financial calculations for a rural micro-enterprise calculated by the application math engine.

---
### 👤 Entrepreneur Profile:
${profileContext}
- Business Type: ${inputs.businessType}
- Operating Scale: ${inputs.businessScale}
- Location: ${inputs.location}

---
### 📊 Application Calculated Financial Figures (DO NOT recalculate or modify these figures):
- Total Initial Investment Required: ₹${calculated.totalInitialCost.toLocaleString('en-IN')}
- Available Personal Savings: ₹${inputs.availableSavings.toLocaleString('en-IN')}
- Loan / Subsidy Gap: ₹${calculated.fundingGap.toLocaleString('en-IN')}
- Estimated Monthly Loan EMI: ₹${calculated.monthlyLoanEmi.toLocaleString('en-IN')} (${inputs.loanInterestRatePercent}% interest, ${inputs.loanTenureMonths} months tenure)
- Monthly Gross Revenue: ₹${calculated.monthlyGrossRevenue.toLocaleString('en-IN')}
- Monthly Total Expenses: ₹${calculated.monthlyTotalExpenses.toLocaleString('en-IN')}
- Monthly Net Profit: ₹${calculated.monthlyNetProfit.toLocaleString('en-IN')}
- Net Profit Margin: ${calculated.profitMarginPercent}%
- Break-even Payback Period: ${calculated.breakEvenMonths ? `${calculated.breakEvenMonths} months` : 'Operating at net loss'}
- Monthly Break-even Units: ${calculated.breakEvenUnitsPerMonth} units/month

---
### 🎯 Your Task:
Provide the qualitative narrative, critical business assumptions, risk analysis, and immediate execution steps.
SPECIAL INSTRUCTION: If the businessType is ambiguous, vague, or unrecognizable, politely ask the entrepreneur for clarification in the executiveSummary (e.g. "Could you clarify if you produce dairy, poultry, tailoring, or retail goods?") while providing conservative baseline micro-enterprise guidance.
Respond strictly in JSON format as follows:

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

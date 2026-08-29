import { calculateGraminScore, GRAMIN_DISCLAIMER } from '../src/lib/gramin-score';
import type { GraminScoreInputs } from '../src/types';

console.log('🧪 Testing Gramin Credit Readiness Score Calculator (300-900 Scale)...\n');

// 1. TEST EXCELLENT READINESS (750 - 900)
console.log('1️⃣ Testing Excellent Profile (Established, High Margin, Zero Debt Default, Full Discipline)...');
const excellentProfile: GraminScoreInputs = {
  monthlyIncome: 80000,
  monthlyExpenses: 45000, // Margin = (35k / 80k) = 43.75% (>30%)
  revenueConsistency: 'stable',
  steadyIncomeMonths: 24,
  availableCapital: 100000,
  desiredFunding: 100000, // 50% own funding
  monthlySavings: 15000,
  emergencyReserve: 50000,
  yearsInOperation: 3, // >2 yrs
  isRegistered: true,
  employeeCount: 4,
  existingLoans: [
    { id: '1', lenderType: 'bank', emiAmount: 5000, status: 'on_time' }, // 5000 / 80000 = 6.25% (<30%)
  ],
  borrowingHistoryYears: 3,
  keepsRecords: true,
  usesBankAccount: true,
  hasInsurance: true,
  isShgMember: true,
};

const res1 = calculateGraminScore(excellentProfile);
console.log(`   • Composite Score: ${res1.score} / 900`);
console.log(`   • Band: ${res1.band} (${res1.bandColor})`);
console.log(`   • Partial Data: ${res1.isPartialData}`);
console.log(`   • Cash Flow: ${res1.breakdown.cashFlowHealth.score}/150`);
console.log(`   • Capital Adequacy: ${res1.breakdown.capitalAdequacy.score}/100`);
console.log(`   • Stability: ${res1.breakdown.businessStability.score}/100`);
console.log(`   • Debt & Repayment: ${res1.breakdown.debtRepayment.score}/150`);
console.log(`   • Financial Discipline: ${res1.breakdown.financialDiscipline.score}/100`);

if (res1.score < 750 || res1.band !== 'Excellent Readiness') {
  throw new Error(`Expected Excellent Readiness (>=750), got ${res1.score}`);
}
console.log('   ✅ Excellent Readiness test passed.\n');

// 2. TEST DEFAULT / MISSED PAYMENT PENALTY
console.log('2️⃣ Testing Defaulted Loan Penalty...');
const defaultedProfile: GraminScoreInputs = {
  ...excellentProfile,
  existingLoans: [
    { id: '1', lenderType: 'informal_moneylender', emiAmount: 10000, status: 'defaulted' },
  ],
};
const res2 = calculateGraminScore(defaultedProfile);
console.log(`   • Debt Score with Default: ${res2.breakdown.debtRepayment.score} / 150 (Expected: 10)`);
console.log(`   • Composite Score with Default: ${res2.score} / 900`);
if (res2.breakdown.debtRepayment.score !== 10) {
  throw new Error(`Expected debt score 10 for defaulted loan, got ${res2.breakdown.debtRepayment.score}`);
}
console.log('   ✅ Loan default penalty verified (strictly locked to 10 points).\n');

// 3. TEST PARTIAL DATA FLAGGING
console.log('3️⃣ Testing Partial Data Flagging on Incomplete Inputs...');
const partialProfile: Partial<GraminScoreInputs> = {
  monthlyIncome: 20000,
  monthlyExpenses: 15000,
  availableCapital: 10000,
  yearsInOperation: 0,
};
const res3 = calculateGraminScore(partialProfile);
console.log(`   • Composite Score: ${res3.score} / 900`);
console.log(`   • isPartialData: ${res3.isPartialData}`);
if (!res3.isPartialData) {
  throw new Error('Expected isPartialData to be true when optional fields are omitted');
}
console.log('   ✅ Partial data flagging verified.\n');

// 4. TEST MANDATORY DISCLAIMER TEXT
console.log('4️⃣ Testing Mandatory Disclaimer Compliance...');
if (!GRAMIN_DISCLAIMER.includes('CIBIL') || !GRAMIN_DISCLAIMER.includes('NOT a verified credit report')) {
  throw new Error('Disclaimer missing essential regulatory disassociation text');
}
console.log('   ✅ Mandatory regulatory disclaimer verified.\n');

console.log('🎉 ALL GRAMIN CREDIT READINESS SCORE TESTS PASSED WITH 100% MATHEMATICAL PRECISION!');

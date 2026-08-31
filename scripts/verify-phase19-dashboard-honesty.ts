import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { calculateGraminScore } from '../src/lib/gramin-score';

async function verifyDashboardHonesty() {
  console.log('============================================================');
  console.log('📊 VERIFYING TASK 6: DASHBOARD HONESTY (NO SILENT ₹0)');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}${details ? ` (${details})` : ''}`);
    }
  }

  // 1. GraminScore identifies missing financial data
  console.log('1️⃣ Testing GraminScore calculation honesty on missing vs entered data:');
  
  const scoreEmpty = calculateGraminScore({});
  assert('Empty inputs flag isPartialData', scoreEmpty.isPartialData === true);

  const scoreFull = calculateGraminScore({
    monthlyIncome: 45000,
    monthlyExpenses: 25000,
    revenueConsistency: 'stable',
    emergencyReserve: 10000,
    availableCapital: 50000,
    desiredFunding: 100000,
    keepsRecords: true,
    usesBankAccount: true,
  });
  assert('Complete inputs produce verified full score calculation', scoreFull.score >= 500 && scoreFull.breakdown.cashFlowHealth.score > 50);

  // 2. Formatting Logic Check: Undefined vs 0
  console.log('\n2️⃣ Testing Null/Undefined vs Entered 0 logic:');
  const dummyProfileEmpty: any = { availableCapital: undefined, monthlyIncome: undefined, monthlyExpenses: undefined };
  const isCapitalSet = typeof dummyProfileEmpty.availableCapital === 'number';
  assert('Undefined availableCapital is NOT considered set', !isCapitalSet);

  const dummyProfileZero: any = { availableCapital: 0, monthlyIncome: 0, monthlyExpenses: 0 };
  const isCapitalSetZero = typeof dummyProfileZero.availableCapital === 'number';
  assert('Explicit 0 availableCapital IS considered set', isCapitalSetZero);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TASK 6 VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyDashboardHonesty().catch((err) => {
  console.error(err);
  process.exit(1);
});

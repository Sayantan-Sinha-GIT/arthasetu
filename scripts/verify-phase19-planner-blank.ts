import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { calculateFinancialPlan } from '../src/lib/calculator';

async function verifyPlannerBlank() {
  console.log('============================================================');
  console.log('📊 VERIFYING TASK 5: PLANNER FAKE-DATA REMOVAL & HONEST INPUTS');
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

  // 1. API endpoint rejects missing businessType / location
  console.log('1️⃣ Testing Server-Side /api/planner validation:');
  const dummyCalc = calculateFinancialPlan({
    planType: 'startup',
    businessType: '',
    businessScale: '',
    location: '',
    currentMonthlyRevenue: 0,
    currentMonthlyExpenses: 0,
    expansionGoal: '',
    expansionEquipmentCost: 0,
    expansionWorkingCapital: 0,
    projectedRevenueIncreasePercent: 0,
    equipmentCost: 0,
    setupCost: 0,
    initialInventory: 0,
    workingCapitalReserve: 0,
    unitPrice: 0,
    unitsSoldPerMonth: 0,
    otherMonthlyRevenue: 0,
    monthlyRawMaterials: 0,
    monthlyRentUtilities: 0,
    monthlyLabor: 0,
    monthlyTransportPackaging: 0,
    monthlyMaintenanceOther: 0,
    availableSavings: 0,
    loanInterestRatePercent: 9.5,
    loanTenureMonths: 36,
  });

  const resMissing = await fetch('http://localhost:3000/api/planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: {
        businessType: '',
        location: '',
      },
      calculatedValues: dummyCalc,
    }),
  });
  const dataMissing = await resMissing.json();
  assert('API rejects empty businessType and location with 400', resMissing.status === 400 && !dataMissing.success);

  // 2. API endpoint succeeds with valid user inputs
  console.log('\n2️⃣ Testing /api/planner with valid custom inputs:');
  const validInputs = {
    planType: 'startup' as const,
    businessType: 'Organic Honey Bottling Unit',
    businessScale: '200 bottles/month',
    location: 'Tezpur, Sonitpur, Assam',
    currentMonthlyRevenue: 0,
    currentMonthlyExpenses: 0,
    expansionGoal: '',
    expansionEquipmentCost: 0,
    expansionWorkingCapital: 0,
    projectedRevenueIncreasePercent: 0,
    equipmentCost: 15000,
    setupCost: 10000,
    initialInventory: 8000,
    workingCapitalReserve: 5000,
    unitPrice: 350,
    unitsSoldPerMonth: 150,
    otherMonthlyRevenue: 0,
    monthlyRawMaterials: 18000,
    monthlyRentUtilities: 2000,
    monthlyLabor: 4000,
    monthlyTransportPackaging: 2000,
    monthlyMaintenanceOther: 1000,
    availableSavings: 20000,
    loanInterestRatePercent: 9.5,
    loanTenureMonths: 36,
  };
  const validCalc = calculateFinancialPlan(validInputs);

  const resValid = await fetch('http://localhost:3000/api/planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: validInputs,
      calculatedValues: validCalc,
      userProfile: { state: 'Assam', district: 'Sonitpur' },
      language: 'en',
    }),
  });
  const dataValid = await resValid.json();
  assert('API generates structured AI narrative for valid inputs', dataValid.success && !!dataValid.narrative?.executiveSummary);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TASK 5 VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyPlannerBlank().catch((err) => {
  console.error(err);
  process.exit(1);
});

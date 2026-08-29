import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { calculateFinancialPlan } from '../src/lib/calculator';
import type { PlanInputs } from '../src/types';

async function testExistingBusinessPlanner() {
  console.log('🧪 Testing Existing Business Financial Planner Branch...\n');

  // 1. TEST EXISTING BUSINESS EXPANSION BRANCH
  console.log('1️⃣ Testing Deterministic Calculation on Existing Business Profile...');
  const existingInputs: PlanInputs = {
    planType: 'existing_expansion',
    businessType: 'Custom Tailoring & Boutique',
    businessScale: '5 Sewing Machines + 2 Embroidery Units',
    location: 'Varanasi, Uttar Pradesh',
    
    currentMonthlyRevenue: 60000,
    currentMonthlyExpenses: 35000,
    expansionGoal: 'Add 2 commercial embroidery machines & expand retail shop',
    expansionEquipmentCost: 80000,
    expansionWorkingCapital: 30000,
    setupCost: 20000,
    projectedRevenueIncreasePercent: 50,

    // Fallbacks
    equipmentCost: 80000,
    initialInventory: 20000,
    workingCapitalReserve: 10000,
    unitPrice: 0,
    unitsSoldPerMonth: 0,
    otherMonthlyRevenue: 0,
    monthlyRawMaterials: 0,
    monthlyRentUtilities: 0,
    monthlyLabor: 0,
    monthlyTransportPackaging: 0,
    monthlyMaintenanceOther: 0,

    availableSavings: 40000,
    loanInterestRatePercent: 9.5,
    loanTenureMonths: 36,
  };

  const calculated = calculateFinancialPlan(existingInputs);

  console.log('   • Total Expansion Capital Needed:', `₹${calculated.totalInitialCost}`);
  console.log('   • Available Own Funds:', `₹${existingInputs.availableSavings}`);
  console.log('   • Growth Funding Gap (Loan):', `₹${calculated.fundingGap}`);
  console.log('   • Monthly Loan EMI:', `₹${calculated.monthlyLoanEmi}`);
  console.log('   • Baseline Monthly Profit (Pre-Expansion):', `₹${calculated.currentMonthlyProfit}`);
  console.log('   • Projected Monthly Revenue (Post-Expansion):', `₹${calculated.monthlyGrossRevenue}`);
  console.log('   • Projected Monthly Net Profit:', `₹${calculated.monthlyNetProfit}`);
  console.log('   • Incremental Monthly Net Profit:', `₹${calculated.incrementalMonthlyProfit}`);
  console.log('   • Expansion Payback Period:', `${calculated.breakEvenMonths} Months`);

  // Assertions:
  // Expansion Capital = 80000 + 30000 + 20000 = 130,000
  if (calculated.totalInitialCost !== 130000) {
    throw new Error(`Expected expansion capital 130,000, got ${calculated.totalInitialCost}`);
  }
  // Funding Gap = 130,000 - 40,000 = 90,000
  if (calculated.fundingGap !== 90000) {
    throw new Error(`Expected funding gap 90,000, got ${calculated.fundingGap}`);
  }
  // Current profit = 60,000 - 35,000 = 25,000
  if (calculated.currentMonthlyProfit !== 25000) {
    throw new Error(`Expected baseline profit 25,000, got ${calculated.currentMonthlyProfit}`);
  }
  // Projected revenue = 60,000 * 1.50 = 90,000
  if (calculated.monthlyGrossRevenue !== 90000) {
    throw new Error(`Expected projected revenue 90,000, got ${calculated.monthlyGrossRevenue}`);
  }
  if (!calculated.breakEvenMonths || calculated.breakEvenMonths <= 0) {
    throw new Error('Invalid break-even payback calculated');
  }

  console.log('   ✅ Deterministic existing business expansion formulas passed 100% precision.');

  // 2. TEST STARTUP MODE REGRESSION (Must remain untouched)
  console.log('\n2️⃣ Testing Startup Mode (Regression Protection)...');
  const startupInputs: PlanInputs = {
    planType: 'startup',
    businessType: 'Broiler Poultry Farm',
    businessScale: '500 birds per batch',
    location: 'Kamrup, Assam',
    equipmentCost: 25000,
    setupCost: 35000,
    initialInventory: 15000,
    workingCapitalReserve: 15000,
    unitPrice: 160,
    unitsSoldPerMonth: 450,
    otherMonthlyRevenue: 2000,
    monthlyRawMaterials: 35000,
    monthlyRentUtilities: 3000,
    monthlyLabor: 5000,
    monthlyTransportPackaging: 2500,
    monthlyMaintenanceOther: 1500,
    availableSavings: 30000,
    loanInterestRatePercent: 9.5,
    loanTenureMonths: 36,
  };

  const startupCalc = calculateFinancialPlan(startupInputs);
  if (startupCalc.totalInitialCost !== 90000 || startupCalc.fundingGap !== 60000) {
    throw new Error('Startup calculation regression detected');
  }
  console.log('   ✅ Startup mode calculations verified with zero regressions.');

  console.log('\n🎉 ALL EXISTING BUSINESS & STARTUP FINANCIAL PLANNER TESTS PASSED PERFECTLY!');
}

testExistingBusinessPlanner().catch((err) => {
  console.error('\n❌ Planner Test Failed:', err);
  process.exit(1);
});

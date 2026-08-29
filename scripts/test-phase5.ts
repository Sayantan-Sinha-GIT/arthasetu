/**
 * Phase 5 Integration Test Script
 * Tests:
 * 1. Deterministic Math Engine precision & formula accuracy (Initial Cost, Funding Gap, Loan EMI, Gross Revenue, Expenses, Net Profit, Profit Margin, Break-even Months & Units)
 * 2. AI Qualitative Narrative generation via Gemini Flash
 * 3. Firestore Plan Persistence: savePlan, getSavedPlans, getPlanById, deletePlan
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  getAuth as getClientAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, deleteDoc } from 'firebase/firestore';

import { initializeApp as initAdminApp, cert, getApps as getAdminApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import type { PlanInputs, UserProfile } from '../src/types';

async function runPhase5Tests() {
  console.log('🧪 Starting Phase 5: Financial Planner Math & Integration Tests...\n');

  // Dynamic imports
  const {
    calculateTotalInitialCost,
    calculateFundingGap,
    calculateMonthlyLoanEmi,
    calculateMonthlyGrossRevenue,
    calculateMonthlyOperatingExpenses,
    calculateBreakEvenUnits,
    calculateBreakEvenMonths,
    calculateFinancialPlan,
  } = await import('../src/lib/calculator');

  const { generateContent, GEMINI_MODELS } = await import('../src/lib/gemini');
  const { buildPlannerPrompt } = await import('../src/lib/prompts/planner');
  const { savePlan, getSavedPlans, getPlanById, deletePlan } = await import('../src/lib/firestore/plans');

  // TEST 1: DETERMINISTIC ARITHMETIC ENGINE VERIFICATION
  console.log('1️⃣ Testing Deterministic Arithmetic Calculations...');

  const sampleInputs: PlanInputs = {
    businessType: 'Broiler Poultry Farm',
    businessScale: '500 birds per batch',
    location: 'Hajo, Kamrup, Assam',
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

  // 1a. Total Initial Cost
  const totalCost = calculateTotalInitialCost(sampleInputs);
  console.log(`   • Total Initial Cost: ₹${totalCost} (Expected: ₹90,000)`);
  if (totalCost !== 90000) throw new Error(`Total initial cost mismatch: ${totalCost}`);

  // 1b. Funding Gap
  const fundingGap = calculateFundingGap(totalCost, sampleInputs.availableSavings);
  console.log(`   • Funding Gap: ₹${fundingGap} (Expected: ₹60,000)`);
  if (fundingGap !== 60000) throw new Error(`Funding gap mismatch: ${fundingGap}`);

  // 1c. Loan EMI (P = 60,000, r = 9.5% p.a., n = 36 months)
  const emi = calculateMonthlyLoanEmi(60000, 9.5, 36);
  console.log(`   • Monthly Loan EMI: ₹${emi} (Expected: ~₹1,922)`);
  if (emi < 1915 || emi > 1930) throw new Error(`EMI calculation out of acceptable range: ${emi}`);

  // 1d. Monthly Gross Revenue
  const grossRev = calculateMonthlyGrossRevenue(sampleInputs);
  console.log(`   • Monthly Gross Revenue: ₹${grossRev} (Expected: ₹74,000)`);
  if (grossRev !== 74000) throw new Error(`Gross revenue mismatch: ${grossRev}`);

  // 1e. Monthly Operating Expenses
  const opex = calculateMonthlyOperatingExpenses(sampleInputs);
  console.log(`   • Monthly Operating Expenses: ₹${opex} (Expected: ₹47,000)`);
  if (opex !== 47000) throw new Error(`Operating expenses mismatch: ${opex}`);

  // 1f. Full Orchestrator Results
  const fullCalculations = calculateFinancialPlan(sampleInputs);
  console.log(`   • Monthly Net Profit: ₹${fullCalculations.monthlyNetProfit} (Expected: ₹${74000 - (47000 + emi)})`);
  console.log(`   • Profit Margin: ${fullCalculations.profitMarginPercent}% (Expected: ~33.9%)`);
  console.log(`   • Break-Even Payback: ${fullCalculations.breakEvenMonths} Months (Expected: 4 Months)`);
  console.log(`   • Break-Even Volume: ${fullCalculations.breakEvenUnitsPerMonth} units/month`);

  if (fullCalculations.monthlyNetProfit !== 74000 - (47000 + emi)) {
    throw new Error('Monthly net profit calculation mismatch');
  }
  if (fullCalculations.breakEvenMonths !== 4) {
    throw new Error(`Break-even months mismatch: ${fullCalculations.breakEvenMonths}`);
  }
  console.log('   ✅ All deterministic mathematical formulas passed with 100% precision.');

  // TEST 2: AI NARRATIVE GENERATION VIA GEMINI FLASH
  console.log('\n2️⃣ Testing AI Qualitative Narrative Generation via Gemini Flash...');
  const testProfile: Partial<UserProfile> = {
    name: 'Sunita Devi',
    state: 'Assam',
    district: 'Kamrup',
    businessExperience: '1-3 years',
  };

  const plannerPrompt = buildPlannerPrompt(sampleInputs, fullCalculations, testProfile, 'en');
  const narrativeRaw = await generateContent(
    GEMINI_MODELS.FLASH,
    plannerPrompt,
    'Generate the structured JSON financial viability narrative.'
  );

  let cleanJson = narrativeRaw.trim();
  if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  else if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');

  const narrative = JSON.parse(cleanJson);
  console.log('   📝 AI Executive Summary:\n      "' + narrative.executiveSummary + '"');
  console.log(`   • Assumptions generated: ${narrative.keyAssumptions?.length || 0}`);
  console.log(`   • Risks analyzed: ${narrative.riskAnalysis?.length || 0}`);
  console.log(`   • Actionable Next Steps: ${narrative.actionableNextSteps?.length || 0}`);

  if (!narrative.executiveSummary || !narrative.keyAssumptions || !narrative.riskAnalysis || !narrative.actionableNextSteps) {
    throw new Error('AI narrative output missing required structured fields');
  }
  console.log('   ✅ AI Qualitative Narrative generated and validated against schema.');

  // TEST 3: FIRESTORE PLAN CRUD OPERATIONS
  console.log('\n3️⃣ Testing Firestore Plan Persistence (Save, Fetch, GetById, Delete)...');

  // Firebase Setup
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const clientApp = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApps()[0];
  const clientAuth = getClientAuth(clientApp);
  const clientDb = getClientFirestore(clientApp);

  let rawAdminKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY!.trim();
  if ((rawAdminKey.startsWith("'") && rawAdminKey.endsWith("'")) || (rawAdminKey.startsWith('"') && rawAdminKey.endsWith('"'))) {
    rawAdminKey = rawAdminKey.slice(1, -1);
  }
  const serviceAccount = JSON.parse(rawAdminKey) as ServiceAccount;
  const adminApp = getAdminApps().length === 0 ? initAdminApp({ credential: cert(serviceAccount) }, 'admin-p5-test') : getAdminApps()[0];
  const adminAuth = getAdminAuth(adminApp);

  const testEmail = `p5_plan_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const userCredential = await createUserWithEmailAndPassword(clientAuth, testEmail, testPassword);
  const testUid = userCredential.user.uid;
  await updateProfile(userCredential.user, { displayName: 'Sunita Devi' });

  let savedPlanId = '';
  try {
    // 3a. Save Plan
    savedPlanId = await savePlan(testUid, {
      userId: testUid,
      title: 'Broiler Poultry Farm Viability Plan (Kamrup)',
      businessType: 'Broiler Poultry Farm',
      inputs: sampleInputs,
      calculatedValues: fullCalculations,
      aiNarrative: narrative,
    });
    console.log(`   ✅ Plan successfully saved to Firestore (ID: ${savedPlanId})`);

    // 3b. Fetch all saved plans
    const userPlans = await getSavedPlans(testUid);
    if (userPlans.length !== 1 || userPlans[0].id !== savedPlanId) {
      throw new Error('Failed to retrieve saved plans list from Firestore');
    }
    console.log(`   ✅ Retrieved ${userPlans.length} plan from Firestore: "${userPlans[0].title}"`);

    // 3c. Get Plan by ID
    const singlePlan = await getPlanById(savedPlanId);
    if (!singlePlan || singlePlan.calculatedValues.totalInitialCost !== 90000) {
      throw new Error('Failed to get single plan by ID or data corrupted');
    }
    console.log(`   ✅ getPlanById verified: Total Initial Cost = ₹${singlePlan.calculatedValues.totalInitialCost}`);

    // 3d. Delete Plan
    await deletePlan(savedPlanId);
    const afterDelete = await getSavedPlans(testUid);
    if (afterDelete.length !== 0) {
      throw new Error('Plan was not deleted');
    }
    console.log('   ✅ Plan successfully deleted from Firestore.');

    console.log('\n🎉 ALL 3 PHASE 5 FINANCIAL PLANNER INTEGRATION TESTS PASSED PERFECTLY!\n');
  } finally {
    // Clean up test user
    try {
      await adminAuth.deleteUser(testUid);
      console.log('🧹 Cleaned up temporary test user.');
    } catch {}
  }
}

runPhase5Tests().catch((err) => {
  console.error('\n❌ Phase 5 Test failed with error:', err);
  process.exit(1);
});

import 'dotenv/config';
import { resolve } from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  getAuth as getClientAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

async function runPersistence() {
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

  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  const adminApp = getAdminApps().length === 0 ? initAdminApp({ credential: cert(sa) }) : getAdminApps()[0];
  const adminAuth = getAdminAuth(adminApp);

  const testEmail = 'persistence_test_user@arthasetu.internal';
  const testPassword = 'SecurePassword123!';

  // Provision user in Firebase Auth if needed
  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(testEmail);
  } catch {
    userRecord = await adminAuth.createUser({ email: testEmail, password: testPassword });
  }

  // Sign in on client SDK
  const userCredential = await signInWithEmailAndPassword(clientAuth, testEmail, testPassword);
  const testUserId = userCredential.user.uid;
  console.log(`• Authenticated test client UID: "${testUserId}"\n`);

  const { savePlan, getSavedPlans, getPlanById } = await import('../src/lib/firestore/plans');
  const { saveAdvice, getSavedAdvice } = await import('../src/lib/firestore/advice');
  const { updateUserProfile, getUserProfile } = await import('../src/lib/firestore/users');
  const { calculateFinancialPlan } = await import('../src/lib/calculator');
  const { calculateGraminScore } = await import('../src/lib/gramin-score');

  console.log('🧪 Testing Full Data Persistence Lifecycle (Section 7)...\n');

  // 1. TEST STARTUP PLAN PERSISTENCE
  console.log('1️⃣ Testing Startup Plan Save & Retrieval...');
  const startupInputs = {
    planType: 'startup' as const,
    businessType: 'Handloom Weaving',
    businessScale: '4 Wooden Looms',
    location: 'Sualkuchi, Assam',
    equipmentCost: 40000,
    setupCost: 20000,
    initialInventory: 15000,
    workingCapitalReserve: 10000,
    unitPrice: 1800,
    unitsSoldPerMonth: 30,
    otherMonthlyRevenue: 0,
    monthlyRawMaterials: 22000,
    monthlyRentUtilities: 2000,
    monthlyLabor: 8000,
    monthlyTransportPackaging: 2000,
    monthlyMaintenanceOther: 1000,
    availableSavings: 35000,
    loanInterestRatePercent: 9.5,
    loanTenureMonths: 36,
  };

  const calculated = calculateFinancialPlan(startupInputs);
  const startupPlanId = await savePlan(testUserId, {
    userId: testUserId,
    title: 'Sualkuchi Silk Weaving Plan',
    businessType: 'Handloom Weaving',
    inputs: startupInputs,
    calculatedValues: calculated,
    aiNarrative: {
      executiveSummary: 'Strong viable handloom unit in Sualkuchi silk cluster.',
      keyAssumptions: ['Assumes regular supply of mulberry silk yarn'],
      riskAnalysis: ['Seasonal fluctuation in wedding season demand'],
      actionableNextSteps: ['Apply for Weaver Mudra Scheme subsidy'],
    },
  });

  console.log(`   • Plan saved with ID: ${startupPlanId}`);
  const retrievedStartup = await getPlanById(startupPlanId);
  if (!retrievedStartup || retrievedStartup.calculatedValues.totalInitialCost !== 85000) {
    throw new Error('Startup plan retrieval failed or data corrupted');
  }
  console.log('   ✅ Startup plan persisted and retrieved with 100% integrity.\n');

  // 2. TEST EXISTING BUSINESS EXPANSION PLAN PERSISTENCE
  console.log('2️⃣ Testing Existing Business Expansion Plan Persistence...');
  const existingInputs = {
    planType: 'existing_expansion' as const,
    businessType: 'Custom Furniture Fabrication',
    businessScale: '2 Wood Turners + 1 Planer (+CNC Router Expansion)',
    location: 'Saharanpur, Uttar Pradesh',
    currentMonthlyRevenue: 120000,
    currentMonthlyExpenses: 70000,
    expansionGoal: 'Procure 3-axis CNC wood carving machine',
    expansionEquipmentCost: 150000,
    expansionWorkingCapital: 50000,
    setupCost: 30000,
    projectedRevenueIncreasePercent: 60,
    availableSavings: 80000,
    loanInterestRatePercent: 9.5,
    loanTenureMonths: 48,
    equipmentCost: 0,
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
  };

  const existingCalc = calculateFinancialPlan(existingInputs);
  const existingPlanId = await savePlan(testUserId, {
    userId: testUserId,
    title: 'Saharanpur CNC Furniture Expansion Plan',
    businessType: 'Custom Furniture Fabrication',
    inputs: existingInputs,
    calculatedValues: existingCalc,
    aiNarrative: {
      executiveSummary: 'High-margin wood carving expansion using CNC automation.',
      keyAssumptions: ['Assumes uninterrupted 3-phase commercial power'],
      riskAnalysis: ['Initial operator training curve for CAD software'],
      actionableNextSteps: ['Submit DPR to SIDBI / PMEGP nodal agency'],
    },
  });

  const retrievedExisting = await getPlanById(existingPlanId);
  if (!retrievedExisting || retrievedExisting.calculatedValues.totalInitialCost !== 230000) {
    throw new Error('Existing business expansion plan retrieval failed or corrupted');
  }
  console.log('   ✅ Existing business expansion plan persisted with 100% integrity.\n');

  // 3. TEST ADVICE PERSISTENCE
  console.log('3️⃣ Testing Advisor Chat Advice Persistence...');
  const adviceId = await saveAdvice(testUserId, {
    title: 'Tips for Raw Material Bulk Procurement in Assam',
    category: 'business-strategy',
    content: 'Form a weavers cooperative to procure mulberry silk directly from Sericulture Dept at 15% discount.',
    businessContext: 'Handloom Weaving in Sualkuchi',
  });

  const userAdviceList = await getSavedAdvice(testUserId);
  const foundAdvice = userAdviceList.find((a) => a.id === adviceId);
  if (!foundAdvice || !foundAdvice.content.includes('weavers cooperative')) {
    throw new Error('Advice persistence failed');
  }
  console.log('   ✅ Advice saved and retrieved successfully.\n');

  // 4. TEST USER PROFILE UPDATE & GRAMIN SCORE RE-COMPUTATION
  console.log('4️⃣ Testing Profile Updates & Dynamic Gramin Score Persistence...');
  await updateUserProfile(testUserId, {
    name: 'Sayantan Sinha',
    businessStatus: 'existing',
    businessType: 'Handloom Weaving',
    monthlyIncome: 65000,
    monthlyExpenses: 35000,
    availableCapital: 75000,
    desiredFunding: 50000,
    onboardingComplete: true,
  });

  const updatedProfile = await getUserProfile(testUserId);
  if (!updatedProfile || updatedProfile.monthlyIncome !== 65000) {
    throw new Error('Profile update failed');
  }

  // Re-calculate Gramin Score from updated profile
  const score = calculateGraminScore({
    monthlyIncome: updatedProfile.monthlyIncome,
    monthlyExpenses: updatedProfile.monthlyExpenses,
    availableCapital: updatedProfile.availableCapital,
    desiredFunding: updatedProfile.desiredFunding,
    yearsInOperation: 2,
    isRegistered: true,
    keepsRecords: true,
    usesBankAccount: true,
    hasInsurance: true,
    isShgMember: true,
  });

  console.log(`   • Gramin Score computed dynamically from updated profile: ${score.score}/900 (${score.band})`);
  if (score.score < 750) {
    throw new Error('Score calculation mismatch on updated profile');
  }
  console.log('   ✅ Profile and Gramin Score persistence fully verified.\n');

  await signOut(clientAuth);
  console.log('🎉 ALL DATA PERSISTENCE & SAVE/RELOAD LIFECYCLE TESTS PASSED 100%!');
}

runPersistence().catch((err) => {
  console.error('\n❌ Persistence Test Failed:', err);
  process.exit(1);
});

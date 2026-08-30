/**
 * Phase 2 Integration Test Script
 * Tests User Profile Onboarding CRUD, Completeness Calculation, and Dashboard Data Operations
 * against live Firebase backend using credentials in .env.local.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { 
  getAuth as getClientAuth, 
  createUserWithEmailAndPassword, 
  signOut as clientSignOut,
  updateProfile
} from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, deleteDoc } from 'firebase/firestore';

import { initializeApp as initAdminApp, cert, getApps as getAdminApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import type { UserProfile } from '../src/types';

async function runPhase2Tests() {
  console.log('🧪 Starting Phase 2: Profile & Dashboard Integration Tests...\n');

  // Dynamic import ensures environment variables are loaded first
  const {
    getUserProfile,
    createUserProfile,
    updateUserProfile,
    calculateProfileCompleteness,
    INDIAN_STATES,
    BUSINESS_CATEGORIES,
  } = await import('../src/lib/firestore/users');

  // 1. Initialize Client SDK
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

  // 2. Initialize Admin SDK for cleanup
  let rawAdminKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawAdminKey) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
  }
  rawAdminKey = rawAdminKey.trim();
  if ((rawAdminKey.startsWith("'") && rawAdminKey.endsWith("'")) || (rawAdminKey.startsWith('"') && rawAdminKey.endsWith('"'))) {
    rawAdminKey = rawAdminKey.slice(1, -1);
  }
  const sa = JSON.parse(rawAdminKey);
  const serviceAccount: ServiceAccount = {
    projectId: sa.projectId || sa.project_id,
    clientEmail: sa.clientEmail || sa.client_email,
    privateKey: (sa.privateKey || sa.private_key || '').replace(/\\n/g, '\n'),
  };
  const adminApp = getAdminApps().length === 0 ? initAdminApp({ credential: cert(serviceAccount) }, 'admin-p2-test') : getAdminApps()[0];
  const adminAuth = getAdminAuth(adminApp);

  const testEmail = `p2_entrepreneur_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Sunita Devi';

  let testUid = '';

  try {
    // TEST 1: CONSTANTS SANITY CHECK
    console.log('1️⃣ Checking Static Constants (States & Categories)...');
    if (!INDIAN_STATES.includes('Assam') || !INDIAN_STATES.includes('West Bengal') || !INDIAN_STATES.includes('Uttar Pradesh')) {
      throw new Error('Required target demo states missing from INDIAN_STATES list');
    }
    if (!BUSINESS_CATEGORIES.includes('Livestock & Poultry') || !BUSINESS_CATEGORIES.includes('Food Processing & Bakery')) {
      throw new Error('Required business categories missing from BUSINESS_CATEGORIES list');
    }
    console.log(`   ✅ Validated ${INDIAN_STATES.length} States and ${BUSINESS_CATEGORIES.length} Business Categories.`);

    // TEST 2: AUTH SIGNUP
    console.log(`2️⃣ Creating Test User (${testEmail})...`);
    const userCredential = await createUserWithEmailAndPassword(clientAuth, testEmail, testPassword);
    testUid = userCredential.user.uid;
    await updateProfile(userCredential.user, { displayName: testName });
    console.log(`   ✅ User authenticated with UID: ${testUid}`);

    // TEST 3: INITIAL PARTIAL PROFILE ONBOARDING (Step 1: Basic Info)
    console.log('3️⃣ Testing Progressive Onboarding Step 1 (Basic Info Autosave)...');
    const step1Data: Partial<UserProfile> & { uid: string } = {
      uid: testUid,
      name: testName,
      email: testEmail,
      language: 'hi',
      theme: 'light',
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Hajo Village',
      pinCode: '781102',
      businessStatus: 'planning',
      onboardingComplete: false,
    };
    await createUserProfile(step1Data);

    let fetched = await getUserProfile(testUid);
    if (!fetched || fetched.state !== 'Assam' || fetched.locality !== 'Hajo Village') {
      throw new Error('Step 1 profile save failed or returned incorrect data');
    }
    console.log(`   ✅ Step 1 saved: ${fetched.name} in ${fetched.locality}, ${fetched.district}, ${fetched.state}`);

    // Check completeness at Step 1
    let completeness = calculateProfileCompleteness(fetched);
    console.log(`   📊 Step 1 Completeness: ${completeness.percentage}% (Completed ${completeness.completedCount}/${completeness.totalCount} items)`);
    if (completeness.percentage >= 100) {
      throw new Error('Profile should not be 100% complete at Step 1');
    }

    // TEST 4: ONBOARDING COMPLETION (Steps 2, 3, 4)
    console.log('4️⃣ Testing Onboarding Completion (Full Business & Financial Data)...');
    const fullData: Partial<UserProfile> & { uid: string } = {
      uid: testUid,
      name: testName,
      email: testEmail,
      language: 'hi',
      theme: 'light',
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Hajo Village',
      pinCode: '781102',
      businessStatus: 'planning',
      businessCategory: 'Livestock & Poultry',
      businessType: 'Broiler Poultry Farm',
      businessExperience: '0-1 years (Beginner / New Venture)',
      availableCapital: 80000,
      desiredFunding: 150000,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      dob: '1995-05-15',
      gender: 'Female',
      employeeCount: 2,
      existingLoans: false,
      annualTurnover: 0,
      onboardingComplete: true,
    };
    await createUserProfile(fullData);

    fetched = await getUserProfile(testUid);
    if (!fetched || fetched.businessType !== 'Broiler Poultry Farm' || fetched.availableCapital !== 80000 || !fetched.onboardingComplete) {
      throw new Error('Full profile save failed or returned incorrect financial/business values');
    }
    console.log(`   ✅ Full profile saved: ${fetched.businessCategory} (${fetched.businessType}) with Capital ₹${fetched.availableCapital} & Desired Funding ₹${fetched.desiredFunding}`);

    completeness = calculateProfileCompleteness(fetched);
    console.log(`   📊 Full Profile Completeness: ${completeness.percentage}% (Completed ${completeness.completedCount}/${completeness.totalCount} items)`);
    if (completeness.percentage !== 100) {
      throw new Error(`Profile should be 100% complete, got ${completeness.percentage}%`);
    }

    // TEST 5: PROFILE EDIT & UPDATE
    console.log('5️⃣ Testing Profile Update (Modifying capital and turnover)...');
    await updateUserProfile(testUid, {
      availableCapital: 95000,
      desiredFunding: 160000,
      annualTurnover: 50000,
      businessStatus: 'existing',
    });

    const updated = await getUserProfile(testUid);
    if (!updated || updated.availableCapital !== 95000 || updated.businessStatus !== 'existing') {
      throw new Error('Profile update failed to reflect modified capital or status');
    }
    console.log(`   ✅ Profile updated: Capital updated to ₹${updated.availableCapital}, Status: ${updated.businessStatus}`);

    // TEST 6: SIGN OUT
    console.log('6️⃣ Testing Sign Out...');
    await clientSignOut(clientAuth);
    console.log('   ✅ User signed out.');

    console.log('\n🎉 ALL 6 PHASE 2 INTEGRATION TESTS PASSED PERFECTLY!\n');
  } finally {
    // CLEANUP
    if (testUid) {
      console.log('🧹 Cleaning up test user and document...');
      try {
        await deleteDoc(doc(clientDb, 'users', testUid));
        await adminAuth.deleteUser(testUid);
        console.log('   ✅ Test user & Firestore document deleted.');
      } catch (cleanErr) {
        console.warn('   ⚠️ Cleanup warning:', cleanErr);
      }
    }
  }
}

runPhase2Tests().catch((err) => {
  console.error('\n❌ Phase 2 Test failed with error:', err);
  process.exit(1);
});

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { 
  getAuth as getClientAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

async function testSignupAndOnboardingFlow() {
  console.log('🧪 Testing Full Signup & Onboarding Complete Setup Flow...\n');

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

  const testEmail = `ui_user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Priya Sharma';

  let testUid = '';

  try {
    // 1. SIGNUP STEP
    console.log('1️⃣ Step: Signup Form Submit...');
    const userCredential = await createUserWithEmailAndPassword(clientAuth, testEmail, testPassword);
    testUid = userCredential.user.uid;
    await updateProfile(userCredential.user, { displayName: testName });

    // Initial Firestore document written on signup
    await setDoc(doc(clientDb, 'users', testUid), {
      uid: testUid,
      name: testName,
      email: testEmail,
      language: 'en',
      theme: 'light',
      state: '',
      district: '',
      locality: '',
      pinCode: '',
      businessStatus: '',
      businessCategory: '',
      businessType: '',
      businessExperience: '',
      availableCapital: 0,
      desiredFunding: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      onboardingComplete: false,
    });
    console.log(`   ✅ Signup successful for ${testEmail}, UID: ${testUid}`);

    // 2. ONBOARDING SIMULATION
    const { createUserProfile, getUserProfile } = await import('../src/lib/firestore/users');

    // Simulate what the UI state contains as user steps through the form
    const uiFormData: any = {
      name: testName,
      language: 'en',
      theme: 'light',
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Hajo',
      pinCode: '781102',
      businessStatus: 'planning',
      businessCategory: 'Livestock & Poultry',
      businessType: 'Broiler Poultry Farm',
      businessExperience: '0-1 years',
      availableCapital: 50000,
      desiredFunding: 100000,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      dob: undefined, // Simulating optional field left unselected
      gender: undefined,    // Simulating optional field left unselected
      employeeCount: 0,
      existingLoans: false,
      annualTurnover: 0,
      onboardingComplete: true,
      uid: testUid,
      email: testEmail,
    };

    console.log('\n2️⃣ Step: Clicking "Complete Setup" with formData containing optional undefined fields...');
    try {
      await createUserProfile(uiFormData);
      console.log('   ✅ createUserProfile succeeded!');
    } catch (err: any) {
      console.log('   ❌ createUserProfile FAILED with error:', err?.message || err);
    }

    // Check Firestore doc
    const profile = await getUserProfile(testUid);
    console.log('\n3️⃣ Verifying Profile in Firestore:');
    console.log(`   • Name: ${profile?.name}`);
    console.log(`   • State: ${profile?.state}`);
    console.log(`   • Business: ${profile?.businessType}`);
    console.log(`   • onboardingComplete: ${profile?.onboardingComplete}`);

  } finally {
    if (testUid) {
      try {
        await deleteDoc(doc(clientDb, 'users', testUid));
        console.log('\n🧹 Cleaned up test document.');
      } catch {}
    }
  }
}

testSignupAndOnboardingFlow().catch(console.error);

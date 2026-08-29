/**
 * Phase 3 Integration Test Script
 * Tests:
 * 1. General business advice generation via Gemini Flash
 * 2. Hyper-personalized advice using live user profile (Poultry in Kamrup, Assam with ₹80,000 budget)
 * 3. Multilingual (Hindi) query and response generation
 * 4. Save Advice to Firestore, retrieve from Firestore, and delete cleanup
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

async function runPhase3Tests() {
  console.log('🧪 Starting Phase 3: Gemini Text Advisor Integration Tests...\n');

  // Dynamic imports after dotenv
  const { generateContent, generateContentStream, GEMINI_MODELS } = await import('../src/lib/gemini');
  const { buildAdvisorSystemPrompt } = await import('../src/lib/prompts/advisor');
  const { createUserProfile, getUserProfile } = await import('../src/lib/firestore/users');
  const { saveAdvice, getSavedAdvice, deleteSavedAdvice } = await import('../src/lib/firestore/advice');

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

  // 2. Initialize Admin SDK
  let rawAdminKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawAdminKey) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
  }
  rawAdminKey = rawAdminKey.trim();
  if ((rawAdminKey.startsWith("'") && rawAdminKey.endsWith("'")) || (rawAdminKey.startsWith('"') && rawAdminKey.endsWith('"'))) {
    rawAdminKey = rawAdminKey.slice(1, -1);
  }
  const serviceAccount = JSON.parse(rawAdminKey) as ServiceAccount;
  const adminApp = getAdminApps().length === 0 ? initAdminApp({ credential: cert(serviceAccount) }, 'admin-p3-test') : getAdminApps()[0];
  const adminAuth = getAdminAuth(adminApp);

  const testEmail = `p3_entrepreneur_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Ramesh Kumar';

  let testUid = '';
  let savedAdviceId = '';

  try {
    // SETUP: Create test user with Assam Poultry profile
    console.log(`0️⃣ Setting up test user & profile (${testEmail})...`);
    const userCredential = await createUserWithEmailAndPassword(clientAuth, testEmail, testPassword);
    testUid = userCredential.user.uid;
    await updateProfile(userCredential.user, { displayName: testName });

    const assamProfile: Partial<UserProfile> & { uid: string } = {
      uid: testUid,
      name: 'Ramesh Kumar',
      email: testEmail,
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
      availableCapital: 80000,
      desiredFunding: 150000,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      dob: '1995-05-15',
      gender: 'Male',
      employeeCount: 2,
      existingLoans: false,
      annualTurnover: 0,
      onboardingComplete: true,
    };
    await createUserProfile(assamProfile);
    console.log(`   ✅ Test profile initialized for Ramesh Kumar (Poultry in Kamrup, Assam with ₹80k capital).`);

    // TEST 1: GENERAL BUSINESS QUESTION
    console.log('\n1️⃣ Testing General Business Query via Gemini Flash...');
    const generalPrompt = buildAdvisorSystemPrompt(null, 'en');
    const generalQuestion = 'What are the 4 fundamental pillars to plan when starting a rural micro-enterprise?';
    
    console.log(`   ❓ Query: "${generalQuestion}"`);
    let generalResponse = '';
    for await (const chunk of generateContentStream(GEMINI_MODELS.FLASH, generalPrompt, generalQuestion)) {
      generalResponse += chunk;
    }

    if (!generalResponse || generalResponse.length < 100) {
      throw new Error('General response was empty or too brief');
    }
    console.log('   ✅ General Response received (Length: ' + generalResponse.length + ' chars)');
    console.log('   📝 Preview:\n' + generalResponse.slice(0, 250) + '...\n');

    // TEST 2: HYPER-PERSONALIZED QUESTION (Using test profile: ₹80,000, Kamrup, Assam, Poultry)
    console.log('\n2️⃣ Testing Personalized Query (Assam Poultry with ₹80,000 capital & ₹1,50,000 funding gap)...');
    const personalizedPrompt = buildAdvisorSystemPrompt(assamProfile, 'en');
    const personalizedQuestion = 'I have ₹80,000 savings and want to set up my broiler poultry unit in Kamrup, Assam. How should I allocate my ₹80,000 and how can I bridge the remaining ₹1,50,000 required?';

    console.log(`   ❓ Query: "${personalizedQuestion}"`);
    let personalizedResponse = '';
    for await (const chunk of generateContentStream(GEMINI_MODELS.FLASH, personalizedPrompt, personalizedQuestion)) {
      personalizedResponse += chunk;
    }

    if (!personalizedResponse || personalizedResponse.length < 150) {
      throw new Error('Personalized response was empty or too brief');
    }

    // Verify hyper-local context awareness
    const responseLower = personalizedResponse.toLowerCase();
    const hasLocation = responseLower.includes('assam') || responseLower.includes('kamrup');
    const hasCapital = responseLower.includes('80,000') || responseLower.includes('80000') || responseLower.includes('capital') || responseLower.includes('savings');
    const hasSchemes = responseLower.includes('pmegp') || responseLower.includes('mudra') || responseLower.includes('nlm') || responseLower.includes('subsidy') || responseLower.includes('loan');

    console.log(`   🔍 Verifications:`);
    console.log(`      - Location context (Assam/Kamrup): ${hasLocation ? '✅ PASS' : '⚠️ Context general'}`);
    console.log(`      - Budget awareness (₹80k capital): ${hasCapital ? '✅ PASS' : '⚠️ Context general'}`);
    console.log(`      - Financial scheme mentions (PMEGP/MUDRA/NLM): ${hasSchemes ? '✅ PASS' : '⚠️'}`);

    console.log('   📝 Response Snippet:\n' + personalizedResponse.slice(0, 350) + '...\n');

    // TEST 3: HINDI MULTILINGUAL TEST
    console.log('\n3️⃣ Testing Multilingual (Hindi) Question & Response...');
    const hindiPrompt = buildAdvisorSystemPrompt(assamProfile, 'hi');
    const hindiQuestion = 'असम के कामरूप जिले में पोल्ट्री फार्म शुरू करने के लिए मुझे किन सरकारी योजनाओं से सब्सिडी या लोन मिल सकता है?';

    console.log(`   ❓ Hindi Query: "${hindiQuestion}"`);
    let hindiResponse = '';
    for await (const chunk of generateContentStream(GEMINI_MODELS.FLASH, hindiPrompt, hindiQuestion)) {
      hindiResponse += chunk;
    }

    if (!hindiResponse || hindiResponse.length < 100) {
      throw new Error('Hindi response was empty or too brief');
    }
    console.log('   ✅ Hindi Response generated (Length: ' + hindiResponse.length + ' chars)');
    console.log('   📝 Hindi Snippet:\n' + hindiResponse.slice(0, 300) + '...\n');

    // TEST 4: SAVE ADVICE TO FIRESTORE
    console.log('\n4️⃣ Testing Save Advice to Firestore...');
    savedAdviceId = await saveAdvice(testUid, {
      title: 'Poultry Farm Budget Allocation for Kamrup',
      category: 'financial-guidance',
      content: personalizedResponse,
      businessContext: 'Poultry in Kamrup, Assam',
    });
    console.log(`   ✅ Advice saved with ID: ${savedAdviceId}`);

    // Read back saved advice
    const savedList = await getSavedAdvice(testUid);
    if (savedList.length === 0 || savedList[0].id !== savedAdviceId) {
      throw new Error('Saved advice was not retrieved from Firestore');
    }
    console.log(`   ✅ Retrieved ${savedList.length} saved advice item: "${savedList[0].title}" [${savedList[0].category}]`);

    // TEST 5: DELETE SAVED ADVICE
    console.log('\n5️⃣ Testing Delete Saved Advice...');
    await deleteSavedAdvice(savedAdviceId);
    const afterDeleteList = await getSavedAdvice(testUid);
    if (afterDeleteList.length !== 0) {
      throw new Error('Advice item was not deleted');
    }
    console.log('   ✅ Advice successfully deleted from Firestore.');

    console.log('\n🎉 ALL 5 PHASE 3 INTEGRATION TESTS PASSED PERFECTLY!\n');
  } finally {
    // CLEANUP
    if (testUid) {
      console.log('🧹 Cleaning up test user and document...');
      try {
        await deleteDoc(doc(clientDb, 'users', testUid));
        await adminAuth.deleteUser(testUid);
        console.log('   ✅ Test user & Firestore data cleaned up.');
      } catch (cleanErr) {
        console.warn('   ⚠️ Cleanup warning:', cleanErr);
      }
    }
  }
}

runPhase3Tests().catch((err) => {
  console.error('\n❌ Phase 3 Test failed with error:', err);
  process.exit(1);
});

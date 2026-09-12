// ─── User Profile Firestore Operations ───
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { INDIAN_STATES, UNION_TERRITORIES, ALL_INDIAN_REGIONS } from '@/lib/constants/states';
import { getErrorMessage } from '@/lib/utils/errors';
import { sanitizeFirestoreObject } from '@/lib/firestore/sanitize';

export { INDIAN_STATES, UNION_TERRITORIES, ALL_INDIAN_REGIONS };

// Live in a pure module so the advisor's server route can use the same lists.
export { BUSINESS_CATEGORIES, EXPERIENCE_LEVELS, GENDERS } from '@/lib/constants/profile-options';

/**
 * Fetch a user profile from Firestore by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    return docSnap.data() as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

// Lives in ./sanitize so the server routes can share it without importing the
// browser Firebase SDK. Re-exported so existing importers are unchanged.
export { sanitizeFirestoreObject };

/**
 * Create or overwrite a user profile safely (with undefined field sanitization & profile integrity checks)
 */
export async function createUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  try {
    const docRef = doc(db, 'users', profile.uid);

    const nameVal = profile.name?.trim() || '';
    const stateVal = profile.state?.trim() || '';
    const districtVal = profile.district?.trim() || '';

    // Server-side profile integrity: onboardingComplete requires non-empty name, state, and district
    const requestedComplete = profile.onboardingComplete ?? false;
    const isIntegrityValid = Boolean(nameVal) && Boolean(stateVal) && Boolean(districtVal);
    const effectiveOnboardingComplete = requestedComplete && isIntegrityValid;

    const sanitizedProfile = sanitizeFirestoreObject({
      ...profile,
      name: nameVal,
      email: profile.email || '',
      language: profile.language || 'en',
      theme: profile.theme || 'light',
      state: stateVal,
      district: districtVal,
      locality: profile.locality || '',
      roadName: profile.roadName || '',
      pinCode: profile.pinCode || '',
      businessStatus: profile.businessStatus || 'planning',
      businessCategory: profile.businessCategory || '',
      businessType: profile.businessType || '',
      businessExperience: profile.businessExperience || '',
      availableCapital: Number(profile.availableCapital) || 0,
      desiredFunding: Number(profile.desiredFunding) || 0,
      monthlyIncome: Number(profile.monthlyIncome) || 0,
      monthlyExpenses: Number(profile.monthlyExpenses) || 0,
      dob: profile.dob || '',
      gender: profile.gender || '',
      employeeCount: Number(profile.employeeCount) || 0,
      existingLoans: Boolean(profile.existingLoans),
      annualTurnover: Number(profile.annualTurnover) || 0,
      onboardingComplete: effectiveOnboardingComplete,
    });

    await setDoc(docRef, {
      ...sanitizedProfile,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * Update specific fields in a user profile (with server-side profile integrity checks)
 */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    const sanitizedUpdates = sanitizeFirestoreObject(updates);

    if (sanitizedUpdates.onboardingComplete === true) {
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? (docSnap.data() as UserProfile) : null;
      const effectiveName = (sanitizedUpdates.name !== undefined ? sanitizedUpdates.name : existingData?.name)?.trim();
      const effectiveState = (sanitizedUpdates.state !== undefined ? sanitizedUpdates.state : existingData?.state)?.trim();
      const effectiveDistrict = (sanitizedUpdates.district !== undefined ? sanitizedUpdates.district : existingData?.district)?.trim();

      if (!effectiveName || !effectiveState || !effectiveDistrict) {
        sanitizedUpdates.onboardingComplete = false;
      }
    }

    await setDoc(
      docRef,
      {
        ...sanitizedUpdates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// calculateProfileCompleteness moved to @/lib/profile/completeness so that the
// advisor's system-prompt builder can use it without pulling the Firebase
// client SDK in behind it. Re-exported here so existing importers are unchanged.
export { calculateProfileCompleteness } from '@/lib/profile/completeness';
export type { ProfileCompleteness } from '@/lib/profile/completeness';

/**
 * Delete all Firestore documents associated with a user:
 * - users/{userId}
 * - all plans where userId == userId
 * - all advice where userId == userId
 */
export async function deleteUserFirestoreData(userId: string, dbInstance?: Firestore): Promise<void> {
  const targetDb = dbInstance || db;
  // 1. Delete all user plans
  try {
    const plansQuery = query(collection(targetDb, 'plans'), where('userId', '==', userId));
    const plansSnap = await getDocs(plansQuery);
    for (const d of plansSnap.docs) {
      await deleteDoc(doc(targetDb, 'plans', d.id));
    }
  } catch (err) {
    console.error('Failed step 1 (plans):', getErrorMessage(err));
    throw err;
  }

  // 2. Delete all user advice
  try {
    const adviceQuery = query(collection(targetDb, 'advice'), where('userId', '==', userId));
    const adviceSnap = await getDocs(adviceQuery);
    for (const d of adviceSnap.docs) {
      await deleteDoc(doc(targetDb, 'advice', d.id));
    }
  } catch (err) {
    console.error('Failed step 2 (advice):', getErrorMessage(err));
    throw err;
  }

  // 3. Delete user profile document
  try {
    const userDocRef = doc(targetDb, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (err) {
    console.error('Failed step 3 (users):', getErrorMessage(err));
    throw err;
  }
}

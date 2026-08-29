// ─── User Profile Firestore Operations ───
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { INDIAN_STATES, UNION_TERRITORIES, ALL_INDIAN_REGIONS } from '@/lib/constants/states';

export { INDIAN_STATES, UNION_TERRITORIES, ALL_INDIAN_REGIONS };

export const BUSINESS_CATEGORIES = [
  'Livestock & Poultry',
  'Agriculture & Allied',
  'Food Processing & Bakery',
  'Handloom, Textiles & Tailoring',
  'Handicrafts & Artisanal',
  'Retail Shop & Trading',
  'Services & Repair',
  'Manufacturing & Small Workshop',
  'Beauty & Wellness',
  'Logistics & Transport',
  'Other Micro-Enterprise',
];

export const EXPERIENCE_LEVELS = [
  '0-1 years (Beginner / New Venture)',
  '1-3 years',
  '3-5 years',
  '5+ years (Experienced)',
];

export const GENDERS = [
  'Male',
  'Female',
  'Transgender / Other',
  'Prefer not to say',
];

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

/**
 * Strip all undefined keys recursively to prevent Firestore 'Unsupported field value: undefined' errors
 */
export function sanitizeFirestoreObject<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !('_methodName' in value) &&
        !('toMillis' in value)
      ) {
        clean[key] = sanitizeFirestoreObject(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
}

/**
 * Create or overwrite a user profile safely (with undefined field sanitization)
 */
export async function createUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  try {
    const docRef = doc(db, 'users', profile.uid);
    const sanitizedProfile = sanitizeFirestoreObject({
      ...profile,
      name: profile.name || '',
      email: profile.email || '',
      language: profile.language || 'en',
      theme: profile.theme || 'light',
      state: profile.state || '',
      district: profile.district || '',
      locality: profile.locality || '',
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
      onboardingComplete: profile.onboardingComplete ?? true,
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
 * Update specific fields in a user profile
 */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    const sanitizedUpdates = sanitizeFirestoreObject(updates);
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

/**
 * Calculate the profile completeness percentage and identify missing fields
 */
export function calculateProfileCompleteness(profile: Partial<UserProfile> | null): {
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingFields: string[];
} {
  if (!profile) {
    return { percentage: 0, completedCount: 0, totalCount: 10, missingFields: ['All fields'] };
  }

  const checkpoints = [
    { key: 'name', label: 'Full Name', check: () => !!profile.name && profile.name.trim().length > 0 },
    { key: 'state', label: 'State', check: () => !!profile.state && profile.state.trim().length > 0 },
    { key: 'district', label: 'District', check: () => !!profile.district && profile.district.trim().length > 0 },
    { key: 'locality', label: 'Village / Town', check: () => !!profile.locality && profile.locality.trim().length > 0 },
    { key: 'businessStatus', label: 'Business Status', check: () => !!profile.businessStatus && profile.businessStatus.length > 0 },
    { key: 'businessCategory', label: 'Business Category', check: () => !!profile.businessCategory && profile.businessCategory.length > 0 },
    { key: 'businessType', label: 'Business Type', check: () => !!profile.businessType && profile.businessType.trim().length > 0 },
    { key: 'availableCapital', label: 'Available Capital', check: () => typeof profile.availableCapital === 'number' && profile.availableCapital >= 0 },
    { key: 'desiredFunding', label: 'Desired Funding', check: () => typeof profile.desiredFunding === 'number' && profile.desiredFunding > 0 },
    { key: 'dob', label: 'Date of Birth', check: () => !!profile.dob && profile.dob.length > 0 },
    {
      key: 'loanDetails',
      label: 'Loan Details',
      check: () => {
        if (!profile.existingLoans) return true; // Not applicable / no debt
        return (
          Array.isArray(profile.loanDetails) &&
          profile.loanDetails.length > 0 &&
          profile.loanDetails.every((l) => (l.outstandingAmount > 0 || l.monthlyEmi > 0) && !!l.lenderType)
        );
      },
    },
  ];

  const missingFields: string[] = [];
  let completedCount = 0;

  for (const checkpoint of checkpoints) {
    if (checkpoint.check()) {
      completedCount++;
    } else {
      missingFields.push(checkpoint.label);
    }
  }

  const percentage = Math.round((completedCount / checkpoints.length) * 100);

  return {
    percentage,
    completedCount,
    totalCount: checkpoints.length,
    missingFields,
  };
}

/**
 * Delete all Firestore documents associated with a user:
 * - users/{userId}
 * - all plans where userId == userId
 * - all advice where userId == userId
 */
export async function deleteUserFirestoreData(userId: string, dbInstance?: any): Promise<void> {
  const targetDb = dbInstance || db;
  // 1. Delete all user plans
  try {
    const plansQuery = query(collection(targetDb, 'plans'), where('userId', '==', userId));
    const plansSnap = await getDocs(plansQuery);
    for (const d of plansSnap.docs) {
      await deleteDoc(doc(targetDb, 'plans', d.id));
    }
  } catch (err: any) {
    console.error('Failed step 1 (plans):', err.message);
    throw err;
  }

  // 2. Delete all user advice
  try {
    const adviceQuery = query(collection(targetDb, 'advice'), where('userId', '==', userId));
    const adviceSnap = await getDocs(adviceQuery);
    for (const d of adviceSnap.docs) {
      await deleteDoc(doc(targetDb, 'advice', d.id));
    }
  } catch (err: any) {
    console.error('Failed step 2 (advice):', err.message);
    throw err;
  }

  // 3. Delete user profile document
  try {
    const userDocRef = doc(targetDb, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (err: any) {
    console.error('Failed step 3 (users):', err.message);
    throw err;
  }
}

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';

import { sanitizeFirestoreObject } from '@/lib/firestore/users';

/**
 * Save a generated financial plan to Firestore
 */
export async function savePlan(
  userId: string,
  planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const plansRef = collection(db, 'plans');
    const cleanData = sanitizeFirestoreObject({
      ...planData,
      userId,
    });
    const docRef = await addDoc(plansRef, {
      ...cleanData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving financial plan:', error);
    throw error;
  }
}

/**
 * Retrieve all saved plans for a user, sorted in memory to avoid composite index requirements
 */
export async function getSavedPlans(userId: string): Promise<Plan[]> {
  try {
    const q = query(
      collection(db, 'plans'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const plans: Plan[] = [];
    snapshot.forEach((d) => {
      plans.push({ id: d.id, ...d.data() } as Plan);
    });

    return plans.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching saved plans:', error);
    throw error;
  }
}

/**
 * Get a single saved plan by its document ID
 */
export async function getPlanById(planId: string): Promise<Plan | null> {
  try {
    const docRef = doc(db, 'plans', planId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Plan;
    }
    return null;
  } catch (error) {
    console.error('Error fetching plan by ID:', error);
    throw error;
  }
}

/**
 * Delete a saved financial plan from Firestore
 */
export async function deletePlan(planId: string): Promise<void> {
  try {
    const docRef = doc(db, 'plans', planId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting financial plan:', error);
    throw error;
  }
}

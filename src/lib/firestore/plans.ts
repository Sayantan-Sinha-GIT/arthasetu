import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  type DocumentSnapshot,
  limit,
  startAfter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';
import { sanitizeFirestoreObject } from '@/lib/firestore/users';

/**
 * Save a generated financial plan to Firestore.
 * If planId is provided, uses deterministic ID with setDoc to prevent duplicates.
 */
export async function savePlan(
  userId: string,
  planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>,
  planId?: string
): Promise<string> {
  try {
    const cleanData = sanitizeFirestoreObject({
      ...planData,
      userId,
    });

    if (planId) {
      const docRef = doc(db, 'plans', planId);
      await setDoc(
        docRef,
        {
          ...cleanData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return planId;
    }

    const plansRef = collection(db, 'plans');
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
 * Retrieve all saved plans for a user, sorted in memory
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
 * Paged retrieval of saved plans for a user.
 */
export async function getSavedPlansPaged(
  userId: string,
  pageSize = 20,
  lastVisibleDoc?: DocumentSnapshot
): Promise<{ plans: Plan[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
  try {
    let q = query(
      collection(db, 'plans'),
      where('userId', '==', userId),
      limit(pageSize + 1)
    );

    if (lastVisibleDoc) {
      q = query(
        collection(db, 'plans'),
        where('userId', '==', userId),
        startAfter(lastVisibleDoc),
        limit(pageSize + 1)
      );
    }

    const snapshot = await getDocs(q);
    const rawDocs = snapshot.docs;
    const hasMore = rawDocs.length > pageSize;
    const pageDocs = hasMore ? rawDocs.slice(0, pageSize) : rawDocs;

    const plans: Plan[] = pageDocs.map((d) => ({ id: d.id, ...d.data() } as Plan));
    plans.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

    return { plans, lastDoc, hasMore };
  } catch (error) {
    console.error('Error fetching paged saved plans:', error);
    return { plans: [], lastDoc: null, hasMore: false };
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

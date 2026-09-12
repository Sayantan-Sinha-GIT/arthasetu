// ─── Saved Advice Firestore Operations ───
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Advice } from '@/types';

/**
 * Save an AI advisor response snippet to Firestore
 */
export async function saveAdvice(
  userId: string,
  item: {
    title: string;
    category: string;
    content: string;
    businessContext: string;
  }
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'advice'), {
      userId,
      title: item.title || 'Advisor Recommendation',
      category: item.category || 'general',
      content: item.content,
      businessContext: item.businessContext || '',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving advice:', error);
    throw error;
  }
}

/**
 * Fetch all saved advice items for a specific user
 */
export async function getSavedAdvice(userId: string): Promise<Advice[]> {
  try {
    const q = query(
      collection(db, 'advice'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const list: Advice[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Advice);
    });
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching saved advice:', error);
    throw error;
  }
}

/**
 * Delete a saved advice document by ID
 */
export async function deleteSavedAdvice(adviceId: string): Promise<void> {
  try {
    const docRef = doc(db, 'advice', adviceId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting advice:', error);
    throw error;
  }
}

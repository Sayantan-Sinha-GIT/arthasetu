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
  type DocumentSnapshot,
  limit,
  startAfter,
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
 * Fetch paged saved advice items for a user
 */
export async function getSavedAdvicePaged(
  userId: string,
  pageSize = 20,
  lastVisibleDoc?: DocumentSnapshot
): Promise<{ adviceList: Advice[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
  try {
    let q = query(
      collection(db, 'advice'),
      where('userId', '==', userId),
      limit(pageSize + 1)
    );

    if (lastVisibleDoc) {
      q = query(
        collection(db, 'advice'),
        where('userId', '==', userId),
        startAfter(lastVisibleDoc),
        limit(pageSize + 1)
      );
    }

    const snapshot = await getDocs(q);
    const rawDocs = snapshot.docs;
    const hasMore = rawDocs.length > pageSize;
    const pageDocs = hasMore ? rawDocs.slice(0, pageSize) : rawDocs;

    const adviceList: Advice[] = pageDocs.map((d) => ({ id: d.id, ...d.data() } as Advice));
    adviceList.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

    return { adviceList, lastDoc, hasMore };
  } catch (error) {
    console.error('Error fetching paged saved advice:', error);
    return { adviceList: [], lastDoc: null, hasMore: false };
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

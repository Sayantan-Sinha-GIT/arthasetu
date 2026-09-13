import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SEED_SCHEMES } from '@/lib/schemes/seed-data';
import type { Scheme } from '@/types';

/**
 * Fetch all active schemes from Firestore.
 * If collection is empty, returns the verified local SEED_SCHEMES dataset.
 */
export async function getAllSchemes(): Promise<Scheme[]> {
  try {
    const q = query(
      collection(db, 'schemes'),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list: Scheme[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Scheme);
      });
      return list;
    }
  } catch (err) {
    console.warn('Could not read schemes from Firestore, using local verified dataset:', err);
  }
  return SEED_SCHEMES;
}

/**
 * Fetch all Central schemes plus State schemes matching the requested state.
 */
export async function getSchemesForState(state?: string): Promise<Scheme[]> {
  const all = await getAllSchemes();
  if (!state) return all;

  const normalizedState = state.trim().toLowerCase();
  return all.filter((s) => {
    if (s.governmentLevel === 'central') return true;
    return s.state?.toLowerCase() === normalizedState;
  });
}

/**
 * Fetch a single scheme by its ID slug (e.g. 'central-pmegp', 'assam-cmaaa')
 */
export async function getSchemeById(
  schemeId: string,
  // The admin console must see the live record only: with the bundled fallback, a
  // flagship scheme the admin had deleted still opened in the edit page, and saving
  // it there quietly brought it back.
  { fallbackToSeed = true }: { fallbackToSeed?: boolean } = {}
): Promise<Scheme | null> {
  try {
    const docRef = doc(db, 'schemes', schemeId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Scheme;
    }
  } catch (err) {
    console.warn('Error reading scheme by id from Firestore:', err);
    if (!fallbackToSeed) throw err;
  }
  if (!fallbackToSeed) return null;

  // Fallback to local verified seed dataset
  const localMatch = SEED_SCHEMES.find((s) => s.id === schemeId);
  return localMatch || null;
}

/**
 * Seed all verified schemes into Firestore
 */
export async function seedSchemesToFirestore(): Promise<{ count: number }> {
  try {
    const batch = writeBatch(db);
    for (const scheme of SEED_SCHEMES) {
      const docRef = doc(db, 'schemes', scheme.id);
      batch.set(
        docRef,
        {
          ...scheme,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
    return { count: SEED_SCHEMES.length };
  } catch (error) {
    console.error('Error seeding schemes to Firestore:', error);
    throw error;
  }
}

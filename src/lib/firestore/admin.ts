import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeFirestoreObject } from '@/lib/firestore/users';
import type { Scheme, SchemeUpdateRecord } from '@/types';

/**
 * Propose an AI-drafted or admin-created update for human review
 */
export async function proposeSchemeUpdate(
  record: Omit<SchemeUpdateRecord, 'id' | 'timestamp'>
): Promise<string> {
  try {
    const cleanData = sanitizeFirestoreObject({
      ...record,
      status: 'pending',
    });

    const docRef = await addDoc(collection(db, 'scheme_updates'), {
      ...cleanData,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error proposing scheme update:', error);
    throw error;
  }
}

/**
 * Get all pending scheme update proposals
 */
export async function getPendingUpdates(): Promise<SchemeUpdateRecord[]> {
  try {
    const q = query(
      collection(db, 'scheme_updates'),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    const list: SchemeUpdateRecord[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as SchemeUpdateRecord);
    });
    return list.sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching pending updates:', error);
    return [];
  }
}

/**
 * Get complete scheme update audit history
 */
export async function getAllUpdateHistory(): Promise<SchemeUpdateRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, 'scheme_updates'));
    const list: SchemeUpdateRecord[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as SchemeUpdateRecord);
    });
    return list.sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching scheme update history:', error);
    return [];
  }
}

function setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Approve a proposed update and write changes to the live scheme record
 */
export async function approveSchemeUpdate(
  updateId: string,
  adminId: string,
  adminEmail: string
): Promise<void> {
  try {
    const updateDocRef = doc(db, 'scheme_updates', updateId);
    const updateSnap = await getDoc(updateDocRef);
    if (!updateSnap.exists()) {
      throw new Error('Scheme update proposal not found');
    }

    const updateData = updateSnap.data() as SchemeUpdateRecord;
    const schemeId = updateData.schemeId;
    const schemeDocRef = doc(db, 'schemes', schemeId);

    // Fetch existing live scheme to merge changes safely
    const schemeSnap = await getDoc(schemeDocRef);
    const todayIso = new Date().toISOString().split('T')[0];

    if (schemeSnap.exists()) {
      const existingData = schemeSnap.data() as Scheme;
      const merged = JSON.parse(JSON.stringify(existingData));

      for (const [key, valueObj] of Object.entries(updateData.proposedChanges)) {
        setNestedProperty(merged, key, valueObj.new);
      }

      merged.lastVerifiedDate = todayIso;
      const cleanMerged = sanitizeFirestoreObject({
        ...merged,
        updatedAt: serverTimestamp(),
      });

      await setDoc(schemeDocRef, cleanMerged, { merge: true });
    } else {
      const newFields: Record<string, unknown> = {};
      for (const [key, valueObj] of Object.entries(updateData.proposedChanges)) {
        setNestedProperty(newFields, key, valueObj.new);
      }
      newFields.id = schemeId;
      newFields.lastVerifiedDate = todayIso;
      const cleanNew = sanitizeFirestoreObject({
        ...newFields,
        updatedAt: serverTimestamp(),
      });
      await setDoc(schemeDocRef, cleanNew, { merge: true });
    }

    // 2. Mark update proposal as approved in audit log
    await updateDoc(updateDocRef, {
      status: 'approved',
      approvedBy: adminEmail,
      approvedAt: serverTimestamp(),
      publishedChanges: updateData.proposedChanges,
    });
  } catch (error) {
    console.error('Error approving scheme update:', error);
    throw error;
  }
}

/**
 * Reject a proposed update leaving the live scheme 100% UNTOUCHED
 */
export async function rejectSchemeUpdate(
  updateId: string,
  reason: string = 'Rejected by administrator during verification'
): Promise<void> {
  try {
    const updateDocRef = doc(db, 'scheme_updates', updateId);
    await updateDoc(updateDocRef, {
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error rejecting scheme update:', error);
    throw error;
  }
}

/**
 * Directly create or update a live scheme in Firestore
 */
export async function createOrUpdateLiveScheme(scheme: Scheme): Promise<void> {
  try {
    const docRef = doc(db, 'schemes', scheme.id);
    const cleanData = sanitizeFirestoreObject({
      ...scheme,
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    console.error('Error saving live scheme:', error);
    throw error;
  }
}

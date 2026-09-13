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
  writeBatch,
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

    // A proposal for a deleted scheme used to recreate it from the changed fields
    // alone: a nameless, half-empty record.
    if (!schemeSnap.exists()) {
      throw new Error('The scheme for this proposal no longer exists, so it cannot be applied. Reject the proposal instead.');
    }

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

export interface ReviewedSchemeUpdate {
  schemeId: string;
  schemeName: string;
  adminId: string;
  adminEmail: string;
  sourceUrl: string;
  source?: 'text' | 'page' | 'pdf';
  summary: string;
  /** What the AI proposed, with the notice's evidence. */
  aiChanges: Record<string, { old: unknown; new: unknown; evidence?: string }>;
  /** What the administrator approved, after any edits. Only these reach the scheme. */
  finalChanges: Record<string, { old: unknown; new: unknown }>;
  editedByAdmin: boolean;
  /** Set when approving a proposal from the review queue. */
  pendingUpdateId?: string;
}

/**
 * Publish an administrator-reviewed scheme update as one atomic write: the
 * approved values go to the live scheme, and the review (what the AI proposed,
 * what was published, who approved it) goes to the audit log. Both land or
 * neither does, so the directory never changes without a matching record.
 */
export async function publishReviewedSchemeUpdate(input: ReviewedSchemeUpdate): Promise<string> {
  const paths = Object.keys(input.finalChanges);
  if (paths.length === 0) {
    throw new Error('There are no changes to publish.');
  }

  const batch = writeBatch(db);

  // Dotted paths ("benefits.maxSubsidyPercent") update only those nested fields,
  // leaving the rest of the scheme record exactly as it was.
  const fieldUpdates: Record<string, unknown> = {};
  for (const path of paths) {
    fieldUpdates[path] = input.finalChanges[path].new;
  }
  batch.update(doc(db, 'schemes', input.schemeId), {
    ...fieldUpdates,
    lastVerifiedDate: new Date().toISOString().split('T')[0],
    updatedAt: serverTimestamp(),
  });

  const publishedChanges = sanitizeFirestoreObject(input.finalChanges);
  if (input.pendingUpdateId) {
    // A queued proposal keeps the changes it was proposed with; the review is added to it.
    const updateRef = doc(db, 'scheme_updates', input.pendingUpdateId);
    batch.update(updateRef, {
      status: 'approved',
      approvedBy: input.adminEmail,
      approvedAt: serverTimestamp(),
      publishedChanges,
      editedByAdmin: input.editedByAdmin,
    });
    await batch.commit();
    return updateRef.id;
  }

  const updateRef = doc(collection(db, 'scheme_updates'));
  batch.set(updateRef, {
    ...sanitizeFirestoreObject({
      schemeId: input.schemeId,
      schemeName: input.schemeName,
      adminId: input.adminId,
      adminEmail: input.adminEmail,
      sourceUrl: input.sourceUrl,
      source: input.source,
      summaryOfChanges: input.summary,
      proposedChanges: input.aiChanges,
      editedByAdmin: input.editedByAdmin,
      approvedBy: input.adminEmail,
      status: 'approved',
    }),
    publishedChanges,
    timestamp: serverTimestamp(),
    approvedAt: serverTimestamp(),
  });
  await batch.commit();
  return updateRef.id;
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

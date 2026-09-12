// ─── Server-side profile, plan and scheme reads/writes (firebase-admin) ───
// NEVER import this from client components.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { sanitizeFirestoreObject } from '@/lib/firestore/sanitize';
import { SEED_SCHEMES } from '@/lib/schemes/seed-data';
import { getErrorMessage } from '@/lib/utils/errors';
import type { CalculatedValues, Plan, PlanInputs, Scheme, UserProfile } from '@/types';

/**
 * Fields no request may set on a profile. Identity belongs to the verified
 * sign-in, and the timestamps to the server. A browser that loaded the profile
 * sends its Timestamps back as plain JSON maps, which would otherwise overwrite
 * the real createdAt with a meaningless object.
 */
export const PROTECTED_PROFILE_FIELDS = ['uid', 'email', 'createdAt', 'updatedAt'] as const;

export function cleanProfileUpdates(updates: unknown): Record<string, unknown> {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return {};
  const copy: Record<string, unknown> = { ...(updates as Record<string, unknown>) };
  for (const field of PROTECTED_PROFILE_FIELDS) delete copy[field];
  return sanitizeFirestoreObject(copy);
}

/**
 * Merges updates into users/{uid}. Same integrity rule as the browser version it
 * replaces: onboarding cannot be marked complete without a name, state and district.
 */
export async function updateUserProfileAsAdmin(
  uid: string,
  updates: unknown,
  db: Firestore = adminDb
): Promise<void> {
  if (!uid) throw new Error('Missing user id');
  const clean = cleanProfileUpdates(updates);
  const ref = db.collection('users').doc(uid);

  if (clean.onboardingComplete === true) {
    const snap = await ref.get();
    const existing = (snap.exists ? snap.data() : {}) as Partial<UserProfile>;
    const effective = (field: 'name' | 'state' | 'district') =>
      String((clean[field] !== undefined ? clean[field] : existing[field]) ?? '').trim();
    if (!effective('name') || !effective('state') || !effective('district')) {
      clean.onboardingComplete = false;
    }
  }

  await ref.set({ ...clean, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

/** The stored profile, for routes that must not rely on a copy sent by the browser. */
export async function loadUserProfileAsAdmin(
  uid: string,
  db: Firestore = adminDb
): Promise<Partial<UserProfile> | null> {
  if (!uid) return null;
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return null;
  return { ...(snap.data() as Partial<UserProfile>), uid };
}

/** Stores a plan under the verified user, whatever userId the plan data claims. */
export async function savePlanAsAdmin(
  uid: string,
  planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>,
  db: Firestore = adminDb
): Promise<string> {
  if (!uid) throw new Error('Missing user id');
  const clean = sanitizeFirestoreObject({
    ...(planData as unknown as Record<string, unknown>),
    userId: uid,
  });
  const ref = await db.collection('plans').add({
    ...clean,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/**
 * The live scheme directory, so what the admin publishes is what the advisor
 * matches against. Falls back to the bundled dataset if Firestore is empty or
 * unreachable, exactly as the browser-side getAllSchemes does.
 */
export async function loadLiveSchemes(db: Firestore = adminDb): Promise<Scheme[]> {
  try {
    const snap = await db.collection('schemes').where('isActive', '==', true).get();
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scheme);
    }
  } catch (err) {
    console.warn('Could not read live schemes, using the bundled dataset:', getErrorMessage(err));
  }
  return SEED_SCHEMES;
}

export interface StoredCalculation {
  inputs: PlanInputs;
  calculatedValues: CalculatedValues;
}

/** How long a calculation stays available for "yes, save it" in a later message. */
const LAST_CALCULATION_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Remembers the server's own last calculation for this user.
 *
 * Every advisor message is a separate request with a fresh session, so the
 * calculation made when the advisor showed the numbers was gone by the time
 * the user answered "yes, save it" — and the save tool, which refuses to trust
 * numbers from the model, refused every time. The values stored here come from
 * the deterministic calculator on the server, never from the model or the
 * browser, and advisor_state is not readable or writable from the browser.
 */
export async function saveLastCalculation(
  uid: string,
  value: StoredCalculation,
  db: Firestore = adminDb
): Promise<void> {
  await db.collection('advisor_state').doc(uid).set(
    {
      lastCalculation: sanitizeFirestoreObject(value as unknown as Record<string, unknown>),
      lastCalculationAt: Date.now(),
    },
    { merge: true }
  );
}

export async function loadLastCalculation(uid: string, db: Firestore = adminDb): Promise<StoredCalculation | null> {
  const snap = await db.collection('advisor_state').doc(uid).get();
  const data = snap.exists ? snap.data() : undefined;
  if (!data?.lastCalculation || typeof data.lastCalculationAt !== 'number') return null;
  if (Date.now() - data.lastCalculationAt > LAST_CALCULATION_TTL_MS) return null;
  return data.lastCalculation as StoredCalculation;
}

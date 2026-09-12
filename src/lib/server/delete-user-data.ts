import { adminDb } from '@/lib/firebase-admin';
import { deleteAuthUserSafely } from '@/lib/admin-auth';

export interface DeleteUserDataResult {
  plans: number;
  advice: number;
  userDeleted: boolean;
}

const BATCH_SIZE = 450;

/**
 * Deletes all documents in a query using chunked Firestore batches.
 * Loops until no documents remain.
 */
async function deleteQueryInBatches(query: FirebaseFirestore.Query): Promise<number> {
  let totalDeleted = 0;

  while (true) {
    const snapshot = await query.limit(BATCH_SIZE).get();
    if (snapshot.empty) break;

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < BATCH_SIZE) break;
  }

  return totalDeleted;
}

/**
 * Safely and comprehensively deletes all data belonging to a user.
 * Idempotent and safe to retry on failure.
 */
export async function deleteUserData(uid: string): Promise<DeleteUserDataResult> {
  // 1. Delete all user plans
  const plansQuery = adminDb.collection('plans').where('userId', '==', uid);
  const plansDeleted = await deleteQueryInBatches(plansQuery);

  // 2. Delete all user advice
  const adviceQuery = adminDb.collection('advice').where('userId', '==', uid);
  const adviceDeleted = await deleteQueryInBatches(adviceQuery);

  // 3. Delete saved_advice if exists
  const savedAdviceQuery = adminDb.collection('saved_advice').where('userId', '==', uid);
  const savedAdviceDeleted = await deleteQueryInBatches(savedAdviceQuery);

  // 4. Delete advisor_state
  try {
    await adminDb.collection('advisor_state').doc(uid).delete();
  } catch {
    // Ignore if not present
  }

  // 5. Delete user profile document
  try {
    await adminDb.collection('users').doc(uid).delete();
  } catch {
    // Ignore if already deleted
  }

  // 6. Delete rate limits documents for this user
  try {
    const rateLimitsQuery = adminDb.collection('rate_limits').where('identifier', '==', `user_${uid}`);
    await deleteQueryInBatches(rateLimitsQuery);
  } catch {
    // Ignore
  }

  // 7. Delete Auth account last, treating already-deleted as success
  let userDeleted = false;
  try {
    userDeleted = await deleteAuthUserSafely(uid);
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === 'auth/user-not-found' || errorObj?.message?.includes('user-not-found')) {
      userDeleted = true;
    } else {
      throw err;
    }
  }

  return {
    plans: plansDeleted,
    advice: adviceDeleted + savedAdviceDeleted,
    userDeleted,
  };
}

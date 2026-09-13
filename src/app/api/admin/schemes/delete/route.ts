import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { verifyAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth';
import { getErrorMessage } from '@/lib/utils/errors';

export const maxDuration = 60;

/** Firestore allows 500 writes per batch. */
const BATCH_LIMIT = 450;

async function deleteInBatches(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = adminDb.batch();
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, email: adminEmail, error: authError } = await verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: authError || 'Forbidden: Valid admin credentials required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const schemeId = typeof body?.schemeId === 'string' ? body.schemeId.trim() : '';

    if (!schemeId || schemeId.includes('/')) {
      return NextResponse.json(
        { success: false, error: 'Scheme ID is required' },
        { status: 400 }
      );
    }

    // A missing scheme used to be reported as deleted, and an audit entry written
    // for a deletion that never happened.
    const schemeRef = adminDb.collection('schemes').doc(schemeId);
    const schemeSnap = await schemeRef.get();
    if (!schemeSnap.exists) {
      return NextResponse.json(
        { success: false, error: `No scheme with the ID "${schemeId}" exists. It may already have been deleted.` },
        { status: 404 }
      );
    }
    const schemeName = schemeSnap.data()?.name || schemeId;

    const [plansSnap, updatesSnap, cacheSnap] = await Promise.all([
      adminDb.collection('plans').where('schemeRefs', 'array-contains', schemeId).get(),
      adminDb.collection('scheme_updates').where('schemeId', '==', schemeId).get(),
      // Cached AI explanations of this scheme would otherwise outlive it.
      adminDb.collection('scheme_explanation_cache').where('schemeId', '==', schemeId).get(),
    ]);

    // The scheme goes first, so a failure part-way never leaves it visible with
    // its history already gone.
    await schemeRef.delete();
    await Promise.all(
      plansSnap.docs.map((d) => d.ref.update({ schemeRefs: FieldValue.arrayRemove(schemeId) }))
    );
    await deleteInBatches([...updatesSnap.docs, ...cacheSnap.docs].map((d) => d.ref));

    await adminDb.collection('adminActions').add({
      adminEmail: adminEmail || ADMIN_EMAIL,
      targetSchemeId: schemeId,
      schemeName,
      action: 'delete_scheme',
      plansUpdated: plansSnap.size,
      updatesDeleted: updatesSnap.size,
      cachedExplanationsDeleted: cacheSnap.size,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `Scheme "${schemeName}" was permanently deleted.`,
      recordsUpdated: {
        plans: plansSnap.size,
        updates: updatesSnap.size,
        cachedExplanations: cacheSnap.size,
      },
    });
  } catch (error) {
    console.error('Error executing admin scheme deletion:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, 'Failed to delete scheme') },
      { status: 500 }
    );
  }
}

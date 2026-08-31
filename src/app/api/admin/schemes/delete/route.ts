import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, email: adminEmail, error: authError } = await verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: authError || 'Forbidden: Valid admin credentials required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { schemeId }: { schemeId: string } = body;

    if (!schemeId || typeof schemeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Scheme ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch the scheme to retrieve its name for audit records
    const schemeRef = adminDb.collection('schemes').doc(schemeId);
    const schemeSnap = await schemeRef.get();
    const schemeName = schemeSnap.exists ? (schemeSnap.data()?.name || schemeId) : schemeId;

    // 2. Hard delete scheme document from Firestore
    await schemeRef.delete();

    // 3. Remove schemeId references from any existing user plans
    const plansSnap = await adminDb
      .collection('plans')
      .where('schemeRefs', 'array-contains', schemeId)
      .get();
    
    const planUpdates = plansSnap.docs.map((d) =>
      d.ref.update({
        schemeRefs: FieldValue.arrayRemove(schemeId),
      })
    );
    await Promise.all(planUpdates);

    // 4. Delete associated update proposals or draft history for this scheme
    const updatesSnap = await adminDb
      .collection('scheme_updates')
      .where('schemeId', '==', schemeId)
      .get();
    
    const updateDeletions = updatesSnap.docs.map((d) => d.ref.delete());
    await Promise.all(updateDeletions);

    // 5. Write audit log entry to adminActions collection
    await adminDb.collection('adminActions').add({
      adminEmail: adminEmail || ADMIN_EMAIL,
      targetSchemeId: schemeId,
      schemeName,
      action: 'delete_scheme',
      plansUpdated: plansSnap.size,
      updatesDeleted: updatesSnap.size,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `Scheme "${schemeName}" (${schemeId}) and all associated references deleted successfully.`,
      recordsUpdated: {
        plans: plansSnap.size,
        updates: updatesSnap.size,
      },
    });
  } catch (error: any) {
    console.error('Error executing admin scheme deletion:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete scheme' },
      { status: 500 }
    );
  }
}

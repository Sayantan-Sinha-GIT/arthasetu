import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  PINCODE_MASTER_RECORDS,
  lookupPincode,
  type PincodeInfo,
} from '@/lib/constants/pincodes';

export const maxDuration = 60;

// L1 In-Memory Cache for hot process lifetime
const L1_CACHE = new Map<string, PincodeInfo>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get('pin')?.replace(/[^0-9]/g, '') || '';

    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'Invalid 6-digit Indian PIN code' },
        { status: 400 }
      );
    }

    // 1. L1 In-Memory Cache
    if (L1_CACHE.has(pin)) {
      return NextResponse.json({
        success: true,
        data: L1_CACHE.get(pin)!,
        source: 'l1_memory_cache',
      });
    }

    // 2. High-Precision Master Static Records
    if (PINCODE_MASTER_RECORDS[pin]) {
      const master = PINCODE_MASTER_RECORDS[pin];
      L1_CACHE.set(pin, master);
      // Seed to L2 Firestore Cache
      adminDb
        .collection('pincode_cache')
        .doc(pin)
        .set({
          ...master,
          source: 'static_master_dataset',
          cachedAt: new Date().toISOString(),
        })
        .catch((err) => console.warn('Failed to seed master pincode to Firestore:', err));

      return NextResponse.json({
        success: true,
        data: master,
        source: 'static_master_dataset',
      });
    }

    // 3. L2 Persistent Firestore Cache
    try {
      const cachedDoc = await adminDb.collection('pincode_cache').doc(pin).get();
      if (cachedDoc.exists) {
        const data = cachedDoc.data() as PincodeInfo;
        if (data && data.state && data.district && Array.isArray(data.areas) && data.areas.length > 0) {
          L1_CACHE.set(pin, { state: data.state, district: data.district, areas: data.areas });
          return NextResponse.json({
            success: true,
            data: { state: data.state, district: data.district, areas: data.areas },
            source: 'l2_firestore_cache',
          });
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore pincode cache read warning:', firestoreErr);
    }

    // 4. L3 Live India Post Public API Fallback
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ArthaSetu-Pincode-Service' },
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json[0]?.Status === 'Success' && Array.isArray(json[0]?.PostOffice)) {
          const postOffices = json[0].PostOffice;
          const state = postOffices[0]?.State;
          const district = postOffices[0]?.District;
          const areas = Array.from(new Set(postOffices.map((po: any) => (po.Name || '').trim()).filter(Boolean)));

          if (state && district && areas.length > 0) {
            const resolved: PincodeInfo = { state, district, areas: areas as string[] };
            L1_CACHE.set(pin, resolved);

            // Persist to L2 Firestore Cache
            try {
              await adminDb
                .collection('pincode_cache')
                .doc(pin)
                .set({
                  ...resolved,
                  source: 'india_post_api',
                  cachedAt: new Date().toISOString(),
                });
            } catch (err) {
              console.warn('Failed to persist pincode to Firestore:', err);
            }

            return NextResponse.json({
              success: true,
              data: resolved,
              source: 'india_post_api',
            });
          }
        }
      }
    } catch (apiErr) {
      console.warn('India Post API fetch error:', apiErr);
    }

    // 5. Baseline Fallback
    const fallback = lookupPincode(pin);
    if (fallback) {
      return NextResponse.json({
        success: true,
        data: fallback,
        source: 'prefix_fallback',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unresolvable PIN code' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Pincode route error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error resolving PIN code' },
      { status: 500 }
    );
  }
}

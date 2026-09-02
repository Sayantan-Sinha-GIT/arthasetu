// ─── Firestore cache for AI-generated scheme explanations (server-side only) ───
//
// The Gemini free tier allows 20 requests a day across the whole project, and
// six API routes compete for it. Scheme explanations are the heaviest consumer
// and the most repetitive: the same scheme, in the same language, for a
// similar entrepreneur, produces the same answer every time. Generating it
// once and reusing it turns the commonest request into a Firestore read.
//
// This is deliberately a lazy (write-through) cache rather than a pre-built
// one. Pre-generating every combination is not merely wasteful, it is
// impossible: 369 schemes x 23 languages is 8,487 generations, which at 20 a
// day would take over a year. Entries are filled as users actually ask.

import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import type { Scheme, UserProfile } from '@/types';

const COLLECTION = 'scheme_explanation_cache';

/**
 * Bumped when the prompt or output format changes, so stale-shaped
 * explanations are not served after a deploy that alters them.
 */
const PROMPT_VERSION = 'v1';

/**
 * A coarse fingerprint of the profile the explanation was tailored to.
 *
 * Deliberately excludes the entrepreneur's name and exact capital. Two
 * reasons: keying on them would make almost every entry a miss, and a cache
 * shared between users must never hold one person's identifying details and
 * hand them to another. Capital is bucketed so ₹48,000 and ₹52,000 —
 * indistinguishable in advice terms — share an entry.
 */
function profileSignature(profile: Partial<UserProfile> | null): string {
  if (!profile) return 'generic';
  const capital = Number(profile.availableCapital) || 0;
  // Buckets in rupees: <25k, <50k, <1L, <2.5L, <5L, <10L, 10L+
  const buckets = [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
  const bucket = buckets.findIndex((b) => capital < b);
  return [
    profile.state || 'IN',
    profile.district || '-',
    profile.businessType || '-',
    profile.businessCategory || '-',
    bucket === -1 ? '10L+' : `b${bucket}`,
  ].join('|');
}

function cacheKey(scheme: Scheme, language: string, profile: Partial<UserProfile> | null): string {
  const raw = [
    PROMPT_VERSION,
    scheme.id,
    // An admin edit changes the verification date, which retires old entries
    // instead of serving advice about a scheme that has since changed.
    scheme.lastVerifiedDate || '-',
    language,
    profileSignature(profile),
  ].join('::');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 40);
}

/** Returns the cached explanation, or null on a miss or any Firestore trouble. */
export async function getCachedExplanation(
  scheme: Scheme,
  language: string,
  profile: Partial<UserProfile> | null
): Promise<string | null> {
  try {
    const snap = await adminDb.collection(COLLECTION).doc(cacheKey(scheme, language, profile)).get();
    if (!snap.exists) return null;
    const text = snap.data()?.explanation;
    return typeof text === 'string' && text.trim() ? text : null;
  } catch (err) {
    // The cache is an optimisation; never let it break the request.
    console.warn('Explanation cache read failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Stores a freshly generated explanation. Failures are logged, never thrown. */
export async function setCachedExplanation(
  scheme: Scheme,
  language: string,
  profile: Partial<UserProfile> | null,
  explanation: string
): Promise<void> {
  try {
    await adminDb
      .collection(COLLECTION)
      .doc(cacheKey(scheme, language, profile))
      .set({
        explanation,
        schemeId: scheme.id,
        language,
        signature: profileSignature(profile),
        promptVersion: PROMPT_VERSION,
        createdAt: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('Explanation cache write failed:', err instanceof Error ? err.message : err);
  }
}

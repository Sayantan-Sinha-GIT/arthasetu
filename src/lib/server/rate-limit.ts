import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number; // seconds
}

export type RateLimitBucket = 'ai' | 'api' | 'client-errors';

interface LimitRule {
  windowMs: number;
  max: number;
}

const BUCKET_RULES: Record<RateLimitBucket, LimitRule[]> = {
  ai: [
    { windowMs: 60 * 1000, max: 15 }, // 15 requests per minute
    { windowMs: 24 * 60 * 60 * 1000, max: 100 }, // 100 requests per day
  ],
  api: [
    { windowMs: 60 * 1000, max: 60 }, // 60 requests per minute
  ],
  // Browser error reports: a page stuck in an error loop should not flood the log.
  'client-errors': [
    { windowMs: 60 * 1000, max: 10 },
  ],
};

// In-memory fallback / cache for fast-path check
const memoryStore = new Map<string, { count: number; expiresAt: number }>();
const MAX_MEMORY_STORE_SIZE = 5000;

function cleanupMemoryStore(now: number) {
  if (memoryStore.size > MAX_MEMORY_STORE_SIZE) {
    for (const [key, val] of memoryStore.entries()) {
      if (val.expiresAt <= now) {
        memoryStore.delete(key);
      }
    }
  }
}

export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return '127.0.0.1';
}

/**
 * Checks and increments rate limit counter for a given bucket and key (uid or IP).
 *
 * `persist: false` counts in this server instance's memory only. Every
 * persisted check costs a Firestore read and write, and the free plan allows
 * 20,000 writes a day, so an unauthenticated endpoint that anyone can call
 * must not spend them.
 */
export async function checkRateLimit(
  req: NextRequest,
  bucket: RateLimitBucket = 'api',
  uid?: string | null,
  { persist = true }: { persist?: boolean } = {}
): Promise<RateLimitResult> {
  const now = Date.now();
  cleanupMemoryStore(now);

  const identifier = uid ? `user_${uid}` : `ip_${getClientIp(req)}`;
  const rules = BUCKET_RULES[bucket];

  for (const rule of rules) {
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const expiresAt = windowStart + rule.windowMs;
    const retryAfter = Math.max(1, Math.ceil((expiresAt - now) / 1000));
    const docId = `${bucket}_${identifier}_${windowStart}`;

    // Fast in-memory check
    const memRecord = memoryStore.get(docId);
    if (memRecord && memRecord.count >= rule.max) {
      return {
        allowed: false,
        limit: rule.max,
        remaining: 0,
        retryAfter,
      };
    }

    let count = 1;

    if (!persist) {
      count = memRecord ? memRecord.count + 1 : 1;
    } else try {
      // Attempt Firestore increment if available
      const docRef = adminDb.collection('rate_limits').doc(docId);
      const snapshot = await docRef.get();

      if (snapshot.exists) {
        const data = snapshot.data();
        const current = typeof data?.count === 'number' ? data.count : 0;
        if (current >= rule.max) {
          memoryStore.set(docId, { count: current, expiresAt });
          return {
            allowed: false,
            limit: rule.max,
            remaining: 0,
            retryAfter,
          };
        }
        count = current + 1;
        await docRef.update({ count, updatedAt: now });
      } else {
        await docRef.set({
          count: 1,
          bucket,
          identifier,
          windowStart,
          expiresAt: new Date(expiresAt),
          createdAt: now,
        });
      }
    } catch {
      // If Firestore Admin is unavailable or offline, rely safely on in-memory store
      if (memRecord) {
        count = memRecord.count + 1;
      }
    }

    memoryStore.set(docId, { count, expiresAt });

    if (count > rule.max) {
      return {
        allowed: false,
        limit: rule.max,
        remaining: 0,
        retryAfter,
      };
    }
  }

  const primaryRule = rules[0];
  const memRecord = memoryStore.get(`${bucket}_${identifier}_${Math.floor(now / primaryRule.windowMs) * primaryRule.windowMs}`);
  const currentCount = memRecord ? memRecord.count : 1;

  return {
    allowed: true,
    limit: primaryRule.max,
    remaining: Math.max(0, primaryRule.max - currentCount),
    retryAfter: 0,
  };
}

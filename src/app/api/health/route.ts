import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { isGeminiCoolingOff } from '@/lib/gemini';
import { isGroqConfigured } from '@/lib/groq';
import { getServerEnv } from '@/lib/env';

export const maxDuration = 10;

export async function GET() {
  let firestoreStatus: 'ok' | 'error' = 'ok';

  try {
    // Single cheap read to verify Firestore connection
    await adminDb.collection('schemes').limit(1).get();
  } catch (err) {
    console.warn('Health check Firestore read error:', err);
    firestoreStatus = 'error';
  }

  // Required server settings present? Reported, not named: this route is public.
  let configStatus: 'ok' | 'incomplete' = 'ok';
  try {
    getServerEnv();
  } catch {
    configStatus = 'incomplete';
  }

  const geminiStatus = isGeminiCoolingOff() ? 'cooling' : 'available';
  const groqStatus = isGroqConfigured() ? 'configured' : 'missing';

  const isHealthy = firestoreStatus === 'ok';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      firestore: firestoreStatus,
      config: configStatus,
      gemini: geminiStatus,
      groq: groqStatus,
      // Set per deployment in next.config.ts.
      buildId: process.env.ARTHASETU_BUILD_ID || 'development',
    },
    { status: isHealthy ? 200 : 503 }
  );
}

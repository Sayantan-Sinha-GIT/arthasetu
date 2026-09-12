import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { isGeminiCoolingOff } from '@/lib/gemini';
import { isGroqConfigured } from '@/lib/groq';

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

  const geminiStatus = isGeminiCoolingOff() ? 'cooling' : 'available';
  const groqStatus = isGroqConfigured() ? 'configured' : 'missing';

  const isHealthy = firestoreStatus === 'ok';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      firestore: firestoreStatus,
      gemini: geminiStatus,
      groq: groqStatus,
      buildId: process.env.NEXT_BUILD_ID || 'development',
    },
    { status: isHealthy ? 200 : 503 }
  );
}

/**
 * Error Reporting Script for Admin
 * Run: npx tsx scripts/report-errors.ts
 */
import * as dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { adminDb } = await import('../src/lib/firebase-admin');

  console.log('Fetching latest error events from Firestore...');
  try {
    const snapshot = await adminDb
      .collection('error_events')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) {
      console.log('No recent errors found in error_events. All systems operational!');
      return;
    }

    const grouped: Record<string, { count: number; lastSeen: string; route?: string }> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const msg = data.msg || 'Unknown error';
      const time = data.timestamp || new Date(data.createdAt || Date.now()).toISOString();
      const route = data.route || 'unknown';

      if (!grouped[msg]) {
        grouped[msg] = { count: 1, lastSeen: time, route };
      } else {
        grouped[msg].count += 1;
      }
    });

    console.log('\n--- Recent Errors Summary (Admin) ---');
    console.table(
      Object.entries(grouped).map(([message, info]) => ({
        Message: message.slice(0, 70),
        Occurrences: info.count,
        Route: info.route,
        'Last Seen': info.lastSeen,
      }))
    );
  } catch (err) {
    console.error('Failed to read error events:', err);
  }
}

main().catch(console.error);

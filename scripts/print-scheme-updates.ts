import * as fs from 'fs';
import * as path from 'path';
import { initializeApp as initAdminApp, cert, getApps as getAdminApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*(\{[\s\S]*?\n\})/);
if (!match) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}
const serviceAccount = JSON.parse(match[1]) as ServiceAccount;
if (serviceAccount.privateKey && typeof serviceAccount.privateKey === 'string') {
  serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
}

const adminApp = getAdminApps().length === 0 
  ? initAdminApp({ credential: cert(serviceAccount) }, 'scheme-audit-reader')
  : getAdminApps()[0];

const adminDb = getAdminFirestore(adminApp);

async function inspectSchemeUpdates() {
  const snap = await adminDb.collection('scheme_updates').get();
  console.log(`Total Documents in scheme_updates: ${snap.size}\n`);
  snap.docs.forEach((doc, idx) => {
    console.log(`=== SCHEME UPDATE ENTRY #${idx + 1} | ID: ${doc.id} ===`);
    const data = doc.data();
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');
  });
}

inspectSchemeUpdates().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

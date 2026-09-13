/**
 * Checks the admin user delete API end to end with disposable accounts: refusals
 * (no token, regular user, bad body, unknown user, your own account, another
 * administrator), a real delete that removes profile, plans, advice, advisor state
 * and login with one audit entry, and a repeat delete that returns 404. Cleans up.
 *
 *   npx tsx scripts/test-admin-user-delete.ts [baseUrl]   (default http://localhost:3000)
 */
import { adminDb, adminAuth } from '../src/lib/firebase-admin';
process.loadEnvFile('.env.local');
const BASE = process.argv[2] || 'http://localhost:3000';
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const ts = Date.now();
let fails = 0;
const check = (name: string, ok: boolean, info?: unknown) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`, ok ? '' : JSON.stringify(info)); };
async function idToken(uid: string) {
  const custom = await adminAuth.createCustomToken(uid);
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: custom, returnSecureToken: true }) });
  return (await r.json()).idToken as string;
}
const post = async (body: unknown, token?: string) => {
  const r = await fetch(`${BASE}/api/admin/users/delete`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const exists = async (uid: string) => { try { await adminAuth.getUser(uid); return true; } catch { return false; } };
(async () => {
  const make = (label: string) => adminAuth.createUser({ email: `usercheck-${label}-${ts}@example.com`, emailVerified: true });
  const [admin, otherAdmin, regular, victim] = await Promise.all([make('admin'), make('admin2'), make('regular'), make('victim')]);
  await Promise.all([adminAuth.setCustomUserClaims(admin.uid, { admin: true }), adminAuth.setCustomUserClaims(otherAdmin.uid, { admin: true })]);
  const ids = [admin.uid, otherAdmin.uid, regular.uid, victim.uid];
  try {
    const [aTok, uTok] = await Promise.all([idToken(admin.uid), idToken(regular.uid)]);
    await adminDb.collection('users').doc(victim.uid).set({ uid: victim.uid, email: victim.email, name: 'User Check Victim', state: 'Assam' });
    await adminDb.collection('users').doc(otherAdmin.uid).set({ uid: otherAdmin.uid, email: otherAdmin.email, name: 'User Check Admin 2' });
    await adminDb.collection('plans').add({ userId: victim.uid, title: 'victim plan' });
    await adminDb.collection('advice').add({ userId: victim.uid, title: 'victim advice' });
    await adminDb.collection('advisor_state').doc(victim.uid).set({ lastCalculationAt: ts });

    check('no token is refused (403)', (await post({ targetUid: victim.uid })).status === 403);
    check('a regular user is refused (403)', (await post({ targetUid: victim.uid }, uTok)).status === 403);
    check('the victim still exists after refused attempts', await exists(victim.uid) && (await adminDb.collection('users').doc(victim.uid).get()).exists);
    check('missing target gives 400', (await post({}, aTok)).status === 400);
    const unknown = await post({ targetUid: `no-such-user-${ts}` }, aTok);
    check('an unknown user gives 404, not a false success', unknown.status === 404, unknown);
    const self = await post({ targetUid: admin.uid }, aTok);
    check('an admin cannot delete their own account (400)', self.status === 400 && await exists(admin.uid), self);
    const other = await post({ targetUid: otherAdmin.uid }, aTok);
    check('another administrator cannot be deleted (403)', other.status === 403 && await exists(otherAdmin.uid) && (await adminDb.collection('users').doc(otherAdmin.uid).get()).exists, other);
    const ok = await post({ targetUid: victim.uid, targetEmail: victim.email }, aTok);
    check('admin deletes a regular user', ok.status === 200 && ok.json.success === true, ok);
    check('their profile is gone', !(await adminDb.collection('users').doc(victim.uid).get()).exists);
    check('their plans and advice are gone', (await adminDb.collection('plans').where('userId', '==', victim.uid).get()).empty && (await adminDb.collection('advice').where('userId', '==', victim.uid).get()).empty);
    check('their advisor state is gone', !(await adminDb.collection('advisor_state').doc(victim.uid).get()).exists);
    check('their login is gone', !(await exists(victim.uid)));
    const audit = await adminDb.collection('adminActions').where('targetUid', '==', victim.uid).get();
    check('one audit entry names the admin and the user', audit.size === 1 && audit.docs[0].data().adminEmail === admin.email && audit.docs[0].data().targetEmail === victim.email, audit.docs.map((d) => d.data()));
    check('deleting them again gives 404', (await post({ targetUid: victim.uid }, aTok)).status === 404);
    const refusedAudit = await Promise.all([admin.uid, otherAdmin.uid, `no-such-user-${ts}`].map((uid) => adminDb.collection('adminActions').where('targetUid', '==', uid).get()));
    check('no audit entries for refused deletions', refusedAudit.every((s) => s.empty));
  } finally {
    for (const uid of ids) {
      for (const col of ['plans', 'advice']) for (const d of (await adminDb.collection(col).where('userId', '==', uid).get()).docs) await d.ref.delete();
      await adminDb.collection('users').doc(uid).delete().catch(() => {});
      await adminDb.collection('advisor_state').doc(uid).delete().catch(() => {});
      for (const d of (await adminDb.collection('adminActions').where('targetUid', '==', uid).get()).docs) await d.ref.delete();
      await adminAuth.deleteUser(uid).catch(() => {});
    }
    console.log(fails ? `${fails} CHECK(S) FAILED` : 'ALL USER DELETE CHECKS PASSED', '(test data removed)');
    process.exit(fails ? 1 : 0);
  }
})();

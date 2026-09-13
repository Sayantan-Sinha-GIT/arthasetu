/**
 * Checks the admin scheme delete API end to end with disposable accounts and data:
 * refusals (no token, regular user, bad body, missing scheme), a real delete that
 * removes the scheme, its AI proposals and cached explanations, trims user plans,
 * writes one audit entry, and a repeat delete that returns 404. Cleans up after itself.
 *
 *   npx tsx scripts/test-admin-scheme-delete.ts [baseUrl]   (default http://localhost:3000)
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
  const r = await fetch(`${BASE}/api/admin/schemes/delete`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
(async () => {
  const schemeId = `zz-delcheck-${ts}`;
  const admin = await adminAuth.createUser({ email: `delcheck-admin-${ts}@example.com`, emailVerified: true });
  await adminAuth.setCustomUserClaims(admin.uid, { admin: true });
  const regular = await adminAuth.createUser({ email: `delcheck-user-${ts}@example.com`, emailVerified: true });
  let planId = '', updateId = '', cacheId = `zz-delcheck-cache-${ts}`;
  try {
    const [aTok, uTok] = await Promise.all([idToken(admin.uid), idToken(regular.uid)]);
    await adminDb.collection('schemes').doc(schemeId).set({ id: schemeId, name: 'Delete Check Scheme', shortName: 'DCS', isActive: true, governmentLevel: 'central', description: 'temp', lastVerifiedDate: '2026-09-13' });
    updateId = (await adminDb.collection('scheme_updates').add({ schemeId, schemeName: 'Delete Check Scheme', status: 'pending', proposedChanges: {} })).id;
    await adminDb.collection('scheme_explanation_cache').doc(cacheId).set({ schemeId, language: 'en', explanation: 'temp' });
    planId = (await adminDb.collection('plans').add({ userId: regular.uid, title: 'Delete check plan', schemeRefs: [schemeId, 'central-pmegp'] })).id;

    check('no token is refused (403)', (await post({ schemeId })).status === 403);
    check('a regular user is refused (403)', (await post({ schemeId }, uTok)).status === 403);
    check('scheme still exists after refused attempts', (await adminDb.collection('schemes').doc(schemeId).get()).exists);
    check('missing scheme id gives 400', (await post({}, aTok)).status === 400);
    const missing = await post({ schemeId: `zz-does-not-exist-${ts}` }, aTok);
    check('a scheme that does not exist gives 404 with a clear message', missing.status === 404 && /No scheme/.test(missing.json.error || ''), missing);
    const ok = await post({ schemeId }, aTok);
    check('admin delete succeeds', ok.status === 200 && ok.json.success === true, ok);
    check('the scheme is gone', !(await adminDb.collection('schemes').doc(schemeId).get()).exists);
    check('its pending AI proposal is gone', !(await adminDb.collection('scheme_updates').doc(updateId).get()).exists);
    check('its cached explanation is gone', !(await adminDb.collection('scheme_explanation_cache').doc(cacheId).get()).exists);
    const plan = (await adminDb.collection('plans').doc(planId).get()).data();
    check('a user plan keeps its other scheme references and loses this one', JSON.stringify(plan?.schemeRefs) === '["central-pmegp"]', plan?.schemeRefs);
    const audit = await adminDb.collection('adminActions').where('targetSchemeId', '==', schemeId).get();
    check('one audit entry records the deletion', audit.size === 1 && audit.docs[0].data().action === 'delete_scheme' && audit.docs[0].data().cachedExplanationsDeleted === 1, audit.docs.map((d) => d.data()));
    const again = await post({ schemeId }, aTok);
    check('deleting it again gives 404, not a false success', again.status === 404, again);
    check('no second audit entry was written', (await adminDb.collection('adminActions').where('targetSchemeId', '==', schemeId).get()).size === 1);
  } finally {
    await adminDb.collection('schemes').doc(schemeId).delete().catch(() => {});
    if (updateId) await adminDb.collection('scheme_updates').doc(updateId).delete().catch(() => {});
    await adminDb.collection('scheme_explanation_cache').doc(cacheId).delete().catch(() => {});
    if (planId) await adminDb.collection('plans').doc(planId).delete().catch(() => {});
    for (const d of (await adminDb.collection('adminActions').where('targetSchemeId', '==', schemeId).get()).docs) await d.ref.delete();
    await adminAuth.deleteUser(admin.uid).catch(() => {});
    await adminAuth.deleteUser(regular.uid).catch(() => {});
    console.log(fails ? `${fails} CHECK(S) FAILED` : 'ALL DELETE CHECKS PASSED', '(test data removed)');
    process.exit(fails ? 1 : 0);
  }
})();

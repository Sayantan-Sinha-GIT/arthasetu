/**
 * Guards the AI advisor's two saves: filling in the profile from what the user
 * says ("I have 50000 rupees" -> available capital), and saving a plan.
 *
 * Neither had ever worked:
 *   - the tools wrote with the browser Firebase SDK from inside a server route,
 *     where there is no signed-in user, so the rules refused every write, using
 *     a uid taken from the request body;
 *   - plan saving needs the calculation, but every message is a fresh request,
 *     so by the time the user said "yes, save it" the calculation was gone.
 *
 * Driven against an in-memory Firestore, so this never touches real data.
 *
 *   npx tsx scripts/test-profile-and-scheme-saves.ts
 */
import { readFileSync } from 'node:fs';
import type { Firestore } from 'firebase-admin/firestore';
import {
  updateUserProfileAsAdmin,
  savePlanAsAdmin,
  saveLastCalculation,
  loadLastCalculation,
  type StoredCalculation,
} from '../src/lib/server/profile-store';
import { createAdvisorSession } from '../src/app/api/advisor/route';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok && detail) console.log(`        ${detail}`);
}

type Doc = Record<string, unknown>;
const isPlainObject = (v: unknown): v is Doc =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
function deepMerge(target: Doc, source: Doc): Doc {
  const out: Doc = { ...target };
  for (const [k, v] of Object.entries(source)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k] as Doc, v) : v;
  }
  return out;
}

function makeDb(seed: Record<string, Record<string, Doc>> = {}) {
  const data = new Map<string, Map<string, Doc>>();
  for (const [col, docs] of Object.entries(seed)) data.set(col, new Map(Object.entries(docs)));
  let autoId = 0;
  const bucket = (col: string) => {
    if (!data.has(col)) data.set(col, new Map());
    return data.get(col) as Map<string, Doc>;
  };
  const db = {
    collection: (col: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const d = bucket(col).get(id);
          return { id, exists: d !== undefined, data: () => (d ? structuredClone(d) : undefined) };
        },
        set: async (value: Doc, opts?: { merge?: boolean }) => {
          const current = bucket(col).get(id);
          bucket(col).set(id, opts?.merge && current ? deepMerge(current, value) : { ...value });
        },
      }),
      add: async (value: Doc) => {
        const id = `auto${++autoId}`;
        bucket(col).set(id, { ...value });
        return { id };
      },
    }),
  };
  return { db: db as unknown as Firestore, raw: (col: string, id: string) => bucket(col).get(id), bucket };
}

const planInputs = {
  businessType: 'Poultry', planType: 'startup', equipmentCost: 80000, setupCost: 20000, initialInventory: 15000,
  workingCapitalReserve: 10000, availableSavings: 50000, unitPrice: 180, unitsSoldPerMonth: 600,
  monthlyRawMaterials: 45000, monthlyRentUtilities: 4000, monthlyLabor: 12000,
};

async function main() {
  console.log('— "I have 50000 rupees" reaches the profile —');
  {
    const { db, raw } = makeDb({ users: { 'user-a': { uid: 'user-a', email: 'a@example.test', name: 'Asha', availableCapital: 0, createdAt: 'ORIGINAL' } } });
    const session = createAdvisorSession(async () => 'plan', {
      uid: 'user-a',
      updateProfileFn: (uid, updates) => updateUserProfileAsAdmin(uid, updates, db),
      loadSchemesFn: async () => [],
      saveLastPlanFn: async () => {},
      loadLastPlanFn: async () => null,
    });
    const result = await session.toolHandler('updateProfile', { availableCapital: 50000, state: null }, { uid: 'user-a' });
    const saved = raw('users', 'user-a') as Doc;
    check('the advisor tool saves available capital to the profile', (result as Doc).success === true && saved.availableCapital === 50000);
    check('other profile fields are left untouched', saved.name === 'Asha' && saved.createdAt === 'ORIGINAL' && saved.email === 'a@example.test');
    check('empty values from the model are not written over real ones', !('state' in saved));
  }
  {
    const calls: string[] = [];
    const signedOut = createAdvisorSession(async () => 'plan', {
      uid: null,
      updateProfileFn: async (uid) => { calls.push(uid); },
      loadSchemesFn: async () => [],
    });
    const refused = await signedOut.toolHandler('updateProfile', { availableCapital: 50000 }, { uid: 'body-claims-this' });
    check('without a verified sign-in nothing is saved', 'error' in (refused as Doc) && calls.length === 0, 'a uid in the request body is not proof of who is asking');

    const signedIn = createAdvisorSession(async () => 'plan', {
      uid: 'verified-user',
      updateProfileFn: async (uid) => { calls.push(uid); },
      loadSchemesFn: async () => [],
    });
    await signedIn.toolHandler('updateProfile', { availableCapital: 50000 }, { uid: 'body-claims-this' });
    check('the save goes to the verified user, not the uid in the request body', calls[0] === 'verified-user');
  }

  console.log('\n— "yes, save it" in a later message saves the plan —');
  {
    const { db, bucket } = makeDb();
    const deps = {
      uid: 'user-p',
      updateProfileFn: async () => {},
      loadSchemesFn: async () => [],
      saveLastPlanFn: (uid: string, v: StoredCalculation) => saveLastCalculation(uid, v, db),
      loadLastPlanFn: (uid: string) => loadLastCalculation(uid, db),
    };
    const savePlan = (uid: string, data: never) => savePlanAsAdmin(uid, data, db);

    // Message 1: the advisor calculates and shows the numbers.
    const first = createAdvisorSession(savePlan, deps);
    const calc = (await first.toolHandler('calculateFinancials', planInputs, null)) as Doc;

    // Message 2: a brand-new request, exactly as the route creates one.
    const second = createAdvisorSession(savePlan, deps);
    const saved = (await second.toolHandler('saveGeneratedPlan', {
      title: 'Poultry plan', businessType: 'Poultry', narrative: { executiveSummary: 'ok' },
    }, null)) as Doc;
    const plans = [...bucket('plans').values()];
    check('a plan saves in the message after the calculation', saved.success === true && plans.length === 1, JSON.stringify(saved));
    check('the saved plan is stored under the signed-in user', plans[0]?.userId === 'user-p');
    check(
      'the saved numbers are the server calculation, not anything the model sends',
      (plans[0]?.calculatedValues as Doc)?.monthlyNetProfit === calc.monthlyNetProfit
    );

    const fresh = createAdvisorSession(savePlan, { ...deps, uid: 'never-calculated' });
    const refused = (await fresh.toolHandler('saveGeneratedPlan', { title: 'x' }, null)) as Doc;
    check('with no calculation on record, saving is still refused', typeof refused.error === 'string' && bucket('plans').size === 1);
  }
  {
    const { db } = makeDb({ advisor_state: { old: { lastCalculation: { inputs: {}, calculatedValues: {} }, lastCalculationAt: Date.now() - 7 * 3600 * 1000 } } });
    check('a calculation from hours ago is not reused', (await loadLastCalculation('old', db)) === null);
  }

  console.log('\n— wiring —');
  const route = readFileSync('src/app/api/advisor/route.ts', 'utf8');
  check('the advisor route verifies who is asking', route.includes('optionalUserUid(req)'));
  check('the advisor no longer saves through the browser SDK', !route.includes("from '@/lib/firestore/users'") && !route.includes("from '@/lib/firestore/plans'"));
  check('the chat sends the signed-in user token', readFileSync('src/components/advisor/ChatInterface.tsx', 'utf8').includes('Authorization: `Bearer ${idToken}`'));

  console.log(failed === 0 ? '\nAll advisor save checks passed.' : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main();

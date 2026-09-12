/**
 * Guards the AI advisor's profile collection end to end, without calling any AI.
 *
 * The advisor asked for a date of birth, and the user's answer ("date of birth
 * is 23 aug 1990") was refused as off-topic: the scope check only ever saw the
 * one message. Even past that, the save tool had no date-of-birth field, wrote
 * empty strings over real answers, and stored values the profile form's
 * dropdowns did not recognise.
 *
 *   npx tsx scripts/test-advisor-profile-normalization.ts
 */
import type { Firestore } from 'firebase-admin/firestore';
import {
  normalizeAdvisorProfileUpdates,
  parseAmount,
  parseDateOfBirth,
} from '../src/lib/profile/advisor-profile-updates';
import { canonicalRegion, findRegionInText } from '../src/lib/constants/region-match';
import { calculateFinancialPlan, getPlausibilityWarnings } from '../src/lib/calculator';
import { matchSchemesForProfile } from '../src/lib/schemes/matcher';
import { classifyAdvisorQuery } from '../src/lib/gemini';
import { createAdvisorSession } from '../src/app/api/advisor/route';
import type { PlanInputs, Scheme } from '../src/types';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok && detail) console.log(`        ${detail}`);
}

async function main() {
  console.log('— dates of birth as people write them —');
  check('"23 aug 1990"', parseDateOfBirth('23 aug 1990') === '1990-08-23', String(parseDateOfBirth('23 aug 1990')));
  check('"23/08/1990" is day first', parseDateOfBirth('23/08/1990') === '1990-08-23');
  check('"1990-08-23"', parseDateOfBirth('1990-08-23') === '1990-08-23');
  check('"August 23rd, 1990"', parseDateOfBirth('August 23rd, 1990') === '1990-08-23');
  check('an impossible date is refused', parseDateOfBirth('31/02/1990') === null);
  check('a non-date is refused', parseDateOfBirth('yesterday') === null);

  console.log('\n— amounts as people write them —');
  check('"5 lakh"', parseAmount('5 lakh') === 500000);
  check('"₹50,000"', parseAmount('₹50,000') === 50000);
  check('"1.5 crore"', parseAmount('1.5 crore') === 15000000);
  check('"50k"', parseAmount('50k') === 50000);
  check('a negative amount is refused', parseAmount(-5000) === null);

  console.log('\n— what the advisor saves —');
  {
    const { updates, rejected } = normalizeAdvisorProfileUpdates({ dob: '23 aug 1990' });
    check('the date of birth from the screenshot is saved', updates.dob === '1990-08-23' && Object.keys(rejected).length === 0);
  }
  {
    const { updates, rejected } = normalizeAdvisorProfileUpdates({ dob: '2015-01-01' });
    check('an under-18 date of birth is not saved, with a reason', !updates.dob && typeof rejected.dob === 'string');
  }
  {
    const { updates, rejected } = normalizeAdvisorProfileUpdates({ state: '', availableCapital: '', businessType: '   ' });
    check('blank values never overwrite real answers', Object.keys(updates).length === 0 && Object.keys(rejected).length === 0,
      JSON.stringify(updates));
  }
  {
    const { updates } = normalizeAdvisorProfileUpdates({
      gender: 'woman',
      businessExperience: '2-3 years',
      businessCategory: 'saree shop',
      businessStatus: 'already running',
      availableCapital: '5 lakh',
    });
    check('gender becomes the dropdown value', updates.gender === 'Female', String(updates.gender));
    check('experience becomes the dropdown value', updates.businessExperience === '1-3 years', String(updates.businessExperience));
    check('a trade maps to its category', updates.businessCategory === 'Handloom, Textiles & Tailoring', String(updates.businessCategory));
    check('status is normalised', updates.businessStatus === 'existing');
    check('capital in lakh is converted', updates.availableCapital === 500000);
  }
  check('"0-1 years" is the beginner option',
    normalizeAdvisorProfileUpdates({ businessExperience: '0-1 years' }).updates.businessExperience === '0-1 years (Beginner / New Venture)');
  check('"10 years" is the experienced option',
    normalizeAdvisorProfileUpdates({ businessExperience: '10 years' }).updates.businessExperience === '5+ years (Experienced)');
  {
    const { updates } = normalizeAdvisorProfileUpdates({ loans: [{ lenderType: 'SHG', outstandingAmount: '20,000', monthlyEmi: 1500 }] });
    check('loans are saved with a known lender type',
      updates.existingLoans === true && updates.loanDetails?.[0]?.lenderType === 'shg_cooperative' && updates.loanDetails?.[0]?.outstandingAmount === 20000);
  }
  check('an old state name is recognised', canonicalRegion('orissa') === 'Odisha', String(canonicalRegion('orissa')));
  {
    const { updates } = normalizeAdvisorProfileUpdates({ state: 'Bihar' }, { state: 'Assam', district: 'Nagaon' });
    check('moving state clears the old state\'s district', updates.state === 'Bihar' && updates.district === '');
  }
  {
    const { updates, rejected } = normalizeAdvisorProfileUpdates({ state: 'Assam', district: 'Paris' });
    check('a district that is not in the state is refused, with a reason', !updates.district && typeof rejected.district === 'string');
  }

  console.log('\n— the off-topic check lets answers through, without an AI call —');
  const realFetch = globalThis.fetch;
  const savedGroqKey = process.env.GROQ_API_KEY;
  let modelCalls = 0;
  process.env.GROQ_API_KEY = 'test-key-no-network';
  globalThis.fetch = (async () => {
    modelCalls++;
    throw new Error('no network in this test');
  }) as typeof fetch;
  try {
    const askedDob = [
      { role: 'assistant', content: 'Welcome!', id: 'welcome-1' },
      { role: 'user', content: 'I sell sarees', id: 'u1' },
      { role: 'assistant', content: 'What is your date of birth?', id: 'a1' },
    ];
    modelCalls = 0;
    const reply = await classifyAdvisorQuery('date of birth is 23 aug 1990', askedDob);
    check('a reply to the advisor\'s question is on topic', reply === 'ON_TOPIC' && modelCalls === 0, `calls=${modelCalls}`);

    modelCalls = 0;
    const bare = await classifyAdvisorQuery('23 aug 1990');
    check('a bare date is on topic even with no history', bare === 'ON_TOPIC' && modelCalls === 0, `calls=${modelCalls}`);

    modelCalls = 0;
    await classifyAdvisorQuery('write python code for a linked list', [{ role: 'assistant', content: 'How can I help you today?', id: 'welcome-1' }]);
    check('the page greeting does not wave everything through', modelCalls > 0, `calls=${modelCalls}`);
  } finally {
    globalThis.fetch = realFetch;
    if (savedGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = savedGroqKey;
  }

  console.log('\n— the advisor tools —');
  {
    const saved: Record<string, unknown>[] = [];
    const session = createAdvisorSession(async () => 'plan', {
      uid: 'user-1',
      updateProfileFn: async (_uid, updates) => { saved.push(updates); },
      loadSchemesFn: async () => [],
      saveLastPlanFn: async () => {},
      loadLastPlanFn: async () => null,
    });
    const ok = (await session.toolHandler('updateProfile', { dob: '23 aug 1990', state: '' }, { uid: 'user-1' })) as Record<string, unknown>;
    check('updateProfile saves the date of birth', ok.success === true && saved[0]?.dob === '1990-08-23' && !('state' in (saved[0] || {})),
      JSON.stringify(ok));
    const bad = (await session.toolHandler('updateProfile', { dob: 'yesterday' }, { uid: 'user-1' })) as Record<string, unknown>;
    check('an unreadable value is reported back instead of saved',
      bad.success === false && !!(bad.notSaved as Record<string, string>)?.dob && saved.length === 1, JSON.stringify(bad));
  }
  {
    let plansSaved = 0;
    const session = createAdvisorSession(async () => `plan-${++plansSaved}`, {
      uid: 'user-2',
      updateProfileFn: async () => {},
      loadSchemesFn: async () => [],
      saveLastPlanFn: async () => {},
      loadLastPlanFn: async () => null,
    });
    await session.toolHandler('calculateFinancials', { businessType: 'Dairy', equipmentCost: 8000, unitPrice: 60, unitsSoldPerMonth: 300 }, null);
    await session.toolHandler('saveGeneratedPlan', { title: 'Dairy' }, { uid: 'user-2', district: 'Nagaon', state: 'Assam' });
    await session.toolHandler('saveGeneratedPlan', { title: 'Dairy' }, { uid: 'user-2' });
    check('a plan is saved once even if the save is replayed', plansSaved === 1, `saved ${plansSaved} times`);
  }
  {
    const session = createAdvisorSession(async () => 'plan', { uid: null, loadSchemesFn: async () => [] });
    const result = (await session.toolHandler('calculateFinancials', {
      planType: 'existing_expansion',
      currentMonthlyRevenue: 60000,
      currentMonthlyExpenses: 40000,
      expansionEquipmentCost: 50000,
      availableSavings: 20000,
    }, null)) as Record<string, number>;
    check('an existing business is calculated as an expansion', result.currentMonthlyProfit === 20000, JSON.stringify(result));
  }

  console.log('\n— calculator and matcher safety —');
  {
    const plan = calculateFinancialPlan({
      businessType: 'Dairy', equipmentCost: -50000, setupCost: 2000, availableSavings: '12,000',
    } as unknown as PlanInputs);
    check('a negative cost is treated as zero', plan.totalInitialCost === 2000 && plan.fundingGap === 0, JSON.stringify(plan));
  }
  {
    const plan = calculateFinancialPlan({
      businessType: 'Dairy', planType: 'startup', equipmentCost: 8000, setupCost: 2000, initialInventory: 2000,
      workingCapitalReserve: 1625, availableSavings: 12000, unitPrice: 60, unitsSoldPerMonth: 3000,
      monthlyRawMaterials: 800, monthlyRentUtilities: 300, monthlyLabor: 200,
    } as unknown as PlanInputs);
    check('a 99% margin is flagged as unrealistic', getPlausibilityWarnings(plan).some((w) => w.code === 'very_high_margin'));
  }
  {
    const openScheme = {
      id: 'open', name: 'Open scheme', isActive: true, governmentLevel: 'central', targetBusinessTypes: [],
    } as unknown as Scheme;
    let matches: ReturnType<typeof matchSchemesForProfile> = [];
    let threw = false;
    try {
      matches = matchSchemesForProfile([openScheme], { state: 'Assam', businessType: 'Tailoring', businessStatus: 'planning' });
    } catch {
      threw = true;
    }
    check('a scheme open to all trades, with no eligibility block, matches without crashing', !threw && matches.length === 1);
  }
  check('a state is found from a city in the location line',
    findRegionInText('Kalindi Housing Estate, Kolkata') === 'West Bengal', findRegionInText('Kalindi Housing Estate, Kolkata'));

  console.log(failed === 0 ? '\nAll advisor profile checks passed.' : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

void (null as unknown as Firestore);
main();

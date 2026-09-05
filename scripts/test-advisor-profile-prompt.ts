/**
 * Asserts the advisor is told to gather missing profile data, and told to stop
 * once it is complete.
 *
 * Regression guard: signup deliberately collects almost nothing and the profile
 * was meant to fill in through conversation, but the advisor never asked. An
 * empty profile object is still truthy, so the prompt rendered its "profile
 * known" branch with placeholder defaults — "Village/Town, District, India",
 * "General Micro-Enterprise", "₹0" — that the model could not tell apart from
 * real answers. It had no idea anything was missing.
 *
 *   npx tsx scripts/test-advisor-profile-prompt.ts
 */
// The prompt builder reuses calculateProfileCompleteness, which lives beside
// the Firestore user helpers and so pulls in Firebase client initialisation.
// Loading the env keeps that import from throwing in a bare node process; no
// network call is made by anything under test here.
import * as fs from 'fs';
import * as path from 'path';
const envFile = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

import { buildAdvisorSystemPrompt } from '../src/lib/prompts/advisor';
import type { UserProfile } from '../src/types';

let failed = 0;
function check(name: string, condition: boolean, detail = '') {
  if (!condition) failed++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail && !condition ? ` — ${detail}` : ''}`);
}

// A freshly signed-up user: the row exists, almost nothing is filled in.
const emptyProfile: Partial<UserProfile> = {
  uid: 'u1',
  name: 'Ramesh Kumar',
  email: 'ramesh@example.com',
};

const complete: Partial<UserProfile> = {
  uid: 'u2',
  name: 'Sita Devi',
  email: 'sita@example.com',
  state: 'Assam',
  district: 'Nagaon',
  locality: 'Dhing',
  businessStatus: 'planning',
  businessCategory: 'Agro & Livestock',
  businessType: 'Poultry Broiler Unit',
  businessExperience: '1-3 years',
  availableCapital: 80000,
  desiredFunding: 120000,
  dob: '1990-04-12',
  existingLoans: false,
};

console.log('— fresh signup, nearly empty profile —');
const bare = buildAdvisorSystemPrompt(emptyProfile, 'en');

// Match the block header itself: the guardrail section references the phrase
// by name, so a bare substring test passes even when nothing is missing.
check('flags that information is missing', bare.includes('MISSING PROFILE INFORMATION — STILL NEEDED'));
check('instructs the model to ask', /ask/i.test(bare));
check('names the missing capital field', /Available Capital/i.test(bare));
check('marks absent fields as not provided', bare.includes('NOT PROVIDED'));
check('caps how much it asks at once', /AT MOST TWO/i.test(bare));
check('tells it to save answers via updateProfile', bare.includes('updateProfile'));
check('instructs first-message pacing before asking questions', /practical advice on their stated business idea FIRST/i.test(bare));
check('instructs that corrections trigger updateProfile in missing branch', /corrections always trigger `?updateProfile`?/i.test(bare));
check('forbids silently using outdated values in missing branch', /never silently\s+keep using an outdated value/i.test(bare));

// The defaults that hid the problem must not come back.
check('no fake location default', !bare.includes('Village/Town, District, India'),
  'placeholder location still rendered as though real');
check('no fake business-type default', !bare.includes('General Micro-Enterprise'),
  'unset business type still reads as a real answer');
check('does not assert zero capital', !/Available Capital \(Savings\): ₹0\b/.test(bare),
  'unset capital still asserted as ₹0');
check('does not assert a business status', !/Business Status: (Planning to Start|Currently Running)/.test(bare),
  'unset status still asserted');

console.log('\n— fully completed profile —');
const full = buildAdvisorSystemPrompt(complete, 'en');

check('reports the profile as complete', full.includes('PROFILE COMPLETE'));
check('does not list missing fields', !full.includes('MISSING PROFILE INFORMATION — STILL NEEDED'));
check('tells it to stop asking', /Do NOT ask the user for\s*\nprofile details again|Do NOT ask/i.test(full));
check('clarifies stopping proactive questions does not mean ignore corrections', /does NOT mean ignore corrections/i.test(full));
check('instructs model MUST call updateProfile on correction in complete branch', /you MUST call `?updateProfile`? again with the corrected value/i.test(full));
check('forbids silently using outdated values in complete branch', /never silently\s+keep using an outdated value/i.test(full));
check('renders real values', full.includes('Nagaon') && full.includes('Poultry Broiler Unit'));
check('no NOT PROVIDED markers remain', !full.includes('NOT PROVIDED'));

console.log('\n— fine-tuning instructions & guardrails —');
check('guardrail instructs updateProfile on reveal or correct', /reveal or correct/i.test(full));
check('includes concrete negative-feedback pushback example', /Example of constructive pushback:/i.test(full));

console.log('\n— api route tool description —');
const routePath = path.resolve(process.cwd(), 'src/app/api/advisor/route.ts');
const routeContent = fs.readFileSync(routePath, 'utf8');
check('updateProfile tool description explicitly instructs on corrections',
  routeContent.includes('This includes corrections') &&
  routeContent.includes('Never continue using an old value'));

console.log('\n— no profile at all —');
const none = buildAdvisorSystemPrompt(null, 'en');
check('still asks clarifying questions', /clarifying questions/i.test(none));
check('instructs practical guidance first for null profile', /guidance on their business idea first/i.test(none));

console.log(`\n${failed === 0 ? 'All advisor profile-prompt assertions passed.' : `${failed} assertion(s) FAILED.`}`);
process.exit(failed === 0 ? 0 : 1);


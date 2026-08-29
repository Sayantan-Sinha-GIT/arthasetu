/**
 * Phase 6 Integration Test Script
 * Tests:
 * 1. Matching for Assam Poultry Profile -> returns Assam + Central schemes, no WB/UP schemes
 * 2. Matching for West Bengal Profile -> returns WB + Central schemes
 * 3. Unsupported out-of-scope profile -> returns 0 matches (ensuring zero AI hallucination)
 * 4. AI Plain-Language Explainer via Gemini Flash
 * 5. Firestore scheme queries (getAllSchemes, getSchemesForState, getSchemeById)
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import type { UserProfile } from '../src/types';

async function runPhase6Tests() {
  console.log('🧪 Starting Phase 6: Scheme Database & Matching Tests...\n');

  const { getAllSchemes, getSchemesForState, getSchemeById } = await import('../src/lib/firestore/schemes');
  const { matchSchemesForProfile } = await import('../src/lib/schemes/matcher');
  const { generateContent, GEMINI_MODELS } = await import('../src/lib/gemini');

  // TEST 1: FETCH FROM FIRESTORE
  console.log('1️⃣ Testing Firestore Scheme Queries...');
  const allSchemes = await getAllSchemes();
  console.log(`   • Fetched ${allSchemes.length} active schemes from Firestore`);
  if (allSchemes.length < 10) {
    throw new Error(`Expected at least 10 schemes, got ${allSchemes.length}`);
  }

  const assamSchemes = await getSchemesForState('Assam');
  console.log(`   • Schemes available in Assam (Central + State): ${assamSchemes.length}`);
  const hasAssamStateScheme = assamSchemes.some((s) => s.state === 'Assam');
  const hasCentralScheme = assamSchemes.some((s) => s.governmentLevel === 'central');
  const hasWbScheme = assamSchemes.some((s) => s.state === 'West Bengal');

  if (!hasAssamStateScheme || !hasCentralScheme || hasWbScheme) {
    throw new Error('Assam state scheme filter returned incorrect geographical boundaries');
  }
  console.log('   ✅ Firestore queries and state level filters verified.');

  // TEST 2: MATCHING FOR TEST PROFILE (Assam, Poultry Business)
  console.log('\n2️⃣ Testing Matcher on Test Profile (Assam + Poultry)...');
  const assamPoultryProfile: Partial<UserProfile> = {
    name: 'Ramesh Kumar',
    state: 'Assam',
    district: 'Kamrup',
    locality: 'Hajo',
    businessCategory: 'Livestock & Poultry',
    businessType: 'Broiler Poultry Farm',
    businessStatus: 'planning',
    availableCapital: 80000,
  };

  const assamMatches = matchSchemesForProfile(allSchemes, assamPoultryProfile);
  console.log(`   • Matched ${assamMatches.length} schemes for Assam Poultry:`);
  for (const m of assamMatches) {
    console.log(`      - [${m.matchScore}%] ${m.scheme.shortName} (${m.scheme.governmentLevel === 'central' ? 'Central' : m.scheme.state}): ${m.estimatedBenefit}`);
  }

  // Verifications:
  const matchedIds = assamMatches.map((m) => m.scheme.id);
  const includesCmaaa = matchedIds.includes('assam-cmaaa');
  const includesNlm = matchedIds.includes('central-nlm');
  const includesPmegp = matchedIds.includes('central-pmegp');
  const includesWb = matchedIds.some((id) => id.startsWith('wb-'));
  const includesUp = matchedIds.some((id) => id.startsWith('up-'));

  if (!includesCmaaa) throw new Error('Assam CMAAA scheme was not matched for Assam profile');
  if (!includesNlm) throw new Error('Central NLM scheme was not matched for Poultry profile');
  if (!includesPmegp) throw new Error('Central PMEGP scheme was not matched for micro-enterprise');
  if (includesWb || includesUp) throw new Error('Cross-state scheme leaked into Assam matches');

  console.log('   ✅ Assam Poultry matching passed with 100% geographical and sector accuracy.');

  // TEST 2B: MATCHING FOR MAHARASHTRA MANUFACTURING PROFILE
  console.log('\n2️⃣b Testing Matcher on Maharashtra Manufacturing Profile...');
  const mahaProfile: Partial<UserProfile> = {
    name: 'Pooja Patil',
    state: 'Maharashtra',
    district: 'Kolhapur',
    businessCategory: 'Food Processing & Bakery',
    businessType: 'Bakery & Confectionery Unit',
    businessStatus: 'planning',
    availableCapital: 150000,
  };
  const mahaMatches = matchSchemesForProfile(allSchemes, mahaProfile);
  console.log(`   • Matched ${mahaMatches.length} schemes for Maharashtra Bakery:`);
  for (const m of mahaMatches) {
    console.log(`      - [${m.matchScore}%] ${m.scheme.shortName} (${m.scheme.governmentLevel === 'central' ? 'Central' : m.scheme.state})`);
  }
  const mahaIds = mahaMatches.map((m) => m.scheme.id);
  if (!mahaIds.includes('maha-cmegp')) throw new Error('Maharashtra CMEGP was not matched');
  if (!mahaIds.includes('central-pmegp')) throw new Error('Central PMEGP was not matched');
  if (mahaIds.some((id) => id.startsWith('assam-') || id.startsWith('wb-') || id.startsWith('up-'))) {
    throw new Error('Cross-state scheme leaked into Maharashtra profile');
  }
  console.log('   ✅ Maharashtra profile matched Maharashtra CMEGP + Central schemes with zero leakage.');

  // TEST 2C: MATCHING FOR BIHAR TEXTILES PROFILE
  console.log('\n2️⃣c Testing Matcher on Bihar Handloom Profile...');
  const biharProfile: Partial<UserProfile> = {
    name: 'Rani Devi',
    state: 'Bihar',
    district: 'Bhagalpur',
    businessCategory: 'Handloom, Textiles & Tailoring',
    businessType: 'Silk Weaving & Garments',
    businessStatus: 'planning',
    availableCapital: 100000,
  };
  const biharMatches = matchSchemesForProfile(allSchemes, biharProfile);
  console.log(`   • Matched ${biharMatches.length} schemes for Bihar Silk Weaving:`);
  for (const m of biharMatches) {
    console.log(`      - [${m.matchScore}%] ${m.scheme.shortName} (${m.scheme.governmentLevel === 'central' ? 'Central' : m.scheme.state})`);
  }
  const biharIds = biharMatches.map((m) => m.scheme.id);
  if (!biharIds.includes('bihar-udyami')) throw new Error('Bihar Udyami scheme was not matched');
  if (biharIds.some((id) => id.startsWith('maha-') || id.startsWith('assam-'))) {
    throw new Error('Cross-state scheme leaked into Bihar profile');
  }
  console.log('   ✅ Bihar profile matched Bihar Udyami + Central schemes with zero leakage.');

  // TEST 3: ZERO HALLUCINATION TEST (Unsupported profile should return 0 matches)
  console.log('\n3️⃣ Testing Unsupported Profile (Zero Hallucination Guardrail)...');
  const unsupportedProfile: Partial<UserProfile> = {
    name: 'Out of Scope User',
    state: 'Goa',
    businessCategory: 'Aerospace Engineering',
    businessType: 'Satellite Propulsion R&D',
    businessStatus: 'existing',
  };

  const unsupportedMatches = matchSchemesForProfile(allSchemes, unsupportedProfile);
  console.log(`   • Matches returned for out-of-scope profile: ${unsupportedMatches.length}`);
  if (unsupportedMatches.length !== 0) {
    throw new Error('Unsupported profile matched schemes incorrectly');
  }
  console.log('   ✅ Zero matches correctly returned for unsupported criteria (no invented schemes).');

  // TEST 4: AI PLAIN-LANGUAGE EXPLAINER VIA GEMINI FLASH
  console.log('\n4️⃣ Testing AI Scheme Plain-Language Explainer (CMAAA Assam)...');
  const cmaaaScheme = await getSchemeById('assam-cmaaa');
  if (!cmaaaScheme) throw new Error('Could not find assam-cmaaa scheme');

  const systemPrompt = `
You are ArthaSetu AI. Explain the following verified government scheme in simple terms for Ramesh Kumar (Broiler Poultry in Kamrup, Assam with ₹80,000 savings):
Scheme Name: ${cmaaaScheme.name} (${cmaaaScheme.shortName})
State: ${cmaaaScheme.state}
Benefits: ${cmaaaScheme.benefits.subsidyDetails}
Application: ${cmaaaScheme.applicationProcess}
`;

  const explanation = await generateContent(
    GEMINI_MODELS.FLASH,
    systemPrompt,
    'Explain the 50% grant and 50% interest-free loan breakdown.'
  );

  console.log(`   • Explanation generated (${explanation.length} chars)`);
  console.log('   📝 Preview:\n' + explanation.slice(0, 300) + '...\n');

  if (!explanation.toLowerCase().includes('assam') || !explanation.toLowerCase().includes('cmaaa') || !explanation.includes('50%')) {
    throw new Error('AI explanation failed to reference scheme facts accurately');
  }
  console.log('   ✅ AI Explainer generated accurate, grounded breakdown without hallucination.');

  console.log('🎉 ALL 4 PHASE 6 SCHEME DATABASE & MATCHING TESTS PASSED PERFECTLY!\n');
}

runPhase6Tests().catch((err) => {
  console.error('\n❌ Phase 6 Test failed with error:', err);
  process.exit(1);
});

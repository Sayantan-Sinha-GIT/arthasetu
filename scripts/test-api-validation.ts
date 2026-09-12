/**
 * Test API Input Validation Schemas
 * Run: npx tsx scripts/test-api-validation.ts
 */
import {
  planInputsSchema,
  plannerRouteSchema,
  translateMessageSchema,
  ttsRouteSchema,
  pincodeRouteSchema,
  aiPlannerNarrativeSchema,
} from '../src/lib/validation/api-schemas';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

console.log('Testing Zod API Validation Schemas...\n');

// 1. PIN code validation
const validPincode = pincodeRouteSchema.safeParse({ pincode: '700001' });
assert(validPincode.success, 'Valid PIN code passes');

const invalidPincode = pincodeRouteSchema.safeParse({ pincode: '012345' });
assert(!invalidPincode.success, 'Invalid PIN code (starts with 0) rejected');

const shortPincode = pincodeRouteSchema.safeParse({ pincode: '7000' });
assert(!shortPincode.success, 'Short PIN code rejected');

// 2. TTS route validation
const validTts = ttsRouteSchema.safeParse({ text: 'Namaste', language: 'hi' });
assert(validTts.success, 'Valid TTS payload passes');

const emptyTts = ttsRouteSchema.safeParse({ text: '', language: 'hi' });
assert(!emptyTts.success, 'Empty TTS text rejected');

// 3. Translate message validation
const validTranslate = translateMessageSchema.safeParse({ texts: ['Hello'], targetLangCode: 'hi' });
assert(validTranslate.success, 'Valid translation payload passes');

const emptyTranslate = translateMessageSchema.safeParse({ texts: [], targetLangCode: 'hi' });
assert(!emptyTranslate.success, 'Empty translations array rejected');

// 4. Plan inputs validation
const validPlan = planInputsSchema.safeParse({
  businessType: 'Dairy Farm',
  location: 'Bihar',
  equipmentCost: 50000,
});
assert(validPlan.success, 'Valid plan inputs pass');

const invalidNegativePlan = planInputsSchema.safeParse({
  businessType: 'Dairy Farm',
  location: 'Bihar',
  equipmentCost: -50000,
});
assert(!invalidNegativePlan.success, 'Negative equipment cost rejected');

// 5. AI narrative validation
const validNarrative = aiPlannerNarrativeSchema.safeParse({
  executiveSummary: 'This is a viable financial model for micro enterprise.',
  keyAssumptions: ['Stable demand'],
  riskAnalysis: ['Price surges'],
  actionableNextSteps: ['Apply for loan'],
});
assert(validNarrative.success, 'Valid AI narrative passes');

console.log('\nAll API validation tests passed successfully!');

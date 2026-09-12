/**
 * Checks the API request schemas against the payloads the app really sends.
 * The same cases run under Vitest in tests/unit/api-validation.test.ts.
 *
 *   npx tsx scripts/test-api-validation.ts
 */
import {
  plannerRequestSchema,
  translateRequestSchema,
  ttsRequestSchema,
  pinCodeSchema,
} from '../src/lib/validation/api-schemas';

let failed = 0;
function check(name: string, ok: boolean) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

check('a valid PIN code passes', pinCodeSchema.safeParse('700001').success);
check('a PIN code starting with 0 is rejected', !pinCodeSchema.safeParse('012345').success);

check('the read-aloud payload passes', ttsRequestSchema.safeParse({ text: 'Namaste', langCode: 'hi' }).success);
check('blank read-aloud text is rejected', !ttsRequestSchema.safeParse({ text: ' ', langCode: 'hi' }).success);

check('a batch translation passes', translateRequestSchema.safeParse({ texts: ['Hello'], targetLangCode: 'hi' }).success);
check('a translation without a language is rejected', !translateRequestSchema.safeParse({ text: 'Hello' }).success);

const planner = plannerRequestSchema.safeParse({
  inputs: { businessType: 'Dairy Farm', location: 'Bihar', monthlyRentUtilities: 3000 },
  calculatedValues: { monthlyNetProfit: 12000 },
  userProfile: null,
});
check('the planner payload passes and keeps its fields',
  planner.success && planner.data.inputs.monthlyRentUtilities === 3000 && planner.data.language === 'en');
check('a plan without a business type is rejected', !plannerRequestSchema.safeParse({
  inputs: { location: 'Bihar' },
  calculatedValues: {},
}).success);

console.log(failed === 0 ? '\nAll API validation checks passed.' : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);

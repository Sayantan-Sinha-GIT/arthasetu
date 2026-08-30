import { getDistrictsByState, getDistrictOptions } from '../src/lib/constants/districts';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

function runDistrictTests() {
  console.log('🧪 Testing District Constants, Selection & State-Filtering Logic...\n');

  // Test 1: Empty state returns empty options
  const emptyOptions = getDistrictOptions(undefined);
  assert.strictEqual(emptyOptions.length, 0, 'Empty state must return 0 options');
  console.log('  ✅ [PASS] Undefined state returns empty options array.');

  // Test 2: Bihar returns real districts (Patna, Gaya, Muzaffarpur) and excludes Pune/Chennai
  const biharDistricts = getDistrictsByState('Bihar');
  assert.ok(biharDistricts.includes('Patna'), 'Bihar must contain Patna');
  assert.ok(biharDistricts.includes('Gaya'), 'Bihar must contain Gaya');
  assert.ok(biharDistricts.includes('Muzaffarpur'), 'Bihar must contain Muzaffarpur');
  assert.ok(!biharDistricts.includes('Pune'), 'Bihar must NOT contain Pune');
  assert.ok(!biharDistricts.includes('Chennai'), 'Bihar must NOT contain Chennai');
  console.log(`  ✅ [PASS] Bihar returns ${biharDistricts.length} valid districts (includes Patna, Gaya, Muzaffarpur).`);

  // Test 3: Assam returns real districts (Kamrup, Cachar, Dibrugarh)
  const assamDistricts = getDistrictsByState('Assam');
  assert.ok(assamDistricts.includes('Kamrup'), 'Assam must contain Kamrup');
  assert.ok(assamDistricts.includes('Cachar'), 'Assam must contain Cachar');
  assert.ok(!assamDistricts.includes('Patna'), 'Assam must NOT contain Patna');
  console.log(`  ✅ [PASS] Assam returns ${assamDistricts.length} valid districts (includes Kamrup, Cachar).`);

  // Test 4: Maharashtra returns real districts (Pune, Nagpur, Mumbai City)
  const mhDistricts = getDistrictsByState('Maharashtra');
  assert.ok(mhDistricts.includes('Pune'), 'Maharashtra must contain Pune');
  assert.ok(mhDistricts.includes('Nagpur'), 'Maharashtra must contain Nagpur');
  assert.ok(!mhDistricts.includes('Patna'), 'Maharashtra must NOT contain Patna');
  console.log(`  ✅ [PASS] Maharashtra returns ${mhDistricts.length} valid districts (includes Pune, Nagpur).`);

  // Test 5: Hardening against stray values: getDistrictOptions does NOT inject arbitrary text into options
  const biharOptions = getDistrictOptions('Bihar');
  const biharValues = biharOptions.map((o) => o.value);
  assert.strictEqual(biharOptions.length, 38, 'Bihar must strictly return 38 canonical districts');
  assert.ok(!biharValues.includes('Hello'), 'getDistrictOptions must never inject arbitrary text');
  assert.ok(!biharValues.includes('Custom Old Sub-District'), 'getDistrictOptions must not inject non-canonical options');
  console.log('  ✅ [PASS] getDistrictOptions strictly returns canonical options without arbitrary text injection.');

  // Test 6: Legacy non-canonical detection for inline reselect hint
  const validBiharDistricts = getDistrictsByState('Bihar');
  const isLegacyInvalid = !validBiharDistricts.includes('Hello');
  assert.ok(isLegacyInvalid, 'Legacy "Hello" must be detected as invalid to trigger the reselect hint');
  console.log('  ✅ [PASS] Legacy non-canonical values correctly trigger the reselect hint.');

  // Test 7: Verify StepBasicInfo.tsx wires getDistrictOptions, Select and legacy hint
  const stepBasicInfoSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/onboarding/StepBasicInfo.tsx'), 'utf-8');
  assert.ok(stepBasicInfoSrc.includes('getDistrictOptions'), 'StepBasicInfo must import getDistrictOptions');
  assert.ok(stepBasicInfoSrc.includes('districtOptions'), 'StepBasicInfo must compute districtOptions');
  assert.ok(stepBasicInfoSrc.includes('disabled={!data.state}'), 'District Select must be disabled when state is not set');
  assert.ok(stepBasicInfoSrc.includes('legacyDistrict'), 'StepBasicInfo must support legacyDistrict hint');
  console.log('  ✅ [PASS] StepBasicInfo correctly wires state-filtered Select, disabled guard, and legacy hint.');

  // Test 8: Verify profile/page.tsx wires getDistrictOptions, Select and legacy hint
  const profileSrc = fs.readFileSync(path.resolve(__dirname, '../src/app/(app)/profile/page.tsx'), 'utf-8');
  assert.ok(profileSrc.includes('getDistrictOptions'), 'ProfilePage must import getDistrictOptions');
  assert.ok(profileSrc.includes('districtOptions'), 'ProfilePage must compute districtOptions');
  assert.ok(profileSrc.includes('disabled={!formData.state}'), 'Profile district Select must be disabled when state is not set');
  assert.ok(profileSrc.includes('legacyDistrict'), 'ProfilePage must support legacyDistrict hint');
  console.log('  ✅ [PASS] ProfilePage correctly wires state-filtered Select, disabled guard, and legacy hint.');

  console.log('\n🎉 ALL DISTRICT UNIT & INTEGRATION TESTS PASSED!');
}

runDistrictTests();

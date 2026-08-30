import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { getDistrictsByState, getDistrictOptions } from '../src/lib/constants/districts';

function testPhase12() {
  console.log('🚀 Running Phase 12 Test Suite: District Select Hardening + Global Background Video...\n');

  // ──────────────────────────────────────────────────────────────────────────
  // 1. District Hardening Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔍 1. Verifying District Select Logic & Legacy Handling...');

  // (a) getDistrictOptions returns strictly canonical options
  const upDistricts = getDistrictOptions('Uttar Pradesh');
  assert.strictEqual(upDistricts.length, 75, 'Uttar Pradesh must have exactly 75 districts');
  const upValues = upDistricts.map((d) => d.value);
  assert.ok(upValues.includes('Varanasi'), 'UP must contain Varanasi');
  assert.ok(upValues.includes('Lucknow'), 'UP must contain Lucknow');
  assert.ok(!upValues.includes('Hello'), 'Canonical list must never contain "Hello"');
  assert.ok(!upValues.includes('Custom Dist'), 'Canonical list must never contain non-canonical text');

  // (b) Undefined state returns empty
  assert.strictEqual(getDistrictOptions(undefined).length, 0);

  // (c) Detection of legacy free-text values
  const legacyTestVal = 'Hello';
  const biharDistricts = getDistrictsByState('Bihar');
  const isLegacyInvalid = !biharDistricts.includes(legacyTestVal);
  assert.ok(isLegacyInvalid, 'Arbitrary text "Hello" must be flagged as non-canonical');

  // (d) StepBasicInfo.tsx validation
  const stepBasicInfoFile = fs.readFileSync(
    path.resolve(__dirname, '../src/components/onboarding/StepBasicInfo.tsx'),
    'utf-8'
  );
  assert.ok(stepBasicInfoFile.includes('getDistrictOptions(data.state)'), 'StepBasicInfo must compute canonical options without arbitrary injection');
  assert.ok(stepBasicInfoFile.includes('legacyDistrict'), 'StepBasicInfo must support legacyDistrict prop');
  assert.ok(stepBasicInfoFile.includes('onClearLegacyDistrict'), 'StepBasicInfo must support onClearLegacyDistrict handler');
  assert.ok(!stepBasicInfoFile.includes('<datalist'), 'StepBasicInfo must NOT contain datalist');
  assert.ok(!stepBasicInfoFile.includes('list='), 'StepBasicInfo must NOT use input list');

  // (e) profile/page.tsx validation
  const profileFile = fs.readFileSync(
    path.resolve(__dirname, '../src/app/(app)/profile/page.tsx'),
    'utf-8'
  );
  assert.ok(profileFile.includes('getDistrictOptions(formData.state)'), 'Profile must compute canonical options');
  assert.ok(profileFile.includes('legacyDistrict'), 'Profile must have legacyDistrict state');
  assert.ok(profileFile.includes('getDistrictsByState(profile.state)'), 'Profile must validate district against canonical list on load');
  assert.ok(!profileFile.includes('<datalist'), 'Profile must NOT contain datalist');
  assert.ok(!profileFile.includes('list='), 'Profile must NOT use input list');

  // (f) onboarding/page.tsx validation
  const onboardingFile = fs.readFileSync(
    path.resolve(__dirname, '../src/app/(app)/onboarding/page.tsx'),
    'utf-8'
  );
  assert.ok(onboardingFile.includes('legacyDistrict'), 'Onboarding must have legacyDistrict state');
  assert.ok(onboardingFile.includes('getDistrictsByState(existing.state)'), 'Onboarding must validate district on profile load');

  console.log('   ✅ District hardening and legacy handling verified.');

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SeamlessBackgroundVideo Component Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 2. Verifying SeamlessBackgroundVideo Component...');
  const seamlessVideoFile = fs.readFileSync(
    path.resolve(__dirname, '../src/components/ui/SeamlessBackgroundVideo.tsx'),
    'utf-8'
  );
  assert.ok(seamlessVideoFile.includes('videoARef'), 'SeamlessBackgroundVideo must have videoARef');
  assert.ok(seamlessVideoFile.includes('videoBRef'), 'SeamlessBackgroundVideo must have videoBRef');
  assert.ok(seamlessVideoFile.includes('scheduleCrossfade'), 'SeamlessBackgroundVideo must schedule crossfade');
  assert.ok(seamlessVideoFile.includes('attachTimeUpdateListener'), 'SeamlessBackgroundVideo must have attachTimeUpdateListener');
  assert.ok(seamlessVideoFile.includes('loadedmetadata'), 'SeamlessBackgroundVideo must listen for loadedmetadata before bailing');
  assert.ok(seamlessVideoFile.includes('loop'), 'SeamlessBackgroundVideo must have native loop fallback');
  assert.ok(seamlessVideoFile.includes('prefers-reduced-motion'), 'SeamlessBackgroundVideo must check prefers-reduced-motion');
  assert.ok(seamlessVideoFile.includes('fixed inset-0 w-full h-full object-cover'), 'SeamlessBackgroundVideo must use object-cover sizing');
  assert.ok(!seamlessVideoFile.includes('object-contain'), 'SeamlessBackgroundVideo must never use object-contain');
  assert.ok(seamlessVideoFile.includes('pointer-events-none'), 'SeamlessBackgroundVideo must be pointer-events-none');
  console.log('   ✅ SeamlessBackgroundVideo component structure verified.');

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PageBackgroundVideo Component Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 3. Verifying PageBackgroundVideo Component & Scrim...');
  const pageVideoFile = fs.readFileSync(
    path.resolve(__dirname, '../src/components/ui/PageBackgroundVideo.tsx'),
    'utf-8'
  );
  assert.ok(pageVideoFile.includes("pathname === '/'"), 'PageBackgroundVideo must exclude homepage route "/"');
  assert.ok(pageVideoFile.includes('/videos/dark-mode-video.mp4'), 'PageBackgroundVideo must use dark mode video');
  assert.ok(pageVideoFile.includes('/videos/light-mode-video.mp4'), 'PageBackgroundVideo must use light mode video');
  assert.ok(pageVideoFile.includes('bg-background/80'), 'PageBackgroundVideo must use dark scrim overlay');
  assert.ok(pageVideoFile.includes('bg-background/85'), 'PageBackgroundVideo must use light scrim overlay');
  assert.ok(pageVideoFile.includes('key={theme}'), 'PageBackgroundVideo must use key={theme} for clean remount');
  console.log('   ✅ PageBackgroundVideo component and route exclusion verified.');

  // ──────────────────────────────────────────────────────────────────────────
  // 4. RootLayout Mounting Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 4. Verifying RootLayout Mount Point in Providers...');
  const layoutFile = fs.readFileSync(
    path.resolve(__dirname, '../src/app/layout.tsx'),
    'utf-8'
  );
  assert.ok(layoutFile.includes('<PageBackgroundVideo />'), 'RootLayout must mount PageBackgroundVideo');
  assert.ok(layoutFile.indexOf('<Providers>') < layoutFile.indexOf('<PageBackgroundVideo />') &&
            layoutFile.indexOf('<PageBackgroundVideo />') < layoutFile.indexOf('</Providers>'),
            'PageBackgroundVideo must be mounted inside Providers');
  console.log('   ✅ RootLayout mounting inside Providers verified.');

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Video Asset Existence
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 5. Verifying Video Asset Files...');
  const darkVideoPath = path.resolve(__dirname, '../public/videos/dark-mode-video.mp4');
  const lightVideoPath = path.resolve(__dirname, '../public/videos/light-mode-video.mp4');
  assert.ok(fs.existsSync(darkVideoPath), 'dark-mode-video.mp4 must exist in public/videos');
  assert.ok(fs.existsSync(lightVideoPath), 'light-mode-video.mp4 must exist in public/videos');
  const darkStats = fs.statSync(darkVideoPath);
  const lightStats = fs.statSync(lightVideoPath);
  assert.ok(darkStats.size > 100000, 'dark-mode-video.mp4 must be valid video file');
  assert.ok(lightStats.size > 100000, 'light-mode-video.mp4 must be valid video file');
  console.log(`   ✅ Video assets found (Dark: ${(darkStats.size/1024/1024).toFixed(2)} MB, Light: ${(lightStats.size/1024/1024).toFixed(2)} MB).`);

  console.log('\n🎉 ALL PHASE 12 STATIC & LOGIC CHECKS PASSED PERFECTLY!\n');
}

testPhase12();

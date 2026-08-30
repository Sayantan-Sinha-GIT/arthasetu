import { chromium } from 'playwright';
import * as assert from 'assert';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function runPhase13Verification() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 PHASE 13 FULL E2E SUITE: ADMIN DELETE + NETWORK ADAPTIVE SYSTEM');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. Full Network Quality (Default / Fast connection)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📡 1. Testing Default Full Network Quality...');
    const fullContext = await browser.newContext();
    const fullPage = await fullContext.newPage();
    await fullPage.goto('http://localhost:3000');
    await fullPage.waitForTimeout(1000);

    // Verify full quality elements on landing page
    const marqueeCount = await fullPage.locator('.marquee-track').count();
    const parallaxCount = await fullPage.locator('.parallax-band').count();
    console.log(`   • Marquee ticker rendered: ${marqueeCount > 0} (Expected: true)`);
    console.log(`   • Parallax photo band rendered: ${parallaxCount > 0} (Expected: true)`);
    assert.ok(marqueeCount > 0, 'Marquee must render on full quality');
    assert.ok(parallaxCount > 0, 'Parallax band must render on full quality');

    // Check inner page for background video on full quality
    await fullPage.goto('http://localhost:3000/schemes');
    await fullPage.waitForTimeout(1000);
    const videoCount = await fullPage.locator('video').count();
    console.log(`   • Background videos mounted on /schemes: ${videoCount} (Expected: 2)`);
    assert.ok(videoCount >= 1, 'Background video must mount on full quality');
    await fullContext.close();
    console.log('   ✅ Full network quality verified.\n');

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Slow Network / Minimal Quality Emulation (2G / Data Saver)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📶 2. Testing Slow Network / Minimal Quality Emulation (2G / Data Saver)...');
    const slowContext = await browser.newContext();
    await slowContext.addInitScript(`
      const conn = navigator.connection;
      if (conn) {
        Object.defineProperty(conn, 'effectiveType', { get: function() { return '2g'; }, configurable: true });
        Object.defineProperty(conn, 'saveData', { get: function() { return true; }, configurable: true });
        Object.defineProperty(conn, 'downlink', { get: function() { return 0.2; }, configurable: true });
      }
    `);

    const slowPage = await slowContext.newPage();

    // Verify session toast banner appears once on minimal network
    await slowPage.goto('http://localhost:3000');
    await slowPage.waitForTimeout(1000);

    const toastText = await slowPage.locator('text=Data Saver Mode Active').count();
    console.log(`   • Data Saver session banner shown: ${toastText > 0} (Expected: true)`);
    assert.ok(toastText > 0, 'Session toast must show when minimal network is detected');

    // Verify decorative items stripped on landing page
    const slowMarquee = await slowPage.locator('.marquee-track').count();
    const slowParallax = await slowPage.locator('.parallax-band').count();
    const heroImageCount = await slowPage.locator('img[alt*="handloom"]').count();
    console.log(`   • Marquee ticker stripped: ${slowMarquee === 0} (Expected: true)`);
    console.log(`   • Parallax photo band stripped: ${slowParallax === 0} (Expected: true)`);
    console.log(`   • Hero decorative image stripped: ${heroImageCount === 0} (Expected: true)`);
    assert.strictEqual(slowMarquee, 0, 'Marquee must NOT render on minimal network');
    assert.strictEqual(slowParallax, 0, 'Parallax must NOT render on minimal network');
    assert.strictEqual(heroImageCount, 0, 'Hero image must NOT render on minimal network');

    // Verify inner page (/schemes) has ZERO background videos
    await slowPage.goto('http://localhost:3000/schemes');
    await slowPage.waitForTimeout(800);
    const slowVideoCount = await slowPage.locator('video').count();
    console.log(`   • Background videos on /schemes: ${slowVideoCount} (Expected: 0)`);
    assert.strictEqual(slowVideoCount, 0, 'Zero video elements must mount on minimal network');

    // Verify core functionality remains 100% accessible
    const allSchemesTab = slowPage.locator('button', { hasText: 'All Schemes' });
    if (await allSchemesTab.isVisible()) {
      await allSchemesTab.click();
      await slowPage.waitForTimeout(500);
    }
    const schemeHeading = await slowPage.locator('text=Government Schemes').count();
    const schemeCardCount = await slowPage.locator('h3').count();
    console.log(`   • Core Scheme Catalog readable: ${schemeHeading > 0 && schemeCardCount > 0} (Heading: ${schemeHeading > 0}, Schemes: ${schemeCardCount})`);
    assert.ok(schemeHeading > 0, 'Scheme catalog header must be readable');

    // Verify login photo panel on minimal network
    await slowPage.goto('http://localhost:3000/login');
    await slowPage.waitForTimeout(800);
    const loginImgCount = await slowPage.locator('img[alt*="micro-entrepreneur"]').count();
    console.log(`   • Login hero photo stripped: ${loginImgCount === 0} (Expected: true)`);
    assert.strictEqual(loginImgCount, 0, 'Login hero image must NOT render on minimal network');
    await slowContext.close();
    console.log('   ✅ Minimal network quality verified.\n');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Reduced Network Quality Emulation (3G)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📶 3. Testing Reduced Network Quality Emulation (3G)...');
    const reducedContext = await browser.newContext();
    await reducedContext.addInitScript(`
      const conn = navigator.connection;
      if (conn) {
        Object.defineProperty(conn, 'effectiveType', { get: function() { return '3g'; }, configurable: true });
        Object.defineProperty(conn, 'saveData', { get: function() { return false; }, configurable: true });
        Object.defineProperty(conn, 'downlink', { get: function() { return 1.0; }, configurable: true });
      }
    `);

    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto('http://localhost:3000');
    await reducedPage.waitForTimeout(800);

    // Marquee and parallax should be stripped
    const redMarquee = await reducedPage.locator('.marquee-track').count();
    const redParallax = await reducedPage.locator('.parallax-band').count();
    console.log(`   • Marquee stripped on 3G: ${redMarquee === 0} (Expected: true)`);
    console.log(`   • Parallax stripped on 3G: ${redParallax === 0} (Expected: true)`);
    assert.strictEqual(redMarquee, 0, 'Marquee must not render on 3G');
    assert.strictEqual(redParallax, 0, 'Parallax must not render on 3G');

    // Static image is kept but kenburns animation class is removed
    const redKenburns = await reducedPage.locator('.animate-kenburns').count();
    console.log(`   • Ken Burns animation class active: ${redKenburns} (Expected: 0)`);
    assert.strictEqual(redKenburns, 0, 'Ken Burns zoom must be disabled on 3G');

    // Inner page has zero videos
    await reducedPage.goto('http://localhost:3000/schemes');
    await reducedPage.waitForTimeout(800);
    const redVideoCount = await reducedPage.locator('video').count();
    console.log(`   • Background videos on 3G: ${redVideoCount} (Expected: 0)`);
    assert.strictEqual(redVideoCount, 0, 'No videos should mount on 3G');
    await reducedContext.close();
    console.log('   ✅ Reduced network quality verified.\n');

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Manual Data Saver Override via Profile / localStorage
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⚡ 4. Testing Manual Data Saver Override (Profile UI & localStorage persistence)...');
    
    // Provision completed test user via Admin SDK
    const testUserEmail = `datasaver_${Date.now()}@arthasetu.test`;
    const testUserPassword = 'SecurePassword123!';
    const testUser = await adminAuth.createUser({
      email: testUserEmail,
      password: testUserPassword,
      displayName: 'Data Saver Tester',
    });
    await adminDb.collection('users').doc(testUser.uid).set({
      uid: testUser.uid,
      name: 'Data Saver Tester',
      email: testUserEmail,
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Hajo',
      businessStatus: 'planning',
      businessCategory: 'Handloom & Textiles',
      businessType: 'Weaving Unit',
      onboardingComplete: true,
    });

    const manualContext = await browser.newContext();
    const manualPage = await manualContext.newPage();

    // Login via /login
    await manualPage.goto('http://localhost:3000/login');
    await manualPage.waitForTimeout(600);
    await manualPage.fill('input[type="email"]', testUserEmail);
    await manualPage.fill('input[type="password"]', testUserPassword);
    await manualPage.click('button[type="submit"]');
    await manualPage.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to /profile
    await manualPage.goto('http://localhost:3000/profile');
    await manualPage.waitForSelector('text=Data Saver', { timeout: 10000 });

    // Click toggle to enable Data Saver
    const toggleInput = manualPage.locator('input[aria-label="Toggle Data Saver mode"]');
    await toggleInput.click({ force: true });
    await manualPage.waitForTimeout(500);

    // Verify localStorage has 'true'
    const isSavedTrue = await manualPage.evaluate(() => localStorage.getItem('arthasetu-data-saver'));
    console.log(`   • LocalStorage updated to "true": ${isSavedTrue === 'true'} (Expected: true)`);
    assert.strictEqual(isSavedTrue, 'true', 'Toggling on must store "true" in localStorage');

    // Navigate to /schemes and verify zero videos even with fast network
    await manualPage.goto('http://localhost:3000/schemes');
    await manualPage.waitForTimeout(800);
    const manualVideoCount = await manualPage.locator('video').count();
    console.log(`   • Background videos with Data Saver manual override: ${manualVideoCount} (Expected: 0)`);
    assert.strictEqual(manualVideoCount, 0, 'Manual override must force 0 videos');

    // Navigate back to /profile and verify persisted checked state
    await manualPage.goto('http://localhost:3000/profile');
    await manualPage.waitForSelector('text=Data Saver', { timeout: 10000 });
    const toggleChecked = await manualPage.locator('input[aria-label="Toggle Data Saver mode"]').isChecked();
    console.log(`   • Data Saver toggle switch persisted checked: ${toggleChecked} (Expected: true)`);
    assert.ok(toggleChecked, 'Toggle switch must remain checked after reload');

    // Turn off Data Saver
    await manualPage.locator('input[aria-label="Toggle Data Saver mode"]').click({ force: true });
    await manualPage.waitForTimeout(500);
    const isSavedFalse = await manualPage.evaluate(() => localStorage.getItem('arthasetu-data-saver'));
    console.log(`   • LocalStorage updated to "false": ${isSavedFalse === 'false'} (Expected: true)`);
    assert.strictEqual(isSavedFalse, 'false', 'Toggling off must store "false"');

    // Verify background videos resume on /schemes
    await manualPage.goto('http://localhost:3000/schemes');
    await manualPage.waitForTimeout(800);
    const resumedVideos = await manualPage.locator('video').count();
    console.log(`   • Background videos resumed on fast network: ${resumedVideos >= 1} (Count: ${resumedVideos})`);
    assert.ok(resumedVideos >= 1, 'Videos must resume when Data Saver is turned off');

    // Clean up test user
    await adminAuth.deleteUser(testUser.uid);
    await adminDb.collection('users').doc(testUser.uid).delete();

    await manualContext.close();
    console.log('   ✅ Manual Data Saver toggle & persistence verified.\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 ALL PHASE 13 E2E VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('═══════════════════════════════════════════════════════════════');
  } finally {
    await browser.close();
  }
}

runPhase13Verification().catch((err) => {
  console.error('Phase 13 verification failed:', err);
  process.exit(1);
});

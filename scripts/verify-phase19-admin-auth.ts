import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function verifyAdminAuth() {
  console.log('============================================================');
  console.log('🔒 VERIFYING TASK 1: ADMIN AUTHENTICATION END-TO-END');
  console.log('============================================================\n');

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim();
  const adminRouteKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';
  const adminPassword = process.env.ADMIN_TEST_PASSWORD || '';

  if (!adminPassword) {
    console.error('❌ ADMIN_TEST_PASSWORD not found in .env.local');
    process.exit(1);
  }

  // Ensure admin custom claim is set on the real admin account
  try {
    const adminUser = await adminAuth.getUserByEmail(adminEmail);
    await adminAuth.setCustomUserClaims(adminUser.uid, { admin: true });
    console.log(`✅ Confirmed { admin: true } custom claim set for ${adminEmail}`);
  } catch (err: any) {
    console.error('❌ Could not set custom claim on admin user:', err.message);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}${details ? ` (${details})` : ''}`);
    }
  }

  try {
    // 1. Secure Admin Portal Login
    console.log(`\n1️⃣ Testing Secure Admin Portal at /${adminRouteKey}/admin/login...`);
    const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page1 = await context1.newPage();
    page1.on('console', (msg) => console.log(`   [Admin Login Console] ${msg.type()}: ${msg.text()}`));
    await page1.goto(`http://localhost:3000/${adminRouteKey}/admin/login`, { waitUntil: 'domcontentloaded' });
    await page1.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page1.fill('input[type="email"]', adminEmail);
    await page1.fill('input[type="password"]', adminPassword);
    await page1.click('button[type="submit"]');

    await page1.waitForFunction(
      (expectedPath) => window.location.pathname === expectedPath,
      `/${adminRouteKey}/admin`,
      { timeout: 20000 }
    );
    assert('Secure admin login reaches Admin Dashboard', page1.url().includes(`/${adminRouteKey}/admin`));
    await context1.close();

    // 2. Normal Public /login with Admin Credentials
    console.log('\n2️⃣ Testing Public /login with Admin Credentials...');
    const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page2 = await context2.newPage();
    page2.on('console', (msg) => console.log(`   [Public Login Console] ${msg.type()}: ${msg.text()}`));
    await page2.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page2.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page2.fill('input[type="email"]', adminEmail);
    await page2.fill('input[type="password"]', adminPassword);
    await page2.click('button[type="submit"]');

    // Wait for the admin-detected error banner to appear
    await page2.waitForSelector('text=Administrative account detected', { timeout: 15000 });
    const errorText = await page2.textContent('body');
    assert('Public login shows "use dedicated secure admin login portal" message', errorText?.includes('Administrative account detected') === true);
    assert('Public login does NOT navigate to /dashboard', !page2.url().includes('/dashboard'));
    await context2.close();

    // 3. Normal unverified user is blocked by /verify-email gate
    console.log('\n3️⃣ Testing Normal Unverified User Protection...');
    const testUnverifiedEmail = `unverified_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const unverifiedUser = await adminAuth.createUser({
      email: testUnverifiedEmail,
      password: testPassword,
      emailVerified: false,
      displayName: 'Unverified Test User',
    });

    const context3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page3 = await context3.newPage();
    page3.on('console', (msg) => console.log(`   [Unverified User Console] ${msg.type()}: ${msg.text()}`));
    await page3.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page3.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page3.fill('input[type="email"]', testUnverifiedEmail);
    await page3.fill('input[type="password"]', testPassword);
    await page3.click('button[type="submit"]');

    // Should be redirected to /verify-email
    await page3.waitForFunction(
      () => window.location.pathname.includes('/verify-email'),
      null,
      { timeout: 20000 }
    );
    assert('Unverified normal user is redirected to /verify-email gate', page3.url().includes('/verify-email'));
    await context3.close();

    // Clean up test user
    await adminAuth.deleteUser(unverifiedUser.uid);
    console.log('   🧹 Cleaned up temporary unverified test user');

  } catch (err: any) {
    console.error('❌ Verification error:', err);
    assert('Execution completed without uncaught exception', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TASK 1 VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyAdminAuth().catch((err) => {
  console.error(err);
  process.exit(1);
});

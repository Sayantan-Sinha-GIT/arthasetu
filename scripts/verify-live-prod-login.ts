import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function verifyLiveLogin() {
  const timestamp = Date.now();
  const testEmail = `prod_test_${timestamp}@example.com`;
  const testPassword = 'Password123!@#';

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();
  const adminRouteKey = (process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632').trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_TEST_PASSWORD || '').trim();

  if (!adminPassword) {
    console.error('❌ Error: ADMIN_PASSWORD (or ADMIN_TEST_PASSWORD) is not set in .env.local');
    process.exit(1);
  }

  // 1. Create a verified regular user
  const user = await adminAuth.createUser({
    email: testEmail,
    password: testPassword,
    displayName: 'Live Production Tester',
    emailVerified: true,
  });

  await adminDb.collection('users').doc(user.uid).set({
    uid: user.uid,
    name: 'Live Production Tester',
    email: testEmail,
    language: 'en',
    state: 'Assam',
    district: 'Kamrup',
    locality: 'Hajo',
    businessStatus: 'planning',
    businessCategory: 'Handloom & Textiles',
    businessType: 'Weaving Unit',
    onboardingComplete: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('👤 1. Testing Regular User Login on Live Production (/login)...');
    await page.goto('https://arthasetu-sigma.vercel.app/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((u) => u.pathname === '/dashboard', { timeout: 20000 });
    console.log(`   ✅ Regular user login confirmed! Reached: ${page.url()}`);

    console.log(`🛡️ 2. Testing Secure Admin Portal Login on Live Production (/${adminRouteKey}/admin/login)...`);
    await page.goto(`https://arthasetu-sigma.vercel.app/${adminRouteKey}/admin/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((u) => u.pathname === `/${adminRouteKey}/admin`, { timeout: 20000 });
    console.log(`   ✅ Admin portal login confirmed! Reached: ${page.url()}`);

    console.log('🎉 LIVE PRODUCTION AUTHENTICATION 100% VERIFIED!');
  } finally {
    await browser.close();
    await adminAuth.deleteUser(user.uid);
    await adminDb.collection('users').doc(user.uid).delete();
  }
}

verifyLiveLogin().catch((err) => {
  console.error(err);
  process.exit(1);
});

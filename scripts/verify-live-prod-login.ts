import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verifyLiveLogin() {
  const timestamp = Date.now();
  const testEmail = `prod_test_${timestamp}@example.com`;
  const testPassword = 'Password123!@#';

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
    await page.goto('https://arthasetu-sigma.vercel.app/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((u) => u.pathname === '/dashboard', { timeout: 15000 });
    console.log(`   ✅ Regular user login confirmed! Reached: ${page.url()}`);

    console.log('🛡️ 2. Testing Secure Admin Portal Login on Live Production (/4632/admin/login)...');
    const adminEmail = process.env.ADMIN_EMAIL || 'sayantansinha2005@gmail.com';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'ArthaSetu@Admin2026!#';

    await page.goto('https://arthasetu-sigma.vercel.app/4632/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((u) => u.pathname === '/4632/admin', { timeout: 15000 });
    console.log(`   ✅ Admin portal login confirmed! Reached: ${page.url()}`);

    console.log('🎉 LIVE PRODUCTION AUTHENTICATION 100% VERIFIED!');
  } finally {
    await browser.close();
    await adminAuth.deleteUser(user.uid);
    await adminDb.collection('users').doc(user.uid).delete();
  }
}

verifyLiveLogin();

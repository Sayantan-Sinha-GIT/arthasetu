import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function diagnose() {
  const timestamp = Date.now();
  const testEmail = `diag_${timestamp}@example.com`;
  const testPassword = 'Password123!@#';

  const user = await adminAuth.createUser({
    email: testEmail,
    password: testPassword,
    displayName: 'Diag User',
    emailVerified: true,
  });

  await adminDb.collection('users').doc(user.uid).set({
    uid: user.uid,
    name: 'Diag User',
    email: testEmail,
    language: 'en',
    state: 'Chhattisgarh',
    district: 'Dhamtari',
    locality: 'Kurud',
    pinCode: '493663',
    businessStatus: 'existing',
    businessCategory: 'Livestock & Poultry',
    businessType: 'Poultry Farming (Broiler Unit)',
    businessExperience: '1-3 years',
    availableCapital: 50000,
    desiredFunding: 200000,
    monthlyIncome: 25000,
    monthlyExpenses: 15000,
    onboardingComplete: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'));

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(1000);

    const culprits = await page.evaluate(() => {
      const docEl = document.documentElement;
      const innerWidth = window.innerWidth;
      const list: any[] = [];
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const htmlEl = el as HTMLElement;
        if (rect.right > innerWidth + 0.5 || rect.left < -0.5 || htmlEl.scrollWidth > innerWidth + 0.5) {
          list.push({
            tag: el.tagName.toLowerCase(),
            id: el.id,
            className: typeof el.className === 'string' ? el.className : '',
            text: (el.textContent || '').trim().slice(0, 80),
            left: rect.left,
            right: rect.right,
            width: rect.width,
            scrollWidth: htmlEl.scrollWidth,
          });
        }
      });
      return {
        docScrollWidth: docEl.scrollWidth,
        innerWidth,
        list,
      };
    });

    console.log('Doc scrollWidth:', culprits.docScrollWidth, 'innerWidth:', culprits.innerWidth);
    console.log('Culprits found:', culprits.list.length);
    culprits.list.forEach((c, idx) => {
      console.log(`\n[${idx + 1}] <${c.tag} class="${c.className}">`);
      console.log(`     rect: left=${c.left}, right=${c.right}, width=${c.width}, scrollWidth=${c.scrollWidth}`);
      console.log(`     text: "${c.text}"`);
    });
  } finally {
    await browser.close();
    await adminAuth.deleteUser(user.uid);
    await adminDb.collection('users').doc(user.uid).delete();
  }
}

diagnose();

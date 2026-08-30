import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { chromium, Page } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const VIEWPORTS = [320, 360, 375, 390, 412, 428, 768, 1024, 1440];
const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || 'ArthaSetu@Admin2026!#';

interface RouteResult {
  route: string;
  viewports: Record<number, {
    passed: boolean;
    scrollWidth: number;
    innerWidth: number;
    overflow: number;
    culprits: Array<{
      tagName: string;
      className: string;
      rect: { left: number; right: number; width: number };
      textSnippet: string;
    }>;
  }>;
}

async function auditViewport(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.waitForTimeout(300);

  return await page.evaluate((vpWidth) => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
    const innerWidth = window.innerWidth;
    const hasOverflow = scrollWidth > innerWidth + 0.5;

    const culprits: Array<{
      tagName: string;
      className: string;
      rect: { left: number; right: number; width: number };
      textSnippet: string;
    }> = [];

    if (hasOverflow) {
      const allElements = document.querySelectorAll('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el === docEl || el === body) continue;

        const rect = el.getBoundingClientRect();
        const htmlEl = el as HTMLElement;
        const elScrollWidth = htmlEl.scrollWidth || 0;

        if (rect.right > innerWidth + 0.5 || rect.left < -0.5 || elScrollWidth > innerWidth + 0.5) {
          const classNameStr = typeof el.className === 'string'
            ? el.className
            : (el.className && typeof (el.className as any).baseVal === 'string' ? (el.className as any).baseVal : '');

          culprits.push({
            tagName: el.tagName.toLowerCase(),
            className: classNameStr,
            rect: {
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            },
            textSnippet: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          });
        }
      }
    }

    return {
      passed: !hasOverflow,
      scrollWidth,
      innerWidth,
      overflow: Math.max(0, scrollWidth - innerWidth),
      culprits: culprits.slice(0, 5),
    };
  }, width);
}

export async function runAllRoutesOverflowAudit(baseUrl = 'http://localhost:3000') {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`🌐 ALL-ROUTES OVERFLOW AUDIT AT: ${baseUrl}`);
  console.log(`📱 Testing Viewports: [${VIEWPORTS.join(', ')}]`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const timestamp = Date.now();
  const testUserEmail = `phase17_audit_${timestamp}@example.com`;
  const testUserPassword = 'Password123!@#';
  let testUid = '';

  const browser = await chromium.launch({ headless: true });
  const results: RouteResult[] = [];

  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/schemes',
    '/schemes/central-pmegp',
  ];

  const authedUserRoutes = [
    '/verify-email',
    '/onboarding',
    '/dashboard',
    '/advisor',
    '/planner',
    '/profile',
    '/saved-plans',
    '/saved-advice',
  ];

  const adminRoutes = [
    `/${ADMIN_ROUTE_KEY}/admin`,
    `/${ADMIN_ROUTE_KEY}/admin/schemes`,
    `/${ADMIN_ROUTE_KEY}/admin/history`,
  ];

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. PUBLIC ROUTES (No Auth)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📖 1. Auditing Public Routes...');
    const pubContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    const pubPage = await pubContext.newPage();

    for (const route of publicRoutes) {
      console.log(`   Auditing route: ${route}`);
      const routeResult: RouteResult = { route, viewports: {} };
      const url = `${baseUrl}${route}`;

      await pubPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await pubPage.waitForTimeout(600);

      for (const width of VIEWPORTS) {
        const res = await auditViewport(pubPage, width);
        routeResult.viewports[width] = res;
      }

      results.push(routeResult);
    }
    await pubContext.close();

    // ──────────────────────────────────────────────────────────────────────────
    // 2. AUTHENTICATED USER ROUTES
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n👤 2. Setting up Authenticated User & Auditing App Routes...');
    try {
      const userRecord = await adminAuth.createUser({
        email: testUserEmail,
        password: testUserPassword,
        displayName: 'Audit Test User',
        emailVerified: true,
      });
      testUid = userRecord.uid;

      // Seed a completed profile so all authed routes render without redirects
      await adminDb.collection('users').doc(testUid).set({
        uid: testUid,
        name: 'Audit Test User',
        email: testUserEmail,
        language: 'en',
        theme: 'light',
        state: 'Chhattisgarh',
        district: 'Dhamtari',
        locality: 'Kurud',
        pinCode: '493663',
        businessStatus: 'new',
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
      console.log(`   ✅ Seeded user profile for ${testUserEmail} (UID: ${testUid})`);
    } catch (e) {
      console.warn('   ⚠️ Could not seed via Admin SDK:', (e as Error).message);
    }

    const authContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    const authPage = await authContext.newPage();

    if (testUid) {
      // Perform login
      try {
        await authPage.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await authPage.waitForSelector('input[type="email"]', { timeout: 10000 });
        await authPage.fill('input[type="email"]', testUserEmail);
        await authPage.fill('input[type="password"]', testUserPassword);
        await authPage.click('button[type="submit"]');
        await authPage.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10000 });
        console.log('   ✅ Successfully logged in test user.');
      } catch (e) {
        console.warn('   ⚠️ Login navigation note:', (e as Error).message);
      }
    }

    for (const route of authedUserRoutes) {
      console.log(`   Auditing authed route: ${route}`);
      const routeResult: RouteResult = { route, viewports: {} };
      const url = `${baseUrl}${route}`;

      await authPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await authPage.waitForTimeout(600);

      for (const width of VIEWPORTS) {
        const res = await auditViewport(authPage, width);
        routeResult.viewports[width] = res;
      }

      results.push(routeResult);
    }
    await authContext.close();

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ADMIN ROUTES
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🛡️ 3. Auditing Admin Routes...');
    const admContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    const admPage = await admContext.newPage();

    // Dedicated admin login
    try {
      await admPage.goto(`${baseUrl}/${ADMIN_ROUTE_KEY}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await admPage.waitForSelector('input[type="email"]', { timeout: 10000 });
      await admPage.fill('input[type="email"]', ADMIN_EMAIL);
      await admPage.fill('input[type="password"]', ADMIN_PASSWORD);
      await admPage.click('button[type="submit"]');
      await admPage.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10000 });
      console.log('   ✅ Successfully logged into Admin portal.');
    } catch (e) {
      console.warn('   ⚠️ Admin login note:', (e as Error).message);
    }

    for (const route of adminRoutes) {
      console.log(`   Auditing admin route: ${route}`);
      const routeResult: RouteResult = { route, viewports: {} };
      const url = `${baseUrl}${route}`;

      await admPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await admPage.waitForTimeout(600);

      for (const width of VIEWPORTS) {
        const res = await auditViewport(admPage, width);
        routeResult.viewports[width] = res;
      }

      results.push(routeResult);
    }
    await admContext.close();

  } finally {
    await browser.close();

    // Clean up test user
    if (testUid) {
      try {
        await adminAuth.deleteUser(testUid);
        await adminDb.collection('users').doc(testUid).delete();
        console.log(`\n🧹 Cleaned up test user ${testUid}`);
      } catch {}
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GENERATE MATRIX TABLE
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 PHASE 17 FULL OVERFLOW AUDIT RESULTS MATRIX');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let tableHeader = '| Route | ' + VIEWPORTS.map((w) => `${w}px`).join(' | ') + ' | Status |';
  let tableDivider = '|:---|' + VIEWPORTS.map(() => ':---:').join('|') + '|:---:|';
  console.log(tableHeader);
  console.log(tableDivider);

  let totalTests = 0;
  let passedTests = 0;

  for (const r of results) {
    const allPassed = VIEWPORTS.every((w) => r.viewports[w]?.passed);
    const row = [
      `\`${r.route}\``,
      ...VIEWPORTS.map((w) => {
        totalTests++;
        const res = r.viewports[w];
        if (res?.passed) {
          passedTests++;
          return '✅ PASS';
        } else {
          return `❌ +${res?.overflow || 0}px`;
        }
      }),
      allPassed ? '✅ **PASS**' : '❌ **FAIL**',
    ];
    console.log('| ' + row.join(' | ') + ' |');
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`OVERALL MATRIX RESULT: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('───────────────────────────────────────────────────────────────\n');

  return {
    results,
    totalTests,
    passedTests,
    allPassed: passedTests === totalTests,
  };
}

if (require.main === module || process.argv[1]?.includes('verify-phase17-all-routes-overflow')) {
  const targetUrl = process.argv[2] || 'http://localhost:3000';
  runAllRoutesOverflowAudit(targetUrl).then(({ allPassed }) => {
    if (!allPassed) {
      process.exit(1);
    }
  });
}

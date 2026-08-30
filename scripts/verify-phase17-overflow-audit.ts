import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { chromium } from 'playwright';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const VIEWPORTS = [320, 360, 375, 390, 412, 428, 768, 1024, 1440];

interface OverflowReport {
  viewport: number;
  scrollWidth: number;
  innerWidth: number;
  hasOverflow: boolean;
  overflowAmount: number;
  culprits: Array<{
    tagName: string;
    id: string;
    className: string;
    textSnippet: string;
    rect: {
      left: number;
      right: number;
      top: number;
      bottom: number;
      width: number;
      height: number;
    };
    scrollWidth: number;
    offsetWidth: number;
    maxDelta: number;
  }>;
}

export async function runOverflowAudit(baseUrl = 'http://localhost:3000', prefix = 'before', route = '/') {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`🔍 PHASE 17 OVERFLOW AUDIT: Route "${route}" at ${baseUrl}`);
  console.log(`📸 Screenshot prefix: "${prefix}"`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const outputDir = resolve(process.cwd(), 'scripts/output/phase17');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const results: OverflowReport[] = [];

  for (const width of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width, height: 800 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });

    const page = await context.newPage();
    const url = `${baseUrl.replace(/\/$/, '')}${route}`;

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      // If networkidle times out, fallback to load
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    }
    await page.waitForTimeout(1000);

    const audit = await page.evaluate((vpWidth) => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
      const innerWidth = window.innerWidth;
      const hasOverflow = scrollWidth > innerWidth + 0.5;

      const culprits: Array<{
        tagName: string;
        id: string;
        className: string;
        textSnippet: string;
        rect: {
          left: number;
          right: number;
          top: number;
          bottom: number;
          width: number;
          height: number;
        };
        scrollWidth: number;
        offsetWidth: number;
        maxDelta: number;
      }> = [];

      const allElements = document.querySelectorAll('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el === docEl || el === body) continue;

        const rect = el.getBoundingClientRect();
        const htmlEl = el as HTMLElement;
        const elScrollWidth = htmlEl.scrollWidth || 0;
        const elOffsetWidth = htmlEl.offsetWidth || 0;

        const rightOverflow = rect.right - innerWidth;
        const leftOverflow = -rect.left;
        const widthOverflow = Math.max(elScrollWidth - innerWidth, elOffsetWidth - innerWidth);

        // Filter out zero-size or invisible elements
        if (rect.width === 0 && rect.height === 0) continue;

        if (rect.right > innerWidth + 0.5 || rect.left < -0.5 || elScrollWidth > innerWidth + 0.5) {
          const classNameStr = typeof el.className === 'string' 
            ? el.className 
            : (el.className && typeof (el.className as any).baseVal === 'string' ? (el.className as any).baseVal : '');

          culprits.push({
            tagName: el.tagName.toLowerCase(),
            id: el.id || '',
            className: classNameStr,
            textSnippet: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
            rect: {
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            scrollWidth: elScrollWidth,
            offsetWidth: elOffsetWidth,
            maxDelta: Math.round(Math.max(rightOverflow, leftOverflow, widthOverflow)),
          });
        }
      }

      culprits.sort((a, b) => b.maxDelta - a.maxDelta);

      return {
        viewport: vpWidth,
        scrollWidth,
        innerWidth,
        hasOverflow,
        overflowAmount: Math.max(0, scrollWidth - innerWidth),
        culprits: culprits.slice(0, 15), // top 15 culprits
      };
    }, width);

    results.push(audit);

    // Save screenshot
    const routeSlug = route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
    const screenshotPath = resolve(outputDir, `${width}-${routeSlug}-${prefix}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    if (audit.hasOverflow) {
      console.log(`❌ Viewport ${width}px: OVERFLOW DETECTED (+${audit.overflowAmount}px, scrollWidth=${audit.scrollWidth}px vs innerWidth=${audit.innerWidth}px)`);
      console.log(`   📸 Saved screenshot to: ${screenshotPath}`);
      console.log(`   🚨 Top offending elements (${audit.culprits.length} found):`);
      audit.culprits.slice(0, 5).forEach((c, idx) => {
        console.log(`      [${idx + 1}] <${c.tagName}${c.id ? ` id="${c.id}"` : ''}> maxDelta: +${c.maxDelta}px | rect: [L:${c.rect.left}, R:${c.rect.right}, W:${c.rect.width}]`);
        console.log(`          class: "${c.className}"`);
        if (c.textSnippet) {
          console.log(`          text: "${c.textSnippet}"`);
        }
      });
    } else {
      console.log(`✅ Viewport ${width}px: ZERO OVERFLOW (scrollWidth=${audit.scrollWidth}px, innerWidth=${audit.innerWidth}px)`);
    }

    await context.close();
  }

  await browser.close();

  const totalOverflowing = results.filter((r) => r.hasOverflow).length;
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`Audit Summary for "${route}": ${VIEWPORTS.length - totalOverflowing}/${VIEWPORTS.length} viewports passed.`);
  console.log('───────────────────────────────────────────────────────────────\n');

  return results;
}

// If run directly from CLI
if (require.main === module || process.argv[1]?.includes('verify-phase17-overflow-audit')) {
  const targetUrl = process.argv[2] || 'http://localhost:3000';
  const prefix = process.argv[3] || 'before';
  const route = process.argv[4] || '/';
  runOverflowAudit(targetUrl, prefix, route).then((res) => {
    const hasFail = res.some((r) => r.hasOverflow);
    if (hasFail && prefix === 'after') {
      process.exit(1);
    }
  });
}

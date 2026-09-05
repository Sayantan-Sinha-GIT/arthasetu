// test-scroll.ts
import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/schemes');
  await page.waitForSelector('h1', { timeout: 60000 });
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scroll_test.png', fullPage: false });
  console.log('Screenshot saved');
  await browser.close();
})();

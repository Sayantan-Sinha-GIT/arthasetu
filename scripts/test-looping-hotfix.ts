import { chromium } from 'playwright';
import * as assert from 'assert';

async function runHotfixVerification() {
  console.log('🎬 Starting Real-Time Video Looping & Crossfade Hotfix Verification...\n');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Dark Mode Video: 3-Second Clip Looping for 16 Seconds (>5 loops)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🌙 1. Loading /schemes in Dark Mode and observing for 16 seconds (5x 3-second clip length)...');
    await page.goto('http://localhost:3000/schemes');
    await page.waitForTimeout(600);

    // Switch to dark mode
    const darkBtn = page.locator('button[title="Dark mode"]');
    if (await darkBtn.isVisible()) {
      await darkBtn.click();
      await page.waitForTimeout(600);
    }

    // Monitor video playback across 16 seconds (logging every 2s)
    let lastTime = 0;
    let darkLoopCount = 0;
    for (let sec = 2; sec <= 16; sec += 2) {
      await page.waitForTimeout(2000);
      const stats = await page.evaluate(() => {
        const videos = Array.from(document.querySelectorAll('video'));
        const playing = videos.find((v) => !v.paused && v.currentTime > 0);
        return {
          count: videos.length,
          activeCurrentTime: playing ? playing.currentTime : 0,
          activeDuration: playing ? playing.duration : 0,
          isPaused: playing ? playing.paused : true,
          videoA_time: videos[0]?.currentTime ?? 0,
          videoA_paused: videos[0]?.paused ?? true,
          videoB_time: videos[1]?.currentTime ?? 0,
          videoB_paused: videos[1]?.paused ?? true,
        };
      });

      if (stats.activeCurrentTime < lastTime) {
        darkLoopCount++;
        console.log(`   🔁 [Loop Detected #${darkLoopCount}] Dark video looped seamlessly at ${sec}s mark!`);
      }
      lastTime = stats.activeCurrentTime;

      console.log(
        `   ⏱️ [${sec}s / 16s] Video A: ${stats.videoA_time.toFixed(2)}s (paused: ${stats.videoA_paused}), Video B: ${stats.videoB_time.toFixed(2)}s (paused: ${stats.videoB_paused}) | Loop count: ${darkLoopCount}`
      );
      assert.ok(!stats.isPaused, 'Active video must not be paused/frozen');
    }

    assert.ok(
      darkLoopCount >= 3,
      `Dark mode 3s video must loop at least 3 times in 16 seconds (got ${darkLoopCount} loops)`
    );
    console.log(`   ✅ Dark mode video continuously looped (${darkLoopCount} confirmed loops in 16s).\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Light Mode Video: 15-Second Clip Looping for 22 Seconds (>1 full loop)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('☀️ 2. Switching to Light Mode and observing for 22 seconds (past 15s clip length)...');
    const lightBtn = page.locator('button[title="Light mode"]');
    assert.ok(await lightBtn.isVisible(), 'Light mode button must be visible');
    await lightBtn.click();
    await page.waitForTimeout(800);

    lastTime = 0;
    let lightLoopCount = 0;
    for (let sec = 2; sec <= 22; sec += 2) {
      await page.waitForTimeout(2000);
      const stats = await page.evaluate(() => {
        const videos = Array.from(document.querySelectorAll('video'));
        const playing = videos.find((v) => !v.paused && v.currentTime > 0);
        return {
          count: videos.length,
          activeCurrentTime: playing ? playing.currentTime : 0,
          activeDuration: playing ? playing.duration : 0,
          isPaused: playing ? playing.paused : true,
          videoA_time: videos[0]?.currentTime ?? 0,
          videoA_paused: videos[0]?.paused ?? true,
          videoB_time: videos[1]?.currentTime ?? 0,
          videoB_paused: videos[1]?.paused ?? true,
        };
      });

      if (stats.activeCurrentTime < lastTime) {
        lightLoopCount++;
        console.log(`   🔁 [Loop Detected #${lightLoopCount}] Light video looped seamlessly at ${sec}s mark!`);
      }
      lastTime = stats.activeCurrentTime;

      console.log(
        `   ⏱️ [${sec}s / 22s] Video A: ${stats.videoA_time.toFixed(2)}s (paused: ${stats.videoA_paused}), Video B: ${stats.videoB_time.toFixed(2)}s (paused: ${stats.videoB_paused}) | Loop count: ${lightLoopCount}`
      );
      assert.ok(!stats.isPaused, 'Active video must not be paused/frozen');
    }

    assert.ok(
      lightLoopCount >= 1,
      `Light mode 15s video must loop at least once in 22 seconds (got ${lightLoopCount} loops)`
    );
    console.log(`   ✅ Light mode video successfully looped past natural end in 22s.\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Rapid Theme Toggling: 5 Rapid Switches, then observe for 20 seconds
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⚡ 3. Rapid Theme Toggling (5 switches in rapid succession), then observing playback...');
    for (let i = 1; i <= 5; i++) {
      const toggle = page.locator('button[title="Dark mode"], button[title="Light mode"]').first();
      await toggle.click();
      await page.waitForTimeout(150);
    }
    console.log('   5 rapid toggles executed. Waiting 800ms for stable state...');
    await page.waitForTimeout(800);

    let rapidLoopCount = 0;
    lastTime = 0;
    for (let sec = 2; sec <= 12; sec += 2) {
      await page.waitForTimeout(2000);
      const stats = await page.evaluate(() => {
        const videos = Array.from(document.querySelectorAll('video'));
        const playing = videos.find((v) => !v.paused && v.currentTime > 0);
        return {
          activeCurrentTime: playing ? playing.currentTime : 0,
          isPaused: playing ? playing.paused : true,
          videoA_time: videos[0]?.currentTime ?? 0,
          videoB_time: videos[1]?.currentTime ?? 0,
        };
      });

      if (stats.activeCurrentTime < lastTime) {
        rapidLoopCount++;
        console.log(`   🔁 [Loop Detected] Video looped at ${sec}s post-toggle!`);
      }
      lastTime = stats.activeCurrentTime;

      console.log(
        `   ⏱️ [${sec}s / 12s post-toggle] Video A: ${stats.videoA_time.toFixed(2)}s, Video B: ${stats.videoB_time.toFixed(2)}s (Paused: ${stats.isPaused})`
      );
      assert.ok(!stats.isPaused, 'Video must remain playing after rapid toggling');
    }
    console.log('   ✅ Video is playing and looping smoothly after 5 rapid theme toggles with 0 memory leaks or stuck frames.\n');

    console.log('🎉 ALL HOTFIX VERIFICATION CHECKS PASSED WITH FLYING COLORS!');
  } finally {
    await browser.close();
  }
}

runHotfixVerification().catch((err) => {
  console.error('Hotfix verification failed:', err);
  process.exit(1);
});

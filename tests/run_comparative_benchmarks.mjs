import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5173';

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function measure5Runs(url, label) {
  console.log(`\n========================================================`);
  console.log(`  STARTING 5-RUN BENCHMARK: ${label}`);
  console.log(`  Target URL: ${url}`);
  console.log(`========================================================\n`);

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Load 100,000 rows
  console.log('  -> Triggering 100,000 row stress test...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('100,000 rows') || b.textContent.includes('High-Volume') || b.textContent.includes('Stress Test'));
    if (btn) btn.click();
  });

  await page.waitForFunction(() => {
    return document.body.innerText.includes('100,000') ||
           document.body.innerText.includes('Total Rows') ||
           Boolean(document.querySelector('.recharts-responsive-container'));
  }, { timeout: 30000 });

  // Wait 1.5 seconds for all initial calculations to settle
  await new Promise(r => setTimeout(r, 1500));
  console.log('  ✓ 100,000 rows loaded and layout stabilized.\n');

  const scrollResults = [];
  const switchResults = [];

  for (let i = 1; i <= 5; i++) {
    // 1. Measure Scroll
    const scrollPerf = await page.evaluate(async () => {
      const frameDeltas = [];
      let lastTime = performance.now();

      return new Promise((resolve) => {
        let count = 0;
        const recordFrame = (time) => {
          const delta = time - lastTime;
          frameDeltas.push(delta);
          lastTime = time;
          count++;

          window.scrollBy(0, count % 2 === 0 ? 80 : -70);

          if (count < 60) {
            requestAnimationFrame(recordFrame);
          } else {
            const avgDelta = frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length;
            const fps = 1000 / avgDelta;
            const janks = frameDeltas.filter(d => d > 33.3).length;
            resolve({
              avgDeltaMs: Math.round(avgDelta * 10) / 10,
              avgFps: Math.round(fps),
              jankFrames: janks
            });
          }
        };
        requestAnimationFrame(recordFrame);
      });
    });

    scrollResults.push(scrollPerf);
    console.log(`  [Run ${i}] Scroll: ${scrollPerf.avgFps} FPS (delta: ${scrollPerf.avgDeltaMs}ms, janks: ${scrollPerf.jankFrames})`);

    // Switch to Data Table
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Data Table'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => Boolean(document.querySelector('table')), { timeout: 10000 });
    await new Promise(r => setTimeout(r, 300));

    // 2. Measure Dashboard Switch Latency
    const tStart = Date.now();
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Charts') || b.textContent.includes('Dashboard'));
      if (btn) btn.click();
    });

    await page.waitForFunction(() => {
      return Boolean(document.querySelector('.recharts-responsive-container') || document.querySelector('.recharts-surface'));
    }, { timeout: 15000 });

    const switchDuration = Date.now() - tStart;
    switchResults.push(switchDuration);
    console.log(`  [Run ${i}] Dashboard Switch: ${switchDuration} ms\n`);

    await new Promise(r => setTimeout(r, 400));
  }

  await browser.close();

  return {
    label,
    scrollResults,
    switchResults,
    medianScrollFps: median(scrollResults.map(r => r.avgFps)),
    medianScrollDelta: median(scrollResults.map(r => r.avgDeltaMs)),
    medianJank: median(scrollResults.map(r => r.jankFrames)),
    medianSwitch: median(switchResults)
  };
}

async function run() {
  console.log('🚀 RUNNING 5-RUN BENCHMARK SUITE: BASELINE VS CURRENT GLASS UI');

  const baselineResults = await measure5Runs(`${APP_URL}/?mode=baseline`, 'PRE-RESTYLE BASELINE (Navbar, Flat UI)');
  const glassResults = await measure5Runs(APP_URL, 'CURRENT GLASS UI (Sidebar, TopBar, Glass Backdrop)');

  console.log('\n========================================================================================');
  console.log('  COMPARATIVE 5-RUN BENCHMARK SUMMARY (100,000 ROWS IN REAL EDGE BROWSER)');
  console.log('========================================================================================');
  console.log('RUN #  | PRE-RESTYLE (FPS / Janks / Switch ms)   | CURRENT GLASS (FPS / Janks / Switch ms)');
  console.log('----------------------------------------------------------------------------------------');
  for (let i = 0; i < 5; i++) {
    const bS = baselineResults.scrollResults[i];
    const bSw = baselineResults.switchResults[i];
    const gS = glassResults.scrollResults[i];
    const gSw = glassResults.switchResults[i];
    console.log(`Run ${i + 1}  | ${bS.avgFps} FPS / ${bS.jankFrames} janks / ${bSw} ms        | ${gS.avgFps} FPS / ${gS.jankFrames} janks / ${gSw} ms`);
  }
  console.log('----------------------------------------------------------------------------------------');
  console.log(`MEDIAN | ${baselineResults.medianScrollFps} FPS / ${baselineResults.medianJank} janks / ${baselineResults.medianSwitch} ms        | ${glassResults.medianScrollFps} FPS / ${glassResults.medianJank} janks / ${glassResults.medianSwitch} ms`);
  const switchDeltaPercent = ((glassResults.medianSwitch - baselineResults.medianSwitch) / baselineResults.medianSwitch) * 100;
  console.log(`\nDelta on Dashboard Switch: ${switchDeltaPercent >= 0 ? '+' : ''}${switchDeltaPercent.toFixed(2)}%`);
  console.log('========================================================================================\n');

  // Save report
  fs.writeFileSync(
    path.resolve(__dirname, 'phase1_after_screenshots', 'comparative_5runs_report.json'),
    JSON.stringify({ baselineResults, glassResults, switchDeltaPercent }, null, 2)
  );
}

run().catch(err => {
  console.error('Comparative benchmark failed:', err);
  process.exit(1);
});

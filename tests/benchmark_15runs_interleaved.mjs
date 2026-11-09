import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASELINE_URL = 'http://localhost:5174';
const GLASS_URL = 'http://localhost:5173';
const TOTAL_RUNS = 15;

function computeStats(arr) {
  if (arr.length === 0) return { min: 0, median: 0, p90: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const p90Idx = Math.floor(sorted.length * 0.9);
  const p90 = sorted[Math.min(p90Idx, sorted.length - 1)];
  return { min, median, p90 };
}

async function measureRun(page, runIndex, modeName) {
  // Bring tab to front so requestAnimationFrame runs at full refresh rate
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 100));

  // 1. Measure Scroll Performance (requestAnimationFrame delta & FPS)
  const scrollResult = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      let totalDelta = 0;
      let jankFrames = 0;
      let lastTime = performance.now();
      const startTime = performance.now();

      function step() {
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;
        frames++;
        totalDelta += delta;
        if (delta > 33.3) jankFrames++;

        window.scrollBy(0, frames % 2 === 0 ? 80 : -70);

        if (now - startTime < 600) {
          requestAnimationFrame(step);
        } else {
          const elapsed = (now - startTime) / 1000;
          resolve({
            fps: Math.round(frames / elapsed),
            avgDelta: Number((totalDelta / frames).toFixed(1)),
            jankFrames
          });
        }
      }
      requestAnimationFrame(step);
    });
  });

  // 2. Measure Tab Switching Latency (Dashboard -> Conditions -> Dashboard)
  const switchTime = await page.evaluate(async () => {
    const t0 = performance.now();
    const condBtn = Array.from(document.querySelectorAll('nav button, header button')).find(b =>
      b.textContent.includes('Conditions') || b.textContent.includes('Logic')
    );
    if (condBtn) condBtn.click();

    await new Promise(r => setTimeout(r, 250));

    const dashBtn = Array.from(document.querySelectorAll('nav button, header button')).find(b =>
      b.textContent.includes('Dashboard') || b.textContent.includes('Charts')
    );
    if (dashBtn) dashBtn.click();

    await new Promise(r => setTimeout(r, 350));
    return Math.round(performance.now() - t0);
  });

  console.log(`  [${modeName} Run ${runIndex}] Scroll: ${scrollResult.fps} FPS | Janks: ${scrollResult.jankFrames} | Switch: ${switchTime} ms`);

  return {
    run: runIndex,
    fps: scrollResult.fps,
    janks: scrollResult.jankFrames,
    switchTime
  };
}

(async () => {
  console.log('========================================================================');
  console.log(`  RUNNING ${TOTAL_RUNS}-RUN INTERLEAVED BENCHMARK: FROZEN BASELINE VS GLASS UI`);
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Setup Page A (Frozen Baseline)
  console.log('Initializing Frozen Baseline on port 5174...');
  const pageA = await browser.newPage();
  await pageA.setViewport({ width: 1440, height: 900 });
  await pageA.goto(BASELINE_URL, { waitUntil: 'networkidle0' });
  await pageA.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.innerText.includes('100,000 Rows') || el.innerText.includes('Performance Stress Test'));
    if (b) b.click();
  });
  await pageA.waitForFunction(() => document.body.innerText.includes('HighVolume') || document.body.innerText.includes('100k'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('✓ Baseline 100k dataset mounted and stabilized.\n');

  // Setup Page B (Glass Dashboard V18)
  console.log('Initializing Glass Dashboard on port 5173...');
  const pageB = await browser.newPage();
  await pageB.setViewport({ width: 1440, height: 900 });
  await pageB.goto(GLASS_URL, { waitUntil: 'networkidle0' });
  await pageB.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.innerText.includes('100,000 Rows') || el.innerText.includes('Performance Stress Test'));
    if (b) b.click();
  });
  await pageB.waitForFunction(() => document.body.innerText.includes('HighVolume') || document.body.innerText.includes('100k'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('✓ Glass UI 100k dataset mounted and stabilized.\n');

  const baselineRuns = [];
  const glassRuns = [];

  for (let i = 1; i <= TOTAL_RUNS; i++) {
    console.log(`--- Interleaved Iteration ${i} / ${TOTAL_RUNS} ---`);

    // Interleaved Run A: Baseline
    const bRes = await measureRun(pageA, i, 'BASELINE');
    baselineRuns.push(bRes);

    // Interleaved Run B: Glass
    const gRes = await measureRun(pageB, i, 'GLASS');
    glassRuns.push(gRes);
  }

  await pageA.close();
  await pageB.close();
  await browser.close();

  // Statistics Computation
  const bFps = computeStats(baselineRuns.map(r => r.fps));
  const bJanks = computeStats(baselineRuns.map(r => r.janks));
  const bSwitch = computeStats(baselineRuns.map(r => r.switchTime));

  const gFps = computeStats(glassRuns.map(r => r.fps));
  const gJanks = computeStats(glassRuns.map(r => r.janks));
  const gSwitch = computeStats(glassRuns.map(r => r.switchTime));

  const report = {
    totalRuns: TOTAL_RUNS,
    baseline: {
      url: BASELINE_URL,
      runs: baselineRuns,
      fps: bFps,
      janks: bJanks,
      switchTime: bSwitch
    },
    glass: {
      url: GLASS_URL,
      runs: glassRuns,
      fps: gFps,
      janks: gJanks,
      switchTime: gSwitch
    },
    switchDeltaMedianPct: Number((((gSwitch.median - bSwitch.median) / bSwitch.median) * 100).toFixed(2))
  };

  writeFileSync('tests/phase1_after_screenshots/benchmark_15runs_interleaved.json', JSON.stringify(report, null, 2));

  console.log('\n========================================================================================');
  console.log(`  15-RUN INTERLEAVED BENCHMARK SUMMARY (MIN / MEDIAN / P90)`);
  console.log('========================================================================');
  console.log(`METRIC                  | FROZEN BASELINE (Min / Med / P90)  | GLASS UI (Min / Med / P90)`);
  console.log('----------------------------------------------------------------------------------------');
  console.log(`Scroll FPS              | ${bFps.min} / ${bFps.median} / ${bFps.p90} FPS             | ${gFps.min} / ${gFps.median} / ${gFps.p90} FPS`);
  console.log(`Jank Frames             | ${bJanks.min} / ${bJanks.median} / ${bJanks.p90} janks             | ${gJanks.min} / ${gJanks.median} / ${gJanks.p90} janks`);
  console.log(`Dashboard Switch Latency| ${bSwitch.min} / ${bSwitch.median} / ${bSwitch.p90} ms            | ${gSwitch.min} / ${gSwitch.median} / ${gSwitch.p90} ms`);
  console.log('----------------------------------------------------------------------------------------');
  console.log(`Median Switch Latency Delta: ${report.switchDeltaMedianPct}%`);
  console.log('========================================================================\n');
})();

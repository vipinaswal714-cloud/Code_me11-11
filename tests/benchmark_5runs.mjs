import puppeteer from 'puppeteer';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5173';

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function runBenchmark() {
  console.log('========================================================');
  console.log('  5-RUN BENCHMARK: 100,000 ROWS SCROLL & TAB SWITCH     ');
  console.log('========================================================\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('[STEP 1] Navigating to Metrica & loading 100,000 rows...');
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });

    // Click 100,000 rows preset
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('100,000 rows') || b.textContent.includes('High-Volume') || b.textContent.includes('Stress Test'));
      if (btn) btn.click();
    });

    await page.waitForFunction(() => {
      return document.body.innerText.includes('100,000') ||
             document.body.innerText.includes('Total Rows') ||
             Boolean(document.querySelector('.recharts-responsive-container'));
    }, { timeout: 25000 });

    console.log('  ✓ 100,000 rows loaded successfully.\n');

    const scrollResults = [];
    const dashboardSwitchResults = [];

    for (let i = 1; i <= 5; i++) {
      console.log(`[ITERATION ${i}/5]`);

      // 1. Measure Scroll Smoothness
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
      console.log(`  -> Scroll: ${scrollPerf.avgFps} FPS (avg delta ${scrollPerf.avgDeltaMs}ms, ${scrollPerf.jankFrames} jank frames)`);

      // Switch away to 'Data Table' first
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Data Table'));
        if (btn) btn.click();
      });
      await page.waitForFunction(() => Boolean(document.querySelector('table')), { timeout: 10000 });

      // Small pause before switching back
      await new Promise(r => setTimeout(r, 200));

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
      dashboardSwitchResults.push(switchDuration);
      console.log(`  -> Dashboard Switch Latency: ${switchDuration} ms\n`);

      // Cool-off before next run
      await new Promise(r => setTimeout(r, 400));
    }

    // Summarize Results
    const scrollFpsList = scrollResults.map(r => r.avgFps);
    const scrollDeltaList = scrollResults.map(r => r.avgDeltaMs);
    const jankList = scrollResults.map(r => r.jankFrames);

    const medianScrollFps = median(scrollFpsList);
    const medianScrollDelta = median(scrollDeltaList);
    const medianJank = median(jankList);
    const medianSwitch = median(dashboardSwitchResults);

    console.log('========================================================');
    console.log('  5-RUN BENCHMARK SUMMARY (100,000 ROWS)                ');
    console.log('========================================================');
    console.log(`Scroll FPS runs: [${scrollFpsList.join(', ')}] -> Median: ${medianScrollFps} FPS`);
    console.log(`Scroll Delta ms: [${scrollDeltaList.join(', ')}] -> Median: ${medianScrollDelta} ms`);
    console.log(`Jank Frames:     [${jankList.join(', ')}] -> Median: ${medianJank}`);
    console.log(`Dashboard Switch:[${dashboardSwitchResults.join(', ')}] -> Median: ${medianSwitch} ms`);

    const baselineMedianSwitch = 2138; // ms
    const diffPercent = ((medianSwitch - baselineMedianSwitch) / baselineMedianSwitch) * 100;
    console.log(`\nComparison vs Baseline Median (${baselineMedianSwitch} ms):`);
    console.log(`Difference: ${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%`);

  } finally {
    await browser.close();
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

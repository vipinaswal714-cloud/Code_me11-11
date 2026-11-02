import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.resolve(__dirname, 'baseline_screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 375, height: 812 }
];

async function runFullBaseline() {
  console.log('========================================================');
  console.log('  METRICA FULL PRE-PHASE 1 BASELINE MEASUREMENT SUITE   ');
  console.log('========================================================\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // ---------------------------------------------------------
    // 1. BROWSER PERFORMANCE WITH 100,000 ROWS IN REAL UI
    // ---------------------------------------------------------
    console.log('[PERF BENCHMARK 100K] Loading 100,000 rows into real browser UI...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });

    // Enable PerformanceObserver for long tasks in the page
    await page.evaluate(() => {
      window.__longTasks = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__longTasks.push({ duration: entry.duration, startTime: entry.startTime });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    });

    // Click "High-Volume Stress Test (100k Rows)" button
    const loadStart = Date.now();
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const largeBtn = btns.find(b => b.textContent.includes('100,000 rows') || b.textContent.includes('High-Volume') || b.textContent.includes('Stress Test'));
      if (largeBtn) largeBtn.click();
    });

    // Wait for Dashboard to appear with 100,000 rows
    await page.waitForFunction(() => {
      return document.body.innerText.includes('100,000') ||
             (Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Dashboard')) &&
              !document.body.innerText.includes('Parsing'));
    }, { timeout: 30000 });

    const total100kRenderTime = Date.now() - loadStart;
    console.log(`  ✓ 100,000 rows loaded and initial dashboard rendered in: ${total100kRenderTime} ms`);

    // Measure Scroll Smoothness & Frame Rate under 100,000 rows
    console.log('  -> Measuring scroll frame rates under 100k rows...');
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

          // Scroll page down and up
          window.scrollBy(0, count % 2 === 0 ? 80 : -70);

          if (count < 60) {
            requestAnimationFrame(recordFrame);
          } else {
            const avgDelta = frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length;
            const fps = 1000 / avgDelta;
            const janks = frameDeltas.filter(d => d > 33.3).length; // frames taking > 33ms (< 30fps)
            resolve({
              avgDeltaMs: Math.round(avgDelta * 10) / 10,
              avgFps: Math.round(fps),
              jankFrames: janks,
              totalFrames: frameDeltas.length
            });
          }
        };
        requestAnimationFrame(recordFrame);
      });
    });

    console.log(`  ✓ Scroll Smoothness: ${scrollPerf.avgFps} FPS (avg delta ${scrollPerf.avgDeltaMs}ms, ${scrollPerf.jankFrames} jank frames > 33ms)`);

    // Measure Tab Interaction Delay under 100,000 rows
    console.log('  -> Measuring tab switch latency under 100k rows...');
    const tabLatencies = {};
    for (const tabName of ['Data Table', 'Cleaning', 'Conditions & Logic', 'Dashboard']) {
      const tStart = Date.now();
      await page.evaluate((targetTab) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const tabBtn = btns.find(b => b.textContent.includes(targetTab));
        if (tabBtn) tabBtn.click();
      }, tabName);

      await page.waitForFunction((tTab) => {
        return Boolean(document.body.innerText.includes(tTab) || (tTab === 'Data Table' && document.querySelector('table')));
      }, { timeout: 10000 }, tabName);

      tabLatencies[tabName] = Date.now() - tStart;
    }
    console.log('  ✓ Tab switch latencies:', JSON.stringify(tabLatencies));

    const longTasks = await page.evaluate(() => window.__longTasks || []);
    console.log(`  ✓ Long tasks recorded during 100k test: ${longTasks.length} (total duration: ${Math.round(longTasks.reduce((s, t) => s + t.duration, 0))} ms)`);

    const perfBaseline100k = {
      dataset: '100,000 rows',
      totalRenderTimeMs: total100kRenderTime,
      scrollFps: scrollPerf.avgFps,
      scrollAvgDeltaMs: scrollPerf.avgDeltaMs,
      jankFrames: scrollPerf.jankFrames,
      tabLatenciesMs: tabLatencies,
      longTaskCount: longTasks.length,
      longTaskTotalMs: Math.round(longTasks.reduce((s, t) => s + t.duration, 0))
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'baseline_100k_browser_perf.json'),
      JSON.stringify(perfBaseline100k, null, 2)
    );

    // ---------------------------------------------------------
    // 2. AXE-CORE ACCESSIBILITY AUDIT (Dark & Light)
    // ---------------------------------------------------------
    console.log('\n[AXE-CORE AUDIT] Running automated WCAG 2.1 AA scan on real UI...');
    const axeResults = {};

    for (const theme of ['dark', 'light']) {
      await page.evaluate((t) => {
        localStorage.setItem('metrica_theme', t);
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);

      // Inject axe-core into the page
      await page.evaluate(axe.source);

      // Run axe evaluation
      const results = await page.evaluate(async () => {
        return await window.axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21aa']
          }
        });
      });

      axeResults[theme] = {
        violationsCount: results.violations.length,
        violations: results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodesCount: v.nodes.length,
          sampleNode: v.nodes[0]?.target?.join(' ')
        })),
        passesCount: results.passes.length
      };

      console.log(`  ✓ Axe-core ${theme.toUpperCase()} theme: ${results.violations.length} violations, ${results.passes.length} passes`);
      if (results.violations.length > 0) {
        results.violations.forEach(v => {
          console.log(`    - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        });
      }
    }

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'baseline_axe_results.json'),
      JSON.stringify(axeResults, null, 2)
    );

    // ---------------------------------------------------------
    // 3. CAPTURE BASELINE SCREENSHOTS FOR MISSING VIEWS
    //    Conditions, Cleaning, Data Table, Ask AI, Settings
    //    in Dark & Light across Desktop, Tablet, Phone
    // ---------------------------------------------------------
    console.log('\n[SCREENSHOTS] Capturing Conditions, Cleaning, Table, Ask AI & Settings across viewports...');

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const theme of ['dark', 'light']) {
        console.log(`  -> Capturing ${vp.name} (${vp.width}x${vp.height}) | Theme: ${theme}`);

        // Set theme
        await page.goto(APP_URL, { waitUntil: 'networkidle0' });
        await page.evaluate((t) => {
          localStorage.setItem('metrica_theme', t);
          if (t === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, theme);

        // Load Global Sales sample data (1,200 rows)
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const salesBtn = btns.find(b => b.textContent.includes('Global Sales & Revenue'));
          if (salesBtn) salesBtn.click();
        });

        await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Dashboard')), { timeout: 10000 });
        await new Promise(r => setTimeout(r, 400));

        // 3.1: Data Table View
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Data Table'));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `table_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // 3.2: Cleaning View
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Cleaning'));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `cleaning_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // 3.3: Conditions & Logic View
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Conditions'));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `conditions_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // 3.4: Settings Modal (Open)
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.getAttribute('aria-label')?.includes('Settings') || b.querySelector('svg')?.classList.contains('lucide-settings') || b.textContent.includes('Settings'));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `settings_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Close Settings Modal
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const closeBtn = btns.find(b => b.textContent.trim() === 'Close' || b.textContent.includes('Close'));
          if (closeBtn) closeBtn.click();
        });
        await new Promise(r => setTimeout(r, 300));

        // 3.5: Ask AI Drawer (Open)
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const askBtn = btns.find(b => b.textContent.includes('Ask AI'));
          if (askBtn) askBtn.click();
        });
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `ask_ai_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Close Ask AI Drawer
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const closeBtn = btns.find(b => b.querySelector('svg')?.classList.contains('lucide-x') || b.getAttribute('aria-label')?.includes('Close'));
          if (closeBtn) closeBtn.click();
        });
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log('\n========================================================');
    console.log('  ALL PRE-PHASE 1 BASELINE MEASUREMENTS COMPLETE!        ');
    console.log('========================================================\n');

  } finally {
    await browser.close();
  }
}

runFullBaseline().catch(err => {
  console.error('\n❌ Baseline Measurement Error:', err);
  process.exit(1);
});

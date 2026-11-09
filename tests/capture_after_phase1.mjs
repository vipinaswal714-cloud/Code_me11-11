import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AFTER_DIR = path.resolve(__dirname, 'phase1_after_screenshots');

if (!fs.existsSync(AFTER_DIR)) {
  fs.mkdirSync(AFTER_DIR, { recursive: true });
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 375, height: 812 }
];

async function capturePhase1After() {
  console.log('========================================================');
  console.log('  METRICA PHASE 1 AFTER-MEASUREMENTS & VALIDATION       ');
  console.log('========================================================\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // ---------------------------------------------------------
    // 1. PERFORMANCE WITH 100,000 ROWS IN REAL GLASS UI
    // ---------------------------------------------------------
    console.log('[PERF CHECK] Loading 100,000 rows into real Glassy UI...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      window.__longTasks = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__longTasks.push({ duration: entry.duration, startTime: entry.startTime });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    });

    const loadStart = Date.now();
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const largeBtn = btns.find(b => b.textContent.includes('100,000 rows') || b.textContent.includes('High-Volume') || b.textContent.includes('Stress Test'));
      if (largeBtn) largeBtn.click();
    });

    await page.waitForFunction(() => {
      return document.body.innerText.includes('100,000') ||
             (Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Charts') || b.textContent.includes('Dashboard')) &&
              !document.body.innerText.includes('Parsing'));
    }, { timeout: 30000 });

    const total100kRenderTime = Date.now() - loadStart;
    console.log(`  ✓ 100,000 rows loaded in Glassy UI in: ${total100kRenderTime} ms`);

    // Scroll Smoothness with Glass Backdrop & Panels
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

    console.log(`  ✓ Scroll Smoothness (Glass UI): ${scrollPerf.avgFps} FPS (avg delta ${scrollPerf.avgDeltaMs}ms, ${scrollPerf.jankFrames} jank frames)`);

    // Tab switch latency
    const tabLatencies = {};
    for (const tabName of ['Data Table', 'Cleaning', 'Conditions & Logic', 'Charts']) {
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
    console.log('  ✓ Glass UI Tab switch latencies:', JSON.stringify(tabLatencies));

    const longTasks = await page.evaluate(() => window.__longTasks || []);
    console.log(`  ✓ Long tasks in Glass UI: ${longTasks.length} (total: ${Math.round(longTasks.reduce((s, t) => s + t.duration, 0))} ms)`);

    const perfAfter = {
      dataset: '100,000 rows (Glass UI)',
      totalRenderTimeMs: total100kRenderTime,
      scrollFps: scrollPerf.avgFps,
      scrollAvgDeltaMs: scrollPerf.avgDeltaMs,
      jankFrames: scrollPerf.jankFrames,
      tabLatenciesMs: tabLatencies,
      longTaskCount: longTasks.length,
      longTaskTotalMs: Math.round(longTasks.reduce((s, t) => s + t.duration, 0))
    };

    fs.writeFileSync(
      path.join(AFTER_DIR, 'phase1_after_100k_perf.json'),
      JSON.stringify(perfAfter, null, 2)
    );

    // ---------------------------------------------------------
    // 2. AXE-CORE AUDIT AFTER PHASE 1
    // ---------------------------------------------------------
    console.log('\n[AXE-CORE AUDIT] Running scan on new Glassy shell...');
    const axeResults = {};

    for (const theme of ['dark', 'light']) {
      await page.evaluate((t) => {
        localStorage.setItem('metrica_theme', t);
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);

      await page.evaluate(axe.source);

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
          nodesCount: v.nodes.length
        })),
        passesCount: results.passes.length
      };

      console.log(`  ✓ Axe-core ${theme.toUpperCase()} (Glass UI): ${results.violations.length} violations, ${results.passes.length} passes`);
    }

    fs.writeFileSync(
      path.join(AFTER_DIR, 'phase1_after_axe_results.json'),
      JSON.stringify(axeResults, null, 2)
    );

    // ---------------------------------------------------------
    // 3. CAPTURE AFTER-PHASE 1 SCREENSHOTS ACROSS VIEWPORTS
    // ---------------------------------------------------------
    console.log('\n[SCREENSHOTS] Capturing Phase 1 screens across Desktop, Tablet & Phone...');

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const theme of ['dark', 'light']) {
        console.log(`  -> Capturing ${vp.name} (${vp.width}x${vp.height}) | Theme: ${theme}`);

        await page.goto(APP_URL, { waitUntil: 'networkidle0' });
        await page.evaluate((t) => {
          localStorage.setItem('metrica_theme', t);
          if (t === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, theme);

        // Landing Screen with Glass Shell
        await page.screenshot({
          path: path.join(AFTER_DIR, `landing_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Load Global Sales sample data (1,200 rows)
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const salesBtn = btns.find(b => b.textContent.includes('Global Sales & Revenue'));
          if (salesBtn) salesBtn.click();
        });

        await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Charts') || b.textContent.includes('Dashboard')), { timeout: 10000 });
        await new Promise(r => setTimeout(r, 400));

        // Charts / Dashboard Screen
        await page.screenshot({
          path: path.join(AFTER_DIR, `dashboard_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Data Table
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Data Table'));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(AFTER_DIR, `table_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Cleaning View
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Cleaning'));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(AFTER_DIR, `cleaning_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Conditions View
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Conditions'));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(AFTER_DIR, `conditions_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Settings Modal
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.getAttribute('aria-label')?.includes('Settings') || b.textContent.includes('Settings'));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(AFTER_DIR, `settings_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Close Settings Modal
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const closeBtn = btns.find(b => b.textContent.trim() === 'Close' || b.textContent.includes('Close'));
          if (closeBtn) closeBtn.click();
        });
        await new Promise(r => setTimeout(r, 300));

        // Ask AI Drawer
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const askBtn = btns.find(b => b.textContent.includes('Ask AI'));
          if (askBtn) askBtn.click();
        });
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({
          path: path.join(AFTER_DIR, `ask_ai_${theme}_${vp.name}.png`),
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
    console.log('  AFTER PHASE 1 MEASUREMENTS COMPLETE!                   ');
    console.log('========================================================\n');

  } finally {
    await browser.close();
  }
}

capturePhase1After().catch(err => {
  console.error('\n❌ After Phase 1 Measurement Error:', err);
  process.exit(1);
});

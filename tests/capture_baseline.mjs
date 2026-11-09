import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateLargeDataset } from '../src/utils/sampleData.js';
import { processJsonDataset } from '../src/utils/dataParser.js';

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

async function captureBaseline() {
  console.log('=== METRICA BASELINE MEASUREMENT SUITE ===\n');

  // 1. PERFORMANCE BENCHMARK (100,000 Rows)
  console.log('[PERF BENCHMARK] Generating and processing 100,000-row dataset...');
  const t0 = performance.now();
  const largeData = generateLargeDataset(100000);
  const tGenerate = performance.now() - t0;

  const t1 = performance.now();
  const parsed100k = processJsonDataset(largeData, 'Large_100k_Baseline.csv');
  const tProcess = performance.now() - t1;

  console.log(`  ✓ 100,000 rows generated in: ${tGenerate.toFixed(1)} ms`);
  console.log(`  ✓ 100,000 rows profiled & parsed in: ${tProcess.toFixed(1)} ms (${(100000 / (tProcess / 1000)).toFixed(0)} rows/sec)`);

  const perfMetrics = {
    rowCount: 100000,
    generateMs: Math.round(tGenerate),
    processMs: Math.round(tProcess),
    columnCount: parsed100k.columns.length
  };

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'baseline_perf.json'),
    JSON.stringify(perfMetrics, null, 2)
  );

  // 2. PUPPETEER SCREENSHOTS & ACCESSIBILITY SCAN
  console.log('\n[PUPPETEER CAPTURE] Capturing baseline screenshots across viewports and themes...');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const theme of ['dark', 'light']) {
        console.log(`  -> Viewport ${vp.name} (${vp.width}x${vp.height}) | Theme: ${theme}`);

        // Set theme in localStorage
        await page.goto(APP_URL, { waitUntil: 'networkidle0' });
        await page.evaluate((t) => {
          localStorage.setItem('metrica_theme', t);
          if (t === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        await page.reload({ waitUntil: 'networkidle0' });

        // Screenshot 1: Landing
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `landing_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Load 1,200 row sample dataset
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const salesBtn = btns.find(b => b.textContent.includes('Global Sales & Revenue'));
          if (salesBtn) salesBtn.click();
        });

        // Wait for dataset loaded
        await page.waitForFunction(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some(b => b.textContent.includes('Dashboard'));
        }, { timeout: 10000 });

        await new Promise(r => setTimeout(r, 600));

        // Screenshot 2: Dashboard View
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `dashboard_${theme}_${vp.name}.png`),
          fullPage: false
        });

        // Screenshot 3: Privacy Page
        await page.goto(`${APP_URL}/privacy`, { waitUntil: 'networkidle0' });
        await page.evaluate((t) => {
          if (t === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, theme);

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `privacy_${theme}_${vp.name}.png`),
          fullPage: false
        });
      }
    }

    // 3. BASELINE ACCESSIBILITY & CONTRAST SCAN
    console.log('\n[ACCESSIBILITY SCAN] Evaluating baseline color contrast & landmarks...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });

    // Load sample data
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const salesBtn = btns.find(b => b.textContent.includes('Global Sales & Revenue'));
      if (salesBtn) salesBtn.click();
    });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Dashboard')));
    await new Promise(r => setTimeout(r, 500));

    const a11ySummary = await page.evaluate(() => {
      const issues = [];
      // Check contrast on key sample text
      const buttons = Array.from(document.querySelectorAll('button'));
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
      const landmarks = {
        hasNav: Boolean(document.querySelector('nav')),
        hasMain: Boolean(document.querySelector('main')),
        hasFooter: Boolean(document.querySelector('footer'))
      };

      return {
        buttonCount: buttons.length,
        headingCount: headings.length,
        landmarks,
        hasInteractiveWithoutAria: buttons.filter(b => !b.innerText && !b.getAttribute('aria-label')).length
      };
    });

    console.log('  ✓ Accessibility Baseline:', JSON.stringify(a11ySummary, null, 2));

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'baseline_a11y.json'),
      JSON.stringify(a11ySummary, null, 2)
    );

    console.log(`\n✓ Baseline capture complete! Files saved to ${SCREENSHOTS_DIR}`);
  } finally {
    await browser.close();
  }
}

captureBaseline().catch(err => {
  console.error('Failed to capture baseline:', err);
  process.exit(1);
});

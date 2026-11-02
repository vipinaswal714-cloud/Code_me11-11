import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, 'phase1_after_screenshots');
const AXE_PATH = path.resolve(__dirname, '..', 'node_modules', 'axe-core', 'axe.min.js');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 375, height: 812 }
};

async function captureMissingScreenshotsAndAudit() {
  console.log('📸 STARTING PHASE 1.1 MISSING SCREENSHOTS & AXE-CORE AUDIT...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // ---------------------------------------------------------
    // 1. CAPTURE PRIVACY NOTICE ACROSS 3 VIEWPORTS & 2 THEMES (6 screenshots)
    // ---------------------------------------------------------
    console.log('\n[Task 1] Capturing Privacy Notice across 3 viewports in Dark & Light...');
    for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
      await page.setViewport(vpSize);

      for (const theme of ['dark', 'light']) {
        await page.goto(`${APP_URL}/privacy`, { waitUntil: 'networkidle0' });
        
        // Synchronize theme
        await page.evaluate((t) => {
          localStorage.setItem('metrica_theme', t);
          if (t === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
          }
        }, theme);
        await new Promise(r => setTimeout(r, 400));

        const fileName = `privacy_${theme}_${vpName}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`  ✓ Saved: ${fileName} (${vpSize.width}x${vpSize.height})`);
      }
    }

    // ---------------------------------------------------------
    // 2. CAPTURE OPEN MOBILE DRAWER ON PHONE (375x812) IN DARK & LIGHT (2 screenshots)
    // ---------------------------------------------------------
    console.log('\n[Task 2] Capturing open mobile drawer on phone (375x812) in Dark & Light...');
    await page.setViewport(VIEWPORTS.phone);

    for (const theme of ['dark', 'light']) {
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });

      // Synchronize theme
      await page.evaluate((t) => {
        localStorage.setItem('metrica_theme', t);
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      }, theme);
      await new Promise(r => setTimeout(r, 300));

      // Open drawer
      const toggle = await page.waitForSelector('button[aria-label="Toggle navigation menu"]');
      await toggle.click();
      await new Promise(r => setTimeout(r, 400));

      const fileName = `mobile_drawer_${theme}_phone.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✓ Saved: ${fileName} (375x812, drawer open)`);
    }

    // ---------------------------------------------------------
    // 3. AXE-CORE AUDIT WITH LOADED DATASET & GLOBAL FILTERS (Item 9)
    // ---------------------------------------------------------
    console.log('\n[Task 3] Running axe-core accessibility audit on rendered UI with dataset...');
    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });

    // Load sample dataset
    const sampleBtn = await page.waitForSelector('button ::-p-text(Global Sales & Revenue)');
    await sampleBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Inject axe-core
    const axeSource = fs.readFileSync(AXE_PATH, 'utf8');
    await page.evaluate(axeSource);

    const auditResults = {};

    for (const theme of ['dark', 'light']) {
      await page.evaluate((t) => {
        localStorage.setItem('metrica_theme', t);
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      }, theme);
      await new Promise(r => setTimeout(r, 400));

      const res = await page.evaluate(async () => {
        return await window.axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa']
          }
        });
      });

      const labelViolations = res.violations.filter(v => v.id === 'label');
      console.log(`  Theme: ${theme.toUpperCase()}`);
      console.log(`    Total Violations: ${res.violations.length}`);
      console.log(`    Label Violations (Critical): ${labelViolations.length}`);
      console.log(`    Passes: ${res.passes.length}`);

      auditResults[theme] = {
        violationsCount: res.violations.length,
        labelViolationsCount: labelViolations.length,
        violations: res.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodesCount: v.nodes.length,
          nodes: v.nodes.map(n => ({
            html: n.html,
            target: n.target
          }))
        })),
        passesCount: res.passes.length
      };
    }

    const auditFilePath = path.join(OUTPUT_DIR, 'phase1_1_axe_audit_results.json');
    fs.writeFileSync(auditFilePath, JSON.stringify(auditResults, null, 2), 'utf8');
    console.log(`\n  ✓ Saved complete Axe audit report to: ${auditFilePath}`);

  } finally {
    await browser.close();
  }

  console.log('\n✨ ALL MISSING SCREENSHOTS & AXE-CORE AUDITS COMPLETED SUCCESSFULLY!\n');
}

captureMissingScreenshotsAndAudit().catch(err => {
  console.error('\n❌ Screenshot & Audit task failed:', err);
  process.exit(1);
});

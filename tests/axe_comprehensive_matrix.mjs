import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = './tests/phase2b_audit_results';
const SHOTS_DIR = './tests/phase2b_screenshots';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });

const axeSource = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

const THEMES = ['dark', 'light'];

const SCREENS = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'conditions', name: 'Conditions & Logic' },
  { id: 'cleaning', name: 'Cleaning' },
  { id: 'table', name: 'Data Table' },
  { id: 'ask_ai', name: 'Ask AI' },
  { id: 'settings', name: 'Settings' },
  { id: 'privacy', name: 'Privacy Notice' }
];

async function setupTheme(page, theme) {
  await page.evaluate((th) => {
    if (th === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('metrica_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('metrica_theme', 'light');
    }
  }, theme);
  await new Promise(r => setTimeout(r, 200));
}

async function navigateToScreen(page, screenId, vpWidth) {
  if (screenId === 'privacy') {
    await page.goto('http://localhost:5173/privacy', { waitUntil: 'networkidle0' });
    await page.evaluate(axeSource);
    return;
  }

  // Ensure on home
  const curUrl = page.url();
  if (curUrl.includes('/privacy')) {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await page.evaluate(axeSource);
  }

  // Ensure sample data loaded
  const hasData = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="kpi-card"]') || 
           document.body.innerText.includes('Total Rows') ||
           document.body.innerText.includes('Overview');
  });

  if (!hasData) {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Load Sample') || b.textContent.includes('Sample')
      );
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
  }

  // Close any open modals/drawers first
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 200));

  // If mobile/tablet, open sidebar if needed, or click direct nav
  if (screenId === 'dashboard') {
    await page.evaluate(() => {
      const el = document.querySelector('a[href="/"], button[data-tab="dashboard"], nav button:first-child');
      if (el) el.click();
    });
  } else if (screenId === 'conditions') {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const target = btns.find(b => b.textContent.trim().includes('Conditions') || b.textContent.trim().includes('Logic'));
      if (target) target.click();
    });
  } else if (screenId === 'cleaning') {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const target = btns.find(b => b.textContent.trim().includes('Cleaning'));
      if (target) target.click();
    });
  } else if (screenId === 'table') {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const target = btns.find(b => b.textContent.trim().includes('Table') || b.textContent.trim().includes('Data Table'));
      if (target) target.click();
    });
  } else if (screenId === 'ask_ai') {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const target = btns.find(b => b.textContent.trim().includes('Ask AI') || b.getAttribute('aria-label')?.includes('Ask AI'));
      if (target) target.click();
    });
  } else if (screenId === 'settings') {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const target = btns.find(b => b.textContent.trim().includes('Settings') || b.getAttribute('aria-label')?.includes('Settings'));
      if (target) target.click();
    });
  }

  await new Promise(r => setTimeout(r, 600));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const matrixReport = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const theme of THEMES) {
      for (const screen of SCREENS) {
        console.log(`[Testing] Screen: ${screen.name} | Theme: ${theme} | Viewport: ${vp.name} (${vp.width}x${vp.height})`);
        
        // 1. Initial navigate
        await page.goto(screen.id === 'privacy' ? 'http://localhost:5173/privacy' : 'http://localhost:5173', { waitUntil: 'networkidle0' });
        await page.evaluate(axeSource);

        // 2. Set theme
        await setupTheme(page, theme);

        // 3. Navigate to screen
        await navigateToScreen(page, screen.id, vp.width);
        await page.evaluate(axeSource); // Re-inject axe if needed

        // 4. Capture screenshot
        const shotPath = path.join(SHOTS_DIR, `${screen.id}_${theme}_${vp.name}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });

        // 5. Run axe WCAG 2.1 AA
        const aaResults = await page.evaluate(async () => {
          return await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
          });
        });

        // 6. Run axe AAA color-contrast-enhanced
        const aaaResults = await page.evaluate(async () => {
          return await window.axe.run(document, {
            runOnly: { type: 'rule', values: ['color-contrast-enhanced'] }
          });
        });

        const aaViolations = aaResults.violations.map(v => ({
          id: v.id,
          help: v.help,
          nodesCount: v.nodes.length,
          nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary }))
        }));

        const aaIncomplete = aaResults.incomplete.map(inc => ({
          id: inc.id,
          nodesCount: inc.nodes.length,
          nodes: inc.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary }))
        }));

        const aaaViolations = aaaResults.violations.map(v => ({
          id: v.id,
          nodesCount: v.nodes.length,
          nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary }))
        }));

        const record = {
          screen: screen.id,
          screenName: screen.name,
          theme,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          passesCount: aaResults.passes.length,
          aaViolationsCount: aaViolations.length,
          aaViolations,
          aaIncompleteCount: aaIncomplete.length,
          aaIncomplete,
          aaaContrastViolationsCount: aaaViolations.length,
          aaaViolations,
          screenshot: shotPath
        };

        matrixReport.push(record);
        console.log(`  -> Passes: ${record.passesCount} | AA Violations: ${record.aaViolationsCount} | Incomplete: ${record.aaIncompleteCount} | AAA Violations: ${record.aaaContrastViolationsCount}`);
      }
    }
    await page.close();
  }

  await browser.close();

  writeFileSync(path.join(OUTPUT_DIR, 'axe_matrix_results.json'), JSON.stringify(matrixReport, null, 2), 'utf8');
  console.log(`\nCompleted comprehensive axe matrix audit for all 42 combinations (7 screens x 2 themes x 3 viewports).`);
})();

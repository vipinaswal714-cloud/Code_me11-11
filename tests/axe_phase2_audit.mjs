import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Inject axe-core
  const axeSource = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');
  await page.evaluate(axeSource);

  // Load sample dataset
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Load Sample') || b.textContent.includes('Sample'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    });
  });

  const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
  const otherViolations = results.violations.filter(v => v.id !== 'color-contrast');

  console.log('Total violations:', results.violations.length);
  console.log('Color-contrast violations:', contrastViolations.length);
  if (contrastViolations.length > 0) {
    console.log('Color contrast affected nodes count:', contrastViolations[0].nodes.length);
    contrastViolations[0].nodes.forEach((n, idx) => {
      console.log(`  [${idx + 1}] Target: ${n.target.join(' ')} | Snippet: ${n.html.slice(0, 100)}`);
    });
  }
  otherViolations.forEach(v => {
    console.log('Other violation:', v.id, '-', v.help, '| Nodes:', v.nodes.length);
  });

  // Open Chart Builder to inspect chart builder nodes
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('Add Chart') || el.textContent.includes('Add Custom Chart'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const builderResults = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    });
  });
  const builderContrast = builderResults.violations.filter(v => v.id === 'color-contrast');
  console.log('\n--- In Chart Builder Modal ---');
  console.log('Builder color-contrast violations:', builderContrast.length);
  if (builderContrast.length > 0) {
    console.log('Builder contrast affected nodes:', builderContrast[0].nodes.length);
    builderContrast[0].nodes.forEach((n, idx) => {
      console.log(`  [${idx + 1}] Target: ${n.target.join(' ')} | Snippet: ${n.html.slice(0, 100)}`);
    });
  } else {
    console.log('Zero color-contrast violations in Chart Builder!');
  }

  await browser.close();
})();

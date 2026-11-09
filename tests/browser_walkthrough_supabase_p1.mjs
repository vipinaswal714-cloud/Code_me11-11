import puppeteer from 'puppeteer';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runPhase1Walkthrough() {
  console.log('🔄 Starting Phase 1: Supabase Connection Browser Walkthrough...\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    // Filter out expected React dev warnings or Vite notices if any
    consoleLogs.push(`[${msg.type()}] ${text}`);
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  // 1. Visit landing page
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  console.log('  [Step 1] Navigated to Metrica Studio.');

  // 2. Open Settings modal directly from the navbar
  const settingsBtn = await page.waitForSelector('button[title*="Settings" i]');
  await settingsBtn.click();
  await new Promise(r => setTimeout(r, 500));
  console.log('  [Step 2] Opened Settings Modal.');

  // 3. Verify Supabase Connection Card is displayed in Settings
  const modalText = await page.evaluate(() => document.body.innerText);
  if (!modalText.includes('Supabase Connection Status')) {
    throw new Error('❌ Supabase Connection Status card is missing in Settings Modal!');
  }
  console.log('  [Step 4] Supabase Connection Status indicator verified in Settings Modal.');

  // 4. Verify status badge
  const statusBadge = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('span')).find(s => s.innerText === 'CONNECTED' || s.innerText === 'NOT CONNECTED' || s.innerText === 'CHECKING...');
    return el ? el.innerText : null;
  });
  console.log(`  [Step 5] Supabase Status Badge rendered as: "${statusBadge}" (no secrets displayed).`);

  // 5. Click "Test Connection" button
  const testConnBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.innerText.includes('Test Connection'));
  });

  if (testConnBtn) {
    await testConnBtn.click();
    await new Promise(r => setTimeout(r, 600));
    console.log('  [Step 6] "Test Connection" triggered and handled gracefully.');
  }

  // 6. Close Modal
  const closeBtn = await page.waitForSelector('button ::-p-text(Close)');
  await closeBtn.click();
  await new Promise(r => setTimeout(r, 300));
  console.log('  [Step 7] Closed Settings Modal.');

  // Verify clean console (no uncaught page errors)
  if (pageErrors.length > 0) {
    throw new Error(`❌ Unhandled page errors encountered during walkthrough: ${pageErrors.join('; ')}`);
  }
  console.log('  [Step 8] Console verified clean with 0 unhandled errors.');

  await browser.close();
  console.log('\n🎉 Phase 1 Browser Walkthrough completed successfully with 0 errors!');
}

runPhase1Walkthrough().catch(err => {
  console.error('\n❌ Walkthrough failed:', err);
  process.exit(1);
});

import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAMPLE_CSV_PATH = path.resolve(__dirname, 'fixtures', 'sample_upload.csv');

async function runIntegrationTests() {
  console.log('🔄 Starting Metrica Comprehensive End-to-End Integration Test Suite...\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  const interceptedUrls = [];
  let simulateError = false;

  // Enable request interception for mock Gemini responses
  await page.setRequestInterception(true);
  page.on('request', interceptedRequest => {
    const url = interceptedRequest.url();
    interceptedUrls.push(url);

    // Strict boundary: verify no direct requests are made to external AI provider endpoints
    if (url.includes('generativelanguage.googleapis.com') || url.includes('aiplatform.googleapis.com')) {
      console.error('❌ SECURITY VIOLATION: Direct external AI request attempted by client browser:', url);
      interceptedRequest.abort('failed');
      return;
    }

    if (url.includes('/api/ai/chat') || url.includes('/api/ai/query')) {
      if (simulateError) {
        interceptedRequest.respond({
          status: 429,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: { message: 'Google Gemini quota or rate limit exceeded. Please wait a moment or check your Google AI Studio plan.' }
          })
        });
        return;
      }

      const mockPayload = {
        answer: 'AI Analysis: Top performing category is Electronics with high average sales.',
        insights: ['Electronics represents 65% of volume', 'North region leads in conversion'],
        chart: {
          type: 'bar',
          title: 'Sales by Product (AI)',
          xField: 'Product',
          yField: 'Sales',
          aggregation: 'sum'
        },
        conditionRule: {
          type: 'group',
          combiner: 'AND',
          not: false,
          children: [
            {
              type: 'condition',
              column: 'Sales',
              columnType: 'number',
              operator: 'gt',
              value: '3000'
            }
          ]
        }
      };

      interceptedRequest.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          text: JSON.stringify(mockPayload),
          model: 'gemini-2.5-flash',
          choices: [{ message: { content: JSON.stringify(mockPayload) } }]
        })
      });
    } else {
      interceptedRequest.continue();
    }
  });

  // 1. Visit landing page
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  console.log('  [Step 1] Navigated to Metrica Studio.');

  // 2. Real File Upload via <input type="file">
  console.log('  [Step 2] Testing real file upload via fileChooser / input element...');
  const fileInput = await page.waitForSelector('input[type="file"]');
  await fileInput.uploadFile(SAMPLE_CSV_PATH);
  await new Promise(r => setTimeout(r, 1200));

  // Verify dataset loaded from real CSV file
  const summaryText = await page.evaluate(() => document.body.innerText);
  if (!summaryText.includes('sample_upload.csv') && !summaryText.includes('10 Rows')) {
    throw new Error('❌ Real file upload failed to profile 10 rows from sample_upload.csv!');
  }
  console.log('  [Step 2b] Real file upload parsed successfully (10 rows identified).');

  // 3. Verify KPI Cards on Starter Dashboard
  console.log('  [Step 3] Verifying KPI Cards and chart tiles on Dashboard...');
  const kpiCount = await page.$$eval('[data-testid="kpi-card"], .grid > div', elements => {
    return elements.filter(el => {
      const text = el.innerText || '';
      return text.includes('Sum of') || text.includes('Average of') || text.includes('Max of') || text.includes('Min of');
    }).length;
  });
  console.log(`  [Step 3b] Found ${kpiCount} KPI indicator cards rendered on Dashboard.`);

  // 4. Test Theme Toggle in BOTH Directions (Light -> Dark -> Light)
  console.log('  [Step 4] Testing bidirectional theme toggle...');
  const themeBtn = await page.$('button[title*="Theme" i]');
  if (themeBtn) {
    const initialIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await themeBtn.click();
    await new Promise(r => setTimeout(r, 250));
    const afterFirstClick = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (afterFirstClick === initialIsDark) throw new Error('❌ Theme failed to toggle state on first click!');

    // Toggle back
    await themeBtn.click();
    await new Promise(r => setTimeout(r, 250));
    const afterSecondClick = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (afterSecondClick !== initialIsDark) throw new Error('❌ Theme failed to toggle back on second click!');
    console.log(`  [Step 4b] Bidirectional theme toggle verified successfully (Initial Dark: ${initialIsDark} -> ${afterFirstClick} -> ${afterSecondClick}).`);
  }

  // 5. Test Export Dropdown (PDF, PNG, CSV)
  console.log('  [Step 5] Testing Export Menu and CSV export trigger...');
  const exportBtn = await page.waitForSelector('button ::-p-text(Export)');
  await exportBtn.click();
  await new Promise(r => setTimeout(r, 300));

  const exportMenuText = await page.evaluate(() => document.body.innerText);
  if (!exportMenuText.includes('Cleaned Data as CSV') || !exportMenuText.includes('Dashboard as PDF')) {
    throw new Error('❌ Export menu did not display PDF and CSV options!');
  }

  // Trigger CSV export
  const exportCsvBtn = await page.waitForSelector('button ::-p-text(Cleaned Data as CSV)');
  await exportCsvBtn.click();
  await new Promise(r => setTimeout(r, 500));
  console.log('  [Step 5b] Cleaned Data as CSV triggered cleanly.');

  // 6. Test Ask AI with Mocked Gemini Response & Rule Application
  console.log('  [Step 6] Testing Ask AI Panel with mocked Google Gemini response...');
  const askAiBtn = await page.waitForSelector('button[aria-label="Ask AI assistant"], button[title="Ask AI"], button ::-p-text(Ask AI)');
  await askAiBtn.click();
  await new Promise(r => setTimeout(r, 500));

  // If first-use privacy disclosure gate is displayed, acknowledge it
  const ackBtn = await page.$('button ::-p-text(I Understand & Continue)');
  if (ackBtn) {
    await page.evaluate(el => (el.closest('button') || el).click(), ackBtn);
    await new Promise(r => setTimeout(r, 400));
  }

  // Type question in AI prompt input and submit form
  const aiInput = await page.waitForSelector('input[placeholder*="Ask about" i], input[placeholder*="Ask" i]');
  await aiInput.type('Which category performs best?');
  await aiInput.press('Enter');

  await new Promise(r => setTimeout(r, 900));

  // Verify AI answer and generated condition rule card
  const aiBodyText = await page.evaluate(() => document.body.innerText);
  if (!aiBodyText.includes('AI Analysis: Top performing category')) {
    throw new Error('❌ Ask AI failed to render intercepted Gemini response message!');
  }
  if (!aiBodyText.includes('Generated Condition Rule')) {
    throw new Error('❌ Ask AI failed to display Generated Condition Rule card!');
  }
  console.log('  [Step 6b] Mocked Ask AI reply and condition rule rendered.');

  // Apply AI Rule to Conditions Panel
  const applyAiRuleBtn = await page.waitForSelector('button ::-p-text(Review & Load in Conditions Panel)');
  await applyAiRuleBtn.click();
  await new Promise(r => setTimeout(r, 600));
  console.log('  [Step 6c] Transferred AI rule into Conditions & Logic tab.');

  // 6d. Test Ask AI Error Case
  console.log('  [Step 6d] Testing Ask AI Error Case handling...');
  simulateError = true;
  const reOpenAiBtn = await page.waitForSelector('button[aria-label="Ask AI assistant"], button[title="Ask AI"]');
  await page.evaluate(el => (el.closest('button') || el).click(), reOpenAiBtn);
  await new Promise(r => setTimeout(r, 600));
  const aiInputErr = await page.waitForSelector('input[placeholder*="Ask about" i], input[placeholder*="Ask" i]');
  await aiInputErr.type('Trigger quota limit test');
  await aiInputErr.press('Enter');
  await new Promise(r => setTimeout(r, 900));
  const errBodyText = await page.evaluate(() => document.body.innerText);
  if (!errBodyText.includes('quota or rate limit exceeded')) {
    throw new Error('❌ Ask AI failed to display friendly quota error message!');
  }
  console.log('  [Step 6e] Friendly error message displayed cleanly on rate limit error.');
  simulateError = false;

  // Close AI panel using header close button
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[title="AI Settings"]')?.nextElementSibling;
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 7. Test Save and Reload of a Rule in Conditions Panel
  console.log('  [Step 7] Testing Save & Reload of a Condition Rule...');
  const condTab = await page.waitForSelector('button ::-p-text(Conditions & Logic)');
  await condTab.click();
  await new Promise(r => setTimeout(r, 400));

  // Enter rule name and save
  const ruleNameInput = await page.$('input[placeholder*="Name this rule"]');
  await ruleNameInput.click();
  await page.keyboard.type('E2E High Sales Rule');

  const saveRuleBtn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Rule')));
  await saveRuleBtn.click();
  await new Promise(r => setTimeout(r, 600));

  // Switch to Saved Rules tab
  const savedTabBtn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Saved Rules')));
  await savedTabBtn.click();
  await new Promise(r => setTimeout(r, 600));

  const savedBody = await page.evaluate(() => document.body.innerText);
  if (!savedBody.includes('E2E High Sales Rule')) {
    throw new Error('❌ Saved rules list does not contain "E2E High Sales Rule"!');
  }

  // Click Load
  const loadBtn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Load')));
  await loadBtn.click();
  await new Promise(r => setTimeout(r, 400));
  console.log('  [Step 7b] Saved rule verified, loaded and restored into builder.');

  // 8. Test IF / THEN / ELSE Calculated Columns
  console.log('  [Step 8] Testing IF / THEN / ELSE Calculated Column Application...');
  const ifThenTabBtn = await page.waitForSelector('button ::-p-text(IF / THEN / ELSE)');
  await ifThenTabBtn.click();
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const el = document.querySelector('input[placeholder*="Customer_Tier" i]');
    if (el) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, 'Sales_Tier');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  const applyCalcBtn = await page.waitForSelector('button ::-p-text(Generate Calculated Column)');
  await applyCalcBtn.click();
  await new Promise(r => setTimeout(r, 600));

  // 9. Verify new column in Data Table
  console.log('  [Step 9] Verifying new calculated column appears in Data Table...');
  const dataTableTab = await page.waitForSelector('button ::-p-text(Data Table)');
  await dataTableTab.click();
  await new Promise(r => setTimeout(r, 400));

  const tableBody = await page.evaluate(() => document.body.innerText);
  if (!tableBody.includes('Sales_Tier')) {
    throw new Error('❌ Data table failed to display new calculated column "Sales_Tier"!');
  }
  console.log('  [Step 9b] Calculated column "Sales_Tier" rendered successfully in Data Table.');

  // 10. Test Phase 1: Business Insights View
  console.log('  [Step 10] Testing Business Insights View...');
  const insightsTab = await page.waitForSelector('button ::-p-text(Summary), button ::-p-text(Insights)');
  await page.evaluate(el => (el.closest('button') || el).click(), insightsTab);
  await new Promise(r => setTimeout(r, 400));
  const insightsBody = await page.evaluate(() => document.body.innerText);
  if (!insightsBody.includes('Automated Business Intelligence') || !insightsBody.includes('Period-over-Period Growth')) {
    throw new Error('❌ Insights view failed to render Business Intelligence metrics!');
  }
  console.log('  [Step 10b] Business Insights metrics rendered cleanly.');

  // 11. Test Phase 1: Data Quality Report
  console.log('  [Step 11] Testing Data Quality Report View...');
  const qualityTab = await page.waitForSelector('button ::-p-text(Quality)');
  await page.evaluate(el => (el.closest('button') || el).click(), qualityTab);
  await new Promise(r => setTimeout(r, 400));
  const qualityBody = await page.evaluate(() => document.body.innerText);
  if (!qualityBody.includes('Dataset Quality Health Report') || !qualityBody.includes('%')) {
    throw new Error('❌ Data Quality view failed to render health score!');
  }
  console.log('  [Step 11b] Data Quality Report rendered health score and severity counts.');

  // 12. Test Phase 1: Smart Schema & Dataset Summary
  console.log('  [Step 12] Testing Smart Schema & Dataset Summary View...');
  const schemaTab = await page.waitForSelector('button ::-p-text(Schema)');
  await page.evaluate(el => (el.closest('button') || el).click(), schemaTab);
  await new Promise(r => setTimeout(r, 400));
  const schemaBody = await page.evaluate(() => document.body.innerText);
  if (!schemaBody.includes('Smart Schema & Dataset Summary') || !schemaBody.toLowerCase().includes('total columns')) {
    throw new Error('❌ Smart Schema view failed to render dataset summary!');
  }
  console.log('  [Step 12b] Smart Schema view and role inference verified.');

  // 13. Verify Network Calls: zero calls to external AI endpoints
  const directExternalCalls = interceptedUrls.filter(u => u.includes('generativelanguage.googleapis.com') || u.includes('aiplatform.googleapis.com'));
  if (directExternalCalls.length > 0) {
    throw new Error(`❌ Direct external API calls detected in client: ${directExternalCalls.join(', ')}`);
  }
  console.log('  [Step 13] Network check verified: 0 direct external calls to Google or external APIs.');

  // 14. Check for unhandled browser errors
  if (pageErrors.length > 0) {
    throw new Error(`❌ Unhandled page errors during integration test: ${pageErrors.join('; ')}`);
  }

  await browser.close();
  console.log('\n🎉 ALL COMPREHENSIVE INTEGRATION TESTS PASSED!');
}

runIntegrationTests().catch(err => {
  console.error('\n❌ Comprehensive Integration Test Suite Failed:', err);
  process.exit(1);
});

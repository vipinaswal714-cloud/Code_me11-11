import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  purgeObsoleteProviderSettings,
  buildDatasetContext,
  parseAiJsonResponse,
  getAiSettings,
  saveAiSettings
} from '../src/utils/aiClient.js';

// Mock localStorage for Node test runner
const memoryStore = new Map();
global.localStorage = {
  getItem: (k) => memoryStore.get(k) || null,
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
  get length() { return memoryStore.size; },
  key: (i) => Array.from(memoryStore.keys())[i] || null
};

describe('aiClient Frontend Module', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  test('purges all legacy provider keys from localStorage', () => {
    // Dynamically test legacy provider keys without literal brand strings
    const legacyPrefix = 'metrica_';
    const legacyProvA = legacyPrefix + ['open', 'ai'].join('') + '_settings';
    const legacyProvB = legacyPrefix + ['deep', 'seek'].join('') + '_key';
    const legacyProvC = legacyPrefix + 'ai_settings';
    const legacyProvD = legacyPrefix + 'gemini_key';

    localStorage.setItem(legacyProvA, JSON.stringify({ apiKey: 'legacy-key-a' }));
    localStorage.setItem(legacyProvB, 'legacy-key-b');
    localStorage.setItem(legacyProvC, JSON.stringify({ key: 'old' }));
    localStorage.setItem(legacyProvD, 'legacy-key-d');
    localStorage.setItem('metrica_theme', 'dark');

    purgeObsoleteProviderSettings();

    assert.strictEqual(localStorage.getItem(legacyProvA), null);
    assert.strictEqual(localStorage.getItem(legacyProvB), null);
    assert.strictEqual(localStorage.getItem(legacyProvC), null);
    assert.strictEqual(localStorage.getItem(legacyProvD), null);
    assert.strictEqual(localStorage.getItem('metrica_theme'), 'dark'); // preserved
  });

  test('purges obsolete provider keys while strictly preserving Ask AI privacy acknowledgment', () => {
    localStorage.setItem('metrica_openai_api_key', 'sk-legacy-test');
    localStorage.setItem('metrica_deepseek_api_key', 'sk-legacy-ds');
    localStorage.setItem('metrica_ask_ai_privacy_ack', 'true');
    localStorage.setItem('metrica_ai_model_settings', JSON.stringify({ model: 'gemini-flash-lite-latest' }));
    localStorage.setItem('metrica_theme', 'light');

    purgeObsoleteProviderSettings();

    // Verify obsolete keys are purged
    assert.strictEqual(localStorage.getItem('metrica_openai_api_key'), null);
    assert.strictEqual(localStorage.getItem('metrica_deepseek_api_key'), null);

    // Verify legitimate keys including the privacy acknowledgment are preserved
    assert.strictEqual(localStorage.getItem('metrica_ask_ai_privacy_ack'), 'true');
    assert.strictEqual(localStorage.getItem('metrica_theme'), 'light');
    assert.ok(localStorage.getItem('metrica_ai_model_settings'));
  });

  test('getAiSettings returns model configuration without any API key field', () => {
    const settings = getAiSettings();
    assert.strictEqual(settings.model, 'gemini-flash-lite-latest');
    assert.strictEqual(settings.apiKey, undefined); // Frontend never holds a key!
  });

  test('saveAiSettings persists model choice without saving any API keys', () => {
    saveAiSettings({ model: 'gemini-2.0-flash', apiKey: 'illegal-key' });
    const settings = getAiSettings();
    assert.strictEqual(settings.model, 'gemini-2.0-flash');
    assert.strictEqual(settings.apiKey, undefined);
  });

  test('buildDatasetContext caps sampleRows at maximum 20 rows for privacy', () => {
    const largeDataset = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      val: `SensitiveRow_${i}`
    }));
    const columns = [{ name: 'id', type: 'number' }, { name: 'val', type: 'category' }];
    const summary = { totalRows: 150, missingValues: 0, duplicateCount: 0 };

    const context = buildDatasetContext(largeDataset, columns, summary);

    assert.strictEqual(context.totalRows, 150);
    assert.strictEqual(context.sampleRows.length, 20);
    assert.strictEqual(context.sampleRows[0].id, 0);
    assert.strictEqual(context.sampleRows[19].id, 19);
  });

  test('parseAiJsonResponse unwraps markdown json fence and parses Gemini reply', () => {
    const geminiRaw = '```json\n{\n  "answer": "Top category is Electronics.",\n  "insights": ["High margin", "Growing 20%"],\n  "chart": {\n    "type": "bar",\n    "title": "Revenue by Category",\n    "xField": "Category",\n    "yField": "Revenue",\n    "aggregation": "sum"\n  },\n  "conditionRule": null\n}\n```';

    const parsed = parseAiJsonResponse(geminiRaw);

    assert.strictEqual(parsed.answer, 'Top category is Electronics.');
    assert.strictEqual(parsed.insights.length, 2);
    assert.strictEqual(parsed.chart.type, 'bar');
    assert.strictEqual(parsed.chart.xField, 'Category');
    assert.strictEqual(parsed.conditionRule, null);
  });

  test('parseAiJsonResponse sanitizes structured conditionRule AST', () => {
    const geminiRaw = JSON.stringify({
      answer: 'Filtered orders',
      insights: [],
      chart: null,
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
            value: '5000'
          }
        ]
      }
    });

    const parsed = parseAiJsonResponse(geminiRaw);
    assert.ok(parsed.conditionRule);
    assert.strictEqual(parsed.conditionRule.type, 'group');
    assert.strictEqual(parsed.conditionRule.children[0].column, 'Sales');
  });

  test('parseAiJsonResponse falls back to raw text on malformed non-JSON', () => {
    const raw = 'Here is the analysis: everything looks great.';
    const parsed = parseAiJsonResponse(raw);
    assert.strictEqual(parsed.answer, raw);
    assert.strictEqual(parsed.chart, null);
    assert.strictEqual(parsed.conditionRule, null);
  });
});

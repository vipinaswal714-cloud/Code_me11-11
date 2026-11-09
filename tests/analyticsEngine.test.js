import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateKPI,
  aggregateData,
  applyGlobalFilters
} from '../src/utils/analyticsEngine.js';

describe('analyticsEngine Module', () => {

  const sampleDataset = [
    { id: 1, region: 'North', category: 'Tech', sales: 1500, date: '2024-01-10' },
    { id: 2, region: 'South', category: 'Tech', sales: 2500, date: '2024-01-15' },
    { id: 3, region: 'North', category: 'Home', sales: 500, date: '2024-02-01' },
    { id: 4, region: 'East', category: 'Home', sales: null, date: '2024-02-15' },
    { id: 5, region: 'West', category: 'Auto', sales: 0, date: '2024-03-01' }
  ];

  describe('calculateKPI', () => {
    test('computes sum, avg, count, min, max correctly', () => {
      assert.strictEqual(calculateKPI(sampleDataset, 'sales', 'sum'), 4500); // 1500 + 2500 + 500 + 0
      assert.strictEqual(calculateKPI(sampleDataset, 'sales', 'avg'), 1125); // 4500 / 4 valid numbers
      assert.strictEqual(calculateKPI(sampleDataset, 'sales', 'count'), 5);
      assert.strictEqual(calculateKPI(sampleDataset, 'sales', 'min'), 0);
      assert.strictEqual(calculateKPI(sampleDataset, 'sales', 'max'), 2500);
    });

    test('handles empty dataset or missing columns gracefully', () => {
      assert.strictEqual(calculateKPI([], 'sales', 'sum'), 0);
      assert.strictEqual(calculateKPI(sampleDataset, 'nonExistent', 'sum'), 0);
      assert.strictEqual(calculateKPI(sampleDataset, 'sales', 'unknown_agg'), 4); // defaults to valid numeric count
    });
  });

  describe('aggregateData', () => {
    test('aggregates values grouped by X axis with specified metric and slice limit', () => {
      const agg = aggregateData(sampleDataset, 'region', 'sales', 'sum', 2);
      assert.ok(Array.isArray(agg));
      assert.ok(agg.length <= 2);
      // Top regions should be South (2500) and North (2000)
      assert.strictEqual(agg[0].name, 'South');
      assert.strictEqual(agg[0].value, 2500);
      assert.strictEqual(agg[1].name, 'North');
      assert.strictEqual(agg[1].value, 2000);
    });

    test('handles count aggregation on categorical fields', () => {
      const counts = aggregateData(sampleDataset, 'category', 'id', 'count');
      const tech = counts.find(c => c.name === 'Tech');
      const home = counts.find(c => c.name === 'Home');
      assert.strictEqual(tech.value, 2);
      assert.strictEqual(home.value, 2);
    });
  });

  describe('applyGlobalFilters', () => {
    test('filters dataset by universal text search across all columns', () => {
      const res = applyGlobalFilters(sampleDataset, {
        search: 'Tech',
        categoryFilters: {},
        dateRangeFilters: {}
      });
      assert.strictEqual(res.length, 2);
      assert.strictEqual(res[0].category, 'Tech');
      assert.strictEqual(res[1].category, 'Tech');
    });

    test('filters dataset by multi-select category filters', () => {
      const res = applyGlobalFilters(sampleDataset, {
        search: '',
        categoryFilters: { region: ['North', 'East'] },
        dateRangeFilters: {}
      });
      assert.strictEqual(res.length, 3); // 2 North, 1 East
    });

    test('filters dataset by date range boundaries', () => {
      const res = applyGlobalFilters(sampleDataset, {
        search: '',
        categoryFilters: {},
        dateRangeFilters: {
          date: { start: '2024-01-01', end: '2024-01-31' }
        }
      });
      assert.strictEqual(res.length, 2); // only January records
    });
  });
});

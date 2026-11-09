import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  inferColumnType,
  normalizeValue,
  sanitizeColumnName,
  processJsonDataset,
  parseSpreadsheet,
  MAX_FILE_SIZE_BYTES,
  MAX_ROW_LIMIT
} from '../src/utils/dataParser.js';

describe('dataParser Module', () => {

  describe('Column Type Inference', () => {
    test('identifies numeric columns with currencies, percentages, and commas', () => {
      assert.strictEqual(inferColumnType([10, 20, 30]), 'number');
      assert.strictEqual(inferColumnType(['$1,200.50', '$500.00', '$3,450.25']), 'number');
      assert.strictEqual(inferColumnType(['15%', '25.5%', '100%']), 'number');
      assert.strictEqual(inferColumnType(['€50', '£100', '¥1000']), 'number');
    });

    test('identifies date columns with ISO, slashes, and dashes', () => {
      assert.strictEqual(inferColumnType(['2024-01-15', '2024-02-20', '2024-03-25']), 'date');
      assert.strictEqual(inferColumnType(['01/15/2024', '02/20/2024', '03/25/2024']), 'date');
      assert.strictEqual(inferColumnType([new Date('2024-01-01'), new Date('2024-02-01')]), 'date');
    });

    test('identifies text / categorical columns', () => {
      assert.strictEqual(inferColumnType(['North', 'South', 'East', 'West']), 'category');
      assert.strictEqual(inferColumnType(['Active', 'Inactive', 'Pending']), 'category');
      assert.strictEqual(inferColumnType([null, undefined, '']), 'category');
    });
  });

  describe('Value Normalization', () => {
    test('normalizes numbers cleanly', () => {
      assert.strictEqual(normalizeValue('$1,234.56', 'number'), 1234.56);
      assert.strictEqual(normalizeValue('75%', 'number'), 75);
      assert.strictEqual(normalizeValue('invalid_num', 'number'), null);
      assert.strictEqual(normalizeValue(null, 'number'), null);
      assert.strictEqual(normalizeValue(0, 'number'), 0);
    });

    test('normalizes dates into YYYY-MM-DD', () => {
      assert.strictEqual(normalizeValue('2025-06-15T12:00:00Z', 'date'), '2025-06-15');
      assert.strictEqual(normalizeValue(new Date('2025-06-15T00:00:00'), 'date'), '2025-06-15');
    });

    test('normalizes text with trimming', () => {
      assert.strictEqual(normalizeValue('   hello world  ', 'category'), 'hello world');
      assert.strictEqual(normalizeValue(null, 'category'), null);
    });
  });

  describe('Prototype Pollution Protection', () => {
    test('sanitizes dangerous prototype keys', () => {
      assert.strictEqual(sanitizeColumnName('__proto__'), 'col___proto__');
      assert.strictEqual(sanitizeColumnName('constructor'), 'col_constructor');
      assert.strictEqual(sanitizeColumnName('prototype'), 'col_prototype');
      assert.strictEqual(sanitizeColumnName('PROTOTYPE'), 'col_PROTOTYPE');
      assert.strictEqual(sanitizeColumnName('normal_column'), 'normal_column');
      assert.strictEqual(sanitizeColumnName(''), 'Unnamed_Column');
    });

    test('processJsonDataset with prototype attack never pollutes Object.prototype', () => {
      const maliciousData = [
        { '__proto__': { polluted: 'danger' }, 'constructor': 'foo', 'sales': 500 }
      ];
      const result = processJsonDataset(maliciousData, 'test.csv');
      assert.strictEqual(({}).polluted, undefined);
      assert.strictEqual(result.summary.totalRows, 1);
    });
  });

  describe('Dataset Summary & Profiling', () => {
    test('correctly computes null counts, unique counts, duplicates and metrics', () => {
      const sample = [
        { product: 'Phone', sales: 100 },
        { product: 'Phone', sales: 100 }, // duplicate
        { product: 'Laptop', sales: 200 },
        { product: 'Tablet', sales: null }
      ];

      const res = processJsonDataset(sample, 'tech.xlsx');
      assert.strictEqual(res.summary.totalRows, 4);
      assert.strictEqual(res.summary.totalCols, 2);
      assert.strictEqual(res.summary.duplicateCount, 1);
      assert.strictEqual(res.summary.missingValues, 1);

      const salesCol = res.columns.find(c => c.name === 'sales');
      assert.strictEqual(salesCol.min, 100);
      assert.strictEqual(salesCol.max, 200);
      assert.strictEqual(salesCol.sum, 400); // 100 + 100 + 200
      assert.strictEqual(salesCol.avg, 133.33333333333334);
    });
  });

  describe('File Size & Row Limits', () => {
    test('enforces 50 MB file size limit', async () => {
      const oversizedBuffer = new ArrayBuffer(52 * 1024 * 1024); // 52 MB
      await assert.rejects(
        () => parseSpreadsheet(oversizedBuffer, 'huge.xlsx'),
        /exceeds the maximum allowed 50 MB limit/
      );
    });

    test('truncates datasets exceeding MAX_ROW_LIMIT (100,000)', () => {
      const hugeData = new Array(100050).fill({ item: 'Widget', qty: 1 });
      const res = processJsonDataset(hugeData, '100k.csv');
      assert.strictEqual(res.rawData.length, MAX_ROW_LIMIT);
      assert.strictEqual(res.summary.totalRows, MAX_ROW_LIMIT);
    });

    test('rejects corrupt or unsupported sources', async () => {
      await assert.rejects(
        () => parseSpreadsheet('not_a_file_or_buffer', 'bad.xlsx'),
        /Unsupported file format/
      );
    });
  });
});

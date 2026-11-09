import { test, describe } from 'node:test';
import assert from 'node:assert';
import { sanitizeCellForFormulaInjection, sanitizeDatasetForExport } from '../src/utils/exportUtils.js';

describe('exportUtils Module - CSV / Excel Formula Injection (CWE-1236)', () => {

  test('neutralizes cells starting with =', () => {
    assert.strictEqual(sanitizeCellForFormulaInjection('=cmd|\'/C calc\'!A0'), '\'=cmd|\'/C calc\'!A0');
    assert.strictEqual(sanitizeCellForFormulaInjection('  =1+1'), '\'  =1+1');
    assert.strictEqual(sanitizeCellForFormulaInjection('=SUM(A1:B10)'), '\'=SUM(A1:B10)');
  });

  test('neutralizes cells starting with +', () => {
    assert.strictEqual(sanitizeCellForFormulaInjection('+12345'), '\'+12345');
    assert.strictEqual(sanitizeCellForFormulaInjection('+cmd'), '\'+cmd');
  });

  test('neutralizes cells starting with -', () => {
    assert.strictEqual(sanitizeCellForFormulaInjection('-2+3'), '\'-2+3');
    assert.strictEqual(sanitizeCellForFormulaInjection('-100'), '\'-100');
  });

  test('neutralizes cells starting with @', () => {
    assert.strictEqual(sanitizeCellForFormulaInjection('@SUM(A1:B2)'), '\'@SUM(A1:B2)');
  });

  test('neutralizes cells starting with tab or carriage return', () => {
    assert.strictEqual(sanitizeCellForFormulaInjection('\t=cmd'), '\'\t=cmd');
    assert.strictEqual(sanitizeCellForFormulaInjection('\r=calc'), '\'\r=calc');
  });

  test('preserves legitimate non-formula strings and numbers', () => {
    assert.strictEqual(sanitizeCellForFormulaInjection('Normal Text'), 'Normal Text');
    assert.strictEqual(sanitizeCellForFormulaInjection('Electronics & Gadgets'), 'Electronics & Gadgets');
    assert.strictEqual(sanitizeCellForFormulaInjection(1234.56), 1234.56);
    assert.strictEqual(sanitizeCellForFormulaInjection(0), 0);
    assert.strictEqual(sanitizeCellForFormulaInjection(null), null);
    assert.strictEqual(sanitizeCellForFormulaInjection(undefined), undefined);
  });

  describe('SEC-02: Header and Multi-Export Sanitization', () => {
    test('sanitizes malicious formula injection in column header keys', () => {
      const maliciousData = [
        {
          '=cmd|\'/C calc\'!A0': 'safe value',
          '+formulaCol': '=1+1',
          '@dangerous': 'test',
          '-negativeHeader': 123,
          'SafeHeader': 'val'
        }
      ];

      const cleaned = sanitizeDatasetForExport(maliciousData);
      const keys = Object.keys(cleaned[0]);

      assert.strictEqual(keys[0], '\'=cmd|\'/C calc\'!A0', 'Header starting with = must be escaped');
      assert.strictEqual(keys[1], '\'+formulaCol', 'Header starting with + must be escaped');
      assert.strictEqual(keys[2], '\'@dangerous', 'Header starting with @ must be escaped');
      assert.strictEqual(keys[3], '\'-negativeHeader', 'Header starting with - must be escaped');
      assert.strictEqual(keys[4], 'SafeHeader', 'Safe header must remain unchanged');
      assert.strictEqual(cleaned[0][keys[1]], '\'=1+1', 'Cell value must also be escaped');
    });

    test('handles empty or non-array inputs cleanly', () => {
      assert.deepStrictEqual(sanitizeDatasetForExport([]), []);
      assert.deepStrictEqual(sanitizeDatasetForExport(null), []);
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyIfThenElseCalculation } from '../src/utils/ruleEvaluator.js';

describe('SEC-03: Prototype Pollution and Reserved Name Rejection', () => {
  it('demonstrates whether __proto__ as column name pollutes Object.prototype or is rejected', () => {
    const dataset = [{ name: 'Item 1', score: 10 }];
    const branches = [
      {
        id: 'b1',
        conditionRoot: { type: 'condition', column: 'score', columnType: 'number', operator: 'gt', value: '5' },
        outputValue: { isAdmin: true, exploit: 'pwned' }
      }
    ];

    // Attempt to inject via calculated column name '__proto__'
    const result = applyIfThenElseCalculation(branches, 'fallback', dataset, '__proto__');

    // Check if global Object.prototype was polluted
    const testEmptyObj = {};
    const isGlobalProtoPolluted = testEmptyObj.isAdmin === true || testEmptyObj.exploit === 'pwned';

    // SEC-03 Requirement: '__proto__', 'constructor', 'prototype' MUST be rejected or neutralized
    // If not rejected, assert whether it polluted or whether result set __proto__
    assert.strictEqual(
      isGlobalProtoPolluted,
      false,
      'Global Object.prototype must NEVER be polluted'
    );

    // Now test that SEC-03 explicitly rejects '__proto__' from being created as a valid column
    // The resulting row should NOT contain '__proto__' as an added column
    assert.strictEqual(
      result[0].hasOwnProperty('__proto__'),
      false,
      '__proto__ must be rejected and never added as a column'
    );
  });

  it('rejects constructor and prototype as calculated column names', () => {
    const dataset = [{ val: 10 }];
    const branches = [];

    const resConstructor = applyIfThenElseCalculation(branches, 'evil', dataset, 'constructor');
    assert.strictEqual(
      resConstructor[0].hasOwnProperty('constructor'),
      false,
      'constructor must be rejected as column name'
    );

    const resPrototype = applyIfThenElseCalculation(branches, 'evil', dataset, 'prototype');
    assert.strictEqual(
      resPrototype[0].hasOwnProperty('prototype'),
      false,
      'prototype must be rejected as column name'
    );
  });
});

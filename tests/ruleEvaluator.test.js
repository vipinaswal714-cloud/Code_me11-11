import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  evaluateNode,
  applyIfThenElseCalculation,
  formatRuleAsSentence,
  createGroupNode,
  createConditionNode
} from '../src/utils/ruleEvaluator.js';

describe('ruleEvaluator Module', () => {

  describe('Numeric Operators', () => {
    const row = { score: 85, price: 19.99, zero: 0, negative: -10 };

    test('eq and neq comparison', () => {
      const eqNode = createConditionNode('score', 'number', 'eq', '85');
      const neqNode = createConditionNode('score', 'number', 'neq', '90');
      assert.strictEqual(evaluateNode(eqNode, row), true);
      assert.strictEqual(evaluateNode(neqNode, row), true);
    });

    test('gt, gte, lt, lte comparison', () => {
      assert.strictEqual(evaluateNode(createConditionNode('score', 'number', 'gt', '80'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('score', 'number', 'gt', '85'), row), false);
      assert.strictEqual(evaluateNode(createConditionNode('score', 'number', 'gte', '85'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('score', 'number', 'lt', '90'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('score', 'number', 'lte', '85'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('score', 'number', 'lt', '85'), row), false);
    });

    test('between operator (inclusive)', () => {
      const betweenNode = {
        type: 'condition',
        column: 'score',
        columnType: 'number',
        operator: 'between',
        value: '80',
        value2: '90',
        not: false
      };
      assert.strictEqual(evaluateNode(betweenNode, row), true);

      // Inverted boundaries
      const invertedNode = { ...betweenNode, value: '90', value2: '80' };
      assert.strictEqual(evaluateNode(invertedNode, row), true);

      // Boundary values
      const edgeNode = { ...betweenNode, value: '85', value2: '85' };
      assert.strictEqual(evaluateNode(edgeNode, row), true);

      // Out of bounds
      const outNode = { ...betweenNode, value: '90', value2: '100' };
      assert.strictEqual(evaluateNode(outNode, row), false);
    });

    test('negative numbers and decimals', () => {
      assert.strictEqual(evaluateNode(createConditionNode('negative', 'number', 'lt', '0'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('negative', 'number', 'gt', '-20'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('price', 'number', 'gt', '19.98'), row), true);
    });
  });

  describe('Text Operators & Case Sensitivity', () => {
    const row = { title: 'Senior Software Engineer', code: 'DEV-101', emptyStr: '' };

    test('equals and not_equals (case-insensitive by default)', () => {
      const node = createConditionNode('title', 'category', 'equals', 'senior software engineer');
      assert.strictEqual(evaluateNode(node, row), true);

      const caseSensitiveNode = { ...node, caseSensitive: true };
      assert.strictEqual(evaluateNode(caseSensitiveNode, row), false);
    });

    test('contains, starts_with, ends_with', () => {
      assert.strictEqual(evaluateNode(createConditionNode('title', 'category', 'contains', 'Software'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('title', 'category', 'starts_with', 'Senior'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('title', 'category', 'ends_with', 'Engineer'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('title', 'category', 'contains', 'Manager'), row), false);
    });

    test('in_list (comma-separated)', () => {
      const inListNode = createConditionNode('code', 'category', 'in_list', 'QA-100, DEV-101, OPS-200');
      assert.strictEqual(evaluateNode(inListNode, row), true);

      const notInListNode = createConditionNode('code', 'category', 'in_list', 'QA-100, OPS-200');
      assert.strictEqual(evaluateNode(notInListNode, row), false);
    });
  });

  describe('Date Operators', () => {
    const row = { eventDate: '2025-06-15', dateObj: new Date('2025-06-15') };

    test('on, before, after', () => {
      assert.strictEqual(evaluateNode(createConditionNode('eventDate', 'date', 'on', '2025-06-15'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('eventDate', 'date', 'before', '2025-06-16'), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('eventDate', 'date', 'before', '2025-06-14'), row), false);
      assert.strictEqual(evaluateNode(createConditionNode('eventDate', 'date', 'after', '2025-06-01'), row), true);
    });

    test('date between operator', () => {
      const node = {
        type: 'condition',
        column: 'eventDate',
        columnType: 'date',
        operator: 'between',
        value: '2025-06-01',
        value2: '2025-06-30'
      };
      assert.strictEqual(evaluateNode(node, row), true);
    });
  });

  describe('Empty / Null / Undefined Boundaries', () => {
    const row = {
      nullVal: null,
      undefVal: undefined,
      emptyStr: '',
      whitespace: '   ',
      zeroVal: 0,
      falseVal: false
    };

    test('is_empty operator', () => {
      assert.strictEqual(evaluateNode(createConditionNode('nullVal', 'category', 'is_empty', ''), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('undefVal', 'category', 'is_empty', ''), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('emptyStr', 'category', 'is_empty', ''), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('whitespace', 'category', 'is_empty', ''), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('nonExistent', 'category', 'is_empty', ''), row), true);

      // 0 and false are not empty
      assert.strictEqual(evaluateNode(createConditionNode('zeroVal', 'number', 'is_empty', ''), row), false);
    });

    test('is_not_empty operator', () => {
      assert.strictEqual(evaluateNode(createConditionNode('zeroVal', 'number', 'is_not_empty', ''), row), true);
      assert.strictEqual(evaluateNode(createConditionNode('nullVal', 'category', 'is_not_empty', ''), row), false);
      assert.strictEqual(evaluateNode(createConditionNode('emptyStr', 'category', 'is_not_empty', ''), row), false);
    });

    test('null values do not match standard comparison operators', () => {
      assert.strictEqual(evaluateNode(createConditionNode('nullVal', 'number', 'gt', '0'), row), false);
      assert.strictEqual(evaluateNode(createConditionNode('nullVal', 'number', 'lt', '100'), row), false);
      assert.strictEqual(evaluateNode(createConditionNode('nullVal', 'category', 'contains', 'a'), row), false);
    });
  });

  describe('Logical Tree Combiners & Nesting', () => {
    const row = { region: 'North', sales: 6000, status: 'Active' };

    test('AND combiner', () => {
      const group = {
        type: 'group',
        combiner: 'AND',
        not: false,
        children: [
          createConditionNode('region', 'category', 'equals', 'North'),
          createConditionNode('sales', 'number', 'gt', '5000')
        ]
      };
      assert.strictEqual(evaluateNode(group, row), true);
    });

    test('OR combiner', () => {
      const group = {
        type: 'group',
        combiner: 'OR',
        not: false,
        children: [
          createConditionNode('region', 'category', 'equals', 'South'),
          createConditionNode('sales', 'number', 'gt', '5000')
        ]
      };
      assert.strictEqual(evaluateNode(group, row), true);
    });

    test('NOT negation', () => {
      const group = {
        type: 'group',
        combiner: 'AND',
        not: true,
        children: [
          createConditionNode('status', 'category', 'equals', 'Returned')
        ]
      };
      assert.strictEqual(evaluateNode(group, row), true);
    });

    test('Nested groups: (Region = North AND Sales > 5000) OR NOT (Status = Returned)', () => {
      const nestedRule = {
        type: 'group',
        combiner: 'OR',
        not: false,
        children: [
          {
            type: 'group',
            combiner: 'AND',
            not: false,
            children: [
              createConditionNode('region', 'category', 'equals', 'North'),
              createConditionNode('sales', 'number', 'gt', '5000')
            ]
          },
          {
            type: 'group',
            combiner: 'AND',
            not: true,
            children: [
              createConditionNode('status', 'category', 'equals', 'Returned')
            ]
          }
        ]
      };
      assert.strictEqual(evaluateNode(nestedRule, row), true);
    });
  });

  describe('Calculated Column Branch Evaluation', () => {
    const rows = [
      { name: 'Alice', score: 95 },
      { name: 'Bob', score: 75 },
      { name: 'Charlie', score: 50 }
    ];

    test('multi-branch IF / ELSE IF / ELSE evaluation', () => {
      const branches = [
        {
          id: 'b1',
          conditionRoot: createConditionNode('score', 'number', 'gte', '90'),
          outputValue: 'Distinction'
        },
        {
          id: 'b2',
          conditionRoot: createConditionNode('score', 'number', 'gte', '70'),
          outputValue: 'Pass'
        }
      ];

      const res = applyIfThenElseCalculation(branches, 'Fail', rows, 'Grade');
      assert.strictEqual(res[0].Grade, 'Distinction');
      assert.strictEqual(res[1].Grade, 'Pass');
      assert.strictEqual(res[2].Grade, 'Fail');
    });
  });

  describe('Sentence Formatter', () => {
    test('formats simple and compound rules into readable English', () => {
      const simple = createConditionNode('sales', 'number', 'gt', '1000');
      assert.strictEqual(formatRuleAsSentence(simple), 'sales gt "1000"');

      const group = {
        type: 'group',
        combiner: 'AND',
        not: false,
        children: [
          createConditionNode('status', 'category', 'equals', 'Active'),
          createConditionNode('age', 'number', 'gte', '18')
        ]
      };
      assert.strictEqual(formatRuleAsSentence(group), '(status equals "Active" AND age gte "18")');
    });
  });

  describe('Defensive Error Handling', () => {
    test('handles null/undefined row or corrupted node gracefully without throwing', () => {
      assert.strictEqual(evaluateNode(null, {}), true);
      const cond = createConditionNode('score', 'number', 'gt', '50');
      assert.strictEqual(evaluateNode(cond, null), false);
      assert.strictEqual(evaluateNode({ type: 'unknown' }, {}), true);
    });
  });
});

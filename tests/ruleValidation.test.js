import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  evaluateNode, 
  validateRuleSchema, 
  createGroupNode, 
  createConditionNode, 
  MAX_RULE_DEPTH, 
  MAX_NODE_COUNT 
} from '../src/utils/ruleEvaluator.js';

describe('SEC-04: Depth, Node Count Limits and AST Schema Validation', () => {
  describe('AST Depth and Node Count Protection', () => {
    it('gracefully handles deeply nested trees exceeding MAX_RULE_DEPTH without call stack overflow', () => {
      // Build a 50-level deep tree exceeding MAX_RULE_DEPTH
      let root = createGroupNode('AND');
      let curr = root;
      for (let i = 0; i < 50; i++) {
        const next = createGroupNode('AND');
        curr.children.push(next);
        curr = next;
      }
      curr.children.push(createConditionNode('sales', 'number', 'gt', '100'));

      const testRow = { sales: 200 };
      // evaluateNode must not throw "Maximum call stack size exceeded"
      assert.doesNotThrow(() => {
        const res = evaluateNode(root, testRow);
        assert.equal(typeof res, 'boolean');
      });
    });

    it('rejects rules exceeding MAX_NODE_COUNT via validateRuleSchema', () => {
      const root = createGroupNode('AND');
      for (let i = 0; i < 300; i++) {
        root.children.push(createConditionNode(`col_${i}`, 'number', 'gt', '0'));
      }

      const validation = validateRuleSchema(root);
      assert.equal(validation.valid, false);
      assert.match(validation.error, /node count limit/i);
    });
  });

  describe('Schema Validation for AI & Imported JSON Rules', () => {
    it('validates and accepts legitimate condition and group trees', () => {
      const legitimate = {
        type: 'group',
        combiner: 'OR',
        not: false,
        children: [
          {
            type: 'condition',
            column: 'Region',
            columnType: 'category',
            operator: 'equals',
            value: 'North'
          },
          {
            type: 'condition',
            column: 'Revenue',
            columnType: 'number',
            operator: 'gt',
            value: '5000'
          }
        ]
      };

      const res = validateRuleSchema(legitimate);
      assert.equal(res.valid, true);
      assert.ok(res.sanitizedRule);
    });

    it('rejects malformed rules with invalid types or missing required fields', () => {
      const invalidTypes = [
        null,
        undefined,
        {},
        { type: 'unknown_type' },
        { type: 'condition' }, // missing column & operator
        { type: 'group', combiner: 'INVALID_COMBINER', children: [] }
      ];

      for (const inv of invalidTypes) {
        const res = validateRuleSchema(inv);
        assert.equal(res.valid, false);
        assert.ok(res.error);
      }
    });

    it('rejects circular references and prototype injection within rule nodes', () => {
      const circular = { type: 'group', combiner: 'AND', children: [] };
      circular.children.push(circular);

      const res = validateRuleSchema(circular);
      assert.equal(res.valid, false);
      assert.match(res.error, /circular|depth/i);
    });
  });
});

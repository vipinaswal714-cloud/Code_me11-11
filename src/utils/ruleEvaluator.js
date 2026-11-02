/**
 * Metrica Safe Rule Evaluator & AST Engine
 *
 * Evaluates conditions and nested logical expressions (AND, OR, NOT)
 * without using eval() or new Function().
 * Handles numbers, text, dates, empty/null cells, and type coercion.
 */

export const NUMBER_OPERATORS = [
  { id: 'eq', label: '=', desc: 'Equals' },
  { id: 'neq', label: '!=', desc: 'Does not equal' },
  { id: 'gt', label: '>', desc: 'Greater than' },
  { id: 'gte', label: '>=', desc: 'Greater than or equal to' },
  { id: 'lt', label: '<', desc: 'Less than' },
  { id: 'lte', label: '<=', desc: 'Less than or equal to' },
  { id: 'between', label: 'between', desc: 'Is between (inclusive)' },
  { id: 'is_empty', label: 'is empty', desc: 'Is null, blank or empty' },
  { id: 'is_not_empty', label: 'is not empty', desc: 'Has a value' },
];

export const TEXT_OPERATORS = [
  { id: 'equals', label: 'equals', desc: 'Exact text match' },
  { id: 'not_equals', label: 'not equals', desc: 'Does not equal text' },
  { id: 'contains', label: 'contains', desc: 'Contains substring' },
  { id: 'not_contains', label: 'does not contain', desc: 'Does not contain substring' },
  { id: 'starts_with', label: 'starts with', desc: 'Starts with prefix' },
  { id: 'ends_with', label: 'ends with', desc: 'Ends with suffix' },
  { id: 'in_list', label: 'is in list', desc: 'Matches comma-separated list' },
  { id: 'is_empty', label: 'is empty', desc: 'Is null, blank or empty' },
  { id: 'is_not_empty', label: 'is not empty', desc: 'Has a value' },
];

export const DATE_OPERATORS = [
  { id: 'on', label: 'on', desc: 'Exact calendar date' },
  { id: 'before', label: 'before', desc: 'Date is earlier than' },
  { id: 'after', label: 'after', desc: 'Date is later than' },
  { id: 'between', label: 'between', desc: 'Is between date range' },
  { id: 'is_empty', label: 'is empty', desc: 'Is null, blank or empty' },
  { id: 'is_not_empty', label: 'is not empty', desc: 'Has a value' },
];

/**
 * Returns available operators based on detected column type
 */
export function getOperatorsForType(type) {
  if (type === 'number') return NUMBER_OPERATORS;
  if (type === 'date') return DATE_OPERATORS;
  return TEXT_OPERATORS;
}

/**
 * Helper to parse a date safely into epoch milliseconds (date only, ignoring time)
 */
function parseDateToEpoch(val) {
  if (!val) return NaN;
  if (val instanceof Date) {
    const d = new Date(val);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  const str = String(val).trim();
  const parsed = Date.parse(str);
  if (isNaN(parsed)) return NaN;
  const d = new Date(parsed);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Helper to safely extract a numeric value
 */
function parseNumber(val) {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'number') return isNaN(val) ? NaN : val;
  const cleanStr = String(val).replace(/^[$\u20AC\u00A3\u00A5]/, '').replace(/%$/, '').replace(/,/g, '').trim();
  const num = Number(cleanStr);
  return isNaN(num) ? NaN : num;
}

/**
 * Checks if a value is considered empty
 */
export function isEmptyValue(val) {
  return val === null || val === undefined || String(val).trim() === '' || val === '(Blank)';
}

/**
 * Evaluates a single comparison node against a dataset row
 * @param {Object} node { column, operator, value, value2, caseSensitive, columnType }
 * @param {Object} row
 * @returns {boolean}
 */
export function evaluateComparison(node, row) {
  if (!row || typeof row !== 'object') return false;
  const { column, operator, value, value2, caseSensitive = false, columnType } = node;
  if (!column) return true;

  const rawVal = row[column];
  const type = columnType || 'category';

  // Handle universal empty checks
  if (operator === 'is_empty') {
    return isEmptyValue(rawVal);
  }
  if (operator === 'is_not_empty') {
    return !isEmptyValue(rawVal);
  }

  // If value is empty and operator is not an empty check, empty cells never match
  if (isEmptyValue(rawVal)) {
    return false;
  }

  // 1. NUMBER COMPARISONS
  if (type === 'number') {
    const num = parseNumber(rawVal);
    const target = parseNumber(value);

    if (isNaN(num)) return false;
    if (operator !== 'between' && isNaN(target)) return false;

    switch (operator) {
      case 'eq':
        return num === target;
      case 'neq':
        return num !== target;
      case 'gt':
        return num > target;
      case 'gte':
        return num >= target;
      case 'lt':
        return num < target;
      case 'lte':
        return num <= target;
      case 'between': {
        const target2 = parseNumber(value2);
        if (isNaN(target) || isNaN(target2)) return false;
        const low = Math.min(target, target2);
        const high = Math.max(target, target2);
        return num >= low && num <= high;
      }
      default:
        return false;
    }
  }

  // 2. DATE COMPARISONS
  if (type === 'date') {
    const epoch = parseDateToEpoch(rawVal);
    const targetEpoch = parseDateToEpoch(value);

    if (isNaN(epoch)) return false;
    if (operator !== 'between' && isNaN(targetEpoch)) return false;

    switch (operator) {
      case 'on':
        return epoch === targetEpoch;
      case 'before':
        return epoch < targetEpoch;
      case 'after':
        return epoch > targetEpoch;
      case 'between': {
        const targetEpoch2 = parseDateToEpoch(value2);
        if (isNaN(targetEpoch) || isNaN(targetEpoch2)) return false;
        const start = Math.min(targetEpoch, targetEpoch2);
        const end = Math.max(targetEpoch, targetEpoch2);
        return epoch >= start && epoch <= end;
      }
      default:
        return false;
    }
  }

  // 3. TEXT / CATEGORY COMPARISONS
  const str = String(rawVal);
  const targetStr = value !== undefined && value !== null ? String(value) : '';

  const a = caseSensitive ? str : str.toLowerCase();
  const b = caseSensitive ? targetStr : targetStr.toLowerCase();

  switch (operator) {
    case 'equals':
      return a === b;
    case 'not_equals':
      return a !== b;
    case 'contains':
      return a.includes(b);
    case 'not_contains':
      return !a.includes(b);
    case 'starts_with':
      return a.startsWith(b);
    case 'ends_with':
      return a.endsWith(b);
    case 'in_list': {
      const items = targetStr.split(',').map(s => caseSensitive ? s.trim() : s.trim().toLowerCase()).filter(Boolean);
      return items.includes(a);
    }
    default:
      return a === b;
  }
}

export const MAX_RULE_DEPTH = 20;
export const MAX_NODE_COUNT = 150;

/**
 * Recursively evaluates an AST node (Group or Comparison) with depth bounds
 * @param {Object} node { type: 'group'|'condition', combiner: 'AND'|'OR', not: boolean, children: [] }
 * @param {Object} row
 * @param {number} currentDepth
 * @returns {boolean}
 */
export function evaluateNode(node, row, currentDepth = 0) {
  if (!node) return true;
  if (currentDepth > MAX_RULE_DEPTH) return false;

  if (node.type === 'condition') {
    const res = evaluateComparison(node, row);
    return node.not ? !res : res;
  }

  if (node.type === 'group') {
    const children = node.children || [];
    if (children.length === 0) return true;

    let groupResult = true;
    const isOr = (node.combiner || 'AND').toUpperCase() === 'OR';

    if (isOr) {
      groupResult = false;
      for (let i = 0; i < children.length; i++) {
        if (evaluateNode(children[i], row, currentDepth + 1)) {
          groupResult = true;
          break;
        }
      }
    } else {
      groupResult = true;
      for (let i = 0; i < children.length; i++) {
        if (!evaluateNode(children[i], row, currentDepth + 1)) {
          groupResult = false;
          break;
        }
      }
    }

    return node.not ? !groupResult : groupResult;
  }

  return true;
}

/**
 * Validates the schema of an AST rule incoming from Ask AI or saved/imported JSON.
 * Enforces depth limit, node count limit, safe types, and prevents circular references.
 * @param {*} rawNode
 * @returns {{ valid: boolean, error?: string, sanitizedRule?: Object }}
 */
export function validateRuleSchema(rawNode) {
  if (!rawNode || typeof rawNode !== 'object') {
    return { valid: false, error: 'Rule must be a valid non-null object.' };
  }

  let nodeCount = 0;
  const visited = new Set();

  function validate(node, depth) {
    if (!node || typeof node !== 'object') {
      return { valid: false, error: 'Malformed node in rule tree.' };
    }

    if (visited.has(node)) {
      return { valid: false, error: 'Circular reference detected in rule tree.' };
    }
    visited.add(node);

    if (depth > MAX_RULE_DEPTH) {
      return { valid: false, error: `Rule exceeds maximum nesting depth of ${MAX_RULE_DEPTH}.` };
    }

    nodeCount++;
    if (nodeCount > MAX_NODE_COUNT) {
      return { valid: false, error: `Rule exceeds maximum node count limit of ${MAX_NODE_COUNT}.` };
    }

    if (node.type === 'condition') {
      if (typeof node.column !== 'string' || !node.column.trim()) {
        return { valid: false, error: 'Condition node is missing a valid column string.' };
      }
      if (typeof node.operator !== 'string' || !node.operator.trim()) {
        return { valid: false, error: 'Condition node is missing a valid operator.' };
      }
      return {
        valid: true,
        sanitized: {
          id: node.id || `cond_${Date.now()}_${nodeCount}`,
          type: 'condition',
          column: node.column.trim(),
          columnType: node.columnType === 'number' || node.columnType === 'date' ? node.columnType : 'category',
          operator: node.operator.trim(),
          value: node.value !== undefined ? String(node.value) : '',
          value2: node.value2 !== undefined ? String(node.value2) : '',
          caseSensitive: Boolean(node.caseSensitive)
        }
      };
    } else if (node.type === 'group') {
      const combiner = String(node.combiner || 'AND').toUpperCase();
      if (combiner !== 'AND' && combiner !== 'OR') {
        return { valid: false, error: 'Group node combiner must be "AND" or "OR".' };
      }
      if (!Array.isArray(node.children)) {
        return { valid: false, error: 'Group node must contain a children array.' };
      }

      const sanitizedChildren = [];
      for (const child of node.children) {
        const childRes = validate(child, depth + 1);
        if (!childRes.valid) return childRes;
        sanitizedChildren.push(childRes.sanitized);
      }

      return {
        valid: true,
        sanitized: {
          id: node.id || `grp_${Date.now()}_${nodeCount}`,
          type: 'group',
          combiner,
          not: Boolean(node.not),
          children: sanitizedChildren
        }
      };
    } else {
      return { valid: false, error: `Invalid rule node type: "${node.type}". Must be "group" or "condition".` };
    }
  }

  const result = validate(rawNode, 0);
  if (!result.valid) return result;
  return { valid: true, sanitizedRule: result.sanitized };
}

/**
 * Evaluates an entire condition rule across a dataset
 * Returns an array of booleans indicating match status for each row
 * @param {Object} ruleRoot AST root node
 * @param {Array} data
 * @returns {boolean[]}
 */
export function evaluateRuleOnDataset(ruleRoot, data) {
  if (!data || data.length === 0) return [];
  if (!ruleRoot) return new Array(data.length).fill(true);

  const len = data.length;
  const matches = new Array(len);
  for (let i = 0; i < len; i++) {
    matches[i] = evaluateNode(ruleRoot, data[i]);
  }
  return matches;
}

/**
 * Computes comparative statistics between matched and non-matched rows for a numeric column
 */
export function computeConditionStats(data, matches, numericCol) {
  if (!data || data.length === 0 || !matches || !numericCol) {
    return null;
  }

  let matchCount = 0;
  let nonMatchCount = 0;

  let matchSum = 0;
  let matchMin = Infinity;
  let matchMax = -Infinity;
  let matchValidCount = 0;

  let nonMatchSum = 0;
  let nonMatchMin = Infinity;
  let nonMatchMax = -Infinity;
  let nonMatchValidCount = 0;

  const len = data.length;
  for (let i = 0; i < len; i++) {
    const isMatched = matches[i];
    const val = data[i][numericCol];
    const num = parseNumber(val);

    if (isMatched) {
      matchCount++;
      if (!isNaN(num)) {
        matchSum += num;
        matchValidCount++;
        if (num < matchMin) matchMin = num;
        if (num > matchMax) matchMax = num;
      }
    } else {
      nonMatchCount++;
      if (!isNaN(num)) {
        nonMatchSum += num;
        nonMatchValidCount++;
        if (num < nonMatchMin) nonMatchMin = num;
        if (num > nonMatchMax) nonMatchMax = num;
      }
    }
  }

  return {
    matched: {
      count: matchCount,
      percentage: len > 0 ? (matchCount / len) * 100 : 0,
      sum: matchValidCount > 0 ? matchSum : 0,
      avg: matchValidCount > 0 ? matchSum / matchValidCount : 0,
      min: matchMin !== Infinity ? matchMin : 0,
      max: matchMax !== -Infinity ? matchMax : 0,
    },
    nonMatched: {
      count: nonMatchCount,
      percentage: len > 0 ? (nonMatchCount / len) * 100 : 0,
      sum: nonMatchValidCount > 0 ? nonMatchSum : 0,
      avg: nonMatchValidCount > 0 ? nonMatchSum / nonMatchValidCount : 0,
      min: nonMatchMin !== Infinity ? nonMatchMin : 0,
      max: nonMatchMax !== -Infinity ? nonMatchMax : 0,
    }
  };
}

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeColumnName(name) {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim().toLowerCase();
  return !DANGEROUS_OBJECT_KEYS.has(clean);
}

/**
 * Evaluates IF / THEN / ELSE IF / ELSE branches to generate a new calculated column
 * @param {Array} branches Array of { conditionRoot: AST, outputValue: any }
 * @param {any} elseValue
 * @param {Array} data
 * @param {string} newColumnName
 * @returns {Array} New dataset with calculated column added to each row
 */
export function applyIfThenElseCalculation(branches, elseValue, data, newColumnName) {
  if (!data || data.length === 0 || !newColumnName) return data;

  const cleanColName = newColumnName.trim();
  if (!isSafeColumnName(cleanColName)) {
    return data;
  }

  const len = data.length;
  const result = new Array(len);

  for (let r = 0; r < len; r++) {
    const row = data[r];
    let assigned = false;
    let finalVal = elseValue;

    for (let b = 0; b < branches.length; b++) {
      const branch = branches[b];
      if (branch.conditionRoot && evaluateNode(branch.conditionRoot, row)) {
        finalVal = branch.outputValue;
        assigned = true;
        break;
      }
    }

    result[r] = {
      ...row,
      [cleanColName]: finalVal
    };
  }

  return result;
}

/**
 * Converts an AST rule node into a human-readable English sentence
 */
export function formatRuleAsSentence(node) {
  if (!node) return 'No conditions defined';

  if (node.type === 'condition') {
    const { column, operator, value, value2, not } = node;
    if (!column) return '(empty condition)';

    const opLabel = operator ? operator.replace(/_/g, ' ') : '=';
    let valStr = '';
    if (operator === 'is_empty' || operator === 'is_not_empty') {
      valStr = '';
    } else if (operator === 'between') {
      valStr = `"${value || ''}" and "${value2 || ''}"`;
    } else {
      valStr = `"${value !== undefined && value !== null ? value : ''}"`;
    }

    const core = `${column} ${opLabel} ${valStr}`.trim();
    return not ? `NOT (${core})` : core;
  }

  if (node.type === 'group') {
    const children = node.children || [];
    if (children.length === 0) return '(empty group)';

    const parts = children.map(formatRuleAsSentence);
    const glue = ` ${node.combiner || 'AND'} `;
    const grouped = parts.length > 1 ? `(${parts.join(glue)})` : parts[0];

    return node.not ? `NOT ${grouped}` : grouped;
  }

  return '';
}

/**
 * Creates an empty starting condition node
 */
export function createConditionNode(defaultColumn = '', defaultType = 'category', defaultOp = null, defaultValue = '') {
  const ops = getOperatorsForType(defaultType);
  return {
    id: `cond-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type: 'condition',
    column: defaultColumn,
    columnType: defaultType,
    operator: defaultOp || ops[0]?.id || 'equals',
    value: defaultValue !== undefined ? String(defaultValue) : '',
    value2: '',
    caseSensitive: false,
    not: false
  };
}

/**
 * Creates an empty group node
 */
export function createGroupNode(combiner = 'AND') {
  return {
    id: `grp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type: 'group',
    combiner,
    not: false,
    children: []
  };
}

import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Filter,
  CheckCircle2,
  Sparkles,
  Save,
  Bookmark,
  Activity,
  Calculator,
  Eye,
  Check,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import {
  getOperatorsForType,
  evaluateRuleOnDataset,
  computeConditionStats,
  applyIfThenElseCalculation,
  formatRuleAsSentence,
  createConditionNode,
  createGroupNode,
  validateRuleSchema
} from '../utils/ruleEvaluator';

const STORAGE_SAVED_RULES_KEY = 'metrica_saved_rules';

export default function ConditionsPanel({
  columns,
  data,
  activeRuleFilter,
  onSetActiveRuleFilter,
  tableHighlightRule,
  onSetTableHighlightRule,
  onAddTileToDashboard,
  onApplyCalculatedColumn,
  onAiRulePrompt
}) {
  const numericCols = useMemo(() => columns.filter(c => c.type === 'number'), [columns]);

  // Root rule for filtering / exploration
  const [rootRule, setRootRule] = useState(() => {
    const defaultCol = columns[0]?.name || '';
    const defaultType = columns[0]?.type || 'category';
    const initGrp = createGroupNode('AND');
    initGrp.children.push(createConditionNode(defaultCol, defaultType));
    return initGrp;
  });

  // Selected numeric metric for matched vs non-matched stats comparison
  const [selectedMetric, setSelectedMetric] = useState(numericCols[0]?.name || '');

  // Saved rules list in localStorage (validated)
  const [savedRules, setSavedRules] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_RULES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(item => item?.rule && validateRuleSchema(item.rule).valid) : [];
    } catch {
      return [];
    }
  });

  const [ruleNameInput, setRuleNameInput] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // IF / THEN / ELSE Builder State
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'ifthen' | 'saved'
  const [calcColName, setCalcColName] = useState('Category_Class');
  const [branches, setBranches] = useState([
    {
      id: 'branch-1',
      conditionRoot: createConditionNode(columns[0]?.name || '', columns[0]?.type || 'category'),
      outputValue: 'High'
    }
  ]);
  const [elseValue, setElseValue] = useState('Standard');

  // Debounced Live Preview Evaluation
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = evaluateRuleOnDataset(rootRule, data);
      setMatches(result);
    }, 150);

    return () => clearTimeout(timer);
  }, [rootRule, data]);

  // Synchronize rule builder when activeRuleFilter is passed from AI or parent
  useEffect(() => {
    if (activeRuleFilter?.rule) {
      const validation = validateRuleSchema(activeRuleFilter.rule);
      if (validation.valid) {
        setRootRule(validation.sanitizedRule);
      }
    }
  }, [activeRuleFilter]);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Matched stats summary
  const conditionStats = useMemo(() => {
    if (!data || data.length === 0 || matches.length === 0) return null;
    return computeConditionStats(data, matches, selectedMetric);
  }, [data, matches, selectedMetric]);

  const matchedCount = useMemo(() => matches.filter(Boolean).length, [matches]);
  const matchedPercentage = data.length > 0 ? ((matchedCount / data.length) * 100).toFixed(1) : '0';

  // Natural language sentence
  const ruleSentence = useMemo(() => formatRuleAsSentence(rootRule), [rootRule]);

  // Tree mutation helpers
  const updateNodeInTree = (node, targetId, updater) => {
    if (node.id === targetId) {
      return updater(node);
    }
    if (node.type === 'group' && node.children) {
      return {
        ...node,
        children: node.children.map(child => updateNodeInTree(child, targetId, updater))
      };
    }
    return node;
  };

  const removeNodeFromTree = (node, targetId) => {
    if (node.type === 'group' && node.children) {
      return {
        ...node,
        children: node.children
          .filter(child => child.id !== targetId)
          .map(child => removeNodeFromTree(child, targetId))
      };
    }
    return node;
  };

  const addChildToGroup = (node, groupId, childNode) => {
    if (node.id === groupId && node.type === 'group') {
      return {
        ...node,
        children: [...(node.children || []), childNode]
      };
    }
    if (node.type === 'group' && node.children) {
      return {
        ...node,
        children: node.children.map(child => addChildToGroup(child, groupId, childNode))
      };
    }
    return node;
  };

  // Node Actions
  const handleAddCondition = (groupId) => {
    const defaultCol = columns[0]?.name || '';
    const defaultType = columns[0]?.type || 'category';
    const newCond = createConditionNode(defaultCol, defaultType);
    setRootRule(prev => addChildToGroup(prev, groupId, newCond));
  };

  const handleAddGroup = (groupId) => {
    const newGrp = createGroupNode('AND');
    const defaultCol = columns[0]?.name || '';
    const defaultType = columns[0]?.type || 'category';
    newGrp.children.push(createConditionNode(defaultCol, defaultType));
    setRootRule(prev => addChildToGroup(prev, groupId, newGrp));
  };

  const handleRemoveNode = (nodeId) => {
    if (nodeId === rootRule.id) {
      showToast('Cannot remove root group', 'error');
      return;
    }
    setRootRule(prev => removeNodeFromTree(prev, nodeId));
  };

  const handleToggleGroupCombiner = (groupId) => {
    setRootRule(prev =>
      updateNodeInTree(prev, groupId, node => ({
        ...node,
        combiner: (node.combiner || 'AND').toUpperCase() === 'AND' ? 'OR' : 'AND'
      }))
    );
  };

  const handleToggleNodeNot = (nodeId) => {
    setRootRule(prev =>
      updateNodeInTree(prev, nodeId, node => ({
        ...node,
        not: !node.not
      }))
    );
  };

  const handleUpdateConditionField = (nodeId, field, value) => {
    setRootRule(prev =>
      updateNodeInTree(prev, nodeId, node => {
        if (field === 'column') {
          const colObj = columns.find(c => c.name === value);
          const colType = colObj?.type || 'category';
          const ops = getOperatorsForType(colType);
          return {
            ...node,
            column: value,
            columnType: colType,
            operator: ops[0]?.id || 'equals'
          };
        }
        return {
          ...node,
          [field]: value
        };
      })
    );
  };

  // Save / Load Rules
  const handleSaveCurrentRule = () => {
    if (!ruleNameInput.trim()) {
      showToast('Please provide a name for this rule.', 'error');
      return;
    }
    const newRuleItem = {
      id: `saved-${Date.now()}`,
      name: ruleNameInput.trim(),
      sentence: ruleSentence,
      rule: JSON.parse(JSON.stringify(rootRule)),
      createdAt: new Date().toLocaleDateString()
    };
    const updated = [newRuleItem, ...savedRules.filter(r => r.name !== ruleNameInput.trim())];
    setSavedRules(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_RULES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
    setRuleNameInput('');
    showToast(`Rule "${newRuleItem.name}" saved!`);
  };

  const handleLoadSavedRule = (savedItem) => {
    const validation = validateRuleSchema(savedItem?.rule);
    if (!validation.valid) {
      showToast(validation.error || 'Saved rule schema is invalid', 'error');
      return;
    }
    setRootRule(validation.sanitizedRule);
    setActiveTab('rules');
    showToast(`Loaded rule: "${savedItem.name}"`);
  };

  const handleDeleteSavedRule = (id) => {
    const updated = savedRules.filter(r => r.id !== id);
    setSavedRules(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_RULES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage error:', e);
    }
    showToast('Rule removed from saved storage.');
  };

  // Actions Driven by Rule
  const isRuleActiveFilter = activeRuleFilter && activeRuleFilter.id === rootRule.id;

  const handleToggleGlobalFilter = () => {
    if (isRuleActiveFilter) {
      onSetActiveRuleFilter(null);
      showToast('Deactivated condition filter on Dashboard.');
    } else {
      onSetActiveRuleFilter({
        id: rootRule.id,
        rule: rootRule,
        sentence: ruleSentence
      });
      showToast('Dashboard & charts filtered by this condition!');
    }
  };

  const isHighlightActive = tableHighlightRule && tableHighlightRule.id === rootRule.id;
  const handleToggleTableHighlight = () => {
    if (isHighlightActive) {
      onSetTableHighlightRule(null);
      showToast('Table row highlight turned off.');
    } else {
      onSetTableHighlightRule({
        id: rootRule.id,
        rule: rootRule
      });
      showToast('Matching rows will be highlighted in the Data Table!');
    }
  };

  const handleAddRuleDrivenKpi = () => {
    const tile = {
      id: `tile-rule-kpi-${Date.now()}`,
      type: 'kpi',
      title: `${matchedCount.toLocaleString()} Rows Match`,
      yField: selectedMetric || columns[0]?.name,
      aggregation: 'count',
      w: 1,
      color: '#026fc7',
      kpiSubtitle: `${matchedPercentage}% of total records (${ruleSentence.slice(0, 32)}...)`,
      ruleDriven: true,
      conditionRule: rootRule
    };
    onAddTileToDashboard(tile);
    showToast('Rule-driven KPI card added to Dashboard Canvas!');
  };

  // IF / THEN / ELSE Handler
  const handleApplyCalculatedCol = () => {
    if (!calcColName.trim()) {
      showToast('Please specify a name for the new column.', 'error');
      return;
    }
    if (columns.some(c => c.name.toLowerCase() === calcColName.trim().toLowerCase())) {
      showToast(`Column "${calcColName.trim()}" already exists.`, 'error');
      return;
    }

    const calculatedData = applyIfThenElseCalculation(
      branches,
      elseValue,
      data,
      calcColName.trim()
    );

    onApplyCalculatedColumn(calculatedData, calcColName.trim());
    showToast(`Created calculated column "${calcColName.trim()}"!`);
  };

  const handleAddElseIfBranch = () => {
    const defaultCol = columns[0]?.name || '';
    const defaultType = columns[0]?.type || 'category';
    setBranches(prev => [
      ...prev,
      {
        id: `branch-${Date.now()}`,
        conditionRoot: createConditionNode(defaultCol, defaultType),
        outputValue: 'New Category'
      }
    ]);
  };

  const handleRemoveBranch = (branchId) => {
    if (branches.length <= 1) {
      showToast('At least one condition branch is required.', 'error');
      return;
    }
    setBranches(prev => prev.filter(b => b.id !== branchId));
  };

  // Recursive Group Renderer
  const renderRuleNode = (node, isRoot = false) => {
    if (!node) return null;

    if (node.type === 'condition') {
      const ops = getOperatorsForType(node.columnType || 'category');
      const needsSecondValue = node.operator === 'between';
      const noValueNeeded = node.operator === 'is_empty' || node.operator === 'is_not_empty';

      return (
        <div
          key={node.id}
          className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-metrica-400"
        >
          {/* NOT toggle */}
          <button
            type="button"
            onClick={() => handleToggleNodeNot(node.id)}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
              node.not
                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700'
            }`}
          >
            NOT
          </button>

          {/* Column selector */}
          <select
            value={node.column}
            onChange={(e) => handleUpdateConditionField(node.id, 'column', e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
          >
            {columns.map(c => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>

          {/* Operator selector */}
          <select
            value={node.operator}
            onChange={(e) => handleUpdateConditionField(node.id, 'operator', e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
          >
            {ops.map(op => (
              <option key={op.id} value={op.id}>
                {op.label}
              </option>
            ))}
          </select>

          {/* Value input (if applicable) */}
          {!noValueNeeded && (
            <input
              type={node.columnType === 'date' ? 'date' : node.columnType === 'number' ? 'number' : 'text'}
              value={node.value}
              onChange={(e) => handleUpdateConditionField(node.id, 'value', e.target.value)}
              placeholder={node.operator === 'in_list' ? 'Apple, Banana, Mango' : 'Value...'}
              className="flex-1 min-w-[120px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
            />
          )}

          {/* Second value input for 'between' */}
          {needsSecondValue && (
            <>
              <span className="text-xs text-slate-400 font-medium">and</span>
              <input
                type={node.columnType === 'date' ? 'date' : node.columnType === 'number' ? 'number' : 'text'}
                value={node.value2}
                onChange={(e) => handleUpdateConditionField(node.id, 'value2', e.target.value)}
                placeholder="End value..."
                className="flex-1 min-w-[120px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
              />
            </>
          )}

          {/* Case sensitive toggle (for text) */}
          {node.columnType === 'category' && !noValueNeeded && (
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={node.caseSensitive}
                onChange={(e) => handleUpdateConditionField(node.id, 'caseSensitive', e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-metrica-600 focus:ring-metrica-500 w-3.5 h-3.5"
              />
              <span>Match case</span>
            </label>
          )}

          {/* Remove condition */}
          <button
            type="button"
            onClick={() => handleRemoveNode(node.id)}
            title="Delete Condition"
            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    if (node.type === 'group') {
      const isOr = (node.combiner || 'AND').toUpperCase() === 'OR';
      const children = node.children || [];

      return (
        <div
          key={node.id}
          className={`p-4 rounded-2xl border ${
            isRoot
              ? 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
              : 'border-metrica-200/80 dark:border-slate-800 bg-metrica-50/30 dark:bg-slate-900/60 ml-2 sm:ml-5'
          } space-y-3 relative`}
        >
          {/* Group Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              {/* Combiner Toggle */}
              <button
                type="button"
                onClick={() => handleToggleGroupCombiner(node.id)}
                className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider transition-all shadow-sm ${
                  isOr
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-metrica-600 text-white hover:bg-metrica-700'
                }`}
              >
                {node.combiner || 'AND'}
              </button>

              {/* NOT group toggle */}
              <button
                type="button"
                onClick={() => handleToggleNodeNot(node.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                  node.not
                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                }`}
              >
                NOT GROUP
              </button>

              <span className="text-[11px] text-slate-400 font-medium">
                {isOr ? 'Match any rule in this group' : 'Match all rules in this group'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Add Condition */}
              <button
                type="button"
                onClick={() => handleAddCondition(node.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-metrica-500 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-metrica-600" />
                Condition
              </button>

              {/* Add Nested Group */}
              <button
                type="button"
                onClick={() => handleAddGroup(node.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                Nested Group
              </button>

              {/* Remove Group (if not root) */}
              {!isRoot && (
                <button
                  type="button"
                  onClick={() => handleRemoveNode(node.id)}
                  title="Delete Group"
                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Children rules */}
          <div className="space-y-2.5 pt-1">
            {children.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Group is empty. Click "+ Condition" to add a rule.
              </div>
            ) : (
              children.map(child => renderRuleNode(child, false))
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-lg ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Sub-Tabs */}
      <div className="glass-panel text-glass-primary p-5 shadow-glass flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-metrica-500/10 text-metrica-600 dark:text-metrica-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-glass-primary">
                Conditions, Logic & Calculated Columns
              </h3>
              <p className="text-xs text-glass-muted font-medium mt-0.5">
                Visual condition builder, nested AND/OR/NOT logic, live stats, IF/THEN columns & AI rules
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center p-1 bg-white/40 dark:bg-white/5 rounded-xl border border-glass-border text-xs">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'rules'
                ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                : 'text-glass-secondary hover:text-glass-primary'
            }`}
          >
            Condition Rules
          </button>
          <button
            onClick={() => setActiveTab('ifthen')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'ifthen'
                ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                : 'text-glass-secondary hover:text-glass-primary'
            }`}
          >
            IF / THEN / ELSE
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                : 'text-glass-secondary hover:text-glass-primary'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Saved Rules ({savedRules.length})
          </button>
        </div>
      </div>

      {/* TAB 1: VISUAL CONDITION BUILDER */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Top Live Preview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Matched row counter card */}
            <div className="md:col-span-4 bg-gradient-to-br from-metrica-600 to-metrica-700 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-metrica-100 block">
                  Matched Records
                </span>
                <div className="text-3xl sm:text-4xl font-black mt-1">
                  {matchedCount.toLocaleString()}
                  <span className="text-sm font-semibold opacity-80 ml-2">
                    ({matchedPercentage}%)
                  </span>
                </div>
                <p className="text-xs text-metrica-100/90 mt-1">
                  of {data.length.toLocaleString()} total rows in dataset
                </p>
              </div>

              {/* Action buttons row */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-metrica-500/40">
                <button
                  onClick={handleToggleGlobalFilter}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isRuleActiveFilter
                      ? 'bg-white text-metrica-700 shadow-md'
                      : 'bg-metrica-800/80 hover:bg-metrica-800 text-white'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {isRuleActiveFilter ? 'Filter Active' : 'Filter Canvas'}
                </button>

                <button
                  onClick={handleToggleTableHighlight}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isHighlightActive
                      ? 'bg-white text-metrica-700 shadow-md'
                      : 'bg-metrica-800/80 hover:bg-metrica-800 text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {isHighlightActive ? 'Highlight On' : 'Highlight Table'}
                </button>

                <button
                  onClick={handleAddRuleDrivenKpi}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add as KPI Card
                </button>
              </div>
            </div>

            {/* Readout sentence & Save row */}
            <div className="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 custom-card-shadow flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Rule Logic Sentence
                  </span>
                  <button
                    onClick={onAiRulePrompt}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-metrica-50 dark:bg-metrica-950/60 text-metrica-600 dark:text-metrica-400 border border-metrica-200 dark:border-metrica-800 hover:bg-metrica-100 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask AI to Build Rule
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 font-mono text-xs text-slate-800 dark:text-slate-200 break-words">
                  {ruleSentence}
                </div>
              </div>

              {/* Save Rule Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={ruleNameInput}
                  onChange={(e) => setRuleNameInput(e.target.value)}
                  placeholder="Name this rule (e.g. VIP Customers)..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
                />
                <button
                  onClick={handleSaveCurrentRule}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Rule
                </button>
              </div>
            </div>
          </div>

          {/* Condition Builder Tree */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Condition Tree (Visual Builder)
              </span>
              <button
                onClick={() => {
                  const defaultCol = columns[0]?.name || '';
                  const defaultType = columns[0]?.type || 'category';
                  const initGrp = createGroupNode('AND');
                  initGrp.children.push(createConditionNode(defaultCol, defaultType));
                  setRootRule(initGrp);
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Builder
              </button>
            </div>

            {/* Tree root */}
            {renderRuleNode(rootRule, true)}
          </div>

          {/* Matched vs Non-Matched Statistical Comparison */}
          {numericCols.length > 0 && conditionStats && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-metrica-600 dark:text-metrica-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Matched vs. Non-Matched Metric Comparison
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Compare Metric:</span>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
                  >
                    {numericCols.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matched Group Stats */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/40 pb-2">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Matching Rows ({conditionStats.matched.count.toLocaleString()})
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      {conditionStats.matched.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                      <span className="text-[10px] text-slate-400 block uppercase">Sum</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {conditionStats.matched.sum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                      <span className="text-[10px] text-slate-400 block uppercase">Mean</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {conditionStats.matched.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                      <span className="text-[10px] text-slate-400 block uppercase">Min</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {conditionStats.matched.min.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                      <span className="text-[10px] text-slate-400 block uppercase">Max</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {conditionStats.matched.max.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Non-Matched Group Stats */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Non-Matching Rows ({conditionStats.nonMatched.count.toLocaleString()})
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {conditionStats.nonMatched.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                      <span className="text-[10px] text-slate-400 block uppercase">Sum</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {conditionStats.nonMatched.sum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                      <span className="text-[10px] text-slate-400 block uppercase">Mean</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {conditionStats.nonMatched.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                      <span className="text-[10px] text-slate-400 block uppercase">Min</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {conditionStats.nonMatched.min.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                      <span className="text-[10px] text-slate-400 block uppercase">Max</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {conditionStats.nonMatched.max.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IF / THEN / ELSE CALCULATED COLUMNS */}
      {activeTab === 'ifthen' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow space-y-6">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Create New Calculated Column via IF / THEN / ELSE
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Classify your records based on conditions. The resulting column becomes instantly available in the Data Table, Chart Builder, Global Slicers, and CSV exports.
            </p>
          </div>

          {/* Target Column Name */}
          <div className="max-w-md space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              New Column Name
            </label>
            <input
              type="text"
              value={calcColName}
              onChange={(e) => setCalcColName(e.target.value)}
              placeholder="e.g. Customer_Tier"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
            />
          </div>

          {/* Branches */}
          <div className="space-y-4">
            {branches.map((branch, idx) => {
              const cond = branch.conditionRoot;
              const ops = getOperatorsForType(cond.columnType || 'category');

              return (
                <div
                  key={branch.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-metrica-600 text-white">
                      {idx === 0 ? 'IF' : 'ELSE IF'}
                    </span>
                    {branches.length > 1 && (
                      <button
                        onClick={() => handleRemoveBranch(branch.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Condition Column */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Column
                      </label>
                      <select
                        value={cond.column}
                        onChange={(e) => {
                          const colObj = columns.find(c => c.name === e.target.value);
                          const colType = colObj?.type || 'category';
                          const newOps = getOperatorsForType(colType);
                          setBranches(prev =>
                            prev.map(b =>
                              b.id === branch.id
                                ? {
                                    ...b,
                                    conditionRoot: {
                                      ...cond,
                                      column: e.target.value,
                                      columnType: colType,
                                      operator: newOps[0]?.id || 'equals'
                                    }
                                  }
                                : b
                            )
                          );
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {columns.map(c => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Operator */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Operator
                      </label>
                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          setBranches(prev =>
                            prev.map(b =>
                              b.id === branch.id
                                ? {
                                    ...b,
                                    conditionRoot: {
                                      ...cond,
                                      operator: e.target.value
                                    }
                                  }
                                : b
                            )
                          );
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {ops.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Condition Value */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Comparison Value
                      </label>
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => {
                          setBranches(prev =>
                            prev.map(b =>
                              b.id === branch.id
                                ? {
                                    ...b,
                                    conditionRoot: {
                                      ...cond,
                                      value: e.target.value
                                    }
                                  }
                                : b
                            )
                          );
                        }}
                        placeholder="Value..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* Output Value */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold uppercase text-metrica-600 dark:text-metrica-400 block mb-1">
                        THEN Output Value
                      </label>
                      <input
                        type="text"
                        value={branch.outputValue}
                        onChange={(e) => {
                          setBranches(prev =>
                            prev.map(b =>
                              b.id === branch.id ? { ...b, outputValue: e.target.value } : b
                            )
                          );
                        }}
                        placeholder="e.g. VIP"
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-metrica-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ELSE Fallback */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-700 text-white">
                  ELSE
                </span>
                <span className="text-xs text-slate-500">Default fallback value when no condition matches:</span>
              </div>
              <input
                type="text"
                value={elseValue}
                onChange={(e) => setElseValue(e.target.value)}
                placeholder="Fallback value..."
                className="w-48 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleAddElseIfBranch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add ELSE IF Branch
            </button>

            <button
              onClick={handleApplyCalculatedCol}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-metrica-600 hover:bg-metrica-700 text-white shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              Generate Calculated Column
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SAVED RULES REPOSITORY */}
      {activeTab === 'saved' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Saved Conditions & Logic Rules
            </h4>
            <span className="text-xs text-slate-400">Stored in browser localStorage</span>
          </div>

          {savedRules.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">No saved rules yet.</p>
              <p className="text-[11px] text-slate-400">
                Build a condition under the "Condition Rules" tab and save it with a custom name.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRules.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.name}
                      </h5>
                      <span className="text-[10px] text-slate-400">{item.createdAt}</span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      {item.sentence}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleDeleteSavedRule(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete saved rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleLoadSavedRule(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-metrica-600 hover:bg-metrica-700 text-white transition-colors"
                    >
                      Load into Builder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

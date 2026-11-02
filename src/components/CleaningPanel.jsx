import React, { useState } from 'react';
import {
  Wand2,
  Trash2,
  Copy,
  Edit3,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Layers,
  Hash,
  Type,
  Calendar
} from 'lucide-react';

export default function CleaningPanel({
  data,
  columns,
  summary,
  originalData,
  onApplyCleanedData,
  onResetOriginal
}) {
  const [selectedCol, setSelectedCol] = useState(columns[0]?.name || '');
  const [imputeStrategy, setImputeStrategy] = useState('mean'); // 'mean' | 'median' | 'mode' | 'zero' | 'custom'
  const [customFillValue, setCustomFillValue] = useState('');
  const [editingColName, setEditingColName] = useState('');
  const [newColName, setNewColName] = useState('');
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  const notify = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // 1. Remove duplicate rows
  const handleRemoveDuplicates = () => {
    const seen = new Set();
    const cleaned = [];
    let removed = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      let sig = '';
      for (const key in row) {
        sig += (row[key] !== null && row[key] !== undefined ? String(row[key]) : '__NULL__') + '||';
      }

      if (seen.has(sig)) {
        removed++;
      } else {
        seen.add(sig);
        cleaned.push(row);
      }
    }

    if (removed === 0) {
      notify('No duplicate rows found in dataset.', 'error');
      return;
    }

    onApplyCleanedData(cleaned, `Removed ${removed} duplicate rows.`);
    notify(`Successfully removed ${removed} duplicate row${removed > 1 ? 's' : ''}!`);
  };

  // 2. Drop rows with empty cells
  const handleDropEmpty = (colSpecific = null) => {
    let dropped = 0;
    const cleaned = data.filter(row => {
      if (colSpecific) {
        const val = row[colSpecific];
        if (val === null || val === undefined || val === '') {
          dropped++;
          return false;
        }
        return true;
      }

      // Any empty cell in row
      for (const key in row) {
        const val = row[key];
        if (val === null || val === undefined || val === '') {
          dropped++;
          return false;
        }
      }
      return true;
    });

    if (dropped === 0) {
      notify(`No empty cells found to drop${colSpecific ? ` in column "${colSpecific}"` : ''}.`, 'error');
      return;
    }

    onApplyCleanedData(cleaned, `Dropped ${dropped} rows with empty values.`);
    notify(`Dropped ${dropped} row${dropped > 1 ? 's' : ''} with empty values.`);
  };

  // 3. Fill / Impute empty cells
  const handleFillEmpty = () => {
    if (!selectedCol) return;

    const targetProfile = columns.find(c => c.name === selectedCol);
    const isNumeric = targetProfile?.type === 'number';

    // Calculate fill value
    let fillVal = customFillValue;

    if (imputeStrategy === 'zero') {
      fillVal = isNumeric ? 0 : '0';
    } else if (imputeStrategy === 'mean' && isNumeric) {
      const nums = data.map(r => r[selectedCol]).filter(v => typeof v === 'number' && !isNaN(v));
      if (nums.length === 0) {
        notify('Cannot calculate mean on this column.', 'error');
        return;
      }
      const sum = nums.reduce((a, b) => a + b, 0);
      fillVal = Math.round((sum / nums.length) * 100) / 100;
    } else if (imputeStrategy === 'median' && isNumeric) {
      const nums = data.map(r => r[selectedCol]).filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
      if (nums.length === 0) {
        notify('Cannot calculate median on this column.', 'error');
        return;
      }
      const mid = Math.floor(nums.length / 2);
      fillVal = nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    } else if (imputeStrategy === 'mode') {
      const counts = {};
      data.forEach(r => {
        const v = r[selectedCol];
        if (v !== null && v !== undefined && v !== '') {
          counts[v] = (counts[v] || 0) + 1;
        }
      });
      let bestVal = null;
      let maxCount = -1;
      for (const k in counts) {
        if (counts[k] > maxCount) {
          maxCount = counts[k];
          bestVal = k;
        }
      }
      fillVal = isNumeric ? Number(bestVal) : bestVal;
    } else if (imputeStrategy === 'custom') {
      if (fillVal === '') {
        notify('Please enter a custom fill value.', 'error');
        return;
      }
      if (isNumeric && !isNaN(Number(fillVal))) {
        fillVal = Number(fillVal);
      }
    }

    let filledCount = 0;
    const cleaned = data.map(row => {
      const val = row[selectedCol];
      if (val === null || val === undefined || val === '') {
        filledCount++;
        return {
          ...row,
          [selectedCol]: fillVal
        };
      }
      return row;
    });

    if (filledCount === 0) {
      notify(`Column "${selectedCol}" has no empty cells to fill.`, 'error');
      return;
    }

    onApplyCleanedData(cleaned, `Filled ${filledCount} empty cells in ${selectedCol} with "${fillVal}".`);
    notify(`Filled ${filledCount} empty cell${filledCount > 1 ? 's' : ''} in "${selectedCol}" with "${fillVal}".`);
  };

  // 4. Rename column
  const handleRenameColumn = (oldName) => {
    if (!newColName.trim() || newColName.trim() === oldName) {
      setEditingColName('');
      return;
    }
    const cleanNew = newColName.trim();

    if (columns.some(c => c.name === cleanNew)) {
      notify(`A column named "${cleanNew}" already exists.`, 'error');
      return;
    }

    const cleaned = data.map(row => {
      const newRow = { ...row };
      newRow[cleanNew] = newRow[oldName];
      delete newRow[oldName];
      return newRow;
    });

    onApplyCleanedData(cleaned, `Renamed column "${oldName}" to "${cleanNew}".`);
    notify(`Renamed column "${oldName}" to "${cleanNew}".`);
    setEditingColName('');
    setNewColName('');
  };

  const getColIcon = (type) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-blue-500" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Type className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-md border animate-in slide-in-from-top-2 duration-150 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Overview Card */}
      <div className="glass-panel text-glass-primary p-6 shadow-glass flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-metrica-500/10 text-metrica-600 dark:text-metrica-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-glass-primary">
              Data Cleaning & Transformation Studio
            </h3>
          </div>
          <p className="text-xs text-glass-muted font-medium mt-1">
            Detect and resolve dirty data, deduplicate rows, impute missing values, and manage columns.
          </p>
        </div>

        <button
          onClick={onResetOriginal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold glass-button text-glass-secondary hover:text-glass-primary transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Revert to Original Dataset
        </button>
      </div>

      {/* Grid: 3 Cleaning Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Deduplication */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 custom-card-shadow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <Copy className="w-4 h-4 text-metrica-600 dark:text-metrica-400" />
                Remove Duplicates
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                summary?.duplicateCount > 0
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}>
                {summary?.duplicateCount || 0} duplicates
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identifies identical rows across all columns and keeps only the unique first appearance.
            </p>
          </div>

          <button
            onClick={handleRemoveDuplicates}
            disabled={!summary?.duplicateCount}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-metrica-600 hover:bg-metrica-700 disabled:opacity-40 text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Deduplicate Dataset
          </button>
        </div>

        {/* 2. Drop Empty Rows */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 custom-card-shadow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <Trash2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Drop Empty Rows
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                {summary?.missingValues || 0} empty cells
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Discards incomplete rows from analysis. Choose to drop rows with any missing value or target a specific column.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleDropEmpty(null)}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors"
            >
              Drop rows with ANY empty cell
            </button>
            <div className="flex items-center gap-2">
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {columns.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.nullCount} empty)
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleDropEmpty(selectedCol)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Drop
              </button>
            </div>
          </div>
        </div>

        {/* 3. Fill / Impute Empty Cells */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 custom-card-shadow flex flex-col justify-between space-y-4">
          <div>
            <span className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white mb-2">
              <Wand2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Fill / Impute Cells
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Replaces null or blank values with statistical estimates or custom defaults.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Target Column
                </label>
                <select
                  value={selectedCol}
                  onChange={(e) => setSelectedCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  {columns.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Strategy
                </label>
                <select
                  value={imputeStrategy}
                  onChange={(e) => setImputeStrategy(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="mean">Mean (Average)</option>
                  <option value="median">Median</option>
                  <option value="mode">Mode (Most Frequent)</option>
                  <option value="zero">Zero (0)</option>
                  <option value="custom">Custom Value...</option>
                </select>
              </div>
            </div>

            {imputeStrategy === 'custom' && (
              <input
                type="text"
                value={customFillValue}
                onChange={(e) => setCustomFillValue(e.target.value)}
                placeholder="Enter fill replacement..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            )}

            <button
              onClick={handleFillEmpty}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Apply Fill
            </button>
          </div>
        </div>
      </div>

      {/* 4. Column Names and Profiles Manager */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-metrica-600 dark:text-metrica-400" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            Columns & Data Types Manager
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {columns.map(col => {
            const isEditing = editingColName === col.name;
            return (
              <div
                key={col.name}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {getColIcon(col.type)}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        placeholder="New name..."
                        className="w-full px-2 py-1 text-xs rounded-lg border border-metrica-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameColumn(col.name)}
                        className="px-2 py-1 rounded bg-metrica-600 text-white text-[10px] font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingColName('')}
                        className="px-1.5 py-1 text-slate-400 text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {col.name}
                      </p>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {col.type} • {col.nullCount > 0 ? `${col.nullCount} null` : '0 null'}
                      </span>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditingColName(col.name);
                      setNewColName(col.name);
                    }}
                    title="Rename Column"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

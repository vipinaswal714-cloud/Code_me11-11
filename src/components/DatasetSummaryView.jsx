import React, { useState, useMemo } from 'react';
import {
  Database,
  Key,
  Calendar,
  BarChart3,
  Tag,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { detectColumnRoles, detectKeyRelationships, generateSchemaAssumptions } from '../utils/schemaDetector';

const ROLE_OPTIONS = [
  { value: 'measure', label: 'Measure (Numeric Metric)', icon: BarChart3, color: 'text-blue-500' },
  { value: 'dimension', label: 'Dimension (Category)', icon: Tag, color: 'text-emerald-500' },
  { value: 'datetime', label: 'Date / Time', icon: Calendar, color: 'text-purple-500' },
  { value: 'id_key', label: 'Identifier (Key)', icon: Key, color: 'text-amber-500' }
];

export default function DatasetSummaryView({ data, columns, userOverrides = {}, onUpdateRoleOverride }) {
  const [activeSubTab, setActiveSubTab] = useState('schema'); // 'schema' | 'assumptions' | 'relationships'

  // Inferred roles
  const baseRoles = useMemo(() => detectColumnRoles(data, columns), [data, columns]);

  // Merged with user overrides
  const effectiveRoles = useMemo(() => {
    const merged = {};
    for (const col of columns) {
      const base = baseRoles[col.name] || { role: 'dimension', isPrimaryKey: false, uniqueCount: 0, nullCount: 0 };
      const overriddenRole = userOverrides[col.name];
      merged[col.name] = {
        ...base,
        role: overriddenRole || base.role,
        isOverridden: Boolean(overriddenRole)
      };
    }
    return merged;
  }, [baseRoles, columns, userOverrides]);

  // Detected key relationships
  const relationships = useMemo(() => {
    return detectKeyRelationships([
      { name: 'Active Dataset', data, columns }
    ]);
  }, [data, columns]);

  // Explicit assumptions
  const assumptions = useMemo(() => generateSchemaAssumptions(data, columns), [data, columns]);

  const totalRows = data.length;
  const totalCols = columns.length;
  const pkCandidate = columns.find(c => effectiveRoles[c.name]?.isPrimaryKey);

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-metrica-600/10 text-metrica-600 dark:text-metrica-400 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Smart Schema & Dataset Summary</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-metrica-50 dark:bg-metrica-950/60 text-metrica-600 dark:text-metrica-400 border border-metrica-200 dark:border-metrica-800">
                  Automated Inference
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Infers semantic roles (Measures, Dimensions, Dates, Keys). Correct any detected role using the dropdowns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Rows</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{totalRows.toLocaleString()}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Columns</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{totalCols}</span>
            </div>
            {pkCandidate && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300">
                <span className="block text-[10px] uppercase font-bold flex items-center gap-1">
                  <Key className="w-3 h-3" /> Primary Key
                </span>
                <span className="font-bold text-sm">{pkCandidate.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sub-navigation */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setActiveSubTab('schema')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeSubTab === 'schema'
                ? 'bg-metrica-50 dark:bg-metrica-950/60 text-metrica-600 dark:text-metrica-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Column Roles & Types ({columns.length})
          </button>
          <button
            onClick={() => setActiveSubTab('assumptions')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'assumptions'
                ? 'bg-metrica-50 dark:bg-metrica-950/60 text-metrica-600 dark:text-metrica-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Assumptions Note ({assumptions.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: Schema Table */}
      {activeSubTab === 'schema' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden custom-card-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Column Name</th>
                  <th className="py-3.5 px-4">Storage Type</th>
                  <th className="py-3.5 px-4">Inferred Business Role</th>
                  <th className="py-3.5 px-4">Unique Values</th>
                  <th className="py-3.5 px-4">Missing Cells</th>
                  <th className="py-3.5 px-4">Key Status</th>
                  <th className="py-3.5 px-4 text-right">Correct Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {columns.map(col => {
                  const roleInfo = effectiveRoles[col.name] || {};
                  const isPk = roleInfo.isPrimaryKey;
                  const nullPct = totalRows > 0 ? ((roleInfo.nullCount / totalRows) * 100).toFixed(1) : 0;

                  return (
                    <tr key={col.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {isPk && <Key className="w-3.5 h-3.5 text-amber-500" title="Primary Key Candidate" />}
                        <span>{col.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {col.type}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${
                          roleInfo.role === 'measure'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : roleInfo.role === 'dimension'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : roleInfo.role === 'datetime'
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}>
                          {roleInfo.role}
                        </span>
                        {roleInfo.isOverridden && (
                          <span className="ml-1.5 text-[10px] text-slate-400 font-normal italic">(Edited)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {roleInfo.uniqueCount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {roleInfo.nullCount > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {roleInfo.nullCount} ({nullPct}%)
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isPk ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            PK Candidate
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={roleInfo.role}
                          onChange={(e) => onUpdateRoleOverride(col.name, e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-metrica-500"
                        >
                          {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Explicit Assumptions Note */}
      {activeSubTab === 'assumptions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <HelpCircle className="w-4 h-4 text-metrica-600 dark:text-metrica-400" />
            <span>Assumptions Note: Schema & Key Inferences</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Metrica uses deterministic heuristics to infer column roles and primary keys. Review each assumption below and adjust any role in the schema table if your domain knowledge differs.
          </p>

          <div className="space-y-2.5">
            {assumptions.map((assumption, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{assumption}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

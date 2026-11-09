import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { auditDataQuality } from '../utils/dataQualityEngine';

export default function DataQualityReport({
  data,
  columns,
  onApplyCleanedData,
  onNavigateToCleaning
}) {
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [successMessage, setSuccessMessage] = useState(null);

  const report = useMemo(() => auditDataQuality(data, columns), [data, columns]);
  const { qualityScore, issues, summary } = report;

  const notify = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const filteredIssues = useMemo(() => {
    if (severityFilter === 'all') return issues;
    return issues.filter(i => i.severity === severityFilter);
  }, [issues, severityFilter]);

  // Execute one-click recommended fix
  const handleExecuteFix = (issue) => {
    const fix = issue.recommendedFix;
    if (!fix) return;

    if (fix.action === 'deduplicate') {
      const seen = new Set();
      const cleaned = [];
      let removed = 0;
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let sig = '';
        for (const k in row) {
          sig += (row[k] !== null && row[k] !== undefined ? String(row[k]) : '__NULL__') + '||';
        }
        if (seen.has(sig)) {
          removed++;
        } else {
          seen.add(sig);
          cleaned.push(row);
        }
      }
      onApplyCleanedData(cleaned, `Removed ${removed} duplicate rows.`);
      notify(`Deduplication complete: Removed ${removed} duplicates.`);
    } else if (fix.action === 'drop_empty_rows') {
      const col = fix.column;
      const initialCount = data.length;
      const cleaned = data.filter(r => {
        const val = r[col];
        return val !== null && val !== undefined && val !== '';
      });
      const dropped = initialCount - cleaned.length;
      onApplyCleanedData(cleaned, `Dropped ${dropped} rows with missing "${col}".`);
      notify(`Dropped ${dropped} empty rows in column "${col}".`);
    } else if (fix.action === 'cap_outliers') {
      const col = fix.column;
      const { lowerBound, upperBound } = issue.metadata;
      let cappedCount = 0;
      const cleaned = data.map(r => {
        const val = r[col];
        if (typeof val === 'number') {
          if (val < lowerBound) {
            cappedCount++;
            return { ...r, [col]: Math.round(lowerBound * 100) / 100 };
          }
          if (val > upperBound) {
            cappedCount++;
            return { ...r, [col]: Math.round(upperBound * 100) / 100 };
          }
        }
        return r;
      });
      onApplyCleanedData(cleaned, `Capped ${cappedCount} outliers in "${col}" to IQR bounds [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}].`);
      notify(`Capped ${cappedCount} outliers in "${col}" to IQR range.`);
    } else if (fix.action === 'standardize_fuzzy') {
      const col = fix.column;
      const { canonical, variants } = issue.metadata;
      const varSet = new Set(variants.map(v => String(v).trim().toLowerCase()));
      let fixedCount = 0;
      const cleaned = data.map(r => {
        const val = r[col];
        if (val !== null && val !== undefined) {
          const norm = String(val).trim().toLowerCase();
          if (varSet.has(norm) && String(val) !== canonical) {
            fixedCount++;
            return { ...r, [col]: canonical };
          }
        }
        return r;
      });
      onApplyCleanedData(cleaned, `Standardized ${fixedCount} text variants in "${col}" to "${canonical}".`);
      notify(`Standardized ${fixedCount} values to "${canonical}".`);
    } else if (fix.action === 'clean_suspicious') {
      const col = fix.column;
      let fixed = 0;
      const cleaned = data.map(r => {
        const val = r[col];
        if (typeof val === 'number' && val < 0) {
          fixed++;
          return { ...r, [col]: Math.abs(val) };
        }
        return r;
      });
      onApplyCleanedData(cleaned, `Sanitized ${fixed} negative values in "${col}".`);
      notify(`Sanitized ${fixed} suspicious negative values in "${col}".`);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-500 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40';
    if (score >= 70) return 'text-amber-500 border-amber-500/30 bg-amber-50 dark:bg-amber-950/40';
    return 'text-rose-500 border-rose-500/30 bg-rose-50 dark:bg-rose-950/40';
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'medium':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-xl text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header & Quality Score Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center font-black text-2xl ${getScoreColor(qualityScore)}`}>
              {qualityScore}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dataset Quality Health Report</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  qualityScore >= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {qualityScore >= 85 ? 'Good Health' : qualityScore >= 60 ? 'Needs Attention' : 'Critical Clean Needed'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Automated statistical profiling for missing values, duplicates, Tukey IQR outliers, fuzzy typos, and suspicious ranges.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToCleaning}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Full Cleaning Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Severity Count Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setSeverityFilter('all')}
            className={`p-3 rounded-xl border text-left transition-all ${
              severityFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-70">Total Issues</div>
            <div className="text-xl font-bold">{issues.length}</div>
          </button>

          <button
            onClick={() => setSeverityFilter('high')}
            className={`p-3 rounded-xl border text-left transition-all ${
              severityFilter === 'high'
                ? 'bg-rose-600 text-white border-transparent shadow-sm'
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> High Severity
            </div>
            <div className="text-xl font-bold">{summary.highSeverityCount}</div>
          </button>

          <button
            onClick={() => setSeverityFilter('medium')}
            className={`p-3 rounded-xl border text-left transition-all ${
              severityFilter === 'medium'
                ? 'bg-amber-600 text-white border-transparent shadow-sm'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
            }`}
          >
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Medium Severity
            </div>
            <div className="text-xl font-bold">{summary.mediumSeverityCount}</div>
          </button>

          <button
            onClick={() => setSeverityFilter('low')}
            className={`p-3 rounded-xl border text-left transition-all ${
              severityFilter === 'low'
                ? 'bg-blue-600 text-white border-transparent shadow-sm'
                : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300'
            }`}
          >
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 flex items-center gap-1">
              <Info className="w-3 h-3" /> Low Severity
            </div>
            <div className="text-xl font-bold">{summary.lowSeverityCount}</div>
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
          <span>{filteredIssues.length} Quality Item{filteredIssues.length !== 1 ? 's' : ''} ({severityFilter.toUpperCase()})</span>
          <span>One-Click Actionable Fixes</span>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clean Dataset Health</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              No quality defects found matching this filter. Your data is well-formed, complete, and ready for analytics.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4.5 transition-all custom-card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`mt-0.5 p-2 rounded-xl border ${
                    issue.severity === 'high'
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      : issue.severity === 'medium'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  }`}>
                    {issue.severity === 'high' ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : issue.severity === 'medium' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {issue.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      {issue.column && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {issue.column}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {issue.description}
                    </p>
                  </div>
                </div>

                {issue.recommendedFix && (
                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    <button
                      onClick={() => handleExecuteFix(issue)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-metrica-50 hover:bg-metrica-100 dark:bg-metrica-950/40 dark:hover:bg-metrica-900/60 text-metrica-600 dark:text-metrica-400 border border-metrica-200 dark:border-metrica-800 transition-colors"
                      title={issue.recommendedFix.label}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{issue.recommendedFix.label}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

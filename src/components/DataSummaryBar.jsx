import React from 'react';
import { Database, Columns, AlertTriangle, Copy, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export default function DataSummaryBar({
  summary,
  filteredCount,
  onNavigateToCleaning,
  onNavigateToTable,
  onNavigateToQuality,
  onNavigateToSchema
}) {
  if (!summary) return null;

  const { totalRows, totalCols, missingValues, duplicateCount, columnProfiles = [] } = summary;

  const numCount = columnProfiles.filter(c => c.type === 'number').length;
  const catCount = columnProfiles.filter(c => c.type === 'category').length;
  const dateCount = columnProfiles.filter(c => c.type === 'date').length;

  const isFiltered = filteredCount !== undefined && filteredCount !== totalRows;

  return (
    <div className="glass-panel text-glass-primary p-4 sm:p-5 shadow-glass flex flex-wrap items-center justify-between gap-4">
      {/* Left: Summary Metrics */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Total / Filtered Rows */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-metrica-500/20 text-metrica-500 border border-metrica-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-glass-primary">
                {isFiltered ? filteredCount.toLocaleString() : totalRows.toLocaleString()}
              </span>
              {isFiltered && (
                <span className="text-xs text-glass-muted font-medium">
                  of {totalRows.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-glass-muted font-semibold">
              {isFiltered ? 'Active Filtered Rows' : 'Total Records'}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-glass-border hidden sm:block" />

        {/* Columns & Types */}
        <div
          onClick={onNavigateToSchema}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
          title="Click to view Smart Schema"
        >
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-500 border border-cyan-500/30 group-hover:scale-105 transition-transform">
            <Columns className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-glass-primary">{totalCols}</span>
            <div className="flex items-center gap-1.5 text-xs text-glass-muted font-medium mt-0.5">
              <span>{numCount} numeric</span>
              <span>•</span>
              <span>{catCount} cat.</span>
              {dateCount > 0 && (
                <>
                  <span>•</span>
                  <span>{dateCount} dates</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-glass-border hidden sm:block" />

        {/* Missing Values */}
        <div
          onClick={onNavigateToQuality}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
          title="Click to view Data Quality Report"
        >
          <div className={`p-2.5 rounded-xl border group-hover:scale-105 transition-transform ${
            missingValues > 0
              ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
          }`}>
            {missingValues > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-glass-primary">{missingValues.toLocaleString()}</span>
            <p className="text-xs text-glass-muted font-semibold">Missing Cells</p>
          </div>
        </div>

        <div className="h-8 w-px bg-glass-border hidden sm:block" />

        {/* Duplicates */}
        <div
          onClick={onNavigateToQuality}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
          title="Click to view Data Quality Report"
        >
          <div className={`p-2.5 rounded-xl border group-hover:scale-105 transition-transform ${
            duplicateCount > 0
              ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
          }`}>
            <Copy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-glass-primary">{duplicateCount.toLocaleString()}</span>
            <p className="text-xs text-glass-muted font-semibold">Duplicate Rows</p>
          </div>
        </div>
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-2.5">
        {(duplicateCount > 0 || missingValues > 0) && (
          <button
            onClick={onNavigateToCleaning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 border border-amber-500/40 transition-colors"
          >
            Clean Data
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onNavigateToTable}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold glass-button text-glass-secondary hover:text-glass-primary"
        >
          <FileText className="w-3.5 h-3.5" />
          View Raw Table
        </button>
      </div>
    </div>
  );
}

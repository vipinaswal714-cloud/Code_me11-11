import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Hash,
  Calendar,
  Type,
  FileSpreadsheet
} from 'lucide-react';

import { evaluateNode } from '../utils/ruleEvaluator';

export default function DataTable({ data, columns, highlightRule = null }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Column types map
  const typeMap = useMemo(() => {
    const map = {};
    columns.forEach(c => { map[c.name] = c.type; });
    return map;
  }, [columns]);

  // Filtering
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!search.trim()) return data;

    const lower = search.trim().toLowerCase();
    return data.filter(row => {
      for (const key in row) {
        const val = row[key];
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(lower)) {
          return true;
        }
      }
      return false;
    });
  }, [data, search]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortCol) return filteredData;

    const colType = typeMap[sortCol];
    const sorted = [...filteredData].sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (colType === 'number') {
        const numA = Number(valA);
        const numB = Number(valB);
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }

      if (colType === 'date') {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    return sorted;
  }, [filteredData, sortCol, sortDir, typeMap]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const paginatedRows = sortedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (colName) => {
    if (sortCol === colName) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortCol(null);
        setSortDir('asc');
      }
    } else {
      setSortCol(colName);
      setSortDir('asc');
    }
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

  const formatCellValue = (val, type) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-400 italic text-[11px]">(null)</span>;
    }
    if (type === 'number' && typeof val === 'number') {
      return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
    }
    return String(val);
  };

  return (
    <div className="glass-opaque rounded-2xl shadow-glass flex flex-col overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-glass-border flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-metrica-500/10 text-metrica-600 dark:text-metrica-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-glass-primary">Data Table Inspector</h3>
            <p className="text-xs text-glass-muted font-medium">
              Showing {sortedData.length.toLocaleString()} rows • {columns.length} columns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Table */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-glass-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter table rows..."
              aria-label="Filter table rows"
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-glass-border bg-white/60 dark:bg-white/5 text-glass-primary placeholder-glass-muted focus:outline-none focus:ring-2 focus:ring-metrica-500/40 w-48 sm:w-64"
            />
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-1.5 text-xs text-glass-muted font-medium">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="px-2 py-1 rounded-lg border border-glass-border bg-white/60 dark:bg-white/5 text-glass-primary text-xs focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container - Strict Opaque Table (0 blur overhead on repeated rows) */}
      <div className="overflow-x-auto max-h-[600px] divide-y divide-glass-border">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 border-b border-glass-border">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-glass-muted w-12 text-center">
                #
              </th>
              {columns.map(col => (
                <th
                  key={col.name}
                  onClick={() => handleSort(col.name)}
                  className="py-2.5 px-3 font-semibold text-glass-primary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    {getColIcon(col.type)}
                    <span>{col.name}</span>
                    <span className="text-glass-muted ml-1">
                      {sortCol === col.name ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-metrica-600 dark:text-metrica-400" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-metrica-600 dark:text-metrica-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border font-mono text-[11.5px]">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-glass-muted italic">
                  No matching records found
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const isHighlighted = highlightRule?.rule ? evaluateNode(highlightRule.rule, row) : false;

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isHighlighted
                        ? 'bg-amber-500/20 border-l-4 border-l-amber-500 font-semibold'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-glass-muted text-[10px] select-none">
                      {isHighlighted ? '★ ' : ''}{startIndex + idx + 1}
                    </td>
                    {columns.map(col => (
                      <td
                        key={col.name}
                        className={`py-2 px-3 whitespace-nowrap ${
                          col.type === 'number' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {formatCellValue(row[col.name], col.type)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-glass-border flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-white/5 text-xs text-glass-muted">
        <div>
          Showing{' '}
          <span className="font-semibold text-glass-primary">
            {sortedData.length === 0 ? 0 : startIndex + 1}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-glass-primary">
            {Math.min(startIndex + pageSize, sortedData.length)}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-glass-primary">
            {sortedData.length.toLocaleString()}
          </span>{' '}
          records
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
            aria-label="Previous page"
            className="p-1.5 rounded-lg border border-glass-border disabled:opacity-30 hover:bg-white/40 dark:hover:bg-white/10 text-glass-secondary hover:text-glass-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-semibold text-glass-primary">
            Page {clampedPage} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={clampedPage >= totalPages}
            aria-label="Next page"
            className="p-1.5 rounded-lg border border-glass-border disabled:opacity-30 hover:bg-white/40 dark:hover:bg-white/10 text-glass-secondary hover:text-glass-primary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

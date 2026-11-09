import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, X, ChevronDown, Check, RotateCcw } from 'lucide-react';

export default function GlobalFilters({
  columns,
  data,
  filters,
  onFiltersChange
}) {
  const [openDropdown, setOpenDropdown] = useState(null); // column name or null

  const catCols = useMemo(() => {
    return columns.filter(c => c.type === 'category' && c.uniqueCount <= 60);
  }, [columns]);

  const dateCols = useMemo(() => {
    return columns.filter(c => c.type === 'date');
  }, [columns]);

  // Compute distinct options for active categorical columns
  const columnOptions = useMemo(() => {
    const map = {};
    if (!data || data.length === 0) return map;
    catCols.forEach(col => {
      const set = new Set();
      for (let i = 0; i < Math.min(data.length, 5000); i++) {
        const val = data[i][col.name];
        set.add(val === null || val === undefined ? '(Blank)' : String(val));
      }
      map[col.name] = Array.from(set).sort();
    });
    return map;
  }, [data, catCols]);

  const activeCategoryFilterCount = Object.values(filters.categoryFilters || {}).reduce(
    (sum, arr) => sum + (arr?.length ? 1 : 0),
    0
  );

  const activeDateFilterCount = Object.values(filters.dateRangeFilters || {}).reduce(
    (sum, range) => sum + (range?.start || range?.end ? 1 : 0),
    0
  );

  const totalActiveFilters = (filters.search ? 1 : 0) + activeCategoryFilterCount + activeDateFilterCount;

  const handleSearchChange = (val) => {
    onFiltersChange({
      ...filters,
      search: val
    });
  };

  const handleToggleCategoryValue = (colName, value) => {
    const current = filters.categoryFilters?.[colName] || [];
    let updated;
    if (current.includes(value)) {
      updated = current.filter(v => v !== value);
    } else {
      updated = [...current, value];
    }

    onFiltersChange({
      ...filters,
      categoryFilters: {
        ...filters.categoryFilters,
        [colName]: updated.length > 0 ? updated : undefined
      }
    });
  };

  const handleClearCategory = (colName) => {
    const newCats = { ...filters.categoryFilters };
    delete newCats[colName];
    onFiltersChange({
      ...filters,
      categoryFilters: newCats
    });
  };

  const handleDateChange = (colName, key, val) => {
    onFiltersChange({
      ...filters,
      dateRangeFilters: {
        ...filters.dateRangeFilters,
        [colName]: {
          ...(filters.dateRangeFilters?.[colName] || {}),
          [key]: val
        }
      }
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      search: '',
      categoryFilters: {},
      dateRangeFilters: {}
    });
    setOpenDropdown(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 custom-card-shadow space-y-3">
      {/* Top Filter Bar: Search + Quick Slicers */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Global Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search across all fields..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-metrica-500/40 focus:border-metrica-500"
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Slicers Dropdowns */}
        {catCols.slice(0, 4).map(col => {
          const selectedValues = filters.categoryFilters?.[col.name] || [];
          const isOpen = openDropdown === col.name;
          const options = columnOptions[col.name] || [];

          return (
            <div key={col.name} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(isOpen ? null : col.name)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  selectedValues.length > 0
                    ? 'bg-metrica-50 dark:bg-metrica-950/40 border-metrica-300 dark:border-metrica-800 text-metrica-700 dark:text-metrica-300'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[120px]">{col.name}</span>
                {selectedValues.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-metrica-600 text-white text-[10px] rounded-full">
                    {selectedValues.length}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div
                  onMouseLeave={() => setOpenDropdown(null)}
                  className="absolute left-0 top-full mt-1.5 w-60 max-h-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-30 flex flex-col p-2 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-100 dark:border-slate-800 px-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Filter {col.name}
                    </span>
                    {selectedValues.length > 0 && (
                      <button
                        onClick={() => handleClearCategory(col.name)}
                        className="text-[10px] text-metrica-600 dark:text-metrica-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto space-y-1 flex-1 py-1">
                    {options.map(opt => {
                      const isChecked = selectedValues.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleToggleCategoryValue(col.name, opt)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isChecked
                              ? 'bg-metrica-50 dark:bg-metrica-950/40 text-metrica-700 dark:text-metrica-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate pr-2">{opt}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isChecked ? 'bg-metrica-600 border-metrica-600 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Date Range Slicers */}
        {dateCols.slice(0, 1).map(col => {
          const range = filters.dateRangeFilters?.[col.name] || {};
          return (
            <div key={col.name} className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-600 dark:text-slate-300">{col.name}:</span>
              <input
                type="date"
                aria-label={`Start date for ${col.name}`}
                value={range.start || ''}
                onChange={(e) => handleDateChange(col.name, 'start', e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                aria-label={`End date for ${col.name}`}
                value={range.end || ''}
                onChange={(e) => handleDateChange(col.name, 'end', e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
              />
              {(range.start || range.end) && (
                <button
                  onClick={() => {
                    handleDateChange(col.name, 'start', '');
                    handleDateChange(col.name, 'end', '');
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Reset All Filters Button */}
        {totalActiveFilters > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Filters ({totalActiveFilters})
          </button>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Download,
  Menu,
  FileSpreadsheet,
  FileText,
  Image,
  ChevronDown,
  RotateCcw,
  Plus,
  Sparkles
} from 'lucide-react';

export default function TopBar({
  activeTab,
  fileName,
  searchQuery,
  onSearchChange,
  isDark,
  onToggleTheme,
  onOpenBuilder,
  onToggleAi,
  isAiOpen,
  onExportPdf,
  onExportPng,
  onExportCsv,
  onResetFile,
  isDrawerOpen,
  onToggleDrawer,
  triggerRef
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Map active tab to human-readable breadcrumb label
  const TAB_LABELS = {
    upload: 'Dataset Overview',
    dashboard: 'Dashboard & Charts',
    insights: 'Business Insights',
    quality: 'Data Quality Report',
    schema: 'Smart Schema & Summary',
    conditions: 'Conditions & Logic',
    cleaning: 'Data Cleaning Studio',
    table: 'Data Table'
  };

  const currentLabel = TAB_LABELS[activeTab] || 'Analytics Studio';

  return (
    <header className="sticky top-4 z-20 mx-4 sm:ml-24 lg:ml-68 mb-6 glass-panel px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={onToggleDrawer}
          aria-label="Toggle navigation menu"
          aria-expanded={isDrawerOpen}
          className="sm:hidden p-2 rounded-xl glass-button text-glass-secondary hover:text-glass-primary"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Section Title */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-glass-primary">
            {currentLabel}
          </span>
          {fileName && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          )}
        </div>
      </div>

      {/* Right Actions: File Badge, Export Menu, Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Loaded File Badge with Reset option */}
        {fileName && (
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-metrica-600 dark:text-metrica-400" />
            <span className="font-semibold text-glass-primary truncate max-w-[140px]" title={fileName}>
              {fileName}
            </span>
            {onResetFile && (
              <button
                type="button"
                onClick={onResetFile}
                title="Change or reset dataset"
                className="ml-1 p-1 rounded-md text-glass-muted hover:text-glass-primary hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Ask AI Button (restored entry point from old Navbar) */}
        {fileName && onToggleAi && (
          <button
            type="button"
            onClick={onToggleAi}
            aria-label="Ask AI assistant"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              isAiOpen
                ? 'bg-gradient-to-r from-metrica-600 to-cyan-500 text-white shadow-md'
                : 'glass-button text-glass-secondary hover:text-glass-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        )}

        {/* + Add Chart Button (restored entry point from old Navbar) */}
        {fileName && onOpenBuilder && (
          <button
            type="button"
            onClick={onOpenBuilder}
            aria-label="Add new chart"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-button text-xs font-semibold text-metrica-600 dark:text-metrica-400 hover:text-metrica-500"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Chart</span>
          </button>
        )}

        {/* Export Dropdown Menu (only active when dataset loaded) */}
        {fileName && onExportPdf && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-button text-xs text-glass-secondary hover:text-glass-primary"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showExportMenu && (
              <div
                onMouseLeave={() => setShowExportMenu(false)}
                className="absolute right-0 top-full mt-2 w-48 glass-panel shadow-glass-lg z-50 p-1.5 text-xs text-glass-secondary animate-in fade-in duration-150"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportPdf();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-left transition-colors"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>Dashboard as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportPng();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-left transition-colors"
                >
                  <Image className="w-4 h-4 text-blue-500" />
                  <span>Dashboard as PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportCsv();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-left transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>Cleaned Data as CSV</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle (Dark / Light) */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className="p-2.5 rounded-xl glass-button text-glass-secondary hover:text-glass-primary"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
}

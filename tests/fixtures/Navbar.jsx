import React, { useState } from 'react';
import {
  BarChart2,
  Table,
  Wand2,
  Plus,
  Sparkles,
  Download,
  Moon,
  Sun,
  Settings,
  Upload,
  ChevronDown,
  FileSpreadsheet,
  FileImage,
  FileText,
  Database,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export default function Navbar({
  fileName,
  activeTab,
  onTabChange,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onOpenBuilder,
  onToggleAi,
  isAiOpen,
  onExportPdf,
  onExportPng,
  onExportCsv,
  onResetFile
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Metrica Branding & Logo */}
        <div className="flex items-center gap-6">
          <div
            onClick={onResetFile}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-metrica-600 flex items-center justify-center text-white shadow-md shadow-metrica-600/30 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M5 19V11M10 19V5M15 19V9M20 19V13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="20" cy="7" r="2" fill="#38a9f6" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
                  Metrica
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-metrica-600 dark:text-metrica-400 bg-metrica-50 dark:bg-metrica-950/60 px-1.5 py-0.5 rounded border border-metrica-200 dark:border-metrica-800">
                  Studio
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Spreadsheet Analytics
              </p>
            </div>
          </div>

          {/* Current File Pill */}
          {fileName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <FileSpreadsheet className="w-3.5 h-3.5 text-metrica-600 dark:text-metrica-400" />
              <span className="font-semibold truncate max-w-[160px]" title={fileName}>
                {fileName}
              </span>
            </div>
          )}
        </div>

        {/* Center: View Switcher Tabs (when file is loaded) */}
        {fileName && (
          <nav className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onTabChange('insights')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'insights'
                  ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Insights</span>
            </button>

            <button
              onClick={() => onTabChange('quality')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'quality'
                  ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quality</span>
            </button>

            <button
              onClick={() => onTabChange('schema')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'schema'
                  ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Schema</span>
            </button>

            <button
              onClick={() => onTabChange('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>

            <button
              onClick={() => onTabChange('cleaning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'cleaning'
                  ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Cleaning</span>
            </button>

            <button
              onClick={() => onTabChange('conditions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'conditions'
                  ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <path d="M10 7h4"></path>
                <path d="M7 10v7"></path>
                <path d="M7 17h7"></path>
              </svg>
              <span>Conditions & Logic</span>
            </button>
          </nav>
        )}

        {/* Right: Actions, AI, Export, Theme, Settings */}
        <div className="flex items-center gap-2">
          {fileName && (
            <>
              {/* + Add Chart Button */}
              <button
                onClick={onOpenBuilder}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-metrica-50 dark:bg-metrica-950/40 text-metrica-600 dark:text-metrica-400 border border-metrica-200 dark:border-metrica-800 hover:bg-metrica-100 dark:hover:bg-metrica-900/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Chart</span>
              </button>

              {/* Ask AI Button */}
              <button
                onClick={onToggleAi}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isAiOpen
                    ? 'bg-gradient-to-r from-metrica-600 to-cyan-500 text-white ring-2 ring-metrica-400/50'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-metrica-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Ask AI</span>
              </button>

              {/* Export Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showExportMenu && (
                  <div
                    onMouseLeave={() => setShowExportMenu(false)}
                    className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Metrica Exports
                    </div>
                    <button
                      onClick={() => {
                        onExportPdf();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                    >
                      <FileText className="w-4 h-4 text-rose-500" />
                      <div>
                        <p className="font-semibold">Dashboard as PDF</p>
                        <p className="text-[10px] text-slate-400">Metrica_Dashboard_*.pdf</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onExportPng();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                    >
                      <FileImage className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-semibold">Dashboard as PNG</p>
                        <p className="text-[10px] text-slate-400">Metrica_Dashboard_*.png</p>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      onClick={() => {
                        onExportCsv();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="font-semibold">Cleaned Data as CSV</p>
                        <p className="text-[10px] text-slate-400">Metrica_Cleaned_Data_*.csv</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload New File Button */}
              <button
                onClick={onResetFile}
                title="Upload another spreadsheet"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            title="Metrica AI & System Settings"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

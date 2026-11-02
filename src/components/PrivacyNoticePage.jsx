import React, { useMemo } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  Calendar,
  FileText,
  Printer,
  Moon,
  Sun,
  AlertTriangle,
  Lock,
  ExternalLink
} from 'lucide-react';
import privacyNoticeRaw from '../content/privacy-notice.md?raw';
import { parseAndSanitizeMarkdown } from '../utils/markdownParser';
import { PRIVACY_NOTICE_LAST_UPDATED, PRIVACY_NOTICE_VERSION } from '../constants/privacyNotices';
import { findUnresolvedPlaceholders } from '../utils/placeholderGuard';

export default function PrivacyNoticePage({ onBack, isDark, onToggleTheme }) {
  // Parse markdown securely at runtime
  const { html, headings } = useMemo(() => {
    return parseAndSanitizeMarkdown(privacyNoticeRaw);
  }, []);

  // Detect draft placeholders
  const placeholders = useMemo(() => {
    return findUnresolvedPlaceholders(privacyNoticeRaw);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleScrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update hash in URL cleanly
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors print:bg-white print:text-black">
      {/* Skip to Content Link (Accessibility) */}
      <a
        href="#privacy-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-metrica-600 text-white rounded-lg shadow-lg text-sm font-semibold"
      >
        Skip to privacy content
      </a>

      {/* Top Header / App Bar */}
      <header className="sticky top-0 z-30 border-b border-glass-border bg-white/70 dark:bg-slate-900/70 backdrop-blur-glass print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Back to Metrica analytics studio"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Metrica</span>
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-metrica-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                M
              </div>
              <span className="font-extrabold text-sm tracking-tight hidden sm:inline">
                Metrica
              </span>
              <span className="text-xs font-medium text-slate-400">/ Privacy Notice</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print privacy notice"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Print document"
            >
              <Printer className="w-4 h-4" />
            </button>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Placeholder / Draft Notice Banner */}
        {placeholders.length > 0 && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 print:hidden">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Review Draft Notice</p>
                <p className="text-xs mt-1 text-amber-800 dark:text-amber-300 leading-relaxed">
                  This document currently contains {placeholders.length} unresolved placeholder(s) enclosed in brackets (e.g. contact email, hosting provider, regions). Production deployments are guarded against unpopulated placeholders.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Table of Contents (Desktop Sticky Sidebar) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 order-2 lg:order-1 print:hidden">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-4 h-4 text-metrica-600 dark:text-metrica-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Table of Contents
                </h2>
              </div>
              <nav aria-label="Table of contents" className="space-y-1">
                {headings.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => handleScrollToSection(item.id)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-metrica-600 dark:hover:text-metrica-400 transition-colors truncate block"
                  >
                    {item.title}
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  Version {PRIVACY_NOTICE_VERSION}.0
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {PRIVACY_NOTICE_LAST_UPDATED}
                </span>
              </div>
            </div>
          </aside>

          {/* Legal Document Body */}
          <main
            id="privacy-content"
            role="main"
            className="lg:col-span-8 order-1 lg:order-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Meta Header */}
            <div className="pb-6 mb-8 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-metrica-600 dark:text-metrica-400 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>OFFICIAL LEGAL NOTICE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Metrica Privacy Notice
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Last updated: <strong>{PRIVACY_NOTICE_LAST_UPDATED}</strong>
                </span>
                <span>•</span>
                <span>Version {PRIVACY_NOTICE_VERSION}.0</span>
              </div>
            </div>

            {/* Sanitized Markdown Render Container */}
            <div
              className="prose dark:prose-invert max-w-none prose-slate text-sm sm:text-base leading-relaxed
                prose-headings:scroll-mt-24
                prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white
                prose-h2:text-lg sm:prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-100 dark:prose-h2:border-slate-800/80
                prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
                prose-p:my-3 prose-p:text-slate-600 dark:prose-p:text-slate-300
                prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5
                prose-li:my-1.5 prose-li:text-slate-600 dark:prose-li:text-slate-300
                prose-blockquote:my-4 prose-blockquote:border-l-4 prose-blockquote:border-metrica-500 prose-blockquote:bg-metrica-50/50 dark:prose-blockquote:bg-metrica-950/20 prose-blockquote:px-4 prose-blockquote:py-2.5 prose-blockquote:rounded-r-xl prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300 prose-blockquote:italic
                prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-bold
                prose-a:text-metrica-600 dark:prose-a:text-metrica-400 prose-a:underline hover:prose-a:text-metrica-700
                print:prose-headings:text-black print:prose-p:text-black print:prose-li:text-black"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Bottom Actions */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 print:hidden">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-metrica-600 hover:bg-metrica-700 text-white font-semibold text-xs shadow-md transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Metrica Studio</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Copy</span>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

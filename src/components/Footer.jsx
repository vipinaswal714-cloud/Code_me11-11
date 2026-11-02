import React from 'react';
import { ShieldCheck, Lock, ExternalLink, Settings, Sparkles } from 'lucide-react';
import { PRIVACY_NOTICE_LAST_UPDATED } from '../constants/privacyNotices';

export default function Footer({ onNavigatePrivacy, onOpenSettings }) {
  const handlePrivacyClick = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (onNavigatePrivacy) {
      onNavigatePrivacy();
    } else {
      window.history.pushState({}, '', '/privacy');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <footer
      role="contentinfo"
      className="mt-auto mx-4 sm:ml-24 lg:ml-68 mb-4 glass-panel py-4 px-6 relative z-10 print:hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Left: Branding & Core Privacy Promise */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
            <span className="w-4 h-4 rounded bg-metrica-600 text-white flex items-center justify-center text-[10px] font-black">
              M
            </span>
            <span>Metrica</span>
          </div>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Client-side analytics: your data stays on your device
          </span>
        </div>

        {/* Right: Privacy Notice Link & Security Badges */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 text-slate-500 dark:text-slate-400">
          <a
            href="/privacy"
            onClick={handlePrivacyClick}
            className="font-semibold text-slate-700 dark:text-slate-300 hover:text-metrica-600 dark:hover:text-metrica-400 transition-colors underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4"
          >
            Privacy Notice
          </a>

          {onOpenSettings && (
            <>
              <span>•</span>
              <button
                type="button"
                onClick={onOpenSettings}
                className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </>
          )}

          <span>•</span>
          <span className="text-[11px] text-glass-muted">
            Updated {PRIVACY_NOTICE_LAST_UPDATED}
          </span>
        </div>
      </div>
    </footer>
  );
}

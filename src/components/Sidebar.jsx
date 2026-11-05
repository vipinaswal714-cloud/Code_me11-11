import React, { useEffect, useRef } from 'react';
import {
  UploadCloud,
  TrendingUp,
  LayoutDashboard,
  GitBranch,
  Sparkles,
  Table,
  Bot,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Database
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onTabChange,
  isAiOpen,
  onToggleAi,
  onOpenSettings,
  onNavigatePrivacy,
  onNavigateHome,
  fileName,
  isDrawerOpen,
  onCloseDrawer,
  triggerRef
}) {
  const drawerRef = useRef(null);

  // Accessible navigation items definition
  const NAV_ITEMS = [
    {
      id: 'upload',
      label: 'Data',
      sublabel: fileName || 'Upload dataset',
      icon: UploadCloud,
      action: () => {
        onTabChange('upload');
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: activeTab === 'upload' || !fileName
    },
    {
      id: 'insights',
      label: 'Summary',
      sublabel: 'Executive insights',
      icon: TrendingUp,
      action: () => {
        onTabChange('insights');
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: activeTab === 'insights' && Boolean(fileName),
      disabled: !fileName
    },
    {
      id: 'dashboard',
      label: 'Charts',
      sublabel: 'KPIs & Visuals',
      icon: LayoutDashboard,
      action: () => {
        onTabChange('dashboard');
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: activeTab === 'dashboard' && Boolean(fileName),
      disabled: !fileName
    },
    {
      id: 'quality',
      label: 'Quality',
      sublabel: 'Health & issues',
      icon: ShieldCheck,
      action: () => {
        onTabChange('quality');
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: activeTab === 'quality' && Boolean(fileName),
      disabled: !fileName
    },
    {
      id: 'schema',
      label: 'Schema',
      sublabel: 'Types & roles',
      icon: Database,
      action: () => {
        onTabChange('schema');
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: activeTab === 'schema' && Boolean(fileName),
      disabled: !fileName
    },
    {
      id: 'conditions',
      label: 'Conditions & Logic',
      sublabel: 'IF/ELSE Rules',
      icon: GitBranch,
      action: () => {
        onTabChange('conditions');
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: activeTab === 'conditions' && Boolean(fileName),
      disabled: !fileName
    },
    {
      id: 'cleaning',
      label: 'Clean',
      sublabel: 'Fix & sanitize',
      icon: Sparkles,
      action: () => {
        onTabChange('cleaning');
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: activeTab === 'cleaning' && Boolean(fileName),
      disabled: !fileName
    },
    {
      id: 'table',
      label: 'Data Table',
      sublabel: 'Raw records',
      icon: Table,
      action: () => {
        onTabChange('table');
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: activeTab === 'table' && Boolean(fileName),
      disabled: !fileName
    }
  ];

  const SYSTEM_ITEMS = [
    {
      id: 'ai',
      label: 'Ask AI',
      sublabel: 'Gemini assistant',
      icon: Bot,
      action: () => {
        onToggleAi();
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: isAiOpen,
      disabled: !fileName,
      badge: 'AI'
    },
    {
      id: 'settings',
      label: 'Settings',
      sublabel: 'Models & Proxy',
      icon: Settings,
      action: () => {
        onOpenSettings();
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: false
    },
    {
      id: 'privacy',
      label: 'Privacy',
      sublabel: 'Notice & Rights',
      icon: ShieldCheck,
      action: () => {
        onNavigatePrivacy();
        if (isDrawerOpen) onCloseDrawer();
      },
      isActive: false
    }
  ];

  // Mobile Drawer Accessibility: Focus management and Escape key
  useEffect(() => {
    if (isDrawerOpen) {
      // Focus first active or focusable element in drawer
      const focusable = drawerRef.current?.querySelectorAll('button:not([disabled]), a:not([disabled])');
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onCloseDrawer();
          triggerRef?.current?.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDrawerOpen, onCloseDrawer, triggerRef]);

  // Sidebar content markup
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between p-4 space-y-6">
      {/* Brand Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              if (isMobile) onCloseDrawer();
            }}
            className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-metrica-500 rounded-xl"
            aria-label="Back to Metrica Home"
            title="Back to Metrica Home"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-metrica-600 via-metrica-500 to-cyan-400 text-white flex items-center justify-center font-black text-base shadow-md shadow-metrica-500/20">
              M
            </div>
            <div className="hidden lg:block">
              <span className="font-extrabold text-base tracking-tight text-glass-primary">
                Metrica
              </span>
              <p className="text-[10px] text-glass-muted font-medium">
                Analytics Studio
              </p>
            </div>
          </button>

          {isMobile && (
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 text-glass-muted hover:text-glass-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dataset Pill in Sidebar (if active) */}
        {fileName && (
          <div className="hidden lg:flex items-center gap-2 p-2.5 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-glass-primary truncate text-[11px]" title={fileName}>
              {fileName}
            </span>
          </div>
        )}
      </div>

      {/* Main Navigation Sections */}
      <nav aria-label="Main Navigation" className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        <p className="hidden lg:block text-[10px] font-bold uppercase tracking-wider text-glass-muted px-2.5 pb-1">
          Views
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              disabled={item.disabled}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 group relative ${
                isActive
                  ? 'glass-card-accent text-white shadow-md'
                  : item.disabled
                  ? 'opacity-40 cursor-not-allowed text-glass-muted'
                  : 'text-glass-secondary hover:text-glass-primary hover:bg-white/60 dark:hover:bg-white/10'
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'group-hover:text-metrica-500'}`} />
              <div className="sr-only lg:not-sr-only lg:flex flex-col text-left flex-1 min-w-0">
                <span className="truncate leading-tight">{item.label}</span>
                {item.sublabel && !isActive && (
                  <span className="text-[10px] opacity-70 font-normal truncate">
                    {item.sublabel}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        <div className="pt-4">
          <p className="hidden lg:block text-[10px] font-bold uppercase tracking-wider text-glass-muted px-2.5 pb-1">
            System & Tools
          </p>
          <div className="space-y-1.5">
            {SYSTEM_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.isActive;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  disabled={item.disabled}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'glass-card-accent text-white shadow-md'
                      : item.disabled
                      ? 'opacity-40 cursor-not-allowed text-glass-muted'
                      : 'text-glass-secondary hover:text-glass-primary hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'group-hover:text-metrica-500'}`} />
                  <div className="sr-only lg:not-sr-only lg:flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate leading-tight">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-metrica-500/20 text-metrica-600 dark:text-metrica-400 border border-metrica-500/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer Branding / Mini Status */}
      <div className="hidden lg:block pt-3 border-t border-glass-border">
        <p className="text-[10px] text-glass-muted text-center leading-relaxed">
          Frosted Glass UI • v18
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet Sidebar (Fixed Rail) */}
      <aside
        aria-label="Main Navigation"
        className="hidden sm:flex flex-col fixed top-4 left-4 bottom-4 z-30 w-16 lg:w-60 glass-panel shadow-glass overflow-hidden"
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (Collapsible Off-Canvas) */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          className="sm:hidden fixed inset-0 z-50 flex"
        >
          {/* Backdrop Click-to-Close */}
          <div
            onClick={onCloseDrawer}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Sheet */}
          <aside
            ref={drawerRef}
            aria-label="Main Navigation"
            className="relative z-10 w-72 max-w-[80vw] h-full glass-panel shadow-glass-lg rounded-r-3xl rounded-l-none border-l-0"
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}

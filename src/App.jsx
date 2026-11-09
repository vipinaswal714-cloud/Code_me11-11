import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

import UploadDropzone from './components/UploadDropzone';
import DataSummaryBar from './components/DataSummaryBar';
import GlobalFilters from './components/GlobalFilters';
import DashboardGrid from './components/DashboardGrid';
import DataTable from './components/DataTable';
import CleaningPanel from './components/CleaningPanel';
import AskAIPanel from './components/AskAIPanel';
import ChartBuilder from './components/ChartBuilder';
import SettingsModal from './components/SettingsModal';
import ConditionsPanel from './components/ConditionsPanel';
import DatasetSummaryView from './components/DatasetSummaryView';
import DataQualityReport from './components/DataQualityReport';
import BusinessInsightsView from './components/BusinessInsightsView';
import PrivacyNoticePage from './components/PrivacyNoticePage';
import HomePage from './components/HomePage';
import SignInPage from './components/SignInPage';
import ProfilePage from './components/ProfilePage';
import Footer from './components/Footer';
import { generateStarterDashboard } from './utils/autoDashboard';
import { applyGlobalFilters } from './utils/analyticsEngine';
import { evaluateNode, validateRuleSchema, formatRuleAsSentence } from './utils/ruleEvaluator';
import { exportDashboardAsPdf, exportDashboardAsPng, exportCleanedDataAsCsv } from './utils/exportUtils';
import { purgeObsoleteProviderSettings } from './utils/aiClient';
import { getSupabaseConfig, getSupabase } from './lib/supabaseClient';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('metrica_theme') === 'dark' ||
      (!localStorage.getItem('metrica_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('metrica_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('metrica_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    // Purge obsolete provider settings from localStorage on startup
    purgeObsoleteProviderSettings();
  }, []);

  // Lightweight SPA Routing State (supports direct /privacy, /login, /studio visits & page reloads)
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openStudio = () => navigateTo('/studio');

  // Supabase Auth session state
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      const config = getSupabaseConfig();
      if (!config.isConfigured) {
        setAuthReady(true);
        return () => { active = false; };
      }
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => {
        if (active) setSession(data?.session || null);
      }).catch(() => {}).finally(() => {
        if (active) setAuthReady(true);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setAuthReady(true);
      });

      return () => {
        active = false;
        subscription?.unsubscribe();
      };
    } catch {
      // Safe fallback for unconfigured / guest mode
      setAuthReady(true);
      return () => { active = false; };
    }
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSession(null);
    navigateTo('/');
  };

  // Dataset states
  const [fileName, setFileName] = useState('');
  const [rawData, setRawData] = useState([]);
  const [originalData, setOriginalData] = useState([]); // for cleaning revert
  const [columns, setColumns] = useState([]);
  const [summary, setSummary] = useState(null);

  // Active view tab: 'dashboard' | 'table' | 'cleaning'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dashboard tiles
  const [tiles, setTiles] = useState([]);
  const [editingTile, setEditingTile] = useState(null);

  // Global filters
  const [filters, setFilters] = useState({
    search: '',
    categoryFilters: {},
    dateRangeFilters: {}
  });

  // Modals & Panels
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef(null);

  // Conditions & Logic State
  const [activeRuleFilter, setActiveRuleFilter] = useState(null); // { id, rule, sentence }
  const [tableHighlightRule, setTableHighlightRule] = useState(null); // { id, rule }

  // Smart Schema Overrides State
  const [userRoleOverrides, setUserRoleOverrides] = useState({});

  const dashboardRef = useRef(null);

  // When a dataset is loaded (via upload or sample data preset)
  const handleDataLoaded = (parsedResult) => {
    const { rawData, columns, summary, fileName } = parsedResult;
    setFileName(fileName);
    setRawData(rawData);
    setOriginalData([...rawData]);
    setColumns(columns);
    setSummary(summary);
    setUserRoleOverrides({});

    // Build starter dashboard automatically
    const starterTiles = generateStarterDashboard(columns, rawData.length);
    setTiles(starterTiles);

    // Reset filters
    setFilters({
      search: '',
      categoryFilters: {},
      dateRangeFilters: {}
    });

    setActiveTab('dashboard');
  };

  // Re-profile summary when data is cleaned
  const handleApplyCleanedData = (cleanedRows, actionDesc = '', updatedColumns = null) => {
    setRawData(cleanedRows);
    const activeCols = updatedColumns || columns;
    if (updatedColumns) {
      setColumns(updatedColumns);
    }

    // Fast re-summary computation
    const colKeys = activeCols.map(c => c.name);
    let totalMissing = 0;
    const signatures = new Set();
    let dupCount = 0;

    const colProfiles = activeCols.map(col => {
      let nullCount = 0;
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      let count = 0;
      const uniqueSet = new Set();

      for (let i = 0; i < cleanedRows.length; i++) {
        const val = cleanedRows[i][col.name];
        if (val === null || val === undefined || val === '') {
          nullCount++;
          totalMissing++;
        } else {
          if (uniqueSet.size < 500) uniqueSet.add(val);
          if (col.type === 'number' && typeof val === 'number') {
            sum += val;
            count++;
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
      }

      return {
        ...col,
        nullCount,
        uniqueCount: uniqueSet.size,
        sum: count > 0 ? sum : null,
        avg: count > 0 ? sum / count : null,
        min: min !== Infinity ? min : null,
        max: max !== -Infinity ? max : null
      };
    });

    for (let i = 0; i < cleanedRows.length; i++) {
      const row = cleanedRows[i];
      let sig = '';
      for (const k of colKeys) {
        sig += (row[k] !== null && row[k] !== undefined ? String(row[k]) : '__NULL__') + '||';
      }
      if (signatures.has(sig)) {
        dupCount++;
      } else {
        signatures.add(sig);
      }
    }

    setColumns(colProfiles);
    setSummary({
      rowCount: cleanedRows.length,
      colCount: colProfiles.length,
      missingCount: totalMissing,
      duplicateCount: dupCount,
      memoryEstimate: `${Math.round(JSON.stringify(cleanedRows).length / 1024)} KB`
    });
  };

  // Reset to original dataset (undo all cleaning steps)
  const handleResetOriginal = () => {
    if (originalData.length > 0) {
      handleApplyCleanedData([...originalData], 'Reverted to initial uncleaned dataset.');
    }
  };

  // Completely reset file / upload new
  const handleResetFile = (promptConfirm = false) => {
    if (promptConfirm && fileName) {
      const confirmed = window.confirm(
        `Are you sure you want to unload "${fileName}" and return to the file upload screen? Any unsaved edits will be cleared.`
      );
      if (!confirmed) return;
    }
    setFileName('');
    setRawData([]);
    setOriginalData([]);
    setColumns([]);
    setSummary(null);
    setTiles([]);
    setEditingTile(null);
    setActiveRuleFilter(null);
    setTableHighlightRule(null);
    setUserRoleOverrides({});
    setActiveTab('dashboard');
  };

  // Tile management
  const handleSaveTileFromBuilder = (newTile) => {
    if (editingTile) {
      setTiles(tiles.map(t => t.id === newTile.id ? newTile : t));
    } else {
      setTiles([...tiles, newTile]);
    }
    setEditingTile(null);
    setIsBuilderOpen(false);
  };

  const handleEditTile = (tile) => {
    setEditingTile(tile);
    setIsBuilderOpen(true);
  };

  const handleDeleteTile = (tileId) => {
    setTiles(tiles.filter(t => t.id !== tileId));
  };

  const handleUpdateTileWidth = (tileId, newWidth) => {
    setTiles(tiles.map(t => t.id === tileId ? { ...t, width: newWidth } : t));
  };

  const handleMoveTile = (tileId, direction) => {
    const index = tiles.findIndex(t => t.id === tileId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tiles.length) return;

    const updated = [...tiles];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setTiles(updated);
  };

  // Add chart generated from AI or condition suggestions
  const handleAddTileFromAi = (chartConfig) => {
    const tile = {
      id: `tile-ai-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: chartConfig.title || 'AI Chart',
      type: chartConfig.type || 'bar',
      xAxis: chartConfig.xAxis || (columns[0]?.name || ''),
      yAxis: chartConfig.yAxis || (columns.find(c => c.type === 'number')?.name || ''),
      aggregation: chartConfig.aggregation || 'sum',
      width: 'half'
    };
    setTiles(prev => [tile, ...prev]);
    setActiveTab('dashboard');
  };

  // Smart Schema overrides updater
  const handleUpdateRoleOverride = (columnName, newRole) => {
    setUserRoleOverrides(prev => ({
      ...prev,
      [columnName]: newRole
    }));
  };

  // Filtered dataset computed from global filters and active condition rule
  const filteredData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    let dataset = applyGlobalFilters(rawData, filters);

    if (activeRuleFilter && activeRuleFilter.rule) {
      dataset = dataset.filter(row => evaluateNode(activeRuleFilter.rule, row));
    }

    return dataset;
  }, [rawData, filters, activeRuleFilter]);

  // Exports
  const handleExportPdf = () => {
    if (dashboardRef.current) {
      exportDashboardAsPdf(dashboardRef.current, fileName || 'Metrica_Dashboard');
    }
  };

  const handleExportPng = () => {
    if (dashboardRef.current) {
      exportDashboardAsPng(dashboardRef.current, fileName || 'Metrica_Dashboard');
    }
  };

  const handleExportCsv = () => {
    if (filteredData.length > 0) {
      exportCleanedDataAsCsv(filteredData, columns, fileName || 'Metrica_Export');
    }
  };

  // Calculated Column Handler
  const handleApplyCalculatedColumn = (newColName, newDataset, targetType = 'string') => {
    const existingCol = columns.find(c => c.name === newColName);
    let nextColumns = [...columns];
    if (!existingCol) {
      nextColumns.push({
        name: newColName,
        type: targetType,
        nullCount: 0,
        uniqueCount: 0,
        isCalculated: true
      });
    }
    // Re-profile with newly added column
    handleApplyCleanedData(newDataset, `Generated calculated column "${newColName}".`, nextColumns);
  };

  // Route: /privacy
  if (currentPath === '/privacy') {
    return (
      <PrivacyNoticePage
        onBack={() => navigateTo('/')}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />
    );
  }

  // Route: /profile
  if (currentPath === '/profile') {
    if (!authReady) {
      return (
        <main className="min-h-screen grid place-items-center text-glass-secondary" aria-live="polite">
          Loading your account…
        </main>
      );
    }
    if (!session?.user) {
      return (
        <SignInPage
          onBack={() => navigateTo('/')}
          onAuthenticated={openStudio}
          onContinueAsGuest={openStudio}
          onNavigatePrivacy={() => navigateTo('/privacy')}
        />
      );
    }
    return (
      <ProfilePage
        session={session}
        onBack={() => navigateTo('/studio')}
        onDeleted={() => {
          setSession(null);
          navigateTo('/');
        }}
      />
    );
  }

  // Route: /login
  if (currentPath === '/login') {
    return (
      <SignInPage
        onBack={() => navigateTo('/')}
        onAuthenticated={openStudio}
        onContinueAsGuest={openStudio}
        onNavigatePrivacy={() => navigateTo('/privacy')}
      />
    );
  }

  // Route: / (Home Page)
  if (currentPath === '/') {
    return (
      <HomePage
        onSignIn={() => navigateTo('/login')}
        onContinueAsGuest={openStudio}
        onNavigatePrivacy={() => navigateTo('/privacy')}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />
    );
  }

  // Route: /studio (and active Studio fallback)
  return (
    <div className="min-h-screen flex flex-col relative transition-colors selection:bg-metrica-500 selection:text-white text-glass-primary">
      {/* Pure CSS Ambient Glass Backdrop */}
      <div className="glass-backdrop" aria-hidden="true">
        <div className="glass-backdrop-blob-1" />
        <div className="glass-backdrop-blob-2" />
        <div className="glass-backdrop-blob-3" />
      </div>

      {/* Floating Left Sidebar Navigation */}
      <Sidebar
        activeTab={!fileName ? 'upload' : activeTab}
        onTabChange={(tab) => {
          if (tab === 'upload') {
            handleResetFile(true);
          } else {
            setActiveTab(tab);
          }
        }}
        isAiOpen={isAiOpen}
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNavigatePrivacy={() => navigateTo('/privacy')}
        onNavigateHome={() => navigateTo('/')}
        fileName={fileName}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        triggerRef={drawerTriggerRef}
      />

      {/* Top Bar Header */}
      <TopBar
        activeTab={!fileName ? 'upload' : activeTab}
        fileName={fileName}
        searchQuery={filters.search}
        onSearchChange={(val) => setFilters(prev => ({ ...prev, search: val }))}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onOpenBuilder={() => {
          setEditingTile(null);
          setIsBuilderOpen(true);
        }}
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
        isAiOpen={isAiOpen}
        onExportPdf={handleExportPdf}
        onExportPng={handleExportPng}
        onExportCsv={handleExportCsv}
        onResetFile={() => handleResetFile(true)}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        triggerRef={drawerTriggerRef}
        onNavigateHome={() => navigateTo('/')}
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateProfile={() => navigateTo('/profile')}
        session={session}
        onSignOut={handleSignOut}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full mx-auto pb-8 relative z-10 max-w-[1700px] px-4 sm:pl-24 lg:pl-68 sm:pr-6">
        {!fileName ? (
          /* Empty / Upload View */
          <UploadDropzone onDataLoaded={handleDataLoaded} />
        ) : (
          /* Active Dataset Studio */
          <div className="space-y-6">
            {/* Top Data Summary Banner */}
            <DataSummaryBar
              summary={summary}
              filteredCount={filteredData.length}
              onNavigateToCleaning={() => setActiveTab('cleaning')}
              onNavigateToTable={() => setActiveTab('table')}
              onNavigateToQuality={() => setActiveTab('quality')}
              onNavigateToSchema={() => setActiveTab('schema')}
            />

            {/* TAB 1: DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Global Filters & Slicers */}
                <GlobalFilters
                  columns={columns}
                  data={rawData}
                  filters={filters}
                  onFiltersChange={setFilters}
                />

                {/* Dashboard Canvas */}
                <div ref={dashboardRef} className="p-1">
                  <DashboardGrid
                    tiles={tiles}
                    data={filteredData}
                    onUpdateWidth={handleUpdateTileWidth}
                    onMoveTile={handleMoveTile}
                    onDeleteTile={handleDeleteTile}
                    onEditTile={handleEditTile}
                    onOpenBuilder={() => {
                      setEditingTile(null);
                      setIsBuilderOpen(true);
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB: BUSINESS INSIGHTS */}
            {activeTab === 'insights' && (
              <BusinessInsightsView
                data={filteredData}
                columns={columns}
                onAddTileToDashboard={handleAddTileFromAi}
                onAskAiPrompt={() => setIsAiOpen(true)}
              />
            )}

            {/* TAB: DATA QUALITY REPORT */}
            {activeTab === 'quality' && (
              <DataQualityReport
                data={rawData}
                columns={columns}
                onApplyCleanedData={handleApplyCleanedData}
                onNavigateToCleaning={() => setActiveTab('cleaning')}
              />
            )}

            {/* TAB: SMART SCHEMA & DATASET SUMMARY */}
            {activeTab === 'schema' && (
              <DatasetSummaryView
                data={rawData}
                columns={columns}
                userOverrides={userRoleOverrides}
                onUpdateRoleOverride={handleUpdateRoleOverride}
              />
            )}

            {/* TAB 2: DATA TABLE VIEW */}
            {activeTab === 'table' && (
              <DataTable
                data={filteredData}
                columns={columns}
                highlightRule={tableHighlightRule}
              />
            )}

            {/* TAB 3: CLEANING STUDIO VIEW */}
            {activeTab === 'cleaning' && (
              <CleaningPanel
                data={rawData}
                columns={columns}
                summary={summary}
                originalData={originalData}
                onApplyCleanedData={handleApplyCleanedData}
                onResetOriginal={handleResetOriginal}
              />
            )}

            {/* TAB 4: CONDITIONS & LOGIC VIEW */}
            {activeTab === 'conditions' && (
              <ConditionsPanel
                columns={columns}
                data={rawData}
                activeRuleFilter={activeRuleFilter}
                onSetActiveRuleFilter={setActiveRuleFilter}
                tableHighlightRule={tableHighlightRule}
                onSetTableHighlightRule={setTableHighlightRule}
                onAddTileToDashboard={handleAddTileFromAi}
                onApplyCalculatedColumn={handleApplyCalculatedColumn}
                onAiRulePrompt={() => setIsAiOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Site Footer with Privacy Notice Link */}
      <Footer
        onNavigatePrivacy={() => navigateTo('/privacy')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Chart Builder Modal */}
      {isBuilderOpen && (
        <ChartBuilder
          isOpen={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingTile(null);
          }}
          onSaveTile={handleSaveTileFromBuilder}
          columns={columns}
          data={filteredData}
          initialTile={editingTile}
        />
      )}

      {/* Settings Modal (Gemini Model & Backend Proxy Status) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Ask AI Side Drawer Panel */}
      <AskAIPanel
        isOpen={isAiOpen && Boolean(fileName)}
        onClose={() => setIsAiOpen(false)}
        data={rawData}
        columns={columns}
        summary={summary}
        onAddTileToDashboard={handleAddTileFromAi}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onApplyAiRule={(aiRule) => {
          const validation = validateRuleSchema(aiRule);
          if (!validation.valid) {
            console.warn('[Security] Rejected invalid AI rule schema:', validation.error);
            return;
          }
          const validRule = validation.sanitizedRule;
          setActiveRuleFilter({
            id: validRule.id || `rule-${Date.now()}`,
            rule: validRule,
            sentence: formatRuleAsSentence(validRule)
          });
          setActiveTab('conditions');
          setIsAiOpen(false);
        }}
      />
    </div>
  );
}

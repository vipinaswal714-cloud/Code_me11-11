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
import Footer from './components/Footer';
import { generateStarterDashboard } from './utils/autoDashboard';
import { applyGlobalFilters } from './utils/analyticsEngine';
import { evaluateNode, validateRuleSchema, formatRuleAsSentence } from './utils/ruleEvaluator';
import { exportDashboardAsPdf, exportDashboardAsPng, exportCleanedDataAsCsv } from './utils/exportUtils';
import { purgeObsoleteProviderSettings } from './utils/aiClient';

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

  // Lightweight SPA Routing State (supports direct /privacy visits & page reloads)
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
      totalRows: cleanedRows.length,
      totalCols: colKeys.length,
      missingValues: totalMissing,
      duplicateCount: dupCount,
      columnProfiles: colProfiles
    });
  };

  const handleResetOriginal = () => {
    if (originalData.length === 0) return;
    handleApplyCleanedData(originalData, 'Reverted to original data.');
  };

  // Filtered dataset for dashboard & charts
  const filteredData = useMemo(() => {
    const baseFiltered = applyGlobalFilters(rawData, filters, columns);
    if (activeRuleFilter?.rule) {
      return baseFiltered.filter(row => evaluateNode(activeRuleFilter.rule, row));
    }
    return baseFiltered;
  }, [rawData, filters, columns, activeRuleFilter]);

  // Tile Management
  const handleUpdateTileWidth = (tileId, newWidth) => {
    setTiles(prev =>
      prev.map(t => (t.id === tileId ? { ...t, w: newWidth } : t))
    );
  };

  const handleMoveTile = (tileId, direction) => {
    setTiles(prev => {
      const idx = prev.findIndex(t => t.id === tileId);
      if (idx === -1) return prev;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(idx, 1);
      updated.splice(targetIdx, 0, moved);
      return updated;
    });
  };

  const handleDeleteTile = (tileId) => {
    setTiles(prev => prev.filter(t => t.id !== tileId));
  };

  const handleEditTile = (tile) => {
    setEditingTile(tile);
    setIsBuilderOpen(true);
  };

  const handleSaveTileFromBuilder = (newOrUpdatedTile) => {
    setTiles(prev => {
      const exists = prev.some(t => t.id === newOrUpdatedTile.id);
      if (exists) {
        return prev.map(t => (t.id === newOrUpdatedTile.id ? newOrUpdatedTile : t));
      }
      return [...prev, newOrUpdatedTile];
    });
    setEditingTile(null);
  };

  const handleAddTileFromAi = (aiTile) => {
    setTiles(prev => [...prev, aiTile]);
  };

  // Exports
  const handleExportPdf = () => {
    if (!dashboardRef.current) return;
    exportDashboardAsPdf(dashboardRef.current, `Metrica Analytics Report - ${fileName}`);
  };

  const handleExportPng = () => {
    if (!dashboardRef.current) return;
    exportDashboardAsPng(dashboardRef.current, fileName.replace(/\.[^/.]+$/, ''));
  };

  const handleExportCsv = () => {
    exportCleanedDataAsCsv(rawData, fileName.replace(/\.[^/.]+$/, ''));
  };

  const handleResetFile = (prompt = true) => {
    const shouldPrompt = typeof prompt === 'boolean' ? prompt : true;
    if (shouldPrompt && (fileName || rawData.length > 0)) {
      const confirmed = window.confirm('Are you sure you want to unload the current dataset? Any unsaved edits will be lost.');
      if (!confirmed) return false;
    }
    setFileName('');
    setRawData([]);
    setOriginalData([]);
    setColumns([]);
    setSummary(null);
    setTiles([]);
    setActiveRuleFilter(null);
    setTableHighlightRule(null);
    setUserRoleOverrides({});
    return true;
  };

  const handleUpdateRoleOverride = (colName, newRole) => {
    setUserRoleOverrides(prev => ({
      ...prev,
      [colName]: newRole
    }));
  };

  // Handler for adding calculated column from Conditions Panel
  const handleApplyCalculatedColumn = (newDataset, newColName) => {
    let nextColumns = columns;
    if (!columns.some(c => c.name === newColName)) {
      const sampleVal = newDataset[0]?.[newColName];
      const colType = typeof sampleVal === 'number' ? 'number' : 'category';
      nextColumns = [...columns, { name: newColName, type: colType }];
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

  if (currentPath === '/login') {
    return (
      <SignInPage
        onBack={() => navigateTo('/')}
        onAuthenticated={openStudio}
        onContinueAsGuest={openStudio}
      />
    );
  }

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

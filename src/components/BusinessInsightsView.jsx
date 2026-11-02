import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Plus,
  PieChart,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Bot
} from 'lucide-react';
import {
  calculatePeriodOverPeriod,
  calculateContributionAnalysis,
  detectTrendsAndMomentum,
  calculateRiskIndicators,
  recommendBusinessKpis,
  generateDeterministicInsights
} from '../utils/businessInsights';

export default function BusinessInsightsView({
  data,
  columns,
  onAddTileToDashboard,
  onAskAiPrompt
}) {
  const [dateGrain, setDateGrain] = useState('month'); // 'month' | 'quarter' | 'year'
  const [selectedMeasure, setSelectedMeasure] = useState(() => {
    const num = columns.find(c => c.type === 'number');
    return num?.name || '';
  });
  const [selectedDimension, setSelectedDimension] = useState(() => {
    const cat = columns.find(c => c.type === 'category');
    return cat?.name || '';
  });
  const [selectedDateCol, setSelectedDateCol] = useState(() => {
    const d = columns.find(c => c.type === 'date');
    return d?.name || '';
  });
  const [notification, setNotification] = useState(null);

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const numCols = useMemo(() => columns.filter(c => c.type === 'number'), [columns]);
  const catCols = useMemo(() => columns.filter(c => c.type === 'category'), [columns]);
  const dateCols = useMemo(() => columns.filter(c => c.type === 'date'), [columns]);

  // Period over Period
  const popData = useMemo(() => {
    if (!selectedDateCol || !selectedMeasure) return { periods: [], overallGrowth: null };
    return calculatePeriodOverPeriod(data, selectedDateCol, selectedMeasure, dateGrain);
  }, [data, selectedDateCol, selectedMeasure, dateGrain]);

  // Trend & Momentum
  const trendData = useMemo(() => {
    if (!selectedDateCol || !selectedMeasure) return { direction: 'stable', slope: 0, rSquared: 0 };
    return detectTrendsAndMomentum(data, selectedDateCol, selectedMeasure);
  }, [data, selectedDateCol, selectedMeasure]);

  // Contribution Analysis
  const contributionData = useMemo(() => {
    if (!selectedDimension || !selectedMeasure) return { breakdown: [], topPerformer: null, bottomPerformer: null, total: 0 };
    return calculateContributionAnalysis(data, selectedDimension, selectedMeasure);
  }, [data, selectedDimension, selectedMeasure]);

  // Risk Indicators
  const risks = useMemo(() => calculateRiskIndicators(data, columns), [data, columns]);

  // Suggested KPIs
  const suggestedKpis = useMemo(() => recommendBusinessKpis(columns), [columns]);

  // Full Deterministic Insights
  const deterministicInsights = useMemo(() => generateDeterministicInsights(data, columns), [data, columns]);

  // Handler for adding a suggested KPI to the live dashboard
  const handleAddKpiTile = (kpi) => {
    if (!onAddTileToDashboard) return;
    const tile = {
      id: `kpi-${kpi.measure}-${Date.now()}`,
      title: kpi.label,
      type: 'kpi',
      xCol: kpi.measure,
      yCol: kpi.measure,
      agg: kpi.aggregation,
      w: 3
    };
    onAddTileToDashboard(tile);
    notify(`Added "${kpi.label}" KPI card to Dashboard!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-xl text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner: Deterministic Executive Brief */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 text-white custom-card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-metrica-500/20 text-metrica-400 border border-metrica-500/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Automated Business Intelligence</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% Code Computed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Period-over-Period growth, OLS regression momentum, Pareto contribution drivers, and risk radar.
              </p>
            </div>
          </div>

          {onAskAiPrompt && (
            <button
              onClick={() => onAskAiPrompt("Explain the period-over-period growth, top revenue drivers, and risk factors in this dataset.")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-metrica-600 hover:bg-metrica-500 text-white transition-all shadow-md shadow-metrica-600/30 shrink-0"
            >
              <Bot className="w-4 h-4 text-cyan-300" />
              <span>Ask AI Narrative</span>
            </button>
          )}
        </div>

        {/* Executive Highlights */}
        {deterministicInsights.highlights.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-3">
            {deterministicInsights.highlights.slice(0, 4).map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <CheckCircle2 className="w-4 h-4 text-metrica-400 shrink-0 mt-0.5" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {dateCols.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Date:</span>
              <select
                value={selectedDateCol}
                onChange={e => setSelectedDateCol(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium"
              >
                {dateCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          {numCols.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Measure:</span>
              <select
                value={selectedMeasure}
                onChange={e => setSelectedMeasure(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium"
              >
                {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          {catCols.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Dimension:</span>
              <select
                value={selectedDimension}
                onChange={e => setSelectedDimension(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium"
              >
                {catCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {dateCols.length > 0 && (
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setDateGrain('month')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                dateGrain === 'month' ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              MoM (Monthly)
            </button>
            <button
              onClick={() => setDateGrain('quarter')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                dateGrain === 'quarter' ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              QoQ (Quarterly)
            </button>
            <button
              onClick={() => setDateGrain('year')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                dateGrain === 'year' ? 'bg-white dark:bg-slate-900 text-metrica-600 dark:text-metrica-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              YoY (Annual)
            </button>
          </div>
        )}
      </div>

      {/* Grid: Growth & Trend + Contribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Period-over-Period & Trend Momentum */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Period-over-Period Growth</h3>
                  <p className="text-xs text-slate-400">Chronological trajectory of {selectedMeasure}</p>
                </div>
              </div>

              {trendData.direction && (
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border ${
                  trendData.direction === 'upward'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : trendData.direction === 'downward'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {trendData.direction === 'upward' ? <ArrowUpRight className="w-3.5 h-3.5" /> : trendData.direction === 'downward' ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                  <span>{trendData.direction}</span>
                </div>
              )}
            </div>

            {popData.periods.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Select a valid Date column and Numeric Measure above to see period-over-period growth.
              </p>
            ) : (
              <div className="space-y-2 mt-4 max-h-[280px] overflow-y-auto pr-1">
                {popData.periods.slice(-6).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{p.period}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-slate-900 dark:text-white font-bold">${p.total.toLocaleString()}</span>
                      {p.growthRatePercent !== null ? (
                        <span className={`font-bold flex items-center gap-0.5 ${p.growthRatePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {p.growthRatePercent >= 0 ? '+' : ''}{p.growthRatePercent}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Baseline</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {trendData.rSquared > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>OLS Linear Slope: <strong className="text-slate-800 dark:text-slate-200">{trendData.slope > 0 ? '+' : ''}{trendData.slope}/period</strong></span>
              <span>Regression Fit (R²): <strong className="text-slate-800 dark:text-slate-200">{trendData.rSquared}</strong></span>
            </div>
          )}
        </div>

        {/* Card 2: Contribution Pareto Drivers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pareto Contribution Breakdown</h3>
                  <p className="text-xs text-slate-400">{selectedDimension} distribution on {selectedMeasure}</p>
                </div>
              </div>

              {contributionData.topPerformer && (
                <div className="text-right text-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Top Contributor</span>
                  <strong className="text-metrica-600 dark:text-metrica-400 font-bold">{contributionData.topPerformer.name} ({contributionData.topPerformer.percentage}%)</strong>
                </div>
              )}
            </div>

            {contributionData.breakdown.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Select a valid Dimension and Measure above to see contribution analysis.
              </p>
            ) : (
              <div className="space-y-3 mt-4 max-h-[280px] overflow-y-auto pr-1">
                {contributionData.breakdown.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">{item.name}</span>
                      <span className="text-slate-500">${item.sum.toLocaleString()} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-metrica-500 to-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Total Evaluated: <strong className="text-slate-800 dark:text-slate-200">${contributionData.total.toLocaleString()}</strong></span>
            <span>Contributors: <strong className="text-slate-800 dark:text-slate-200">{contributionData.breakdown.length} unique</strong></span>
          </div>
        </div>
      </div>

      {/* Suggested KPI Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recommended KPI Metrics</h3>
            <p className="text-xs text-slate-400">Tailored cards matching detected dataset measures. Click to pin to your active dashboard.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {suggestedKpis.map((kpi, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-metrica-400 dark:hover:border-metrica-600 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {kpi.aggregation.toUpperCase()} • {kpi.measure}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {kpi.label}
                </h4>
              </div>

              <button
                onClick={() => handleAddKpiTile(kpi)}
                className="mt-4 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-metrica-500 text-slate-700 dark:text-slate-300 hover:text-metrica-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Dashboard</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Indicator Radar */}
      {risks.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 custom-card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Risk Radar Alerts</h3>
              <p className="text-xs text-slate-400">Concentration risks and sharp period contractions detected automatically</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {risks.map((risk, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {risk.title}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                    {risk.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

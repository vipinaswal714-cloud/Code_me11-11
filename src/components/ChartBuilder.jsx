import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  Layers,
  BarChart,
  Hash,
  X,
  Check,
  Palette
} from 'lucide-react';
import { aggregateData, buildHistogramData, buildScatterData, calculateKPI } from '../utils/analyticsEngine';
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart', icon: BarChart2 },
  { id: 'horizontalBar', label: 'Horiz. Bar', icon: BarChart },
  { id: 'line', label: 'Line Chart', icon: TrendingUp },
  { id: 'area', label: 'Area Chart', icon: Activity },
  { id: 'donut', label: 'Donut Chart', icon: PieIcon },
  { id: 'pie', label: 'Pie Chart', icon: PieIcon },
  { id: 'scatter', label: 'Scatter Plot', icon: Activity },
  { id: 'histogram', label: 'Histogram', icon: Layers },
  { id: 'kpi', label: 'KPI Card', icon: Hash }
];

const AGGREGATIONS = [
  { id: 'sum', label: 'Sum' },
  { id: 'avg', label: 'Average' },
  { id: 'count', label: 'Count' },
  { id: 'min', label: 'Min' },
  { id: 'max', label: 'Max' }
];

const COLORS = [
  '#026fc7', // Metrica Blue
  '#0891b2', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b'  // Slate
];

const PIE_COLORS = ['#026fc7', '#0891b2', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1', '#64748b'];

export default function ChartBuilder({ isOpen, onClose, onSaveTile, columns, data, initialTile = null }) {
  const numCols = useMemo(() => columns.filter(c => c.type === 'number'), [columns]);
  const catAndDateCols = useMemo(() => columns.filter(c => c.type === 'category' || c.type === 'date'), [columns]);

  const [type, setType] = useState(initialTile?.type || 'bar');
  const [title, setTitle] = useState(initialTile?.title || '');
  const [xField, setXField] = useState(initialTile?.xField || (catAndDateCols[0]?.name || columns[0]?.name || ''));
  const [yField, setYField] = useState(initialTile?.yField || (numCols[0]?.name || columns[0]?.name || ''));
  const [aggregation, setAggregation] = useState(initialTile?.aggregation || 'sum');
  const [width, setWidth] = useState(initialTile?.w || (initialTile?.type === 'kpi' ? 1 : 2));
  const [color, setColor] = useState(initialTile?.color || '#026fc7');

  // Preview computation - called unconditionally before any early return
  const previewData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (type === 'kpi') {
      return calculateKPI(data, yField, aggregation);
    }
    if (type === 'histogram') {
      return buildHistogramData(data, xField, 10);
    }
    if (type === 'scatter') {
      return buildScatterData(data, xField, yField, 400);
    }
    return aggregateData(data, xField, yField, aggregation, 10);
  }, [data, type, xField, yField, aggregation]);

  if (!isOpen) return null;

  // Auto-generate title if user hasn't typed a custom one
  const handleTypeChange = (newType) => {
    setType(newType);
    if (!title || title.startsWith('Total') || title.includes('by') || title.includes('Trend')) {
      if (newType === 'kpi') {
        setTitle(`${aggregation.toUpperCase()} of ${yField}`);
        setWidth(1);
      } else if (newType === 'line' || newType === 'area') {
        setTitle(`${yField} Trend by ${xField}`);
        setWidth(2);
      } else if (newType === 'histogram') {
        setTitle(`Distribution of ${xField}`);
        setWidth(2);
      } else if (newType === 'scatter') {
        setTitle(`${yField} vs ${xField}`);
        setWidth(2);
      } else {
        setTitle(`${yField} by ${xField}`);
        setWidth(2);
      }
    }
  };

  const handleSave = () => {
    const finalTitle = title.trim() || (type === 'kpi' ? `${aggregation.toUpperCase()} ${yField}` : `${yField} by ${xField}`);
    const tileConfig = {
      id: initialTile?.id || `tile-custom-${Date.now()}`,
      type,
      title: finalTitle,
      xField,
      yField: type === 'histogram' ? xField : yField,
      aggregation,
      w: width,
      color,
      isCustom: true
    };
    onSaveTile(tileConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-4xl shadow-glass-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-white/40 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-metrica-500/10 text-metrica-600 dark:text-metrica-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-glass-primary text-base">
                {initialTile ? 'Edit Chart Tile' : 'Create Custom Chart Tile'}
              </h3>
              <p className="text-xs text-glass-muted font-medium">Configure dimensions, aggregations, and layout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chart builder"
            className="p-1.5 rounded-lg text-glass-muted hover:text-glass-primary hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split: Left Configurator / Right Live Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-glass-border">
          {/* Controls (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-5">
            {/* Chart Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-glass-secondary mb-2">
                Chart Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CHART_TYPES.map(ct => {
                  const Icon = ct.icon;
                  const isSelected = type === ct.id;
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => handleTypeChange(ct.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-metrica-500/20 border-metrica-500 text-metrica-600 dark:text-metrica-400 shadow-sm'
                          : 'border-glass-border hover:bg-white/50 dark:hover:bg-white/5 text-glass-secondary hover:text-glass-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{ct.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-glass-secondary mb-1.5">
                Tile Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sales by Product Category"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-glass-border bg-white/60 dark:bg-white/5 text-glass-primary placeholder-glass-muted focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
              />
            </div>

            {/* Dimension & Metric Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* X Axis / Group By */}
              {type !== 'kpi' && (
                <div>
                  <label className="block text-xs font-semibold text-glass-secondary mb-1.5">
                    {type === 'histogram' ? 'Numeric Variable' : 'X-Axis / Category'}
                  </label>
                  <select
                    value={xField}
                    onChange={(e) => setXField(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-glass-border bg-white/60 dark:bg-white/5 text-glass-primary focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
                  >
                    {columns.map(col => (
                      <option key={col.name} value={col.name} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {col.name} ({col.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Y Axis / Measure */}
              {type !== 'histogram' && (
                <div>
                  <label className="block text-xs font-semibold text-glass-secondary mb-1.5">
                    {type === 'kpi' ? 'Target Metric' : 'Y-Axis / Measure'}
                  </label>
                  <select
                    value={yField}
                    onChange={(e) => setYField(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-glass-border bg-white/60 dark:bg-white/5 text-glass-primary focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
                  >
                    {columns.map(col => (
                      <option key={col.name} value={col.name} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {col.name} ({col.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Aggregation */}
              {type !== 'scatter' && type !== 'histogram' && (
                <div>
                  <label className="block text-xs font-semibold text-glass-secondary mb-1.5">
                    Aggregation
                  </label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-glass-border bg-white/60 dark:bg-white/5 text-glass-primary focus:outline-none focus:ring-2 focus:ring-metrica-500/40"
                  >
                    {AGGREGATIONS.map(agg => (
                      <option key={agg.id} value={agg.id} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {agg.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Width / Grid Columns */}
              <div>
                <label className="block text-xs font-semibold text-glass-secondary mb-1.5">
                  Width (Columns)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWidth(w)}
                      className={`py-1.5 text-xs font-bold rounded-xl border text-center transition-all ${
                        width === w
                          ? 'bg-metrica-600 text-white border-metrica-600 shadow-sm'
                          : 'border-glass-border text-glass-secondary hover:bg-white/40 dark:hover:bg-white/5'
                      }`}
                    >
                      {w === 1 ? '1/4' : w === 2 ? '1/2' : w === 3 ? '3/4' : 'Full'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Accent Color Palette */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-glass-secondary mb-2">
                <Palette className="w-3.5 h-3.5" />
                Accent Color
              </label>
              <div className="flex items-center gap-2.5">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                      color === c ? 'ring-2 ring-offset-2 ring-metrica-600 dark:ring-offset-slate-900 scale-105 shadow-sm' : 'opacity-85'
                    }`}
                  >
                    {color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Live Preview (5 cols) */}
          <div className="lg:col-span-5 p-6 flex flex-col bg-white/20 dark:bg-black/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-glass-muted mb-3">
              Live Chart Preview
            </h4>
            <div className="flex-1 min-h-[260px] glass-opaque rounded-2xl p-4 flex flex-col justify-center items-center shadow-glass">
              {type === 'kpi' ? (
                <div className="text-center p-6">
                  <span className="text-xs font-bold text-glass-muted uppercase tracking-wider">
                    {title || `${aggregation.toUpperCase()} ${yField}`}
                  </span>
                  <div className="text-4xl font-extrabold mt-2 text-glass-primary">
                    {typeof previewData === 'number'
                      ? previewData.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : '0'}
                  </div>
                  <span className="text-xs text-glass-muted font-medium mt-2 block">
                    {aggregation.toUpperCase()} calculation over {data.length.toLocaleString()} records
                  </span>
                </div>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                      <RechartsBarChart data={previewData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    ) : type === 'horizontalBar' ? (
                      <RechartsBarChart layout="vertical" data={previewData} margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
                      </RechartsBarChart>
                    ) : type === 'line' ? (
                      <LineChart data={previewData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    ) : type === 'area' ? (
                      <AreaChart data={previewData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
                      </AreaChart>
                    ) : type === 'pie' || type === 'donut' ? (
                      <PieChart>
                        <Pie
                          data={previewData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={type === 'donut' ? 45 : 0}
                          outerRadius={75}
                          paddingAngle={type === 'donut' ? 2 : 0}
                        >
                          {previewData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : type === 'histogram' ? (
                      <RechartsBarChart data={previewData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    ) : (
                      <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis type="number" dataKey="x" name={xField} tick={{ fontSize: 10 }} />
                        <YAxis type="number" dataKey="y" name={yField} tick={{ fontSize: 10 }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Points" data={previewData} fill={color} />
                      </ScatterChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-glass-border bg-white/40 dark:bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold glass-button text-glass-secondary hover:text-glass-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-metrica-600 hover:bg-metrica-700 text-white shadow-sm transition-all"
          >
            <Check className="w-4 h-4" />
            {initialTile ? 'Update Tile' : 'Add to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

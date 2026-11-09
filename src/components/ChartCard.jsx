import React, { useState, useMemo, useRef } from 'react';
import {
  MoreVertical,
  Maximize2,
  Minimize2,
  Trash2,
  Edit2,
  Download,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Hash,
  Activity,
  Layers,
  ChevronDown
} from 'lucide-react';
import {
  BarChart,
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
  ResponsiveContainer,
  Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import { aggregateData, buildHistogramData, buildScatterData, calculateKPI } from '../utils/analyticsEngine';
import { evaluateNode } from '../utils/ruleEvaluator';

const PIE_COLORS = ['#026fc7', '#0891b2', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1', '#64748b'];

export default function ChartCard({
  tile,
  data,
  onUpdateWidth,
  onMove,
  onDelete,
  onEdit,
  isFirst,
  isLast
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const cardRef = useRef(null);

  const { id, type, title, xField, yField, aggregation, w = 2, color = '#026fc7', kpiSubtitle } = tile;

  // Process data for this tile
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Rule-driven KPI support
    if (tile.ruleDriven && tile.conditionRule) {
      let matchCount = 0;
      for (let i = 0; i < data.length; i++) {
        if (evaluateNode(tile.conditionRule, data[i])) matchCount++;
      }
      return matchCount;
    }

    if (type === 'kpi') {
      return calculateKPI(data, yField, aggregation);
    }
    if (type === 'histogram') {
      return buildHistogramData(data, xField, 12);
    }
    if (type === 'scatter') {
      return buildScatterData(data, xField, yField, 1200);
    }
    return aggregateData(data, xField, yField, aggregation, 14);
  }, [data, type, xField, yField, aggregation, tile.ruleDriven, tile.conditionRule]);

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `Metrica_${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Failed to download chart:', e);
    }
  };

  // Determine grid column span
  const colSpanClass = {
    1: 'col-span-12 sm:col-span-6 lg:col-span-3',
    2: 'col-span-12 lg:col-span-6',
    3: 'col-span-12 lg:col-span-9',
    4: 'col-span-12'
  }[w] || 'col-span-12 lg:col-span-6';

  const formatNumber = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0';
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(2) + 'k';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`group glass-card p-5 flex flex-col justify-between transition-all relative ${colSpanClass} ${
          isMaximized ? 'fixed inset-4 z-50 col-span-12 h-auto shadow-glass-lg' : ''
        }`}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
              <h4 className="font-bold text-sm text-glass-primary truncate max-w-[220px] sm:max-w-xs" title={title}>
                {title}
              </h4>
            </div>
            {type !== 'kpi' && (
              <p className="text-[11px] text-glass-muted font-medium mt-0.5">
                {aggregation ? `${aggregation.toUpperCase()}(${yField || xField}) by ${xField}` : `${xField}`}
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Reorder Buttons */}
            <button
              onClick={() => onMove(id, -1)}
              disabled={isFirst}
              title="Move Left"
              className="p-1 rounded-lg text-glass-muted hover:text-glass-primary hover:bg-white/40 dark:hover:bg-white/10 disabled:opacity-20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMove(id, 1)}
              disabled={isLast}
              title="Move Right"
              className="p-1 rounded-lg text-glass-muted hover:text-glass-primary hover:bg-white/40 dark:hover:bg-white/10 disabled:opacity-20 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Width selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                title="Tile actions & width"
                className="p-1 rounded-lg text-glass-muted hover:text-glass-primary hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  onMouseLeave={() => setShowMenu(false)}
                  className="absolute right-0 top-full mt-1 w-44 glass-opaque shadow-glass-lg z-30 p-1.5 text-xs text-glass-secondary animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-glass-muted">
                    Resize Tile
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white/40 dark:bg-white/5 rounded-lg mb-1.5">
                    {[1, 2, 3, 4].map(size => (
                      <button
                        key={size}
                        onClick={() => {
                          onUpdateWidth(id, size);
                          setShowMenu(false);
                        }}
                        className={`py-1 rounded text-center font-bold text-[10px] ${
                          w === size
                            ? 'bg-metrica-600 text-white shadow-sm'
                            : 'hover:bg-white/60 dark:hover:bg-white/10 text-glass-secondary'
                        }`}
                      >
                        {size}/4
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      onEdit(tile);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-left text-glass-secondary hover:text-glass-primary"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-metrica-500" />
                    Edit Tile
                  </button>

                  <button
                    onClick={() => {
                      handleDownloadPng();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-left text-glass-secondary hover:text-glass-primary"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    Export PNG
                  </button>

                  <button
                    onClick={() => {
                      setIsMaximized(!isMaximized);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 text-left text-glass-secondary hover:text-glass-primary"
                  >
                    {isMaximized ? <Minimize2 className="w-3.5 h-3.5 text-amber-500" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-500" />}
                    {isMaximized ? 'Minimize' : 'Maximize'}
                  </button>

                  <div className="my-1 border-t border-glass-border" />

                  <button
                    onClick={() => {
                      onDelete(id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 text-left font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Tile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex-1 w-full min-h-[190px] flex items-center justify-center">
          {type === 'kpi' ? (
            <div className="w-full py-4 text-center sm:text-left flex flex-col justify-center">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-glass-primary">
                  {formatNumber(chartData)}
                </span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              </div>
              <p className="text-xs text-glass-muted mt-1 font-semibold">
                {kpiSubtitle || `${aggregation.toUpperCase()} of ${yField || 'records'}`}
              </p>
            </div>
          ) : (
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                {type === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
                    <Tooltip
                      formatter={(val) => [formatNumber(val), yField || 'Value']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : type === 'horizontalBar' ? (
                  <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 20, left: 35, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip
                      formatter={(val) => [formatNumber(val), yField || 'Value']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
                  </BarChart>
                ) : type === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
                    <Tooltip
                      formatter={(val) => [formatNumber(val), yField || 'Value']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
                  </LineChart>
                ) : type === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
                    <Tooltip
                      formatter={(val) => [formatNumber(val), yField || 'Value']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2} />
                  </AreaChart>
                ) : type === 'pie' || type === 'donut' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={type === 'donut' ? 45 : 0}
                      outerRadius={75}
                      paddingAngle={type === 'donut' ? 2 : 0}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [formatNumber(val), yField || 'Share']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                ) : type === 'histogram' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val) => [val, 'Count']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis type="number" dataKey="x" name={xField} tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
                    <YAxis type="number" dataKey="y" name={yField} tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Scatter name="Data" data={chartData} fill={color} />
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Maximized Overlay Backdrop */}
      {isMaximized && (
        <div
          onClick={() => setIsMaximized(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
        />
      )}
    </>
  );
}

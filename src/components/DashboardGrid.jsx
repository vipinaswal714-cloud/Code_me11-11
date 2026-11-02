import React from 'react';
import ChartCard from './ChartCard';
import { Plus } from 'lucide-react';

export default function DashboardGrid({
  tiles,
  data,
  onUpdateWidth,
  onMoveTile,
  onDeleteTile,
  onEditTile,
  onOpenBuilder
}) {
  const kpiTiles = tiles.filter(t => t.type === 'kpi');
  const chartTiles = tiles.filter(t => t.type !== 'kpi');

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards Row */}
      {kpiTiles.length > 0 && (
        <div className="grid grid-cols-12 gap-4">
          {kpiTiles.map((tile, idx) => (
            <ChartCard
              key={tile.id}
              tile={tile}
              data={data}
              onUpdateWidth={onUpdateWidth}
              onMove={onMoveTile}
              onDelete={onDeleteTile}
              onEdit={onEditTile}
              isFirst={idx === 0}
              isLast={idx === kpiTiles.length - 1}
            />
          ))}
        </div>
      )}

      {/* 2. Visualizations Canvas Grid */}
      <div className="grid grid-cols-12 gap-4">
        {chartTiles.map((tile, idx) => (
          <ChartCard
            key={tile.id}
            tile={tile}
            data={data}
            onUpdateWidth={onUpdateWidth}
            onMove={onMoveTile}
            onDelete={onDeleteTile}
            onEdit={onEditTile}
            isFirst={idx === 0}
            isLast={idx === chartTiles.length - 1}
          />
        ))}

        {/* Add Chart Placeholder Tile */}
        <div
          onClick={onOpenBuilder}
          className="col-span-12 sm:col-span-6 lg:col-span-4 min-h-[220px] rounded-2xl border-2 border-dashed border-white/40 dark:border-white/10 hover:border-metrica-500/60 dark:hover:border-metrica-400/60 flex flex-col items-center justify-center gap-2.5 p-6 text-glass-muted hover:text-metrica-600 dark:hover:text-metrica-400 cursor-pointer transition-all hover:bg-white/40 dark:hover:bg-white/5 group"
        >
          <div className="p-3 rounded-full bg-white/50 dark:bg-white/10 group-hover:bg-metrica-500/20 text-glass-secondary group-hover:text-metrica-600 dark:group-hover:text-metrica-400 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-glass-primary group-hover:text-metrica-600 dark:group-hover:text-metrica-400">Add Custom Chart</span>
          <p className="text-[11px] text-glass-muted text-center max-w-[200px] font-medium">
            Choose dimensions, aggregations, and visual style
          </p>
        </div>
      </div>
    </div>
  );
}

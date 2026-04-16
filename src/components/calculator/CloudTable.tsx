import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CloudRow } from './CloudRow';
import type { CloudRecommendation } from '@/lib/formulas/types';

interface CloudTableProps {
  recommendations: CloudRecommendation[];
  className?: string;
}

type SortKey = 'onDemandPerHour' | 'spotPerHour' | 'costPerMillionTokens';
type SortDir = 'asc' | 'desc';

const PROVIDERS = ['All', 'AWS', 'Azure', 'GCP', 'Lambda', 'RunPod', 'Vast', 'CoreWeave'];

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== column) return <ArrowUpDown size={12} className="opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-accent" />
    : <ArrowDown size={12} className="text-accent" />;
}

export function CloudTable({ recommendations, className }: CloudTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const [providerFilter, setProviderFilter] = React.useState('All');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = React.useMemo(() => {
    if (providerFilter === 'All') return recommendations;
    return recommendations.filter(r =>
      r.instance.provider.toLowerCase() === providerFilter.toLowerCase()
    );
  }, [recommendations, providerFilter]);

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? Infinity;
      const bVal = b[sortKey] ?? Infinity;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filtered, sortKey, sortDir]);

  if (recommendations.length === 0) {
    return (
      <div className="text-sm text-fg-muted text-center py-8">
        No cloud instances match your VRAM requirements.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Provider filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-fg-muted">Filter:</span>
        {PROVIDERS.map(p => (
          <button
            key={p}
            onClick={() => setProviderFilter(p)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-md border transition-colors',
              providerFilter === p
                ? 'bg-accent text-white border-accent'
                : 'border-border-subtle text-fg-muted hover:text-fg-default hover:border-border-default'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm" role="table" aria-label="Cloud instance recommendations">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-subtle sticky top-0">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted">
                Provider
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted">
                Instance
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted">
                Interconnect
              </th>
              <th className="px-4 py-2.5 text-right">
                <button
                  onClick={() => handleSort('onDemandPerHour')}
                  className="flex items-center gap-1 ml-auto text-[11px] font-medium uppercase tracking-wider text-fg-muted hover:text-fg-default transition-colors"
                  aria-label="Sort by on-demand price"
                >
                  $/h
                  <SortIcon column="onDemandPerHour" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">
                <button
                  onClick={() => handleSort('spotPerHour')}
                  className="flex items-center gap-1 ml-auto text-[11px] font-medium uppercase tracking-wider text-fg-muted hover:text-fg-default transition-colors"
                  aria-label="Sort by spot price"
                >
                  Spot
                  <SortIcon column="spotPerHour" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">
                <button
                  onClick={() => handleSort('costPerMillionTokens')}
                  className="flex items-center gap-1 ml-auto text-[11px] font-medium uppercase tracking-wider text-fg-muted hover:text-fg-default transition-colors"
                  aria-label="Sort by cost per million tokens"
                >
                  $/M tok
                  <SortIcon column="costPerMillionTokens" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(rec => (
              <CloudRow key={rec.instance.id} rec={rec} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-fg-muted">
        {sorted.length} instance{sorted.length !== 1 ? 's' : ''} · Prices may vary by region
      </p>
    </div>
  );
}

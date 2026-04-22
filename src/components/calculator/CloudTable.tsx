import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Star, Cpu, MemoryStick, HardDrive, Network, MapPin, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CloudRecommendation } from '@/lib/formulas/types';

interface CloudTableProps {
  recommendations: CloudRecommendation[];
  className?: string;
}

type SortKey = 'onDemandPerHour' | 'spotPerHour' | 'costPerMillionTokens';
type SortDir = 'asc' | 'desc';

const PROVIDERS = ['All', 'AWS', 'Azure', 'GCP', 'Lambda', 'RunPod', 'Vast', 'CoreWeave'];

const PROVIDER_CONFIG: Record<string, { bg: string; initials: string; label: string }> = {
  aws:        { bg: 'bg-orange-500',  initials: 'AW', label: 'AWS' },
  azure:      { bg: 'bg-blue-500',    initials: 'AZ', label: 'Azure' },
  gcp:        { bg: 'bg-green-500',   initials: 'GC', label: 'GCP' },
  lambda:     { bg: 'bg-purple-500',  initials: 'LA', label: 'Lambda' },
  runpod:     { bg: 'bg-pink-500',    initials: 'RP', label: 'RunPod' },
  vast:       { bg: 'bg-cyan-500',    initials: 'VA', label: 'Vast' },
  coreweave:  { bg: 'bg-indigo-500',  initials: 'CW', label: 'CoreWeave' },
};

const INTERCONNECT_LABEL: Record<string, { label: string; color: string }> = {
  nvlink:          { label: 'NVLink',       color: 'bg-green-500/10 text-green-400' },
  nvswitch:        { label: 'NVSwitch',     color: 'bg-green-500/10 text-green-400' },
  'infiniband-400':{ label: 'IB 400Gb/s',  color: 'bg-blue-500/10 text-blue-400' },
  'infiniband-800':{ label: 'IB 800Gb/s',  color: 'bg-blue-500/10 text-blue-400' },
  rocev2:          { label: 'RoCE v2',      color: 'bg-cyan-500/10 text-cyan-400' },
  pcie:            { label: 'PCIe',         color: 'bg-bg-muted text-fg-muted' },
};

function ProviderBadge({ provider }: { provider: string }) {
  const cfg = PROVIDER_CONFIG[provider.toLowerCase()] ?? { bg: 'bg-fg-muted', initials: provider.slice(0, 2).toUpperCase(), label: provider };
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', cfg.bg)}>
        <span className="text-[8px] font-bold text-white leading-none">{cfg.initials}</span>
      </div>
      <span className="text-xs font-medium text-fg-default">{cfg.label}</span>
    </div>
  );
}

function SortBtn({ label, col, sortKey, sortDir, onSort, ariaLabel }: {
  label: string; col: SortKey; sortKey: SortKey | null; sortDir: SortDir;
  onSort: (k: SortKey) => void; ariaLabel: string;
}) {
  const active = sortKey === col;
  return (
    <button
      onClick={() => onSort(col)}
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider transition-colors',
        active ? 'text-accent' : 'text-fg-muted hover:text-fg-default'
      )}
    >
      {label}
      {active
        ? sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        : <ArrowUpDown size={11} className="opacity-40" />}
    </button>
  );
}

export function CloudTable({ recommendations, className }: CloudTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const [providerFilter, setProviderFilter] = React.useState('All');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = React.useMemo(() => {
    if (providerFilter === 'All') return recommendations;
    return recommendations.filter(r => r.instance.provider.toLowerCase() === providerFilter.toLowerCase());
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
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-center gap-1.5 w-max">
          <span className="text-xs text-fg-muted flex-shrink-0">Filter:</span>
          {PROVIDERS.map(p => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap',
                providerFilter === p
                  ? 'bg-accent text-white border-accent'
                  : 'border-border-subtle text-fg-muted hover:text-fg-default hover:border-border-default'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-xs text-fg-muted">Sort by:</span>
        <SortBtn label="$/hr" col="onDemandPerHour" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} ariaLabel="Sort by on-demand price" />
        <SortBtn label="Spot" col="spotPerHour" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} ariaLabel="Sort by spot price" />
        <SortBtn label="$/M tokens" col="costPerMillionTokens" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} ariaLabel="Sort by cost per million tokens" />
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {sorted.map(rec => (
          <CloudCard key={rec.instance.id} rec={rec} />
        ))}
      </div>

      <p className="text-[10px] text-fg-muted px-1">
        {sorted.length} instance{sorted.length !== 1 ? 's' : ''} · Prices may vary by region · Last updated {sorted[0]?.instance.lastPriceUpdate ?? '—'}
      </p>
    </div>
  );
}

function CloudCard({ rec }: { rec: CloudRecommendation }) {
  const { instance, onDemandPerHour, spotPerHour, costPerMillionTokens, isBestPrice, fitStatus, totalGPUMemoryGB } = rec;
  const gpuSummary = instance.gpus.map(g => `${g.count}× ${g.id}`).join(', ');
  const interconnect = instance.interconnect ? INTERCONNECT_LABEL[instance.interconnect] : null;
  const regionCount = instance.regions.length;

  return (
    <div className={cn(
      'rounded-lg border transition-colors p-4 flex flex-col gap-3',
      isBestPrice ? 'border-accent/50 bg-accent/5' : 'border-border-subtle bg-bg-default hover:bg-bg-subtle'
    )}>
      {/* Top row: provider + instance + best badge + fit */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <ProviderBadge provider={instance.provider} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-semibold text-fg-primary">{instance.instanceType}</span>
              {isBestPrice && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
                  <Star size={9} className="fill-yellow-500" /> Best Value
                </span>
              )}
              {fitStatus === 'yellow' && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">Tight Fit</span>
              )}
            </div>
            <span className="text-xs text-fg-muted mt-0.5">{gpuSummary} · {totalGPUMemoryGB} GB VRAM</span>
          </div>
        </div>

        {/* Pricing block */}
        <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-fg-muted">On-demand</span>
            <span className="text-sm font-mono font-bold text-fg-primary tabular-nums">${onDemandPerHour.toFixed(2)}<span className="text-xs font-normal text-fg-muted">/hr</span></span>
          </div>
          {spotPerHour != null && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-fg-muted">Spot</span>
              <span className="text-sm font-mono font-semibold text-green-400 tabular-nums">${spotPerHour.toFixed(2)}<span className="text-xs font-normal text-fg-muted">/hr</span></span>
            </div>
          )}
          {costPerMillionTokens != null && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-fg-muted">$/M tokens</span>
              <span className="text-sm font-mono font-semibold text-accent tabular-nums">${costPerMillionTokens.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Specs row */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] text-fg-muted border-t border-border-subtle pt-2.5">
        <span className="flex items-center gap-1">
          <Cpu size={11} className="flex-shrink-0" />
          {instance.vcpus} vCPUs
        </span>
        <span className="flex items-center gap-1">
          <MemoryStick size={11} className="flex-shrink-0" />
          {instance.ramGB} GB RAM
        </span>
        {instance.storageGB > 0 && (
          <span className="flex items-center gap-1">
            <HardDrive size={11} className="flex-shrink-0" />
            {instance.storageGB} GB
          </span>
        )}
        <span className="flex items-center gap-1">
          <Network size={11} className="flex-shrink-0" />
          {instance.networkGbps} Gbps
        </span>
        {interconnect && (
          <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded font-medium', interconnect.color)}>
            <Zap size={10} className="flex-shrink-0" />
            {interconnect.label}
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <MapPin size={11} className="flex-shrink-0" />
          {regionCount} region{regionCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Notes */}
      {instance.notes && (
        <p className="text-[11px] text-fg-muted italic">{instance.notes}</p>
      )}
    </div>
  );
}

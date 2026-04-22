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

const PROVIDERS = ['All', 'AWS', 'Azure', 'GCP', 'Lambda', 'RunPod', 'Vast', 'CoreWeave', 'Nebius', 'Together'];

const PROVIDER_CONFIG: Record<string, { label: string }> = {
  aws:        { label: 'AWS' },
  azure:      { label: 'Azure' },
  gcp:        { label: 'GCP' },
  lambda:     { label: 'Lambda' },
  runpod:     { label: 'RunPod' },
  vast:       { label: 'Vast.ai' },
  coreweave:  { label: 'CoreWeave' },
  together:   { label: 'Together' },
  nebius:     { label: 'Nebius' },
};

function ProviderLogo({ provider, size = 20 }: { provider: string; size?: number }) {
  const p = provider.toLowerCase();

  if (p === 'aws') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="AWS">
      <rect width="80" height="80" rx="8" fill="#232F3E"/>
      <path d="M24 46c0 1.1.4 2 1.1 2.6.7.6 1.7.9 2.9.9 1 0 1.9-.2 2.6-.7.7-.5 1.1-1.2 1.1-2.1 0-.8-.3-1.4-.8-1.8-.5-.4-1.4-.8-2.6-1.1l-1.2-.3c-.8-.2-1.4-.5-1.7-.8-.3-.3-.5-.7-.5-1.2 0-.6.2-1 .7-1.4.5-.3 1.1-.5 1.9-.5.7 0 1.3.2 1.8.5.5.3.7.8.8 1.4h1.5c-.1-1-.5-1.8-1.2-2.4-.7-.6-1.7-.9-2.9-.9-1.1 0-2 .3-2.7.8-.7.5-1 1.3-1 2.2 0 .8.3 1.4.8 1.9.5.5 1.3.8 2.4 1.1l1.3.3c.9.2 1.5.5 1.9.8.4.3.5.7.5 1.2 0 .6-.3 1.1-.8 1.4-.5.3-1.2.5-2 .5-.9 0-1.6-.2-2.1-.6-.5-.4-.8-1-.8-1.8H24zm13.5 3.3h1.5V38.8h-1.5v10.5zm0-12.3h1.5v-1.8h-1.5V37zm4.2 12.3h1.5v-5.8c0-.9.2-1.6.7-2.1.5-.5 1.1-.8 1.9-.8.7 0 1.2.2 1.6.6.4.4.5 1 .5 1.8v6.3h1.5v-6.5c0-1.1-.3-2-.9-2.6-.6-.6-1.4-.9-2.5-.9-.6 0-1.2.1-1.7.4-.5.3-.9.7-1.1 1.2v-1.4h-1.5v9.8zm10.8 0h1.5v-5.8c0-.9.2-1.6.7-2.1.5-.5 1.1-.8 1.9-.8.7 0 1.2.2 1.6.6.4.4.5 1 .5 1.8v6.3h1.5v-6.5c0-1.1-.3-2-.9-2.6-.6-.6-1.4-.9-2.5-.9-.6 0-1.2.1-1.7.4-.5.3-.9.7-1.1 1.2v-1.4h-1.5v9.8z" fill="#FF9900"/>
      <path d="M20 55h40" stroke="#FF9900" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  if (p === 'azure') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Azure">
      <rect width="80" height="80" rx="8" fill="#0078D4"/>
      <path d="M35 20L20 55h12l5-10 13 10H62L45 30l-10-10z" fill="white" fillOpacity="0.9"/>
      <path d="M38 28l-8 27h8l12-27H38z" fill="white"/>
    </svg>
  );

  if (p === 'gcp') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="GCP">
      <rect width="80" height="80" rx="8" fill="#fff"/>
      <path d="M40 22c-9.9 0-18 8.1-18 18s8.1 18 18 18 18-8.1 18-18-8.1-18-18-18zm0 4c7.7 0 14 6.3 14 14s-6.3 14-14 14-14-6.3-14-14 6.3-14 14-14z" fill="#4285F4"/>
      <path d="M48 40h-8v-8h-4v8h-8v4h8v8h4v-8h8v-4z" fill="#34A853"/>
      <circle cx="40" cy="40" r="6" fill="#FBBC05"/>
      <path d="M40 34v12M34 40h12" stroke="#EA4335" strokeWidth="2"/>
    </svg>
  );

  if (p === 'lambda') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Lambda">
      <rect width="80" height="80" rx="8" fill="#7C3AED"/>
      <path d="M22 58L34 22h8L30 58H22zm16 0l12-36h8L46 58H38z" fill="white" fillOpacity="0.9"/>
    </svg>
  );

  if (p === 'runpod') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="RunPod">
      <rect width="80" height="80" rx="8" fill="#EC4899"/>
      <circle cx="40" cy="40" r="16" fill="white" fillOpacity="0.2"/>
      <circle cx="40" cy="40" r="8" fill="white"/>
      <path d="M40 24v6M40 50v6M24 40h6M50 40h6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  if (p === 'vast' || p === 'vast.ai') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Vast.ai">
      <rect width="80" height="80" rx="8" fill="#06B6D4"/>
      <path d="M20 28h40v4H20zm0 10h30v4H20zm0 10h20v4H20z" fill="white" fillOpacity="0.9"/>
    </svg>
  );

  if (p === 'coreweave') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="CoreWeave">
      <rect width="80" height="80" rx="8" fill="#4F46E5"/>
      <path d="M40 20c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 6c7.7 0 14 6.3 14 14s-6.3 14-14 14-14-6.3-14-14 6.3-14 14-14z" fill="white" fillOpacity="0.3"/>
      <path d="M40 28c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12-5.4-12-12-12zm0 4c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8z" fill="white" fillOpacity="0.6"/>
      <circle cx="40" cy="40" r="5" fill="white"/>
    </svg>
  );

  if (p === 'together') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Together">
      <rect width="80" height="80" rx="8" fill="#0D9488"/>
      <circle cx="30" cy="40" r="8" fill="white" fillOpacity="0.8"/>
      <circle cx="50" cy="40" r="8" fill="white" fillOpacity="0.8"/>
      <ellipse cx="40" cy="40" rx="6" ry="8" fill="white"/>
    </svg>
  );

  if (p === 'nebius') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Nebius">
      <rect width="80" height="80" rx="8" fill="#1A1A2E"/>
      <path d="M20 52V28l20 24V28" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M44 28h16v24H44" stroke="#818CF8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Fallback
  return (
    <div className="w-5 h-5 rounded bg-bg-muted flex items-center justify-center flex-shrink-0">
      <span className="text-[8px] font-bold text-fg-muted">{provider.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const label = PROVIDER_CONFIG[provider.toLowerCase()]?.label ?? provider;
  return (
    <div className="flex items-center gap-1.5">
      <ProviderLogo provider={provider} size={20} />
      <span className="text-xs font-medium text-fg-default">{label}</span>
    </div>
  );
}

const INTERCONNECT_LABEL: Record<string, { label: string; color: string }> = {
  nvlink:          { label: 'NVLink',       color: 'bg-green-500/10 text-green-400' },
  nvswitch:        { label: 'NVSwitch',     color: 'bg-green-500/10 text-green-400' },
  'infiniband-400':{ label: 'IB 400Gb/s',  color: 'bg-blue-500/10 text-blue-400' },
  'infiniband-800':{ label: 'IB 800Gb/s',  color: 'bg-blue-500/10 text-blue-400' },
  rocev2:          { label: 'RoCE v2',      color: 'bg-cyan-500/10 text-cyan-400' },
  pcie:            { label: 'PCIe',         color: 'bg-bg-muted text-fg-muted' },
};

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

      {/* Cards — 2-column grid, scrollable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[600px] overflow-y-auto pr-1">
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
      'rounded-lg border transition-colors p-3 flex flex-col gap-2',
      isBestPrice ? 'border-accent/50 bg-accent/5' : 'border-border-subtle bg-bg-default hover:bg-bg-subtle'
    )}>
      {/* Top row: provider + instance + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ProviderBadge provider={instance.provider} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono font-semibold text-fg-primary truncate">{instance.instanceType}</span>
              {isBestPrice && (
                <span className="flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 flex-shrink-0">
                  <Star size={8} className="fill-yellow-500" /> Best
                </span>
              )}
              {fitStatus === 'yellow' && (
                <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 flex-shrink-0">Tight</span>
              )}
            </div>
            <span className="text-[10px] text-fg-muted">{gpuSummary} · {totalGPUMemoryGB} GB</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-fg-muted">On-demand</span>
            <span className="text-xs font-mono font-bold text-fg-primary tabular-nums">${onDemandPerHour.toFixed(2)}<span className="text-[9px] font-normal text-fg-muted">/hr</span></span>
          </div>
          {spotPerHour != null && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-fg-muted">Spot</span>
              <span className="text-xs font-mono font-semibold text-green-400 tabular-nums">${spotPerHour.toFixed(2)}<span className="text-[9px] font-normal text-fg-muted">/hr</span></span>
            </div>
          )}
          {costPerMillionTokens != null && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-fg-muted">$/M tok</span>
              <span className="text-xs font-mono font-semibold text-accent tabular-nums">${costPerMillionTokens.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Specs row */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-fg-muted border-t border-border-subtle pt-2">
        <span className="flex items-center gap-0.5"><Cpu size={10} />{instance.vcpus} vCPU</span>
        <span className="flex items-center gap-0.5"><MemoryStick size={10} />{instance.ramGB} GB</span>
        {instance.storageGB > 0 && <span className="flex items-center gap-0.5"><HardDrive size={10} />{instance.storageGB} GB</span>}
        <span className="flex items-center gap-0.5"><Network size={10} />{instance.networkGbps} Gbps</span>
        {interconnect && (
          <span className={cn('flex items-center gap-0.5 px-1 py-0.5 rounded font-medium', interconnect.color)}>
            <Zap size={9} />{interconnect.label}
          </span>
        )}
        <span className="flex items-center gap-0.5 ml-auto"><MapPin size={10} />{regionCount} region{regionCount !== 1 ? 's' : ''}</span>
      </div>

      {instance.notes && (
        <p className="text-[10px] text-fg-muted italic truncate">{instance.notes}</p>
      )}
    </div>
  );
}

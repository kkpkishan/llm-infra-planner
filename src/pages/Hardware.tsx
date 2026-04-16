import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalculatorStore } from '@/store/calculator-store';
import type { GPUSpec } from '@/lib/formulas/types';

type SortKey = 'name' | 'memoryGB' | 'memoryBandwidthGBs' | 'flops.fp16' | 'tdpWatts' | 'streetUSD';
type SortDir = 'asc' | 'desc';

function getVal(gpu: GPUSpec, key: SortKey): string | number {
  if (key === 'flops.fp16') return gpu.flops.fp16;
  if (key === 'streetUSD') return gpu.streetUSD ?? gpu.msrpUSD ?? Infinity;
  if (key === 'name') return gpu.name;
  if (key === 'memoryGB') return gpu.memoryGB;
  if (key === 'memoryBandwidthGBs') return gpu.memoryBandwidthGBs;
  if (key === 'tdpWatts') return gpu.tdpWatts;
  return '';
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={12} className="opacity-30" />;
  return sortDir === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />;
}

const VENDOR_COLORS: Record<string, string> = {
  nvidia: 'bg-green-500/10 text-green-700 dark:text-green-400',
  amd:    'bg-red-500/10 text-red-700 dark:text-red-400',
  apple:  'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  intel:  'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  consumer:      'Consumer',
  workstation:   'Workstation',
  datacenter:    'Datacenter',
  'apple-silicon': 'Apple Silicon',
  tpu:           'TPU',
};

export function Hardware() {
  const { gpuDb } = useCalculatorStore();
  const [sortKey, setSortKey] = React.useState<SortKey>('memoryGB');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');
  const [vendorFilter, setVendorFilter] = React.useState('All');
  const [memMin, setMemMin] = React.useState('');
  const [memMax, setMemMax] = React.useState('');
  const [priceMax, setPriceMax] = React.useState('');

  const vendors = ['All', ...Array.from(new Set(gpuDb.map(g => g.vendor))).sort()];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = gpuDb.filter(g => {
    if (vendorFilter !== 'All' && g.vendor !== vendorFilter) return false;
    if (memMin && g.memoryGB < parseFloat(memMin)) return false;
    if (memMax && g.memoryGB > parseFloat(memMax)) return false;
    const price = g.streetUSD ?? g.msrpUSD;
    if (priceMax && price != null && price > parseFloat(priceMax)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = getVal(a, sortKey);
    const bv = getVal(b, sortKey);
    const cmp = typeof av === 'number' ? av - (bv as number) : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const cols: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'name', label: 'GPU' },
    { key: 'memoryGB', label: 'VRAM', align: 'right' },
    { key: 'memoryBandwidthGBs', label: 'BW (GB/s)', align: 'right' },
    { key: 'flops.fp16', label: 'FP16 TF', align: 'right' },
    { key: 'tdpWatts', label: 'TDP (W)', align: 'right' },
    { key: 'streetUSD', label: 'Price', align: 'right' },
  ];

  return (
    <div className="max-w-[1760px] mx-auto px-4 md:px-6 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-fg-primary">Hardware <span className="text-fg-muted font-mono text-sm">({sorted.length})</span></h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end text-xs">
        {/* Vendor */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-fg-muted">Vendor:</span>
          {vendors.map(v => (
            <button key={v} onClick={() => setVendorFilter(v)}
              className={cn('px-2.5 py-1 rounded-md border transition-colors capitalize',
                vendorFilter === v ? 'bg-accent text-white border-accent' : 'border-border-subtle text-fg-muted hover:text-fg-default hover:border-border-default'
              )}>
              {v}
            </button>
          ))}
        </div>

        {/* Memory range */}
        <div className="flex items-center gap-1.5">
          <span className="text-fg-muted">VRAM:</span>
          <input type="number" placeholder="Min GB" value={memMin} onChange={e => setMemMin(e.target.value)}
            className="w-20 h-7 px-2 rounded border border-border-subtle bg-bg-muted text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
          <span className="text-fg-muted">–</span>
          <input type="number" placeholder="Max GB" value={memMax} onChange={e => setMemMax(e.target.value)}
            className="w-20 h-7 px-2 rounded border border-border-subtle bg-bg-muted text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        {/* Price max */}
        <div className="flex items-center gap-1.5">
          <span className="text-fg-muted">Max price:</span>
          <input type="number" placeholder="$" value={priceMax} onChange={e => setPriceMax(e.target.value)}
            className="w-24 h-7 px-2 rounded border border-border-subtle bg-bg-muted text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm" aria-label="Hardware catalog">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-subtle">
              {cols.map(col => (
                <th key={col.key} className={cn('px-4 py-2.5', col.align === 'right' ? 'text-right' : 'text-left')}>
                  <button onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted hover:text-fg-default transition-colors"
                    style={{ marginLeft: col.align === 'right' ? 'auto' : undefined }}>
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(gpu => {
              const price = gpu.streetUSD ?? gpu.msrpUSD;
              return (
                <tr key={gpu.id} className="border-b border-border-subtle hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded uppercase',
                        VENDOR_COLORS[gpu.vendor] ?? 'bg-bg-muted text-fg-muted')}>
                        {gpu.vendor}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-fg-primary">{gpu.name}</span>
                        <span className="text-[10px] text-fg-muted">{CATEGORY_LABELS[gpu.category] ?? gpu.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">{gpu.memoryGB} GB</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">{gpu.memoryBandwidthGBs}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">{gpu.flops.fp16}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">{gpu.tdpWatts}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">
                    {price != null ? (price >= 1000 ? `$${(price / 1000).toFixed(1)}k` : `$${price}`) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

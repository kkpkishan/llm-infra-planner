import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Cpu, Search } from 'lucide-react';
import Fuse from 'fuse.js';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/primitives/InfoTooltip';
import type { GPUSpec } from '@/lib/formulas/types';

interface GPUPickerProps {
  gpus: GPUSpec[];
  value: GPUSpec | null;
  onSelect: (gpu: GPUSpec) => void;
  className?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  datacenter: { label: 'Datacenter', color: 'bg-blue-500/10 text-blue-400' },
  consumer:   { label: 'Consumer',   color: 'bg-green-500/10 text-green-400' },
  'wafer-scale': { label: 'Wafer Scale', color: 'bg-purple-500/10 text-purple-400' },
  tpu:        { label: 'TPU',        color: 'bg-orange-500/10 text-orange-400' },
  edge:       { label: 'Edge',       color: 'bg-cyan-500/10 text-cyan-400' },
};

export function GPUPicker({ gpus, value, onSelect, className }: GPUPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  // Position dropdown below trigger
  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 420),
      zIndex: 9999,
    });
    setTimeout(() => searchRef.current?.focus(), 10);
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!dropdownRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Fuzzy search
  const fuse = React.useMemo(
    () => new Fuse(gpus, {
      keys: ['name', 'vendor', 'category'],
      threshold: 0.3,
      ignoreLocation: true,
    }),
    [gpus]
  );

  const filtered = search.trim()
    ? fuse.search(search.trim()).map(r => r.item)
    : gpus;

  // Group by category
  const grouped = React.useMemo(() => {
    const map = new Map<string, GPUSpec[]>();
    filtered.forEach(g => {
      const cat = g.category || 'other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(g);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const order = ['datacenter', 'consumer', 'wafer-scale', 'tpu', 'edge', 'other'];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });
  }, [filtered]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor="gpu-picker" className="text-xs font-medium text-fg-default">
          GPU / Hardware
        </label>
        <InfoTooltip content={{
          title: "Hardware-First Selection",
          definition: "Select a GPU to see which models fit on that hardware",
          impact: "Helps you choose models that will run efficiently on your available hardware",
          recommended: "Start with your GPU if you already have hardware available"
        }} />
      </div>

      <button
        ref={triggerRef}
        id="gpu-picker"
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-muted',
          'flex items-center justify-between gap-2',
          'text-sm text-fg-default hover:bg-bg-emphasis transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          open && 'ring-2 ring-ring'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Cpu size={14} className="text-fg-muted flex-shrink-0" />
          {value ? (
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="font-medium truncate w-full text-left">{value.name}</span>
              <span className="text-[10px] text-fg-muted font-mono">
                {value.memoryGB} GB · {value.vendor}
              </span>
            </div>
          ) : (
            <span className="text-fg-muted">Select GPU...</span>
          )}
        </div>
        <ChevronsUpDown size={14} className="text-fg-muted flex-shrink-0" />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-bg-base border border-border-default rounded-lg shadow-xl overflow-hidden"
        >
          {/* Search */}
          <div className="p-2 border-b border-border-subtle">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search GPUs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-8 pl-9 pr-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {grouped.length === 0 ? (
              <div className="p-4 text-center text-sm text-fg-muted">No GPUs found</div>
            ) : (
              grouped.map(([category, categoryGPUs]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-fg-muted bg-bg-subtle sticky top-0">
                    {CATEGORY_CONFIG[category]?.label || category}
                  </div>
                  {categoryGPUs.map(gpu => {
                    const isSelected = value?.id === gpu.id;
                    return (
                      <button
                        key={gpu.id}
                        type="button"
                        onClick={() => {
                          onSelect(gpu);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={cn(
                          'w-full px-3 py-2 flex items-center gap-2 text-left transition-colors',
                          isSelected
                            ? 'bg-accent/10 text-fg-primary'
                            : 'hover:bg-bg-subtle text-fg-default'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{gpu.name}</span>
                            {isSelected && <Check size={14} className="text-accent flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-fg-muted">
                              {gpu.memoryGB} GB VRAM
                            </span>
                            <span className="text-[10px] text-fg-muted">·</span>
                            <span className="text-[10px] text-fg-muted">{gpu.vendor}</span>
                            {gpu.memoryBandwidthGBs && (
                              <>
                                <span className="text-[10px] text-fg-muted">·</span>
                                <span className="text-[10px] text-fg-muted">
                                  {gpu.memoryBandwidthGBs.toFixed(0)} GB/s
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

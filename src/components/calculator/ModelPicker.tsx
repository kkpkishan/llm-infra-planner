import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Cpu, Search } from 'lucide-react';
import Fuse from 'fuse.js';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/primitives/InfoTooltip';
import type { ModelSpec } from '@/lib/formulas/types';

interface ModelPickerProps {
  models: ModelSpec[];
  value: ModelSpec | null;
  onSelect: (model: ModelSpec) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const FAMILY_CONFIG: Record<string, { label: string; color: string }> = {
  llama:    { label: 'Llama',    color: 'bg-violet-500/10 text-violet-400' },
  mistral:  { label: 'Mistral',  color: 'bg-orange-500/10 text-orange-400' },
  qwen:     { label: 'Qwen',     color: 'bg-blue-500/10 text-blue-400' },
  deepseek: { label: 'DeepSeek', color: 'bg-cyan-500/10 text-cyan-400' },
  gemma:    { label: 'Gemma',    color: 'bg-green-500/10 text-green-400' },
  phi:      { label: 'Phi',      color: 'bg-purple-500/10 text-purple-400' },
};

function getBadges(model: ModelSpec): string[] {
  const b: string[] = [];
  if (model.moe) b.push('MoE');
  if (model.displayName.toLowerCase().includes('vision')) b.push('VLM');
  if (model.displayName.toLowerCase().includes('instruct') || model.displayName.toLowerCase().includes('chat')) {
    b.push('Instruct');
  } else {
    b.push('Base');
  }
  return b;
}

const RECENT_KEY = 'llmcalc-recent-models';
function getRecentIds(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecentId(id: string) {
  try {
    const prev = getRecentIds();
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev.filter(x => x !== id)].slice(0, 5)));
  } catch { /* ignore */ }
}

export function ModelPicker({ models, value, onSelect, open: externalOpen, onOpenChange: externalOnOpenChange, className }: ModelPickerProps) {
  const [open, setOpenRaw] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const setOpen = React.useCallback((v: boolean) => {
    setOpenRaw(v);
    if (!v) { setSearch(''); externalOnOpenChange?.(false); }
  }, [externalOnOpenChange]);

  // ⌘K global event — only respond if trigger is visible
  React.useEffect(() => {
    const handler = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight) {
        setOpenRaw(true);
      }
    };
    document.addEventListener('llmcalc:open-model-search', handler);
    return () => document.removeEventListener('llmcalc:open-model-search', handler);
  }, []);

  // Sync external open prop
  React.useEffect(() => {
    if (externalOpen === true) setOpenRaw(true);
  }, [externalOpen]);

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
    // Focus search after positioning
    setTimeout(() => searchRef.current?.focus(), 10);
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dropdownRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    // Use click (not pointerdown) so item onClick fires first
    const id = setTimeout(() => document.addEventListener('click', handler, true), 50);
    return () => { clearTimeout(id); document.removeEventListener('click', handler, true); };
  }, [open, setOpen]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  const fuse = React.useMemo(
    () => new Fuse(models, { keys: ['displayName', 'id', 'family'], threshold: 0.3 }),
    [models]
  );

  const filtered = React.useMemo(
    () => search.trim() ? fuse.search(search).map(r => r.item) : models,
    [search, fuse, models]
  );

  const grouped = React.useMemo(() => {
    const g: Record<string, ModelSpec[]> = {};
    filtered.forEach(m => { (g[m.family] ??= []).push(m); });
    return g;
  }, [filtered]);

  const recentModels = React.useMemo(() => {
    return getRecentIds().map(id => models.find(m => m.id === id)).filter((m): m is ModelSpec => !!m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, open]);

  const handleSelect = (model: ModelSpec) => {
    onSelect(model);
    saveRecentId(model.id);
    setOpen(false);
  };

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="rounded-lg border border-border bg-bg-base shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-3 border-b border-border">
        <Search size={14} className="text-fg-muted flex-shrink-0" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-10 bg-transparent text-sm text-fg-default placeholder:text-fg-muted outline-none"
        />
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[380px]">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-fg-muted">No models found.</p>
        )}

        {/* Recent */}
        {!search && recentModels.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Recent</div>
            {recentModels.map(model => (
              <ModelRow
                key={`r-${model.id}`}
                model={model}
                selected={value?.id === model.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {/* Grouped */}
        {Object.entries(grouped).map(([family, fModels]) => (
          <div key={family}>
            <div className="px-3 py-1.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">
              {FAMILY_CONFIG[family]?.label ?? family}
            </div>
            {fModels.map(model => (
              <ModelRow
                key={model.id}
                model={model}
                selected={value?.id === model.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-fg-default flex items-center gap-1.5">
        <Cpu size={14} className="text-fg-muted" />
        Model
        <InfoTooltip paramKey="model" />
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-bg-muted px-1.5 font-mono text-[10px] font-medium text-fg-muted">
          ⌘K
        </kbd>
      </label>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default hover:bg-bg-emphasis focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {value ? (
          <span className="flex items-center gap-2 truncate min-w-0">
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0',
              FAMILY_CONFIG[value.family]?.color ?? 'bg-bg-muted text-fg-muted')}>
              {FAMILY_CONFIG[value.family]?.label ?? value.family}
            </span>
            <span className="truncate">{value.displayName}</span>
          </span>
        ) : (
          <span className="text-fg-muted">Select model...</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* Portal */}
      {open && createPortal(dropdown, document.body)}
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────
function ModelRow({ model, selected, onSelect }: { model: ModelSpec; selected: boolean; onSelect: (m: ModelSpec) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(model)}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-muted transition-colors"
    >
      <Check size={14} className={cn('flex-shrink-0', selected ? 'text-accent' : 'opacity-0')} />
      <span className="truncate flex-1 text-fg-default">{model.displayName}</span>
      <div className="flex gap-1 flex-shrink-0">
        {getBadges(model).map(b => (
          <span key={b} className="text-[9px] px-1 py-0.5 rounded bg-bg-subtle text-fg-muted">{b}</span>
        ))}
      </div>
    </button>
  );
}

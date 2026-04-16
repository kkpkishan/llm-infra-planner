import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalculatorStore } from '@/store/calculator-store';
import type { ModelSpec } from '@/lib/formulas/types';

type SortKey = 'displayName' | 'paramsTotal' | 'architecture.maxContextLength' | 'releaseDate' | 'license';
type SortDir = 'asc' | 'desc';

function getVal(model: ModelSpec, key: SortKey): string | number {
  if (key === 'architecture.maxContextLength') return model.architecture.maxContextLength;
  if (key === 'paramsTotal') return model.paramsTotal;
  if (key === 'displayName') return model.displayName;
  if (key === 'releaseDate') return model.releaseDate;
  if (key === 'license') return model.license;
  return '';
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={12} className="opacity-30" />;
  return sortDir === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />;
}

const FAMILY_COLORS: Record<string, string> = {
  llama:    'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  mistral:  'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  qwen:     'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  deepseek: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  gemma:    'bg-green-500/10 text-green-700 dark:text-green-400',
  phi:      'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

export function Models() {
  const { modelDb } = useCalculatorStore();
  const [sortKey, setSortKey] = React.useState<SortKey>('paramsTotal');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const [familyFilter, setFamilyFilter] = React.useState('All');

  const families = ['All', ...Array.from(new Set(modelDb.map(m => m.family))).sort()];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = familyFilter === 'All' ? modelDb : modelDb.filter(m => m.family === familyFilter);

  const sorted = [...filtered].sort((a, b) => {
    const av = getVal(a, sortKey);
    const bv = getVal(b, sortKey);
    const cmp = typeof av === 'number' ? av - (bv as number) : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const cols: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'displayName', label: 'Model' },
    { key: 'paramsTotal', label: 'Params', align: 'right' },
    { key: 'architecture.maxContextLength', label: 'Context', align: 'right' },
    { key: 'releaseDate', label: 'Released' },
    { key: 'license', label: 'License' },
  ];

  return (
    <div className="max-w-[1760px] mx-auto px-4 md:px-6 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-fg-primary">Models <span className="text-fg-muted font-mono text-sm">({sorted.length})</span></h1>
        {/* Family filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {families.map(f => (
            <button key={f} onClick={() => setFamilyFilter(f)}
              className={cn('text-xs px-2.5 py-1 rounded-md border transition-colors capitalize',
                familyFilter === f ? 'bg-accent text-white border-accent' : 'border-border-subtle text-fg-muted hover:text-fg-default hover:border-border-default'
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm" aria-label="Models catalog">
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
            {sorted.map(model => (
              <tr key={model.id} className="border-b border-border-subtle hover:bg-bg-subtle transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded capitalize',
                      FAMILY_COLORS[model.family] ?? 'bg-bg-muted text-fg-muted')}>
                      {model.family}
                    </span>
                    <span className="text-sm font-medium text-fg-primary">{model.displayName}</span>
                    {model.moe && <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-bg-muted text-fg-muted">MoE</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">
                  {(model.paramsTotal / 1e9).toFixed(1)}B
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">
                  {model.architecture.maxContextLength >= 1024
                    ? `${(model.architecture.maxContextLength / 1024).toFixed(0)}k`
                    : model.architecture.maxContextLength}
                </td>
                <td className="px-4 py-3 text-xs text-fg-muted font-mono">{model.releaseDate}</td>
                <td className="px-4 py-3 text-xs text-fg-muted truncate max-w-[180px]">{model.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

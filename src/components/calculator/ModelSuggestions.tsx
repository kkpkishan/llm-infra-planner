import * as React from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelSpec, GPUSpec } from '@/lib/formulas/types';
import { getPrecisionConfig, getKVPrecisionConfig, computeTotalVRAM, classifyGPUFit } from '@/lib/formulas';

interface ModelSuggestionsProps {
  gpu: GPUSpec;
  models: ModelSpec[];
  onSelectModel: (model: ModelSpec) => void;
  contextLength?: number;
  className?: string;
}

const FIT_ICON = {
  green:  { Icon: CheckCircle,   color: 'text-green-600 dark:text-green-400',   label: 'Fits' },
  yellow: { Icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', label: 'Tight' },
  red:    { Icon: XCircle,       color: 'text-red-600 dark:text-red-400',       label: 'No fit' },
};

export function ModelSuggestions({ gpu, models, onSelectModel, contextLength = 4096, className }: ModelSuggestionsProps) {
  const [showAll, setShowAll] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const results = React.useMemo(() => {
    const pc = getPrecisionConfig('fp16');
    const kv = getKVPrecisionConfig('fp16');
    return models.map(model => {
      const bd = computeTotalVRAM(model, pc, kv, contextLength, 1, 'inference');
      const fitStatus = classifyGPUFit(bd.totalGB, gpu.memoryGB);
      return { model, vram: bd.totalGB, fitStatus };
    });
  }, [models, gpu.memoryGB, contextLength]);

  const FIT_ORDER = { green: 0, yellow: 1, red: 2 };
  const sorted = [...results].sort((a, b) => {
    const orderDiff = FIT_ORDER[a.fitStatus] - FIT_ORDER[b.fitStatus];
    if (orderDiff !== 0) return orderDiff;
    return a.model.paramsTotal - b.model.paramsTotal;
  });

  const filtered = React.useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(({ model }) =>
      model.displayName.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query)
    );
  }, [sorted, searchQuery]);

  const displayed = showAll ? filtered : filtered.slice(0, 5);
  const fittingCount = sorted.filter(r => r.fitStatus === 'green').length;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-medium text-fg-default">
            Model Suggestions for {gpu.name}
          </h3>
          <p className="text-xs text-fg-muted">
            {fittingCount} of {models.length} models fit with FP16 @ {contextLength >= 1024 ? `${contextLength / 1024}k` : contextLength} context
          </p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-bg-default border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-fg-default placeholder:text-fg-muted"
        />
      </div>

      <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto border border-border-subtle rounded-lg">
        {displayed.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-fg-muted">
            No models found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : displayed.map(({ model, vram, fitStatus }) => {
          const { Icon, color } = FIT_ICON[fitStatus];
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelectModel(model)}
              className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-bg-subtle transition-colors border-b border-border-subtle last:border-b-0"
            >
              <Icon size={16} className={cn('flex-shrink-0', color)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-fg-primary truncate">
                  {model.displayName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-fg-muted">
                    {(model.paramsTotal / 1e9).toFixed(1)}B params
                  </span>
                  <span className="text-[10px] text-fg-muted">·</span>
                  <span className="text-[10px] font-mono text-fg-muted">
                    {vram.toFixed(1)} GB VRAM
                  </span>
                  {model.moe && (
                    <>
                      <span className="text-[10px] text-fg-muted">·</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                        MoE
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-fg-muted flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {!showAll && filtered.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
        >
          Show all {filtered.length} models →
        </button>
      )}

      {showAll && filtered.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
        >
          Show less ↑
        </button>
      )}
    </div>
  );
}

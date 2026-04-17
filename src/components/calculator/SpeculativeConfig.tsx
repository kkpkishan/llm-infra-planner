import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeSpeculativeOverhead, estimateSpeedup, type SpeculativeMethod } from '@/lib/formulas/speculative';

interface SpeculativeConfigProps {
  batchSize?: number;
  contextLength?: number;
  className?: string;
}

const DRAFT_METHODS: { key: SpeculativeMethod; label: string; description: string }[] = [
  { key: 'draft_model',   label: 'Draft Model 1B', description: 'Small draft model (e.g. Llama 3.2 1B)' },
  { key: 'medusa',        label: 'Medusa',          description: 'Multi-head decoding, no draft model' },
  { key: 'eagle2',        label: 'EAGLE-2',         description: 'Feature-level draft, high speedup' },
  { key: 'eagle3',        label: 'EAGLE-3',         description: 'Latest EAGLE variant, best speedup' },
  { key: 'lookahead',     label: 'Lookahead',       description: 'Jacobi decoding, no extra model' },
  { key: 'prompt_lookup', label: 'Prompt Lookup',   description: 'Copy from prompt, RAG-friendly' },
];

// Approximate overhead for a 1B draft model
const DRAFT_1B_PARAMS = 1_240_000_000;
const DRAFT_1B_LAYERS = 16;

export function SpeculativeConfig({ batchSize = 1, contextLength = 4096, className }: SpeculativeConfigProps) {
  const [enabled, setEnabled] = React.useState(false);
  const [method, setMethod] = React.useState<SpeculativeMethod>('eagle3');

  const speedup = estimateSpeedup(method);

  // Only compute overhead for draft_model method
  const overhead = method === 'draft_model'
    ? computeSpeculativeOverhead(DRAFT_1B_PARAMS, DRAFT_1B_LAYERS, {
        batchSize,
        seqLen: contextLength,
        numKVHeads: 8,
        headDim: 64,
        bytesPerParam: 2,
      })
    : { draftModelGB: 0, draftKVGB: 0, totalOverheadGB: 0 };

  const showBatchWarning = batchSize > 8;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fg-default">Speculative Decoding</span>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(e => !e)}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            enabled ? 'bg-accent' : 'bg-bg-emphasis'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
            )}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Method selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-fg-muted">Draft method</span>
            <div className="flex flex-col gap-1">
              {DRAFT_METHODS.map(m => {
                const isSelected = method === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs border transition-colors text-left',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'bg-accent/10 border-accent/40 text-fg-primary'
                        : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis'
                    )}
                  >
                    <span className="font-medium">{m.label}</span>
                    <span className="text-[10px] text-fg-muted ml-2 truncate">{m.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-md bg-bg-muted border border-border-subtle px-3 py-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-fg-muted">Estimated speedup</span>
              <span className="text-sm font-mono font-semibold text-green-500">
                {speedup.min}–{speedup.max}×
              </span>
            </div>
            {method === 'draft_model' && overhead.totalOverheadGB > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-fg-muted">Draft model VRAM</span>
                  <span className="text-xs font-mono text-fg-default">{overhead.draftModelGB.toFixed(2)} GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-fg-muted">Draft KV cache</span>
                  <span className="text-xs font-mono text-fg-default">{overhead.draftKVGB.toFixed(3)} GB</span>
                </div>
                <div className="flex items-center justify-between border-t border-border-subtle pt-1 mt-0.5">
                  <span className="text-[10px] text-fg-muted font-medium">Total overhead</span>
                  <span className="text-xs font-mono font-semibold text-fg-primary">{overhead.totalOverheadGB.toFixed(2)} GB</span>
                </div>
              </>
            )}
            {method !== 'draft_model' && (
              <p className="text-[10px] text-fg-muted">No extra VRAM required for this method.</p>
            )}
          </div>

          {/* Batch warning */}
          {showBatchWarning && (
            <div className="flex items-start gap-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-2">
              <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
                Only effective at batch ≤ 8; diminishes at large batch (current: {batchSize})
              </p>
            </div>
          )}
          {!showBatchWarning && (
            <p className="text-[10px] text-fg-muted italic">
              Only effective at batch ≤ 8; diminishes at large batch
            </p>
          )}
        </>
      )}
    </div>
  );
}

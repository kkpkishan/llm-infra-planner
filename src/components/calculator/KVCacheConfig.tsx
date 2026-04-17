import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ModelSpec } from '@/lib/formulas/types';
import { computeKVVariant, type KVVariant } from '@/lib/formulas/kv-cache';

interface KVCacheConfigProps {
  model: ModelSpec;
  kvPrecision: string;
  contextLength: number;
  batchSize: number;
  className?: string;
}

const KV_BYTES: Record<string, number> = {
  fp32: 4, fp16: 2, bf16: 2, fp8_e4m3: 1, fp8_e5m2: 1, int8: 1, int4: 0.5,
};

const VARIANT_OPTIONS: { key: KVVariant; label: string }[] = [
  { key: 'standard',      label: 'Standard' },
  { key: 'sliding_window', label: 'Sliding Window' },
  { key: 'paged',         label: 'PagedAttention' },
  { key: 'prefix_cache',  label: 'Prefix Cache' },
];

function autoDetectVariant(model: ModelSpec): KVVariant {
  const at = model.architecture.attentionType;
  if (at === 'mla') return 'standard'; // MLA is handled in main formula
  return 'standard';
}

export function KVCacheConfig({ model, kvPrecision, contextLength, batchSize, className }: KVCacheConfigProps) {
  const [variant, setVariant] = React.useState<KVVariant>(() => autoDetectVariant(model));
  const [windowSize, setWindowSize] = React.useState(4096);
  const [reusePercent, setReusePercent] = React.useState(50);

  const bytesPerParam = KV_BYTES[kvPrecision] ?? 2;
  const arch = model.architecture;

  const input = {
    numLayers: arch.numLayers,
    batchSize,
    seqLen: contextLength,
    numKVHeads: arch.numKeyValueHeads,
    headDim: arch.headDim,
    bytesPerParam,
  };

  const result = computeKVVariant(input, variant, { windowSize, reusePercent });

  // KV per token per layer reference
  const kvPerTokenPerLayer = 2 * arch.numKeyValueHeads * arch.headDim * bytesPerParam;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fg-default">KV Cache Strategy</span>
        <span className="text-[10px] font-mono text-fg-muted">
          {(kvPerTokenPerLayer / 1024).toFixed(1)} KB/token/layer
        </span>
      </div>

      {/* Attention type badge */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-fg-muted">Attention:</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-emphasis text-fg-default uppercase">
          {arch.attentionType}
        </span>
        {arch.attentionType === 'gqa' && (
          <span className="text-[10px] text-fg-muted">
            ({arch.numKeyValueHeads} KV heads / {arch.numAttentionHeads} Q heads)
          </span>
        )}
      </div>

      {/* Variant selector */}
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="KV cache variant">
        {VARIANT_OPTIONS.map(opt => {
          const isSelected = variant === opt.key;
          return (
            <button
              key={opt.key}
              role="radio"
              aria-checked={isSelected}
              onClick={() => setVariant(opt.key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Sliding window size */}
      {variant === 'sliding_window' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-fg-muted">
            Window size: <span className="font-mono">{windowSize.toLocaleString()}</span> tokens
          </label>
          <input
            type="range"
            min={512}
            max={contextLength}
            step={512}
            value={windowSize}
            onChange={e => setWindowSize(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      )}

      {/* Prefix cache reuse slider */}
      {variant === 'prefix_cache' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-fg-muted">
            Prefix reuse: <span className="font-mono">{reusePercent}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={reusePercent}
            onChange={e => setReusePercent(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <p className="text-[10px] text-green-500 font-mono">
            Saves {(result.rawBytes * (reusePercent / 100) / 1e9).toFixed(2)} GB vs no reuse
          </p>
        </div>
      )}

      {/* Result */}
      <div className="flex items-center justify-between rounded-md bg-bg-muted px-3 py-2">
        <span className="text-xs text-fg-muted">Estimated KV</span>
        <span className="text-sm font-mono font-semibold text-fg-primary">
          {result.kvCacheGB.toFixed(2)} GB
        </span>
      </div>

      {result.note && (
        <p className="text-[10px] text-fg-muted italic">{result.note}</p>
      )}
    </div>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/primitives/InfoTooltip';

interface KVPrecisionPickerProps {
  value: string;
  onChange: (precision: string) => void;
  /** KV cache GB at current context with FP16 (baseline), used to show savings */
  fp16KvCacheGB?: number;
  className?: string;
}

interface KVOption {
  key: string;
  label: string;
  bytesPerParam: number;
  qualityHint?: string;
}

const KV_PRECISION_OPTIONS: KVOption[] = [
  { key: 'fp32',      label: 'FP32',      bytesPerParam: 4.0 },
  { key: 'fp16',      label: 'FP16/BF16', bytesPerParam: 2.0 },
  { key: 'fp8_e4m3',  label: 'FP8 E4M3',  bytesPerParam: 1.0, qualityHint: 'FP8 KV: <0.1% ppl increase' },
  { key: 'fp8_e5m2',  label: 'FP8 E5M2',  bytesPerParam: 1.0, qualityHint: 'FP8 KV: <0.1% ppl increase' },
  { key: 'int8',      label: 'INT8',       bytesPerParam: 1.0, qualityHint: 'INT8 KV: ~0.1–0.3% ppl increase' },
  { key: 'int4',      label: 'INT4',       bytesPerParam: 0.5, qualityHint: 'INT4 KV: 0.5–2% ppl, visible degradation >32K' },
];

export function KVPrecisionPicker({ value, onChange, fp16KvCacheGB, className }: KVPrecisionPickerProps) {
  const selectedOption = KV_PRECISION_OPTIONS.find(o => o.key === value) ?? KV_PRECISION_OPTIONS[1];
  const fp16Option = KV_PRECISION_OPTIONS.find(o => o.key === 'fp16')!;

  // VRAM savings vs FP16 baseline
  const savingsGB = fp16KvCacheGB != null && selectedOption.bytesPerParam < fp16Option.bytesPerParam
    ? fp16KvCacheGB * (1 - selectedOption.bytesPerParam / fp16Option.bytesPerParam)
    : null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = KV_PRECISION_OPTIONS.map(o => o.key);
    const currentIndex = keys.indexOf(value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(keys[(currentIndex + 1) % keys.length]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(keys[(currentIndex - 1 + keys.length) % keys.length]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(keys[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(keys[keys.length - 1]);
    }
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-fg-default flex items-center gap-1.5">
        KV Cache Precision
        <InfoTooltip paramKey="kvCachePrecision" />
      </label>

      <div
        role="radiogroup"
        aria-label="KV cache precision"
        className="flex flex-wrap gap-1"
        onKeyDown={handleKeyDown}
      >
        {KV_PRECISION_OPTIONS.map(option => {
          const isSelected = value === option.key;
          return (
            <button
              key={option.key}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(option.key)}
              title={option.qualityHint}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-fast',
                'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis hover:border-border-default'
              )}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span>{option.label}</span>
                <span className="text-[9px] font-mono opacity-70">{option.bytesPerParam}B</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quality hint */}
      {selectedOption.qualityHint && (
        <p className="text-[10px] text-fg-muted italic">{selectedOption.qualityHint}</p>
      )}

      {/* VRAM savings vs FP16 */}
      {savingsGB !== null && savingsGB > 0 && (
        <p className="text-[10px] text-green-500 font-mono">
          Saves {savingsGB.toFixed(2)} GB vs FP16 KV
        </p>
      )}
    </div>
  );
}

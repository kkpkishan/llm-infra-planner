import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/primitives/input';
import { InfoTooltip } from '@/components/primitives/InfoTooltip';

interface BatchConfigProps {
  value: number;
  onChange: (value: number) => void;
  /** Free VRAM available for KV cache (GB), used to compute max concurrency */
  freeVRAMGB?: number;
  /** KV memory per sequence in GB (for current context length) */
  kvPerSeqGB?: number;
  className?: string;
}

export function BatchConfig({ value, onChange, freeVRAMGB, kvPerSeqGB, className }: BatchConfigProps) {
  const [continuous, setContinuous] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value.toString());
  const [maxConcurrent, setMaxConcurrent] = React.useState(64);
  const [avgOutputTokens, setAvgOutputTokens] = React.useState(256);

  // Max achievable concurrency from free VRAM
  const maxAchievable = React.useMemo(() => {
    if (!freeVRAMGB || !kvPerSeqGB || kvPerSeqGB <= 0) return null;
    return Math.floor(freeVRAMGB / kvPerSeqGB);
  }, [freeVRAMGB, kvPerSeqGB]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    onChange(v);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(parsed, 256));
      onChange(clamped);
      setInputValue(clamped.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleInputBlur();
    else if (e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(value + 1, 256)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(value - 1, 1)); }
  };

  React.useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Header with continuous batching toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="batch-slider" className="text-xs font-medium text-fg-default flex items-center gap-1.5">
          Batch Size
          <InfoTooltip paramKey="batchSize" />
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <span className="text-[10px] text-fg-muted">Continuous batching</span>
          <button
            role="switch"
            aria-checked={continuous}
            onClick={() => setContinuous(v => !v)}
            className={cn(
              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              continuous ? 'bg-accent' : 'bg-bg-emphasis'
            )}
          >
            <span
              className={cn(
                'inline-block h-3 w-3 rounded-full bg-white shadow transition-transform',
                continuous ? 'translate-x-3.5' : 'translate-x-0.5'
              )}
            />
          </button>
        </label>
      </div>

      {!continuous ? (
        // Static batch mode
        <>
          <div className="flex items-center gap-3">
            <input
              id="batch-slider"
              type="range"
              min={1}
              max={256}
              step={1}
              value={value}
              onChange={handleSliderChange}
              className={cn(
                'flex-1 cursor-pointer appearance-none bg-transparent',
                '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis',
                '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-bg-emphasis',
                '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
                '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-valuemin={1}
              aria-valuemax={256}
              aria-valuenow={value}
              aria-valuetext={`Batch size ${value}`}
            />
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="w-16 font-mono text-sm text-center"
              aria-label="Batch size numeric input"
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-fg-muted px-0.5">
            <span>1</span>
            <span>256</span>
          </div>
        </>
      ) : (
        // Continuous batching mode
        <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-muted p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-fg-muted">max_concurrent_seqs</label>
              <Input
                type="number"
                min={1}
                max={1024}
                value={maxConcurrent}
                onChange={e => setMaxConcurrent(Math.max(1, Math.min(1024, parseInt(e.target.value, 10) || 1)))}
                className="font-mono text-sm"
                aria-label="Max concurrent sequences"
              />
              <span className="text-[9px] text-fg-muted">1 – 1024</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-fg-muted">avg_output_tokens</label>
              <Input
                type="number"
                min={16}
                max={4096}
                value={avgOutputTokens}
                onChange={e => setAvgOutputTokens(Math.max(16, Math.min(4096, parseInt(e.target.value, 10) || 16)))}
                className="font-mono text-sm"
                aria-label="Average output tokens"
              />
              <span className="text-[9px] text-fg-muted">16 – 4096</span>
            </div>
          </div>

          {maxAchievable !== null && (
            <p className="text-xs text-fg-default font-mono">
              Max achievable concurrency:{' '}
              <span className="font-semibold text-accent">{maxAchievable}</span>
              {maxAchievable < maxConcurrent && (
                <span className="text-amber-500 ml-1">(VRAM limited)</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

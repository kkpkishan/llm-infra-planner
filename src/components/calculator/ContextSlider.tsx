import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/primitives/input';
import { InfoTooltip } from '@/components/primitives/InfoTooltip';

interface ContextSliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
}

// Snap points from 512 to 10M
const CONTEXT_STEPS = [
  512, 1024, 2048, 4096, 8192, 16384, 32768, 65536,
  131072, 262144, 524288, 1048576, 2097152, 4194304, 10485760,
];

function findNearestStep(value: number): number {
  return CONTEXT_STEPS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

function valueToSliderIndex(value: number): number {
  const nearest = findNearestStep(value);
  const idx = CONTEXT_STEPS.indexOf(nearest);
  return idx >= 0 ? idx : 0;
}

function formatContextLabel(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1024) return `${n / 1024}K`;
  return String(n);
}

export function ContextSlider({ value, max, onChange, className }: ContextSliderProps) {
  const [inputValue, setInputValue] = React.useState(value.toString());

  // Effective max index based on model's maxContextLength
  let maxStepIdx = -1;
  for (let i = CONTEXT_STEPS.length - 1; i >= 0; i--) {
    if (CONTEXT_STEPS[i] <= max) { maxStepIdx = i; break; }
  }
  const effectiveMaxIndex = maxStepIdx >= 0 ? maxStepIdx : CONTEXT_STEPS.length - 1;
  const effectiveMax = CONTEXT_STEPS[effectiveMaxIndex];

  const sliderIndex = Math.min(valueToSliderIndex(value), effectiveMaxIndex);

  // Position of model-max indicator (0–100%)
  const modelMaxPercent = effectiveMaxIndex > 0
    ? (effectiveMaxIndex / (CONTEXT_STEPS.length - 1)) * 100
    : 100;

  // Warning when context exceeds model's trained max
  const showWarning = value > max;
  const maxLabel = formatContextLabel(max);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    const newValue = CONTEXT_STEPS[Math.min(idx, effectiveMaxIndex)];
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.max(CONTEXT_STEPS[0], Math.min(parsed, effectiveMax));
      const snapped = findNearestStep(clamped);
      onChange(snapped);
      setInputValue(snapped.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleInputBlur();
  };

  React.useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor="context-slider" className="text-xs font-medium text-fg-default flex items-center gap-1.5">
        Context Length
        <InfoTooltip paramKey="contextLength" />
      </label>

      <div className="relative">
        <div className="relative pt-8 pb-2">
          {/* Value pill above thumb */}
          <div
            className="absolute top-0 px-2 py-1 rounded-md bg-accent text-white text-xs font-mono font-semibold pointer-events-none transition-all duration-200"
            style={{ left: `calc(${(sliderIndex / (CONTEXT_STEPS.length - 1)) * 100}% - 20px)` }}
          >
            {formatContextLabel(value)}
          </div>

          {/* Slider track wrapper — for model-max indicator */}
          <div className="relative">
            {/* Model-max vertical indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 opacity-70 pointer-events-none z-10"
              style={{ left: `${modelMaxPercent}%` }}
              title={`Model max: ${maxLabel}`}
            />

            <input
              id="context-slider"
              type="range"
              min={0}
              max={CONTEXT_STEPS.length - 1}
              step={1}
              value={sliderIndex}
              onChange={handleSliderChange}
              className={cn(
                'w-full cursor-pointer appearance-none bg-transparent',
                '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis',
                '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-bg-emphasis',
                '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
                '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-valuemin={CONTEXT_STEPS[0]}
              aria-valuemax={effectiveMax}
              aria-valuenow={value}
              aria-valuetext={`${value.toLocaleString()} tokens`}
            />
          </div>

          {/* Step markers — show every other label to avoid crowding */}
          <div className="flex justify-between mt-1 px-0.5">
            {CONTEXT_STEPS.map((step, i) => (
              <div
                key={step}
                className="flex flex-col items-center"
                style={{ width: `${100 / (CONTEXT_STEPS.length - 1)}%` }}
              >
                <div className={cn('w-px h-1', i <= effectiveMaxIndex ? 'bg-border-subtle' : 'bg-transparent')} />
                {i % 3 === 0 && i <= effectiveMaxIndex && (
                  <span className="text-[8px] font-mono text-fg-muted mt-0.5 whitespace-nowrap">
                    {formatContextLabel(step)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Numeric input */}
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-28 font-mono text-sm"
            aria-label="Context length numeric input"
          />
          <span className="text-xs text-fg-muted">tokens</span>
        </div>

        {/* Warning when context exceeds model max */}
        {showWarning && (
          <p className="mt-1.5 text-xs text-amber-500 flex items-center gap-1" role="alert">
            ⚠ Quality may degrade beyond {maxLabel} without fine-tuning
          </p>
        )}
      </div>
    </div>
  );
}

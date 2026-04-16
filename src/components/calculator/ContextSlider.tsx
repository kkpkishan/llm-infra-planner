import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/primitives/input';

interface ContextSliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
}

// Powers of 2 from 1024 to 131072
const CONTEXT_STEPS = [
  1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072
];

function findNearestStep(value: number): number {
  return CONTEXT_STEPS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

function valueToSliderPosition(value: number): number {
  const index = CONTEXT_STEPS.indexOf(findNearestStep(value));
  return index >= 0 ? index : 0;
}

function sliderPositionToValue(position: number): number {
  return CONTEXT_STEPS[Math.round(position)] || CONTEXT_STEPS[0];
}

export function ContextSlider({ value, max, onChange, className }: ContextSliderProps) {
  const [inputValue, setInputValue] = React.useState(value.toString());
  const sliderRef = React.useRef<HTMLDivElement>(null);
  
  // Constrain max to available steps
  const maxStep = CONTEXT_STEPS.findIndex(step => step > max);
  const effectiveMaxIndex = maxStep === -1 ? CONTEXT_STEPS.length - 1 : maxStep - 1;
  const effectiveMax = CONTEXT_STEPS[effectiveMaxIndex];
  
  const sliderPosition = valueToSliderPosition(Math.min(value, effectiveMax));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const position = parseFloat(e.target.value);
    const newValue = sliderPositionToValue(position);
    onChange(Math.min(newValue, effectiveMax));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(CONTEXT_STEPS[0], Math.min(parsed, effectiveMax));
      const snapped = findNearestStep(clamped);
      onChange(snapped);
      setInputValue(snapped.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  React.useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  // Format number with commas
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor="context-slider" className="text-xs font-medium text-fg-default">
        Context Length
      </label>

      <div className="relative">
        {/* Slider */}
        <div ref={sliderRef} className="relative pt-8 pb-2">
          {/* Value pill above thumb */}
          <div
            className="absolute top-0 px-2 py-1 rounded-md bg-accent text-white text-xs font-mono font-semibold pointer-events-none transition-all duration-200"
            style={{
              left: `calc(${(sliderPosition / effectiveMaxIndex) * 100}% - 24px)`,
            }}
          >
            {formatNumber(value)}
          </div>

          <input
            id="context-slider"
            type="range"
            min={0}
            max={effectiveMaxIndex}
            step={1}
            value={sliderPosition}
            onChange={handleSliderChange}
            className={cn(
              'w-full cursor-pointer appearance-none bg-transparent',
              // Track
              '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis',
              '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-bg-emphasis',
              // Thumb
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
              '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md',
              // Focus
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
            aria-valuemin={CONTEXT_STEPS[0]}
            aria-valuemax={effectiveMax}
            aria-valuenow={value}
            aria-valuetext={`${formatNumber(value)} tokens`}
          />

          {/* Step markers */}
          <div className="flex justify-between mt-1 px-0.5">
            {CONTEXT_STEPS.slice(0, effectiveMaxIndex + 1).map((step, i) => (
              <div
                key={step}
                className="flex flex-col items-center"
                style={{ width: `${100 / effectiveMaxIndex}%` }}
              >
                <div className="w-px h-1 bg-border-subtle" />
                {i % 2 === 0 && (
                  <span className="text-[9px] font-mono text-fg-muted mt-0.5">
                    {step >= 1024 ? `${step / 1024}k` : step}
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
            className="w-24 font-mono text-sm"
            aria-label="Context length numeric input"
          />
          <span className="text-xs text-fg-muted">tokens</span>
        </div>
      </div>
    </div>
  );
}

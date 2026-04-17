import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/primitives/input';
import { InfoTooltip } from '@/components/primitives/InfoTooltip';

interface BatchSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function BatchSlider({ value, onChange, className }: BatchSliderProps) {
  const [inputValue, setInputValue] = React.useState(value.toString());

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(parsed, 32));
      onChange(clamped);
      setInputValue(clamped.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(value + 1, 32));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(value - 1, 1));
    }
  };

  React.useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor="batch-slider" className="text-xs font-medium text-fg-default flex items-center gap-1.5">
        Batch Size
        <InfoTooltip paramKey="batchSize" />
      </label>

      <div className="flex items-center gap-3">
        {/* Slider */}
        <input
          id="batch-slider"
          type="range"
          min={1}
          max={32}
          step={1}
          value={value}
          onChange={handleSliderChange}
          className={cn(
            'flex-1 cursor-pointer appearance-none bg-transparent',
            // Track
            '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis',
            '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-bg-emphasis',
            // Thumb
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
            '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md',
            // Focus
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          aria-valuemin={1}
          aria-valuemax={32}
          aria-valuenow={value}
          aria-valuetext={`Batch size ${value}`}
        />

        {/* Numeric input */}
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

      {/* Min/Max labels */}
      <div className="flex justify-between text-[9px] font-mono text-fg-muted px-0.5">
        <span>1</span>
        <span>32</span>
      </div>
    </div>
  );
}

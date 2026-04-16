import * as React from 'react';
import { cn } from '@/lib/utils';

interface PrecisionPickerProps {
  value: string;
  onChange: (precision: string) => void;
  className?: string;
}

const PRECISION_OPTIONS = [
  { key: 'fp16', label: 'FP16', bytes: 2.0 },
  { key: 'bf16', label: 'BF16', bytes: 2.0 },
  { key: 'int8', label: 'INT8', bytes: 1.0 },
  { key: 'int4', label: 'INT4', bytes: 0.5 },
  { key: 'q4_k_m', label: 'Q4_K_M', bytes: 0.606, isGGUF: true },
  { key: 'q5_k_m', label: 'Q5_K_M', bytes: 0.711, isGGUF: true },
  { key: 'q8_0', label: 'Q8_0', bytes: 1.0625, isGGUF: true },
];

export function PrecisionPicker({ value, onChange, className }: PrecisionPickerProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = PRECISION_OPTIONS.map(o => o.key);
    const currentIndex = keys.indexOf(value);
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % keys.length;
      onChange(keys[nextIndex]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + keys.length) % keys.length;
      onChange(keys[prevIndex]);
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
      <label className="text-xs font-medium text-fg-default">
        Weight Precision
      </label>

      <div
        role="radiogroup"
        aria-label="Weight precision"
        className="flex flex-col gap-1"
        onKeyDown={handleKeyDown}
      >
        {/* Standard precisions */}
        <div className="flex gap-1">
          {PRECISION_OPTIONS.filter(opt => !opt.isGGUF).map(option => {
            const isSelected = value === option.key;
            return (
              <button
                key={option.key}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onChange(option.key)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-fast',
                  'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis hover:border-border-default'
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>{option.label}</span>
                  <span className="text-[10px] font-mono opacity-70">
                    {option.bytes}B
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* GGUF precisions */}
        <div className="flex gap-1">
          <span className="text-[10px] font-medium text-fg-muted px-2 py-2 flex items-center">
            GGUF
          </span>
          {PRECISION_OPTIONS.filter(opt => opt.isGGUF).map(option => {
            const isSelected = value === option.key;
            return (
              <button
                key={option.key}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onChange(option.key)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-fast',
                  'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis hover:border-border-default'
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>{option.label}</span>
                  <span className="text-[10px] font-mono opacity-70">
                    {option.bytes.toFixed(3)}B
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

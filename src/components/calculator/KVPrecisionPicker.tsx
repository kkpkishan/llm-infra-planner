import * as React from 'react';
import { cn } from '@/lib/utils';

interface KVPrecisionPickerProps {
  value: string;
  onChange: (precision: string) => void;
  className?: string;
}

const KV_PRECISION_OPTIONS = [
  { key: 'fp16', label: 'FP16', bytes: 2.0 },
  { key: 'int8', label: 'INT8', bytes: 1.0 },
  { key: 'q4', label: 'Q4', bytes: 0.5 },
];

export function KVPrecisionPicker({ value, onChange, className }: KVPrecisionPickerProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = KV_PRECISION_OPTIONS.map(o => o.key);
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
        KV Cache Precision
      </label>

      <div
        role="radiogroup"
        aria-label="KV cache precision"
        className="flex gap-1"
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
    </div>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/primitives/InfoTooltip';
import {
  QUANTIZATION_TYPES, DEFAULT_QUANT_KEYS, FAMILY_LABELS,
  type QuantType,
} from '@/data/quantization-types';

interface PrecisionPickerProps {
  value: string;
  onChange: (precision: string) => void;
  className?: string;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-[9px] leading-none" aria-label={`${count} out of 5 quality stars`}>
      {'⭐'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  );
}

const FAMILY_ORDER: QuantType['family'][] = [
  'native', 'gguf-k', 'gguf-i', 'gguf-t', 'gptq', 'awq', 'bnb', 'exl2', 'other',
];

export function PrecisionPicker({ value, onChange, className }: PrecisionPickerProps) {
  const [showAll, setShowAll] = React.useState(false);

  const defaultQuants = QUANTIZATION_TYPES.filter(q => DEFAULT_QUANT_KEYS.includes(q.key));

  // Build grouped list for expanded view
  const groupedQuants = FAMILY_ORDER.map(family => ({
    family,
    label: FAMILY_LABELS[family],
    items: QUANTIZATION_TYPES.filter(q => q.family === family),
  })).filter(g => g.items.length > 0);

  // All visible quants in flat order (for keyboard nav)
  const visibleQuants = showAll
    ? groupedQuants.flatMap(g => g.items)
    : defaultQuants;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = visibleQuants.map(q => q.key);
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

  // If current value is not in default list, auto-expand
  React.useEffect(() => {
    if (!DEFAULT_QUANT_KEYS.includes(value)) setShowAll(true);
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-fg-default flex items-center gap-1.5">
        Weight Precision
        <InfoTooltip paramKey="weightPrecision" />
      </label>

      <div
        role="radiogroup"
        aria-label="Weight precision"
        className="flex flex-col gap-1"
        onKeyDown={handleKeyDown}
      >
        {showAll ? (
          // Expanded: grouped view
          groupedQuants.map(group => (
            <div key={group.family} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-fg-muted uppercase tracking-wider px-1 pt-1">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-1">
                {group.items.map(quant => (
                  <QuantButton key={quant.key} quant={quant} isSelected={value === quant.key} onSelect={onChange} />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Collapsed: default options in a single row
          <div className="flex flex-wrap gap-1">
            {defaultQuants.map(quant => (
              <QuantButton key={quant.key} quant={quant} isSelected={value === quant.key} onSelect={onChange} />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAll(v => !v)}
        className="text-[11px] text-accent hover:underline self-start mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {showAll ? '▲ Show less' : '▼ Show all quantizations'}
      </button>
    </div>
  );
}

interface QuantButtonProps {
  quant: QuantType;
  isSelected: boolean;
  onSelect: (key: string) => void;
}

function QuantButton({ quant, isSelected, onSelect }: QuantButtonProps) {
  return (
    <button
      role="radio"
      aria-checked={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onSelect(quant.key)}
      title={quant.hardwareNote}
      className={cn(
        'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-fast',
        'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected
          ? 'bg-accent text-white border-accent'
          : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis hover:border-border-default'
      )}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span>{quant.label}</span>
        <span className="text-[9px] font-mono opacity-70">{quant.bytesPerParam}B</span>
        <Stars count={quant.qualityStars} />
      </div>
    </button>
  );
}

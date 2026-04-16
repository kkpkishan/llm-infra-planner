import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GPUFitResult } from '@/lib/formulas/types';

interface GPUCardProps {
  fit: GPUFitResult;
  isRecommended?: boolean;
  className?: string;
}

const FIT_CONFIG = {
  green: {
    icon: CheckCircle,
    label: 'Fits',
    iconColor: 'text-green-600 dark:text-green-400',
    barColor: 'bg-green-500',
    badgeBg: 'bg-green-500/10 text-green-700 dark:text-green-400',
  },
  yellow: {
    icon: AlertTriangle,
    label: 'Tight',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    barColor: 'bg-yellow-500',
    badgeBg: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  red: {
    icon: XCircle,
    label: 'Overflow',
    iconColor: 'text-red-600 dark:text-red-400',
    barColor: 'bg-red-500',
    badgeBg: 'bg-red-500/10 text-red-700 dark:text-red-400',
  },
};

export function GPUCard({ fit, isRecommended, className }: GPUCardProps) {
  const { gpu, fitStatus, utilizationPercent, freeVRAMGB, tokensPerSecond } = fit;
  const config = FIT_CONFIG[fitStatus];
  const FitIcon = config.icon;

  const price = gpu.streetUSD ?? gpu.msrpUSD;
  const priceLabel = price
    ? price >= 1000
      ? `$${(price / 1000).toFixed(1)}k`
      : `$${price}`
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex flex-col gap-3 transition-colors',
        isRecommended
          ? 'border-accent/40 bg-accent/5'
          : 'border-border-subtle bg-bg-muted hover:border-border-default',
        className
      )}
    >
      {/* Header: fit badge + name + price */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          {/* Fit badge — icon + text, not color alone */}
          <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md w-fit', config.badgeBg)}>
            <FitIcon size={12} className={config.iconColor} aria-hidden="true" />
            <span>{config.label}</span>
          </div>
          <h3 className="text-sm font-semibold text-fg-primary leading-tight truncate">
            {gpu.name}
          </h3>
          <p className="text-[11px] text-fg-muted font-mono">
            {gpu.memoryGB} GB · {gpu.vendor.toUpperCase()}
          </p>
        </div>
        {priceLabel && (
          <span className="text-sm font-mono font-semibold text-fg-primary flex-shrink-0">
            {priceLabel}
          </span>
        )}
      </div>

      {/* Utilization bar — 4px */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-mono text-fg-muted">
          <span>{Math.min(utilizationPercent, 100)}% used</span>
          <span>{freeVRAMGB.toFixed(1)} GB free</span>
        </div>
        <div className="h-1 rounded-full bg-bg-emphasis overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', config.barColor)}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            role="progressbar"
            aria-valuenow={utilizationPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${utilizationPercent}% VRAM utilization`}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted uppercase tracking-wide">BW</span>
          <span className="text-xs font-mono font-medium text-fg-default">
            {gpu.memoryBandwidthGBs} GB/s
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted uppercase tracking-wide">FP16</span>
          <span className="text-xs font-mono font-medium text-fg-default">
            {gpu.flops.fp16} TF
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted uppercase tracking-wide">TDP</span>
          <span className="text-xs font-mono font-medium text-fg-default">
            {gpu.tdpWatts}W
          </span>
        </div>
      </div>

      {/* Throughput estimate */}
      {tokensPerSecond != null && (
        <div className="flex items-center justify-between text-xs border-t border-border-subtle pt-2">
          <span className="text-fg-muted">Est. throughput</span>
          <span className="font-mono font-semibold text-fg-primary">
            ~{tokensPerSecond.toLocaleString()} tok/s
          </span>
        </div>
      )}
    </div>
  );
}

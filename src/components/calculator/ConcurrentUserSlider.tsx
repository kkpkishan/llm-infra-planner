import * as React from 'react';
import { cn } from '@/lib/utils';

// Log-scale snap points
const SNAP_POINTS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

function formatUsers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
}

function valueToIndex(value: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < SNAP_POINTS.length; i++) {
    const d = Math.abs(SNAP_POINTS[i] - value);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

interface ConcurrentUserSliderProps {
  value: number;
  onChange: (n: number) => void;
  maxCapacity: number;
  totalVRAMGB: number;
  usedVRAMGB: number;
}

export function ConcurrentUserSlider({
  value,
  onChange,
  maxCapacity,
  totalVRAMGB,
  usedVRAMGB,
}: ConcurrentUserSliderProps) {
  const [inputVal, setInputVal] = React.useState(String(value));
  const sliderIndex = valueToIndex(value);
  const capacityPct = maxCapacity > 0 ? (value / maxCapacity) * 100 : 0;
  const vramPct = totalVRAMGB > 0 ? (usedVRAMGB / totalVRAMGB) * 100 : 0;

  // Color zone based on capacity
  const zone: 'green' | 'yellow' | 'red' =
    capacityPct > 100 ? 'red' : capacityPct > 80 ? 'yellow' : 'green';

  const zoneColor = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }[zone];

  const zoneBorder = {
    green: 'border-green-500',
    yellow: 'border-yellow-500',
    red: 'border-red-500',
  }[zone];

  const zoneText = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  }[zone];

  React.useEffect(() => { setInputVal(String(value)); }, [value]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    onChange(SNAP_POINTS[idx]);
  };

  const handleInputBlur = () => {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n >= 1) {
      const snapped = SNAP_POINTS.reduce((prev, curr) =>
        Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev
      );
      onChange(snapped);
      setInputVal(String(snapped));
    } else {
      setInputVal(String(value));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-fg-default">Concurrent Users</label>
        <span className={cn('text-xs font-mono font-semibold', zoneText)}>
          {formatUsers(value)} / {formatUsers(maxCapacity)} max
        </span>
      </div>

      {/* Slider */}
      <div className="relative pt-6 pb-1">
        {/* Value pill */}
        <div
          className={cn('absolute top-0 px-2 py-0.5 rounded text-white text-xs font-mono font-semibold pointer-events-none', zoneColor)}
          style={{ left: `calc(${(sliderIndex / (SNAP_POINTS.length - 1)) * 100}% - 16px)` }}
        >
          {formatUsers(value)}
        </div>
        <input
          type="range"
          min={0}
          max={SNAP_POINTS.length - 1}
          step={1}
          value={sliderIndex}
          onChange={handleSlider}
          className={cn(
            'w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
            zone === 'green' && '[&::-webkit-slider-thumb]:bg-green-500',
            zone === 'yellow' && '[&::-webkit-slider-thumb]:bg-yellow-500',
            zone === 'red' && '[&::-webkit-slider-thumb]:bg-red-500',
          )}
          aria-label="Concurrent users"
          aria-valuemin={1}
          aria-valuemax={10000}
          aria-valuenow={value}
        />
        {/* Snap point markers */}
        <div className="flex justify-between mt-1">
          {SNAP_POINTS.map((pt, i) => (
            <div key={pt} className="flex flex-col items-center" style={{ width: `${100 / (SNAP_POINTS.length - 1)}%` }}>
              <div className="w-px h-1 bg-border-subtle" />
              {(i === 0 || i === 4 || i === 8 || i === SNAP_POINTS.length - 1) && (
                <span className="text-[8px] font-mono text-fg-muted mt-0.5">{formatUsers(pt)}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Numeric input */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={10000}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={e => e.key === 'Enter' && handleInputBlur()}
          className={cn(
            'w-24 h-8 px-2 rounded border bg-bg-muted text-sm font-mono text-fg-primary focus:outline-none focus:ring-1 focus:ring-ring',
            zoneBorder,
          )}
          aria-label="Concurrent users numeric input"
        />
        <span className="text-xs text-fg-muted">users</span>
        {zone === 'red' && (
          <span className="text-xs text-red-500 font-medium">
            ⚠ Exceeds capacity ({Math.ceil(value / maxCapacity)}× GPUs needed)
          </span>
        )}
      </div>

      {/* VRAM usage bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-fg-muted">
          <span>VRAM usage</span>
          <span className="font-mono">{usedVRAMGB.toFixed(1)} / {totalVRAMGB} GB ({Math.round(vramPct)}%)</span>
        </div>
        <div className="h-2 rounded-full bg-bg-emphasis overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', vramPct > 100 ? 'bg-red-500' : vramPct > 80 ? 'bg-yellow-500' : 'bg-green-500')}
            style={{ width: `${Math.min(vramPct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

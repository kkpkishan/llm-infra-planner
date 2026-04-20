import * as React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computePower, PUE_PRESETS, type PUEPreset } from '@/lib/formulas/power';

interface PowerPanelProps {
  gpuCount: number;
  gpuTDPWatts: number;
  className?: string;
}

function KVRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-fg-muted flex-shrink-0 w-40">{label}</span>
      <span className={cn('text-xs font-mono text-right break-all', highlight ? 'text-accent font-semibold' : 'text-fg-default')}>
        {value}
      </span>
    </div>
  );
}

const PUE_LABELS: Record<PUEPreset, string> = {
  hyperscale: 'Hyperscale (1.1)',
  colo:       'Colo (1.4)',
  enterprise: 'Enterprise (1.8)',
  office:     'Office (2.2)',
  custom:     'Custom',
};

export function PowerPanel({ gpuCount, gpuTDPWatts, className }: PowerPanelProps) {
  const [puePreset, setPuePreset] = React.useState<PUEPreset>('colo');
  const [customPUE, setCustomPUE] = React.useState(1.5);
  const [dutyCycle, setDutyCycle] = React.useState(0.7);
  const [electricityCost, setElectricityCost] = React.useState(0.10);

  const pue = puePreset === 'custom' ? customPUE : PUE_PRESETS[puePreset];
  const result = computePower(gpuCount, gpuTDPWatts, pue, dutyCycle, electricityCost);

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Power &amp; Cooling
        </h3>
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-4">
        {/* GPU TDP (read-only, auto-filled) */}
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-fg-muted w-40 flex-shrink-0">GPU TDP</label>
          <span className="text-xs font-mono text-fg-default">{gpuTDPWatts} W × {gpuCount}</span>
        </div>

        {/* Duty Cycle */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="duty-cycle" className="text-xs text-fg-muted">Duty Cycle</label>
            <span className="text-xs font-mono text-fg-default">{(dutyCycle * 100).toFixed(0)}%</span>
          </div>
          <input
            id="duty-cycle"
            type="range"
            min={0.3}
            max={1.0}
            step={0.05}
            value={dutyCycle}
            onChange={(e) => setDutyCycle(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-fg-muted">
            <span>30%</span><span>100%</span>
          </div>
        </div>

        {/* PUE Selector */}
        <div className="flex flex-col gap-1">
          <label htmlFor="pue-select" className="text-xs text-fg-muted">PUE (Power Usage Effectiveness)</label>
          <select
            id="pue-select"
            value={puePreset}
            onChange={(e) => setPuePreset(e.target.value as PUEPreset)}
            className="h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {(Object.keys(PUE_LABELS) as PUEPreset[]).map((key) => (
              <option key={key} value={key}>{PUE_LABELS[key]}</option>
            ))}
          </select>
          {puePreset === 'custom' && (
            <input
              type="number"
              min={1.0}
              max={3.0}
              step={0.05}
              value={customPUE}
              onChange={(e) => setCustomPUE(parseFloat(e.target.value) || 1.0)}
              className="h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Custom PUE"
            />
          )}
        </div>

        {/* Electricity Cost */}
        <div className="flex items-center gap-2">
          <label htmlFor="elec-cost" className="text-xs text-fg-muted w-40 flex-shrink-0">Electricity $/kWh</label>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-fg-muted">$</span>
            <input
              id="elec-cost"
              type="number"
              min={0.03}
              max={0.50}
              step={0.01}
              value={electricityCost}
              onChange={(e) => setElectricityCost(parseFloat(e.target.value) || 0.10)}
              className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs text-fg-muted">/kWh</span>
          </div>
        </div>
      </div>

      {/* Outputs */}
      <div className="border-t border-border-subtle pt-3 flex flex-col">
        <KVRow label="Facility Power" value={`${result.facilityPowerKW.toFixed(2)} kW`} highlight />
        <KVRow label="Annual Energy" value={`${(result.annualKWh / 1000).toFixed(1)} MWh`} />
        <KVRow label="Annual Cost" value={`$${result.annualCostUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} highlight />
        <KVRow label="Per-GPU Hourly" value={`$${result.perGPUHourlyCostUSD.toFixed(4)}/hr`} />
        <KVRow label="PSU Recommended" value={`${result.psuRecommendedWatts.toFixed(0)} W`} />
      </div>
    </div>
  );
}

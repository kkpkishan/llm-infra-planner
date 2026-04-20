import * as React from 'react';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeTCO } from '@/lib/formulas/tco';

interface TCOPanelProps {
  gpuCount: number;
  gpuTDPWatts: number;
  cloudHourlyCostUSD: number;  // from cloud table selection
  className?: string;
}

function KVRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-fg-muted flex-shrink-0 w-44">{label}</span>
      <span className={cn('text-xs font-mono text-right break-all', highlight ? 'text-accent font-semibold' : 'text-fg-default')}>
        {value}
      </span>
    </div>
  );
}

const DEP_YEARS_OPTIONS = [3, 5, 7];

export function TCOPanel({ gpuCount, gpuTDPWatts, cloudHourlyCostUSD, className }: TCOPanelProps) {
  const [capex, setCapex] = React.useState(30000);
  const [depYears, setDepYears] = React.useState(3);
  const [pue, setPue] = React.useState(1.4);
  const [electricityCost, setElectricityCost] = React.useState(0.10);
  const [coloPerRack, setColoPerRack] = React.useState(1500);
  const [maintenancePct, setMaintenancePct] = React.useState(5);
  const [staffCost, setStaffCost] = React.useState(50000);
  const [utilization, setUtilization] = React.useState(0.7);

  const result = computeTCO(
    capex,
    depYears,
    pue,
    electricityCost,
    coloPerRack,
    maintenancePct,
    staffCost,
    gpuCount,
    gpuTDPWatts,
    0.7,  // duty cycle
    utilization,
    cloudHourlyCostUSD
  );

  const breakevenLabel = result.breakevenMonths === -1
    ? 'Never (>36 mo)'
    : `Month ${result.breakevenMonths}`;

  const savings = result.cloudHourlyCostUSD > result.onPremHourlyCostUSD
    ? `On-prem saves $${(result.cloudHourlyCostUSD - result.onPremHourlyCostUSD).toFixed(4)}/hr/GPU`
    : `Cloud saves $${(result.onPremHourlyCostUSD - result.cloudHourlyCostUSD).toFixed(4)}/hr/GPU`;

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Total Cost of Ownership
        </h3>
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-4">
        {/* Hardware Capex */}
        <div className="flex items-center gap-2">
          <label htmlFor="tco-capex" className="text-xs text-fg-muted w-44 flex-shrink-0">Hardware Capex ($)</label>
          <input
            id="tco-capex"
            type="number"
            min={0}
            step={1000}
            value={capex}
            onChange={(e) => setCapex(parseFloat(e.target.value) || 0)}
            className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Depreciation Years */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-fg-muted w-44 flex-shrink-0">Depreciation Years</label>
          <div className="flex gap-1">
            {DEP_YEARS_OPTIONS.map((y) => (
              <button
                key={y}
                onClick={() => setDepYears(y)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                  depYears === y
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis'
                )}
              >
                {y}yr
              </button>
            ))}
          </div>
        </div>

        {/* PUE */}
        <div className="flex items-center gap-2">
          <label htmlFor="tco-pue" className="text-xs text-fg-muted w-44 flex-shrink-0">PUE</label>
          <input
            id="tco-pue"
            type="number"
            min={1.0}
            max={3.0}
            step={0.1}
            value={pue}
            onChange={(e) => setPue(parseFloat(e.target.value) || 1.4)}
            className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Electricity Cost */}
        <div className="flex items-center gap-2">
          <label htmlFor="tco-elec" className="text-xs text-fg-muted w-44 flex-shrink-0">Electricity $/kWh</label>
          <input
            id="tco-elec"
            type="number"
            min={0.03}
            max={0.50}
            step={0.01}
            value={electricityCost}
            onChange={(e) => setElectricityCost(parseFloat(e.target.value) || 0.10)}
            className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Colo per Rack */}
        <div className="flex items-center gap-2">
          <label htmlFor="tco-colo" className="text-xs text-fg-muted w-44 flex-shrink-0">Colo $/rack/month</label>
          <input
            id="tco-colo"
            type="number"
            min={0}
            step={100}
            value={coloPerRack}
            onChange={(e) => setColoPerRack(parseFloat(e.target.value) || 0)}
            className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Maintenance % */}
        <div className="flex items-center gap-2">
          <label htmlFor="tco-maint" className="text-xs text-fg-muted w-44 flex-shrink-0">Maintenance %/yr</label>
          <input
            id="tco-maint"
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={maintenancePct}
            onChange={(e) => setMaintenancePct(parseFloat(e.target.value) || 0)}
            className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Staff Cost */}
        <div className="flex items-center gap-2">
          <label htmlFor="tco-staff" className="text-xs text-fg-muted w-44 flex-shrink-0">Staff Cost $/yr</label>
          <input
            id="tco-staff"
            type="number"
            min={0}
            step={5000}
            value={staffCost}
            onChange={(e) => setStaffCost(parseFloat(e.target.value) || 0)}
            className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Utilization */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="tco-util" className="text-xs text-fg-muted">GPU Utilization</label>
            <span className="text-xs font-mono text-fg-default">{(utilization * 100).toFixed(0)}%</span>
          </div>
          <input
            id="tco-util"
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={utilization}
            onChange={(e) => setUtilization(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-fg-muted">
            <span>10%</span><span>100%</span>
          </div>
        </div>
      </div>

      {/* Outputs */}
      <div className="border-t border-border-subtle pt-3 flex flex-col">
        <KVRow label="On-prem hourly/GPU" value={`$${result.onPremHourlyCostUSD.toFixed(4)}/hr`} highlight />
        <KVRow label="Cloud hourly" value={`$${result.cloudHourlyCostUSD.toFixed(4)}/hr`} />
        <KVRow label="Breakeven" value={breakevenLabel} highlight />
        <KVRow label="Cost comparison" value={savings} />
      </div>
    </div>
  );
}

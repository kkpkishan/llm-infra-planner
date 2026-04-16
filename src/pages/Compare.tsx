// The Compare page renders the drawer in full-page mode (always open, no backdrop)
export function Compare() {
  return (
    <div className="max-w-[1760px] mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-fg-primary mb-6">Compare Configurations</h1>
      {/* Inline compare content (drawer content reused without the slide-in) */}
      <CompareInline />
    </div>
  );
}

// Inline version of the compare content for the full page
import * as React from 'react';
import { X, ArrowLeftRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalculatorStore } from '@/store/calculator-store';
import { useToast } from '@/components/feedback/Toast';
import {
  getPrecisionConfig, getKVPrecisionConfig,
  computeTotalVRAM, computeThroughput, recommendGPUs, recommendCloudInstances,
} from '@/lib/formulas';
import type { CalculatorState, ModelSpec, GPUSpec, CloudInstance, GPUFitResult } from '@/lib/formulas/types';

const DEFAULT_EFFICIENCY = 0.8;

function computeConfig(state: CalculatorState, modelDb: ModelSpec[], gpuDb: GPUSpec[], cloudDb: CloudInstance[]) {
  const model = modelDb.find(m => m.id === state.model);
  if (!model) return { state, modelName: state.model, totalVRAM: 0, tokensPerSecond: null, fitLabel: '—', bestCloudPerHour: null, costPerMTok: null };

  const precisionConfig = getPrecisionConfig(state.precision);
  const kvPrecisionConfig = getKVPrecisionConfig(state.kvPrecision);
  const breakdown = computeTotalVRAM(model, precisionConfig, kvPrecisionConfig, state.ctx, state.batch, state.mode);

  const activeParams = model.paramsActive ?? model.paramsTotal;
  const activeWeightsGB = (activeParams * precisionConfig.bytesPerParam) / 1e9;

  const gpuRecs = recommendGPUs(breakdown.totalGB, gpuDb, { activeWeightsGB, efficiencyFactor: DEFAULT_EFFICIENCY });
  const topGPU = gpuRecs.allFits.find((f: GPUFitResult) => f.fitStatus !== 'red');
  const fitLabel = topGPU ? `${topGPU.gpu.name} (${topGPU.fitStatus})` : 'No fit';

  const tokensPerSecond = topGPU
    ? computeThroughput({ memoryBandwidthGBs: topGPU.gpu.memoryBandwidthGBs, activeWeightsGB, efficiencyFactor: DEFAULT_EFFICIENCY }).tokensPerSecond
    : null;

  const cloudRecs = recommendCloudInstances(breakdown.totalGB, cloudDb, gpuDb);
  const bestCloud = cloudRecs[0];

  return {
    state,
    modelName: model.displayName,
    totalVRAM: breakdown.totalGB,
    tokensPerSecond,
    fitLabel,
    bestCloudPerHour: bestCloud?.onDemandPerHour ?? null,
    costPerMTok: bestCloud?.costPerMillionTokens ?? null,
  };
}

function DeltaBadge({ value, unit = '', lowerIsBetter = false }: { value: number; unit?: string; lowerIsBetter?: boolean }) {
  if (value === 0) return <span className="text-fg-muted text-xs font-mono">—</span>;
  const isPositive = value > 0;
  const isGood = lowerIsBetter ? !isPositive : isPositive;
  return (
    <span className={cn('text-xs font-mono font-medium', isGood ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}>
      {isPositive ? '+' : ''}{value.toFixed(1)}{unit}
    </span>
  );
}

function CompareInline() {
  const { compareConfigs, removeCompareConfig, modelDb, gpuDb, cloudDb, addCompareConfig } = useCalculatorStore();
  const { showToast } = useToast();

  const computed = React.useMemo(
    () => compareConfigs.map(cfg => computeConfig(cfg, modelDb, gpuDb, cloudDb)),
    [compareConfigs, modelDb, gpuDb, cloudDb]
  );

  const anchor = computed[0];

  const handleAdd = () => {
    if (compareConfigs.length >= 3) {
      showToast('Maximum 3 configurations', 'error');
      return;
    }
    addCompareConfig();
    showToast('Added to compare', 'success');
  };

  if (computed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <ArrowLeftRight size={40} className="text-fg-muted" />
        <div>
          <p className="text-sm font-medium text-fg-default mb-1">No configurations yet</p>
          <p className="text-xs text-fg-muted">Go to the Calculator and press <kbd className="px-1.5 py-0.5 rounded border border-border-default bg-bg-muted font-mono text-[10px]">c</kbd> to add configs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Column headers */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${computed.length}, 1fr)` }}>
        {computed.map((cfg, i) => (
          <div key={i} className={cn('rounded-lg border p-5 flex flex-col gap-4', i === 0 ? 'border-accent/40 bg-accent/5' : 'border-border-subtle bg-bg-muted')}>
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1 min-w-0">
                {i === 0 && <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-white w-fit">Anchor</span>}
                <span className="text-xs font-medium text-fg-muted uppercase">{cfg.state.mode}</span>
                <h3 className="text-base font-semibold text-fg-primary truncate">{cfg.modelName}</h3>
                <p className="text-xs font-mono text-fg-muted">{cfg.state.precision.toUpperCase()} · {(cfg.state.ctx / 1024).toFixed(0)}k ctx · batch {cfg.state.batch}</p>
              </div>
              <button onClick={() => removeCompareConfig(i)} className="text-fg-muted hover:text-red-500 transition-colors" aria-label={`Remove config ${i + 1}`}>
                <X size={14} />
              </button>
            </div>

            {/* Metrics */}
            <div className="flex flex-col gap-3 border-t border-border-subtle pt-3">
              {[
                { label: 'Total VRAM', value: `${cfg.totalVRAM.toFixed(1)} GB`, delta: anchor && i > 0 ? cfg.totalVRAM - anchor.totalVRAM : null, unit: ' GB', lowerIsBetter: true },
                { label: 'Throughput', value: cfg.tokensPerSecond != null ? `${cfg.tokensPerSecond.toLocaleString()} tok/s` : '—', delta: anchor && i > 0 && anchor.tokensPerSecond != null && cfg.tokensPerSecond != null ? cfg.tokensPerSecond - anchor.tokensPerSecond : null, unit: '' },
                { label: 'Best $/h', value: cfg.bestCloudPerHour != null ? `$${cfg.bestCloudPerHour.toFixed(2)}` : '—', delta: anchor && i > 0 && anchor.bestCloudPerHour != null && cfg.bestCloudPerHour != null ? cfg.bestCloudPerHour - anchor.bestCloudPerHour : null, unit: '$', lowerIsBetter: true },
                { label: '$/M tokens', value: cfg.costPerMTok != null ? `$${cfg.costPerMTok.toFixed(2)}` : '—', delta: anchor && i > 0 && anchor.costPerMTok != null && cfg.costPerMTok != null ? cfg.costPerMTok - anchor.costPerMTok : null, unit: '$', lowerIsBetter: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-fg-muted">{row.label}</span>
                  <div className="flex items-center gap-2">
                    {row.delta != null && <DeltaBadge value={row.delta} unit={row.unit} lowerIsBetter={row.lowerIsBetter} />}
                    <span className="text-sm font-mono font-semibold text-fg-primary">{row.value}</span>
                  </div>
                </div>
              ))}
              <div className="text-[11px] font-mono text-fg-muted pt-1 border-t border-border-subtle">{cfg.fitLabel}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      {compareConfigs.length < 3 && (
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-lg border border-dashed border-border-default text-sm text-fg-muted hover:text-fg-default hover:border-border-strong transition-colors"
        >
          <Plus size={16} />
          Add current calculator config
        </button>
      )}
    </div>
  );
}

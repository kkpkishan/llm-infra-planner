import * as React from 'react';
import { X, ArrowLeftRight, Plus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCalculatorStore } from '@/store/calculator-store';
import { useToast } from '@/components/feedback/Toast';
import {
  getPrecisionConfig, getKVPrecisionConfig,
  computeTotalVRAM, computeThroughput, recommendGPUs, recommendCloudInstances,
} from '@/lib/formulas';
import type { CalculatorState, ModelSpec, GPUSpec, CloudInstance, GPUFitResult } from '@/lib/formulas/types';

const DEFAULT_EFFICIENCY = 0.8;

const PRECISION_OPTIONS = ['fp32', 'fp16', 'bf16', 'fp8', 'int8', 'int4'];
const CTX_OPTIONS = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];

// ── Compute metrics for a config ─────────────────────────────────────────────
function computeConfig(state: CalculatorState, modelDb: ModelSpec[], gpuDb: GPUSpec[], cloudDb: CloudInstance[]) {
  const model = modelDb.find(m => m.id === state.model);
  if (!model) return { state, model: null, modelName: state.model, totalVRAM: 0, weightsGB: 0, kvCacheGB: 0, tokensPerSecond: null, fitLabel: '—', fitStatus: 'red' as const, bestCloudPerHour: null, costPerMTok: null };

  const precisionConfig = getPrecisionConfig(state.precision);
  const kvPrecisionConfig = getKVPrecisionConfig(state.kvPrecision);
  const breakdown = computeTotalVRAM(model, precisionConfig, kvPrecisionConfig, state.ctx, state.batch, state.mode);

  const activeParams = model.paramsActive ?? model.paramsTotal;
  const activeWeightsGB = (activeParams * precisionConfig.bytesPerParam) / 1e9;

  const gpuRecs = recommendGPUs(breakdown.totalGB, gpuDb, { activeWeightsGB, efficiencyFactor: DEFAULT_EFFICIENCY });
  const topGPU = gpuRecs.allFits.find((f: GPUFitResult) => f.fitStatus !== 'red');
  const fitLabel = topGPU ? `${topGPU.gpu.name} (${topGPU.utilizationPercent}% used)` : 'No GPU fits';
  const fitStatus = topGPU?.fitStatus ?? 'red';

  const tokensPerSecond = topGPU
    ? computeThroughput({ memoryBandwidthGBs: topGPU.gpu.memoryBandwidthGBs, activeWeightsGB, efficiencyFactor: DEFAULT_EFFICIENCY }).tokensPerSecond
    : null;

  const cloudRecs = recommendCloudInstances(breakdown.totalGB, cloudDb, gpuDb);
  const bestCloud = cloudRecs[0];

  return {
    state,
    model,
    modelName: model.displayName,
    totalVRAM: breakdown.totalGB,
    weightsGB: breakdown.weightsGB,
    kvCacheGB: breakdown.kvCacheGB,
    tokensPerSecond,
    fitLabel,
    fitStatus,
    bestCloudPerHour: bestCloud?.onDemandPerHour ?? null,
    costPerMTok: bestCloud?.costPerMillionTokens ?? null,
  };
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function DeltaBadge({ value, unit = '', lowerIsBetter = false }: { value: number; unit?: string; lowerIsBetter?: boolean }) {
  if (Math.abs(value) < 0.01) return null;
  const isPositive = value > 0;
  const isGood = lowerIsBetter ? !isPositive : isPositive;
  return (
    <span className={cn('text-[10px] font-mono font-medium px-1 py-0.5 rounded', isGood ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-500 dark:text-red-400')}>
      {isPositive ? '+' : ''}{value.toFixed(1)}{unit}
    </span>
  );
}

// ── Per-slot config editor ────────────────────────────────────────────────────
function ConfigEditor({ index, state, modelDb, onChange }: {
  index: number;
  state: CalculatorState;
  modelDb: ModelSpec[];
  onChange: (index: number, updates: Partial<CalculatorState>) => void;
}) {
  const [modelSearch, setModelSearch] = React.useState('');
  const [showModelPicker, setShowModelPicker] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  const currentModel = modelDb.find(m => m.id === state.model);
  const filtered = modelSearch.trim()
    ? modelDb.filter(m => m.displayName.toLowerCase().includes(modelSearch.toLowerCase()) || m.family.toLowerCase().includes(modelSearch.toLowerCase()))
    : modelDb;

  // Close on outside click
  React.useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setShowModelPicker(false);
    };
    setTimeout(() => document.addEventListener('click', handler), 50);
    return () => document.removeEventListener('click', handler);
  }, [showModelPicker]);

  return (
    <div className="flex flex-col gap-3">
      {/* Model picker */}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setShowModelPicker(v => !v)}
          className="w-full flex items-center justify-between h-8 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default hover:bg-bg-emphasis transition-colors"
        >
          <span className="truncate">{currentModel?.displayName ?? 'Select model'}</span>
          <ChevronDown size={13} className="flex-shrink-0 ml-2 text-fg-muted" />
        </button>
        {showModelPicker && (
          <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-lg border border-border bg-bg-base shadow-xl overflow-hidden">
            <input
              autoFocus
              type="text"
              placeholder="Search models..."
              value={modelSearch}
              onChange={e => setModelSearch(e.target.value)}
              className="w-full h-9 px-3 border-b border-border bg-transparent text-sm text-fg-default placeholder:text-fg-muted outline-none"
            />
            <div className="overflow-y-auto max-h-[240px]">
              {filtered.slice(0, 50).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(index, { model: m.id }); setShowModelPicker(false); setModelSearch(''); }}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-muted transition-colors', m.id === state.model && 'bg-accent/10 text-accent')}
                >
                  <span className="truncate flex-1">{m.displayName}</span>
                  <span className="text-[9px] text-fg-muted flex-shrink-0">{(m.paramsTotal / 1e9).toFixed(0)}B</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Precision + Context row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-fg-muted">Precision</label>
          <select
            value={state.precision}
            onChange={e => onChange(index, { precision: e.target.value })}
            className="h-7 px-2 rounded border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none"
          >
            {PRECISION_OPTIONS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-fg-muted">Context</label>
          <select
            value={state.ctx}
            onChange={e => onChange(index, { ctx: parseInt(e.target.value) })}
            className="h-7 px-2 rounded border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none"
          >
            {CTX_OPTIONS.map(c => <option key={c} value={c}>{c >= 1024 ? `${c / 1024}K` : c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Main Compare page ─────────────────────────────────────────────────────────
export function Compare() {
  const { compareConfigs, removeCompareConfig, modelDb, gpuDb, cloudDb, addCompareConfig, selectedModel } = useCalculatorStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Local editable copies of configs
  const [localConfigs, setLocalConfigs] = React.useState<CalculatorState[]>([]);

  // Sync when compareConfigs changes (new config added)
  React.useEffect(() => {
    setLocalConfigs(compareConfigs.map(c => ({ ...c })));
  }, [compareConfigs.length]);

  const handleConfigChange = (index: number, updates: Partial<CalculatorState>) => {
    setLocalConfigs(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const computed = React.useMemo(
    () => localConfigs.map(cfg => computeConfig(cfg, modelDb, gpuDb, cloudDb)),
    [localConfigs, modelDb, gpuDb, cloudDb]
  );

  const anchor = computed[0];

  const handleAdd = () => {
    if (compareConfigs.length >= 3) { showToast('Maximum 3 configurations', 'error'); return; }
    addCompareConfig();
    showToast('Added current config', 'success');
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (computed.length === 0) {
    return (
      <div className="max-w-[1760px] mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary">Compare Configurations</h1>
          <p className="text-sm text-fg-muted mt-1">Side-by-side comparison of model + hardware configurations</p>
        </div>

        <div className="flex flex-col items-center justify-center gap-5 py-16 text-center rounded-xl border border-dashed border-border-subtle bg-bg-subtle">
          <ArrowLeftRight size={36} className="text-fg-muted" />
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-fg-default">No configurations to compare yet</p>
            <p className="text-sm text-fg-muted max-w-sm">Add your current calculator setup, then change the model or settings and add another.</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedModel ? (
              <button onClick={handleAdd} className="flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
                <Plus size={15} />
                Add current config ({selectedModel.displayName})
              </button>
            ) : (
              <button onClick={() => navigate('/')} className="flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
                Go to Calculator
              </button>
            )}
          </div>
          <p className="text-xs text-fg-muted">
            Or press <kbd className="px-1.5 py-0.5 rounded border border-border-default bg-bg-muted font-mono text-[10px]">c</kbd> in the calculator to add &amp; open compare
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Select a model', desc: 'Pick a model and configure precision and context in the calculator.' },
            { step: '2', title: 'Press C to add', desc: 'Press C or click Compare — it snapshots the config and opens this page.' },
            { step: '3', title: 'Edit slots here', desc: 'Change the model or settings in each slot directly on this page.' },
          ].map(item => (
            <div key={item.step} className="flex gap-3 p-4 rounded-lg border border-border-subtle bg-bg-muted">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">{item.step}</span>
              <div>
                <p className="text-sm font-medium text-fg-default mb-0.5">{item.title}</p>
                <p className="text-xs text-fg-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Comparison table ────────────────────────────────────────────────────────
  const METRICS = [
    { key: 'totalVRAM',       label: 'Total VRAM',     fmt: (v: number) => `${v.toFixed(1)} GB`,   unit: ' GB', lowerIsBetter: true },
    { key: 'weightsGB',       label: 'Weights',        fmt: (v: number) => `${v.toFixed(1)} GB`,   unit: ' GB', lowerIsBetter: true },
    { key: 'kvCacheGB',       label: 'KV Cache',       fmt: (v: number) => `${v.toFixed(2)} GB`,   unit: ' GB', lowerIsBetter: true },
    { key: 'tokensPerSecond', label: 'Throughput',     fmt: (v: number | null) => v != null ? `${Math.round(v).toLocaleString()} tok/s` : '—', unit: '', lowerIsBetter: false },
    { key: 'bestCloudPerHour',label: 'Best Cloud $/h', fmt: (v: number | null) => v != null ? `$${v.toFixed(2)}` : '—', unit: '$', lowerIsBetter: true },
    { key: 'costPerMTok',     label: '$/M tokens',     fmt: (v: number | null) => v != null ? `$${v.toFixed(2)}` : '—', unit: '$', lowerIsBetter: true },
  ];

  return (
    <div className="max-w-[1760px] mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary">Compare Configurations</h1>
          <p className="text-sm text-fg-muted mt-1">Edit each slot below — results update instantly</p>
        </div>
        {compareConfigs.length < 3 && (
          <button onClick={handleAdd} className="flex items-center gap-2 h-9 px-4 rounded-md border border-border-subtle bg-bg-muted text-sm font-medium text-fg-default hover:bg-bg-emphasis transition-colors">
            <Plus size={14} />
            Add current config
          </button>
        )}
      </div>

      {/* Config editor + metrics grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${computed.length}, 1fr)` }}>
        {computed.map((cfg, i) => (
          <div key={i} className={cn('rounded-xl border flex flex-col gap-0 overflow-hidden', i === 0 ? 'border-accent/50' : 'border-border-subtle')}>
            {/* Header */}
            <div className={cn('px-4 py-3 flex items-center justify-between', i === 0 ? 'bg-accent/5' : 'bg-bg-subtle')}>
              <div className="flex items-center gap-2">
                {i === 0 && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-white">Anchor</span>}
                <span className="text-xs font-medium text-fg-muted">Config {i + 1}</span>
              </div>
              <button onClick={() => removeCompareConfig(i)} className="text-fg-muted hover:text-red-500 transition-colors" aria-label="Remove">
                <X size={14} />
              </button>
            </div>

            {/* Editable config */}
            <div className="px-4 py-3 border-b border-border-subtle bg-bg-base">
              <ConfigEditor index={i} state={localConfigs[i] ?? cfg.state} modelDb={modelDb} onChange={handleConfigChange} />
            </div>

            {/* Metrics */}
            <div className="px-4 py-3 flex flex-col gap-2.5 bg-bg-base">
              {METRICS.map(metric => {
                const val = cfg[metric.key as keyof typeof cfg] as number | null;
                const anchorVal = anchor?.[metric.key as keyof typeof anchor] as number | null;
                const delta = i > 0 && val != null && anchorVal != null ? (val as number) - (anchorVal as number) : null;
                return (
                  <div key={metric.key} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-fg-muted">{metric.label}</span>
                    <div className="flex items-center gap-1.5">
                      {delta != null && <DeltaBadge value={delta} unit={metric.unit} lowerIsBetter={metric.lowerIsBetter} />}
                      <span className="text-sm font-mono font-semibold text-fg-primary tabular-nums">{metric.fmt(val as any)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Fit status */}
              <div className={cn('mt-1 pt-2 border-t border-border-subtle text-[11px] font-mono',
                cfg.fitStatus === 'green' ? 'text-green-600 dark:text-green-400' :
                cfg.fitStatus === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500')}>
                {cfg.fitLabel}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

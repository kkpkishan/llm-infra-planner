import * as React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalculatorStore } from '@/store/calculator-store';
import {
  getPrecisionConfig, getKVPrecisionConfig,
  computeTotalVRAM, computeThroughput, classifyGPUFit,
} from '@/lib/formulas';
import type { ModelSpec, FitStatus } from '@/lib/formulas/types';

const DEFAULT_EFFICIENCY = 0.8;
const DEFAULT_KV = 'fp16';
const DEFAULT_PRECISION = 'fp16';

interface ModelFitResult {
  model: ModelSpec;
  totalVRAM: number;
  fitStatus: FitStatus;
  tokensPerSecond: number | null;
  requiredPrecision: string | null;
}

const FIT_ICON = {
  green:  { Icon: CheckCircle,  color: 'text-green-600 dark:text-green-400',  label: 'Fits' },
  yellow: { Icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', label: 'Tight' },
  red:    { Icon: XCircle,      color: 'text-red-600 dark:text-red-400',      label: 'Overflow' },
};

// Find the lowest precision that makes a model fit
const PRECISION_LADDER = ['fp16', 'int8', 'int4', 'q4_k_m'];

function findRequiredPrecision(model: ModelSpec, gpuMemoryGB: number, ctx: number): string | null {
  for (const prec of PRECISION_LADDER) {
    const pc = getPrecisionConfig(prec);
    const kv = getKVPrecisionConfig(DEFAULT_KV);
    const bd = computeTotalVRAM(model, pc, kv, ctx, 1, 'inference');
    if (bd.totalGB <= gpuMemoryGB) return prec;
  }
  return null;
}

export function Reverse() {
  const { modelDb, gpuDb } = useCalculatorStore();

  // Inputs
  const [selectedGPUId, setSelectedGPUId] = React.useState<string>(gpuDb[0]?.id ?? '');
  const [customVRAM, setCustomVRAM] = React.useState<number | null>(null);
  const [contextLength, setContextLength] = React.useState(4096);
  const [workloadMode, setWorkloadMode] = React.useState<'inference' | 'finetune'>('inference');

  // Filters
  const [familyFilter, setFamilyFilter] = React.useState('All');
  const [sizeFilter, setSizeFilter] = React.useState('All');
  const [licenseFilter, setLicenseFilter] = React.useState('All');

  const selectedGPU = gpuDb.find(g => g.id === selectedGPUId) ?? null;
  const effectiveVRAM = customVRAM ?? selectedGPU?.memoryGB ?? 24;

  // Compute fit for every model
  const results: ModelFitResult[] = React.useMemo(() => {
    return modelDb.map(model => {
      const pc = getPrecisionConfig(DEFAULT_PRECISION);
      const kv = getKVPrecisionConfig(DEFAULT_KV);
      const bd = computeTotalVRAM(model, pc, kv, contextLength, 1, workloadMode);
      const fitStatus = classifyGPUFit(bd.totalGB, effectiveVRAM);

      const activeParams = model.paramsActive ?? model.paramsTotal;
      const activeWeightsGB = (activeParams * pc.bytesPerParam) / 1e9;
      const tokensPerSecond = selectedGPU
        ? computeThroughput({ memoryBandwidthGBs: selectedGPU.memoryBandwidthGBs, activeWeightsGB, efficiencyFactor: DEFAULT_EFFICIENCY }).tokensPerSecond
        : null;

      const requiredPrecision = fitStatus === 'red'
        ? findRequiredPrecision(model, effectiveVRAM, contextLength)
        : DEFAULT_PRECISION;

      return { model, totalVRAM: bd.totalGB, fitStatus, tokensPerSecond, requiredPrecision };
    });
  }, [modelDb, effectiveVRAM, contextLength, workloadMode, selectedGPU]);

  // Unique families, sizes, licenses for filters
  const families = ['All', ...Array.from(new Set(modelDb.map(m => m.family)))];
  const licenses = ['All', ...Array.from(new Set(modelDb.map(m => m.license)))];
  const SIZE_BUCKETS = ['All', '< 7B', '7B–13B', '13B–70B', '70B+'];

  function matchesSize(model: ModelSpec): boolean {
    if (sizeFilter === 'All') return true;
    const b = model.paramsTotal / 1e9;
    if (sizeFilter === '< 7B') return b < 7;
    if (sizeFilter === '7B–13B') return b >= 7 && b <= 13;
    if (sizeFilter === '13B–70B') return b > 13 && b <= 70;
    if (sizeFilter === '70B+') return b > 70;
    return true;
  }

  const filtered = results.filter(r =>
    (familyFilter === 'All' || r.model.family === familyFilter) &&
    matchesSize(r.model) &&
    (licenseFilter === 'All' || r.model.license === licenseFilter)
  );

  // Sort: green first, then yellow, then red
  const FIT_ORDER = { green: 0, yellow: 1, red: 2 };
  const sorted = [...filtered].sort((a, b) => FIT_ORDER[a.fitStatus] - FIT_ORDER[b.fitStatus]);

  return (
    <div className="max-w-[1760px] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">

      {/* ── Inputs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* GPU picker */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reverse-gpu" className="text-xs font-medium text-fg-default">GPU</label>
          <select
            id="reverse-gpu"
            value={selectedGPUId}
            onChange={e => { setSelectedGPUId(e.target.value); setCustomVRAM(null); }}
            className="h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {gpuDb.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.memoryGB} GB)</option>
            ))}
          </select>
        </div>

        {/* Custom VRAM override */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="custom-vram" className="text-xs font-medium text-fg-default">
            Custom VRAM (GB) <span className="text-fg-muted font-normal">— overrides GPU</span>
          </label>
          <input
            id="custom-vram"
            type="number"
            min={1}
            max={1024}
            placeholder={`${effectiveVRAM}`}
            value={customVRAM ?? ''}
            onChange={e => setCustomVRAM(e.target.value ? parseInt(e.target.value) : null)}
            className="h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Context length */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reverse-ctx" className="text-xs font-medium text-fg-default">Context Length</label>
          <select
            id="reverse-ctx"
            value={contextLength}
            onChange={e => setContextLength(parseInt(e.target.value))}
            className="h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {[1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072].map(v => (
              <option key={v} value={v}>{v >= 1024 ? `${v / 1024}k` : v}</option>
            ))}
          </select>
        </div>

        {/* Workload mode */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-fg-default">Mode</label>
          <div className="flex gap-1">
            {(['inference', 'finetune'] as const).map(m => (
              <button
                key={m}
                onClick={() => setWorkloadMode(m)}
                className={cn(
                  'flex-1 h-9 px-3 rounded-md text-sm font-medium border transition-colors',
                  workloadMode === m
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis'
                )}
              >
                {m === 'inference' ? 'Inference' : 'Fine-tune'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 items-center text-xs">
        <FilterGroup label="Family" options={families} value={familyFilter} onChange={setFamilyFilter} />
        <FilterGroup label="Size" options={SIZE_BUCKETS} value={sizeFilter} onChange={setSizeFilter} />
        <FilterGroup label="License" options={licenses} value={licenseFilter} onChange={setLicenseFilter} />
        <span className="ml-auto text-fg-muted font-mono">{sorted.length} models</span>
      </div>

      {/* ── Results grid ───────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm" aria-label="Model fit results">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-subtle">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted">Fit</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted">Model</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted">VRAM (FP16)</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted">Est. tok/s</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted">Min precision</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ model, totalVRAM, fitStatus, tokensPerSecond, requiredPrecision }) => {
              const { Icon, color, label } = FIT_ICON[fitStatus];
              return (
                <tr key={model.id} className="border-b border-border-subtle hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <div className={cn('flex items-center gap-1.5 text-xs font-medium', color)}>
                      <Icon size={14} aria-hidden="true" />
                      {label}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-fg-primary">{model.displayName}</span>
                      <span className="text-[10px] font-mono text-fg-muted">
                        {(model.paramsTotal / 1e9).toFixed(1)}B · {model.family}
                        {model.moe ? ' · MoE' : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">
                    {totalVRAM.toFixed(1)} GB
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-fg-default tabular-nums">
                    {tokensPerSecond != null ? `~${tokensPerSecond.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fitStatus === 'red' ? (
                      requiredPrecision ? (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                          {requiredPrecision.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-red-500">No fit</span>
                      )
                    ) : (
                      <span className="text-xs font-mono text-fg-muted">FP16</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-fg-muted">{label}:</span>
      <div className="flex gap-1">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              'px-2 py-0.5 rounded border text-xs transition-colors',
              value === opt
                ? 'bg-accent text-white border-accent'
                : 'border-border-subtle text-fg-muted hover:text-fg-default hover:border-border-default'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

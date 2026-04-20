import * as React from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { estimateWarmup, type Framework } from '@/lib/formulas/warmup';

interface WarmupPanelProps {
  modelBytes: number;   // total model size in bytes
  numParams: number;
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

interface StorageTier {
  label: string;
  bandwidthGBs: number;
}

const STORAGE_TIERS: StorageTier[] = [
  { label: 'HDD (0.15 GB/s)',      bandwidthGBs: 0.15 },
  { label: 'SATA SSD (0.55 GB/s)', bandwidthGBs: 0.55 },
  { label: 'NVMe Gen4 (7 GB/s)',   bandwidthGBs: 7 },
  { label: 'NVMe Gen5 (14 GB/s)',  bandwidthGBs: 14 },
];

const FRAMEWORK_OPTIONS: { value: Framework; label: string }[] = [
  { value: 'vllm',      label: 'vLLM' },
  { value: 'sglang',    label: 'SGLang' },
  { value: 'trt-llm',   label: 'TRT-LLM' },
  { value: 'llama.cpp', label: 'llama.cpp' },
  { value: 'ollama',    label: 'Ollama' },
];

function formatTime(sec: number): string {
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)} min`;
  return `${(min / 60).toFixed(1)} hr`;
}

export function WarmupPanel({ modelBytes, numParams, className }: WarmupPanelProps) {
  const [storageTierIdx, setStorageTierIdx] = React.useState(2); // NVMe Gen4 default
  const [framework, setFramework] = React.useState<Framework>('vllm');

  const tier = STORAGE_TIERS[storageTierIdx];
  const result = estimateWarmup(modelBytes, tier.bandwidthGBs, framework, numParams);

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Timer size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Warmup &amp; Load Time
        </h3>
      </div>

      <div className="space-y-3 mb-4">
        {/* Storage Bandwidth */}
        <div className="flex flex-col gap-1">
          <label htmlFor="storage-tier" className="text-xs text-fg-muted">Storage Bandwidth</label>
          <select
            id="storage-tier"
            value={storageTierIdx}
            onChange={(e) => setStorageTierIdx(parseInt(e.target.value, 10))}
            className="h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STORAGE_TIERS.map((t, i) => (
              <option key={t.label} value={i}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Framework */}
        <div className="flex flex-col gap-1">
          <label htmlFor="warmup-framework" className="text-xs text-fg-muted">Framework</label>
          <select
            id="warmup-framework"
            value={framework}
            onChange={(e) => setFramework(e.target.value as Framework)}
            className="h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {FRAMEWORK_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Outputs */}
      <div className="border-t border-border-subtle pt-3 flex flex-col">
        <KVRow label="Load Time" value={formatTime(result.loadTimeSec)} highlight />
        <KVRow label="Compile Time" value={formatTime(result.compileTimeSec)} />
        <KVRow label="Warmup Time" value={formatTime(result.warmupTimeSec)} />
        <KVRow label="Total Cold-Start" value={formatTime(result.totalColdStartSec)} highlight />
        <div className="pt-2">
          <p className="text-[10px] text-fg-muted leading-relaxed">{result.notes}</p>
        </div>
      </div>
    </div>
  );
}

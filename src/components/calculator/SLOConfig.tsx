import { cn } from '@/lib/utils';

const TTFT_OPTIONS = [100, 200, 500, 1000, 2000, 5000];
const TPOT_OPTIONS = [10, 20, 30, 50, 100, 200];

function formatMs(ms: number): string {
  if (ms >= 1000) return `${ms / 1000}s`;
  return `${ms}ms`;
}

interface SLOBadgeProps {
  label: string;
  actualMs: number;
  sloMs: number;
}

function SLOBadge({ label, actualMs, sloMs }: SLOBadgeProps) {
  // P95 ≈ P50 × 1.5
  const p95Ms = actualMs * 1.5;
  const met = p95Ms <= sloMs;
  const headroomPct = met
    ? Math.round(((sloMs - p95Ms) / sloMs) * 100)
    : Math.round(((p95Ms - sloMs) / sloMs) * 100);

  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2 rounded-md border text-xs',
      met ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10',
    )}>
      <span className="font-medium text-fg-default">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-fg-primary">{formatMs(Math.round(p95Ms))} p95</span>
        <span className={cn('font-semibold', met ? 'text-green-500' : 'text-red-500')}>
          {met ? `🟢 ${headroomPct}% headroom` : `🔴 ${headroomPct}% over`}
        </span>
      </div>
    </div>
  );
}

interface SLOConfigProps {
  sloTTFTMs: number;
  sloTPOTMs: number;
  actualTTFTMs: number;
  actualTPOTMs: number;
  onSloTTFTChange: (ms: number) => void;
  onSloTPOTChange: (ms: number) => void;
}

export function SLOConfig({
  sloTTFTMs,
  sloTPOTMs,
  actualTTFTMs,
  actualTPOTMs,
  onSloTTFTChange,
  onSloTPOTChange,
}: SLOConfigProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium text-fg-default">SLO Targets</span>

      {/* TTFT SLO */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-fg-muted w-24 shrink-0">Max TTFT (p95)</label>
        <select
          value={sloTTFTMs}
          onChange={e => onSloTTFTChange(Number(e.target.value))}
          className="flex-1 h-7 px-2 rounded border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="TTFT SLO"
        >
          {TTFT_OPTIONS.map(ms => (
            <option key={ms} value={ms}>{formatMs(ms)}</option>
          ))}
        </select>
      </div>

      {/* TPOT SLO */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-fg-muted w-24 shrink-0">Max TPOT (p95)</label>
        <select
          value={sloTPOTMs}
          onChange={e => onSloTPOTChange(Number(e.target.value))}
          className="flex-1 h-7 px-2 rounded border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="TPOT SLO"
        >
          {TPOT_OPTIONS.map(ms => (
            <option key={ms} value={ms}>{formatMs(ms)}</option>
          ))}
        </select>
      </div>

      {/* Status badges */}
      <div className="flex flex-col gap-1.5">
        <SLOBadge label="TTFT" actualMs={actualTTFTMs} sloMs={sloTTFTMs} />
        <SLOBadge label="TPOT" actualMs={actualTPOTMs} sloMs={sloTPOTMs} />
      </div>
    </div>
  );
}

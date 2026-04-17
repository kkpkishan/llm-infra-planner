import * as React from 'react';
import { Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeParallelism } from '@/lib/formulas/parallelism';

interface ParallelismPanelProps {
  totalGPUs: number;
  gpusPerNode: number;
  gpuMemGB: number;
  modelGB: number;
  numKVHeads?: number;
  className?: string;
}

function KVRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-fg-muted flex-shrink-0 w-36">{label}</span>
      <span className={cn('text-xs font-mono text-right break-all', highlight ? 'text-accent font-semibold' : 'text-fg-default')}>
        {value}
      </span>
    </div>
  );
}

export function ParallelismPanel({
  totalGPUs,
  gpusPerNode,
  gpuMemGB,
  modelGB,
  numKVHeads,
  className,
}: ParallelismPanelProps) {
  const result = React.useMemo(
    () => computeParallelism(totalGPUs, gpusPerNode, modelGB, gpuMemGB, numKVHeads),
    [totalGPUs, gpusPerNode, modelGB, gpuMemGB, numKVHeads],
  );

  const { config, scalingEfficiency, commOverheadPercent, warnings } = result;

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Cpu size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Parallelism Strategy
        </h3>
      </div>

      <div className="flex flex-col">
        <KVRow label="Tensor Parallel (TP)" value={String(config.tp)} highlight />
        <KVRow label="Pipeline Parallel (PP)" value={String(config.pp)} highlight />
        <KVRow label="Data Parallel (DP)" value={String(config.dp)} highlight />
        <KVRow label="Total GPUs" value={`${config.totalGPUs}`} />
        <KVRow
          label="Scaling efficiency"
          value={`${(scalingEfficiency * 100).toFixed(0)}%`}
          highlight
        />
        <KVRow
          label="Comm overhead"
          value={`${commOverheadPercent.toFixed(1)}%`}
        />
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1"
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

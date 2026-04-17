import * as React from 'react';
import { MemoryStick } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeRAMRequirement } from '@/lib/formulas/system-ram';

interface RAMPanelProps {
  mode: 'inference' | 'training' | 'zero_infinity';
  modelBytes: number;
  numGPUsPerNode: number;
  vramPerGPUGB: number;
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

const MODE_LABELS: Record<RAMPanelProps['mode'], string> = {
  inference: 'Inference',
  training: 'Training',
  zero_infinity: 'ZeRO-Infinity',
};

export function RAMPanel({
  mode,
  modelBytes,
  numGPUsPerNode,
  vramPerGPUGB,
  className,
}: RAMPanelProps) {
  const req = React.useMemo(
    () => computeRAMRequirement(mode, modelBytes, numGPUsPerNode, vramPerGPUGB),
    [mode, modelBytes, numGPUsPerNode, vramPerGPUGB],
  );

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <MemoryStick size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          System RAM — {MODE_LABELS[mode]}
        </h3>
      </div>

      <div className="flex flex-col">
        <KVRow label="Minimum RAM" value={`${req.minimumGB} GB`} highlight />
        <KVRow label="Recommended RAM" value={`${req.recommendedGB} GB`} highlight />
        <KVRow label="CPU cores" value={`≥ ${req.cpuCores} physical cores`} />
        <KVRow label="NUMA layout" value={req.numaLayout} />
      </div>

      <p className="mt-3 text-[11px] text-fg-muted leading-relaxed">{req.notes}</p>
    </div>
  );
}

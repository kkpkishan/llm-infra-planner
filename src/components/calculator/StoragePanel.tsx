import { HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeTotalStorage, recommendStorageTier } from '@/lib/formulas/storage';
import { computeCheckpointWriteBandwidth, checkCheckpointFeasibility } from '@/lib/formulas/disk-iops';

interface StoragePanelProps {
  numTokens: number;           // training tokens
  numCheckpoints: number;      // checkpoints to keep
  numParams: number;           // model params
  checkpointTimeBudgetSec?: number;  // default 60s
  diskBandwidthMBs?: number;   // current disk bandwidth for feasibility check
  className?: string;
}

function KVRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-fg-muted flex-shrink-0 w-36">{label}</span>
      <span className={cn('text-xs font-mono text-right break-all', warn ? 'text-red-400 font-semibold' : 'text-fg-default')}>
        {value}
      </span>
    </div>
  );
}

function formatGB(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb.toFixed(1)} GB`;
}

export function StoragePanel({
  numTokens,
  numCheckpoints,
  numParams,
  checkpointTimeBudgetSec = 60,
  diskBandwidthMBs,
  className,
}: StoragePanelProps) {
  const storage = computeTotalStorage(numTokens, numCheckpoints, numParams);
  const ckptWriteMBs = computeCheckpointWriteBandwidth(numParams, checkpointTimeBudgetSec);
  const storageTier = recommendStorageTier(ckptWriteMBs);

  const feasibility = diskBandwidthMBs != null
    ? checkCheckpointFeasibility(numParams, checkpointTimeBudgetSec, diskBandwidthMBs)
    : null;

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <HardDrive size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Storage
        </h3>
      </div>

      <div className="flex flex-col">
        <KVRow label="Training data" value={formatGB(storage.dataGB)} />
        <KVRow label="Checkpoints" value={`${formatGB(storage.checkpointsGB)} (×${numCheckpoints})`} />
        <KVRow label="Logs" value={formatGB(storage.logsGB)} />
        <KVRow label="Headroom (20%)" value={formatGB(storage.headroomGB)} />
        <KVRow label="Total" value={formatGB(storage.totalGB)} />
        <KVRow label="Ckpt write BW" value={`${ckptWriteMBs.toFixed(0)} MB/s`} />
        <KVRow label="Ckpt budget" value={`${checkpointTimeBudgetSec}s`} />
        <KVRow label="Recommended tier" value={storageTier} />
        {feasibility && (
          <KVRow
            label="Feasibility"
            value={feasibility.feasible ? '✓ Feasible' : '✗ Exceeds disk BW'}
            warn={!feasibility.feasible}
          />
        )}
      </div>
    </div>
  );
}

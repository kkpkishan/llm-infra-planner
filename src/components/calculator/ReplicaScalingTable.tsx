import { cn } from '@/lib/utils';
import type { ScalingRow } from '@/lib/formulas/auto-scale';

interface ReplicaScalingTableProps {
  rows: ScalingRow[];
  currentReplicas: number;
  gpusPerReplica: number;
  gpuName: string;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function formatMTokenCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function ReplicaScalingTable({
  rows,
  currentReplicas,
  gpusPerReplica,
  gpuName,
}: ReplicaScalingTableProps) {
  const needsTP = gpusPerReplica > 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fg-default">Replica Scaling</span>
        {needsTP && (
          <span className="text-[10px] text-fg-muted bg-bg-muted px-2 py-0.5 rounded">
            TP={gpusPerReplica} — model requires {gpusPerReplica}× {gpuName} per replica
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left py-1.5 px-2 text-fg-muted font-medium">Replicas</th>
              <th className="text-left py-1.5 px-2 text-fg-muted font-medium">GPUs</th>
              <th className="text-right py-1.5 px-2 text-fg-muted font-medium">Users</th>
              <th className="text-right py-1.5 px-2 text-fg-muted font-medium">TPOT</th>
              <th className="text-right py-1.5 px-2 text-fg-muted font-medium">$/hour</th>
              <th className="text-right py-1.5 px-2 text-fg-muted font-medium">$/M tok</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isCurrent = row.replicas === currentReplicas;
              return (
                <tr
                  key={row.replicas}
                  className={cn(
                    'border-b border-border-subtle/50 transition-colors',
                    isCurrent ? 'bg-accent/10 font-semibold' : 'hover:bg-bg-muted/50',
                  )}
                >
                  <td className="py-1.5 px-2 font-mono text-fg-primary">
                    {row.replicas}
                    {isCurrent && <span className="ml-1 text-[9px] text-accent">← current</span>}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-fg-muted">
                    {row.totalGPUs}× {gpuName.split(' ').slice(-1)[0]}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-fg-primary text-right">
                    {row.maxUsers.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-fg-primary text-right">
                    {Math.round(row.tpotMs)}ms
                  </td>
                  <td className="py-1.5 px-2 font-mono text-fg-primary text-right">
                    {formatCost(row.costPerHour)}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-fg-primary text-right">
                    {formatMTokenCost(row.costPerMTokens)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {needsTP && (
        <p className="text-[10px] text-fg-muted">
          Base replica = {gpusPerReplica}× {gpuName} (TP={gpusPerReplica}). Scale in TP groups.
        </p>
      )}
    </div>
  );
}

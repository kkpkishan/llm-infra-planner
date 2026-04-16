import { Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClusterRecommendation } from '@/lib/formulas/types';

interface ClusterPanelProps {
  cluster: ClusterRecommendation;
  className?: string;
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-fg-muted flex-shrink-0 w-28">{label}</span>
      <span className="text-xs font-mono text-fg-default text-right break-all">{value}</span>
    </div>
  );
}

export function ClusterPanel({ cluster, className }: ClusterPanelProps) {
  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Network size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Cluster Setup
        </h3>
      </div>

      <div className="flex flex-col">
        <KVRow label="Topology" value={cluster.topology} />
        <KVRow label="Framework" value={cluster.framework} />
        <KVRow label="Launch args" value={cluster.frameworkArgs} />
        {cluster.alternativeTopology && (
          <KVRow label="Alt. topology" value={cluster.alternativeTopology} />
        )}
        {cluster.alternativeRuntime && (
          <KVRow label="Alt. runtime" value={cluster.alternativeRuntime} />
        )}
      </div>
    </div>
  );
}

import { Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CLUSTERING_TOOLS, type ClusteringTool } from '@/data/clustering-tools';

interface ClusteringToolsProps {
  className?: string;
}

const GROUP_LABELS: Record<ClusteringTool['group'], string> = {
  production: 'Production',
  hpc: 'HPC',
  lightweight: 'Lightweight',
  consumer: 'Consumer',
};

const GROUPS: ClusteringTool['group'][] = ['production', 'hpc', 'lightweight', 'consumer'];

function ComplexityStars({ value }: { value: number }) {
  return (
    <span className="text-[11px] font-mono" aria-label={`Setup complexity ${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < value ? 'text-accent' : 'text-fg-subtle'}>★</span>
      ))}
    </span>
  );
}

function ToolCard({ tool }: { tool: ClusteringTool }) {
  return (
    <div className="rounded border border-border-subtle bg-bg-default p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <a
            href={tool.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-fg-default hover:text-accent transition-colors"
          >
            {tool.name}
          </a>
          <p className="text-[11px] text-fg-muted mt-0.5">{tool.scenario}</p>
        </div>
        <ComplexityStars value={tool.setupComplexity} />
      </div>

      <p className="text-[11px] text-fg-muted leading-relaxed">{tool.description}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-fg-muted">
        <span><span className="font-medium">Max size:</span> {tool.maxClusterSize}</span>
        <span><span className="font-medium">Latency:</span> {tool.latencyOverhead}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {tool.supportedHardware.map(hw => (
          <span
            key={hw}
            className="text-[10px] bg-bg-muted border border-border-subtle rounded px-1.5 py-0.5 text-fg-muted"
          >
            {hw}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ClusteringTools({ className }: ClusteringToolsProps) {
  const byGroup = GROUPS.reduce<Record<ClusteringTool['group'], ClusteringTool[]>>(
    (acc, g) => {
      acc[g] = CLUSTERING_TOOLS.filter(t => t.group === g);
      return acc;
    },
    { production: [], hpc: [], lightweight: [], consumer: [] },
  );

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Server size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Clustering Software
        </h3>
        <span className="text-[10px] text-fg-muted ml-auto">★ = setup complexity</span>
      </div>

      <div className="flex flex-col gap-5">
        {GROUPS.map(group => {
          const tools = byGroup[group];
          if (tools.length === 0) return null;
          return (
            <div key={group}>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-2">
                {GROUP_LABELS[group]}
              </h4>
              <div className="flex flex-col gap-2">
                {tools.map(tool => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import type { BatchResult } from '@/lib/formulas/batch-processing';

interface BatchModeToggleProps {
  batchMode: boolean;
  onToggle: (b: boolean) => void;
  batchResult: BatchResult;
  numDocsExample?: number;
  avgTokensPerDocExample?: number;
}

function formatThroughput(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K tok/s`;
  return `${Math.round(n)} tok/s`;
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)} days`;
}

export function BatchModeToggle({
  batchMode,
  onToggle,
  batchResult,
  numDocsExample = 1_000_000,
  avgTokensPerDocExample = 2000,
}: BatchModeToggleProps) {
  const {
    maxBatchSize,
    maxAggThroughputTokensPerSec,
    timeToProcessNDocumentsHours,
    costPerMTokens,
    throughputMultiplierVsRealtime,
  } = batchResult;

  const timeHours = timeToProcessNDocumentsHours(numDocsExample, avgTokensPerDocExample);

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-fg-default">Processing Mode</span>
          <span className="text-[10px] text-fg-muted">
            {batchMode ? 'Batch: max throughput, no latency SLO' : 'Real-time: latency-constrained serving'}
          </span>
        </div>
        <button
          role="switch"
          aria-checked={batchMode}
          onClick={() => onToggle(!batchMode)}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            batchMode ? 'bg-accent' : 'bg-bg-emphasis',
          )}
          aria-label="Toggle batch mode"
        >
          <span className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow',
            batchMode ? 'translate-x-[22px]' : 'translate-x-[2px]',
          )} />
        </button>
      </div>

      {/* Mode labels */}
      <div className="flex gap-2 text-[10px]">
        <span className={cn('px-2 py-0.5 rounded', !batchMode ? 'bg-accent text-white' : 'bg-bg-muted text-fg-muted')}>
          Real-time
        </span>
        <span className={cn('px-2 py-0.5 rounded', batchMode ? 'bg-accent text-white' : 'bg-bg-muted text-fg-muted')}>
          Batch
        </span>
      </div>

      {/* Batch mode metrics */}
      {batchMode && (
        <div className="rounded-md border border-border-subtle bg-bg-subtle p-3 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-fg-muted">Max batch size</span>
              <span className="text-sm font-mono font-semibold text-fg-primary">{maxBatchSize.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-fg-muted">Max throughput</span>
              <span className="text-sm font-mono font-semibold text-fg-primary">{formatThroughput(maxAggThroughputTokensPerSec)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-fg-muted">Cost / 1M tokens</span>
              <span className="text-sm font-mono font-semibold text-fg-primary">${costPerMTokens.toFixed(3)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-fg-muted">vs real-time</span>
              <span className="text-sm font-mono font-semibold text-green-500">
                {throughputMultiplierVsRealtime.toFixed(1)}× faster
              </span>
            </div>
          </div>
          <div className="border-t border-border-subtle pt-2">
            <p className="text-[10px] text-fg-muted">
              Process {(numDocsExample / 1e6).toFixed(0)}M docs ({(avgTokensPerDocExample / 1000).toFixed(0)}K tokens each) in{' '}
              <span className="font-semibold text-fg-primary">{formatHours(timeHours)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

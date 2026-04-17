import * as React from 'react';
import { Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeAllReduceBytes,
  computeTPCommBytes,
  computePPCommBytes,
  computeZeRO3CommBytes,
  computeMoECommBytes,
  computeRequiredBandwidth,
  computeCommOverheadPercent,
  recommendInterconnect,
} from '@/lib/formulas/network';

interface NetworkPanelProps {
  numGPUs: number;
  numParams: number;           // total model params
  numLayers: number;
  hiddenSize: number;
  batchSize: number;
  seqLen: number;
  bytesPerParam: number;
  parallelismType: 'tp' | 'pp' | 'zero3' | 'moe';
  stepTimeBudgetMs: number;    // step time budget in milliseconds
  topK?: number;               // for MoE
  numMoELayers?: number;       // for MoE
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

export function NetworkPanel({
  numGPUs,
  numParams,
  numLayers,
  hiddenSize,
  batchSize,
  seqLen,
  bytesPerParam,
  parallelismType,
  stepTimeBudgetMs,
  topK = 2,
  numMoELayers = 0,
  className,
}: NetworkPanelProps) {
  const modelBytes = numParams * bytesPerParam;
  const stepTimeSec = stepTimeBudgetMs / 1000;

  const commBytes = React.useMemo(() => {
    switch (parallelismType) {
      case 'tp':
        return computeTPCommBytes(numLayers, batchSize, seqLen, hiddenSize, bytesPerParam);
      case 'pp':
        return computePPCommBytes(batchSize, seqLen, hiddenSize, bytesPerParam);
      case 'zero3':
        return computeZeRO3CommBytes(modelBytes);
      case 'moe':
        return computeMoECommBytes(batchSize, seqLen, hiddenSize, topK, bytesPerParam, numMoELayers || numLayers);
      default:
        return computeAllReduceBytes(modelBytes, numGPUs);
    }
  }, [parallelismType, numGPUs, modelBytes, numLayers, batchSize, seqLen, hiddenSize, bytesPerParam, topK, numMoELayers]);

  const requiredBandwidthGBs = computeRequiredBandwidth(commBytes, stepTimeSec);
  const recommended = recommendInterconnect(requiredBandwidthGBs);

  // Assume recommended interconnect bandwidth for overhead calc
  // Use a rough mapping from the recommendation string
  const approxBandwidthGBs = requiredBandwidthGBs > 0 ? requiredBandwidthGBs * 1.5 : 25;
  const overheadPct = computeCommOverheadPercent(commBytes, approxBandwidthGBs, stepTimeSec);

  const commGB = commBytes / 1e9;

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Wifi size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Network / Bandwidth
        </h3>
      </div>

      <div className="flex flex-col">
        <KVRow label="Parallelism" value={parallelismType.toUpperCase()} />
        <KVRow label="Comm / step" value={`${commGB.toFixed(2)} GB`} />
        <KVRow label="Step budget" value={`${stepTimeBudgetMs} ms`} />
        <KVRow label="Required BW" value={`${requiredBandwidthGBs.toFixed(1)} GB/s`} highlight />
        <KVRow label="Recommended" value={recommended} highlight />
        <KVRow label="Comm overhead" value={`${overheadPct.toFixed(1)}%`} />
      </div>
    </div>
  );
}

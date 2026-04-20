import { cn } from '@/lib/utils';

interface UserExperienceSummaryProps {
  modelName: string;
  gpuName: string;
  concurrentUsers: number;
  ttftMs: number;
  tpotMs: number;
  avgOutputTokens: number;
  aggregateThroughput: number;
  maxConcurrentUsers: number;
  totalVRAMGB: number;
  usedVRAMGB: number;
  costPerUserPerHour: number;
  costPerMTokens: number;
  costPerRequest: number;
  bottleneck: 'memory' | 'throughput' | 'prefill';
  sloTTFTMs: number;
  sloTPOTMs: number;
  // "What if?" 2× GPU scenario
  doubleGPUMaxUsers?: number;
  doubleGPUCostPerHour?: number;
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatCost(usd: number): string {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function SLOStatus({ actual, slo }: { actual: number; slo: number }) {
  const p95 = actual * 1.5;
  const met = p95 <= slo;
  return (
    <span className={cn('text-xs font-semibold ml-1', met ? 'text-green-500' : 'text-red-500')}>
      {met ? '🟢' : '🔴'}
    </span>
  );
}

const BOTTLENECK_TIPS: Record<string, string[]> = {
  memory: [
    'Use FP8 KV cache to increase capacity ~2×',
    'Enable PagedAttention to reduce fragmentation',
    'Reduce context length to free KV cache memory',
  ],
  throughput: [
    'Use a GPU with higher memory bandwidth',
    'Reduce model size with quantization (Q4/Q8)',
    'Add more GPU replicas to scale throughput',
  ],
  prefill: [
    'Use chunked prefill to reduce head-of-line blocking',
    'Upgrade to a higher-FLOPS GPU',
    'Use speculative decoding to reduce prefill load',
  ],
};

export function UserExperienceSummary({
  modelName,
  gpuName,
  concurrentUsers,
  ttftMs,
  tpotMs,
  avgOutputTokens,
  aggregateThroughput,
  maxConcurrentUsers,
  totalVRAMGB,
  usedVRAMGB,
  costPerUserPerHour,
  costPerMTokens,
  costPerRequest,
  bottleneck,
  sloTTFTMs,
  sloTPOTMs,
  doubleGPUMaxUsers,
  doubleGPUCostPerHour,
}: UserExperienceSummaryProps) {
  const e2eMs = ttftMs + avgOutputTokens * tpotMs;
  const vramPct = totalVRAMGB > 0 ? Math.round((usedVRAMGB / totalVRAMGB) * 100) : 0;
  const capacityPct = maxConcurrentUsers > 0 ? Math.round((concurrentUsers / maxConcurrentUsers) * 100) : 0;
  const tokPerSec = tpotMs > 0 ? Math.round(1000 / tpotMs) : 0;
  const tips = BOTTLENECK_TIPS[bottleneck] ?? [];

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-subtle p-4 flex flex-col gap-3">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">User Experience Summary</p>
        <p className="text-xs text-fg-muted mt-0.5">
          For {concurrentUsers.toLocaleString()} concurrent users on {gpuName}
        </p>
        <p className="text-xs text-fg-muted">Model: {modelName}</p>
      </div>

      {/* Latency metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">⏱ Time to first token</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">
            {formatMs(ttftMs)}
            <SLOStatus actual={ttftMs} slo={sloTTFTMs} />
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">⏱ Per-token latency</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">
            {formatMs(tpotMs)}
            <SLOStatus actual={tpotMs} slo={sloTPOTMs} />
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">⏱ Token generation speed</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">{tokPerSec} tok/s</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">⏱ Full response time</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">
            {formatMs(e2eMs)} <span className="text-[10px] text-fg-muted">({avgOutputTokens} tokens)</span>
          </span>
        </div>
      </div>

      {/* Throughput & capacity */}
      <div className="grid grid-cols-2 gap-2 border-t border-border-subtle pt-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">📊 Effective throughput</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">
            {Math.round(aggregateThroughput).toLocaleString()} tok/s
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">📊 Max capacity</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">
            {maxConcurrentUsers.toLocaleString()} users <span className="text-[10px] text-fg-muted">({capacityPct}% used)</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 col-span-2">
          <span className="text-[10px] text-fg-muted">📊 VRAM utilization</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">
            {usedVRAMGB.toFixed(1)} / {totalVRAMGB} GB ({vramPct}%)
          </span>
        </div>
      </div>

      {/* Cost metrics */}
      <div className="grid grid-cols-3 gap-2 border-t border-border-subtle pt-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">💰 Per request</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">{formatCost(costPerRequest)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">💰 Per 1M tokens</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">{formatCost(costPerMTokens)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-fg-muted">💰 Per user/hour</span>
          <span className="text-sm font-mono font-semibold text-fg-primary">{formatCost(costPerUserPerHour)}</span>
        </div>
      </div>

      {/* Bottleneck */}
      <div className="border-t border-border-subtle pt-2">
        <p className="text-xs font-medium text-fg-default">
          ⚡ Bottleneck: <span className="text-amber-500 capitalize">{bottleneck === 'throughput' ? 'Memory bandwidth (decode)' : bottleneck === 'memory' ? 'KV cache memory' : 'Prefill compute'}</span>
        </p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {tips.slice(0, 2).map(tip => (
            <li key={tip} className="text-[10px] text-fg-muted">💡 {tip}</li>
          ))}
        </ul>
      </div>

      {/* What if? */}
      {doubleGPUMaxUsers !== undefined && doubleGPUCostPerHour !== undefined && (
        <div className="border-t border-border-subtle pt-2 bg-bg-muted/50 rounded px-2 py-1.5">
          <p className="text-[10px] font-medium text-fg-default">
            What if? With 2× GPUs: {doubleGPUMaxUsers.toLocaleString()} users, same latency, {formatCost(doubleGPUCostPerHour)}/h
          </p>
        </div>
      )}
    </div>
  );
}

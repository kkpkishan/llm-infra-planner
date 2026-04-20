/**
 * Batch processing mode calculator.
 *
 * Batch mode removes latency constraints and maximizes throughput
 * by filling all available KV cache VRAM.
 */

export interface BatchResult {
  maxBatchSize: number;
  maxAggThroughputTokensPerSec: number;
  timeToProcessNDocumentsHours: (numDocs: number, avgTokensPerDoc: number) => number;
  costPerMTokens: number;
  throughputMultiplierVsRealtime: number;
}

/**
 * Compute batch mode metrics.
 *
 * @param freeVRAMForKVGB           - Free VRAM available for KV cache in GB
 * @param kvPerUserGB               - KV cache per user/sequence in GB
 * @param decodeTokensPerSecPerUser - Decode throughput per sequence in tokens/s
 * @param hourlyCloudCost           - Cloud instance cost per hour in USD
 */
export function computeBatchMode(
  freeVRAMForKVGB: number,
  kvPerUserGB: number,
  decodeTokensPerSecPerUser: number,
  hourlyCloudCost: number,
): BatchResult {
  // Max batch size: fill all available KV cache VRAM
  const maxBatchSize = kvPerUserGB > 0
    ? Math.max(1, Math.floor(freeVRAMForKVGB / kvPerUserGB))
    : 1;

  // Max aggregate throughput: batch × decode_per_seq
  // At high batch, we're compute-bound, so throughput plateaus
  // Use 0.90 efficiency for batch mode (better utilization than real-time)
  const maxAggThroughputTokensPerSec = maxBatchSize * decodeTokensPerSecPerUser * 0.90;

  // Cost per 1M tokens in batch mode
  // cost_per_M_tokens = hourly_cost / (agg_throughput × 3600) × 1e6
  // = hourly_cost / (agg_throughput × 3.6)
  const costPerMTokens = maxAggThroughputTokensPerSec > 0
    ? hourlyCloudCost / (maxAggThroughputTokensPerSec * 3.6)
    : 0;

  // Throughput multiplier vs real-time (at 50 users baseline)
  const realtimeBaseline = 50 * decodeTokensPerSecPerUser * 0.85;
  const throughputMultiplierVsRealtime = realtimeBaseline > 0
    ? maxAggThroughputTokensPerSec / realtimeBaseline
    : 1;

  // Time to process N documents
  const timeToProcessNDocumentsHours = (numDocs: number, avgTokensPerDoc: number): number => {
    const totalTokens = numDocs * avgTokensPerDoc;
    if (maxAggThroughputTokensPerSec <= 0) return Infinity;
    return totalTokens / maxAggThroughputTokensPerSec / 3600;
  };

  return {
    maxBatchSize,
    maxAggThroughputTokensPerSec,
    timeToProcessNDocumentsHours,
    costPerMTokens,
    throughputMultiplierVsRealtime,
  };
}

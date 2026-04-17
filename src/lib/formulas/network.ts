/**
 * Network bandwidth formulas for distributed training and serving.
 * All byte values are in bytes unless otherwise noted.
 */

/**
 * Ring all-reduce communication bytes per GPU.
 * Formula: 2 × (N-1)/N × model_bytes
 */
export function computeAllReduceBytes(modelBytes: number, numGPUs: number): number {
  if (numGPUs <= 1) return 0;
  return 2 * ((numGPUs - 1) / numGPUs) * modelBytes;
}

/**
 * Tensor Parallel communication bytes per step.
 * 4 all-reduces per layer × L layers × (batch × seq × hidden × dtype_bytes)
 */
export function computeTPCommBytes(
  numLayers: number,
  batchSize: number,
  seqLen: number,
  hiddenSize: number,
  bytesPerParam: number,
): number {
  return 4 * numLayers * batchSize * seqLen * hiddenSize * bytesPerParam;
}

/**
 * Pipeline Parallel activation transfer per micro-batch boundary.
 * batch × seq × hidden × dtype_bytes
 */
export function computePPCommBytes(
  batchSize: number,
  seqLen: number,
  hiddenSize: number,
  bytesPerParam: number,
): number {
  return batchSize * seqLen * hiddenSize * bytesPerParam;
}

/**
 * ZeRO-3 communication bytes per step.
 * 3 × model_bytes (all-gather fwd + all-gather bwd + reduce-scatter grads)
 */
export function computeZeRO3CommBytes(modelBytes: number): number {
  return 3 * modelBytes;
}

/**
 * MoE expert-parallel communication bytes.
 * 2 × batch × seq × hidden × top_k × dtype_bytes all-to-alls per MoE layer
 */
export function computeMoECommBytes(
  batchSize: number,
  seqLen: number,
  hiddenSize: number,
  topK: number,
  bytesPerParam: number,
  numMoELayers: number,
): number {
  return 2 * batchSize * seqLen * hiddenSize * topK * bytesPerParam * numMoELayers;
}

/**
 * Required bandwidth in GB/s.
 * bytes_per_step / step_time_budget_seconds
 */
export function computeRequiredBandwidth(bytesPerStep: number, stepTimeBudgetSec: number): number {
  if (stepTimeBudgetSec <= 0) return 0;
  return bytesPerStep / stepTimeBudgetSec / 1e9;
}

/**
 * Communication overhead as % of step time.
 * (comm_bytes / bandwidth_bytes_per_sec) / step_time_sec × 100
 */
export function computeCommOverheadPercent(
  commBytes: number,
  bandwidthGBs: number,
  stepTimeSec: number,
): number {
  if (bandwidthGBs <= 0 || stepTimeSec <= 0) return 0;
  const commTimeSec = commBytes / (bandwidthGBs * 1e9);
  return (commTimeSec / stepTimeSec) * 100;
}

/**
 * Recommend interconnect based on required bandwidth (GB/s).
 */
export function recommendInterconnect(requiredBandwidthGBs: number): string {
  if (requiredBandwidthGBs <= 4)   return 'PCIe Gen4 (32 GB/s)';
  if (requiredBandwidthGBs <= 8)   return 'PCIe Gen5 (64 GB/s)';
  if (requiredBandwidthGBs <= 25)  return 'InfiniBand HDR (200 Gb/s ~25 GB/s)';
  if (requiredBandwidthGBs <= 50)  return 'InfiniBand NDR (400 Gb/s ~50 GB/s)';
  if (requiredBandwidthGBs <= 100) return 'InfiniBand XDR / RoCEv2 (800 Gb/s ~100 GB/s)';
  if (requiredBandwidthGBs <= 112) return 'NVLink 3 (A100, 600 GB/s)';
  if (requiredBandwidthGBs <= 225) return 'NVLink 4 (H100/H200, 900 GB/s)';
  return 'NVLink 5 (B200/GB200, 1800 GB/s)';
}

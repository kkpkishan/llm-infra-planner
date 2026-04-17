/**
 * Storage capacity formulas for training data, checkpoints, and logs.
 */

/**
 * Checkpoint size in bytes.
 * params × 16 bytes: BF16 weights (2) + BF16 grads (2) + FP32 Adam m (4) + FP32 Adam v (4) + FP32 master (4)
 */
export function computeCheckpointBytes(numParams: number): number {
  return numParams * 16;
}

/**
 * Data loading bandwidth requirement in MB/s.
 * global_batch × seq_len × bytes_per_token / step_time_sec
 */
export function computeDataLoadingBandwidth(
  globalBatch: number,
  seqLen: number,
  bytesPerToken: number,
  stepTimeSec: number,
): number {
  if (stepTimeSec <= 0) return 0;
  return (globalBatch * seqLen * bytesPerToken) / stepTimeSec / 1e6;
}

/**
 * Total storage breakdown in GB.
 * - dataGB: num_tokens × 2 bytes (uint16 token IDs)
 * - checkpointsGB: checkpoint_bytes × num_checkpoints
 * - logsGB: flat 10 GB estimate
 * - headroomGB: 20% of (data + checkpoints + logs)
 * - totalGB: data + checkpoints + logs + headroom
 */
export function computeTotalStorage(
  numTokens: number,
  numCheckpoints: number,
  numParams: number,
): { dataGB: number; checkpointsGB: number; logsGB: number; totalGB: number; headroomGB: number } {
  const dataGB = (numTokens * 2) / 1e9; // uint16 token IDs
  const checkpointsGB = (computeCheckpointBytes(numParams) * numCheckpoints) / 1e9;
  const logsGB = 10; // flat estimate
  const subtotal = dataGB + checkpointsGB + logsGB;
  const headroomGB = subtotal * 0.2;
  const totalGB = subtotal + headroomGB;
  return { dataGB, checkpointsGB, logsGB, totalGB, headroomGB };
}

/**
 * Recommend storage tier based on required bandwidth (MB/s).
 */
export function recommendStorageTier(requiredMBs: number): string {
  if (requiredMBs <= 200)    return 'HDD (~200 MB/s)';
  if (requiredMBs <= 550)    return 'SATA SSD (~550 MB/s)';
  if (requiredMBs <= 7000)   return 'NVMe Gen4 (~7 GB/s)';
  if (requiredMBs <= 14000)  return 'NVMe Gen5 (~14 GB/s)';
  return 'Parallel FS / Lustre (100+ GB/s)';
}

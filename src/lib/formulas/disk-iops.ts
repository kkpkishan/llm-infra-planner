/**
 * Disk throughput and tier recommendation formulas.
 */

export interface StorageTier {
  name: string;
  typicalBandwidthMBs: number;
  description: string;
}

export const STORAGE_TIERS: StorageTier[] = [
  { name: 'HDD',         typicalBandwidthMBs: 200,    description: 'Spinning disk, ~200 MB/s' },
  { name: 'SATA SSD',    typicalBandwidthMBs: 550,    description: 'SATA SSD, ~550 MB/s' },
  { name: 'NVMe Gen4',   typicalBandwidthMBs: 7000,   description: 'NVMe Gen4, ~7 GB/s' },
  { name: 'NVMe Gen5',   typicalBandwidthMBs: 14000,  description: 'NVMe Gen5, ~14 GB/s' },
  { name: 'Parallel FS', typicalBandwidthMBs: 100000, description: 'Lustre/GPFS, 100+ GB/s' },
];

/**
 * Checkpoint write bandwidth requirement in MB/s.
 * checkpoint_bytes / time_budget_sec / 1e6
 * checkpoint_bytes = params × 16
 */
export function computeCheckpointWriteBandwidth(numParams: number, timeBudgetSec: number): number {
  if (timeBudgetSec <= 0) return 0;
  const checkpointBytes = numParams * 16;
  return checkpointBytes / timeBudgetSec / 1e6;
}

/**
 * Check if checkpoint write is feasible within the given disk bandwidth.
 */
export function checkCheckpointFeasibility(
  numParams: number,
  timeBudgetSec: number,
  diskBandwidthMBs: number,
): { feasible: boolean; requiredMBs: number; message: string } {
  const requiredMBs = computeCheckpointWriteBandwidth(numParams, timeBudgetSec);
  const feasible = requiredMBs <= diskBandwidthMBs;
  const message = feasible
    ? `Checkpoint write feasible: ${requiredMBs.toFixed(0)} MB/s required, ${diskBandwidthMBs} MB/s available`
    : `Checkpoint write exceeds disk throughput: ${requiredMBs.toFixed(0)} MB/s required but only ${diskBandwidthMBs} MB/s available`;
  return { feasible, requiredMBs, message };
}

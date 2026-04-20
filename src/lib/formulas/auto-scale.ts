/**
 * Auto-scaling / replica calculator.
 *
 * Computes scaling table for different replica counts.
 */

export interface ScalingRow {
  replicas: number;
  totalGPUs: number;
  maxUsers: number;
  tpotMs: number;
  costPerHour: number;
  costPerMTokens: number;
}

/**
 * Compute scaling table for different replica counts.
 *
 * @param maxUsersPerReplica        - Max concurrent users per replica
 * @param tpotMs                    - TPOT in ms per replica (stays constant with replication)
 * @param gpusPerReplica            - GPUs per replica (1 for single-GPU, N for TP group)
 * @param costPerGPUHour            - Cost per GPU per hour in USD
 * @param decodeTokensPerSecPerUser - Decode throughput per user in tokens/s
 * @param avgOutputTokens           - Average output tokens per request
 * @param replicaCounts             - Replica counts to compute (default [1,2,4,8,16])
 */
export function computeScalingTable(
  maxUsersPerReplica: number,
  tpotMs: number,
  gpusPerReplica: number,
  costPerGPUHour: number,
  decodeTokensPerSecPerUser: number,
  _avgOutputTokens: number,
  replicaCounts: number[] = [1, 2, 4, 8, 16],
): ScalingRow[] {
  return replicaCounts.map(replicas => {
    const totalGPUs = replicas * gpusPerReplica;
    const maxUsers = replicas * maxUsersPerReplica;
    const costPerHour = totalGPUs * costPerGPUHour;

    // Aggregate throughput across all replicas
    const aggThroughput = maxUsers * decodeTokensPerSecPerUser * 0.85;

    // Cost per 1M output tokens
    // cost_per_M_tokens = cost_per_hour / (agg_throughput × 3.6)
    const costPerMTokens = aggThroughput > 0
      ? costPerHour / (aggThroughput * 3.6)
      : 0;

    return {
      replicas,
      totalGPUs,
      maxUsers,
      tpotMs,
      costPerHour,
      costPerMTokens,
    };
  });
}

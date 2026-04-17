/**
 * QPS-to-replicas formula and cost projections for large-scale LLM serving.
 */

export interface ReplicaConfig {
  replicas: number;
  totalGPUs: number;
  costPerHour: number;
  costPerDay: number;
  costPerMonth: number;
  autoScaleThresholds: {
    scaleUpGPUUtil: number;    // 70%
    scaleUpCacheUtil: number;  // 80%
    scaleUpQueueDepth: number; // configurable
    cooldownSec: number;       // 300s
  };
}

/**
 * Compute replica count and cost projections.
 *
 * per_replica_QPS = tokensPerSecond / avgOutputTokens
 * replicas = ceil(peak_QPS / per_replica_QPS × safety_factor)
 */
export function computeReplicas(
  targetQPS: number,
  tokensPerSecond: number,
  avgOutputTokens: number,
  safetyFactor: number,   // 1.2-2.0, default 1.4
  gpusPerReplica: number,
  costPerGPUHour: number,
): ReplicaConfig {
  const perReplicaQPS = tokensPerSecond / Math.max(avgOutputTokens, 1);
  const replicas = Math.ceil((targetQPS / Math.max(perReplicaQPS, 0.001)) * safetyFactor);
  const totalGPUs = replicas * gpusPerReplica;
  const costPerHour = totalGPUs * costPerGPUHour;

  return {
    replicas,
    totalGPUs,
    costPerHour,
    costPerDay: costPerHour * 24,
    costPerMonth: costPerHour * 24 * 30,
    autoScaleThresholds: {
      scaleUpGPUUtil: 70,
      scaleUpCacheUtil: 80,
      scaleUpQueueDepth: Math.max(10, Math.ceil(targetQPS * 0.5)),
      cooldownSec: 300,
    },
  };
}

/**
 * Compute blended cost with spot instance mix.
 * spotPercent: 0-80 (percentage of replicas on spot)
 * spotDiscount: fraction discount vs on-demand (e.g. 0.7 = 70% cheaper)
 */
export function computeBlendedCost(
  onDemandCostPerHour: number,
  spotPercent: number,
  spotDiscount = 0.7,
): { blendedCostPerHour: number; savingsPercent: number } {
  const spotFraction = Math.min(spotPercent, 80) / 100;
  const onDemandFraction = 1 - spotFraction;
  const blendedCostPerHour =
    onDemandCostPerHour * onDemandFraction +
    onDemandCostPerHour * (1 - spotDiscount) * spotFraction;
  const savingsPercent = ((onDemandCostPerHour - blendedCostPerHour) / onDemandCostPerHour) * 100;
  return { blendedCostPerHour, savingsPercent };
}

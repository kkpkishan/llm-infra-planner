import type { ScaleConfig } from './types';

export interface ScaleResult {
  requiredReplicas: number;
  totalClusterCostPerHour: number;
  costPerMillionTokens: number;
}

/**
 * Compute required GPU replicas for a target QPS.
 * Formula: ceil((targetQPS × avgOutputTokens) / throughputPerGPU × headroomFactor)
 * headroomFactor: 1.2–1.3 (20–30% headroom for P99 latency)
 */
export function computeScaleRequirements(
  config: ScaleConfig,
  throughputPerGPU: number,
  hourlyCloudCostPerGPU: number
): ScaleResult {
  const { targetQPS, avgOutputTokens, headroomFactor } = config;

  const targetOutputTokensPerSec = targetQPS * avgOutputTokens;
  const requiredReplicas = Math.ceil(
    (targetOutputTokensPerSec / throughputPerGPU) * headroomFactor
  );

  const totalClusterCostPerHour = requiredReplicas * hourlyCloudCostPerGPU;

  // Cost per million tokens
  const totalThroughput = throughputPerGPU * requiredReplicas;
  const tokensPerHour = totalThroughput * 3600;
  const costPerMillionTokens =
    tokensPerHour > 0
      ? Math.round((totalClusterCostPerHour / tokensPerHour) * 1_000_000 * 100) / 100
      : 0;

  return { requiredReplicas, totalClusterCostPerHour, costPerMillionTokens };
}

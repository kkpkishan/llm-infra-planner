import type { CostMetricsInput, CostMetricsResult } from './types';

/**
 * Compute cost per million tokens and time-to-first-token.
 *
 * Cost per million tokens:
 *   round((hourlyCloudCost / (tokensPerSecond × 3600)) × 1_000_000, 2)
 *
 * Time-to-first-token (prefill estimate):
 *   Prefill processes contextLength tokens in one forward pass.
 *   Estimated as: contextLength / (computeTFLOPS × 1e12 / modelFLOPs_per_token)
 *   Simplified: TTFT ≈ (contextLength × activeWeightsGB × 2) / (computeTFLOPS × 1e3) ms
 */
export function computeCostMetrics(input: CostMetricsInput): CostMetricsResult {
  const { tokensPerSecond, hourlyCloudCost, contextLength, activeWeightsGB, computeTFLOPS } = input;

  // Cost per million tokens
  let costPerMillionTokens = 0;
  if (tokensPerSecond > 0 && hourlyCloudCost > 0) {
    const tokensPerHour = tokensPerSecond * 3600;
    costPerMillionTokens = Math.round((hourlyCloudCost / tokensPerHour) * 1_000_000 * 100) / 100;
  }

  // Time-to-first-token (prefill phase estimate in ms)
  // Simplified roofline: TTFT ≈ (contextLength × 2 × activeWeightsGB × 1e9) / (computeTFLOPS × 1e12) × 1000
  let timeToFirstTokenMs = 0;
  if (computeTFLOPS > 0 && activeWeightsGB > 0) {
    const prefillFLOPs = contextLength * 2 * activeWeightsGB * 1e9; // approx FLOPs for prefill
    const computeFlopsPerSec = computeTFLOPS * 1e12;
    timeToFirstTokenMs = Math.round((prefillFLOPs / computeFlopsPerSec) * 1000);
  }

  return { costPerMillionTokens, timeToFirstTokenMs };
}

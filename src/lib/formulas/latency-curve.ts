/**
 * Latency curve model: TPOT(n) as a function of concurrent users.
 *
 * Three regimes:
 * 1. Memory-bound (low batch): TPOT ≈ constant + small scheduling overhead
 * 2. Transition: TPOT grows with batch / saturation_point
 * 3. Compute-bound (high batch): TPOT ∝ batch (linear)
 */

import type { DecodeResult } from './decode';
import { computeTPOTAtBatch } from './decode';

export interface LatencyCurvePoint {
  users: number;
  tpotMs: number;
  aggregateThroughput: number;
}

export interface LatencyCurveResult {
  points: LatencyCurvePoint[];
  sweetSpotUsers: number;
  maxCapacityUsers: number;
  computeSaturationUsers: number;
}

/**
 * Compute the latency curve (TPOT and aggregate throughput vs user count).
 *
 * @param decodeResult      - Result from computeDecode
 * @param gpuFlopsTFLOPS    - GPU peak FLOPS in TFLOPS
 * @param paramsActive      - Active parameters
 * @param bytesPerParam     - Bytes per parameter
 * @param maxUsers          - Maximum users to plot (typically maxConcurrentUsers × 2)
 */
export function computeLatencyCurve(
  decodeResult: DecodeResult,
  gpuFlopsTFLOPS: number,
  paramsActive: number,
  bytesPerParam: number,
  maxUsers: number,
): LatencyCurveResult {
  const { computeSaturationBatch } = decodeResult;
  const plotMax = Math.max(10, maxUsers * 2);

  // Generate user counts: 1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 40, 50, ...
  const userCounts = generateUserCounts(1, plotMax);

  const points: LatencyCurvePoint[] = userCounts.map(n => {
    const tpotMs = computeTPOTAtBatch(decodeResult, n, gpuFlopsTFLOPS, paramsActive, bytesPerParam);

    // Aggregate throughput:
    // Memory-bound: agg = n × decode_per_user × 0.85
    // Compute-bound: agg = GPU_FLOPS × MFU / (2 × params_active) [ceiling]
    const gpuFlopsPerSec = gpuFlopsTFLOPS * 1e12;
    const mfu = 0.65;
    const computeCeiling = (gpuFlopsPerSec * mfu) / (2 * paramsActive);
    const memBoundAgg = n * decodeResult.decodeTokensPerSecPerUser * 0.85;
    const aggregateThroughput = Math.min(memBoundAgg, computeCeiling);

    return { users: n, tpotMs, aggregateThroughput };
  });

  // Sweet spot: where throughput/TPOT ratio is optimal (efficiency peak)
  // Find the point where marginal throughput gain per TPOT increase is maximized
  let sweetSpotUsers = 1;
  let bestEfficiency = 0;
  for (const pt of points) {
    if (pt.tpotMs > 0) {
      const efficiency = pt.aggregateThroughput / pt.tpotMs;
      if (efficiency > bestEfficiency) {
        bestEfficiency = efficiency;
        sweetSpotUsers = pt.users;
      }
    }
  }

  // Max capacity: where TPOT exceeds a reasonable threshold (200ms)
  const MAX_TPOT_THRESHOLD = 200;
  let maxCapacityUsers = maxUsers;
  for (const pt of points) {
    if (pt.tpotMs > MAX_TPOT_THRESHOLD) {
      maxCapacityUsers = pt.users;
      break;
    }
  }

  return {
    points,
    sweetSpotUsers,
    maxCapacityUsers,
    computeSaturationUsers: computeSaturationBatch,
  };
}

/**
 * Generate a log-spaced set of user counts for plotting.
 */
function generateUserCounts(min: number, max: number): number[] {
  const counts: number[] = [];
  // Dense at low values, sparse at high values
  for (let i = min; i <= Math.min(max, 20); i++) {
    counts.push(i);
  }
  for (let i = 25; i <= Math.min(max, 100); i += 5) {
    counts.push(i);
  }
  for (let i = 125; i <= Math.min(max, 500); i += 25) {
    counts.push(i);
  }
  for (let i = 600; i <= Math.min(max, 2000); i += 100) {
    counts.push(i);
  }
  for (let i = 2500; i <= max; i += 500) {
    counts.push(i);
  }
  // Always include max
  if (counts[counts.length - 1] !== max) {
    counts.push(max);
  }
  return counts.filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);
}

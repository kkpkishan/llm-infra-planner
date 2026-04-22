import type { GPUSpec, GPUFitResult, GPURecommendations, FitStatus, ThroughputInput } from './types';
import { computeThroughput } from './throughput';

/**
 * Classify GPU fit status based on VRAM utilization.
 * green:  ≤ 80% utilization
 * yellow: 80–100% utilization
 * red:    > 100% (overflow)
 */
export function classifyGPUFit(totalVRAMGB: number, gpuMemoryGB: number): FitStatus {
  const utilization = totalVRAMGB / gpuMemoryGB;
  if (utilization <= 0.8) return 'green';
  if (utilization <= 1.0) return 'yellow';
  return 'red';
}

/**
 * Categories excluded from standard recommendations.
 * wafer-scale: Cerebras WSE — not purchasable, no standard pricing
 * tpu:         Google TPU — cloud-only, handled by cloud recommender
 * edge:        Jetson etc — too small for most LLM workloads
 */
const EXCLUDED_CATEGORIES = new Set(['wafer-scale', 'tpu', 'edge']);

/**
 * Recommend GPUs from the database for a given VRAM requirement.
 * Returns all fits sorted by utilization, plus Budget/Balanced/Performance tier picks.
 *
 * Tier classification:
 *   Budget:      price < $1000, VRAM ≥ 12 GB
 *   Balanced:    price $1000–$3000, VRAM 16–48 GB
 *   Performance: price > $3000 or datacenter category
 *
 * Excluded from recommendations (still shown in hardware catalog):
 *   - wafer-scale (Cerebras WSE): not purchasable individually
 *   - tpu (Google TPU): cloud-only, covered by cloud recommender
 *   - edge (Jetson etc): too small for LLM workloads
 */
export function recommendGPUs(
  totalVRAMGB: number,
  gpus: GPUSpec[],
  throughputInput?: Omit<ThroughputInput, 'memoryBandwidthGBs'>
): GPURecommendations {
  // Filter out categories that aren't practical for standard deployment
  const eligibleGPUs = gpus.filter(gpu => !EXCLUDED_CATEGORIES.has(gpu.category));

  const allFits: GPUFitResult[] = eligibleGPUs.map(gpu => {
    const fitStatus = classifyGPUFit(totalVRAMGB, gpu.memoryGB);
    const utilizationPercent = Math.round((totalVRAMGB / gpu.memoryGB) * 100);
    const freeVRAMGB = Math.max(0, gpu.memoryGB - totalVRAMGB);

    let tokensPerSecond: number | undefined;
    if (throughputInput) {
      const result = computeThroughput({
        memoryBandwidthGBs: gpu.memoryBandwidthGBs,
        activeWeightsGB: throughputInput.activeWeightsGB,
        efficiencyFactor: throughputInput.efficiencyFactor,
      });
      tokensPerSecond = result.tokensPerSecond;
    }

    return { gpu, fitStatus, utilizationPercent, freeVRAMGB, tokensPerSecond };
  });

  // Sort: green first (by utilization asc), then yellow, then red
  allFits.sort((a, b) => {
    const order = { green: 0, yellow: 1, red: 2 };
    if (order[a.fitStatus] !== order[b.fitStatus]) {
      return order[a.fitStatus] - order[b.fitStatus];
    }
    return a.utilizationPercent - b.utilizationPercent;
  });

  // Tier picks — only from green/yellow fits
  const fittingGPUs = allFits.filter(f => f.fitStatus !== 'red');

  const getPrice = (gpu: GPUSpec) => gpu.streetUSD ?? gpu.msrpUSD ?? 0;

  const budget = fittingGPUs.find(f => {
    const price = getPrice(f.gpu);
    return price < 1000 && f.gpu.memoryGB >= 12;
  }) ?? null;

  const balanced = fittingGPUs.find(f => {
    const price = getPrice(f.gpu);
    return price >= 1000 && price <= 3000 && f.gpu.memoryGB >= 16 && f.gpu.memoryGB <= 48;
  }) ?? null;

  const performance = fittingGPUs.find(f => {
    const price = getPrice(f.gpu);
    return price > 3000 || f.gpu.category === 'datacenter';
  }) ?? null;

  return { allFits, budget, balanced, performance };
}

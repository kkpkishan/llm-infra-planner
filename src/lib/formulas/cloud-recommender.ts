import type { CloudInstance, CloudRecommendation, GPUSpec, FitStatus } from './types';

/**
 * Recommend cloud instances for a given VRAM requirement.
 * Filters instances that can accommodate the workload, sorts by on-demand price ascending.
 * Marks the cheapest instance (by $/M tokens or $/h) as isBestPrice.
 */
export function recommendCloudInstances(
  totalVRAMGB: number,
  instances: CloudInstance[],
  gpuDb: GPUSpec[],
  providerFilter?: string,
  regionFilter?: string
): CloudRecommendation[] {
  // Build a GPU memory lookup
  const gpuMemoryMap = new Map<string, number>(
    gpuDb.map(g => [g.id, g.memoryGB])
  );

  // Filter and score each instance
  const recommendations: CloudRecommendation[] = [];

  for (const instance of instances) {
    // Provider filter
    if (providerFilter && instance.provider !== providerFilter) continue;

    // Region filter
    if (regionFilter && !instance.regions.includes(regionFilter)) continue;

    // Compute total GPU memory for this instance
    const totalGPUMemoryGB = instance.gpus.reduce((sum, g) => {
      const mem = gpuMemoryMap.get(g.id) ?? 0;
      return sum + mem * g.count;
    }, 0);

    // Determine fit status
    let fitStatus: FitStatus;
    if (totalGPUMemoryGB === 0) {
      // Serverless / managed — always fits
      fitStatus = 'green';
    } else {
      const utilization = totalVRAMGB / totalGPUMemoryGB;
      if (utilization <= 0.8) fitStatus = 'green';
      else if (utilization <= 1.0) fitStatus = 'yellow';
      else fitStatus = 'red';
    }

    // Only include instances that can fit the workload (green or yellow)
    if (fitStatus === 'red') continue;

    recommendations.push({
      instance,
      totalGPUMemoryGB,
      fitStatus,
      onDemandPerHour: instance.pricing.onDemandUSDPerHour,
      spotPerHour: instance.pricing.spotUSDPerHour,
      isBestPrice: false, // set below
    });
  }

  // Sort by on-demand price ascending
  recommendations.sort((a, b) => a.onDemandPerHour - b.onDemandPerHour);

  // Mark the cheapest as best price
  if (recommendations.length > 0) {
    recommendations[0].isBestPrice = true;
  }

  return recommendations;
}

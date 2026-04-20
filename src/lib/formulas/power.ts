export interface PowerResult {
  facilityPowerKW: number;       // GPU_count × GPU_TDP × PUE × duty_cycle / 1000
  annualKWh: number;             // facilityPowerKW × 8760
  annualCostUSD: number;         // annualKWh × electricityCostPerKWh
  perGPUHourlyCostUSD: number;
  psuRecommendedWatts: number;   // total wattage + 25% headroom
}

export type PUEPreset = 'hyperscale' | 'colo' | 'enterprise' | 'office' | 'custom';

export const PUE_PRESETS: Record<PUEPreset, number> = {
  hyperscale: 1.1,
  colo: 1.4,
  enterprise: 1.8,
  office: 2.2,
  custom: 1.0,
};

/**
 * Compute power draw, cooling, and electricity cost.
 *
 * facility_power_kW = GPU_count × GPU_TDP × PUE × duty_cycle / 1000
 * annual_kWh        = facility_power_kW × 8760
 * annual_cost       = annual_kWh × electricityCostPerKWh
 * per_gpu_hourly    = annual_cost / (GPU_count × 8760)
 * psu_recommended   = (GPU_count × GPU_TDP × duty_cycle) × 1.25
 */
export function computePower(
  gpuCount: number,
  gpuTDPWatts: number,
  pue: number,
  dutyCycle: number,              // 0.3–1.0
  electricityCostPerKWh: number
): PowerResult {
  const rawWatts = gpuCount * gpuTDPWatts * dutyCycle;
  const facilityPowerKW = (rawWatts * pue) / 1000;
  const annualKWh = facilityPowerKW * 8760;
  const annualCostUSD = annualKWh * electricityCostPerKWh;
  const perGPUHourlyCostUSD = gpuCount > 0 ? annualCostUSD / (gpuCount * 8760) : 0;
  const psuRecommendedWatts = rawWatts * 1.25;

  return {
    facilityPowerKW,
    annualKWh,
    annualCostUSD,
    perGPUHourlyCostUSD,
    psuRecommendedWatts,
  };
}

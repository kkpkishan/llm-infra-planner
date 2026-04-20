export interface TCOResult {
  onPremHourlyCostUSD: number;
  cloudHourlyCostUSD: number;
  breakevenMonths: number;          // month where on-prem cumulative cost crosses cloud
  onPremCumulativeCosts: number[];  // monthly cumulative costs (36 months)
  cloudCumulativeCosts: number[];   // monthly cumulative costs (36 months)
}

/**
 * Compute Total Cost of Ownership for on-prem vs cloud.
 *
 * On-prem annual cost:
 *   depreciation  = capex / depreciationYears
 *   annual_power  = GPU_count × GPU_TDP × dutyCycle × PUE × 8760 / 1000 × electricityCostPerKWh
 *   annual_colo   = coloPerRackPerMonth × 12
 *   annual_maint  = capex × maintenancePercentPerYear / 100
 *   total_annual  = depreciation + annual_power + annual_colo + annual_maint + staffCostPerYear
 *
 * On-prem hourly cost (utilization-adjusted):
 *   TCO_per_GPU_hr = total_annual / (GPU_count × 8760 × utilizationRate)
 *
 * Cloud hourly cost is provided directly (already per-GPU or per-cluster).
 *
 * Breakeven: month where cumulative on-prem cost (capex + running) crosses cumulative cloud cost.
 */
export function computeTCO(
  capexUSD: number,
  depreciationYears: number,          // 3, 5, or 7
  pue: number,
  electricityCostPerKWh: number,
  coloPerRackPerMonth: number,
  maintenancePercentPerYear: number,  // % of capex
  staffCostPerYear: number,
  gpuCount: number,
  gpuTDPWatts: number,
  dutyCycle: number,
  utilizationRate: number,            // 0.6–0.8 typical
  cloudHourlyCostUSD: number
): TCOResult {
  // Annual on-prem running costs
  const annualDepreciation = capexUSD / depreciationYears;
  const annualPowerKWh = (gpuCount * gpuTDPWatts * dutyCycle * pue * 8760) / 1000;
  const annualPowerCost = annualPowerKWh * electricityCostPerKWh;
  const annualColo = coloPerRackPerMonth * 12;
  const annualMaintenance = capexUSD * (maintenancePercentPerYear / 100);
  const annualRunning = annualPowerCost + annualColo + annualMaintenance + staffCostPerYear;

  // Hourly on-prem cost (utilization-adjusted)
  const effectiveGPUHours = gpuCount * 8760 * utilizationRate;
  const onPremHourlyCostUSD = effectiveGPUHours > 0
    ? (annualDepreciation + annualRunning) / effectiveGPUHours
    : 0;

  // Monthly costs
  const monthlyRunning = annualRunning / 12;
  // Cloud monthly cost: cloudHourlyCostUSD × hours in month × utilization
  const hoursPerMonth = 8760 / 12; // 730
  const cloudMonthly = cloudHourlyCostUSD * hoursPerMonth * utilizationRate;

  // Build 36-month cumulative arrays
  const onPremCumulativeCosts: number[] = [];
  const cloudCumulativeCosts: number[] = [];

  let onPremCumulative = capexUSD; // starts with full capex
  let cloudCumulative = 0;
  let breakevenMonths = -1;

  for (let month = 1; month <= 36; month++) {
    onPremCumulative += monthlyRunning;
    cloudCumulative += cloudMonthly;

    onPremCumulativeCosts.push(onPremCumulative);
    cloudCumulativeCosts.push(cloudCumulative);

    // Breakeven: first month where cloud cumulative exceeds on-prem cumulative
    if (breakevenMonths === -1 && cloudCumulative >= onPremCumulative) {
      breakevenMonths = month;
    }
  }

  return {
    onPremHourlyCostUSD,
    cloudHourlyCostUSD,
    breakevenMonths,
    onPremCumulativeCosts,
    cloudCumulativeCosts,
  };
}

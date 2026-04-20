export type RedundancyMode = 'none' | 'n_plus_1' | 'n_plus_2' | 'multi_az';

export interface FailoverConfig {
  mode: RedundancyMode;
  costMultiplier: number;
  checkpointFrequencyHours: number;
  notes: string;
}

export const REDUNDANCY_CONFIGS: Record<RedundancyMode, FailoverConfig> = {
  none: {
    mode: 'none',
    costMultiplier: 1.0,
    checkpointFrequencyHours: 1,
    notes: 'No redundancy',
  },
  n_plus_1: {
    mode: 'n_plus_1',
    costMultiplier: 1.12,
    checkpointFrequencyHours: 0.5,
    notes: 'N+1: +12% cost',
  },
  n_plus_2: {
    mode: 'n_plus_2',
    costMultiplier: 1.25,
    checkpointFrequencyHours: 0.25,
    notes: 'N+2: +25% cost',
  },
  multi_az: {
    mode: 'multi_az',
    costMultiplier: 2.0,
    checkpointFrequencyHours: 0.1,
    notes: 'Multi-AZ: 2× cost',
  },
};

/**
 * Apply redundancy cost multiplier to a base hourly cost.
 */
export function computeRedundancyCost(
  baseCostPerHour: number,
  mode: RedundancyMode
): number {
  return baseCostPerHour * REDUNDANCY_CONFIGS[mode].costMultiplier;
}

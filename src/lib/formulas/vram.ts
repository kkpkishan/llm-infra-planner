import type { WeightCalcInput, WeightCalcResult } from './types';

/**
 * Compute model weight memory in GB.
 * For MoE models, caller should pass paramsTotal (all experts) for VRAM sizing.
 * Formula: weightGB = round(numParams × bytesPerParam / 1e9, 1)
 */
export function computeWeightMemory(input: WeightCalcInput): WeightCalcResult {
  const rawBytes = input.numParams * input.bytesPerParam;
  const weightGB = Math.round(rawBytes / 1e9 * 10) / 10; // round to 1 decimal
  return { weightGB, rawBytes };
}

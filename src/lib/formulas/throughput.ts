import type { ThroughputInput, ThroughputResult } from './types';
import { SERVING_FRAMEWORKS } from '@/data/serving-frameworks';

/**
 * Estimate inference throughput using the roofline model.
 * Formula: floor(memoryBandwidthGBs / activeWeightsGB × efficiencyFactor)
 *
 * For MoE models, pass activeWeightsGB computed from paramsActive (not paramsTotal).
 * efficiencyFactor: 0.55–0.70 (llama.cpp/Metal), 0.75–0.90 (vLLM/TGI), 0.85–0.95 (TRT-LLM)
 */
export function computeThroughput(input: ThroughputInput): ThroughputResult {
  const { memoryBandwidthGBs, activeWeightsGB, efficiencyFactor } = input;

  if (activeWeightsGB <= 0) {
    return { tokensPerSecond: 0 };
  }

  const tokensPerSecond = Math.floor(
    (memoryBandwidthGBs / activeWeightsGB) * efficiencyFactor
  );

  return { tokensPerSecond };
}

/**
 * Returns the efficiency factor range for a given framework ID.
 * Falls back to vLLM defaults if the framework is not found.
 */
export function getFrameworkEfficiency(frameworkId: string): { min: number; max: number } {
  const fw = SERVING_FRAMEWORKS.find(f => f.id === frameworkId.toLowerCase());
  return fw?.efficiencyFactor ?? { min: 0.75, max: 0.90 };
}

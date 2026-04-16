import type { ThroughputInput, ThroughputResult } from './types';

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

/**
 * Prefill (prompt processing) formulas — compute-bound roofline.
 *
 * Prefill is compute-bound: limited by GPU FLOPS.
 * Formula: prefill_tokens_per_sec = GPU_FLOPS_effective / (2 × params_active)
 */

export interface PrefillResult {
  /** GPU_FLOPS_effective / (2 × params_active) */
  prefillThroughputTokensPerSec: number;
  /** prompt_tokens / prefill_throughput × 1000 */
  prefillTimeMs: number;
  /** prefill_time + scheduling_overhead */
  ttftMs: number;
}

/**
 * MFU (Model FLOP Utilization) by framework.
 * These are typical values for prefill workloads.
 */
export const MFU_BY_FRAMEWORK: Record<string, number> = {
  vllm: 0.65,
  'trt-llm': 0.80,
  'llama.cpp': 0.45,
  sglang: 0.70,
};

/**
 * Compute prefill throughput and TTFT.
 *
 * @param gpuFlopsTFLOPS - GPU peak FLOPS in TFLOPS (e.g. 312 for H100 FP16)
 * @param paramsActive   - Active parameters (use paramsActive for MoE, paramsTotal otherwise)
 * @param promptTokens   - Number of prompt tokens
 * @param mfu            - Model FLOP Utilization (default 0.65 for vLLM)
 * @param schedulingOverheadMs - Scheduling overhead in ms (default 5ms)
 */
export function computePrefill(
  gpuFlopsTFLOPS: number,
  paramsActive: number,
  promptTokens: number,
  mfu: number = 0.65,
  schedulingOverheadMs: number = 5,
): PrefillResult {
  // GPU effective FLOPS in tokens/s
  // prefill_tokens_per_sec = (GPU_FLOPS × MFU) / (2 × params_active)
  // GPU_FLOPS in TFLOPS = 1e12 FLOPS/s
  // params_active in raw count
  const gpuFlopsPerSec = gpuFlopsTFLOPS * 1e12;
  const prefillThroughputTokensPerSec = (gpuFlopsPerSec * mfu) / (2 * paramsActive);

  // prefill_time_ms = prompt_tokens / prefill_throughput × 1000
  const prefillTimeMs = prefillThroughputTokensPerSec > 0
    ? (promptTokens / prefillThroughputTokensPerSec) * 1000
    : 0;

  // TTFT = prefill_time + scheduling_overhead
  const ttftMs = prefillTimeMs + schedulingOverheadMs;

  return {
    prefillThroughputTokensPerSec,
    prefillTimeMs,
    ttftMs,
  };
}

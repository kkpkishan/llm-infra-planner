/**
 * Concurrent user capacity calculator.
 *
 * Computes max concurrent users from three constraints:
 * 1. KV Cache Memory Budget
 * 2. Decode Throughput Budget
 * 3. Prefill Compute Budget
 */

import { computeTPOTAtBatch } from './decode';
import type { DecodeResult } from './decode';

export interface ConcurrencyResult {
  maxUsersMemory: number;
  maxUsersThroughput: number;
  maxUsersPrefill: number;
  maxConcurrentUsers: number;
  bottleneck: 'memory' | 'throughput' | 'prefill';
  kvPerUserGB: number;
  freeVRAMForKVGB: number;
}

/**
 * Compute maximum concurrent users from hardware constraints.
 *
 * @param totalVRAMGB             - Total GPU VRAM in GB
 * @param weightsGB               - Model weights memory in GB
 * @param overheadGB              - Framework/activation overhead in GB
 * @param numLayers               - Number of transformer layers
 * @param numKVHeads              - Number of KV attention heads
 * @param headDim                 - Head dimension
 * @param avgPromptTokens         - Average prompt length in tokens
 * @param avgOutputTokens         - Average output length in tokens
 * @param kvBytesPerParam         - Bytes per KV cache element (e.g. 2 for FP16)
 * @param decodeTokensPerSecPerUser - Decode throughput per user (from computeDecode)
 * @param minAcceptableTPOTMs     - Maximum acceptable TPOT in ms (SLO)
 * @param gpuFlopsTFLOPS          - GPU peak FLOPS in TFLOPS
 * @param paramsActive            - Active parameters
 * @param maxTTFTBudgetMs         - Maximum acceptable TTFT in ms (SLO)
 * @param usePagedAttention       - Whether PagedAttention is enabled (reduces fragmentation)
 */
export function computeMaxConcurrentUsers(
  totalVRAMGB: number,
  weightsGB: number,
  overheadGB: number,
  numLayers: number,
  numKVHeads: number,
  headDim: number,
  avgPromptTokens: number,
  avgOutputTokens: number,
  kvBytesPerParam: number,
  decodeTokensPerSecPerUser: number,
  minAcceptableTPOTMs: number,
  gpuFlopsTFLOPS: number,
  paramsActive: number,
  maxTTFTBudgetMs: number,
  usePagedAttention: boolean = false,
): ConcurrencyResult {
  // ── Constraint 1: KV Cache Memory ────────────────────────────────────────
  // kv_per_user_bytes = 2 × layers × kv_heads × head_dim × (prompt + output) × kv_bytes
  const totalSeqLen = avgPromptTokens + avgOutputTokens;
  const kvPerUserBytes = 2 * numLayers * numKVHeads * headDim * totalSeqLen * kvBytesPerParam;
  const kvPerUserGB = kvPerUserBytes / 1e9;

  const freeVRAMForKVGB = Math.max(0, totalVRAMGB - weightsGB - overheadGB);

  // PagedAttention reduces fragmentation: 1.3-1.5× more users
  const pagedAttentionMultiplier = usePagedAttention ? 1.4 : 1.0;
  const maxUsersMemory = kvPerUserGB > 0
    ? Math.floor((freeVRAMForKVGB / kvPerUserGB) * pagedAttentionMultiplier)
    : 10000;

  // ── Constraint 2: Decode Throughput ──────────────────────────────────────
  // Find max users where TPOT(n) ≤ minAcceptableTPOTMs
  // In memory-bound regime: TPOT(n) ≈ tpot(1) × (1 + 0.02 × (n-1))
  // Solve: tpot(1) × (1 + 0.02 × (n-1)) ≤ minAcceptableTPOTMs
  // → n ≤ 1 + (minAcceptableTPOTMs/tpot(1) - 1) / 0.02
  const baseTpotMs = decodeTokensPerSecPerUser > 0 ? 1000 / decodeTokensPerSecPerUser : Infinity;
  let maxUsersThroughput: number;
  if (baseTpotMs >= minAcceptableTPOTMs) {
    // Even at 1 user, TPOT exceeds SLO
    maxUsersThroughput = 1;
  } else {
    maxUsersThroughput = Math.floor(1 + (minAcceptableTPOTMs / baseTpotMs - 1) / 0.02);
  }

  // ── Constraint 3: Prefill Compute ────────────────────────────────────────
  // prefill_flops_per_user = 2 × params_active × avg_prompt_tokens
  // prefill_time_per_user = prefill_flops_per_user / GPU_FLOPS_effective
  // max_concurrent_prefill = (GPU_FLOPS_effective / prefill_flops_per_user) × max_ttft_budget_s
  // = users that can be queued and still get their first token within the TTFT budget
  const gpuFlopsPerSec = gpuFlopsTFLOPS * 1e12;
  const mfu = 0.65;
  const gpuFlopsEffective = gpuFlopsPerSec * mfu;
  const prefillFlopsPerUser = 2 * paramsActive * avgPromptTokens;
  const maxTTFTBudgetSec = maxTTFTBudgetMs / 1000;
  const prefillTimePerUserSec = prefillFlopsPerUser / gpuFlopsEffective;
  // If single-user prefill already exceeds TTFT budget, cap at 1
  const maxUsersPrefill = prefillTimePerUserSec >= maxTTFTBudgetSec
    ? 1
    : Math.max(1, Math.floor((gpuFlopsEffective / prefillFlopsPerUser) * maxTTFTBudgetSec));

  // ── Final: minimum of all constraints ────────────────────────────────────
  const maxConcurrentUsers = Math.max(1, Math.min(maxUsersMemory, maxUsersThroughput, maxUsersPrefill));

  let bottleneck: 'memory' | 'throughput' | 'prefill';
  if (maxUsersMemory <= maxUsersThroughput && maxUsersMemory <= maxUsersPrefill) {
    bottleneck = 'memory';
  } else if (maxUsersThroughput <= maxUsersMemory && maxUsersThroughput <= maxUsersPrefill) {
    bottleneck = 'throughput';
  } else {
    bottleneck = 'prefill';
  }

  return {
    maxUsersMemory,
    maxUsersThroughput,
    maxUsersPrefill,
    maxConcurrentUsers,
    bottleneck,
    kvPerUserGB,
    freeVRAMForKVGB,
  };
}

// Re-export for convenience
export type { DecodeResult };
export { computeTPOTAtBatch };

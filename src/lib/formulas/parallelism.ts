/**
 * Parallelism strategy calculator: TP/PP/DP split for distributed LLM inference/training.
 */

export interface ParallelismConfig {
  tp: number;   // tensor parallel degree
  pp: number;   // pipeline parallel stages
  dp: number;   // data parallel replicas
  totalGPUs: number;
}

export interface ParallelismResult {
  config: ParallelismConfig;
  scalingEfficiency: number;   // 0-1
  commOverheadPercent: number;
  warnings: string[];
  notes: string;
}

/**
 * Estimate scaling efficiency based on total GPU count.
 * 8 GPUs: 0.92-0.97, 64: 0.85-0.92, 512: 0.75-0.85, 16k: 0.55-0.70
 */
export function estimateScalingEfficiency(totalGPUs: number): number {
  if (totalGPUs <= 8)    return 0.945;  // midpoint of 0.92-0.97
  if (totalGPUs <= 64)   return 0.885;  // midpoint of 0.85-0.92
  if (totalGPUs <= 512)  return 0.800;  // midpoint of 0.75-0.85
  if (totalGPUs <= 16384) return 0.625; // midpoint of 0.55-0.70
  return 0.55;
}

/**
 * Estimate communication overhead % based on parallelism config.
 * TP dominates within-node, PP adds pipeline bubble, DP is near-zero.
 */
function estimateCommOverhead(tp: number, pp: number, dp: number): number {
  // TP comm overhead: ~3-8% per doubling within node
  const tpOverhead = tp > 1 ? Math.log2(tp) * 3.5 : 0;
  // PP bubble overhead: (pp-1)/pp * 100 * micro_batch_factor
  // Assume 4 micro-batches by default; bubble = (pp-1)/(pp + 4 - 1)
  const microBatches = 4;
  const ppBubble = pp > 1 ? ((pp - 1) / (pp + microBatches - 1)) * 100 : 0;
  // DP is all-reduce, typically 2-5% at scale
  const dpOverhead = dp > 1 ? Math.min(5, Math.log2(dp) * 0.8) : 0;
  return Math.min(50, tpOverhead + ppBubble + dpOverhead);
}

/**
 * Auto-compute optimal TP/PP/DP split.
 *
 * TP = min(8, GPUs_per_node, ceil(model_GB / GPU_mem_GB))
 *      also bounded by numKVHeads for GQA models
 * PP = ceil(model_GB / (TP × GPU_mem_GB × 0.6))
 * DP = total_GPUs / (TP × PP)
 */
export function computeParallelism(
  totalGPUs: number,
  gpusPerNode: number,
  modelGB: number,
  gpuMemGB: number,
  numKVHeads?: number,
): ParallelismResult {
  const warnings: string[] = [];

  // TP: fill the node (up to 8) when model needs multiple GPUs for bandwidth efficiency.
  // ceil(model_GB / gpu_mem_GB) gives the minimum TP needed; we prefer to fill the node.
  const tpMinNeeded = Math.ceil(modelGB / Math.max(gpuMemGB, 0.001));
  // If model fits on one GPU, TP=1; otherwise fill up to min(8, gpus_per_node)
  let tp = tpMinNeeded <= 1 ? 1 : Math.min(8, gpusPerNode);
  tp = Math.max(1, tp);

  // GQA bound: TP must divide evenly into numKVHeads
  if (numKVHeads !== undefined && numKVHeads > 0) {
    // Find largest power-of-2 ≤ min(tp, numKVHeads) that divides numKVHeads
    let tpBound = Math.min(tp, numKVHeads);
    while (tpBound > 1 && numKVHeads % tpBound !== 0) {
      tpBound--;
    }
    if (tpBound < tp) {
      warnings.push(`TP clamped to ${tpBound} (GQA bound: ${numKVHeads} KV heads)`);
      tp = tpBound;
    }
  }

  // PP: how many pipeline stages needed to fit model
  const ppRaw = modelGB / (tp * gpuMemGB * 0.6);
  let pp = Math.max(1, Math.ceil(ppRaw));

  // DP: remaining GPUs for data parallelism
  const tpPP = tp * pp;
  let dp = Math.floor(totalGPUs / tpPP);
  if (dp < 1) {
    dp = 1;
    // Adjust pp down if we can't fill DP=1
    pp = Math.floor(totalGPUs / tp);
    if (pp < 1) pp = 1;
  }

  // Recompute actual total used
  const actualTotal = tp * pp * dp;
  if (actualTotal !== totalGPUs) {
    warnings.push(`${totalGPUs - actualTotal} GPU(s) unused (${actualTotal} used in ${tp}×${pp}×${dp} config)`);
  }

  // Pipeline bubble warning
  const microBatches = 4; // assumed default
  if (pp > 1) {
    const bubblePct = Math.round(((pp - 1) / (pp + microBatches - 1)) * 100);
    if (microBatches < pp) {
      warnings.push(`PP=${pp} with only ${microBatches} micro-batches creates ${bubblePct}% bubble`);
    }
  }

  // TP cross-node warning
  if (tp > gpusPerNode) {
    warnings.push(`TP=${tp} spans nodes — requires high-bandwidth inter-node interconnect`);
  }

  const scalingEfficiency = estimateScalingEfficiency(totalGPUs);
  const commOverheadPercent = estimateCommOverhead(tp, pp, dp);

  const notes = [
    `${tp}×${pp}×${dp} = ${actualTotal} GPUs`,
    `Scaling efficiency ~${(scalingEfficiency * 100).toFixed(0)}%`,
  ].join(' | ');

  return {
    config: { tp, pp, dp, totalGPUs: actualTotal },
    scalingEfficiency,
    commOverheadPercent,
    warnings,
    notes,
  };
}

/**
 * Advanced training parameters: gradient accumulation, sequence packing,
 * FlashAttention memory savings, and activation checkpointing modes.
 */

// ─── Gradient Accumulation ────────────────────────────────────────────────────

/**
 * Gradient accumulation: K steps × micro-batch = effective batch.
 * No extra VRAM required — gradients are accumulated in-place.
 */
export function computeGradAccumulation(
  batchSize: number,
  accumSteps: number
): { effectiveBatch: number; extraVRAMGB: number } {
  return {
    effectiveBatch: batchSize * accumSteps,
    extraVRAMGB: 0,
  };
}

// ─── Sequence Packing ─────────────────────────────────────────────────────────

/**
 * Sequence packing efficiency.
 * Unpacked: sequences padded to maxSeqLen → utilization = avgSeqLen / maxSeqLen.
 * Packed: sequences concatenated → utilization ~85-95%.
 */
export function computeSequencePacking(
  avgSeqLen: number,
  maxSeqLen: number,
  packed: boolean
): { utilizationPercent: number; effectiveThroughputMultiplier: number } {
  const unpackedUtilization = maxSeqLen > 0 ? (avgSeqLen / maxSeqLen) * 100 : 100;
  // Packed utilization: clamp to 85-95% range
  const packedUtilization = Math.min(95, Math.max(85, unpackedUtilization * 2.2));

  const utilizationPercent = packed ? packedUtilization : unpackedUtilization;
  const effectiveThroughputMultiplier = packed
    ? packedUtilization / unpackedUtilization
    : 1.0;

  return { utilizationPercent, effectiveThroughputMultiplier };
}

// ─── FlashAttention Memory Savings ───────────────────────────────────────────

/**
 * FlashAttention avoids materializing the full O(N²) attention score matrix.
 *
 * Standard attention score memory per layer:
 *   numHeads × seqLen × seqLen × batchSize × bytesPerParam
 *
 * FlashAttention uses O(N) memory instead (tiled computation).
 * savedGB = attentionScoreGB when enabled (scores not stored).
 */
export function computeFlashAttentionSavings(
  numLayers: number,
  numHeads: number,
  seqLen: number,
  batchSize: number,
  bytesPerParam: number,
  enabled: boolean
): { attentionScoreGB: number; savedGB: number } {
  const attentionScoreBytes = numLayers * numHeads * seqLen * seqLen * batchSize * bytesPerParam;
  const attentionScoreGB = attentionScoreBytes / 1e9;
  const savedGB = enabled ? attentionScoreGB : 0;

  return { attentionScoreGB, savedGB };
}

// ─── Activation Checkpointing ─────────────────────────────────────────────────

export type CheckpointMode = 'none' | 'selective' | 'full';

/**
 * Activation checkpointing modes:
 *   none:      all activations stored — full activationsGB
 *   selective: drops the 5·s·a/h term (attention scores) — ~30-40% reduction
 *   full:      recompute all activations — sqrt(numLayers) × per-layer cost
 *
 * Compute overhead:
 *   none:      0%
 *   selective: ~5% (only attention scores recomputed)
 *   full:      ~33% (full forward pass recomputed per layer)
 */
export function computeActivationCheckpointing(
  activationsGB: number,
  numLayers: number,
  mode: CheckpointMode
): { reducedActivationsGB: number; computeOverheadPercent: number } {
  switch (mode) {
    case 'none':
      return { reducedActivationsGB: activationsGB, computeOverheadPercent: 0 };

    case 'selective': {
      // Selective: drops attention score memory (~30-40% of total activations)
      const reducedActivationsGB = activationsGB * 0.65;
      return { reducedActivationsGB, computeOverheadPercent: 5 };
    }

    case 'full': {
      // Full: only sqrt(numLayers) layers stored at a time
      const perLayerGB = numLayers > 0 ? activationsGB / numLayers : activationsGB;
      const reducedActivationsGB = Math.sqrt(numLayers) * perLayerGB;
      return { reducedActivationsGB, computeOverheadPercent: 33 };
    }
  }
}

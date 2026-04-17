/**
 * Speculative decoding overhead and speedup estimates.
 */

export type SpeculativeMethod =
  | 'draft_model'
  | 'medusa'
  | 'eagle2'
  | 'eagle3'
  | 'lookahead'
  | 'prompt_lookup';

export interface SpeculativeOverheadResult {
  draftModelGB: number;
  draftKVGB: number;
  totalOverheadGB: number;
}

export interface SpeedupRange {
  min: number;
  max: number;
}

/**
 * Compute extra VRAM overhead for speculative decoding.
 * @param draftParams - number of draft model parameters
 * @param draftLayers - number of layers in draft model
 * @param draftKVConfig - KV cache config for draft model
 */
export function computeSpeculativeOverhead(
  draftParams: number,
  draftLayers: number,
  draftKVConfig: {
    batchSize: number;
    seqLen: number;
    numKVHeads: number;
    headDim: number;
    bytesPerParam: number;
  }
): SpeculativeOverheadResult {
  // Draft model weights (FP16 by default)
  const draftModelGB = (draftParams * 2) / 1e9;

  // Draft KV cache
  const { batchSize, seqLen, numKVHeads, headDim, bytesPerParam } = draftKVConfig;
  const draftKVBytes = 2 * draftLayers * batchSize * seqLen * numKVHeads * headDim * bytesPerParam;
  const draftKVGB = draftKVBytes / 1e9;

  return {
    draftModelGB,
    draftKVGB,
    totalOverheadGB: draftModelGB + draftKVGB,
  };
}

/** Returns estimated speedup range for a given speculative decoding method */
export function estimateSpeedup(method: SpeculativeMethod): SpeedupRange {
  switch (method) {
    case 'draft_model':    return { min: 1.5, max: 3.0 };
    case 'medusa':         return { min: 1.5, max: 2.5 };
    case 'eagle2':         return { min: 3.0, max: 6.5 };
    case 'eagle3':         return { min: 3.0, max: 6.5 };
    case 'lookahead':      return { min: 1.2, max: 2.0 };
    case 'prompt_lookup':  return { min: 1.5, max: 3.0 };
  }
}

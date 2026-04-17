/**
 * KV Cache variant formulas for display/estimation purposes.
 * The main computeTotalVRAM in vram.ts still uses kvcache.ts.
 */

export interface KVVariantInput {
  numLayers: number;
  batchSize: number;
  seqLen: number;
  numKVHeads: number;
  headDim: number;
  bytesPerParam: number;
}

export interface KVVariantResult {
  kvCacheGB: number;
  rawBytes: number;
  variant: string;
  note?: string;
}

/** Standard KV cache: 2 × L × batch × seq × h_kv × head_dim × bytes */
export function computeKVStandard(input: KVVariantInput): KVVariantResult {
  const { numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam } = input;
  const rawBytes = 2 * numLayers * batchSize * seqLen * numKVHeads * headDim * bytesPerParam;
  return {
    kvCacheGB: rawBytes / 1e9,
    rawBytes,
    variant: 'standard',
  };
}

/** Sliding window: uses min(seq, windowSize) instead of seq */
export function computeKVSlidingWindow(input: KVVariantInput, windowSize: number): KVVariantResult {
  const effectiveSeq = Math.min(input.seqLen, windowSize);
  const rawBytes = 2 * input.numLayers * input.batchSize * effectiveSeq * input.numKVHeads * input.headDim * input.bytesPerParam;
  return {
    kvCacheGB: rawBytes / 1e9,
    rawBytes,
    variant: 'sliding_window',
    note: `Window size ${windowSize.toLocaleString()} tokens; effective seq = ${effectiveSeq.toLocaleString()}`,
  };
}

/**
 * PagedAttention: same total as standard but fragmentation drops from 60-80% to <4%.
 * Shows effective capacity gain note.
 */
export function computeKVPaged(input: KVVariantInput): KVVariantResult {
  const standard = computeKVStandard(input);
  return {
    kvCacheGB: standard.kvCacheGB,
    rawBytes: standard.rawBytes,
    variant: 'paged',
    note: 'PagedAttention: fragmentation drops from 60–80% → <4%, effectively 1.5–4× more sequences fit in same VRAM',
  };
}

/**
 * Prefix caching: reduces allocated KV by reusePercent (0–90%).
 * reusePercent is a value 0–90 (percentage).
 */
export function computeKVPrefixCache(input: KVVariantInput, reusePercent: number): KVVariantResult {
  const clampedReuse = Math.max(0, Math.min(90, reusePercent));
  const standard = computeKVStandard(input);
  const factor = 1 - clampedReuse / 100;
  const rawBytes = standard.rawBytes * factor;
  return {
    kvCacheGB: rawBytes / 1e9,
    rawBytes,
    variant: 'prefix_cache',
    note: `${clampedReuse}% prefix reuse → saves ${(standard.kvCacheGB * (clampedReuse / 100)).toFixed(2)} GB`,
  };
}

export type KVVariant = 'standard' | 'sliding_window' | 'paged' | 'prefix_cache';

export interface KVVariantOptions {
  windowSize?: number;
  reusePercent?: number;
}

/** Unified entry point for all KV cache variants */
export function computeKVVariant(
  input: KVVariantInput,
  variant: KVVariant,
  options: KVVariantOptions = {}
): KVVariantResult {
  switch (variant) {
    case 'sliding_window':
      return computeKVSlidingWindow(input, options.windowSize ?? 4096);
    case 'paged':
      return computeKVPaged(input);
    case 'prefix_cache':
      return computeKVPrefixCache(input, options.reusePercent ?? 0);
    case 'standard':
    default:
      return computeKVStandard(input);
  }
}

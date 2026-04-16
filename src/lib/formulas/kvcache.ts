import type { KVCacheInput, KVCacheResult } from './types';

/**
 * Compute KV cache memory in GB (GQA-aware).
 *
 * Standard formula (MHA / GQA / MQA):
 *   kv_cache_bytes = 2 × numLayers × batchSize × seqLen × numKVHeads × headDim × bytesPerParam
 *
 * MLA formula (when mlaCompressedDim is defined):
 *   kv_cache_bytes = numLayers × batchSize × seqLen × mlaCompressedDim × bytesPerParam
 *
 * Result is rounded to 2 decimal places.
 */
export function computeKVCache(input: KVCacheInput): KVCacheResult {
  const { numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, attentionType, mlaCompressedDim } = input;

  let rawBytes: number;

  if (attentionType === 'mla' && mlaCompressedDim !== undefined) {
    // MLA: compressed KV cache using latent dimension
    rawBytes = numLayers * batchSize * seqLen * mlaCompressedDim * bytesPerParam;
  } else {
    // MHA / GQA / MQA / MLA fallback
    const effectiveKVHeads = attentionType === 'mqa' ? 1 : numKVHeads;
    rawBytes = 2 * numLayers * batchSize * seqLen * effectiveKVHeads * headDim * bytesPerParam;
  }

  const kvCacheGB = Math.round(rawBytes / 1e9 * 100) / 100; // round to 2 decimals
  return { kvCacheGB, rawBytes };
}

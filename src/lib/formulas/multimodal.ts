export interface VisionEncoderSpec {
  name: string;
  vramGB: number;
  imageTokensPerImage: number | { min: number; max: number };
}

export const VISION_ENCODERS: VisionEncoderSpec[] = [
  { name: 'CLIP ViT-L/14',      vramGB: 0.6, imageTokensPerImage: 256 },
  { name: 'SigLIP-SO400M',      vramGB: 0.8, imageTokensPerImage: 256 },
  { name: 'InternViT-6B',       vramGB: 12,  imageTokensPerImage: 256 },
  { name: 'Qwen2-VL dynamic',   vramGB: 0.8, imageTokensPerImage: { min: 256, max: 16384 } },
  { name: 'LLaVA-1.5 CLIP',     vramGB: 0.6, imageTokensPerImage: 576 },
];

export const AUDIO_ENCODERS = [
  { name: 'Whisper large-v3', vramGB: 3 },
];

/**
 * Extra KV cache memory for image tokens.
 *
 * KV cache per token = 2 × numLayers × numKVHeads × headDim × bytesPerParam
 * Total extra = imageTokens × batchSize × kv_per_token / 1e9
 */
export function computeVisionKVCacheExtra(
  imageTokens: number,
  numLayers: number,
  numKVHeads: number,
  headDim: number,
  bytesPerParam: number,
  batchSize: number
): number {
  const kvBytesPerToken = 2 * numLayers * numKVHeads * headDim * bytesPerParam;
  return (imageTokens * batchSize * kvBytesPerToken) / 1e9;
}

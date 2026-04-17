/**
 * Estimates parameter count from config fields.
 * Dense: L × (4h² + 4h×d_ff) + 2×vocab×h (with tie_word_embeddings adjustment)
 * MoE: uses active/total expert formula
 */

import type { ParsedConfig } from "./config-parser.js";

/**
 * Estimates total parameter count from a parsed config.
 */
export function estimateParams(config: ParsedConfig): number {
  const L = config.numLayers ?? 0;
  const h = config.hiddenSize ?? 0;
  const vocab = config.vocabSize ?? 0;
  const tieEmbed = config.tieWordEmbeddings ?? false;

  // Embedding params: input + output (or shared if tied)
  const embedParams = tieEmbed ? vocab * h : 2 * vocab * h;

  // MoE path
  const numExperts =
    config.numLocalExperts ?? config.numExperts ?? config.nRoutedExperts ?? 0;

  if (numExperts > 1 && config.moeIntermediateSize !== undefined) {
    const dff = config.moeIntermediateSize;
    const dffShared = config.sharedExpertIntermediateSize ?? 0;
    const denseLayers = config.firstKDenseReplace ?? 0;
    const moeLayers = L - denseLayers;
    const dffDense = config.intermediateSize ?? dff;

    // Attention: Q, K, V, O projections = 4h²
    const attnPerLayer = 4 * h * h;

    // Dense FFN layers (gate + up + down = 3 matrices)
    const denseFfn = denseLayers * (3 * h * dffDense + attnPerLayer);

    // MoE layers: all experts (total) + shared FFN
    const moeTotal =
      moeLayers * (numExperts * 3 * h * dff + 3 * h * dffShared + attnPerLayer);

    return denseFfn + moeTotal + embedParams;
  }

  // Dense path
  const dff = config.intermediateSize ?? 4 * h;
  // Attention: 4h² per layer (Q, K, V, O)
  const attnPerLayer = 4 * h * h;
  // FFN: gate + up + down = 3 matrices (SwiGLU/GeGLU) or 2 (classic)
  // Use 3 for modern models (SwiGLU is standard)
  const ffnPerLayer = 3 * h * dff;

  return L * (attnPerLayer + ffnPerLayer) + embedParams;
}

/**
 * Estimates active parameter count for MoE models.
 */
export function estimateActiveParams(config: ParsedConfig): number {
  const L = config.numLayers ?? 0;
  const h = config.hiddenSize ?? 0;
  const vocab = config.vocabSize ?? 0;
  const tieEmbed = config.tieWordEmbeddings ?? false;

  const embedParams = tieEmbed ? vocab * h : 2 * vocab * h;

  const numExperts =
    config.numLocalExperts ?? config.numExperts ?? config.nRoutedExperts ?? 0;
  const expertsPerToken = config.numExpertsPerTok ?? 1;

  if (numExperts > 1 && config.moeIntermediateSize !== undefined) {
    const dff = config.moeIntermediateSize;
    const dffShared = config.sharedExpertIntermediateSize ?? 0;
    const denseLayers = config.firstKDenseReplace ?? 0;
    const moeLayers = L - denseLayers;
    const dffDense = config.intermediateSize ?? dff;

    const attnPerLayer = 4 * h * h;
    const denseFfn = denseLayers * (3 * h * dffDense + attnPerLayer);
    const moeActive =
      moeLayers * (expertsPerToken * 3 * h * dff + 3 * h * dffShared + attnPerLayer);

    return denseFfn + moeActive + embedParams;
  }

  // Dense: all params are active
  return estimateParams(config);
}

/**
 * Classifies architecture type from a parsed config.
 */

import type { ParsedConfig } from "./config-parser.js";

export type ArchType = "dense" | "moe" | "mla" | "vlm" | "ssm" | "hybrid";

export interface MoEConfig {
  numExperts: number;
  expertsPerToken: number;
  sharedExperts?: number;
  moeIntermediateSize?: number;
  sharedExpertIntermediateSize?: number;
  firstKDenseReplace?: number;
  paramsActive?: number;
  paramsTotal?: number;
}

export interface MLAConfig {
  kvLoraRank: number;
  qkRopeHeadDim?: number;
  qLoraRank?: number;
  vHeadDim?: number;
  compressedKVDim?: number;
}

export interface ArchDetectionResult {
  type: ArchType;
  moeConfig?: MoEConfig;
  mlaConfig?: MLAConfig;
}

const SSM_MODEL_TYPES = new Set(["mamba", "mamba2", "falcon_mamba", "recurrent_gemma"]);

/**
 * Detects architecture type from a parsed config.
 */
export function detectArchitecture(config: ParsedConfig): ArchDetectionResult {
  // SSM check (before others — Mamba has no attention)
  if (config.modelType && SSM_MODEL_TYPES.has(config.modelType)) {
    return { type: "ssm" };
  }

  // VLM check
  const hasVisionConfig =
    (config.visionConfig !== undefined && config.visionConfig !== null) ||
    config.visionTower !== undefined ||
    config.imageTokenIndex !== undefined;

  const archName = config.architectures?.[0] ?? "";
  const isConditionalGen = archName.endsWith("ForConditionalGeneration");

  if (hasVisionConfig || isConditionalGen) {
    return { type: "vlm" };
  }

  // MoE check
  const numExperts =
    config.numLocalExperts ?? config.numExperts ?? config.nRoutedExperts ?? 0;

  if (numExperts > 1) {
    const expertsPerToken = config.numExpertsPerTok ?? 1;
    const moeConf: MoEConfig = {
      numExperts,
      expertsPerToken,
      sharedExperts: config.nSharedExperts,
      moeIntermediateSize: config.moeIntermediateSize,
      sharedExpertIntermediateSize: config.sharedExpertIntermediateSize,
      firstKDenseReplace: config.firstKDenseReplace,
    };

    // Compute active/total params for MoE if we have enough info
    if (
      config.hiddenSize !== undefined &&
      config.numLayers !== undefined &&
      config.moeIntermediateSize !== undefined
    ) {
      const d = config.hiddenSize;
      const L = config.numLayers;
      const dff = config.moeIntermediateSize;
      const dffShared = config.sharedExpertIntermediateSize ?? 0;
      const denseLayers = config.firstKDenseReplace ?? 0;
      const moeLayers = L - denseLayers;
      const dffDense = config.intermediateSize ?? dff;

      const routedTotal = numExperts * 3 * d * dff;
      const routedActive = expertsPerToken * 3 * d * dff;
      const sharedFfn = 3 * d * dffShared;

      // Attention params per layer: 4 * h^2 (Q, K, V, O projections)
      const attnPerLayer = 4 * d * d;
      const embedParams = (config.vocabSize ?? 0) * d;

      const totalParams =
        denseLayers * (3 * d * dffDense + attnPerLayer) +
        moeLayers * (routedTotal + sharedFfn + attnPerLayer) +
        embedParams;

      const activeParams =
        denseLayers * (3 * d * dffDense + attnPerLayer) +
        moeLayers * (routedActive + sharedFfn + attnPerLayer) +
        embedParams;

      moeConf.paramsTotal = totalParams;
      moeConf.paramsActive = activeParams;
    }

    // MLA + MoE (e.g. DeepSeek-V3)
    if (config.kvLoraRank !== undefined) {
      const mlaConf: MLAConfig = {
        kvLoraRank: config.kvLoraRank,
        qkRopeHeadDim: config.qkRopeHeadDim,
        qLoraRank: config.qLoraRank,
        vHeadDim: config.vHeadDim,
        compressedKVDim:
          config.kvLoraRank !== undefined && config.qkRopeHeadDim !== undefined
            ? config.kvLoraRank + config.qkRopeHeadDim
            : config.kvLoraRank,
      };
      return { type: "moe", moeConfig: moeConf, mlaConfig: mlaConf };
    }

    return { type: "moe", moeConfig: moeConf };
  }

  // MLA check (pure MLA without MoE)
  if (config.kvLoraRank !== undefined) {
    const mlaConf: MLAConfig = {
      kvLoraRank: config.kvLoraRank,
      qkRopeHeadDim: config.qkRopeHeadDim,
      qLoraRank: config.qLoraRank,
      vHeadDim: config.vHeadDim,
      compressedKVDim:
        config.kvLoraRank !== undefined && config.qkRopeHeadDim !== undefined
          ? config.kvLoraRank + config.qkRopeHeadDim
          : config.kvLoraRank,
    };
    return { type: "mla", mlaConfig: mlaConf };
  }

  return { type: "dense" };
}

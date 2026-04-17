/**
 * Parses a HuggingFace config.json into normalized architecture fields.
 */

import type { ModelSpec } from "../../src/lib/formulas/types.js";

type RawConfig = Record<string, unknown>;

/** Fields we extract from config.json */
export interface ParsedConfig {
  numLayers?: number;
  hiddenSize?: number;
  intermediateSize?: number;
  numAttentionHeads?: number;
  numKeyValueHeads?: number;
  headDim?: number;
  vocabSize?: number;
  maxPositionEmbeddings?: number;
  modelType?: string;
  architectures?: string[];
  tieWordEmbeddings?: boolean;
  torchDtype?: string;
  // MoE fields
  numLocalExperts?: number;
  numExperts?: number;
  nRoutedExperts?: number;
  numExpertsPerTok?: number;
  moeIntermediateSize?: number;
  sharedExpertIntermediateSize?: number;
  nSharedExperts?: number;
  firstKDenseReplace?: number;
  // MLA fields
  kvLoraRank?: number;
  qkRopeHeadDim?: number;
  qLoraRank?: number;
  vHeadDim?: number;
  // VLM fields
  visionConfig?: RawConfig;
  visionTower?: string;
  imageTokenIndex?: number;
  // SSM fields
  stateSize?: number;
  convKernel?: number;
  expand?: number;
  timeStepRank?: number;
  // RoPE
  ropeTheta?: number;
  ropeScaling?: unknown;
  // Sliding window
  slidingWindow?: number;
  maxWindowLayers?: number;
  // Raw config for arch detection
  _raw: RawConfig;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  return undefined;
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

/**
 * Resolves the "active" sub-config, handling nested wrappers like
 * `text_config`, `language_config`, `vision_config`.
 */
function resolveActiveConfig(raw: RawConfig): RawConfig {
  // Some VLMs wrap the language model config under text_config or language_config
  const textConfig = raw["text_config"] as RawConfig | undefined;
  const langConfig = raw["language_config"] as RawConfig | undefined;

  // Prefer text_config if it has hidden_size (it's the language model config)
  if (textConfig && typeof textConfig === "object" && textConfig["hidden_size"]) {
    return { ...textConfig, vision_config: raw["vision_config"], _parent: raw };
  }
  if (langConfig && typeof langConfig === "object" && langConfig["hidden_size"]) {
    return { ...langConfig, vision_config: raw["vision_config"], _parent: raw };
  }
  return raw;
}

/**
 * Parses a HuggingFace config.json object into normalized architecture fields.
 * Returns null if required fields are missing.
 */
export function parseConfig(configJson: RawConfig, _modelId: string): ParsedConfig | null {
  const active = resolveActiveConfig(configJson);

  const hiddenSize = num(active["hidden_size"]);
  const numLayers = num(active["num_hidden_layers"]);
  const vocabSize = num(active["vocab_size"]);

  // Required fields
  if (hiddenSize === undefined || numLayers === undefined || vocabSize === undefined) {
    return null;
  }

  const numAttentionHeads = num(active["num_attention_heads"]);
  const numKeyValueHeads = num(active["num_key_value_heads"]) ?? numAttentionHeads;

  // Compute headDim: explicit or derived
  let headDim = num(active["head_dim"]);
  if (headDim === undefined && hiddenSize !== undefined && numAttentionHeads !== undefined) {
    headDim = Math.floor(hiddenSize / numAttentionHeads);
  }

  const intermediateSize = num(active["intermediate_size"]);
  const maxPositionEmbeddings = num(active["max_position_embeddings"]);
  const modelType = str(active["model_type"]);
  const tieWordEmbeddings = bool(active["tie_word_embeddings"]);
  const torchDtype = str(active["torch_dtype"]);

  const architectures = Array.isArray(active["architectures"])
    ? (active["architectures"] as string[]).filter((a) => typeof a === "string")
    : undefined;

  // MoE fields
  const numLocalExperts = num(active["num_local_experts"]);
  const numExperts = num(active["num_experts"]);
  const nRoutedExperts = num(active["n_routed_experts"]);
  const numExpertsPerTok = num(active["num_experts_per_tok"]);
  const moeIntermediateSize = num(active["moe_intermediate_size"]);
  const sharedExpertIntermediateSize = num(active["shared_expert_intermediate_size"]);
  const nSharedExperts = num(active["n_shared_experts"]);
  const firstKDenseReplace = num(active["first_k_dense_replace"]);

  // MLA fields
  const kvLoraRank = num(active["kv_lora_rank"]);
  const qkRopeHeadDim = num(active["qk_rope_head_dim"]);
  const qLoraRank = num(active["q_lora_rank"]);
  const vHeadDim = num(active["v_head_dim"]);

  // VLM fields
  const visionConfig = active["vision_config"] as RawConfig | undefined;
  const visionTower = str(active["vision_tower"]);
  const imageTokenIndex = num(active["image_token_index"]);

  // SSM fields
  const stateSize = num(active["state_size"]);
  const convKernel = num(active["conv_kernel"]);
  const expand = num(active["expand"]);
  const timeStepRank = num(active["time_step_rank"]);

  // RoPE
  const ropeTheta = num(active["rope_theta"]);
  const ropeScaling = active["rope_scaling"];

  // Sliding window
  const slidingWindow = num(active["sliding_window"]);
  const maxWindowLayers = num(active["max_window_layers"]);

  return {
    numLayers,
    hiddenSize,
    intermediateSize,
    numAttentionHeads,
    numKeyValueHeads,
    headDim,
    vocabSize,
    maxPositionEmbeddings,
    modelType,
    architectures,
    tieWordEmbeddings,
    torchDtype,
    numLocalExperts,
    numExperts,
    nRoutedExperts,
    numExpertsPerTok,
    moeIntermediateSize,
    sharedExpertIntermediateSize,
    nSharedExperts,
    firstKDenseReplace,
    kvLoraRank,
    qkRopeHeadDim,
    qLoraRank,
    vHeadDim,
    visionConfig,
    visionTower,
    imageTokenIndex,
    stateSize,
    convKernel,
    expand,
    timeStepRank,
    ropeTheta,
    ropeScaling,
    slidingWindow,
    maxWindowLayers,
    _raw: configJson,
  };
}

/**
 * Maps a parsed config to a partial ModelSpec (architecture sub-object).
 */
export function configToModelSpec(parsed: ParsedConfig): Partial<ModelSpec> {
  const arch: Partial<ModelSpec["architecture"]> = {};

  if (parsed.numLayers !== undefined) arch.numLayers = parsed.numLayers;
  if (parsed.hiddenSize !== undefined) arch.hiddenSize = parsed.hiddenSize;
  if (parsed.intermediateSize !== undefined) arch.intermediateSize = parsed.intermediateSize;
  if (parsed.numAttentionHeads !== undefined) arch.numAttentionHeads = parsed.numAttentionHeads;
  if (parsed.numKeyValueHeads !== undefined) arch.numKeyValueHeads = parsed.numKeyValueHeads;
  if (parsed.headDim !== undefined) arch.headDim = parsed.headDim;
  if (parsed.vocabSize !== undefined) arch.vocabSize = parsed.vocabSize;
  if (parsed.tieWordEmbeddings !== undefined) arch.tieWordEmbeddings = parsed.tieWordEmbeddings;
  if (parsed.maxPositionEmbeddings !== undefined) arch.maxContextLength = parsed.maxPositionEmbeddings;

  // Determine attention type
  const numKV = parsed.numKeyValueHeads;
  const numQ = parsed.numAttentionHeads;
  if (parsed.kvLoraRank !== undefined) {
    arch.attentionType = "mla";
  } else if (numKV !== undefined && numQ !== undefined) {
    if (numKV === 1) arch.attentionType = "mqa";
    else if (numKV < numQ) arch.attentionType = "gqa";
    else arch.attentionType = "mha";
  }

  // Positional embedding — default to rope for transformers
  arch.positionalEmbedding = "rope";

  const result: Partial<ModelSpec> = {};
  if (Object.keys(arch).length > 0) {
    result.architecture = arch as ModelSpec["architecture"];
  }

  return result;
}

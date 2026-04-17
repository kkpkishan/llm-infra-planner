/**
 * Validates and normalizes model entries against ModelSpec.
 */

import type { ModelSpec } from "../../src/lib/formulas/types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  normalized: ModelSpec | null;
}

const QUANT_VARIANT_PATTERN = /\b(GGUF|GPTQ|AWQ|EXL2|MLX|bnb-4bit|bnb4bit|4bit|8bit|GGML)\b/i;

const VALID_ATTENTION_TYPES = ["mha", "gqa", "mqa", "mla"] as const;
const VALID_POSITIONAL_EMBEDDINGS = ["rope", "alibi", "yarn", "learned"] as const;

type AttentionType = (typeof VALID_ATTENTION_TYPES)[number];
type PositionalEmbedding = (typeof VALID_POSITIONAL_EMBEDDINGS)[number];

function isValidAttentionType(v: unknown): v is AttentionType {
  return typeof v === "string" && (VALID_ATTENTION_TYPES as readonly string[]).includes(v);
}

function isValidPositionalEmbedding(v: unknown): v is PositionalEmbedding {
  return typeof v === "string" && (VALID_POSITIONAL_EMBEDDINGS as readonly string[]).includes(v);
}

/**
 * Validates and normalizes a model entry.
 */
export function validateModel(model: Partial<ModelSpec> & { id?: string }): ValidationResult {
  const errors: string[] = [];

  // Required top-level fields
  if (!model.id || typeof model.id !== "string") errors.push("id: required string");
  if (!model.family || typeof model.family !== "string") errors.push("family: required string");
  if (!model.displayName || typeof model.displayName !== "string") errors.push("displayName: required string");
  if (!model.releaseDate || typeof model.releaseDate !== "string") errors.push("releaseDate: required string");
  if (!model.license || typeof model.license !== "string") errors.push("license: required string");
  if (typeof model.paramsTotal !== "number" || Number.isNaN(model.paramsTotal)) {
    errors.push("paramsTotal: required number");
  }

  const arch = model.architecture;
  if (!arch || typeof arch !== "object") {
    errors.push("architecture: required object");
    return { valid: false, errors, normalized: null };
  }

  // Required architecture fields
  if (typeof arch.hiddenSize !== "number") errors.push("architecture.hiddenSize: required number");
  if (typeof arch.numLayers !== "number") errors.push("architecture.numLayers: required number");
  if (typeof arch.vocabSize !== "number") errors.push("architecture.vocabSize: required number");
  if (typeof arch.intermediateSize !== "number") errors.push("architecture.intermediateSize: required number");
  if (typeof arch.numAttentionHeads !== "number") errors.push("architecture.numAttentionHeads: required number");
  if (typeof arch.numKeyValueHeads !== "number") errors.push("architecture.numKeyValueHeads: required number");
  if (typeof arch.headDim !== "number") errors.push("architecture.headDim: required number");
  if (typeof arch.tieWordEmbeddings !== "boolean") errors.push("architecture.tieWordEmbeddings: required boolean");
  if (typeof arch.maxContextLength !== "number") errors.push("architecture.maxContextLength: required number");
  if (!isValidAttentionType(arch.attentionType)) {
    errors.push(`architecture.attentionType: must be one of ${VALID_ATTENTION_TYPES.join(", ")}`);
  }
  if (!isValidPositionalEmbedding(arch.positionalEmbedding)) {
    errors.push(`architecture.positionalEmbedding: must be one of ${VALID_POSITIONAL_EMBEDDINGS.join(", ")}`);
  }

  // Invariants (only check if fields are present)
  if (
    typeof arch.hiddenSize === "number" &&
    typeof arch.numAttentionHeads === "number" &&
    arch.numAttentionHeads > 0 &&
    arch.hiddenSize % arch.numAttentionHeads !== 0
  ) {
    errors.push(
      `architecture.hiddenSize (${arch.hiddenSize}) must be divisible by numAttentionHeads (${arch.numAttentionHeads})`
    );
  }

  // Sanity ranges
  if (typeof arch.hiddenSize === "number" && (arch.hiddenSize < 64 || arch.hiddenSize > 65536)) {
    errors.push(`architecture.hiddenSize ${arch.hiddenSize} out of range [64, 65536]`);
  }
  if (typeof arch.numLayers === "number" && (arch.numLayers < 1 || arch.numLayers > 200)) {
    errors.push(`architecture.numLayers ${arch.numLayers} out of range [1, 200]`);
  }
  if (typeof arch.vocabSize === "number" && (arch.vocabSize < 100 || arch.vocabSize > 1_000_000)) {
    errors.push(`architecture.vocabSize ${arch.vocabSize} out of range [100, 1_000_000]`);
  }
  if (
    typeof model.paramsTotal === "number" &&
    (model.paramsTotal < 1_000_000 || model.paramsTotal > 2_000_000_000_000)
  ) {
    errors.push(`paramsTotal ${model.paramsTotal} out of range [1M, 2T]`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, normalized: null };
  }

  // Build normalized ModelSpec
  const normalized: ModelSpec = {
    id: model.id!,
    family: model.family!,
    displayName: model.displayName!,
    releaseDate: model.releaseDate!,
    license: model.license!,
    paramsTotal: model.paramsTotal!,
    architecture: {
      numLayers: arch.numLayers!,
      hiddenSize: arch.hiddenSize!,
      intermediateSize: arch.intermediateSize!,
      numAttentionHeads: arch.numAttentionHeads!,
      numKeyValueHeads: arch.numKeyValueHeads!,
      headDim: arch.headDim!,
      vocabSize: arch.vocabSize!,
      tieWordEmbeddings: arch.tieWordEmbeddings!,
      attentionType: arch.attentionType as AttentionType,
      maxContextLength: arch.maxContextLength!,
      positionalEmbedding: arch.positionalEmbedding as PositionalEmbedding,
    },
  };

  // Optional fields
  if (typeof model.paramsActive === "number") normalized.paramsActive = model.paramsActive;
  if (model.moe) normalized.moe = model.moe;
  if (typeof model.mlaCompressedDim === "number") normalized.mlaCompressedDim = model.mlaCompressedDim;
  if (typeof model.trainingTokens === "number") normalized.trainingTokens = model.trainingTokens;
  if (typeof model.notes === "string") normalized.notes = model.notes;
  if (typeof model.huggingfaceId === "string") normalized.huggingfaceId = model.huggingfaceId;
  if (typeof model.apiOnly === "boolean") normalized.apiOnly = model.apiOnly;

  // Dedup: mark quantized variants
  const repoName = model.id ?? "";
  if (QUANT_VARIANT_PATTERN.test(repoName)) {
    // Cast to allow extra field for ingestion tracking
    (normalized as ModelSpec & { isQuantizedVariant?: boolean }).isQuantizedVariant = true;
  }

  return { valid: true, errors: [], normalized };
}

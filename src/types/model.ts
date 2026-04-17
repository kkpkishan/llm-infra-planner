/**
 * Re-exports ModelSpec from the canonical types location and adds
 * a runtime validation schema (manual, no Zod dependency).
 */

export type { ModelSpec } from "../lib/formulas/types";

// ─── Runtime Validation Schema ───────────────────────────────────────

export interface ModelSpecValidationResult {
  valid: boolean;
  errors: string[];
}

type AnyRecord = Record<string, unknown>;

function isString(v: unknown): v is string {
  return typeof v === "string" && (v as string).length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v as number);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

const VALID_ATTENTION_TYPES = ["mha", "gqa", "mqa", "mla"] as const;
const VALID_POSITIONAL_EMBEDDINGS = ["rope", "alibi", "yarn", "learned"] as const;

/**
 * ModelSpecSchema — validates a plain object against the ModelSpec shape.
 * Returns { valid, errors }.
 */
export function ModelSpecSchema(data: unknown): ModelSpecValidationResult {
  const errors: string[] = [];
  const d = data as AnyRecord;

  if (!isString(d.id)) errors.push("id: required string");
  if (!isString(d.family)) errors.push("family: required string");
  if (!isString(d.displayName)) errors.push("displayName: required string");
  if (!isString(d.releaseDate)) errors.push("releaseDate: required string");
  if (!isString(d.license)) errors.push("license: required string");
  if (!isNumber(d.paramsTotal)) errors.push("paramsTotal: required number");

  const arch = d.architecture as AnyRecord | undefined;
  if (!arch || typeof arch !== "object") {
    errors.push("architecture: required object");
  } else {
    if (!isNumber(arch.numLayers)) errors.push("architecture.numLayers: required number");
    if (!isNumber(arch.hiddenSize)) errors.push("architecture.hiddenSize: required number");
    if (!isNumber(arch.intermediateSize)) errors.push("architecture.intermediateSize: required number");
    if (!isNumber(arch.numAttentionHeads)) errors.push("architecture.numAttentionHeads: required number");
    if (!isNumber(arch.numKeyValueHeads)) errors.push("architecture.numKeyValueHeads: required number");
    if (!isNumber(arch.headDim)) errors.push("architecture.headDim: required number");
    if (!isNumber(arch.vocabSize)) errors.push("architecture.vocabSize: required number");
    if (!isBoolean(arch.tieWordEmbeddings)) errors.push("architecture.tieWordEmbeddings: required boolean");
    if (
      !isString(arch.attentionType) ||
      !(VALID_ATTENTION_TYPES as readonly string[]).includes(arch.attentionType as string)
    ) {
      errors.push(`architecture.attentionType: must be one of ${VALID_ATTENTION_TYPES.join(", ")}`);
    }
    if (!isNumber(arch.maxContextLength)) errors.push("architecture.maxContextLength: required number");
    if (
      !isString(arch.positionalEmbedding) ||
      !(VALID_POSITIONAL_EMBEDDINGS as readonly string[]).includes(arch.positionalEmbedding as string)
    ) {
      errors.push(`architecture.positionalEmbedding: must be one of ${VALID_POSITIONAL_EMBEDDINGS.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

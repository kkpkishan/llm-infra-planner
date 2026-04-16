/**
 * Build-time data validation script.
 * Validates all JSON data files against the TypeScript interfaces.
 *
 * Usage: npx tsx scripts/validate-data.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── Types (mirrored from src/lib/formulas/types.ts) ────────────────

const VALID_VENDORS = ["nvidia", "amd", "apple", "intel", "google-tpu"] as const;
const VALID_CATEGORIES = ["consumer", "workstation", "datacenter", "apple-silicon", "tpu"] as const;
const VALID_ATTENTION_TYPES = ["mha", "gqa", "mqa", "mla"] as const;
const VALID_POSITIONAL_EMBEDDINGS = ["rope", "alibi", "yarn", "learned"] as const;
const VALID_FORM_FACTORS = ["pcie", "sxm", "oam", "integrated", "mxm"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────

const errors: string[] = [];

function addError(file: string, index: number, id: string, message: string): void {
  errors.push(`[${file}] entry #${index} (${id}): ${message}`);
}

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isOneOf<T extends string>(v: unknown, values: readonly T[]): v is T {
  return isString(v) && (values as readonly string[]).includes(v);
}

// ─── Model Validation ────────────────────────────────────────────────

function validateModel(entry: Record<string, unknown>, index: number): void {
  const id = isString(entry.id) ? entry.id : `unknown-${index}`;
  const file = "models.json";

  if (!isString(entry.id)) addError(file, index, id, "missing or invalid 'id' (string)");
  if (!isString(entry.family)) addError(file, index, id, "missing or invalid 'family' (string)");
  if (!isString(entry.displayName)) addError(file, index, id, "missing or invalid 'displayName' (string)");
  if (!isString(entry.releaseDate)) addError(file, index, id, "missing or invalid 'releaseDate' (string)");
  if (!isString(entry.license)) addError(file, index, id, "missing or invalid 'license' (string)");
  if (!isNumber(entry.paramsTotal)) addError(file, index, id, "missing or invalid 'paramsTotal' (number)");

  // Architecture sub-fields
  const arch = entry.architecture as Record<string, unknown> | undefined;
  if (!arch || typeof arch !== "object") {
    addError(file, index, id, "missing or invalid 'architecture' (object)");
    return;
  }

  if (!isNumber(arch.numLayers)) addError(file, index, id, "missing or invalid 'architecture.numLayers' (number)");
  if (!isNumber(arch.hiddenSize)) addError(file, index, id, "missing or invalid 'architecture.hiddenSize' (number)");
  if (!isNumber(arch.intermediateSize)) addError(file, index, id, "missing or invalid 'architecture.intermediateSize' (number)");
  if (!isNumber(arch.numAttentionHeads)) addError(file, index, id, "missing or invalid 'architecture.numAttentionHeads' (number)");
  if (!isNumber(arch.numKeyValueHeads)) addError(file, index, id, "missing or invalid 'architecture.numKeyValueHeads' (number)");
  if (!isNumber(arch.headDim)) addError(file, index, id, "missing or invalid 'architecture.headDim' (number)");
  if (!isNumber(arch.vocabSize)) addError(file, index, id, "missing or invalid 'architecture.vocabSize' (number)");
  if (!isBoolean(arch.tieWordEmbeddings)) addError(file, index, id, "missing or invalid 'architecture.tieWordEmbeddings' (boolean)");
  if (!isOneOf(arch.attentionType, VALID_ATTENTION_TYPES)) addError(file, index, id, `missing or invalid 'architecture.attentionType' (must be one of: ${VALID_ATTENTION_TYPES.join(", ")})`);
  if (!isNumber(arch.maxContextLength)) addError(file, index, id, "missing or invalid 'architecture.maxContextLength' (number)");
  if (!isOneOf(arch.positionalEmbedding, VALID_POSITIONAL_EMBEDDINGS)) addError(file, index, id, `missing or invalid 'architecture.positionalEmbedding' (must be one of: ${VALID_POSITIONAL_EMBEDDINGS.join(", ")})`);
}

// ─── GPU Validation ──────────────────────────────────────────────────

function validateGPU(entry: Record<string, unknown>, index: number): void {
  const id = isString(entry.id) ? entry.id : `unknown-${index}`;
  const file = "gpus.json";

  if (!isString(entry.id)) addError(file, index, id, "missing or invalid 'id' (string)");
  if (!isOneOf(entry.vendor, VALID_VENDORS)) addError(file, index, id, `missing or invalid 'vendor' (must be one of: ${VALID_VENDORS.join(", ")})`);
  if (!isString(entry.name)) addError(file, index, id, "missing or invalid 'name' (string)");
  if (!isOneOf(entry.category, VALID_CATEGORIES)) addError(file, index, id, `missing or invalid 'category' (must be one of: ${VALID_CATEGORIES.join(", ")})`);
  if (!isNumber(entry.memoryGB)) addError(file, index, id, "missing or invalid 'memoryGB' (number)");
  if (!isNumber(entry.memoryBandwidthGBs)) addError(file, index, id, "missing or invalid 'memoryBandwidthGBs' (number)");

  // memoryGB range check [1, 1024]
  if (isNumber(entry.memoryGB) && (entry.memoryGB < 1 || entry.memoryGB > 1024)) {
    addError(file, index, id, `'memoryGB' value ${entry.memoryGB} is outside valid range [1, 1024]`);
  }

  // flops sub-fields
  const flops = entry.flops as Record<string, unknown> | undefined;
  if (!flops || typeof flops !== "object") {
    addError(file, index, id, "missing or invalid 'flops' (object)");
  } else {
    if (!isNumber(flops.fp32)) addError(file, index, id, "missing or invalid 'flops.fp32' (number)");
    if (!isNumber(flops.fp16)) addError(file, index, id, "missing or invalid 'flops.fp16' (number)");
    if (!isNumber(flops.int8)) addError(file, index, id, "missing or invalid 'flops.int8' (number)");
  }

  if (!isNumber(entry.tdpWatts)) addError(file, index, id, "missing or invalid 'tdpWatts' (number)");
  if (!isOneOf(entry.formFactor, VALID_FORM_FACTORS)) addError(file, index, id, `missing or invalid 'formFactor' (must be one of: ${VALID_FORM_FACTORS.join(", ")})`);
  if (!isNumber(entry.releaseYear)) addError(file, index, id, "missing or invalid 'releaseYear' (number)");
}

// ─── Cloud Validation ────────────────────────────────────────────────

function validateCloud(entry: Record<string, unknown>, index: number): void {
  const id = isString(entry.id) ? entry.id : `unknown-${index}`;
  const file = "cloud.json";

  if (!isString(entry.id)) addError(file, index, id, "missing or invalid 'id' (string)");
  if (!isString(entry.provider)) addError(file, index, id, "missing or invalid 'provider' (string)");
  if (!isString(entry.instanceType)) addError(file, index, id, "missing or invalid 'instanceType' (string)");

  // gpus array
  if (!Array.isArray(entry.gpus)) {
    addError(file, index, id, "missing or invalid 'gpus' (array)");
  } else {
    for (let i = 0; i < entry.gpus.length; i++) {
      const gpu = entry.gpus[i] as Record<string, unknown>;
      if (!isString(gpu.id)) addError(file, index, id, `'gpus[${i}].id' missing or invalid (string)`);
      if (!isNumber(gpu.count)) addError(file, index, id, `'gpus[${i}].count' missing or invalid (number)`);
    }
  }

  if (!isNumber(entry.vcpus)) addError(file, index, id, "missing or invalid 'vcpus' (number)");
  if (!isNumber(entry.ramGB)) addError(file, index, id, "missing or invalid 'ramGB' (number)");
  if (!isNumber(entry.storageGB)) addError(file, index, id, "missing or invalid 'storageGB' (number)");
  if (!isNumber(entry.networkGbps)) addError(file, index, id, "missing or invalid 'networkGbps' (number)");

  // pricing sub-fields
  const pricing = entry.pricing as Record<string, unknown> | undefined;
  if (!pricing || typeof pricing !== "object") {
    addError(file, index, id, "missing or invalid 'pricing' (object)");
  } else {
    if (!isNumber(pricing.onDemandUSDPerHour)) {
      addError(file, index, id, "missing or invalid 'pricing.onDemandUSDPerHour' (number)");
    } else {
      // Price must be positive, but skip check for serverless instances where price may be 0
      const instanceType = isString(entry.instanceType) ? entry.instanceType.toLowerCase() : "";
      const isServerless = instanceType.includes("serverless");
      if (pricing.onDemandUSDPerHour <= 0 && !isServerless) {
        addError(file, index, id, `'pricing.onDemandUSDPerHour' must be positive, got ${pricing.onDemandUSDPerHour}`);
      }
    }
  }

  // regions
  if (!Array.isArray(entry.regions) || entry.regions.length === 0) {
    addError(file, index, id, "missing or invalid 'regions' (non-empty array)");
  }

  if (!isString(entry.lastPriceUpdate)) addError(file, index, id, "missing or invalid 'lastPriceUpdate' (string)");
}

// ─── Main ────────────────────────────────────────────────────────────

function main(): void {
  const root = path.resolve(import.meta.dirname, "..");
  const dataDir = path.join(root, "src", "data");

  // Load data files
  const modelsPath = path.join(dataDir, "models.json");
  const gpusPath = path.join(dataDir, "gpus.json");
  const cloudPath = path.join(dataDir, "cloud.json");

  let models: unknown[];
  let gpus: unknown[];
  let cloud: unknown[];

  try {
    models = JSON.parse(fs.readFileSync(modelsPath, "utf-8")) as unknown[];
  } catch (e) {
    console.error(`❌ Failed to load models.json: ${e}`);
    process.exit(1);
  }

  try {
    gpus = JSON.parse(fs.readFileSync(gpusPath, "utf-8")) as unknown[];
  } catch (e) {
    console.error(`❌ Failed to load gpus.json: ${e}`);
    process.exit(1);
  }

  try {
    cloud = JSON.parse(fs.readFileSync(cloudPath, "utf-8")) as unknown[];
  } catch (e) {
    console.error(`❌ Failed to load cloud.json: ${e}`);
    process.exit(1);
  }

  // Validate all entries
  console.log("Validating data files...\n");

  models.forEach((entry, i) => validateModel(entry as Record<string, unknown>, i));
  gpus.forEach((entry, i) => validateGPU(entry as Record<string, unknown>, i));
  cloud.forEach((entry, i) => validateCloud(entry as Record<string, unknown>, i));

  // Report results
  console.log(`  Models:          ${models.length} entries validated`);
  console.log(`  GPUs:            ${gpus.length} entries validated`);
  console.log(`  Cloud instances:  ${cloud.length} entries validated`);
  console.log();

  if (errors.length > 0) {
    console.error(`❌ VALIDATION FAILED — ${errors.length} error(s) found:\n`);
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    console.log();
    process.exit(1);
  }

  console.log("✅ All data files passed validation.");
}

main();

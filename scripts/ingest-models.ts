#!/usr/bin/env node
/**
 * Main model ingestion orchestrator.
 * Reads data/models.yml allowlist, fetches configs from HF API,
 * parses, validates, and writes to src/data/models.json.
 *
 * Usage: npx tsx scripts/ingest-models.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchModelConfig, fetchModelMeta } from "./lib/hf-client.js";
import { parseConfig, configToModelSpec } from "./lib/config-parser.js";
import { detectArchitecture } from "./lib/arch-detector.js";
import { getParamCount } from "./lib/safetensors-parser.js";
import { validateModel } from "./lib/model-validator.js";
import type { ModelSpec } from "../src/lib/formulas/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── YAML parser (minimal, no deps) ──────────────────────────────────

/**
 * Minimal YAML parser for the simple list format used in models.yml.
 * Handles:
 *   key:
 *     - value1
 *     - value2
 * and nested key: value pairs under a top-level key.
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const lines = content.split("\n");
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;
  let currentObj: Record<string, unknown> | null = null;
  let currentObjKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line || line.trimStart().startsWith("#")) continue;

    // Top-level key (no leading spaces, ends with colon)
    const topKeyMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (topKeyMatch && !line.startsWith(" ") && !line.startsWith("\t")) {
      // Save previous list
      if (currentKey && currentList) {
        result[currentKey] = currentList;
      }
      if (currentKey && currentObj) {
        result[currentKey] = currentObj;
      }
      currentKey = topKeyMatch[1];
      currentList = null;
      currentObj = null;
      currentObjKey = null;
      const val = topKeyMatch[2].trim();
      if (val) {
        result[currentKey] = val;
        currentKey = null;
      }
      continue;
    }

    // List item under current key
    const listItemMatch = line.match(/^\s{2,4}-\s+(.+)$/);
    if (listItemMatch && currentKey) {
      if (!currentList) currentList = [];
      currentList.push(listItemMatch[1].trim().replace(/^["']|["']$/g, ""));
      continue;
    }

    // Nested key: value under current top-level key
    const nestedKeyMatch = line.match(/^\s{2,4}([\w-]+):\s*(.*)$/);
    if (nestedKeyMatch && currentKey) {
      if (!currentObj) currentObj = {};
      currentObjKey = nestedKeyMatch[1];
      const val = nestedKeyMatch[2].trim().replace(/^["']|["']$/g, "");
      if (val) {
        currentObj[currentObjKey] = val;
      }
      continue;
    }

    // Nested nested value (for overrides)
    const deepMatch = line.match(/^\s{6,8}([\w-]+):\s*(.*)$/);
    if (deepMatch && currentObj && currentObjKey) {
      const val = deepMatch[2].trim().replace(/^["']|["']$/g, "");
      const numVal = Number(val);
      (currentObj[currentObjKey] as Record<string, unknown>)[deepMatch[1]] = isNaN(numVal) ? val : numVal;
      continue;
    }
  }

  // Save last key
  if (currentKey && currentList) result[currentKey] = currentList;
  if (currentKey && currentObj) result[currentKey] = currentObj;

  return result;
}

// ─── Load allowlist ───────────────────────────────────────────────────

function loadAllowlist(): string[] {
  const allowlistPath = path.join(ROOT, "data", "models.yml");
  if (!fs.existsSync(allowlistPath)) {
    console.warn("[ingest] data/models.yml not found — using empty allowlist");
    return [];
  }
  const content = fs.readFileSync(allowlistPath, "utf-8");
  const parsed = parseSimpleYaml(content);
  const models = parsed["models"];
  if (!Array.isArray(models)) return [];
  return models.filter((m): m is string => typeof m === "string");
}

// ─── Load overrides ───────────────────────────────────────────────────

function loadOverrides(): Record<string, Partial<ModelSpec>> {
  const overridesPath = path.join(ROOT, "data", "models-override.yml");
  if (!fs.existsSync(overridesPath)) return {};

  const content = fs.readFileSync(overridesPath, "utf-8");
  // Parse overrides: each model ID is a key with nested fields
  const lines = content.split("\n");
  const overrides: Record<string, Partial<ModelSpec>> = {};
  let currentId: string | null = null;
  let currentFields: Record<string, unknown> = {};

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line || line.trimStart().startsWith("#")) continue;

    // Top-level "overrides:" key
    if (line === "overrides:") continue;

    // Model ID key (2-space indent, quoted)
    const idMatch = line.match(/^\s{2}"([^"]+)":\s*$/);
    if (idMatch) {
      if (currentId) overrides[currentId] = currentFields as Partial<ModelSpec>;
      currentId = idMatch[1];
      currentFields = {};
      continue;
    }

    // Field under model ID (4-space indent)
    const fieldMatch = line.match(/^\s{4}(\w+):\s*(.+)$/);
    if (fieldMatch && currentId) {
      const val = fieldMatch[2].trim().replace(/^["']|["']$/g, "");
      const numVal = Number(val);
      currentFields[fieldMatch[1]] = isNaN(numVal) ? val : numVal;
    }
  }
  if (currentId) overrides[currentId] = currentFields as Partial<ModelSpec>;

  return overrides;
}

// ─── Load cache ───────────────────────────────────────────────────────

interface CacheEntry {
  modelId: string;
  lastModified: string;
}

function loadCache(): Map<string, string> {
  const cachePath = path.join(ROOT, "data", ".model-cache.json");
  if (!fs.existsSync(cachePath)) return new Map();
  try {
    const entries = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as CacheEntry[];
    return new Map(entries.map((e) => [e.modelId, e.lastModified]));
  } catch {
    return new Map();
  }
}

function saveCache(cache: Map<string, string>): void {
  const cachePath = path.join(ROOT, "data", ".model-cache.json");
  const entries: CacheEntry[] = Array.from(cache.entries()).map(([modelId, lastModified]) => ({
    modelId,
    lastModified,
  }));
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(entries, null, 2));
}

// ─── Load existing models ─────────────────────────────────────────────

function loadExistingModels(): Map<string, ModelSpec> {
  const modelsPath = path.join(ROOT, "src", "data", "models.json");
  if (!fs.existsSync(modelsPath)) return new Map();
  try {
    const models = JSON.parse(fs.readFileSync(modelsPath, "utf-8")) as ModelSpec[];
    return new Map(models.map((m) => [m.id, m]));
  } catch {
    return new Map();
  }
}

// ─── Derive family from model ID ──────────────────────────────────────

function deriveFamily(modelId: string): string {
  const lower = modelId.toLowerCase();
  if (lower.includes("llama")) return "llama";
  if (lower.includes("mistral") || lower.includes("mixtral")) return "mistral";
  if (lower.includes("qwen")) return "qwen";
  if (lower.includes("deepseek")) return "deepseek";
  if (lower.includes("gemma")) return "gemma";
  if (lower.includes("phi")) return "phi";
  if (lower.includes("command")) return "cohere";
  if (lower.includes("olmo")) return "olmo";
  if (lower.includes("nemotron")) return "llama";
  if (lower.includes("mamba")) return "mamba";
  return modelId.split("/")[1]?.split("-")[0]?.toLowerCase() ?? "unknown";
}

// ─── Derive display name ──────────────────────────────────────────────

function deriveDisplayName(modelId: string): string {
  return modelId.split("/")[1] ?? modelId;
}

// ─── Derive license ───────────────────────────────────────────────────

function deriveLicense(cardData: Record<string, unknown> | undefined): string {
  if (!cardData) return "unknown";
  const license = cardData["license"];
  if (typeof license === "string") return license;
  if (Array.isArray(license) && typeof license[0] === "string") return license[0];
  return "unknown";
}

// ─── Process a single model ───────────────────────────────────────────

async function processModel(
  modelId: string,
  overrides: Record<string, Partial<ModelSpec>>,
  cache: Map<string, string>,
  hfToken?: string
): Promise<{ status: "added" | "updated" | "skipped" | "failed"; model?: ModelSpec }> {
  // Fetch model metadata
  const meta = await fetchModelMeta(modelId, hfToken);

  // Check cache for incremental mode
  if (meta?.lastModified) {
    const cached = cache.get(modelId);
    if (cached === meta.lastModified) {
      return { status: "skipped" };
    }
  }

  // Fetch config.json
  const configJson = await fetchModelConfig(modelId, hfToken);
  if (!configJson) {
    console.warn(`[ingest] No config.json for ${modelId}`);
    return { status: "failed" };
  }

  // Parse config
  const parsed = parseConfig(configJson, modelId);
  if (!parsed) {
    console.warn(`[ingest] Failed to parse config for ${modelId}`);
    return { status: "failed" };
  }

  // Detect architecture
  const archResult = detectArchitecture(parsed);

  // Get param count
  const paramCount = await getParamCount(modelId, hfToken, parsed);

  // Build partial ModelSpec
  const specFromConfig = configToModelSpec(parsed);
  const override = overrides[modelId] ?? {};

  // Determine attention type
  let attentionType: "mha" | "gqa" | "mqa" | "mla" = "mha";
  if (archResult.mlaConfig) {
    attentionType = "mla";
  } else if (parsed.numKeyValueHeads !== undefined && parsed.numAttentionHeads !== undefined) {
    if (parsed.numKeyValueHeads === 1) attentionType = "mqa";
    else if (parsed.numKeyValueHeads < parsed.numAttentionHeads) attentionType = "gqa";
    else attentionType = "mha";
  }

  const arch = specFromConfig.architecture;
  if (!arch) {
    console.warn(`[ingest] No architecture fields for ${modelId}`);
    return { status: "failed" };
  }

  // Build full model entry
  const model: Partial<ModelSpec> & { id: string } = {
    id: modelId,
    family: deriveFamily(modelId),
    displayName: deriveDisplayName(modelId),
    releaseDate: meta?.lastModified?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    license: deriveLicense(meta?.cardData),
    paramsTotal: paramCount ?? archResult.moeConfig?.paramsTotal ?? 0,
    paramsActive: archResult.moeConfig?.paramsActive,
    architecture: {
      numLayers: arch.numLayers ?? 0,
      hiddenSize: arch.hiddenSize ?? 0,
      intermediateSize: arch.intermediateSize ?? 0,
      numAttentionHeads: arch.numAttentionHeads ?? 0,
      numKeyValueHeads: arch.numKeyValueHeads ?? arch.numAttentionHeads ?? 0,
      headDim: arch.headDim ?? 0,
      vocabSize: arch.vocabSize ?? 0,
      tieWordEmbeddings: arch.tieWordEmbeddings ?? false,
      attentionType,
      maxContextLength: arch.maxContextLength ?? parsed.maxPositionEmbeddings ?? 0,
      positionalEmbedding: "rope",
    },
    huggingfaceId: modelId,
  };

  // Apply MoE config
  if (archResult.moeConfig) {
    model.moe = {
      numExperts: archResult.moeConfig.numExperts,
      expertsPerToken: archResult.moeConfig.expertsPerToken,
      sharedExperts: archResult.moeConfig.sharedExperts,
    };
  }

  // Apply MLA config
  if (archResult.mlaConfig) {
    model.mlaCompressedDim = archResult.mlaConfig.compressedKVDim;
  }

  // Apply overrides
  Object.assign(model, override);

  // Validate
  const validation = validateModel(model);
  if (!validation.valid || !validation.normalized) {
    console.warn(`[ingest] Validation failed for ${modelId}:`, validation.errors.join(", "));
    return { status: "failed" };
  }

  // Update cache
  if (meta?.lastModified) {
    cache.set(modelId, meta.lastModified);
  }

  return { status: "added", model: validation.normalized };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const hfToken = process.env.HF_TOKEN;
  const fullRefresh = process.env.FULL_REFRESH === "true";

  console.log("🚀 Starting model ingestion…");
  if (hfToken) console.log("   Using HF_TOKEN for authenticated requests");
  if (fullRefresh) console.log("   Full refresh mode (ignoring cache)");

  const allowlist = loadAllowlist();
  console.log(`   Allowlist: ${allowlist.length} models`);

  const overrides = loadOverrides();
  const cache = fullRefresh ? new Map<string, string>() : loadCache();
  const existingModels = loadExistingModels();

  const counts = { added: 0, updated: 0, skipped: 0, failed: 0 };

  for (const modelId of allowlist) {
    process.stdout.write(`   Processing ${modelId}… `);
    try {
      const result = await processModel(modelId, overrides, cache, hfToken);

      if (result.status === "skipped") {
        process.stdout.write("skipped (cached)\n");
        counts.skipped++;
      } else if (result.status === "failed") {
        process.stdout.write("FAILED\n");
        counts.failed++;
      } else if (result.model) {
        const isNew = !existingModels.has(modelId);
        existingModels.set(modelId, result.model);
        process.stdout.write(isNew ? "added\n" : "updated\n");
        if (isNew) counts.added++;
        else counts.updated++;
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${err}\n`);
      counts.failed++;
    }
  }

  // Write updated models.json
  const modelsPath = path.join(ROOT, "src", "data", "models.json");
  const allModels = Array.from(existingModels.values());
  fs.writeFileSync(modelsPath, JSON.stringify(allModels, null, 2));
  console.log(`\n✅ Wrote ${allModels.length} models to src/data/models.json`);

  // Save cache
  saveCache(cache);

  // Print summary
  console.log("\n📊 Summary:");
  console.log(`   Added:   ${counts.added}`);
  console.log(`   Updated: ${counts.updated}`);
  console.log(`   Skipped: ${counts.skipped}`);
  console.log(`   Failed:  ${counts.failed}`);

  if (counts.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

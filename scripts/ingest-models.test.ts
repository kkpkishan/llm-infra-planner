/**
 * Integration test for the model ingestion pipeline.
 * Mocks HF API responses and runs the full pipeline on 3 mock models.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseConfig, configToModelSpec } from "./lib/config-parser.js";
import { detectArchitecture } from "./lib/arch-detector.js";
import { validateModel } from "./lib/model-validator.js";
import { estimateParams } from "./lib/param-estimator.js";
import type { ModelSpec } from "../src/lib/formulas/types.js";

// ─── Mock model configs ───────────────────────────────────────────────

const mockConfigs: Record<string, Record<string, unknown>> = {
  "test-org/dense-7b": {
    model_type: "llama",
    architectures: ["LlamaForCausalLM"],
    hidden_size: 4096,
    intermediate_size: 11008,
    num_hidden_layers: 32,
    num_attention_heads: 32,
    num_key_value_heads: 32,
    vocab_size: 32000,
    max_position_embeddings: 4096,
    tie_word_embeddings: false,
    torch_dtype: "float16",
  },
  "test-org/gqa-8b": {
    model_type: "llama",
    architectures: ["LlamaForCausalLM"],
    hidden_size: 4096,
    intermediate_size: 14336,
    num_hidden_layers: 32,
    num_attention_heads: 32,
    num_key_value_heads: 8,
    vocab_size: 128256,
    max_position_embeddings: 131072,
    tie_word_embeddings: false,
    torch_dtype: "bfloat16",
  },
  "test-org/moe-8x7b": {
    model_type: "mixtral",
    architectures: ["MixtralForCausalLM"],
    hidden_size: 4096,
    intermediate_size: 14336,
    num_hidden_layers: 32,
    num_attention_heads: 32,
    num_key_value_heads: 8,
    vocab_size: 32000,
    max_position_embeddings: 32768,
    tie_word_embeddings: false,
    num_local_experts: 8,
    num_experts_per_tok: 2,
    moe_intermediate_size: 14336,
    torch_dtype: "bfloat16",
  },
};

// ─── Pipeline helper ──────────────────────────────────────────────────

interface PipelineResult {
  modelId: string;
  status: "ok" | "failed";
  spec?: Partial<ModelSpec>;
  archType?: string;
  errors?: string[];
}

function runPipeline(modelId: string, configJson: Record<string, unknown>): PipelineResult {
  // 1. Parse config
  const parsed = parseConfig(configJson, modelId);
  if (!parsed) {
    return { modelId, status: "failed", errors: ["config parse failed"] };
  }

  // 2. Detect architecture
  const archResult = detectArchitecture(parsed);

  // 3. Estimate params
  const estimatedParams = estimateParams(parsed);

  // 4. Build partial spec
  const specFromConfig = configToModelSpec(parsed);
  const arch = specFromConfig.architecture;
  if (!arch) {
    return { modelId, status: "failed", errors: ["no architecture fields"] };
  }

  let attentionType: "mha" | "gqa" | "mqa" | "mla" = "mha";
  if (archResult.mlaConfig) attentionType = "mla";
  else if (parsed.numKeyValueHeads !== undefined && parsed.numAttentionHeads !== undefined) {
    if (parsed.numKeyValueHeads === 1) attentionType = "mqa";
    else if (parsed.numKeyValueHeads < parsed.numAttentionHeads) attentionType = "gqa";
    else attentionType = "mha";
  }

  const model: Partial<ModelSpec> & { id: string } = {
    id: modelId,
    family: "test",
    displayName: modelId.split("/")[1] ?? modelId,
    releaseDate: "2024-01-01",
    license: "apache-2.0",
    paramsTotal: estimatedParams,
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
  };

  if (archResult.moeConfig) {
    model.moe = {
      numExperts: archResult.moeConfig.numExperts,
      expertsPerToken: archResult.moeConfig.expertsPerToken,
    };
  }

  // 5. Validate
  const validation = validateModel(model);

  return {
    modelId,
    status: validation.valid ? "ok" : "failed",
    spec: validation.normalized ?? model,
    archType: archResult.type,
    errors: validation.errors,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("Model ingestion pipeline integration", () => {
  describe("dense-7b (MHA)", () => {
    let result: PipelineResult;

    beforeEach(() => {
      result = runPipeline("test-org/dense-7b", mockConfigs["test-org/dense-7b"]);
    });

    it("pipeline succeeds", () => {
      expect(result.status).toBe("ok");
    });

    it("detects dense architecture", () => {
      expect(result.archType).toBe("dense");
    });

    it("output matches ModelSpec shape", () => {
      const spec = result.spec as ModelSpec;
      expect(spec.id).toBe("test-org/dense-7b");
      expect(spec.architecture.hiddenSize).toBe(4096);
      expect(spec.architecture.numLayers).toBe(32);
      expect(spec.architecture.vocabSize).toBe(32000);
      expect(spec.architecture.attentionType).toBe("mha");
      expect(spec.architecture.headDim).toBe(128);
      expect(typeof spec.paramsTotal).toBe("number");
      expect(spec.paramsTotal).toBeGreaterThan(0);
    });
  });

  describe("gqa-8b (GQA)", () => {
    let result: PipelineResult;

    beforeEach(() => {
      result = runPipeline("test-org/gqa-8b", mockConfigs["test-org/gqa-8b"]);
    });

    it("pipeline succeeds", () => {
      expect(result.status).toBe("ok");
    });

    it("detects GQA attention type", () => {
      expect((result.spec as ModelSpec).architecture.attentionType).toBe("gqa");
    });

    it("has correct KV heads", () => {
      expect((result.spec as ModelSpec).architecture.numKeyValueHeads).toBe(8);
    });
  });

  describe("moe-8x7b (MoE)", () => {
    let result: PipelineResult;

    beforeEach(() => {
      result = runPipeline("test-org/moe-8x7b", mockConfigs["test-org/moe-8x7b"]);
    });

    it("pipeline succeeds", () => {
      expect(result.status).toBe("ok");
    });

    it("detects MoE architecture", () => {
      expect(result.archType).toBe("moe");
    });

    it("has moe config with correct expert counts", () => {
      const spec = result.spec as ModelSpec;
      expect(spec.moe).toBeDefined();
      expect(spec.moe!.numExperts).toBe(8);
      expect(spec.moe!.expertsPerToken).toBe(2);
    });

    it("output matches ModelSpec shape", () => {
      const spec = result.spec as ModelSpec;
      expect(spec.id).toBe("test-org/moe-8x7b");
      expect(spec.architecture.hiddenSize).toBe(4096);
      expect(spec.architecture.numLayers).toBe(32);
      expect(typeof spec.paramsTotal).toBe("number");
    });
  });

  describe("all 3 models", () => {
    it("all pass validation", () => {
      const modelIds = Object.keys(mockConfigs);
      for (const modelId of modelIds) {
        const result = runPipeline(modelId, mockConfigs[modelId]);
        expect(result.status, `${modelId} should pass`).toBe("ok");
      }
    });

    it("all have required ModelSpec fields", () => {
      const modelIds = Object.keys(mockConfigs);
      for (const modelId of modelIds) {
        const result = runPipeline(modelId, mockConfigs[modelId]);
        const spec = result.spec as ModelSpec;
        expect(spec.id).toBeTruthy();
        expect(spec.family).toBeTruthy();
        expect(spec.displayName).toBeTruthy();
        expect(spec.architecture).toBeDefined();
        expect(spec.architecture.hiddenSize).toBeGreaterThan(0);
        expect(spec.architecture.numLayers).toBeGreaterThan(0);
        expect(spec.architecture.vocabSize).toBeGreaterThan(0);
      }
    });
  });
});

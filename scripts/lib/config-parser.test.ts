/**
 * Unit tests for config-parser.ts
 */

import { describe, it, expect } from "vitest";
import { parseConfig } from "./config-parser.js";

// ─── Fixtures ────────────────────────────────────────────────────────

const llama31_8b_config = {
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
  rope_theta: 500000.0,
};

const mixtral_8x7b_config = {
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
  torch_dtype: "bfloat16",
};

const nested_text_config = {
  model_type: "llava",
  architectures: ["LlavaForConditionalGeneration"],
  text_config: {
    model_type: "llama",
    hidden_size: 4096,
    intermediate_size: 11008,
    num_hidden_layers: 32,
    num_attention_heads: 32,
    num_key_value_heads: 32,
    vocab_size: 32000,
    max_position_embeddings: 4096,
    tie_word_embeddings: false,
  },
  vision_config: {
    hidden_size: 1024,
    num_hidden_layers: 24,
  },
};

const no_head_dim_config = {
  model_type: "mistral",
  architectures: ["MistralForCausalLM"],
  hidden_size: 4096,
  intermediate_size: 14336,
  num_hidden_layers: 32,
  num_attention_heads: 32,
  num_key_value_heads: 8,
  vocab_size: 32000,
  max_position_embeddings: 32768,
  tie_word_embeddings: false,
  // No head_dim field — should be computed
};

// ─── Tests ────────────────────────────────────────────────────────────

describe("parseConfig", () => {
  describe("Llama-3.1-8B style config (dense GQA)", () => {
    it("parses core fields correctly", () => {
      const result = parseConfig(llama31_8b_config, "meta-llama/Llama-3.1-8B");
      expect(result).not.toBeNull();
      expect(result!.hiddenSize).toBe(4096);
      expect(result!.numLayers).toBe(32);
      expect(result!.intermediateSize).toBe(14336);
      expect(result!.numAttentionHeads).toBe(32);
      expect(result!.numKeyValueHeads).toBe(8);
      expect(result!.vocabSize).toBe(128256);
      expect(result!.maxPositionEmbeddings).toBe(131072);
      expect(result!.tieWordEmbeddings).toBe(false);
      expect(result!.modelType).toBe("llama");
    });

    it("computes headDim from hiddenSize / numAttentionHeads", () => {
      const result = parseConfig(llama31_8b_config, "meta-llama/Llama-3.1-8B");
      expect(result!.headDim).toBe(128); // 4096 / 32
    });

    it("extracts architectures array", () => {
      const result = parseConfig(llama31_8b_config, "meta-llama/Llama-3.1-8B");
      expect(result!.architectures).toEqual(["LlamaForCausalLM"]);
    });
  });

  describe("Mixtral-8x7B style config (MoE)", () => {
    it("parses MoE fields", () => {
      const result = parseConfig(mixtral_8x7b_config, "mistralai/Mixtral-8x7B-v0.1");
      expect(result).not.toBeNull();
      expect(result!.numLocalExperts).toBe(8);
      expect(result!.numExpertsPerTok).toBe(2);
    });

    it("parses base architecture fields", () => {
      const result = parseConfig(mixtral_8x7b_config, "mistralai/Mixtral-8x7B-v0.1");
      expect(result!.hiddenSize).toBe(4096);
      expect(result!.numLayers).toBe(32);
      expect(result!.numKeyValueHeads).toBe(8);
    });
  });

  describe("nested config handling (text_config wrapper)", () => {
    it("extracts language model fields from text_config", () => {
      const result = parseConfig(nested_text_config, "llava-model");
      expect(result).not.toBeNull();
      expect(result!.hiddenSize).toBe(4096);
      expect(result!.numLayers).toBe(32);
      expect(result!.vocabSize).toBe(32000);
    });

    it("preserves vision_config reference", () => {
      const result = parseConfig(nested_text_config, "llava-model");
      expect(result!.visionConfig).toBeDefined();
      expect(result!.visionConfig!["hidden_size"]).toBe(1024);
    });
  });

  describe("head_dim computation when not explicit", () => {
    it("computes headDim = hiddenSize / numAttentionHeads", () => {
      const result = parseConfig(no_head_dim_config, "mistralai/Mistral-7B");
      expect(result).not.toBeNull();
      expect(result!.headDim).toBe(128); // 4096 / 32
    });

    it("uses explicit head_dim when provided", () => {
      const configWithHeadDim = { ...no_head_dim_config, head_dim: 64 };
      const result = parseConfig(configWithHeadDim, "test-model");
      expect(result!.headDim).toBe(64);
    });
  });

  describe("returns null for missing required fields", () => {
    it("returns null when hidden_size is missing", () => {
      const bad = { num_hidden_layers: 32, vocab_size: 32000 };
      expect(parseConfig(bad, "bad-model")).toBeNull();
    });

    it("returns null when num_hidden_layers is missing", () => {
      const bad = { hidden_size: 4096, vocab_size: 32000 };
      expect(parseConfig(bad, "bad-model")).toBeNull();
    });

    it("returns null when vocab_size is missing", () => {
      const bad = { hidden_size: 4096, num_hidden_layers: 32 };
      expect(parseConfig(bad, "bad-model")).toBeNull();
    });
  });
});

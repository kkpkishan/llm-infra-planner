// Feature: llm-hardware-calculator, Properties 10, 11, 15, 22
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeTotalVRAM } from './aggregate';
import { computeThroughput } from './throughput';
import { computeCostMetrics } from './cost-metrics';
import type { ModelSpec, PrecisionConfig } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeModel(overrides: Partial<ModelSpec['architecture']> = {}): ModelSpec {
  return {
    id: 'test-model',
    family: 'llama',
    displayName: 'Test Model',
    releaseDate: '2024-01-01',
    license: 'Apache-2.0',
    paramsTotal: 7_000_000_000,
    architecture: {
      numLayers: 32,
      hiddenSize: 4096,
      intermediateSize: 11008,
      numAttentionHeads: 32,
      numKeyValueHeads: 8,
      headDim: 128,
      vocabSize: 32000,
      tieWordEmbeddings: false,
      attentionType: 'gqa',
      maxContextLength: 131072,
      positionalEmbedding: 'rope',
      ...overrides,
    },
  };
}

const fp16: PrecisionConfig = { key: 'fp16', label: 'FP16', bytesPerParam: 2.0 };
const q4km: PrecisionConfig = { key: 'q4_k_m', label: 'GGUF Q4_K_M', bytesPerParam: 0.606 };

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('computeTotalVRAM — unit tests', () => {
  it('Llama-3.1-70B Q4_K_M inference at 32k: total ≈ 55.8 GB (PRFAQ worked example)', () => {
    const model: ModelSpec = {
      ...makeModel(),
      paramsTotal: 70_550_000_000,
      architecture: {
        numLayers: 80, hiddenSize: 8192, intermediateSize: 28672,
        numAttentionHeads: 64, numKeyValueHeads: 8, headDim: 128,
        vocabSize: 128256, tieWordEmbeddings: false,
        attentionType: 'gqa', maxContextLength: 131072, positionalEmbedding: 'rope',
      },
    };
    const result = computeTotalVRAM(model, q4km, fp16, 32768, 1, 'inference');
    // weights ≈ 42.8, kv ≈ 10.7, overhead 1.0 → total ≈ 54.5–56 GB
    expect(result.totalGB).toBeGreaterThan(50);
    expect(result.totalGB).toBeLessThan(60);
    expect(result.weightsGB).toBeCloseTo(42.8, 0);
  });

  it('inference mode: kvCacheGB > 0, activations/gradients/optimizer = 0', () => {
    const result = computeTotalVRAM(makeModel(), fp16, fp16, 4096, 1, 'inference');
    expect(result.kvCacheGB).toBeGreaterThan(0);
    expect(result.activationsGB).toBe(0);
    expect(result.gradientsGB).toBe(0);
    expect(result.optimizerGB).toBe(0);
  });

  it('train mode: activations/gradients/optimizer > 0, kvCacheGB = 0', () => {
    const result = computeTotalVRAM(makeModel(), fp16, fp16, 2048, 1, 'train');
    expect(result.kvCacheGB).toBe(0);
    expect(result.activationsGB).toBeGreaterThan(0);
    expect(result.gradientsGB).toBeGreaterThan(0);
    expect(result.optimizerGB).toBeGreaterThan(0);
  });

  it('overhead is always 1 GB', () => {
    const result = computeTotalVRAM(makeModel(), fp16, fp16, 4096, 1, 'inference');
    expect(result.overheadGB).toBe(1.0);
  });
});

// ─── Property 10: VRAM breakdown sum invariant ───────────────────────────────
// **Validates: Requirements 3.6, 4.1, 4.4**

describe('Property 10: VRAM breakdown sum invariant', () => {
  it('sum of all components equals totalGB', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 512, max: 32768 }),
        fc.integer({ min: 1, max: 8 }),
        fc.constantFrom('inference', 'train', 'finetune') as fc.Arbitrary<'inference' | 'train' | 'finetune'>,
        (contextLength, batchSize, mode) => {
          const result = computeTotalVRAM(makeModel(), fp16, fp16, contextLength, batchSize, mode);
          const sum = result.weightsGB + result.kvCacheGB + result.activationsGB +
            result.gradientsGB + result.optimizerGB + result.overheadGB;
          expect(result.totalGB).toBeCloseTo(sum, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 11: Mode-dependent VRAM components ─────────────────────────────
// **Validates: Requirements 11.2, 11.3, 11.4**

describe('Property 11: Mode-dependent VRAM components', () => {
  it('inference: kvCache > 0, training components = 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 512, max: 32768 }),
        fc.integer({ min: 1, max: 8 }),
        (contextLength, batchSize) => {
          const result = computeTotalVRAM(makeModel(), fp16, fp16, contextLength, batchSize, 'inference');
          expect(result.kvCacheGB).toBeGreaterThan(0);
          expect(result.activationsGB).toBe(0);
          expect(result.gradientsGB).toBe(0);
          expect(result.optimizerGB).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('train: activations/gradients/optimizer > 0, kvCache = 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 512, max: 4096 }),
        fc.integer({ min: 1, max: 4 }),
        (contextLength, batchSize) => {
          const result = computeTotalVRAM(makeModel(), fp16, fp16, contextLength, batchSize, 'train');
          expect(result.kvCacheGB).toBe(0);
          expect(result.activationsGB).toBeGreaterThan(0);
          expect(result.gradientsGB).toBeGreaterThan(0);
          expect(result.optimizerGB).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 15: Throughput formula correctness ─────────────────────────────
// **Validates: Requirements 7.1, 7.3, 7.4**

describe('Property 15: Throughput formula correctness', () => {
  it('returns floor(bandwidth / activeWeights × efficiency) as whole number', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(100), max: Math.fround(8000), noNaN: true }),   // bandwidth GB/s
        fc.float({ min: Math.fround(1), max: Math.fround(700), noNaN: true }),       // activeWeightsGB
        fc.float({ min: Math.fround(0.55), max: Math.fround(0.95), noNaN: true }),   // efficiencyFactor
        (memoryBandwidthGBs, activeWeightsGB, efficiencyFactor) => {
          const result = computeThroughput({ memoryBandwidthGBs, activeWeightsGB, efficiencyFactor });
          const expected = Math.floor((memoryBandwidthGBs / activeWeightsGB) * efficiencyFactor);
          expect(result.tokensPerSecond).toBe(expected);
          expect(Number.isInteger(result.tokensPerSecond)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns 0 when activeWeightsGB is 0', () => {
    const result = computeThroughput({ memoryBandwidthGBs: 1000, activeWeightsGB: 0, efficiencyFactor: 0.8 });
    expect(result.tokensPerSecond).toBe(0);
  });
});

// ─── Property 22: Cost per million tokens formula ────────────────────────────
// **Validates: Requirements 29.2, 36.3**

describe('Property 22: Cost per million tokens formula', () => {
  it('costPerMillionTokens = round((hourlyCloudCost / (tokPerSec × 3600)) × 1_000_000, 2)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(200), noNaN: true }),   // hourlyCloudCost
        fc.integer({ min: 1, max: 10000 }),               // tokensPerSecond
        (hourlyCloudCost, tokensPerSecond) => {
          const result = computeCostMetrics({
            tokensPerSecond, hourlyCloudCost,
            contextLength: 4096, activeWeightsGB: 16, computeTFLOPS: 312,
          });
          const expected = Math.round((hourlyCloudCost / (tokensPerSecond * 3600)) * 1_000_000 * 100) / 100;
          expect(result.costPerMillionTokens).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns 0 when tokensPerSecond is 0', () => {
    const result = computeCostMetrics({
      tokensPerSecond: 0, hourlyCloudCost: 2.49,
      contextLength: 4096, activeWeightsGB: 16, computeTFLOPS: 312,
    });
    expect(result.costPerMillionTokens).toBe(0);
  });
});

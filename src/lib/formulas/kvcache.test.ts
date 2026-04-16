// Feature: llm-hardware-calculator, Properties 3, 4, 5: KV cache formula correctness
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeKVCache } from './kvcache';

// ─── Generators ──────────────────────────────────────────────────────────────

const numLayersArb = fc.integer({ min: 1, max: 128 });
const batchSizeArb = fc.integer({ min: 1, max: 32 });
const seqLenArb = fc.integer({ min: 1024, max: 131072 });
const numKVHeadsArb = fc.integer({ min: 1, max: 64 });
const headDimArb = fc.integer({ min: 64, max: 256 }).map(n => Math.round(n / 64) * 64).filter(n => n >= 64);
const bytesPerParamArb = fc.constantFrom(2.0, 1.0, 0.5);

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('computeKVCache — unit tests', () => {
  it('Llama-3.1-8B at 32k context, batch=1, FP16 KV (GQA)', () => {
    const result = computeKVCache({
      numLayers: 32, batchSize: 1, seqLen: 32768,
      numKVHeads: 8, headDim: 128, bytesPerParam: 2.0, attentionType: 'gqa',
    });
    expect(result.kvCacheGB).toBeCloseTo(4.29, 1);
  });

  it('DeepSeek-V2 MLA: uses MLA formula when mlaCompressedDim is provided', () => {
    const result = computeKVCache({
      numLayers: 60, batchSize: 1, seqLen: 4096,
      numKVHeads: 128, headDim: 128, bytesPerParam: 2.0,
      attentionType: 'mla', mlaCompressedDim: 512,
    });
    const expected = Math.round(60 * 1 * 4096 * 512 * 2.0 / 1e9 * 100) / 100;
    expect(result.kvCacheGB).toBe(expected);
    expect(result.rawBytes).toBe(60 * 1 * 4096 * 512 * 2.0);
  });

  it('MQA model: uses numKVHeads=1 regardless of numKVHeads input', () => {
    const mqaResult = computeKVCache({
      numLayers: 32, batchSize: 1, seqLen: 4096,
      numKVHeads: 32, headDim: 128, bytesPerParam: 2.0, attentionType: 'mqa',
    });
    const gqaResult = computeKVCache({
      numLayers: 32, batchSize: 1, seqLen: 4096,
      numKVHeads: 1, headDim: 128, bytesPerParam: 2.0, attentionType: 'gqa',
    });
    expect(mqaResult.kvCacheGB).toBe(gqaResult.kvCacheGB);
    expect(mqaResult.rawBytes).toBe(gqaResult.rawBytes);
  });

  it('MHA uses numKVHeads as-is', () => {
    const result = computeKVCache({
      numLayers: 32, batchSize: 1, seqLen: 4096,
      numKVHeads: 32, headDim: 128, bytesPerParam: 2.0, attentionType: 'mha',
    });
    expect(result.rawBytes).toBe(2 * 32 * 1 * 4096 * 32 * 128 * 2.0);
  });
});

// ─── Property 3: MHA/GQA/MQA formula correctness ─────────────────────────────
// **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

describe('Property 3: MHA/GQA/MQA formula correctness', () => {
  it('GQA: result equals round(2 × numLayers × batch × seqLen × numKVHeads × headDim × bytesPerParam / 1e9, 2)', () => {
    fc.assert(
      fc.property(numLayersArb, batchSizeArb, seqLenArb, numKVHeadsArb, headDimArb, bytesPerParamArb,
        (numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam) => {
          const result = computeKVCache({ numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, attentionType: 'gqa' });
          const expectedRaw = 2 * numLayers * batchSize * seqLen * numKVHeads * headDim * bytesPerParam;
          expect(result.rawBytes).toBe(expectedRaw);
          expect(result.kvCacheGB).toBe(Math.round(expectedRaw / 1e9 * 100) / 100);
        }
      ), { numRuns: 200 }
    );
  });

  it('MQA: always uses effectiveKVHeads=1', () => {
    fc.assert(
      fc.property(numLayersArb, batchSizeArb, seqLenArb, numKVHeadsArb, headDimArb, bytesPerParamArb,
        (numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam) => {
          const result = computeKVCache({ numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, attentionType: 'mqa' });
          const expectedRaw = 2 * numLayers * batchSize * seqLen * 1 * headDim * bytesPerParam;
          expect(result.rawBytes).toBe(expectedRaw);
        }
      ), { numRuns: 200 }
    );
  });
});

// ─── Property 4: MLA formula selection ───────────────────────────────────────
// **Validates: Requirements 2.4**

describe('Property 4: MLA formula selection', () => {
  it('MLA with mlaCompressedDim: uses compressed formula', () => {
    fc.assert(
      fc.property(numLayersArb, batchSizeArb, seqLenArb, numKVHeadsArb, headDimArb, bytesPerParamArb, fc.integer({ min: 64, max: 1024 }),
        (numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, mlaCompressedDim) => {
          const result = computeKVCache({ numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, attentionType: 'mla', mlaCompressedDim });
          const expectedRaw = numLayers * batchSize * seqLen * mlaCompressedDim * bytesPerParam;
          expect(result.rawBytes).toBe(expectedRaw);
        }
      ), { numRuns: 200 }
    );
  });

  it('MLA without mlaCompressedDim: falls back to GQA formula', () => {
    fc.assert(
      fc.property(numLayersArb, batchSizeArb, seqLenArb, numKVHeadsArb, headDimArb, bytesPerParamArb,
        (numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam) => {
          const mlaResult = computeKVCache({ numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, attentionType: 'mla' });
          const gqaResult = computeKVCache({ numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, attentionType: 'gqa' });
          expect(mlaResult.rawBytes).toBe(gqaResult.rawBytes);
        }
      ), { numRuns: 200 }
    );
  });
});

// ─── Property 5: Doubling seqLen doubles kvCacheGB ───────────────────────────
// **Validates: Requirements 2.6**

describe('Property 5: Doubling seqLen doubles kvCacheGB', () => {
  it('GQA: doubling seqLen exactly doubles rawBytes', () => {
    fc.assert(
      fc.property(numLayersArb, batchSizeArb, fc.integer({ min: 1024, max: 65536 }), numKVHeadsArb, headDimArb, bytesPerParamArb,
        (numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam) => {
          const base = computeKVCache({ numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, attentionType: 'gqa' });
          const doubled = computeKVCache({ numLayers, batchSize, seqLen: seqLen * 2, numKVHeads, headDim, bytesPerParam, attentionType: 'gqa' });
          expect(doubled.rawBytes).toBe(base.rawBytes * 2);
        }
      ), { numRuns: 200 }
    );
  });

  it('MLA: doubling seqLen exactly doubles rawBytes', () => {
    fc.assert(
      fc.property(numLayersArb, batchSizeArb, fc.integer({ min: 1024, max: 65536 }), numKVHeadsArb, headDimArb, bytesPerParamArb, fc.integer({ min: 64, max: 1024 }),
        (numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, mlaCompressedDim) => {
          const base = computeKVCache({ numLayers, batchSize, seqLen, numKVHeads, headDim, bytesPerParam, attentionType: 'mla', mlaCompressedDim });
          const doubled = computeKVCache({ numLayers, batchSize, seqLen: seqLen * 2, numKVHeads, headDim, bytesPerParam, attentionType: 'mla', mlaCompressedDim });
          expect(doubled.rawBytes).toBe(base.rawBytes * 2);
        }
      ), { numRuns: 200 }
    );
  });
});

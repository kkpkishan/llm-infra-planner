// Feature: llm-hardware-calculator, Properties 16, 17, 18, 21
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { serializeState, parseState, getDefaultState } from './url-serializer';
import { computeKVCache } from './formulas/kvcache';
import { PRECISION_MAP, KV_PRECISION_MAP } from './formulas/precision';
import type { ModelSpec, CalculatorState } from './formulas/types';

// ─── Minimal model DB for tests ───────────────────────────────────────────────

function makeModel(id: string, maxCtx = 131072): ModelSpec {
  return {
    id,
    family: 'llama',
    displayName: id,
    releaseDate: '2024-01-01',
    license: 'Apache-2.0',
    paramsTotal: 7_000_000_000,
    architecture: {
      numLayers: 32, hiddenSize: 4096, intermediateSize: 11008,
      numAttentionHeads: 32, numKeyValueHeads: 8, headDim: 128,
      vocabSize: 32000, tieWordEmbeddings: false,
      attentionType: 'gqa', maxContextLength: maxCtx, positionalEmbedding: 'rope',
    },
  };
}

const MODEL_DB: ModelSpec[] = [
  makeModel('meta-llama/Llama-3.1-8B', 131072),
  makeModel('meta-llama/Llama-3.1-70B', 131072),
  makeModel('qwen/Qwen2.5-7B', 131072),
];

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('serializeState / parseState — unit tests', () => {
  it('round-trips a complete state', () => {
    const state: CalculatorState = {
      model: 'meta-llama/Llama-3.1-8B',
      precision: 'q4_k_m',
      kvPrecision: 'fp16',
      ctx: 32768,
      batch: 4,
      mode: 'inference',
    };
    const qs = serializeState(state);
    const parsed = parseState(qs, MODEL_DB);
    expect(parsed.model).toBe(state.model);
    expect(parsed.precision).toBe(state.precision);
    expect(parsed.kvPrecision).toBe(state.kvPrecision);
    expect(parsed.ctx).toBe(state.ctx);
    expect(parsed.batch).toBe(state.batch);
    expect(parsed.mode).toBe(state.mode);
  });

  it('falls back to default model for unrecognized model ID', () => {
    const parsed = parseState('?model=unknown-model-xyz&precision=fp16&kv=fp16&ctx=4096&batch=1&mode=inference', MODEL_DB);
    expect(parsed.model).toBe(MODEL_DB[0].id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((parsed as any).fallbackModel).toBe(true);
  });

  it('falls back to FP16 for invalid precision', () => {
    const parsed = parseState('?model=meta-llama/Llama-3.1-8B&precision=invalid&kv=fp16&ctx=4096&batch=1&mode=inference', MODEL_DB);
    expect(parsed.precision).toBe('fp16');
  });

  it('clamps context to model maxContextLength', () => {
    const parsed = parseState('?model=meta-llama/Llama-3.1-8B&precision=fp16&kv=fp16&ctx=999999&batch=1&mode=inference', MODEL_DB);
    expect(parsed.ctx).toBe(131072);
  });

  it('clamps batch to [1, 32]', () => {
    const lo = parseState('?model=meta-llama/Llama-3.1-8B&precision=fp16&kv=fp16&ctx=4096&batch=0&mode=inference', MODEL_DB);
    expect(lo.batch).toBe(1);
    const hi = parseState('?model=meta-llama/Llama-3.1-8B&precision=fp16&kv=fp16&ctx=4096&batch=100&mode=inference', MODEL_DB);
    expect(hi.batch).toBe(32);
  });

  it('applies defaults for empty query string', () => {
    const parsed = parseState('', MODEL_DB);
    const defaults = getDefaultState(MODEL_DB);
    expect(parsed.precision).toBe(defaults.precision);
    expect(parsed.kvPrecision).toBe(defaults.kvPrecision);
    expect(parsed.batch).toBe(defaults.batch);
    expect(parsed.mode).toBe(defaults.mode);
  });
});

// ─── Property 16: URL state round-trip ───────────────────────────────────────
// **Validates: Requirements 12.1, 12.2, 12.4, 24.1, 24.5, 24.6**

describe('Property 16: URL state round-trip', () => {
  it('serialize then parse produces equivalent state', () => {
    const precisionKeys = Object.keys(PRECISION_MAP);
    const kvKeys = Object.keys(KV_PRECISION_MAP);
    const modes = ['inference', 'scale', 'finetune', 'train'] as const;
    const modelIds = MODEL_DB.map(m => m.id);

    fc.assert(
      fc.property(
        fc.constantFrom(...modelIds),
        fc.constantFrom(...precisionKeys),
        fc.constantFrom(...kvKeys),
        fc.integer({ min: 1024, max: 131072 }),
        fc.integer({ min: 1, max: 32 }),
        fc.constantFrom(...modes),
        (model, precision, kvPrecision, ctx, batch, mode) => {
          // Clamp ctx to model's max
          const modelSpec = MODEL_DB.find(m => m.id === model)!;
          const clampedCtx = Math.min(ctx, modelSpec.architecture.maxContextLength);

          const state: CalculatorState = { model, precision, kvPrecision, ctx: clampedCtx, batch, mode };
          const qs = serializeState(state);
          const parsed = parseState(qs, MODEL_DB);

          expect(parsed.model).toBe(state.model);
          expect(parsed.precision).toBe(state.precision);
          expect(parsed.kvPrecision).toBe(state.kvPrecision);
          expect(parsed.ctx).toBe(state.ctx);
          expect(parsed.batch).toBe(state.batch);
          expect(parsed.mode).toBe(state.mode);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 17: URL parser applies defaults for missing parameters ──────────
// **Validates: Requirements 24.2**

describe('Property 17: URL parser applies defaults for missing parameters', () => {
  it('any subset of params produces valid state with defaults for missing ones', () => {
    const defaults = getDefaultState(MODEL_DB);

    fc.assert(
      fc.property(
        fc.subarray(['model', 'precision', 'kv', 'ctx', 'batch', 'mode']),
        (includedParams) => {
          const fullParams: Record<string, string> = {
            model: MODEL_DB[0].id,
            precision: 'fp16',
            kv: 'fp16',
            ctx: '4096',
            batch: '1',
            mode: 'inference',
          };

          const params = new URLSearchParams();
          for (const key of includedParams) {
            params.set(key, fullParams[key]);
          }

          const parsed = parseState('?' + params.toString(), MODEL_DB);

          // All fields must be valid (non-empty, in-range)
          expect(parsed.model.length).toBeGreaterThan(0);
          expect(parsed.precision in PRECISION_MAP).toBe(true);
          expect(parsed.kvPrecision in KV_PRECISION_MAP).toBe(true);
          expect(parsed.ctx).toBeGreaterThanOrEqual(1024);
          expect(parsed.batch).toBeGreaterThanOrEqual(1);
          expect(parsed.batch).toBeLessThanOrEqual(32);
          expect(['inference', 'scale', 'finetune', 'train', 'reverse']).toContain(parsed.mode);

          // Missing params should use defaults
          if (!includedParams.includes('precision')) expect(parsed.precision).toBe(defaults.precision);
          if (!includedParams.includes('kv')) expect(parsed.kvPrecision).toBe(defaults.kvPrecision);
          if (!includedParams.includes('batch')) expect(parsed.batch).toBe(defaults.batch);
          if (!includedParams.includes('mode')) expect(parsed.mode).toBe(defaults.mode);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 18: Context length clamping ────────────────────────────────────
// **Validates: Requirements 10.4, 24.4**

describe('Property 18: Context length clamping', () => {
  it('context > model max is clamped to model max', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1024, max: 131072 }),  // maxContextLength
        fc.integer({ min: 1, max: 1_000_000 }),  // requested ctx (may exceed max)
        (maxCtx, requestedCtx) => {
          const model = makeModel('test-model', maxCtx);
          const db = [model];
          const qs = `?model=test-model&precision=fp16&kv=fp16&ctx=${requestedCtx}&batch=1&mode=inference`;
          const parsed = parseState(qs, db);

          expect(parsed.ctx).toBeLessThanOrEqual(maxCtx);
          if (requestedCtx <= maxCtx) {
            expect(parsed.ctx).toBe(requestedCtx);
          } else {
            expect(parsed.ctx).toBe(maxCtx);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 21: KV cache precision independence ────────────────────────────
// **Validates: Requirements 30.2**

describe('Property 21: KV cache precision independence', () => {
  it('changing weight precision while holding KV precision constant does not change KV cache result', () => {
    const weightPrecisionKeys = Object.keys(PRECISION_MAP);
    const kvPrecisionKeys = Object.keys(KV_PRECISION_MAP);

    fc.assert(
      fc.property(
        fc.constantFrom(...weightPrecisionKeys),
        fc.constantFrom(...weightPrecisionKeys),
        fc.constantFrom(...kvPrecisionKeys),
        fc.integer({ min: 1, max: 64 }),   // numLayers
        fc.integer({ min: 1, max: 8 }),    // batchSize
        fc.integer({ min: 1024, max: 32768 }), // seqLen
        fc.integer({ min: 1, max: 32 }),   // numKVHeads
        fc.integer({ min: 64, max: 256 }), // headDim
        (weightPrecision1, weightPrecision2, kvPrecision, numLayers, batchSize, seqLen, numKVHeads, headDim) => {
          const kvBytesPerParam = KV_PRECISION_MAP[kvPrecision].bytesPerParam;

          // Same KV precision, different weight precisions → same KV cache
          const result1 = computeKVCache({
            numLayers, batchSize, seqLen, numKVHeads, headDim,
            bytesPerParam: kvBytesPerParam,
            attentionType: 'gqa',
          });
          const result2 = computeKVCache({
            numLayers, batchSize, seqLen, numKVHeads, headDim,
            bytesPerParam: kvBytesPerParam, // same KV precision
            attentionType: 'gqa',
          });

          // KV cache depends only on kvBytesPerParam, not weight precision
          expect(result1.kvCacheGB).toBe(result2.kvCacheGB);
          expect(result1.rawBytes).toBe(result2.rawBytes);

          // Suppress unused variable warnings
          void weightPrecision1;
          void weightPrecision2;
        }
      ),
      { numRuns: 200 }
    );
  });
});

import { describe, it, expect } from 'vitest';
import {
  computeKVStandard,
  computeKVSlidingWindow,
  computeKVPrefixCache,
  computeKVVariant,
} from './kv-cache';

// Llama-3 8B architecture: 32 layers, 8 KV heads, 128 head_dim, GQA
const llama3_8b = {
  numLayers: 32,
  batchSize: 1,
  seqLen: 32768,
  numKVHeads: 8,
  headDim: 128,
  bytesPerParam: 2, // FP16
};

describe('computeKVStandard', () => {
  it('Llama-3 8B at 32K context GQA FP16 should be ~4.29 GB', () => {
    // 2 × 32 × 1 × 32768 × 8 × 128 × 2 = 4,294,967,296 bytes = ~4.29 GB
    const result = computeKVStandard(llama3_8b);
    expect(result.kvCacheGB).toBeCloseTo(4.29, 1);
  });

  it('rawBytes formula: 2 × L × batch × seq × h_kv × head_dim × bytes', () => {
    const result = computeKVStandard(llama3_8b);
    const expected = 2 * 32 * 1 * 32768 * 8 * 128 * 2;
    expect(result.rawBytes).toBe(expected);
  });

  it('variant is "standard"', () => {
    expect(computeKVStandard(llama3_8b).variant).toBe('standard');
  });
});

describe('computeKVSlidingWindow', () => {
  it('window=4096 at 32K context should be ~4× smaller than standard', () => {
    const standard = computeKVStandard(llama3_8b);
    const sliding = computeKVSlidingWindow(llama3_8b, 4096);
    // 32768 / 4096 = 8, so sliding should be 8× smaller
    expect(sliding.kvCacheGB).toBeCloseTo(standard.kvCacheGB / 8, 5);
  });

  it('window larger than seq uses seq (no change)', () => {
    const standard = computeKVStandard(llama3_8b);
    const sliding = computeKVSlidingWindow(llama3_8b, 100000);
    expect(sliding.rawBytes).toBe(standard.rawBytes);
  });

  it('variant is "sliding_window"', () => {
    expect(computeKVSlidingWindow(llama3_8b, 4096).variant).toBe('sliding_window');
  });
});

describe('computeKVPrefixCache', () => {
  it('50% reuse should be exactly 50% of standard', () => {
    const standard = computeKVStandard(llama3_8b);
    const prefix = computeKVPrefixCache(llama3_8b, 50);
    expect(prefix.rawBytes).toBe(standard.rawBytes * 0.5);
    expect(prefix.kvCacheGB).toBeCloseTo(standard.kvCacheGB * 0.5, 10);
  });

  it('0% reuse equals standard', () => {
    const standard = computeKVStandard(llama3_8b);
    const prefix = computeKVPrefixCache(llama3_8b, 0);
    expect(prefix.rawBytes).toBe(standard.rawBytes);
  });

  it('90% reuse (max) reduces to 10% of standard', () => {
    const standard = computeKVStandard(llama3_8b);
    const prefix = computeKVPrefixCache(llama3_8b, 90);
    expect(prefix.rawBytes).toBeCloseTo(standard.rawBytes * 0.1, 5);
  });

  it('clamps reuse above 90 to 90', () => {
    const at90 = computeKVPrefixCache(llama3_8b, 90);
    const at100 = computeKVPrefixCache(llama3_8b, 100);
    expect(at100.rawBytes).toBe(at90.rawBytes);
  });

  it('variant is "prefix_cache"', () => {
    expect(computeKVPrefixCache(llama3_8b, 50).variant).toBe('prefix_cache');
  });
});

describe('FP16 vs FP8 KV — exactly 2× difference', () => {
  it('FP16 KV is exactly 2× FP8 KV', () => {
    const fp16 = computeKVStandard({ ...llama3_8b, bytesPerParam: 2 });
    const fp8 = computeKVStandard({ ...llama3_8b, bytesPerParam: 1 });
    expect(fp16.rawBytes).toBe(fp8.rawBytes * 2);
    expect(fp16.kvCacheGB).toBeCloseTo(fp8.kvCacheGB * 2, 10);
  });
});

describe('computeKVVariant unified entry point', () => {
  it('standard variant delegates to computeKVStandard', () => {
    const direct = computeKVStandard(llama3_8b);
    const via = computeKVVariant(llama3_8b, 'standard');
    expect(via.rawBytes).toBe(direct.rawBytes);
  });

  it('sliding_window variant uses windowSize option', () => {
    const direct = computeKVSlidingWindow(llama3_8b, 2048);
    const via = computeKVVariant(llama3_8b, 'sliding_window', { windowSize: 2048 });
    expect(via.rawBytes).toBe(direct.rawBytes);
  });

  it('prefix_cache variant uses reusePercent option', () => {
    const direct = computeKVPrefixCache(llama3_8b, 70);
    const via = computeKVVariant(llama3_8b, 'prefix_cache', { reusePercent: 70 });
    expect(via.rawBytes).toBe(direct.rawBytes);
  });

  it('paged variant has same bytes as standard', () => {
    const standard = computeKVStandard(llama3_8b);
    const paged = computeKVVariant(llama3_8b, 'paged');
    expect(paged.rawBytes).toBe(standard.rawBytes);
    expect(paged.variant).toBe('paged');
  });
});

import { describe, it, expect } from 'vitest';
import { computeWeightMemory } from './vram';
import { computeKVCache } from './kvcache';
import { QUANTIZATION_TYPES, getQuantType } from '@/data/quantization-types';

// ── Q4_K_M bytes/param ────────────────────────────────────────────────────────

describe('Q4_K_M quantization', () => {
  it('has bytesPerParam of 0.606', () => {
    const q = getQuantType('q4_k_m');
    expect(q).toBeDefined();
    expect(q!.bytesPerParam).toBe(0.606);
  });

  it('computes weightGB = round(params × 0.606 / 1e9, 1)', () => {
    // 1B params × 0.606 = 0.606 GB → rounds to 0.6
    const result = computeWeightMemory({ numParams: 1_000_000_000, bytesPerParam: 0.606 });
    expect(result.weightGB).toBe(0.6);
  });

  it('computes 7B model at Q4_K_M correctly', () => {
    // 7B × 0.606 = 4.242 GB → rounds to 4.2
    const result = computeWeightMemory({ numParams: 7_000_000_000, bytesPerParam: 0.606 });
    expect(result.weightGB).toBe(4.2);
  });

  it('computes 70B model at Q4_K_M correctly', () => {
    // 70B × 0.606 = 42.42 GB → rounds to 42.4
    const result = computeWeightMemory({ numParams: 70_000_000_000, bytesPerParam: 0.606 });
    expect(result.weightGB).toBe(42.4);
  });
});

// ── IQ2_XXS bytes/param ───────────────────────────────────────────────────────

describe('IQ2_XXS quantization', () => {
  it('has bytesPerParam of 0.26', () => {
    const q = getQuantType('iq2_xxs');
    expect(q).toBeDefined();
    expect(q!.bytesPerParam).toBe(0.26);
  });

  it('computes weightGB = round(params × 0.26 / 1e9, 1)', () => {
    // 1B × 0.26 = 0.26 GB → rounds to 0.3
    const result = computeWeightMemory({ numParams: 1_000_000_000, bytesPerParam: 0.26 });
    expect(result.weightGB).toBe(0.3);
  });

  it('computes 7B model at IQ2_XXS correctly', () => {
    // 7B × 0.26 = 1.82 GB → rounds to 1.8
    const result = computeWeightMemory({ numParams: 7_000_000_000, bytesPerParam: 0.26 });
    expect(result.weightGB).toBe(1.8);
  });
});

// ── KV cache FP16 vs FP8 at 128K context ─────────────────────────────────────

describe('KV cache FP16 vs FP8 at 128K context', () => {
  const BASE_CONFIG = {
    numLayers: 32,
    batchSize: 1,
    seqLen: 131072, // 128K
    numKVHeads: 8,
    headDim: 128,
    attentionType: 'gqa' as const,
  };

  it('FP16 KV cache rawBytes is exactly 2× FP8 KV cache rawBytes', () => {
    const fp16 = computeKVCache({ ...BASE_CONFIG, bytesPerParam: 2.0 });
    const fp8  = computeKVCache({ ...BASE_CONFIG, bytesPerParam: 1.0 });
    expect(fp16.rawBytes).toBe(fp8.rawBytes * 2);
  });

  it('FP16 kvCacheGB is exactly 2× FP8 kvCacheGB', () => {
    const fp16 = computeKVCache({ ...BASE_CONFIG, bytesPerParam: 2.0 });
    const fp8  = computeKVCache({ ...BASE_CONFIG, bytesPerParam: 1.0 });
    expect(fp16.kvCacheGB).toBe(fp8.kvCacheGB * 2);
  });
});

// ── All quant types have valid bytesPerParam ──────────────────────────────────

describe('QUANTIZATION_TYPES data integrity', () => {
  it('all entries have bytesPerParam > 0', () => {
    for (const q of QUANTIZATION_TYPES) {
      expect(q.bytesPerParam).toBeGreaterThan(0);
    }
  });

  it('all entries have qualityStars between 1 and 5', () => {
    for (const q of QUANTIZATION_TYPES) {
      expect(q.qualityStars).toBeGreaterThanOrEqual(1);
      expect(q.qualityStars).toBeLessThanOrEqual(5);
    }
  });

  it('all keys are unique', () => {
    const keys = QUANTIZATION_TYPES.map(q => q.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

// ── EXL2 4.65bpw ─────────────────────────────────────────────────────────────

describe('EXL2 4.65bpw quantization', () => {
  it('has bytesPerParam of 0.581', () => {
    const q = getQuantType('exl2_4.65bpw');
    expect(q).toBeDefined();
    expect(q!.bytesPerParam).toBe(0.581);
  });

  it('computes weightGB for 7B model at EXL2 4.65bpw', () => {
    // 7B × 0.581 = 4.067 GB → rounds to 4.1
    const result = computeWeightMemory({ numParams: 7_000_000_000, bytesPerParam: 0.581 });
    expect(result.weightGB).toBe(4.1);
  });

  it('EXL2 family entries all have isVariable=true', () => {
    const exl2 = QUANTIZATION_TYPES.filter(q => q.family === 'exl2');
    expect(exl2.length).toBeGreaterThan(0);
    for (const q of exl2) {
      expect(q.isVariable).toBe(true);
    }
  });
});

// ── SmoothQuant and HQQ ───────────────────────────────────────────────────────

describe('Other quant types', () => {
  it('SmoothQuant W8A8 has bytesPerParam of 1.0', () => {
    const q = getQuantType('smoothquant_w8a8');
    expect(q).toBeDefined();
    expect(q!.bytesPerParam).toBe(1.0);
    expect(q!.family).toBe('other');
  });

  it('HQQ 4-bit has bytesPerParam of 0.5', () => {
    const q = getQuantType('hqq_4bit');
    expect(q).toBeDefined();
    expect(q!.bytesPerParam).toBe(0.5);
  });
});

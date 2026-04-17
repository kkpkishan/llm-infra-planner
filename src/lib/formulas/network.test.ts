import { describe, it, expect } from 'vitest';
import {
  computeAllReduceBytes,
  computeTPCommBytes,
  computePPCommBytes,
  computeZeRO3CommBytes,
  computeMoECommBytes,
  computeRequiredBandwidth,
  computeCommOverheadPercent,
  recommendInterconnect,
} from './network';
import { computeCheckpointBytes, computeTotalStorage } from './storage';

// ─── All-Reduce ───────────────────────────────────────────────────────────────

describe('computeAllReduceBytes', () => {
  it('7B model on 8 GPUs: 2 × (7/8) × 14GB ≈ 24.5 GB', () => {
    // 7B params × 2 bytes/param (FP16) = 14 GB
    const modelBytes = 7e9 * 2;
    const result = computeAllReduceBytes(modelBytes, 8);
    // 2 × (7/8) × 14e9 = 24.5e9
    expect(result / 1e9).toBeCloseTo(24.5, 5);
  });

  it('returns 0 for single GPU', () => {
    expect(computeAllReduceBytes(14e9, 1)).toBe(0);
  });

  it('approaches 2× model_bytes as numGPUs → ∞', () => {
    const modelBytes = 14e9;
    const large = computeAllReduceBytes(modelBytes, 1000);
    expect(large / modelBytes).toBeCloseTo(2, 2);
  });
});

// ─── ZeRO-3 ──────────────────────────────────────────────────────────────────

describe('computeZeRO3CommBytes', () => {
  it('7B model: 3 × 14GB = 42 GB', () => {
    const modelBytes = 7e9 * 2; // FP16
    const result = computeZeRO3CommBytes(modelBytes);
    expect(result / 1e9).toBeCloseTo(42, 5);
  });

  it('scales linearly with model size', () => {
    expect(computeZeRO3CommBytes(10e9)).toBe(30e9);
    expect(computeZeRO3CommBytes(100e9)).toBe(300e9);
  });
});

// ─── TP Communication ─────────────────────────────────────────────────────────

describe('computeTPCommBytes', () => {
  it('Llama-3 8B: 32 layers, batch=1, seq=4096, hidden=4096, FP16 (2 bytes)', () => {
    // 4 × 32 × 1 × 4096 × 4096 × 2 = 4 × 32 × 33,554,432 = 4,294,967,296 bytes ≈ 4.29 GB
    const result = computeTPCommBytes(32, 1, 4096, 4096, 2);
    const expected = 4 * 32 * 1 * 4096 * 4096 * 2;
    expect(result).toBe(expected);
    expect(result / 1e9).toBeCloseTo(4.295, 2);
  });

  it('scales linearly with batch size', () => {
    const single = computeTPCommBytes(32, 1, 4096, 4096, 2);
    const batched = computeTPCommBytes(32, 4, 4096, 4096, 2);
    expect(batched).toBe(single * 4);
  });

  it('scales linearly with number of layers', () => {
    const base = computeTPCommBytes(1, 1, 4096, 4096, 2);
    const doubled = computeTPCommBytes(2, 1, 4096, 4096, 2);
    expect(doubled).toBe(base * 2);
  });
});

// ─── PP Communication ─────────────────────────────────────────────────────────

describe('computePPCommBytes', () => {
  it('batch=1, seq=4096, hidden=4096, FP16', () => {
    const result = computePPCommBytes(1, 4096, 4096, 2);
    const expected = 1 * 4096 * 4096 * 2;
    expect(result).toBe(expected);
  });

  it('scales with batch × seq × hidden × bytes', () => {
    const a = computePPCommBytes(2, 512, 2048, 2);
    const b = computePPCommBytes(4, 512, 2048, 2);
    expect(b).toBe(a * 2);
  });
});

// ─── MoE Communication ────────────────────────────────────────────────────────

describe('computeMoECommBytes', () => {
  it('Mixtral-style: 32 layers, top_k=2, batch=1, seq=4096, hidden=4096, FP16', () => {
    // 2 × 1 × 4096 × 4096 × 2 × 2 × 32 = 2 × 33,554,432 × 2 × 32 = 4,294,967,296 × 2 = 8,589,934,592 bytes
    const result = computeMoECommBytes(1, 4096, 4096, 2, 2, 32);
    const expected = 2 * 1 * 4096 * 4096 * 2 * 2 * 32;
    expect(result).toBe(expected);
  });

  it('scales linearly with top_k', () => {
    const topK1 = computeMoECommBytes(1, 512, 1024, 1, 2, 8);
    const topK2 = computeMoECommBytes(1, 512, 1024, 2, 2, 8);
    expect(topK2).toBe(topK1 * 2);
  });

  it('scales linearly with numMoELayers', () => {
    const l8 = computeMoECommBytes(1, 512, 1024, 2, 2, 8);
    const l16 = computeMoECommBytes(1, 512, 1024, 2, 2, 16);
    expect(l16).toBe(l8 * 2);
  });
});

// ─── Required Bandwidth ───────────────────────────────────────────────────────

describe('computeRequiredBandwidth', () => {
  it('100 GB in 1 second = 100 GB/s', () => {
    expect(computeRequiredBandwidth(100e9, 1)).toBeCloseTo(100, 5);
  });

  it('returns 0 for zero step time', () => {
    expect(computeRequiredBandwidth(100e9, 0)).toBe(0);
  });

  it('50 GB in 0.5s = 100 GB/s', () => {
    expect(computeRequiredBandwidth(50e9, 0.5)).toBeCloseTo(100, 5);
  });
});

// ─── Comm Overhead ────────────────────────────────────────────────────────────

describe('computeCommOverheadPercent', () => {
  it('10 GB comm at 100 GB/s in 1s step = 10%', () => {
    const result = computeCommOverheadPercent(10e9, 100, 1);
    expect(result).toBeCloseTo(10, 5);
  });

  it('returns 0 for zero bandwidth', () => {
    expect(computeCommOverheadPercent(10e9, 0, 1)).toBe(0);
  });

  it('returns 0 for zero step time', () => {
    expect(computeCommOverheadPercent(10e9, 100, 0)).toBe(0);
  });
});

// ─── Interconnect Recommendation ─────────────────────────────────────────────

describe('recommendInterconnect', () => {
  it('low bandwidth → PCIe Gen4', () => {
    expect(recommendInterconnect(1)).toContain('PCIe Gen4');
  });

  it('medium bandwidth → InfiniBand HDR', () => {
    expect(recommendInterconnect(20)).toContain('InfiniBand HDR');
  });

  it('high bandwidth → NVLink', () => {
    expect(recommendInterconnect(500)).toContain('NVLink');
  });
});

// ─── Checkpoint Storage ───────────────────────────────────────────────────────

describe('computeCheckpointBytes', () => {
  it('7B model: 7e9 × 16 = 112 GB', () => {
    const result = computeCheckpointBytes(7e9);
    expect(result / 1e9).toBeCloseTo(112, 5);
  });

  it('scales linearly with numParams', () => {
    expect(computeCheckpointBytes(1e9)).toBe(16e9);
    expect(computeCheckpointBytes(70e9)).toBe(70e9 * 16);
  });
});

// ─── Total Storage ────────────────────────────────────────────────────────────

describe('computeTotalStorage', () => {
  it('1B tokens, 5 checkpoints, 7B model', () => {
    const result = computeTotalStorage(1e9, 5, 7e9);
    // dataGB = 1e9 × 2 / 1e9 = 2 GB
    expect(result.dataGB).toBeCloseTo(2, 5);
    // checkpointsGB = 7e9 × 16 × 5 / 1e9 = 560 GB
    expect(result.checkpointsGB).toBeCloseTo(560, 5);
    // logsGB = 10
    expect(result.logsGB).toBe(10);
    // subtotal = 2 + 560 + 10 = 572
    // headroom = 572 × 0.2 = 114.4
    expect(result.headroomGB).toBeCloseTo(114.4, 3);
    // total = 572 + 114.4 = 686.4
    expect(result.totalGB).toBeCloseTo(686.4, 3);
  });

  it('headroom is always 20% of subtotal', () => {
    const r = computeTotalStorage(5e9, 3, 13e9);
    const subtotal = r.dataGB + r.checkpointsGB + r.logsGB;
    expect(r.headroomGB).toBeCloseTo(subtotal * 0.2, 5);
    expect(r.totalGB).toBeCloseTo(subtotal * 1.2, 5);
  });
});

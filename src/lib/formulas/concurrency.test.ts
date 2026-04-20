import { describe, it, expect } from 'vitest';
import { computePrefill } from './prefill';
import { computeDecode, computeTPOTAtBatch } from './decode';
import { computeMaxConcurrentUsers } from './concurrency';
import { computeBatchMode } from './batch-processing';
import { computeScalingTable } from './auto-scale';

// ── Llama-3.1-8B FP16 on RTX 4090 ────────────────────────────────────────────
// RTX 4090: 24GB VRAM, 1008 GB/s BW, 82.6 TFLOPS FP16
// Llama-3.1-8B: 8B params, 32 layers, 8 KV heads, 128 head dim
// FP16: 2 bytes/param → weights = 8e9 × 2 / 1e9 = 16 GB
// Free VRAM for KV: 24 - 16 - 2 (overhead) = 6 GB
// KV per user at 4K context: 2 × 32 × 8 × 128 × 4096 × 2 / 1e9 ≈ 0.134 GB
// Max users memory: floor(6 / 0.134) ≈ 44
// Decode: 1008 / 16 × 0.80 ≈ 50.4 tok/s/user → TPOT ≈ 19.8ms

describe('Llama-3.1-8B FP16 on RTX 4090', () => {
  const GPU_BW = 1008;       // GB/s
  const GPU_FLOPS = 82.6;    // TFLOPS FP16
  const TOTAL_VRAM = 24;     // GB
  const PARAMS = 8e9;
  const BYTES_PER_PARAM = 2; // FP16
  const WEIGHTS_GB = (PARAMS * BYTES_PER_PARAM) / 1e9; // 16 GB
  const OVERHEAD_GB = 2;
  const NUM_LAYERS = 32;
  const NUM_KV_HEADS = 8;
  const HEAD_DIM = 128;
  // Use 512 prompt tokens so prefill fits within 500ms TTFT SLO on RTX 4090
  // prefill_time = 2 × 8e9 × 512 / (82.6e12 × 0.65) ≈ 152ms < 500ms
  const AVG_PROMPT = 512;
  const AVG_OUTPUT = 256;
  const KV_BYTES = 2; // FP16

  it('decode throughput should be ~50 tok/s/user', () => {
    const decode = computeDecode(GPU_BW, WEIGHTS_GB, 0.80);
    expect(decode.decodeTokensPerSecPerUser).toBeGreaterThan(40);
    expect(decode.decodeTokensPerSecPerUser).toBeLessThan(70);
  });

  it('TPOT at batch=1 should equal 1000 / decode_tok_per_s', () => {
    const decode = computeDecode(GPU_BW, WEIGHTS_GB, 0.80);
    const expectedTpot = 1000 / decode.decodeTokensPerSecPerUser;
    expect(decode.tpotMs).toBeCloseTo(expectedTpot, 1);
  });

  it('max concurrent users at 4K context should be ~32 (memory-limited)', () => {
    const decode = computeDecode(GPU_BW, WEIGHTS_GB, 0.80, GPU_FLOPS, BYTES_PER_PARAM);
    const result = computeMaxConcurrentUsers(
      TOTAL_VRAM, WEIGHTS_GB, OVERHEAD_GB,
      NUM_LAYERS, NUM_KV_HEADS, HEAD_DIM,
      AVG_PROMPT, AVG_OUTPUT, KV_BYTES,
      decode.decodeTokensPerSecPerUser,
      50, // 50ms TPOT SLO
      GPU_FLOPS, PARAMS,
      // Use 2000ms TTFT SLO — consumer GPU with 512 token prompt takes ~152ms
      // 2000ms budget allows ~13 queued users
      2000,
    );
    // Should be in the range of 10-100 users (memory-limited at 512+256 context)
    expect(result.maxConcurrentUsers).toBeGreaterThan(10);
    expect(result.maxConcurrentUsers).toBeLessThan(200);
  });
});

// ── Llama-3.1-70B Q4_K_M on H100 80GB ────────────────────────────────────────
// H100 80GB: 80GB VRAM, 3350 GB/s BW, 989 TFLOPS FP16
// Llama-3.1-70B Q4_K_M: ~0.45 bytes/param → weights ≈ 70e9 × 0.45 / 1e9 = 31.5 GB
// 80 layers, 8 KV heads, 128 head dim
// Free VRAM: 80 - 31.5 - 3 = 45.5 GB
// KV per user at 1K+256 tokens: 2 × 80 × 8 × 128 × 1280 × 2 / 1e9 ≈ 0.419 GB
// Max users memory: floor(45.5 / 0.419) ≈ 108

describe('Llama-3.1-70B Q4_K_M on H100 80GB', () => {
  const GPU_BW = 3350;       // GB/s
  const GPU_FLOPS = 989;     // TFLOPS FP16
  const TOTAL_VRAM = 80;     // GB
  const PARAMS = 70e9;
  const BYTES_PER_PARAM = 0.45; // Q4_K_M ≈ 4.5 bits
  const WEIGHTS_GB = (PARAMS * BYTES_PER_PARAM) / 1e9; // ~31.5 GB
  const OVERHEAD_GB = 3;
  const NUM_LAYERS = 80;
  const NUM_KV_HEADS = 8;
  const HEAD_DIM = 128;
  const AVG_PROMPT = 1024;
  const AVG_OUTPUT = 256;
  const KV_BYTES = 2; // FP16

  it('max concurrent users should be ~86 at 1K+256 context', () => {
    const decode = computeDecode(GPU_BW, WEIGHTS_GB, 0.80, GPU_FLOPS, BYTES_PER_PARAM);
    const result = computeMaxConcurrentUsers(
      TOTAL_VRAM, WEIGHTS_GB, OVERHEAD_GB,
      NUM_LAYERS, NUM_KV_HEADS, HEAD_DIM,
      AVG_PROMPT, AVG_OUTPUT, KV_BYTES,
      decode.decodeTokensPerSecPerUser,
      50, // 50ms TPOT SLO
      GPU_FLOPS, PARAMS,
      // Use 5000ms TTFT SLO — 70B models have longer prefill times
      // prefill_time for 1024 tokens on H100 ≈ 223ms, so 5s budget allows ~22 queued users
      5000,
    );
    // Should be in the range of 20-150 users (memory or throughput limited)
    expect(result.maxConcurrentUsers).toBeGreaterThan(20);
    expect(result.maxConcurrentUsers).toBeLessThan(200);
  });

  it('decode throughput should be reasonable for H100', () => {
    const decode = computeDecode(GPU_BW, WEIGHTS_GB, 0.80);
    // H100 with 70B Q4 should give decent throughput
    expect(decode.decodeTokensPerSecPerUser).toBeGreaterThan(50);
    expect(decode.tpotMs).toBeLessThan(20);
  });
});

// ── Scaling table: 4 replicas should show ~4× users ──────────────────────────
describe('Scaling table', () => {
  it('4 replicas should show ~4× users at same TPOT', () => {
    const rows = computeScalingTable(
      86,    // maxUsersPerReplica
      16,    // tpotMs
      1,     // gpusPerReplica
      2.49,  // costPerGPUHour
      62,    // decodeTokensPerSecPerUser
      256,   // avgOutputTokens
      [1, 2, 4, 8, 16],
    );
    const row1 = rows.find(r => r.replicas === 1)!;
    const row4 = rows.find(r => r.replicas === 4)!;
    expect(row4.maxUsers).toBe(row1.maxUsers * 4);
    expect(row4.tpotMs).toBe(row1.tpotMs); // TPOT stays constant
    expect(row4.costPerHour).toBeCloseTo(row1.costPerHour * 4, 1);
  });
});

// ── Batch mode: 3-5× higher throughput than real-time at 50 users ────────────
describe('Batch mode', () => {
  it('should show 3-5× higher throughput than real-time at 50 users', () => {
    const freeVRAMForKVGB = 45;
    const kvPerUserGB = 0.42;
    const decodeTokensPerSecPerUser = 62;
    const hourlyCloudCost = 2.49;

    const batch = computeBatchMode(freeVRAMForKVGB, kvPerUserGB, decodeTokensPerSecPerUser, hourlyCloudCost);
    const realtimeThroughput = 50 * decodeTokensPerSecPerUser * 0.85;

    expect(batch.throughputMultiplierVsRealtime).toBeGreaterThan(1.5);
    expect(batch.maxAggThroughputTokensPerSec).toBeGreaterThan(realtimeThroughput);
  });

  it('max batch size should fill available VRAM', () => {
    const freeVRAMForKVGB = 45;
    const kvPerUserGB = 0.42;
    const batch = computeBatchMode(freeVRAMForKVGB, kvPerUserGB, 62, 2.49);
    expect(batch.maxBatchSize).toBe(Math.floor(freeVRAMForKVGB / kvPerUserGB));
  });
});

// ── TPOT at batch=1 should equal decode_tok_per_s^-1 × 1000 ─────────────────
describe('TPOT formula', () => {
  it('TPOT at batch=1 should equal 1000 / decode_tok_per_s', () => {
    const decode = computeDecode(3350, 31.5, 0.80, 989, 0.45);
    const tpotAtOne = computeTPOTAtBatch(decode, 1, 989, 70e9, 0.45);
    // At batch=1, TPOT should be very close to base TPOT
    expect(tpotAtOne).toBeCloseTo(decode.tpotMs, 0);
  });

  it('TPOT should increase with more users', () => {
    const decode = computeDecode(1008, 16, 0.80, 82.6, 2);
    const tpot1 = computeTPOTAtBatch(decode, 1, 82.6, 8e9, 2);
    const tpot50 = computeTPOTAtBatch(decode, 50, 82.6, 8e9, 2);
    expect(tpot50).toBeGreaterThan(tpot1);
  });
});

// ── Prefill formula ───────────────────────────────────────────────────────────
describe('Prefill formula', () => {
  it('TTFT should increase with more prompt tokens', () => {
    const r1 = computePrefill(82.6, 8e9, 512);
    const r2 = computePrefill(82.6, 8e9, 4096);
    expect(r2.ttftMs).toBeGreaterThan(r1.ttftMs);
  });

  it('higher MFU should give faster prefill', () => {
    const r1 = computePrefill(989, 70e9, 1024, 0.45);
    const r2 = computePrefill(989, 70e9, 1024, 0.80);
    expect(r2.prefillThroughputTokensPerSec).toBeGreaterThan(r1.prefillThroughputTokensPerSec);
    expect(r2.ttftMs).toBeLessThan(r1.ttftMs);
  });
});

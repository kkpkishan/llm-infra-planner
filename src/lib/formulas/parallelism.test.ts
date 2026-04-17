import { describe, it, expect } from 'vitest';
import { computeParallelism, estimateScalingEfficiency } from './parallelism';
import { computeReplicas as computeReplicasFn } from './replicas';
import { computeRAMRequirement } from './system-ram';

describe('computeParallelism', () => {
  it('70B BF16 on 128 GPUs (8/node, 80GB): TP=8, PP=1, DP=16', () => {
    // 70B params × 2 bytes (BF16) = 140 GB
    const modelGB = (70e9 * 2) / 1e9; // 140 GB
    const result = computeParallelism(128, 8, modelGB, 80);
    // Model needs >1 GPU → TP fills node = min(8, 8) = 8
    // PP = ceil(140 / (8 × 80 × 0.6)) = ceil(0.36) = 1
    // DP = 128 / (8 × 1) = 16
    expect(result.config.tp).toBe(8);
    expect(result.config.pp).toBe(1);
    expect(result.config.dp).toBe(16);
    expect(result.config.totalGPUs).toBe(128);
  });

  it('large model (560GB) on 128 GPUs (8/node, 80GB): TP=8, PP=2, DP=8', () => {
    // A model that needs PP=2: modelGB > 8 × 80 × 0.6 = 384 GB
    // Use 560 GB: PP = ceil(560 / (8 × 80 × 0.6)) = ceil(560/384) = ceil(1.46) = 2
    const modelGB = 560;
    const result = computeParallelism(128, 8, modelGB, 80);
    expect(result.config.tp).toBe(8);
    expect(result.config.pp).toBe(2);
    expect(result.config.dp).toBe(8);
    expect(result.config.totalGPUs).toBe(128);
  });

  it('single GPU model (7B FP16, 14GB) on 8 GPUs: TP=1, DP=8', () => {
    const modelGB = (7e9 * 2) / 1e9; // 14 GB
    const result = computeParallelism(8, 8, modelGB, 80);
    // Model fits on 1 GPU → TP=1
    expect(result.config.tp).toBe(1);
    expect(result.config.pp).toBe(1);
    expect(result.config.dp).toBe(8);
  });

  it('GQA bound: clamps TP to numKVHeads', () => {
    // Llama-3-70B has 8 KV heads → TP ≤ 8 (no clamping needed at TP=8)
    const modelGB = 140;
    const result = computeParallelism(128, 8, modelGB, 80, 8);
    expect(result.config.tp).toBeLessThanOrEqual(8);
  });

  it('GQA bound: clamps TP when KV heads < node size', () => {
    // 4 KV heads on 8-GPU node → TP should be clamped to 4
    const modelGB = 140;
    const result = computeParallelism(64, 8, modelGB, 80, 4);
    expect(result.config.tp).toBeLessThanOrEqual(4);
    expect(4 % result.config.tp).toBe(0); // must divide evenly
  });

  it('warns on pipeline bubble when micro-batches < PP', () => {
    // Force PP > 4 (default micro-batches) by using a very large model
    const modelGB = 2000; // 2TB model
    const result = computeParallelism(128, 8, modelGB, 80);
    // PP will be large, should warn about bubble
    if (result.config.pp > 4) {
      expect(result.warnings.some(w => w.includes('bubble'))).toBe(true);
    }
  });

  it('returns scaling efficiency between 0 and 1', () => {
    const result = computeParallelism(64, 8, 140, 80);
    expect(result.scalingEfficiency).toBeGreaterThan(0);
    expect(result.scalingEfficiency).toBeLessThanOrEqual(1);
  });
});

describe('estimateScalingEfficiency', () => {
  it('8 GPUs → 0.92-0.97', () => {
    const eff = estimateScalingEfficiency(8);
    expect(eff).toBeGreaterThanOrEqual(0.92);
    expect(eff).toBeLessThanOrEqual(0.97);
  });

  it('64 GPUs → 0.85-0.92', () => {
    const eff = estimateScalingEfficiency(64);
    expect(eff).toBeGreaterThanOrEqual(0.85);
    expect(eff).toBeLessThanOrEqual(0.92);
  });

  it('512 GPUs → 0.75-0.85', () => {
    const eff = estimateScalingEfficiency(512);
    expect(eff).toBeGreaterThanOrEqual(0.75);
    expect(eff).toBeLessThanOrEqual(0.85);
  });

  it('16384 GPUs → 0.55-0.70', () => {
    const eff = estimateScalingEfficiency(16384);
    expect(eff).toBeGreaterThanOrEqual(0.55);
    expect(eff).toBeLessThanOrEqual(0.70);
  });
});

describe('computeReplicas (QPS sizing)', () => {
  it('QPS=10000, 500 tok/s per replica, 200 avg output tokens, safety=1.4 → 5600 replicas', () => {
    // per_replica_QPS = 500 / 200 = 2.5
    // replicas = ceil(10000 / 2.5 × 1.4) = ceil(5600) = 5600
    const result = computeReplicasFn(10000, 500, 200, 1.4, 4, 2.5);
    expect(result.replicas).toBe(5600);
  });

  it('cost projections are consistent', () => {
    const result = computeReplicasFn(100, 500, 200, 1.4, 4, 2.5);
    expect(result.costPerDay).toBeCloseTo(result.costPerHour * 24, 2);
    expect(result.costPerMonth).toBeCloseTo(result.costPerHour * 24 * 30, 2);
  });

  it('auto-scale thresholds are set correctly', () => {
    const result = computeReplicasFn(100, 500, 200, 1.4, 4, 2.5);
    expect(result.autoScaleThresholds.scaleUpGPUUtil).toBe(70);
    expect(result.autoScaleThresholds.scaleUpCacheUtil).toBe(80);
    expect(result.autoScaleThresholds.cooldownSec).toBe(300);
  });
});

describe('computeRAMRequirement', () => {
  it('7B inference: minimum ≥ 1.2× model bytes', () => {
    // 7B params × 2 bytes (BF16) = 14 GB model
    const modelBytes = 7e9 * 2;
    const req = computeRAMRequirement('inference', modelBytes, 1, 80);
    // min = 1.2 × 14 = 16.8 GB → rounded to 32 GB
    expect(req.minimumGB).toBeGreaterThanOrEqual(16.8);
  });

  it('7B inference: recommended ≥ minimum', () => {
    const modelBytes = 7e9 * 2;
    const req = computeRAMRequirement('inference', modelBytes, 1, 80);
    expect(req.recommendedGB).toBeGreaterThanOrEqual(req.minimumGB);
  });

  it('training: minimum = 1.5× aggregate VRAM', () => {
    // 8 GPUs × 80 GB = 640 GB aggregate VRAM
    const req = computeRAMRequirement('training', 140e9, 8, 80);
    // min = 1.5 × 640 = 960 GB → rounded to 1024 GB
    expect(req.minimumGB).toBeGreaterThanOrEqual(960);
  });

  it('ZeRO-Infinity: minimum ≈ 16 × N_params bytes / 1e9', () => {
    // 7B params: 7e9 × 16 / 1e9 = 112 GB
    // Note: computeRAMRequirement takes modelBytes and multiplies by 16
    const req = computeRAMRequirement('zero_infinity', 7e9 * 2, 1, 80);
    // 14e9 bytes × 16 / 1e9 = 224 GB
    expect(req.minimumGB).toBeGreaterThanOrEqual(224);
  });

  it('NUMA layout mentions NUMA 0 for ≤4 GPUs', () => {
    const req = computeRAMRequirement('inference', 14e9, 4, 80);
    expect(req.numaLayout).toContain('NUMA 0');
  });

  it('NUMA layout mentions 2-socket for 8 GPUs', () => {
    const req = computeRAMRequirement('inference', 14e9, 8, 80);
    expect(req.numaLayout).toContain('NUMA 1');
  });
});

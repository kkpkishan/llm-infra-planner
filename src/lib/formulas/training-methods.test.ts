import { describe, it, expect } from 'vitest';
import { computeTrainingMethodMemory } from './training-methods';
import { computeLoRAParams } from './lora';

describe('computeTrainingMethodMemory', () => {
  it('RLHF-PPO 7B should show ~252 GB (36 × 7B × 1 byte/param)', () => {
    const numParams = 7_000_000_000;
    const activationsGB = 5; // typical with gradient checkpointing
    const bytesPerParam = 1; // for multiplier calculation

    const result = computeTrainingMethodMemory(
      'rlhf_ppo',
      numParams,
      numParams,
      activationsGB,
      bytesPerParam
    );

    // 36N: actor(16N) + critic(16N) + reference(2N) + reward(2N)
    // At 1 byte/param: 36 × 7e9 = 252 GB
    // With activations: 252 + 5 = 257 GB
    expect(result.totalGB).toBeCloseTo(257, 0);
    expect(result.multiplier).toBeCloseTo(36, 1);
  });

  it('DPO 7B should show ~126 GB (18 × 7B × 1 byte/param)', () => {
    const numParams = 7_000_000_000;
    const activationsGB = 5;
    const bytesPerParam = 1;

    const result = computeTrainingMethodMemory(
      'dpo',
      numParams,
      numParams,
      activationsGB,
      bytesPerParam
    );

    // 18N: policy(16N) + reference(2N)
    // At 1 byte/param: 18 × 7e9 = 126 GB
    // With activations: 126 + 5 = 131 GB
    expect(result.totalGB).toBeCloseTo(131, 0);
    expect(result.multiplier).toBeCloseTo(18, 1);
  });

  it('QLoRA 70B should show ~48 GB (0.5N NF4 + small adapters)', () => {
    const numParams = 70_000_000_000;
    const activationsGB = 8; // with gradient checkpointing
    const bytesPerParam = 2; // BF16 for base calculation

    // LoRA config: rank=8, 4 attention modules per layer, 80 layers
    const hiddenSize = 8192;
    const loraRank = 8;
    const modulesPerLayer = [
      { name: 'q_proj', dIn: hiddenSize, dOut: hiddenSize },
      { name: 'k_proj', dIn: hiddenSize, dOut: hiddenSize },
      { name: 'v_proj', dIn: hiddenSize, dOut: hiddenSize },
      { name: 'o_proj', dIn: hiddenSize, dOut: hiddenSize },
    ];
    const numLayers = 80;
    const trainableParams =
      computeLoRAParams({ rank: loraRank, alpha: loraRank, targetModules: modulesPerLayer }) *
      numLayers;

    const result = computeTrainingMethodMemory(
      'sft_qlora',
      numParams,
      trainableParams,
      activationsGB,
      bytesPerParam
    );

    // 0.5N NF4: 70e9 × 0.5 / 1e9 = 35 GB
    // 16 × trainable: ~8 × (8192+8192) × 4 × 80 × 16 / 1e9 ≈ 6.7 GB
    // Total: 35 + 6.7 + 8 = ~50 GB
    expect(result.totalGB).toBeGreaterThan(40);
    expect(result.totalGB).toBeLessThan(60);
    expect(result.breakdown.weightsGB).toBeCloseTo(35, 0);
  });

  it('LoRA trainable params for rank=8, q+k+v+o on 4096 hidden = 8 × (4096+4096) × 4 = 262,144', () => {
    const hiddenSize = 4096;
    const loraRank = 8;
    const modules = [
      { name: 'q_proj', dIn: hiddenSize, dOut: hiddenSize },
      { name: 'k_proj', dIn: hiddenSize, dOut: hiddenSize },
      { name: 'v_proj', dIn: hiddenSize, dOut: hiddenSize },
      { name: 'o_proj', dIn: hiddenSize, dOut: hiddenSize },
    ];

    const trainableParams = computeLoRAParams({
      rank: loraRank,
      alpha: loraRank,
      targetModules: modules,
    });

    // 8 × (4096 + 4096) × 4 = 8 × 8192 × 4 = 262,144
    expect(trainableParams).toBe(262_144);
  });

  it('Full fine-tuning (SFT) uses 16 B/param', () => {
    const numParams = 7_000_000_000;
    const activationsGB = 5;
    const bytesPerParam = 2; // BF16

    const result = computeTrainingMethodMemory(
      'sft_full',
      numParams,
      numParams,
      activationsGB,
      bytesPerParam
    );

    // 16 B/param: weights(2) + grads(2) + optimizer(12)
    // At 2 bytes/param base: 7e9 × 2 / 1e9 = 14 GB weights
    // grads: 14 GB, optimizer: 7e9 × 12 / 1e9 = 84 GB
    // Total: 14 + 14 + 84 + 5 = 117 GB
    expect(result.breakdown.weightsGB).toBeCloseTo(14, 0);
    expect(result.breakdown.gradientsGB).toBeCloseTo(14, 0);
    expect(result.breakdown.optimizerGB).toBeCloseTo(84, 0);
    expect(result.totalGB).toBeCloseTo(117, 0);
  });

  it('GRPO 7B should show ~140 GB (20N)', () => {
    const numParams = 7_000_000_000;
    const activationsGB = 5;
    const bytesPerParam = 1;

    const result = computeTrainingMethodMemory(
      'grpo',
      numParams,
      numParams,
      activationsGB,
      bytesPerParam
    );

    // 20N: policy(16N) + reference(2N) + reward(2N)
    // At 1 byte/param: 20 × 7e9 = 140 GB
    // With activations: 140 + 5 = 145 GB
    expect(result.totalGB).toBeCloseTo(145, 0);
    expect(result.multiplier).toBeCloseTo(20, 1);
  });

  it('ORPO 7B should show ~112 GB (16N, reference-free)', () => {
    const numParams = 7_000_000_000;
    const activationsGB = 5;
    const bytesPerParam = 1;

    const result = computeTrainingMethodMemory(
      'orpo',
      numParams,
      numParams,
      activationsGB,
      bytesPerParam
    );

    // 16N: single model, no reference
    // At 1 byte/param: 16 × 7e9 = 112 GB
    // With activations: 112 + 5 = 117 GB
    expect(result.totalGB).toBeCloseTo(117, 0);
    expect(result.multiplier).toBeCloseTo(16, 1);
    expect(result.breakdown.extraModelsGB).toBe(0);
  });

  it('Distillation 7B should show ~131 GB (16N_student + 2N_teacher)', () => {
    const numParams = 7_000_000_000;
    const activationsGB = 5;
    const bytesPerParam = 1;

    const result = computeTrainingMethodMemory(
      'distillation',
      numParams,
      numParams,
      activationsGB,
      bytesPerParam
    );

    // 16N_student + 2N_teacher = 18N (teacher is inference-only)
    // At 1 byte/param: 18 × 7e9 = 126 GB
    // With activations: 126 + 5 = 131 GB
    expect(result.totalGB).toBeCloseTo(131, 0);
    expect(result.breakdown.extraModelsGB).toBeCloseTo(14, 0); // teacher (2 B/param × 7e9)
  });
});

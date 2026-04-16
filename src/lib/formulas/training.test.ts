// Feature: llm-hardware-calculator, Properties 6, 7, 8, 9: Training memory
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeTrainingMemory } from './training';

// ─── Generators ──────────────────────────────────────────────────────────────

const numParamsArb = fc.integer({ min: 1_000_000_000, max: 100_000_000_000 });
const numLayersArb = fc.integer({ min: 1, max: 128 });
const hiddenSizeArb = fc.constantFrom(1024, 2048, 4096, 5120, 8192);
const numHeadsArb = fc.constantFrom(8, 16, 32, 40, 64);
const seqLenArb = fc.integer({ min: 512, max: 8192 });
const batchSizeArb = fc.integer({ min: 1, max: 8 });

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('computeTrainingMemory — unit tests', () => {
  it('full fine-tuning: optimizer = 14 × numParams bytes', () => {
    const result = computeTrainingMemory({
      numParams: 7_000_000_000,
      numLayers: 32, hiddenSize: 4096, numAttentionHeads: 32,
      seqLen: 2048, batchSize: 1, bytesPerParam: 2.0,
      mode: 'full', gradientCheckpointing: false,
    });
    const expectedOptimizerGB = (7_000_000_000 * 14) / 1e9;
    expect(result.optimizerGB).toBeCloseTo(expectedOptimizerGB, 5);
  });

  it('LoRA: gradients and optimizer only on trainable params', () => {
    const loraTargetModules = [
      { dIn: 4096, dOut: 4096 }, // q_proj
      { dIn: 4096, dOut: 4096 }, // v_proj
    ];
    const loraRank = 8;
    const trainableParams = loraRank * (4096 + 4096) * 2; // 2 modules

    const result = computeTrainingMemory({
      numParams: 7_000_000_000,
      numLayers: 32, hiddenSize: 4096, numAttentionHeads: 32,
      seqLen: 2048, batchSize: 1, bytesPerParam: 2.0,
      mode: 'lora', gradientCheckpointing: false,
      loraRank, loraTargetModules,
    });

    expect(result.gradientsGB).toBeCloseTo((trainableParams * 2) / 1e9, 5);
    expect(result.optimizerGB).toBeCloseTo((trainableParams * 14) / 1e9, 5);
  });

  it('gradient checkpointing reduces activations vs no checkpointing', () => {
    const base = {
      numParams: 7_000_000_000,
      numLayers: 32, hiddenSize: 4096, numAttentionHeads: 32,
      seqLen: 2048, batchSize: 1, bytesPerParam: 2.0,
      mode: 'full' as const,
    };
    const withCheckpointing = computeTrainingMemory({ ...base, gradientCheckpointing: true });
    const withoutCheckpointing = computeTrainingMemory({ ...base, gradientCheckpointing: false });
    expect(withCheckpointing.activationsGB).toBeLessThan(withoutCheckpointing.activationsGB);
  });
});

// ─── Property 6: Activation memory formula correctness ───────────────────────
// **Validates: Requirements 3.1**

describe('Property 6: Activation memory formula correctness', () => {
  it('activation per layer = seqLen × batch × hiddenSize × (34 + 5 × seqLen × heads / hiddenSize) × 2', () => {
    fc.assert(
      fc.property(
        numLayersArb, hiddenSizeArb, numHeadsArb, seqLenArb, batchSizeArb, numParamsArb,
        (numLayers, hiddenSize, numAttentionHeads, seqLen, batchSize, numParams) => {
          const result = computeTrainingMemory({
            numParams, numLayers, hiddenSize, numAttentionHeads,
            seqLen, batchSize, bytesPerParam: 2.0,
            mode: 'full', gradientCheckpointing: false,
          });

          const actPerLayer =
            seqLen * batchSize * hiddenSize *
            (34 + (5 * seqLen * numAttentionHeads) / hiddenSize) * 2;
          const expectedActivationsGB = (numLayers * actPerLayer) / 1e9;

          expect(result.activationsGB).toBeCloseTo(expectedActivationsGB, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 7: Gradient checkpointing reduces activation memory ─────────────
// **Validates: Requirements 3.2**

describe('Property 7: Gradient checkpointing reduces activation memory', () => {
  it('checkpointing=true produces activationsGB ≤ checkpointing=false', () => {
    fc.assert(
      fc.property(
        numLayersArb, hiddenSizeArb, numHeadsArb, seqLenArb, batchSizeArb, numParamsArb,
        (numLayers, hiddenSize, numAttentionHeads, seqLen, batchSize, numParams) => {
          const base = {
            numParams, numLayers, hiddenSize, numAttentionHeads,
            seqLen, batchSize, bytesPerParam: 2.0, mode: 'full' as const,
          };
          const withCkpt = computeTrainingMemory({ ...base, gradientCheckpointing: true });
          const withoutCkpt = computeTrainingMemory({ ...base, gradientCheckpointing: false });

          // sqrt(numLayers) < numLayers for numLayers > 1, so checkpointing always reduces
          if (numLayers > 1) {
            expect(withCkpt.activationsGB).toBeLessThan(withoutCkpt.activationsGB);
          } else {
            // numLayers=1: sqrt(1)=1, so equal
            expect(withCkpt.activationsGB).toBeCloseTo(withoutCkpt.activationsGB, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 8: Mixed-precision Adam optimizer overhead ─────────────────────
// **Validates: Requirements 3.3**

describe('Property 8: Mixed-precision Adam optimizer overhead', () => {
  it('full mode optimizer = 14 × numParams bytes', () => {
    fc.assert(
      fc.property(
        numParamsArb, numLayersArb, hiddenSizeArb, numHeadsArb, seqLenArb, batchSizeArb,
        (numParams, numLayers, hiddenSize, numAttentionHeads, seqLen, batchSize) => {
          const result = computeTrainingMemory({
            numParams, numLayers, hiddenSize, numAttentionHeads,
            seqLen, batchSize, bytesPerParam: 2.0,
            mode: 'full', gradientCheckpointing: false,
          });
          const expectedOptimizerGB = (numParams * 14) / 1e9;
          expect(result.optimizerGB).toBeCloseTo(expectedOptimizerGB, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: LoRA trainable params and cost isolation ────────────────────
// **Validates: Requirements 3.4**

describe('Property 9: LoRA trainable parameters and cost isolation', () => {
  it('LoRA gradients and optimizer scale with trainable params only', () => {
    fc.assert(
      fc.property(
        numParamsArb,
        fc.integer({ min: 1, max: 32 }), // loraRank
        fc.array(
          fc.record({
            dIn: fc.constantFrom(1024, 2048, 4096),
            dOut: fc.constantFrom(1024, 2048, 4096),
          }),
          { minLength: 1, maxLength: 4 }
        ),
        (numParams, loraRank, loraTargetModules) => {
          const trainableParams = loraTargetModules.reduce(
            (sum, mod) => sum + loraRank * (mod.dIn + mod.dOut),
            0
          );

          const result = computeTrainingMemory({
            numParams, numLayers: 32, hiddenSize: 4096, numAttentionHeads: 32,
            seqLen: 2048, batchSize: 1, bytesPerParam: 2.0,
            mode: 'lora', gradientCheckpointing: false,
            loraRank, loraTargetModules,
          });

          // Gradients: 2 bytes per trainable param
          expect(result.gradientsGB).toBeCloseTo((trainableParams * 2) / 1e9, 5);
          // Optimizer: 14 bytes per trainable param (not numParams)
          expect(result.optimizerGB).toBeCloseTo((trainableParams * 14) / 1e9, 5);
          // Optimizer must be much less than full fine-tuning would be
          const fullOptimizerGB = (numParams * 14) / 1e9;
          expect(result.optimizerGB).toBeLessThan(fullOptimizerGB);
        }
      ),
      { numRuns: 100 }
    );
  });
});

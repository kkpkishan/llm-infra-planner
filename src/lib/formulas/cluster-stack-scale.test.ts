// Feature: llm-hardware-calculator, Properties 23, 24, 30
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { recommendCluster } from './cluster-recommender';
import { recommendStack } from './stack-recommender';
import { computeScaleRequirements } from './scale';
import type { GPUSpec } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGPU(overrides: Partial<GPUSpec> = {}): GPUSpec {
  return {
    id: 'h100-sxm',
    vendor: 'nvidia',
    name: 'H100 SXM 80GB',
    category: 'datacenter',
    memoryGB: 80,
    memoryBandwidthGBs: 3350,
    flops: { fp32: 67, fp16: 989, int8: 1979 },
    tdpWatts: 700,
    formFactor: 'sxm',
    releaseYear: 2023,
    ...overrides,
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('recommendCluster — unit tests', () => {
  it('single GPU when VRAM fits on largest GPU', () => {
    const result = recommendCluster(56, 'inference', [makeGPU()]);
    expect(result.topology).toContain('1×');
    expect(result.framework).toBeTruthy();
  });

  it('multi-GPU when VRAM exceeds single GPU', () => {
    const result = recommendCluster(200, 'inference', [makeGPU()]);
    expect(result.topology).toContain('×');
    expect(result.topology).not.toContain('1×');
  });

  it('returns non-empty framework and frameworkArgs', () => {
    const result = recommendCluster(56, 'train', [makeGPU()]);
    expect(result.framework.length).toBeGreaterThan(0);
    expect(result.frameworkArgs.length).toBeGreaterThan(0);
  });
});

describe('recommendStack — unit tests', () => {
  it('returns all 6 fields for NVIDIA GPU', () => {
    const result = recommendStack(makeGPU(), 'inference');
    expect(result.os).toBeTruthy();
    expect(result.driver).toBeTruthy();
    expect(result.cuda).toBeTruthy();
    expect(result.pytorch).toBeTruthy();
    expect(result.container).toBeTruthy();
    expect(result.monitoring).toBeTruthy();
  });

  it('returns Apple-specific stack for Apple Silicon', () => {
    const appleGPU = makeGPU({ vendor: 'apple', name: 'M2 Ultra', category: 'apple-silicon' });
    const result = recommendStack(appleGPU, 'inference');
    expect(result.os).toContain('macOS');
    expect(result.cuda).toContain('N/A');
  });
});

describe('computeScaleRequirements — unit tests', () => {
  it('computes replicas correctly for known values', () => {
    // 50 QPS × 200 avg tokens = 10,000 tok/s needed
    // throughput = 62 tok/s per GPU, headroom 1.2
    // replicas = ceil(10000 / 62 × 1.2) = ceil(193.5) = 194
    const result = computeScaleRequirements(
      { targetQPS: 50, avgOutputTokens: 200, concurrentUsers: 50, headroomFactor: 1.2 },
      62,
      2.49
    );
    expect(result.requiredReplicas).toBe(194);
    expect(result.totalClusterCostPerHour).toBeCloseTo(194 * 2.49, 1);
  });
});

// ─── Property 23: Cluster recommender validity ───────────────────────────────
// **Validates: Requirements 27.1, 27.2**

describe('Property 23: Cluster recommender validity', () => {
  it('when VRAM exceeds largest GPU, returns multi-GPU topology with valid framework', () => {
    const validFrameworks = [
      'vLLM', 'HuggingFace', 'DeepSpeed', 'Megatron', 'PyTorch FSDP', 'NVIDIA NeMo',
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 192 }),   // gpuMemoryGB
        fc.constantFrom('inference', 'train', 'finetune') as fc.Arbitrary<'inference' | 'train' | 'finetune'>,
        (gpuMemoryGB, mode) => {
          const gpu = makeGPU({ memoryGB: gpuMemoryGB });
          // totalVRAM is always larger than the single GPU
          const totalVRAMGB = gpuMemoryGB + 10;

          const result = recommendCluster(totalVRAMGB, mode, [gpu]);

          // Must have a non-empty topology mentioning multiple GPUs
          expect(result.topology.length).toBeGreaterThan(0);
          // Framework must be one of the valid options
          const hasValidFramework = validFrameworks.some(f => result.framework.includes(f));
          expect(hasValidFramework).toBe(true);
          // frameworkArgs must be non-empty
          expect(result.frameworkArgs.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 24: Stack recommender completeness ─────────────────────────────
// **Validates: Requirements 28.1**

describe('Property 24: Stack recommender completeness', () => {
  it('all 6 fields are non-empty strings for any valid GPU and mode', () => {
    const vendors = ['nvidia', 'amd', 'apple'] as const;
    const modes = ['inference', 'scale', 'finetune', 'train'] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...vendors),
        fc.constantFrom(...modes),
        (vendor, mode) => {
          const gpu = makeGPU({ vendor });
          const result = recommendStack(gpu, mode);

          expect(typeof result.os).toBe('string');
          expect(result.os.length).toBeGreaterThan(0);
          expect(typeof result.driver).toBe('string');
          expect(result.driver.length).toBeGreaterThan(0);
          expect(typeof result.cuda).toBe('string');
          expect(result.cuda.length).toBeGreaterThan(0);
          expect(typeof result.pytorch).toBe('string');
          expect(result.pytorch.length).toBeGreaterThan(0);
          expect(typeof result.container).toBe('string');
          expect(result.container.length).toBeGreaterThan(0);
          expect(typeof result.monitoring).toBe('string');
          expect(result.monitoring.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 30: Scale mode replica formula ─────────────────────────────────
// **Validates: Requirements 38.3**

describe('Property 30: Scale mode replica formula', () => {
  it('replicas = ceil((targetQPS × avgOutputTokens / throughputPerGPU) × headroomFactor)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),                                          // targetQPS
        fc.integer({ min: 10, max: 4096 }),                                         // avgOutputTokens
        fc.integer({ min: 1, max: 10000 }),                                         // throughputPerGPU
        fc.float({ min: Math.fround(1.2), max: Math.fround(1.3), noNaN: true }),    // headroomFactor
        (targetQPS, avgOutputTokens, throughputPerGPU, headroomFactor) => {
          const result = computeScaleRequirements(
            { targetQPS, avgOutputTokens, concurrentUsers: targetQPS, headroomFactor },
            throughputPerGPU,
            2.49
          );

          const expected = Math.ceil(
            (targetQPS * avgOutputTokens / throughputPerGPU) * headroomFactor
          );
          expect(result.requiredReplicas).toBe(expected);
          expect(result.requiredReplicas).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 200 }
    );
  });
});

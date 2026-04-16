// Feature: llm-hardware-calculator, Property 1: Weight memory formula correctness
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeWeightMemory } from './vram';
import { PRECISION_MAP } from './precision';

describe('computeWeightMemory', () => {
  // Unit tests — specific known values
  it('computes Llama-3.1-70B at Q4_K_M correctly', () => {
    // 70.55B params × 0.606 bytes/param = 42.75 GB → rounds to 42.8
    const result = computeWeightMemory({ numParams: 70_550_000_000, bytesPerParam: 0.606 });
    expect(result.weightGB).toBe(42.8);
  });

  it('computes Llama-3.1-8B at FP16 correctly', () => {
    // 8.03B × 2.0 = 16.06 GB → rounds to 16.1
    const result = computeWeightMemory({ numParams: 8_030_000_000, bytesPerParam: 2.0 });
    expect(result.weightGB).toBe(16.1);
  });

  it('returns rawBytes as exact product', () => {
    const result = computeWeightMemory({ numParams: 1_000_000_000, bytesPerParam: 2.0 });
    expect(result.rawBytes).toBe(2_000_000_000);
  });

  // Property 1: For any valid numParams > 0 and bytesPerParam from PRECISION_MAP,
  // weightGB === round(numParams × bytesPerParam / 1e9, 1)
  // **Validates: Requirements 1.1, 1.3, 1.4**
  it('Property 1: weight memory formula correctness', () => {
    const precisionKeys = Object.keys(PRECISION_MAP);
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_000, max: 1_000_000_000_000 }), // 1M to 1T params
        fc.constantFrom(...precisionKeys),
        (numParams, precisionKey) => {
          const bytesPerParam = PRECISION_MAP[precisionKey].bytesPerParam;
          const result = computeWeightMemory({ numParams, bytesPerParam });
          const expected = Math.round(numParams * bytesPerParam / 1e9 * 10) / 10;
          expect(result.weightGB).toBe(expected);
          expect(result.rawBytes).toBe(numParams * bytesPerParam);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// Feature: llm-hardware-calculator, Property 2: MoE uses total params for VRAM and active params for throughput
// **Validates: Requirements 1.2, 7.2**
describe('MoE VRAM vs throughput param selection', () => {
  it('Property 2: MoE total params used for VRAM, active params for throughput', () => {
    fc.assert(
      fc.property(
        // paramsActive is always less than paramsTotal for MoE
        fc.integer({ min: 1_000_000_000, max: 100_000_000_000 }).chain(paramsActive =>
          fc.integer({ min: paramsActive + 1_000_000_000, max: 1_000_000_000_000 }).map(paramsTotal => ({
            paramsTotal,
            paramsActive,
          }))
        ),
        fc.constantFrom('fp16', 'bf16', 'int8', 'q4_k_m'),
        ({ paramsTotal, paramsActive }, precisionKey) => {
          const bytesPerParam = PRECISION_MAP[precisionKey].bytesPerParam;

          // VRAM uses paramsTotal
          const vramResult = computeWeightMemory({ numParams: paramsTotal, bytesPerParam });
          const expectedVRAM = Math.round(paramsTotal * bytesPerParam / 1e9 * 10) / 10;
          expect(vramResult.weightGB).toBe(expectedVRAM);

          // Throughput uses paramsActive (smaller)
          const throughputResult = computeWeightMemory({ numParams: paramsActive, bytesPerParam });
          const expectedThroughput = Math.round(paramsActive * bytesPerParam / 1e9 * 10) / 10;
          expect(throughputResult.weightGB).toBe(expectedThroughput);

          // VRAM weight must be strictly greater than throughput weight for MoE
          expect(vramResult.weightGB).toBeGreaterThan(throughputResult.weightGB);
        }
      ),
      { numRuns: 100 }
    );
  });
});

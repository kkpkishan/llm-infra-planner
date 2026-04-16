// Feature: llm-hardware-calculator, Properties 12, 13, 14, 28
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { classifyGPUFit, recommendGPUs } from './gpu-recommender';
import { recommendCloudInstances } from './cloud-recommender';
import type { GPUSpec, CloudInstance } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGPU(overrides: Partial<GPUSpec> = {}): GPUSpec {
  return {
    id: 'test-gpu',
    vendor: 'nvidia',
    name: 'Test GPU',
    category: 'datacenter',
    memoryGB: 80,
    memoryBandwidthGBs: 2000,
    flops: { fp32: 100, fp16: 200, int8: 400 },
    tdpWatts: 400,
    formFactor: 'sxm',
    releaseYear: 2023,
    ...overrides,
  };
}

function makeCloud(overrides: Partial<CloudInstance> = {}): CloudInstance {
  return {
    id: 'test-cloud',
    provider: 'aws',
    instanceType: 'p5.48xlarge',
    gpus: [{ id: 'test-gpu', count: 1 }],
    vcpus: 192,
    ramGB: 2048,
    storageGB: 7600,
    networkGbps: 3200,
    pricing: { onDemandUSDPerHour: 10.0 },
    regions: ['us-east-1'],
    lastPriceUpdate: '2026-04-16T00:00:00Z',
    ...overrides,
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('classifyGPUFit — unit tests', () => {
  it('green when utilization ≤ 80%', () => {
    expect(classifyGPUFit(56, 80)).toBe('green');  // 70%
    expect(classifyGPUFit(64, 80)).toBe('green');  // 80% exactly
  });

  it('yellow when utilization 80–100%', () => {
    expect(classifyGPUFit(65, 80)).toBe('yellow'); // 81.25%
    expect(classifyGPUFit(80, 80)).toBe('yellow'); // 100% exactly
  });

  it('red when utilization > 100%', () => {
    expect(classifyGPUFit(81, 80)).toBe('red');    // 101.25%
    expect(classifyGPUFit(160, 80)).toBe('red');   // 200%
  });
});

describe('recommendGPUs — unit tests', () => {
  it('sorts green before yellow before red', () => {
    const gpus = [
      makeGPU({ id: 'small', memoryGB: 16, streetUSD: 500 }),   // red for 56GB
      makeGPU({ id: 'medium', memoryGB: 80, streetUSD: 2000 }), // green for 56GB
      makeGPU({ id: 'tight', memoryGB: 60, streetUSD: 1500 }),  // yellow for 56GB
    ];
    const result = recommendGPUs(56, gpus);
    expect(result.allFits[0].fitStatus).toBe('green');
    expect(result.allFits[1].fitStatus).toBe('yellow');
    expect(result.allFits[2].fitStatus).toBe('red');
  });

  it('budget tier: price < $1000, VRAM ≥ 12 GB', () => {
    const gpus = [
      makeGPU({ id: 'budget', memoryGB: 24, streetUSD: 800, category: 'consumer' }),
      makeGPU({ id: 'perf', memoryGB: 80, streetUSD: 30000, category: 'datacenter' }),
    ];
    const result = recommendGPUs(10, gpus);
    expect(result.budget?.gpu.id).toBe('budget');
    expect(result.performance?.gpu.id).toBe('perf');
  });
});

// ─── Property 12: GPU fit classification thresholds ──────────────────────────
// **Validates: Requirements 5.1, 5.5, 37.2**

describe('Property 12: GPU fit classification thresholds', () => {
  it('green ≤ 80%, yellow 80–100%, red > 100%', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(1024), noNaN: true }),
        (totalVRAMGB, gpuMemoryGB) => {
          const status = classifyGPUFit(totalVRAMGB, gpuMemoryGB);
          const utilization = totalVRAMGB / gpuMemoryGB;

          if (utilization <= 0.8) expect(status).toBe('green');
          else if (utilization <= 1.0) expect(status).toBe('yellow');
          else expect(status).toBe('red');
        }
      ),
      { numRuns: 500 }
    );
  });

  it('green implies VRAM fits (totalVRAM ≤ gpuMemory)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(1024), noNaN: true }),
        (totalVRAMGB, gpuMemoryGB) => {
          const status = classifyGPUFit(totalVRAMGB, gpuMemoryGB);
          if (status === 'green') expect(totalVRAMGB).toBeLessThanOrEqual(gpuMemoryGB);
          if (status === 'red') expect(totalVRAMGB).toBeGreaterThan(gpuMemoryGB);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─── Property 13: Cloud recommendations sorted by price ──────────────────────
// **Validates: Requirements 6.1**

describe('Property 13: Cloud recommendations sorted by price ascending', () => {
  it('returned instances are sorted by onDemandPerHour ascending', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            price: fc.float({ min: Math.fround(0.1), max: Math.fround(200), noNaN: true }),
            memGB: fc.constantFrom(24, 48, 80, 141),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (entries) => {
          const gpus = [makeGPU({ id: 'gpu-80', memoryGB: 80 })];
          const instances = entries.map((e, i) =>
            makeCloud({
              id: `cloud-${i}`,
              gpus: [{ id: 'gpu-80', count: Math.ceil(40 / 80) }],
              pricing: { onDemandUSDPerHour: e.price },
            })
          );

          const result = recommendCloudInstances(40, instances, gpus);

          for (let i = 1; i < result.length; i++) {
            expect(result[i].onDemandPerHour).toBeGreaterThanOrEqual(result[i - 1].onDemandPerHour);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14: Cloud provider filtering ───────────────────────────────────
// **Validates: Requirements 6.3, 22.3**

describe('Property 14: Cloud provider filtering', () => {
  it('all returned instances match the provider filter', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('aws', 'azure', 'gcp', 'lambda', 'runpod'),
        fc.array(fc.constantFrom('aws', 'azure', 'gcp', 'lambda', 'runpod'), { minLength: 3, maxLength: 10 }),
        (filterProvider, providers) => {
          const gpus = [makeGPU({ id: 'gpu-80', memoryGB: 80 })];
          const instances = providers.map((p, i) =>
            makeCloud({ id: `${p}-${i}`, provider: p, gpus: [{ id: 'gpu-80', count: 1 }] })
          );

          const result = recommendCloudInstances(40, instances, gpus, filterProvider);

          for (const rec of result) {
            expect(rec.instance.provider).toBe(filterProvider);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 28: Best price badge uniqueness and correctness ────────────────
// **Validates: Requirements 36.4**

describe('Property 28: Best price badge uniqueness and correctness', () => {
  it('exactly one isBestPrice=true, and it has the minimum onDemandPerHour', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: Math.fround(0.5), max: Math.fround(200), noNaN: true }),
          { minLength: 1, maxLength: 8 }
        ),
        (prices) => {
          const gpus = [makeGPU({ id: 'gpu-80', memoryGB: 80 })];
          const instances = prices.map((price, i) =>
            makeCloud({ id: `cloud-${i}`, gpus: [{ id: 'gpu-80', count: 1 }], pricing: { onDemandUSDPerHour: price } })
          );

          const result = recommendCloudInstances(40, instances, gpus);
          if (result.length === 0) return; // no fitting instances

          const bestCount = result.filter(r => r.isBestPrice).length;
          expect(bestCount).toBe(1);

          const bestRec = result.find(r => r.isBestPrice)!;
          const minPrice = Math.min(...result.map(r => r.onDemandPerHour));
          expect(bestRec.onDemandPerHour).toBe(minPrice);
        }
      ),
      { numRuns: 100 }
    );
  });
});

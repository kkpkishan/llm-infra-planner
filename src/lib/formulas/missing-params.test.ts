import { describe, it, expect } from 'vitest';
import { computePower } from './power';
import { computeTCO } from './tco';
import {
  computeFlashAttentionSavings,
  computeGradAccumulation,
} from './training-advanced';
import { estimateWarmup } from './warmup';

// ─── Power Tests ──────────────────────────────────────────────────────────────

describe('computePower', () => {
  it('H100 at 70% duty, PUE=1.0, $0.10/kWh → annual cost ≈ $430/GPU', () => {
    // H100 TDP = 700W, 1 GPU, duty=0.7, PUE=1.0 (no cooling overhead), $0.10/kWh
    // 700 × 0.7 × 8760 / 1000 × 0.10 = $428.82 ≈ $430
    const result = computePower(1, 700, 1.0, 0.7, 0.10);
    expect(result.annualCostUSD).toBeCloseTo(428.82, 0);
  });

  it('facility power formula: GPU_count × TDP × PUE × duty / 1000', () => {
    const result = computePower(8, 700, 1.4, 0.8, 0.12);
    const expected = (8 * 700 * 1.4 * 0.8) / 1000;
    expect(result.facilityPowerKW).toBeCloseTo(expected, 5);
  });

  it('annual kWh = facilityPowerKW × 8760', () => {
    const result = computePower(4, 400, 1.2, 0.9, 0.10);
    expect(result.annualKWh).toBeCloseTo(result.facilityPowerKW * 8760, 3);
  });

  it('PSU recommendation = raw watts × 1.25 headroom', () => {
    const result = computePower(2, 500, 1.5, 0.8, 0.10);
    // raw watts = 2 × 500 × 0.8 = 800W; PSU = 800 × 1.25 = 1000W
    expect(result.psuRecommendedWatts).toBeCloseTo(1000, 3);
  });

  it('per-GPU hourly cost = annual cost / (gpuCount × 8760)', () => {
    const gpuCount = 4;
    const result = computePower(gpuCount, 700, 1.4, 0.7, 0.10);
    const expected = result.annualCostUSD / (gpuCount * 8760);
    expect(result.perGPUHourlyCostUSD).toBeCloseTo(expected, 6);
  });
});

// ─── TCO Tests ────────────────────────────────────────────────────────────────

describe('computeTCO', () => {
  it('H100 on-prem at $30k should breakeven vs $2.49/h Lambda within 36 months at 70% util', () => {
    // Single H100: $30k capex, 3yr dep, PUE=1.0 (no cooling overhead), $0.10/kWh,
    // no colo, no maintenance, no staff — minimal on-prem overhead
    // Cloud: $2.49/hr (Lambda H100), 70% utilization
    // Breakeven: cloud cumulative spend catches up to on-prem (capex + running)
    // Math: M = capex / (cloudMonthly - monthlyRunning) ≈ 24-25 months
    const result = computeTCO(
      30000,   // capex
      3,       // depreciationYears
      1.0,     // pue (no cooling overhead)
      0.10,    // electricityCostPerKWh
      0,       // coloPerRackPerMonth (home/office)
      0,       // maintenancePercentPerYear
      0,       // staffCostPerYear
      1,       // gpuCount
      700,     // gpuTDPWatts
      0.7,     // dutyCycle
      0.7,     // utilizationRate
      2.49     // cloudHourlyCostUSD (Lambda H100)
    );

    // Cloud at $2.49/hr × 730hr/mo × 0.7 util = $1272/mo
    // On-prem running ≈ $36/mo (power only)
    // Breakeven ≈ 30000 / (1272 - 36) ≈ 24-25 months
    expect(result.breakevenMonths).toBeGreaterThanOrEqual(20);
    expect(result.breakevenMonths).toBeLessThanOrEqual(30);
  });

  it('cumulative arrays have exactly 36 entries', () => {
    const result = computeTCO(30000, 3, 1.4, 0.10, 1500, 5, 50000, 1, 700, 0.7, 0.7, 2.49);
    expect(result.onPremCumulativeCosts).toHaveLength(36);
    expect(result.cloudCumulativeCosts).toHaveLength(36);
  });

  it('on-prem cumulative starts above capex (capex + first month running)', () => {
    const capex = 30000;
    const result = computeTCO(capex, 3, 1.4, 0.10, 0, 0, 0, 1, 700, 0.7, 0.7, 2.49);
    expect(result.onPremCumulativeCosts[0]).toBeGreaterThan(capex);
  });

  it('cloud cumulative is monotonically increasing', () => {
    const result = computeTCO(30000, 3, 1.4, 0.10, 1500, 5, 50000, 1, 700, 0.7, 0.7, 2.49);
    for (let i = 1; i < 36; i++) {
      expect(result.cloudCumulativeCosts[i]).toBeGreaterThan(result.cloudCumulativeCosts[i - 1]);
    }
  });

  it('on-prem cumulative is monotonically increasing', () => {
    const result = computeTCO(30000, 3, 1.4, 0.10, 1500, 5, 50000, 1, 700, 0.7, 0.7, 2.49);
    for (let i = 1; i < 36; i++) {
      expect(result.onPremCumulativeCosts[i]).toBeGreaterThan(result.onPremCumulativeCosts[i - 1]);
    }
  });

  it('breakeven month: cloud cumulative >= on-prem cumulative at that month', () => {
    const result = computeTCO(30000, 3, 1.4, 0.10, 1500, 5, 50000, 1, 700, 0.7, 0.7, 2.49);
    if (result.breakevenMonths !== -1) {
      const idx = result.breakevenMonths - 1;
      expect(result.cloudCumulativeCosts[idx]).toBeGreaterThanOrEqual(result.onPremCumulativeCosts[idx]);
    }
  });
});

// ─── FlashAttention Tests ─────────────────────────────────────────────────────

describe('computeFlashAttentionSavings', () => {
  it('at 32K context, disabling FlashAttention adds significant GB', () => {
    // 32 layers, 32 heads, seqLen=32768, batch=1, 2 bytes/param
    const enabled = computeFlashAttentionSavings(32, 32, 32768, 1, 2, true);
    const disabled = computeFlashAttentionSavings(32, 32, 32768, 1, 2, false);

    // When enabled: savedGB = attentionScoreGB (scores not materialized)
    expect(enabled.savedGB).toBeGreaterThan(0);
    // When disabled: savedGB = 0 (scores are materialized)
    expect(disabled.savedGB).toBe(0);
    // The attention score memory should be significant at 32K context
    expect(enabled.attentionScoreGB).toBeGreaterThan(1);
  });

  it('attention score GB = numLayers × numHeads × seqLen² × batch × bytesPerParam / 1e9', () => {
    const numLayers = 32, numHeads = 32, seqLen = 4096, batchSize = 1, bytesPerParam = 2;
    const result = computeFlashAttentionSavings(numLayers, numHeads, seqLen, batchSize, bytesPerParam, true);
    const expected = (numLayers * numHeads * seqLen * seqLen * batchSize * bytesPerParam) / 1e9;
    expect(result.attentionScoreGB).toBeCloseTo(expected, 5);
  });

  it('savedGB equals attentionScoreGB when enabled', () => {
    const result = computeFlashAttentionSavings(32, 32, 2048, 1, 2, true);
    expect(result.savedGB).toBeCloseTo(result.attentionScoreGB, 5);
  });

  it('savedGB is 0 when disabled', () => {
    const result = computeFlashAttentionSavings(32, 32, 2048, 1, 2, false);
    expect(result.savedGB).toBe(0);
  });
});

// ─── Gradient Accumulation Tests ──────────────────────────────────────────────

describe('computeGradAccumulation', () => {
  it('4 steps × batch 8 = effective batch 32, 0 extra VRAM', () => {
    const result = computeGradAccumulation(8, 4);
    expect(result.effectiveBatch).toBe(32);
    expect(result.extraVRAMGB).toBe(0);
  });

  it('1 step = effective batch equals input batch', () => {
    const result = computeGradAccumulation(16, 1);
    expect(result.effectiveBatch).toBe(16);
    expect(result.extraVRAMGB).toBe(0);
  });

  it('always 0 extra VRAM regardless of steps', () => {
    for (const steps of [1, 2, 4, 8, 16, 32, 64, 128, 256]) {
      const result = computeGradAccumulation(4, steps);
      expect(result.extraVRAMGB).toBe(0);
    }
  });
});

// ─── Warmup Tests ─────────────────────────────────────────────────────────────

describe('estimateWarmup', () => {
  it('7B model at NVMe Gen4 (7 GB/s) = 14GB / 7 = 2 seconds load time', () => {
    // 7B params × 2 bytes/param (FP16) = 14GB = 14e9 bytes
    const modelBytes = 7e9 * 2; // 14 GB
    const result = estimateWarmup(modelBytes, 7, 'vllm', 7e9);
    expect(result.loadTimeSec).toBeCloseTo(2.0, 3);
  });

  it('load time = modelBytes / (storageBandwidthGBs × 1e9)', () => {
    const modelBytes = 70e9 * 2; // 70B FP16 = 140 GB
    const bw = 14; // NVMe Gen5
    const result = estimateWarmup(modelBytes, bw, 'vllm', 70e9);
    expect(result.loadTimeSec).toBeCloseTo(modelBytes / (bw * 1e9), 3);
  });

  it('total cold start = load + compile + warmup', () => {
    const modelBytes = 7e9 * 2;
    const result = estimateWarmup(modelBytes, 7, 'vllm', 7e9);
    expect(result.totalColdStartSec).toBeCloseTo(
      result.loadTimeSec + result.compileTimeSec + result.warmupTimeSec,
      5
    );
  });

  it('TRT-LLM has longer compile time than vLLM', () => {
    const modelBytes = 7e9 * 2;
    const vllm = estimateWarmup(modelBytes, 7, 'vllm', 7e9);
    const trtllm = estimateWarmup(modelBytes, 7, 'trt-llm', 7e9);
    expect(trtllm.compileTimeSec).toBeGreaterThan(vllm.compileTimeSec);
  });

  it('HDD is much slower than NVMe Gen4', () => {
    const modelBytes = 14e9; // 14 GB
    const hdd = estimateWarmup(modelBytes, 0.15, 'vllm', 7e9);
    const nvme = estimateWarmup(modelBytes, 7, 'vllm', 7e9);
    expect(hdd.loadTimeSec).toBeGreaterThan(nvme.loadTimeSec * 10);
  });
});

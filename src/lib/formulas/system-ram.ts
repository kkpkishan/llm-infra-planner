/**
 * System RAM requirements for LLM inference, training, and ZeRO-Infinity offload.
 */

export interface RAMRequirement {
  minimumGB: number;
  recommendedGB: number;
  numaLayout: string;
  cpuCores: number;
  notes: string;
}

/**
 * Round up to nearest standard DIMM capacity (32, 64, 128, 256, 512, 1024 GB).
 */
function roundToStandardRAM(gb: number): number {
  const standards = [32, 64, 128, 192, 256, 384, 512, 768, 1024, 2048];
  return standards.find(s => s >= gb) ?? gb;
}

/**
 * Compute system RAM requirements.
 *
 * Inference:
 *   minimum = 1.2× model bytes (mmap loading)
 *   recommended = 1.5× model bytes + OS headroom
 *   load peak = 2× model bytes
 *
 * Training (standard):
 *   minimum = 1.5× aggregate VRAM per node
 *   recommended = 2× aggregate VRAM per node
 *
 * ZeRO-Infinity:
 *   CPU RAM ≈ 16 × N_params bytes (optimizer states + gradients offloaded)
 */
export function computeRAMRequirement(
  mode: 'inference' | 'training' | 'zero_infinity',
  modelBytes: number,
  numGPUsPerNode: number,
  vramPerGPUGB: number,
): RAMRequirement {
  const modelGB = modelBytes / 1e9;
  const aggregateVRAMGB = numGPUsPerNode * vramPerGPUGB;

  let minimumGB: number;
  let recommendedGB: number;
  let notes: string;

  switch (mode) {
    case 'inference': {
      minimumGB = modelGB * 1.2;
      // recommended covers load peak (2×) + OS + buffers
      recommendedGB = Math.max(modelGB * 1.5, modelGB * 2 * 0.8 + 16);
      notes = `mmap load: ${(modelGB * 1.2).toFixed(0)} GB min; load peak: ${(modelGB * 2).toFixed(0)} GB`;
      break;
    }
    case 'training': {
      minimumGB = aggregateVRAMGB * 1.5;
      recommendedGB = aggregateVRAMGB * 2;
      notes = `1.5–2× aggregate VRAM (${aggregateVRAMGB.toFixed(0)} GB) for gradient buffers and dataloaders`;
      break;
    }
    case 'zero_infinity': {
      // 16 bytes per param: fp32 params + fp32 grads + Adam m+v states = 16 bytes
      minimumGB = (modelBytes * 16) / 1e9;
      recommendedGB = minimumGB * 1.25;
      notes = `ZeRO-Infinity: 16 bytes/param for optimizer states + gradients offloaded to CPU`;
      break;
    }
  }

  // Round up to standard DIMM sizes
  const minRounded = roundToStandardRAM(minimumGB);
  const recRounded = roundToStandardRAM(recommendedGB);

  // NUMA layout guidance
  const numaLayout = numGPUsPerNode <= 4
    ? `Single NUMA node; pin all ${numGPUsPerNode} GPU(s) to NUMA 0`
    : `2-socket: pin GPUs 0-${Math.floor(numGPUsPerNode / 2) - 1} to NUMA 0, GPUs ${Math.floor(numGPUsPerNode / 2)}-${numGPUsPerNode - 1} to NUMA 1`;

  // CPU core recommendation: 1 physical core/GPU for dataloaders + 4-8 for tokenization
  const cpuCores = numGPUsPerNode * 1 + 6;

  return {
    minimumGB: minRounded,
    recommendedGB: recRounded,
    numaLayout,
    cpuCores,
    notes,
  };
}

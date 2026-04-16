import type { GPUSpec, ClusterRecommendation, WorkloadMode } from './types';

/**
 * Recommend GPU topology, parallelism strategy, and serving framework.
 *
 * Decision tree:
 *   totalVRAM ≤ largest single GPU → single GPU
 *   totalVRAM ≤ 8 × gpu.memoryGB  → single node, Tensor Parallelism
 *   totalVRAM > 8 × 192 GB        → multi-node cluster
 */
export function recommendCluster(
  totalVRAMGB: number,
  mode: WorkloadMode,
  gpus: GPUSpec[]
): ClusterRecommendation {
  const sortedByMemory = [...gpus].sort((a, b) => b.memoryGB - a.memoryGB);
  const largestGPU = sortedByMemory[0];
  const largestMemory = largestGPU?.memoryGB ?? 80;

  // ── Framework selection ───────────────────────────────────────────────────
  let framework: string;
  let frameworkArgs: string;
  let alternativeRuntime: string | undefined;

  if (mode === 'inference' || mode === 'scale') {
    framework = 'vLLM';
    frameworkArgs = '--tensor-parallel-size 1';
    alternativeRuntime = 'llama.cpp (easier setup, ~15% slower)';
  } else if (mode === 'finetune') {
    framework = 'HuggingFace TRL + PEFT + accelerate';
    frameworkArgs = '--gradient_checkpointing --bf16';
    alternativeRuntime = 'Unsloth (faster LoRA training)';
  } else if (mode === 'train') {
    framework = 'DeepSpeed ZeRO-3';
    frameworkArgs = '--deepspeed ds_config.json --bf16';
    alternativeRuntime = 'PyTorch FSDP';
  } else {
    framework = 'vLLM';
    frameworkArgs = '';
  }

  // ── Topology selection ────────────────────────────────────────────────────
  if (totalVRAMGB <= largestMemory) {
    // Single GPU fits
    return {
      topology: `1× ${largestGPU?.name ?? 'GPU'} · no parallelism needed`,
      framework,
      frameworkArgs,
      alternativeRuntime,
    };
  }

  // Multi-GPU needed — find how many of the largest GPU we need
  const gpusNeeded = Math.ceil(totalVRAMGB / largestMemory);

  if (gpusNeeded <= 8) {
    // Single node with Tensor Parallelism
    const tpSize = Math.min(gpusNeeded, 8);
    const updatedArgs = frameworkArgs.replace('--tensor-parallel-size 1', `--tensor-parallel-size ${tpSize}`);
    return {
      topology: `${tpSize}× ${largestGPU?.name ?? 'GPU'} · Tensor Parallelism (TP=${tpSize})`,
      alternativeTopology: totalVRAMGB <= largestMemory * 2
        ? `2× ${largestGPU?.name ?? 'GPU'} · TP=2`
        : undefined,
      framework,
      frameworkArgs: updatedArgs,
      alternativeRuntime,
    };
  }

  // Multi-node cluster
  const nodesNeeded = Math.ceil(gpusNeeded / 8);
  return {
    topology: `${nodesNeeded} nodes × 8× ${largestGPU?.name ?? 'GPU'} · TP=8 intra-node + FSDP/ZeRO across nodes`,
    framework: mode === 'train' ? 'Megatron-LM or DeepSpeed' : 'vLLM with pipeline parallelism',
    frameworkArgs: mode === 'train'
      ? '--tensor-model-parallel-size 8 --pipeline-model-parallel-size ' + nodesNeeded
      : `--tensor-parallel-size 8 --pipeline-parallel-size ${nodesNeeded}`,
    alternativeRuntime: 'NVIDIA NeMo (hyperscale training)',
  };
}

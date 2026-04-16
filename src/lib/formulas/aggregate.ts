import type { ModelSpec, PrecisionConfig, VRAMBreakdown, WorkloadMode, TrainingOptions } from './types';
import { computeWeightMemory } from './vram';
import { computeKVCache } from './kvcache';
import { computeTrainingMemory } from './training';

const OVERHEAD_GB = 1.0; // CUDA context + framework overhead

/**
 * Compute total VRAM breakdown for a given model, precision, and workload mode.
 *
 * Inference: weights + KV cache + overhead
 * Fine-tune / Train: weights + activations + gradients + optimizer + overhead
 */
export function computeTotalVRAM(
  model: ModelSpec,
  precision: PrecisionConfig,
  kvPrecision: PrecisionConfig,
  contextLength: number,
  batchSize: number,
  mode: WorkloadMode,
  trainingOptions?: TrainingOptions
): VRAMBreakdown {
  const { architecture, paramsTotal } = model;

  // ── Weights ──────────────────────────────────────────────────────────────
  const { weightGB: weightsGB } = computeWeightMemory({
    numParams: paramsTotal,
    bytesPerParam: precision.bytesPerParam,
  });

  // ── KV Cache (inference / scale modes) ───────────────────────────────────
  let kvCacheGB = 0;
  if (mode === 'inference' || mode === 'scale') {
    const kvResult = computeKVCache({
      numLayers: architecture.numLayers,
      batchSize,
      seqLen: contextLength,
      numKVHeads: architecture.numKeyValueHeads,
      headDim: architecture.headDim,
      bytesPerParam: kvPrecision.bytesPerParam,
      attentionType: architecture.attentionType,
      mlaCompressedDim: model.mlaCompressedDim,
    });
    kvCacheGB = kvResult.kvCacheGB;
  }

  // ── Training components (finetune / train modes) ──────────────────────────
  let activationsGB = 0;
  let gradientsGB = 0;
  let optimizerGB = 0;

  if (mode === 'finetune' || mode === 'train') {
    const opts = trainingOptions ?? {
      mode: mode === 'train' ? 'full' : 'lora',
      gradientCheckpointing: true,
    };

    const trainingResult = computeTrainingMemory({
      numParams: paramsTotal,
      numLayers: architecture.numLayers,
      hiddenSize: architecture.hiddenSize,
      numAttentionHeads: architecture.numAttentionHeads,
      seqLen: contextLength,
      batchSize,
      bytesPerParam: precision.bytesPerParam,
      mode: opts.mode,
      gradientCheckpointing: opts.gradientCheckpointing,
      loraRank: opts.loraRank,
      loraTargetModules: opts.loraTargetModules,
    });

    activationsGB = trainingResult.activationsGB;
    gradientsGB = trainingResult.gradientsGB;
    optimizerGB = trainingResult.optimizerGB;
  }

  const totalGB =
    weightsGB + kvCacheGB + activationsGB + gradientsGB + optimizerGB + OVERHEAD_GB;

  return {
    weightsGB,
    kvCacheGB,
    activationsGB,
    gradientsGB,
    optimizerGB,
    overheadGB: OVERHEAD_GB,
    totalGB,
  };
}

import type { ModelSpec, PrecisionConfig, VRAMBreakdown, WorkloadMode, TrainingOptions } from './types';
import { computeWeightMemory } from './vram';
import { computeKVCache } from './kvcache';
import { computeTrainingMemory } from './training';
import { computeTrainingMethodMemory } from './training-methods';
import type { TrainingMethodId } from './training-methods';
import { computeLoRAParams } from './lora';

const OVERHEAD_GB = 1.0; // CUDA context + framework overhead

/**
 * Compute total VRAM breakdown for a given model, precision, and workload mode.
 *
 * Inference: weights + KV cache + overhead
 * Fine-tune / Train: weights + activations + gradients + optimizer + overhead
 *
 * When trainingOptions.trainingMethodId is set, dispatches to the per-method
 * formula from training-methods.ts for accurate multi-model memory accounting.
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
  let extraModelsGB = 0;

  if (mode === 'finetune' || mode === 'train') {
    const opts = trainingOptions ?? {
      mode: mode === 'train' ? 'full' : 'lora',
      gradientCheckpointing: true,
    };

    // ── Dispatch to per-method formula if trainingMethodId is set ────────
    if (opts.trainingMethodId) {
      // Compute activations first (needed by method formula)
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

      // Compute trainable params for LoRA methods
      let trainableParams = paramsTotal;
      if (opts.loraTargetModules && opts.loraRank) {
        trainableParams = computeLoRAParams({
          rank: opts.loraRank,
          alpha: opts.loraRank,
          targetModules: opts.loraTargetModules.map((m, i) => ({
            name: `module_${i}`,
            dIn: m.dIn,
            dOut: m.dOut,
          })),
        });
      }

      const methodMemory = computeTrainingMethodMemory(
        opts.trainingMethodId as TrainingMethodId,
        paramsTotal,
        trainableParams,
        trainingResult.activationsGB,
        precision.bytesPerParam
      );

      activationsGB = methodMemory.breakdown.activationsGB;
      gradientsGB = methodMemory.breakdown.gradientsGB;
      optimizerGB = methodMemory.breakdown.optimizerGB;
      extraModelsGB = methodMemory.breakdown.extraModelsGB;

      // For methods with extra models, the weightsGB from computeWeightMemory
      // only covers the base model — we add extra models to optimizerGB slot
      // to keep the VRAMBreakdown interface compatible.
      // We fold extraModelsGB into optimizerGB for display purposes.
      optimizerGB += extraModelsGB;
    } else {
      // ── Legacy path: use existing training.ts formula ─────────────────
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

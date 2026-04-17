/**
 * Training method memory formulas.
 * Each method has a different set of models loaded in memory and different
 * optimizer/gradient requirements.
 *
 * The `multiplier` field represents the theoretical N× factor (excluding activations),
 * e.g. PPO = 36N, DPO = 18N, full SFT = 16N.
 */

export type TrainingMethodId =
  | 'pretrain'
  | 'continued_pretrain'
  | 'sft_full'
  | 'sft_lora'
  | 'sft_qlora'
  | 'dpo'
  | 'grpo'
  | 'rlhf_ppo'
  | 'kto'
  | 'orpo'
  | 'distillation';

export interface TrainingMethodMemory {
  methodId: TrainingMethodId;
  totalGB: number;
  breakdown: {
    weightsGB: number;       // frozen/base weights
    gradientsGB: number;     // gradient storage
    optimizerGB: number;     // optimizer states
    activationsGB: number;   // activation memory
    extraModelsGB: number;   // reference/reward/critic models
  };
  multiplier: number;        // formula-only N× factor (excludes activations)
  note: string;
}

/**
 * Compute training memory for a given method.
 *
 * @param methodId - training method
 * @param numParams - total model parameters
 * @param trainableParams - trainable params (for LoRA/QLoRA)
 * @param activationsGB - activation memory from training.ts
 * @param bytesPerParam - base precision bytes per param (e.g. 2 for BF16)
 */
export function computeTrainingMethodMemory(
  methodId: TrainingMethodId,
  numParams: number,
  trainableParams: number,
  activationsGB: number,
  bytesPerParam: number
): TrainingMethodMemory {
  // Base model size in GB at given precision
  const baseGB = (numParams * bytesPerParam) / 1e9;
  // Full BF16/FP16 model size (2 bytes/param) — used for formula calculations
  const fp16GB = (numParams * 2) / 1e9;

  switch (methodId) {
    case 'pretrain':
    case 'continued_pretrain':
    case 'sft_full': {
      // 16 B/param: weights(2) + grads(2) + FP32 master(4) + Adam m(4) + Adam v(4)
      const weightsGB = fp16GB;
      const gradientsGB = fp16GB;
      const optimizerGB = (numParams * 12) / 1e9;
      const extraModelsGB = 0;
      const formulaGB = weightsGB + gradientsGB + optimizerGB + extraModelsGB;
      const totalGB = formulaGB + activationsGB;
      const multiplier = formulaGB / baseGB;
      return {
        methodId,
        totalGB,
        breakdown: { weightsGB, gradientsGB, optimizerGB, activationsGB, extraModelsGB },
        multiplier,
        note: '16 B/param: weights(2) + grads(2) + FP32 master+Adam(12)',
      };
    }

    case 'sft_lora': {
      // 2N frozen weights + 16 × N_trainable + activations
      const weightsGB = fp16GB;
      const gradientsGB = (trainableParams * 2) / 1e9;
      const optimizerGB = (trainableParams * 14) / 1e9;
      const extraModelsGB = 0;
      const formulaGB = weightsGB + gradientsGB + optimizerGB + extraModelsGB;
      const totalGB = formulaGB + activationsGB;
      const multiplier = formulaGB / baseGB;
      return {
        methodId,
        totalGB,
        breakdown: { weightsGB, gradientsGB, optimizerGB, activationsGB, extraModelsGB },
        multiplier,
        note: '2N frozen + 16 × N_trainable + activations',
      };
    }

    case 'sft_qlora': {
      // 0.5N NF4 base + 16 × N_trainable + activations
      const weightsGB = (numParams * 0.5) / 1e9;
      const gradientsGB = (trainableParams * 2) / 1e9;
      const optimizerGB = (trainableParams * 14) / 1e9;
      const extraModelsGB = 0;
      const formulaGB = weightsGB + gradientsGB + optimizerGB + extraModelsGB;
      const totalGB = formulaGB + activationsGB;
      const multiplier = formulaGB / baseGB;
      return {
        methodId,
        totalGB,
        breakdown: { weightsGB, gradientsGB, optimizerGB, activationsGB, extraModelsGB },
        multiplier,
        note: '0.5N NF4 + 16 × N_trainable + activations',
      };
    }

    case 'dpo': {
      // 18N: policy(16N) + reference(2N)
      const weightsGB = fp16GB;
      const gradientsGB = fp16GB;
      const optimizerGB = (numParams * 12) / 1e9;
      const extraModelsGB = fp16GB;
      const formulaGB = weightsGB + gradientsGB + optimizerGB + extraModelsGB;
      const totalGB = formulaGB + activationsGB;
      const multiplier = formulaGB / baseGB;
      return {
        methodId,
        totalGB,
        breakdown: { weightsGB, gradientsGB, optimizerGB, activationsGB, extraModelsGB },
        multiplier,
        note: '18N: policy(16N) + reference model(2N)',
      };
    }

    case 'grpo': {
      // 20N: policy(16N) + reference(2N) + reward(2N)
      const weightsGB = fp16GB;
      const gradientsGB = fp16GB;
      const optimizerGB = (numParams * 12) / 1e9;
      const extraModelsGB = fp16GB * 2;
      const formulaGB = weightsGB + gradientsGB + optimizerGB + extraModelsGB;
      const totalGB = formulaGB + activationsGB;
      const multiplier = formulaGB / baseGB;
      return {
        methodId,
        totalGB,
        breakdown: { weightsGB, gradientsGB, optimizerGB, activationsGB, extraModelsGB },
        multiplier,
        note: '20N: policy(16N) + reference(2N) + reward(2N)',
      };
    }

    case 'rlhf_ppo': {
      // 36N: actor(16N) + critic(16N) + reference(2N) + reward(2N)
      const weightsGB = fp16GB;
      const gradientsGB = fp16GB;
      const optimizerGB = (numParams * 12) / 1e9;
      // critic(16N) + reference(2N) + reward(2N) = 20N extra
      const extraModelsGB = fp16GB * 8 + fp16GB + fp16GB;
      const formulaGB = weightsGB + gradientsGB + optimizerGB + extraModelsGB;
      const totalGB = formulaGB + activationsGB;
      const multiplier = formulaGB / baseGB;
      return {
        methodId,
        totalGB,
        breakdown: { weightsGB, gradientsGB, optimizerGB, activationsGB, extraModelsGB },
        multiplier,
        note: '36N: actor(16N) + critic(16N) + reference(2N) + reward(2N)',
      };
    }

    case 'kto':
    case 'orpo': {
      // 16N: reference-free, single model
      const weightsGB = fp16GB;
      const gradientsGB = fp16GB;
      const optimizerGB = (numParams * 12) / 1e9;
      const extraModelsGB = 0;
      const formulaGB = weightsGB + gradientsGB + optimizerGB + extraModelsGB;
      const totalGB = formulaGB + activationsGB;
      const multiplier = formulaGB / baseGB;
      return {
        methodId,
        totalGB,
        breakdown: { weightsGB, gradientsGB, optimizerGB, activationsGB, extraModelsGB },
        multiplier,
        note: '16N: reference-free single model',
      };
    }

    case 'distillation': {
      // 16 × N_student + 2 × N_teacher (teacher is inference-only)
      const weightsGB = fp16GB;
      const gradientsGB = fp16GB;
      const optimizerGB = (numParams * 12) / 1e9;
      const extraModelsGB = fp16GB;
      const formulaGB = weightsGB + gradientsGB + optimizerGB + extraModelsGB;
      const totalGB = formulaGB + activationsGB;
      const multiplier = formulaGB / baseGB;
      return {
        methodId,
        totalGB,
        breakdown: { weightsGB, gradientsGB, optimizerGB, activationsGB, extraModelsGB },
        multiplier,
        note: '16 × N_student + 2 × N_teacher (teacher inference-only)',
      };
    }
  }
}

/** Human-readable labels for each training method */
export const TRAINING_METHOD_LABELS: Record<TrainingMethodId, string> = {
  pretrain: 'Pre-training',
  continued_pretrain: 'Continued Pre-training',
  sft_full: 'SFT (Full)',
  sft_lora: 'SFT (LoRA)',
  sft_qlora: 'SFT (QLoRA)',
  dpo: 'DPO',
  grpo: 'GRPO',
  rlhf_ppo: 'RLHF-PPO',
  kto: 'KTO',
  orpo: 'ORPO / SimPO / CPO',
  distillation: 'Distillation',
};

/** Formula summary for display in picker */
export const TRAINING_METHOD_FORMULA: Record<TrainingMethodId, string> = {
  pretrain: '16 B/param — full weights',
  continued_pretrain: '16 B/param — full weights',
  sft_full: '16 B/param — full weights',
  sft_lora: '2N frozen + 16 × N_trainable',
  sft_qlora: '0.5N NF4 + 16 × N_trainable',
  dpo: '18N — policy + reference',
  grpo: '20N — policy + ref + reward',
  rlhf_ppo: '36N — actor + critic + ref + reward',
  kto: '16N — reference-free',
  orpo: '16N — reference-free',
  distillation: '16N_student + 2N_teacher',
};

/** Group methods by category */
export const TRAINING_METHOD_GROUPS = [
  {
    label: 'Pre-training',
    methods: ['pretrain', 'continued_pretrain'] as TrainingMethodId[],
  },
  {
    label: 'Fine-tuning',
    methods: ['sft_full', 'sft_lora', 'sft_qlora'] as TrainingMethodId[],
  },
  {
    label: 'Alignment',
    methods: ['dpo', 'grpo', 'rlhf_ppo', 'kto', 'orpo'] as TrainingMethodId[],
  },
  {
    label: 'Distillation',
    methods: ['distillation'] as TrainingMethodId[],
  },
] as const;

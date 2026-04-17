export interface QuantType {
  key: string;
  label: string;
  family: 'native' | 'gguf-k' | 'gguf-i' | 'gguf-t' | 'gptq' | 'awq' | 'bnb' | 'other';
  bytesPerParam: number;
  qualityStars: 1 | 2 | 3 | 4 | 5; // 5=best
  hardwareNote?: string;
}

export const QUANTIZATION_TYPES: QuantType[] = [
  // ── Native ──────────────────────────────────────────────────────────────────
  { key: 'fp32',        label: 'FP32',        family: 'native', bytesPerParam: 4.0,    qualityStars: 5, hardwareNote: 'All hardware' },
  { key: 'tf32',        label: 'TF32',        family: 'native', bytesPerParam: 4.0,    qualityStars: 5, hardwareNote: 'NVIDIA Ampere+' },
  { key: 'fp16',        label: 'FP16',        family: 'native', bytesPerParam: 2.0,    qualityStars: 5, hardwareNote: 'All hardware' },
  { key: 'bf16',        label: 'BF16',        family: 'native', bytesPerParam: 2.0,    qualityStars: 5, hardwareNote: 'NVIDIA Ampere+, AMD MI200+' },
  { key: 'fp8_e4m3',   label: 'FP8 E4M3',   family: 'native', bytesPerParam: 1.0,    qualityStars: 4, hardwareNote: 'NVIDIA H100+, AMD MI300X' },
  { key: 'fp8_e5m2',   label: 'FP8 E5M2',   family: 'native', bytesPerParam: 1.0,    qualityStars: 4, hardwareNote: 'NVIDIA H100+, AMD MI300X' },
  { key: 'fp6',         label: 'FP6',         family: 'native', bytesPerParam: 0.75,   qualityStars: 4, hardwareNote: 'NVIDIA H100+ (experimental)' },
  { key: 'mxfp4',      label: 'MXFP4',      family: 'native', bytesPerParam: 0.53,   qualityStars: 3, hardwareNote: 'NVIDIA Blackwell (B100/B200)' },
  { key: 'nvfp4',      label: 'NVFP4',      family: 'native', bytesPerParam: 0.56,   qualityStars: 3, hardwareNote: 'NVIDIA Blackwell (B100/B200)' },
  { key: 'int8',        label: 'INT8',        family: 'native', bytesPerParam: 1.0,    qualityStars: 4, hardwareNote: 'All hardware' },
  { key: 'int4',        label: 'INT4',        family: 'native', bytesPerParam: 0.5,    qualityStars: 3, hardwareNote: 'All hardware' },

  // ── GPTQ ────────────────────────────────────────────────────────────────────
  { key: 'gptq_2bit',  label: 'GPTQ 2-bit', family: 'gptq',   bytesPerParam: 0.25,   qualityStars: 1, hardwareNote: 'NVIDIA GPU (AutoGPTQ)' },
  { key: 'gptq_3bit',  label: 'GPTQ 3-bit', family: 'gptq',   bytesPerParam: 0.375,  qualityStars: 2, hardwareNote: 'NVIDIA GPU (AutoGPTQ)' },
  { key: 'gptq_4bit',  label: 'GPTQ 4-bit', family: 'gptq',   bytesPerParam: 0.5,    qualityStars: 3, hardwareNote: 'NVIDIA GPU (AutoGPTQ)' },
  { key: 'gptq_8bit',  label: 'GPTQ 8-bit', family: 'gptq',   bytesPerParam: 1.0,    qualityStars: 4, hardwareNote: 'NVIDIA GPU (AutoGPTQ)' },

  // ── AWQ ─────────────────────────────────────────────────────────────────────
  { key: 'awq_4bit',   label: 'AWQ 4-bit',  family: 'awq',    bytesPerParam: 0.5,    qualityStars: 3, hardwareNote: 'NVIDIA GPU (AutoAWQ)' },

  // ── GGUF K-quants ────────────────────────────────────────────────────────────
  { key: 'q2_k',       label: 'Q2_K',       family: 'gguf-k', bytesPerParam: 0.32,   qualityStars: 1, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q3_k_s',     label: 'Q3_K_S',     family: 'gguf-k', bytesPerParam: 0.43,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q3_k_m',     label: 'Q3_K_M',     family: 'gguf-k', bytesPerParam: 0.49,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q3_k_l',     label: 'Q3_K_L',     family: 'gguf-k', bytesPerParam: 0.50,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q4_0',       label: 'Q4_0',       family: 'gguf-k', bytesPerParam: 0.56,   qualityStars: 3, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q4_1',       label: 'Q4_1',       family: 'gguf-k', bytesPerParam: 0.63,   qualityStars: 3, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q4_k_s',     label: 'Q4_K_S',     family: 'gguf-k', bytesPerParam: 0.57,   qualityStars: 3, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q4_k_m',     label: 'Q4_K_M',     family: 'gguf-k', bytesPerParam: 0.606,  qualityStars: 3, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q5_0',       label: 'Q5_0',       family: 'gguf-k', bytesPerParam: 0.69,   qualityStars: 4, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q5_1',       label: 'Q5_1',       family: 'gguf-k', bytesPerParam: 0.75,   qualityStars: 4, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q5_k_s',     label: 'Q5_K_S',     family: 'gguf-k', bytesPerParam: 0.69,   qualityStars: 4, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q5_k_m',     label: 'Q5_K_M',     family: 'gguf-k', bytesPerParam: 0.711,  qualityStars: 4, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q6_k',       label: 'Q6_K',       family: 'gguf-k', bytesPerParam: 0.82,   qualityStars: 4, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'q8_0',       label: 'Q8_0',       family: 'gguf-k', bytesPerParam: 1.0625, qualityStars: 5, hardwareNote: 'CPU/GPU via llama.cpp' },

  // ── GGUF I-quants ────────────────────────────────────────────────────────────
  { key: 'iq1_s',      label: 'IQ1_S',      family: 'gguf-i', bytesPerParam: 0.20,   qualityStars: 1, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq1_m',      label: 'IQ1_M',      family: 'gguf-i', bytesPerParam: 0.22,   qualityStars: 1, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq2_xxs',    label: 'IQ2_XXS',    family: 'gguf-i', bytesPerParam: 0.26,   qualityStars: 1, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq2_xs',     label: 'IQ2_XS',     family: 'gguf-i', bytesPerParam: 0.29,   qualityStars: 1, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq2_s',      label: 'IQ2_S',      family: 'gguf-i', bytesPerParam: 0.31,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq2_m',      label: 'IQ2_M',      family: 'gguf-i', bytesPerParam: 0.34,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq3_xxs',    label: 'IQ3_XXS',    family: 'gguf-i', bytesPerParam: 0.38,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq3_xs',     label: 'IQ3_XS',     family: 'gguf-i', bytesPerParam: 0.41,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq3_s',      label: 'IQ3_S',      family: 'gguf-i', bytesPerParam: 0.43,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq3_m',      label: 'IQ3_M',      family: 'gguf-i', bytesPerParam: 0.46,   qualityStars: 2, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq4_xs',     label: 'IQ4_XS',     family: 'gguf-i', bytesPerParam: 0.53,   qualityStars: 3, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'iq4_nl',     label: 'IQ4_NL',     family: 'gguf-i', bytesPerParam: 0.56,   qualityStars: 3, hardwareNote: 'CPU/GPU via llama.cpp' },

  // ── GGUF T-quants ────────────────────────────────────────────────────────────
  { key: 'tq1_0',      label: 'TQ1_0',      family: 'gguf-t', bytesPerParam: 0.21,   qualityStars: 1, hardwareNote: 'CPU/GPU via llama.cpp' },
  { key: 'tq2_0',      label: 'TQ2_0',      family: 'gguf-t', bytesPerParam: 0.26,   qualityStars: 1, hardwareNote: 'CPU/GPU via llama.cpp' },

  // ── bitsandbytes ─────────────────────────────────────────────────────────────
  { key: 'nf4',        label: 'NF4',        family: 'bnb',    bytesPerParam: 0.5,    qualityStars: 3, hardwareNote: 'NVIDIA GPU (bitsandbytes)' },
  { key: 'int8_llm',   label: 'INT8-LLM',   family: 'bnb',    bytesPerParam: 1.0,    qualityStars: 4, hardwareNote: 'NVIDIA GPU (bitsandbytes)' },
];

/** Lookup a quant type by key, returns undefined if not found */
export function getQuantType(key: string): QuantType | undefined {
  return QUANTIZATION_TYPES.find(q => q.key === key);
}

/** Get all quant types for a given family */
export function getQuantsByFamily(family: QuantType['family']): QuantType[] {
  return QUANTIZATION_TYPES.filter(q => q.family === family);
}

/** Common/default quant keys shown in collapsed view */
export const DEFAULT_QUANT_KEYS = ['fp16', 'bf16', 'int8', 'int4', 'q4_k_m', 'q5_k_m', 'q8_0'];

/** Family display labels */
export const FAMILY_LABELS: Record<QuantType['family'], string> = {
  'native':  'Native',
  'gguf-k':  'GGUF K-quants',
  'gguf-i':  'GGUF I-quants',
  'gguf-t':  'GGUF T-quants',
  'gptq':    'GPTQ',
  'awq':     'AWQ',
  'bnb':     'bitsandbytes',
  'other':   'Other',
};

import type { PrecisionConfig } from './types';

// PRECISION_MAP — weight precision
export const PRECISION_MAP: Record<string, { bytesPerParam: number; label: string }> = {
  fp32:   { bytesPerParam: 4.0,    label: "FP32" },
  fp16:   { bytesPerParam: 2.0,    label: "FP16" },
  bf16:   { bytesPerParam: 2.0,    label: "BF16" },
  fp8:    { bytesPerParam: 1.0,    label: "FP8" },
  int8:   { bytesPerParam: 1.0,    label: "INT8" },
  int4:   { bytesPerParam: 0.5,    label: "INT4" },
  q4_k_m: { bytesPerParam: 0.606,  label: "GGUF Q4_K_M" },
  q5_k_m: { bytesPerParam: 0.711,  label: "GGUF Q5_K_M" },
  q8_0:   { bytesPerParam: 1.0625, label: "GGUF Q8_0" },
};

// KV_PRECISION_MAP — KV cache precision (independent of weight precision)
export const KV_PRECISION_MAP: Record<string, { bytesPerParam: number; label: string }> = {
  fp16: { bytesPerParam: 2.0, label: "FP16" },
  int8: { bytesPerParam: 1.0, label: "INT8" },
  q4:   { bytesPerParam: 0.5, label: "Q4" },
};

// Default precision keys
export const DEFAULT_PRECISION = "fp16";
export const DEFAULT_KV_PRECISION = "fp16";

// Helper functions
export function getPrecisionConfig(key: string): PrecisionConfig {
  const config = PRECISION_MAP[key] ?? PRECISION_MAP[DEFAULT_PRECISION];
  return {
    key: key in PRECISION_MAP ? key : DEFAULT_PRECISION,
    ...config,
  };
}

export function getKVPrecisionConfig(key: string): PrecisionConfig {
  const config = KV_PRECISION_MAP[key] ?? KV_PRECISION_MAP[DEFAULT_KV_PRECISION];
  return {
    key: key in KV_PRECISION_MAP ? key : DEFAULT_KV_PRECISION,
    ...config,
  };
}

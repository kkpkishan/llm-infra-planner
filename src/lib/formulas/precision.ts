import type { PrecisionConfig } from './types';
import { QUANTIZATION_TYPES } from '@/data/quantization-types';

// PRECISION_MAP — weight precision (built from QUANTIZATION_TYPES + legacy aliases)
export const PRECISION_MAP: Record<string, { bytesPerParam: number; label: string }> = {
  // Build from canonical quantization types
  ...Object.fromEntries(
    QUANTIZATION_TYPES.map(q => [q.key, { bytesPerParam: q.bytesPerParam, label: q.label }])
  ),
  // Legacy aliases kept for backward compatibility
  fp8:  { bytesPerParam: 1.0,    label: "FP8" },
  q4:   { bytesPerParam: 0.5,    label: "Q4" },
};

// KV_PRECISION_MAP — KV cache precision (independent of weight precision)
export const KV_PRECISION_MAP: Record<string, { bytesPerParam: number; label: string }> = {
  fp32:     { bytesPerParam: 4.0, label: "FP32" },
  fp16:     { bytesPerParam: 2.0, label: "FP16/BF16" },
  fp8_e4m3: { bytesPerParam: 1.0, label: "FP8 E4M3" },
  fp8_e5m2: { bytesPerParam: 1.0, label: "FP8 E5M2" },
  int8:     { bytesPerParam: 1.0, label: "INT8" },
  int4:     { bytesPerParam: 0.5, label: "INT4" },
  // Legacy aliases
  q4:       { bytesPerParam: 0.5, label: "Q4" },
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

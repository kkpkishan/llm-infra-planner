import type { CalculatorState, WorkloadMode, ModelSpec } from './formulas/types';
import { PRECISION_MAP, KV_PRECISION_MAP, DEFAULT_PRECISION, DEFAULT_KV_PRECISION } from './formulas/precision';

const DEFAULT_CTX = 4096;
const DEFAULT_BATCH = 1;
const DEFAULT_MODE: WorkloadMode = 'inference';

const VALID_MODES: WorkloadMode[] = ['inference', 'scale', 'finetune', 'train', 'reverse'];

/**
 * Serialize calculator state to a URL query string.
 * e.g. ?model=meta-llama/Llama-3.1-8B&precision=fp16&kv=fp16&ctx=4096&batch=1&mode=inference
 */
export function serializeState(state: CalculatorState): string {
  const params = new URLSearchParams();
  params.set('model', state.model);
  params.set('precision', state.precision);
  params.set('kv', state.kvPrecision);
  params.set('ctx', String(state.ctx));
  params.set('batch', String(state.batch));
  params.set('mode', state.mode);
  if (state.gpu) params.set('gpu', state.gpu);
  if (state.compare && state.compare.length > 0) {
    params.set('compare', state.compare.join(','));
  }
  return '?' + params.toString();
}

/**
 * Parse URL query string back into a CalculatorState.
 * Applies defaults for missing params, clamps out-of-range values,
 * falls back to default model for unrecognized IDs.
 */
export function parseState(
  queryString: string,
  modelDb: ModelSpec[]
): CalculatorState & { fallbackModel?: boolean } {
  const params = new URLSearchParams(
    queryString.startsWith('?') ? queryString.slice(1) : queryString
  );

  // Model — fall back to first model in DB if unrecognized
  const modelId = params.get('model') ?? '';
  const foundModel = modelDb.find(m => m.id === modelId);
  const resolvedModel = foundModel?.id ?? modelDb[0]?.id ?? '';
  const fallbackModel = !foundModel && modelId !== '';

  // Precision — fall back to default if unrecognized key
  const rawPrecision = params.get('precision') ?? DEFAULT_PRECISION;
  const precision = rawPrecision in PRECISION_MAP ? rawPrecision : DEFAULT_PRECISION;

  // KV precision — fall back to default for unknown keys (graceful degradation)
  const rawKV = params.get('kv') ?? DEFAULT_KV_PRECISION;
  const kvPrecision = rawKV in KV_PRECISION_MAP ? rawKV : DEFAULT_KV_PRECISION;

  // Context length — clamp to model's maxContextLength
  const maxCtx = foundModel?.architecture.maxContextLength ?? 131072;
  const rawCtx = parseInt(params.get('ctx') ?? String(DEFAULT_CTX), 10);
  const ctx = isNaN(rawCtx) || rawCtx <= 0
    ? DEFAULT_CTX
    : Math.min(rawCtx, maxCtx);

  // Batch size — clamp to [1, 32]
  const rawBatch = parseInt(params.get('batch') ?? String(DEFAULT_BATCH), 10);
  const batch = isNaN(rawBatch) ? DEFAULT_BATCH : Math.max(1, Math.min(32, rawBatch));

  // Mode — fall back to default if unrecognized
  const rawMode = params.get('mode') ?? DEFAULT_MODE;
  const mode: WorkloadMode = VALID_MODES.includes(rawMode as WorkloadMode)
    ? (rawMode as WorkloadMode)
    : DEFAULT_MODE;

  // GPU (optional, for reverse mode)
  const gpu = params.get('gpu') ?? undefined;

  // Compare configs (optional)
  const compareRaw = params.get('compare');
  const compare = compareRaw ? compareRaw.split(',').filter(Boolean) : undefined;

  return {
    model: resolvedModel,
    precision,
    kvPrecision,
    ctx,
    batch,
    mode,
    gpu,
    compare,
    fallbackModel,
  };
}

/** Default calculator state */
export function getDefaultState(modelDb: ModelSpec[]): CalculatorState {
  return {
    model: modelDb[0]?.id ?? '',
    precision: DEFAULT_PRECISION,
    kvPrecision: DEFAULT_KV_PRECISION,
    ctx: DEFAULT_CTX,
    batch: DEFAULT_BATCH,
    mode: DEFAULT_MODE,
  };
}

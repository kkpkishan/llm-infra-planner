/**
 * Dataset size estimation for LLM training.
 *
 * Raw text: ~4 bytes/token (UTF-8 average)
 * Tokenized: 2 bytes/token (uint16) or 4 bytes/token (uint32)
 * Compressed: ~50% of tokenized (gzip/zstd)
 * Preprocessing: tokens / (5M tokens/core/s) / numCores → minutes
 * Training FLOPs: 6 × N × D (full), 2 × N × D (LoRA forward-only)
 */

export interface DatasetEstimate {
  rawSizeGB: number;
  tokenizedSizeGB: number;
  compressedSizeGB: number;
  preprocessingTimeMin: number;
  trainingFLOPs: number;
  trainingFLOPsFormatted: string;
}

/**
 * Format a large number in scientific notation: "1.2 × 10²³"
 */
function formatScientific(n: number): string {
  if (n === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / Math.pow(10, exp);
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
  };
  const expStr = String(exp)
    .split('')
    .map(c => superscripts[c] ?? c)
    .join('');
  return `${mantissa.toFixed(2)} × 10${expStr}`;
}

/**
 * Estimate dataset storage and compute requirements.
 *
 * @param numTokens - total number of tokens in the dataset
 * @param numParams - model parameter count
 * @param trainingMethod - 'full' for 6ND FLOPs, 'lora' for 2ND FLOPs
 * @param numCores - CPU cores for preprocessing estimate (default: 8)
 */
export function estimateDataset(
  numTokens: number,
  numParams: number,
  trainingMethod: 'full' | 'lora',
  numCores = 8
): DatasetEstimate {
  // Raw text: ~4 bytes/token
  const rawSizeGB = (numTokens * 4) / 1e9;

  // Tokenized: 2 bytes/token (uint16 token IDs, sufficient for vocab ≤ 65536)
  const tokenizedSizeGB = (numTokens * 2) / 1e9;

  // Compressed: ~50% of tokenized
  const compressedSizeGB = tokenizedSizeGB * 0.5;

  // Preprocessing time: tokens / (5M tokens/core/s) → seconds → minutes
  const tokensPerCorePerSec = 5_000_000;
  const preprocessingTimeSec = numTokens / (tokensPerCorePerSec * numCores);
  const preprocessingTimeMin = preprocessingTimeSec / 60;

  // Training FLOPs
  // Full training: 6 × N × D (forward + backward + optimizer)
  // LoRA: 2 × N × D (forward pass only for frozen layers)
  const flopsMultiplier = trainingMethod === 'full' ? 6 : 2;
  const trainingFLOPs = flopsMultiplier * numParams * numTokens;
  const trainingFLOPsFormatted = formatScientific(trainingFLOPs);

  return {
    rawSizeGB,
    tokenizedSizeGB,
    compressedSizeGB,
    preprocessingTimeMin,
    trainingFLOPs,
    trainingFLOPsFormatted,
  };
}

/** Reference datasets for comparison */
export const REFERENCE_DATASETS = [
  { name: 'FineWeb', tokens: 15e12, rawSizeGB: 44_000, description: '15T tokens, 44TB raw' },
  { name: 'The Pile', tokens: 825e9 / 2, rawSizeGB: 825, description: '825GB raw text' },
  { name: 'SlimPajama', tokens: 627e9, rawSizeGB: 627e9 * 4 / 1e9, description: '627B tokens' },
  { name: 'Typical SFT (small)', tokens: 10_000 * 512, rawSizeGB: 10_000 * 512 * 4 / 1e9, description: '10k examples × 512 tokens' },
  { name: 'Typical SFT (large)', tokens: 1_000_000 * 512, rawSizeGB: 1_000_000 * 512 * 4 / 1e9, description: '1M examples × 512 tokens' },
] as const;

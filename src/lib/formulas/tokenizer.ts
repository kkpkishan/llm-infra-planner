/**
 * Tokenizer impact calculations: embedding VRAM, vocab %, fertility.
 */

/**
 * Compute embedding layer VRAM in GB.
 * Formula: vocab_size × hidden_size × (1 if tied else 2) × bytes_per_param / 1e9
 */
export function computeEmbeddingVRAM(
  vocabSize: number,
  hiddenSize: number,
  bytesPerParam: number,
  tieWordEmbeddings: boolean
): number {
  const multiplier = tieWordEmbeddings ? 1 : 2;
  return (vocabSize * hiddenSize * multiplier * bytesPerParam) / 1e9;
}

/**
 * Compute vocab size as a percentage of total model parameters.
 * Accounts for both input and output embedding matrices.
 */
export function computeVocabPercent(
  vocabSize: number,
  hiddenSize: number,
  totalParams: number
): number {
  if (totalParams <= 0) return 0;
  // Both input + output embedding matrices
  const embeddingParams = vocabSize * hiddenSize * 2;
  return (embeddingParams / totalParams) * 100;
}

export type FertilityLanguage = 'en' | 'zh' | 'ja' | 'ko' | 'ar' | 'other';

/** Returns tokens/word fertility estimate for a given language */
export function getFertility(language: FertilityLanguage): number {
  switch (language) {
    case 'en':    return 1.2;
    case 'zh':    return 2.5;
    case 'ja':    return 2.8;
    case 'ko':    return 2.3;
    case 'ar':    return 1.8;
    case 'other': return 1.5;
  }
}

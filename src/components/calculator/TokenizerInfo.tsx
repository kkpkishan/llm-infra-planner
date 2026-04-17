import { cn } from '@/lib/utils';
import type { ModelSpec } from '@/lib/formulas/types';
import { computeEmbeddingVRAM, computeVocabPercent, getFertility } from '@/lib/formulas/tokenizer';

interface TokenizerInfoProps {
  model: ModelSpec;
  bytesPerParam: number;
  className?: string;
}

/** Infer tokenizer type from model family */
function getTokenizerType(model: ModelSpec): string {
  const family = model.family.toLowerCase();
  if (family === 'llama' || family === 'mistral' || family === 'phi' || family === 'qwen') {
    return 'BPE (tiktoken-style)';
  }
  if (family === 'gemma') {
    return 'SentencePiece';
  }
  if (family === 'deepseek') {
    return 'BPE';
  }
  return 'BPE';
}

export function TokenizerInfo({ model, bytesPerParam, className }: TokenizerInfoProps) {
  const arch = model.architecture;
  const tokenizerType = getTokenizerType(model);

  const embeddingGB = computeEmbeddingVRAM(
    arch.vocabSize,
    arch.hiddenSize,
    bytesPerParam,
    arch.tieWordEmbeddings
  );

  const vocabPercent = computeVocabPercent(
    arch.vocabSize,
    arch.hiddenSize,
    model.paramsTotal
  );

  const fertilityEn = getFertility('en');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-xs font-medium text-fg-default">Tokenizer</span>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
        <span className="text-fg-muted">Type</span>
        <span className="font-mono text-fg-default text-right">{tokenizerType}</span>

        <span className="text-fg-muted">Vocab size</span>
        <span className="font-mono text-fg-default text-right">{arch.vocabSize.toLocaleString()}</span>

        <span className="text-fg-muted">Tied embeddings</span>
        <span className="font-mono text-fg-default text-right">{arch.tieWordEmbeddings ? 'Yes' : 'No'}</span>

        <span className="text-fg-muted">Embedding VRAM</span>
        <span className="font-mono text-fg-default text-right">{embeddingGB.toFixed(2)} GB</span>

        <span className="text-fg-muted">Vocab % of params</span>
        <span className={cn('font-mono text-right', vocabPercent > 20 ? 'text-yellow-500' : 'text-fg-default')}>
          {vocabPercent.toFixed(1)}%
        </span>

        <span className="text-fg-muted">Fertility (EN)</span>
        <span className="font-mono text-fg-default text-right">~{fertilityEn} tok/word</span>
      </div>

      {vocabPercent > 20 && (
        <p className="text-[10px] text-yellow-600 dark:text-yellow-400 italic">
          Large vocab: embedding layer is {vocabPercent.toFixed(0)}% of model params
        </p>
      )}

      <p className="text-[10px] text-fg-muted italic">
        Larger vocab = bigger embedding layer but fewer tokens per document = faster processing per word
      </p>
    </div>
  );
}

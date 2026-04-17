import * as React from 'react';
import { cn } from '@/lib/utils';
import { estimateDataset, REFERENCE_DATASETS } from '@/lib/formulas/dataset';

type InputMode = 'tokens' | 'rows';
type DataFormat = 'jsonl' | 'parquet' | 'hf';

interface DatasetEstimatorProps {
  numParams: number;
  trainingMethod: 'full' | 'lora';
  className?: string;
}

function formatGB(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1000).toFixed(0)} MB`;
}

function formatTime(minutes: number): string {
  if (minutes < 1) return `${(minutes * 60).toFixed(0)}s`;
  if (minutes < 60) return `${minutes.toFixed(0)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

const FORMAT_OVERHEAD: Record<DataFormat, number> = {
  jsonl: 1.0,
  parquet: 0.6,   // Parquet is more compact
  hf: 0.8,        // HF Datasets with Arrow
};

export function DatasetEstimator({ numParams, trainingMethod, className }: DatasetEstimatorProps) {
  const [inputMode, setInputMode] = React.useState<InputMode>('tokens');
  const [numTokens, setNumTokens] = React.useState(1_000_000_000); // 1B tokens
  const [numRows, setNumRows] = React.useState(100_000);
  const [avgSeqLen, setAvgSeqLen] = React.useState(512);
  const [format, setFormat] = React.useState<DataFormat>('jsonl');
  const [numCores, setNumCores] = React.useState(8);

  const effectiveTokens = inputMode === 'tokens' ? numTokens : numRows * avgSeqLen;

  const estimate = estimateDataset(effectiveTokens, numParams, trainingMethod, numCores);
  const formatMultiplier = FORMAT_OVERHEAD[format];

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Input mode toggle */}
      <div className="flex gap-1">
        {(['tokens', 'rows'] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setInputMode(m)}
            className={cn(
              'flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
              inputMode === m
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis'
            )}
          >
            {m === 'tokens' ? 'By tokens' : 'By rows'}
          </button>
        ))}
      </div>

      {/* Inputs */}
      {inputMode === 'tokens' ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="num-tokens" className="text-xs font-medium text-fg-default">
            Number of tokens
          </label>
          <input
            id="num-tokens"
            type="number"
            min={1_000_000}
            step={1_000_000}
            value={numTokens}
            onChange={(e) => setNumTokens(parseInt(e.target.value) || 1_000_000)}
            className="h-8 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="num-rows" className="text-xs font-medium text-fg-default">Rows</label>
            <input
              id="num-rows"
              type="number"
              min={1}
              value={numRows}
              onChange={(e) => setNumRows(parseInt(e.target.value) || 1)}
              className="h-8 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="avg-seq-len" className="text-xs font-medium text-fg-default">Avg seq len</label>
            <input
              id="avg-seq-len"
              type="number"
              min={1}
              value={avgSeqLen}
              onChange={(e) => setAvgSeqLen(parseInt(e.target.value) || 512)}
              className="h-8 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Format + cores */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="data-format" className="text-xs font-medium text-fg-default">Format</label>
          <select
            id="data-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as DataFormat)}
            className="h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="jsonl">JSONL</option>
            <option value="parquet">Parquet</option>
            <option value="hf">HF Datasets</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 w-20">
          <label htmlFor="num-cores" className="text-xs font-medium text-fg-default">CPU cores</label>
          <input
            id="num-cores"
            type="number"
            min={1}
            max={256}
            value={numCores}
            onChange={(e) => setNumCores(parseInt(e.target.value) || 8)}
            className="h-8 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Results */}
      <div className="rounded-md border border-border-subtle bg-bg-subtle p-2.5 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-fg-muted">Tokens</span>
          <span className="font-mono text-fg-default">{(effectiveTokens / 1e9).toFixed(2)}B</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-fg-muted">Raw size ({format.toUpperCase()})</span>
          <span className="font-mono text-fg-default">{formatGB(estimate.rawSizeGB * formatMultiplier)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-fg-muted">Tokenized (uint16)</span>
          <span className="font-mono text-fg-default">{formatGB(estimate.tokenizedSizeGB)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-fg-muted">Compressed est.</span>
          <span className="font-mono text-fg-default">{formatGB(estimate.compressedSizeGB)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-fg-muted">Preprocessing ({numCores} cores)</span>
          <span className="font-mono text-fg-default">{formatTime(estimate.preprocessingTimeMin)}</span>
        </div>
        <div className="pt-1 border-t border-border-subtle flex justify-between text-xs">
          <span className="text-fg-muted">Training FLOPs ({trainingMethod === 'full' ? '6ND' : '2ND'})</span>
          <span className="font-mono font-bold text-accent">{estimate.trainingFLOPsFormatted}</span>
        </div>
      </div>

      {/* Reference datasets */}
      <details className="text-xs">
        <summary className="cursor-pointer text-fg-muted hover:text-fg-default transition-colors">
          Reference datasets
        </summary>
        <div className="mt-2 space-y-1">
          {REFERENCE_DATASETS.map((ds) => (
            <button
              key={ds.name}
              onClick={() => {
                setInputMode('tokens');
                setNumTokens(ds.tokens);
              }}
              className="w-full flex justify-between px-2 py-1 rounded hover:bg-bg-emphasis transition-colors text-left"
            >
              <span className="text-fg-default">{ds.name}</span>
              <span className="text-fg-muted">{ds.description}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Preset {
  label: string;
  promptTokens: number;
  outputTokens: number;
  description: string;
}

const PRESETS: Preset[] = [
  { label: 'Chat', promptTokens: 512, outputTokens: 256, description: 'Conversational assistant' },
  { label: 'Code', promptTokens: 2048, outputTokens: 512, description: 'Code completion / generation' },
  { label: 'RAG', promptTokens: 8192, outputTokens: 512, description: 'Retrieval-augmented Q&A' },
  { label: 'Summarization', promptTokens: 16384, outputTokens: 1024, description: 'Document summarization' },
  { label: 'Translation', promptTokens: 4096, outputTokens: 4096, description: 'Language translation' },
  { label: 'Long-form', promptTokens: 1024, outputTokens: 4096, description: 'Long-form writing' },
  { label: 'Agent', promptTokens: 4096, outputTokens: 256, description: 'Agent / tool use (many rounds)' },
  { label: 'Custom', promptTokens: 1024, outputTokens: 256, description: 'Manual configuration' },
];

// Log-scale snap points for prompt tokens
const PROMPT_STEPS = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];
// Linear snap points for output tokens
const OUTPUT_STEPS = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];

function formatTokens(n: number): string {
  if (n >= 1024) return `${(n / 1024).toFixed(n % 1024 === 0 ? 0 : 1)}K`;
  return String(n);
}

function nearestStep(steps: number[], value: number): number {
  return steps.reduce((prev, curr) => Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);
}

function stepIndex(steps: number[], value: number): number {
  const nearest = nearestStep(steps, value);
  return steps.indexOf(nearest);
}

interface PromptOutputConfigProps {
  promptTokens: number;
  outputTokens: number;
  onPromptChange: (n: number) => void;
  onOutputChange: (n: number) => void;
}

export function PromptOutputConfig({
  promptTokens,
  outputTokens,
  onPromptChange,
  onOutputChange,
}: PromptOutputConfigProps) {
  const [selectedPreset, setSelectedPreset] = React.useState('Custom');

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESETS.find(p => p.label === e.target.value);
    if (preset) {
      setSelectedPreset(preset.label);
      if (preset.label !== 'Custom') {
        onPromptChange(preset.promptTokens);
        onOutputChange(preset.outputTokens);
      }
    }
  };

  const handlePromptSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    onPromptChange(PROMPT_STEPS[idx]);
    setSelectedPreset('Custom');
  };

  const handleOutputSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    onOutputChange(OUTPUT_STEPS[idx]);
    setSelectedPreset('Custom');
  };

  const promptIdx = stepIndex(PROMPT_STEPS, promptTokens);
  const outputIdx = stepIndex(OUTPUT_STEPS, outputTokens);
  const currentPreset = PRESETS.find(p => p.label === selectedPreset);

  return (
    <div className="flex flex-col gap-3">
      {/* Preset selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-fg-default whitespace-nowrap">Use case:</label>
        <select
          value={selectedPreset}
          onChange={handlePresetChange}
          className="flex-1 h-7 px-2 rounded border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {PRESETS.map(p => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
        </select>
      </div>
      {currentPreset && currentPreset.label !== 'Custom' && (
        <p className="text-[10px] text-fg-muted">{currentPreset.description}</p>
      )}

      {/* Prompt tokens slider */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fg-default">Avg prompt tokens</label>
          <span className="text-xs font-mono text-fg-primary">{formatTokens(promptTokens)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={PROMPT_STEPS.length - 1}
          step={1}
          value={promptIdx}
          onChange={handlePromptSlider}
          className={cn(
            'w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
          )}
          aria-label="Average prompt tokens"
        />
        <p className="text-[9px] text-fg-muted">Affects TTFT and KV cache size</p>
      </div>

      {/* Output tokens slider */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fg-default">Avg output tokens</label>
          <span className="text-xs font-mono text-fg-primary">{formatTokens(outputTokens)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={OUTPUT_STEPS.length - 1}
          step={1}
          value={outputIdx}
          onChange={handleOutputSlider}
          className={cn(
            'w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
          )}
          aria-label="Average output tokens"
        />
        <p className="text-[9px] text-fg-muted">Affects total generation time and KV cache size</p>
      </div>
    </div>
  );
}

import * as React from 'react';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdvancedSettings, TrainingOptions, WorkloadMode } from '@/lib/formulas/types';
import { InfoTooltip } from '@/components/primitives/InfoTooltip';
import { TrainingMethodPicker } from './TrainingMethodPicker';
import { LoRAConfig } from './LoRAConfig';
import { DatasetEstimator } from './DatasetEstimator';
import { FormatRecommendation } from './FormatRecommendation';
import { computeTrainingMethodMemory } from '@/lib/formulas/training-methods';
import type { TrainingMethodId } from '@/lib/formulas/training-methods';
import type { ModelSpec } from '@/lib/formulas/types';
import type { LoRAModuleName } from '@/lib/formulas/lora';

interface AdvancedPanelProps {
  mode: WorkloadMode;
  advancedSettings: AdvancedSettings;
  trainingOptions: TrainingOptions;
  selectedModel?: ModelSpec | null;
  onAdvancedSettingsChange: (settings: Partial<AdvancedSettings>) => void;
  onTrainingOptionsChange: (options: Partial<TrainingOptions>) => void;
  className?: string;
}

const FRAMEWORK_OPTIONS = [
  { value: 'vllm', label: 'vLLM' },
  { value: 'llama.cpp', label: 'llama.cpp' },
  { value: 'tgi', label: 'TGI' },
  { value: 'tensorrt-llm', label: 'TensorRT-LLM' },
];

const TOKENIZER_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'tiktoken', label: 'tiktoken' },
  { value: 'sentencepiece', label: 'SentencePiece' },
  { value: 'huggingface', label: 'HuggingFace' },
];

const TRAINING_MODE_OPTIONS = [
  { value: 'full', label: 'Full Fine-tune' },
  { value: 'lora', label: 'LoRA' },
  { value: 'qlora', label: 'QLoRA' },
];

export function AdvancedPanel({
  mode,
  advancedSettings,
  trainingOptions,
  selectedModel,
  onAdvancedSettingsChange,
  onTrainingOptionsChange,
  className,
}: AdvancedPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [loraModules, setLoraModules] = React.useState<LoRAModuleName[]>(['q_proj', 'k_proj', 'v_proj', 'o_proj']);

  const isTrainingMode = mode === 'finetune' || mode === 'train';

  const trainingMethodId = (trainingOptions.trainingMethodId ?? '') as TrainingMethodId | '';
  const isLoRAMethod = trainingMethodId === 'sft_lora' || trainingMethodId === 'sft_qlora';

  // Compute method memory for display
  const methodMemory = React.useMemo(() => {
    if (!trainingMethodId || !selectedModel) return null;
    const numParams = selectedModel.paramsTotal;
    const arch = selectedModel.architecture;
    // Simple trainable params estimate for display
    const loraRank = trainingOptions.loraRank ?? 8;
    const trainableParams = loraModules.reduce((sum, name) => {
      const h = arch.hiddenSize;
      const i = arch.intermediateSize;
      const shapes: Record<LoRAModuleName, { dIn: number; dOut: number }> = {
        q_proj: { dIn: h, dOut: h }, k_proj: { dIn: h, dOut: h },
        v_proj: { dIn: h, dOut: h }, o_proj: { dIn: h, dOut: h },
        gate_proj: { dIn: h, dOut: i }, up_proj: { dIn: h, dOut: i },
        down_proj: { dIn: i, dOut: h },
      };
      return sum + loraRank * (shapes[name].dIn + shapes[name].dOut);
    }, 0) * arch.numLayers;
    return computeTrainingMethodMemory(
      trainingMethodId as TrainingMethodId,
      numParams,
      trainableParams,
      2, // placeholder activations
      2  // BF16
    );
  }, [trainingMethodId, selectedModel, trainingOptions.loraRank, loraModules]);

  return (
    <div className={cn('flex flex-col border border-border-subtle rounded-lg', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 text-sm font-medium text-fg-default hover:bg-bg-subtle transition-colors rounded-t-lg"
        aria-expanded={isExpanded}
        aria-controls="advanced-panel-content"
      >
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-fg-muted" />
          <span>Advanced Settings</span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Content */}
      {isExpanded && (
        <div id="advanced-panel-content" className="px-4 py-3 border-t border-border-subtle space-y-4">
          {/* Framework Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="framework-select" className="text-xs font-medium text-fg-default flex items-center gap-1.5">
              Serving Framework
              <InfoTooltip paramKey="servingFramework" />
            </label>
            <select
              id="framework-select"
              value={advancedSettings.framework}
              onChange={(e) => onAdvancedSettingsChange({ framework: e.target.value })}
              className="h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {FRAMEWORK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Overhead Multiplier */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="overhead-input" className="text-xs font-medium text-fg-default flex items-center gap-1.5">
              Overhead Multiplier
              <InfoTooltip paramKey="overheadMultiplier" />
            </label>
            <div className="flex items-center gap-2">
              <input
                id="overhead-input"
                type="number"
                min={0.5}
                max={2.0}
                step={0.1}
                value={advancedSettings.overheadMultiplier}
                onChange={(e) =>
                  onAdvancedSettingsChange({
                    overheadMultiplier: parseFloat(e.target.value) || 1.0,
                  })
                }
                className="flex-1 h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-xs text-fg-muted">×</span>
            </div>
            <p className="text-[10px] text-fg-muted">
              Adjust CUDA context and framework overhead (default: 1.0)
            </p>
          </div>

          {/* Tokenizer Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tokenizer-select" className="text-xs font-medium text-fg-default">
              Tokenizer
            </label>
            <select
              id="tokenizer-select"
              value={advancedSettings.tokenizer}
              onChange={(e) => onAdvancedSettingsChange({ tokenizer: e.target.value })}
              className="h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TOKENIZER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Training-specific options */}
          {isTrainingMode && (
            <>
              <div className="border-t border-border-subtle pt-4">
                <h4 className="text-xs font-semibold text-fg-default mb-3">Training Options</h4>

                {/* Training Method Picker */}
                <div className="mb-4">
                  <TrainingMethodPicker
                    value={trainingMethodId}
                    memory={methodMemory}
                    onChange={(id) => onTrainingOptionsChange({ trainingMethodId: id || undefined })}
                  />
                </div>

                {/* Training Mode */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-xs font-medium text-fg-default flex items-center gap-1.5">
                    Training Mode
                    <InfoTooltip paramKey="trainingMode" />
                  </label>
                  <div className="flex gap-1">
                    {TRAINING_MODE_OPTIONS.map(opt => {
                      const isSelected = trainingOptions.mode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => onTrainingOptionsChange({ mode: opt.value as 'full' | 'lora' | 'qlora' })}
                          className={cn(
                            'flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                            'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected
                              ? 'bg-accent text-white border-accent'
                              : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis'
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gradient Checkpointing */}
                <div className="flex items-center justify-between mb-4">
                  <label htmlFor="gradient-checkpoint" className="text-xs font-medium text-fg-default flex items-center gap-1.5">
                    Gradient Checkpointing
                    <InfoTooltip paramKey="gradientCheckpointing" />
                  </label>
                  <button
                    id="gradient-checkpoint"
                    role="switch"
                    aria-checked={trainingOptions.gradientCheckpointing}
                    onClick={() =>
                      onTrainingOptionsChange({
                        gradientCheckpointing: !trainingOptions.gradientCheckpointing,
                      })
                    }
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      trainingOptions.gradientCheckpointing ? 'bg-accent' : 'bg-bg-emphasis'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        trainingOptions.gradientCheckpointing ? 'translate-x-[18px]' : 'translate-x-[2px]'
                      )}
                    />
                  </button>
                </div>

                {/* LoRA Config (for LoRA/QLoRA methods) */}
                {(isLoRAMethod || trainingOptions.mode === 'lora' || trainingOptions.mode === 'qlora') && selectedModel && (
                  <div className="mb-4">
                    <LoRAConfig
                      rank={trainingOptions.loraRank ?? 8}
                      alpha={trainingOptions.loraRank ?? 8}
                      selectedModules={loraModules}
                      hiddenSize={selectedModel.architecture.hiddenSize}
                      intermediateSize={selectedModel.architecture.intermediateSize}
                      numLayers={selectedModel.architecture.numLayers}
                      numParams={selectedModel.paramsTotal}
                      fullFinetuneGB={(selectedModel.paramsTotal * 16) / 1e9}
                      onRankChange={(rank) => onTrainingOptionsChange({ loraRank: rank })}
                      onAlphaChange={() => {/* alpha stored locally */}}
                      onModulesChange={setLoraModules}
                    />
                  </div>
                )}

                {/* Legacy LoRA Rank input (when no method selected) */}
                {!trainingMethodId && (trainingOptions.mode === 'lora' || trainingOptions.mode === 'qlora') && (
                  <div className="flex flex-col gap-1.5 mb-4">
                    <label htmlFor="lora-rank" className="text-xs font-medium text-fg-default flex items-center gap-1.5">
                      LoRA Rank
                      <InfoTooltip paramKey="loraRank" />
                    </label>
                    <input
                      id="lora-rank"
                      type="number"
                      min={1}
                      max={256}
                      step={1}
                      value={trainingOptions.loraRank || 8}
                      onChange={(e) =>
                        onTrainingOptionsChange({
                          loraRank: parseInt(e.target.value, 10) || 8,
                        })
                      }
                      className="h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-[10px] text-fg-muted">
                      Rank of LoRA adapters (typical: 8-64)
                    </p>
                  </div>
                )}

                {/* Dataset Estimator */}
                {selectedModel && (
                  <div className="border-t border-border-subtle pt-4 mb-4">
                    <h4 className="text-xs font-semibold text-fg-default mb-3">Dataset Estimator</h4>
                    <DatasetEstimator
                      numParams={selectedModel.paramsTotal}
                      trainingMethod={
                        trainingOptions.mode === 'lora' || trainingOptions.mode === 'qlora' || isLoRAMethod
                          ? 'lora'
                          : 'full'
                      }
                    />
                  </div>
                )}

                {/* Format Recommendation */}
                <div className="border-t border-border-subtle pt-4">
                  <h4 className="text-xs font-semibold text-fg-default mb-3">Export Format</h4>
                  <FormatRecommendation />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
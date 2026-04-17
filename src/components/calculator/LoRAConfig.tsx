import { cn } from '@/lib/utils';
import { LORA_RANK_STEPS, LORA_MODULE_NAMES, computeLoRAParams } from '@/lib/formulas/lora';import type { LoRAModuleName } from '@/lib/formulas/lora';

interface LoRAConfigProps {
  rank: number;
  alpha: number;
  selectedModules: LoRAModuleName[];
  hiddenSize: number;
  intermediateSize: number;
  numLayers: number;
  numParams: number;
  fullFinetuneGB: number;   // VRAM for full fine-tune (for savings display)
  onRankChange: (rank: number) => void;
  onAlphaChange: (alpha: number) => void;
  onModulesChange: (modules: LoRAModuleName[]) => void;
  className?: string;
}

function formatParams(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

export function LoRAConfig({
  rank,
  alpha,
  selectedModules,
  hiddenSize,
  intermediateSize,
  numLayers,
  numParams,
  fullFinetuneGB,
  onRankChange,
  onAlphaChange,
  onModulesChange,
  className,
}: LoRAConfigProps) {
  // Compute trainable params from selected modules
  const moduleShapes: Record<LoRAModuleName, { dIn: number; dOut: number }> = {
    q_proj:    { dIn: hiddenSize, dOut: hiddenSize },
    k_proj:    { dIn: hiddenSize, dOut: hiddenSize },
    v_proj:    { dIn: hiddenSize, dOut: hiddenSize },
    o_proj:    { dIn: hiddenSize, dOut: hiddenSize },
    gate_proj: { dIn: hiddenSize, dOut: intermediateSize },
    up_proj:   { dIn: hiddenSize, dOut: intermediateSize },
    down_proj: { dIn: intermediateSize, dOut: hiddenSize },
  };

  const targetModules = selectedModules.map((name) => ({
    name,
    ...moduleShapes[name],
  }));

  // Multiply by numLayers (LoRA applied to every layer)
  const perLayerParams = computeLoRAParams({ rank, alpha, targetModules });
  const trainableParams = perLayerParams * numLayers;
  const trainablePercent = numParams > 0 ? (trainableParams / numParams) * 100 : 0;

  // VRAM savings vs full fine-tune
  // LoRA VRAM ≈ 2N (frozen) + 16 × N_trainable
  const loraVRAMGB =
    (numParams * 2) / 1e9 + (trainableParams * 16) / 1e9;
  const savingsGB = fullFinetuneGB - loraVRAMGB;
  const savingsPct = fullFinetuneGB > 0 ? (savingsGB / fullFinetuneGB) * 100 : 0;

  const rankIndex = LORA_RANK_STEPS.indexOf(rank as (typeof LORA_RANK_STEPS)[number]);

  function toggleModule(name: LoRAModuleName) {
    if (selectedModules.includes(name)) {
      onModulesChange(selectedModules.filter((m) => m !== name));
    } else {
      onModulesChange([...selectedModules, name]);
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Rank slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fg-default">LoRA Rank</label>
          <span className="text-xs font-mono font-bold text-accent">{rank}</span>
        </div>
        <input
          type="range"
          min={0}
          max={LORA_RANK_STEPS.length - 1}
          step={1}
          value={rankIndex >= 0 ? rankIndex : 1}
          onChange={(e) => onRankChange(LORA_RANK_STEPS[parseInt(e.target.value)])}
          className="w-full accent-accent"
          aria-label="LoRA rank"
        />
        <div className="flex justify-between text-[10px] text-fg-muted">
          {LORA_RANK_STEPS.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>
      </div>

      {/* Alpha input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lora-alpha" className="text-xs font-medium text-fg-default">
          Alpha (scaling)
        </label>
        <input
          id="lora-alpha"
          type="number"
          min={1}
          max={512}
          value={alpha}
          onChange={(e) => onAlphaChange(parseInt(e.target.value, 10) || rank)}
          className="h-8 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-[10px] text-fg-muted">Effective LR scale = alpha / rank = {(alpha / rank).toFixed(2)}</p>
      </div>

      {/* Target modules */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-fg-default">Target Modules</label>
        <div className="grid grid-cols-2 gap-1">
          {LORA_MODULE_NAMES.map((name) => {
            const checked = selectedModules.includes(name);
            return (
              <label
                key={name}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs cursor-pointer transition-colors',
                  checked
                    ? 'border-accent bg-accent/10 text-fg-default'
                    : 'border-border-subtle bg-bg-muted text-fg-muted hover:bg-bg-emphasis'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleModule(name)}
                  className="accent-accent"
                />
                <span className="font-mono">{name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-md border border-border-subtle bg-bg-subtle p-2.5 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-fg-muted">Trainable params</span>
          <span className="font-mono font-bold text-fg-default">
            {formatParams(trainableParams)} ({trainablePercent.toFixed(2)}%)
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-fg-muted">LoRA VRAM est.</span>
          <span className="font-mono text-fg-default">{loraVRAMGB.toFixed(1)} GB</span>
        </div>
        {savingsGB > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-fg-muted">Savings vs full FT</span>
            <span className="font-mono text-green-500">
              −{savingsGB.toFixed(1)} GB ({savingsPct.toFixed(0)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

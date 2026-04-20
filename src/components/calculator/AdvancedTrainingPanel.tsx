import * as React from 'react';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeGradAccumulation,
  computeSequencePacking,
  computeFlashAttentionSavings,
  computeActivationCheckpointing,
  type CheckpointMode,
} from '@/lib/formulas/training-advanced';

interface AdvancedTrainingPanelProps {
  numLayers: number;
  numHeads: number;
  seqLen: number;
  batchSize: number;
  bytesPerParam: number;
  activationsGB: number;
  className?: string;
}

function KVRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-fg-muted flex-shrink-0 w-44">{label}</span>
      <span className={cn('text-xs font-mono text-right break-all', highlight ? 'text-accent font-semibold' : 'text-fg-default')}>
        {value}
      </span>
    </div>
  );
}

function Toggle({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-accent' : 'bg-bg-emphasis'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );
}

const CHECKPOINT_MODES: { value: CheckpointMode; label: string }[] = [
  { value: 'none',      label: 'None' },
  { value: 'selective', label: 'Selective' },
  { value: 'full',      label: 'Full' },
];

export function AdvancedTrainingPanel({
  numLayers,
  numHeads,
  seqLen,
  batchSize,
  bytesPerParam,
  activationsGB,
  className,
}: AdvancedTrainingPanelProps) {
  const [accumSteps, setAccumSteps] = React.useState(4);
  const [sequencePacking, setSequencePacking] = React.useState(false);
  const [flashAttention, setFlashAttention] = React.useState(true);
  const [checkpointMode, setCheckpointMode] = React.useState<CheckpointMode>('selective');

  const avgSeqLen = seqLen * 0.6; // assume 60% average fill

  const gradAccum = computeGradAccumulation(batchSize, accumSteps);
  const seqPacking = computeSequencePacking(avgSeqLen, seqLen, sequencePacking);
  const flashAttn = computeFlashAttentionSavings(numLayers, numHeads, seqLen, batchSize, bytesPerParam, flashAttention);
  const ckpt = computeActivationCheckpointing(activationsGB, numLayers, checkpointMode);

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Brain size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Advanced Training
        </h3>
      </div>

      <div className="space-y-3 mb-4">
        {/* Gradient Accumulation */}
        <div className="flex items-center gap-2">
          <label htmlFor="accum-steps" className="text-xs text-fg-muted w-44 flex-shrink-0">Grad Accum Steps</label>
          <input
            id="accum-steps"
            type="number"
            min={1}
            max={256}
            step={1}
            value={accumSteps}
            onChange={(e) => setAccumSteps(parseInt(e.target.value, 10) || 1)}
            className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Sequence Packing */}
        <div className="flex items-center justify-between">
          <label htmlFor="seq-packing" className="text-xs text-fg-muted">Sequence Packing</label>
          <Toggle id="seq-packing" checked={sequencePacking} onChange={setSequencePacking} />
        </div>

        {/* FlashAttention */}
        <div className="flex items-center justify-between">
          <label htmlFor="flash-attn" className="text-xs text-fg-muted">FlashAttention</label>
          <Toggle id="flash-attn" checked={flashAttention} onChange={setFlashAttention} />
        </div>

        {/* Activation Checkpointing Mode */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-muted">Activation Checkpointing</label>
          <div className="flex gap-1">
            {CHECKPOINT_MODES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCheckpointMode(value)}
                className={cn(
                  'flex-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors',
                  checkpointMode === value
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Outputs */}
      <div className="border-t border-border-subtle pt-3 flex flex-col">
        <KVRow label="Effective Batch" value={`${gradAccum.effectiveBatch}`} highlight />
        <KVRow label="Grad Accum VRAM" value={`+${gradAccum.extraVRAMGB} GB`} />
        <KVRow label="Seq Utilization" value={`${seqPacking.utilizationPercent.toFixed(1)}%`} highlight />
        <KVRow label="Throughput ×" value={`${seqPacking.effectiveThroughputMultiplier.toFixed(2)}×`} />
        <KVRow label="Attn Score Mem" value={`${flashAttn.attentionScoreGB.toFixed(2)} GB`} />
        <KVRow label="FlashAttn Saves" value={`${flashAttn.savedGB.toFixed(2)} GB`} highlight />
        <KVRow label="Activations" value={`${ckpt.reducedActivationsGB.toFixed(2)} GB`} highlight />
        <KVRow label="Compute Overhead" value={`+${ckpt.computeOverheadPercent}%`} />
      </div>
    </div>
  );
}

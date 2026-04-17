import { cn } from '@/lib/utils';
import type { TrainingMethodId, TrainingMethodMemory } from '@/lib/formulas/training-methods';
import {
  TRAINING_METHOD_LABELS,
  TRAINING_METHOD_FORMULA,
  TRAINING_METHOD_GROUPS,
} from '@/lib/formulas/training-methods';

interface TrainingMethodPickerProps {
  value: TrainingMethodId | '';
  memory?: TrainingMethodMemory | null;
  onChange: (method: TrainingMethodId | '') => void;
  className?: string;
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  if (value <= 0) return null;
  return (
    <div className="flex justify-between text-xs">
      <span className="text-fg-muted">{label}</span>
      <span className="font-mono text-fg-default">{value.toFixed(1)} GB</span>
    </div>
  );
}

export function TrainingMethodPicker({
  value,
  memory,
  onChange,
  className,
}: TrainingMethodPickerProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor="training-method-select" className="text-xs font-medium text-fg-default">
        Training Method
      </label>

      <select
        id="training-method-select"
        value={value}
        onChange={(e) => onChange(e.target.value as TrainingMethodId | '')}
        className="h-9 px-3 rounded-md border border-border-subtle bg-bg-muted text-sm text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">— Select method —</option>
        {TRAINING_METHOD_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.methods.map((id) => (
              <option key={id} value={id}>
                {TRAINING_METHOD_LABELS[id]} — {TRAINING_METHOD_FORMULA[id]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Memory breakdown card */}
      {memory && value && (
        <div className="rounded-md border border-border-subtle bg-bg-subtle p-3 space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-fg-default">
              {TRAINING_METHOD_LABELS[value]}
            </span>
            <span className="text-xs font-mono font-bold text-accent">
              {memory.totalGB.toFixed(1)} GB
            </span>
          </div>

          <BreakdownRow label="Weights" value={memory.breakdown.weightsGB} />
          <BreakdownRow label="Gradients" value={memory.breakdown.gradientsGB} />
          <BreakdownRow label="Optimizer" value={memory.breakdown.optimizerGB} />
          <BreakdownRow label="Activations" value={memory.breakdown.activationsGB} />
          <BreakdownRow label="Extra models" value={memory.breakdown.extraModelsGB} />

          <div className="pt-1 border-t border-border-subtle">
            <p className="text-[10px] text-fg-muted">{memory.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}

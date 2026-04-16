import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StackRecommendation } from '@/lib/formulas/types';

interface StackPanelProps {
  stack: StackRecommendation;
  className?: string;
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-fg-muted flex-shrink-0 w-20">{label}</span>
      <span className="text-xs font-mono text-fg-default text-right break-all">{value}</span>
    </div>
  );
}

export function StackPanel({ stack, className }: StackPanelProps) {
  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Layers size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Software Stack
        </h3>
      </div>

      <div className="flex flex-col">
        <KVRow label="OS" value={stack.os} />
        <KVRow label="Driver" value={stack.driver} />
        <KVRow label="CUDA" value={stack.cuda} />
        <KVRow label="PyTorch" value={stack.pytorch} />
        <KVRow label="Container" value={stack.container} />
        <KVRow label="Monitoring" value={stack.monitoring} />
      </div>
    </div>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <div className="w-8 h-8 text-fg-muted flex items-center justify-center" aria-hidden="true">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-fg-default">{title}</h3>
        {description && (
          <p className="text-xs text-fg-muted max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

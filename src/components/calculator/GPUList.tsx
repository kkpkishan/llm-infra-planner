import { cn } from '@/lib/utils';
import { GPUCard } from './GPUCard';
import type { GPURecommendations } from '@/lib/formulas/types';

interface GPUListProps {
  recommendations: GPURecommendations;
  className?: string;
}

const TIERS = [
  { key: 'budget' as const,      label: 'Budget',      description: 'Under $1,000' },
  { key: 'balanced' as const,    label: 'Balanced',    description: '$1k – $3k' },
  { key: 'performance' as const, label: 'Performance', description: '$3k+' },
];

export function GPUList({ recommendations, className }: GPUListProps) {
  const hasTierRecs = TIERS.some(t => recommendations[t.key] !== null);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Tier recommendations */}
      {hasTierRecs && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Recommended
          </h3>
          <div className="flex flex-col gap-2">
            {TIERS.map(tier => {
              const fit = recommendations[tier.key];
              if (!fit) return null;
              return (
                <div key={tier.key}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                      {tier.label}
                    </span>
                    <span className="text-[10px] text-fg-muted">{tier.description}</span>
                  </div>
                  <GPUCard fit={fit} isRecommended />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All fits (collapsible) */}
      {recommendations.allFits.length > 0 && (
        <details className="group">
          <summary className="text-xs font-medium text-fg-muted cursor-pointer hover:text-fg-default transition-colors list-none flex items-center gap-1 select-none">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            All GPUs ({recommendations.allFits.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {recommendations.allFits.map(fit => (
              <GPUCard key={fit.gpu.id} fit={fit} />
            ))}
          </div>
        </details>
      )}

      {recommendations.allFits.length === 0 && !hasTierRecs && (
        <div className="text-sm text-fg-muted text-center py-8">
          No GPU recommendations available
        </div>
      )}
    </div>
  );
}

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CloudRecommendation } from '@/lib/formulas/types';

interface CloudRowProps {
  rec: CloudRecommendation;
}

// Provider color map for the 22px colored square logo
const PROVIDER_CONFIG: Record<string, { bg: string; initials: string }> = {
  aws:        { bg: 'bg-orange-500',  initials: 'AW' },
  azure:      { bg: 'bg-blue-500',    initials: 'AZ' },
  gcp:        { bg: 'bg-green-500',   initials: 'GC' },
  lambda:     { bg: 'bg-purple-500',  initials: 'LA' },
  runpod:     { bg: 'bg-pink-500',    initials: 'RP' },
  vast:       { bg: 'bg-cyan-500',    initials: 'VA' },
  coreweave:  { bg: 'bg-indigo-500',  initials: 'CW' },
};

function ProviderLogo({ provider }: { provider: string }) {
  const config = PROVIDER_CONFIG[provider.toLowerCase()] ?? { bg: 'bg-fg-muted', initials: provider.slice(0, 2).toUpperCase() };
  return (
    <div
      className={cn('w-[22px] h-[22px] rounded flex items-center justify-center flex-shrink-0', config.bg)}
      aria-label={provider}
    >
      <span className="text-[8px] font-bold text-white leading-none">{config.initials}</span>
    </div>
  );
}

export function CloudRow({ rec }: CloudRowProps) {
  const { instance, onDemandPerHour, spotPerHour, costPerMillionTokens, isBestPrice } = rec;
  const gpuSummary = instance.gpus.map(g => `${g.count}× ${g.id}`).join(', ');

  return (
    <tr className="border-b border-border-subtle hover:bg-bg-subtle transition-colors">
      {/* Provider */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ProviderLogo provider={instance.provider} />
          <span className="text-xs font-medium text-fg-default capitalize">{instance.provider}</span>
        </div>
      </td>

      {/* Instance type */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-mono text-fg-primary">{instance.instanceType}</span>
          <span className="text-[10px] text-fg-muted">{gpuSummary}</span>
        </div>
      </td>

      {/* Interconnect */}
      <td className="px-4 py-3">
        {instance.interconnect ? (
          <span className="text-[10px] font-mono text-fg-muted bg-bg-muted px-1.5 py-0.5 rounded">
            {instance.interconnect}
          </span>
        ) : (
          <span className="text-[10px] text-fg-muted">—</span>
        )}
      </td>

      {/* On-demand price */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {isBestPrice && (
            <Star
              size={12}
              className="text-yellow-500 fill-yellow-500 flex-shrink-0"
              aria-label="Best price"
            />
          )}
          <span className="text-xs font-mono font-semibold text-fg-primary tabular-nums">
            ${onDemandPerHour.toFixed(2)}/h
          </span>
        </div>
      </td>

      {/* Spot price */}
      <td className="px-4 py-3 text-right">
        {spotPerHour != null ? (
          <span className="text-xs font-mono text-fg-default tabular-nums">
            ${spotPerHour.toFixed(2)}/h
          </span>
        ) : (
          <span className="text-[10px] text-fg-muted">—</span>
        )}
      </td>

      {/* Cost per million tokens */}
      <td className="px-4 py-3 text-right">
        {costPerMillionTokens != null ? (
          <span className="text-xs font-mono text-fg-default tabular-nums">
            ${costPerMillionTokens.toFixed(2)}
          </span>
        ) : (
          <span className="text-[10px] text-fg-muted">—</span>
        )}
      </td>
    </tr>
  );
}

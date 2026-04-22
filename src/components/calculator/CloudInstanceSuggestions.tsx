import * as React from 'react';
import { Cloud, Star, Zap, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GPUSpec, CloudInstance } from '@/lib/formulas/types';

interface CloudInstanceSuggestionsProps {
  gpu: GPUSpec;
  cloudInstances: CloudInstance[];
  className?: string;
}

const PROVIDER_CONFIG: Record<string, { bg: string; initials: string; label: string; url: string }> = {
  aws:        { bg: 'bg-orange-500',  initials: 'AW', label: 'AWS',        url: 'https://aws.amazon.com/ec2/instance-types/' },
  azure:      { bg: 'bg-blue-500',    initials: 'AZ', label: 'Azure',      url: 'https://azure.microsoft.com/en-us/pricing/details/virtual-machines/' },
  gcp:        { bg: 'bg-green-500',   initials: 'GC', label: 'GCP',        url: 'https://cloud.google.com/compute/gpus-pricing' },
  lambda:     { bg: 'bg-purple-500',  initials: 'LA', label: 'Lambda',     url: 'https://lambdalabs.com/service/gpu-cloud' },
  runpod:     { bg: 'bg-pink-500',    initials: 'RP', label: 'RunPod',     url: 'https://www.runpod.io/gpu-instance/pricing' },
  vast:       { bg: 'bg-cyan-500',    initials: 'VA', label: 'Vast.ai',    url: 'https://vast.ai/' },
  coreweave:  { bg: 'bg-indigo-500',  initials: 'CW', label: 'CoreWeave',  url: 'https://www.coreweave.com/gpu-cloud-computing' },
  together:   { bg: 'bg-teal-500',    initials: 'TO', label: 'Together',   url: 'https://www.together.ai/' },
};

const INTERCONNECT_LABEL: Record<string, { label: string; color: string }> = {
  nvlink:           { label: 'NVLink',      color: 'bg-green-500/10 text-green-400' },
  nvswitch:         { label: 'NVSwitch',    color: 'bg-green-500/10 text-green-400' },
  'infiniband-400': { label: 'IB 400G',     color: 'bg-blue-500/10 text-blue-400' },
  'infiniband-800': { label: 'IB 800G',     color: 'bg-blue-500/10 text-blue-400' },
  rocev2:           { label: 'RoCE v2',     color: 'bg-cyan-500/10 text-cyan-400' },
  pcie:             { label: 'PCIe',        color: 'bg-bg-muted text-fg-muted' },
};

export function CloudInstanceSuggestions({ gpu, cloudInstances, className }: CloudInstanceSuggestionsProps) {
  // Find all cloud instances that contain this GPU
  const matching = React.useMemo(() => {
    return cloudInstances
      .filter(inst => inst.gpus.some(g => g.id === gpu.id))
      .sort((a, b) => a.pricing.onDemandUSDPerHour - b.pricing.onDemandUSDPerHour);
  }, [gpu.id, cloudInstances]);

  if (matching.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border-subtle p-4 flex flex-col gap-2', className)}>
        <div className="flex items-center gap-2 text-xs font-medium text-fg-muted">
          <Cloud size={13} />
          Cloud Deployment Options
        </div>
        <p className="text-xs text-fg-muted">
          No managed cloud instances found for {gpu.name}. Consider on-premise deployment or check bare-metal providers.
        </p>
      </div>
    );
  }

  const cheapest = matching[0];

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <Cloud size={13} className="text-fg-muted" />
        <span className="text-xs font-medium text-fg-default">
          Deploy {gpu.name} on Cloud
        </span>
        <span className="text-[10px] text-fg-muted ml-auto">{matching.length} option{matching.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
        {matching.map(inst => {
          const provCfg = PROVIDER_CONFIG[inst.provider.toLowerCase()] ?? {
            bg: 'bg-fg-muted', initials: inst.provider.slice(0, 2).toUpperCase(),
            label: inst.provider, url: '#',
          };
          const gpuEntry = inst.gpus.find(g => g.id === gpu.id)!;
          const interconnect = inst.interconnect ? INTERCONNECT_LABEL[inst.interconnect] : null;
          const isCheapest = inst.id === cheapest.id;

          return (
            <div
              key={inst.id}
              className={cn(
                'rounded-lg border p-3 flex items-center gap-3 transition-colors',
                isCheapest
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-border-subtle bg-bg-default hover:bg-bg-subtle'
              )}
            >
              {/* Provider badge */}
              <div className={cn('w-7 h-7 rounded flex items-center justify-center flex-shrink-0', provCfg.bg)}>
                <span className="text-[9px] font-bold text-white leading-none">{provCfg.initials}</span>
              </div>

              {/* Instance details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-fg-default">{provCfg.label}</span>
                  <span className="text-[10px] font-mono text-fg-muted">{inst.instanceType}</span>
                  {isCheapest && (
                    <span className="flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
                      <Star size={8} className="fill-yellow-500" /> Cheapest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-fg-muted">
                    {gpuEntry.count}× {gpu.name} · {gpuEntry.count * gpu.memoryGB} GB VRAM
                  </span>
                  {interconnect && (
                    <span className={cn('text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5', interconnect.color)}>
                      <Zap size={8} />{interconnect.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                <span className="text-xs font-mono font-semibold text-fg-primary tabular-nums">
                  ${inst.pricing.onDemandUSDPerHour.toFixed(2)}<span className="text-[10px] font-normal text-fg-muted">/hr</span>
                </span>
                {inst.pricing.spotUSDPerHour != null && (
                  <span className="text-[10px] font-mono text-green-400 tabular-nums">
                    ${inst.pricing.spotUSDPerHour.toFixed(2)} spot
                  </span>
                )}
              </div>

              {/* Link */}
              <a
                href={provCfg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-muted hover:text-accent transition-colors flex-shrink-0"
                aria-label={`Open ${provCfg.label}`}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={12} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

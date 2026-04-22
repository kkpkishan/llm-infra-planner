import * as React from 'react';
import { Cloud, Star, Zap, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GPUSpec, CloudInstance } from '@/lib/formulas/types';

interface CloudInstanceSuggestionsProps {
  gpu: GPUSpec;
  cloudInstances: CloudInstance[];
  className?: string;
}

const PROVIDER_CONFIG: Record<string, { label: string; url: string }> = {
  aws:        { label: 'AWS',        url: 'https://aws.amazon.com/ec2/instance-types/' },
  azure:      { label: 'Azure',      url: 'https://azure.microsoft.com/en-us/pricing/details/virtual-machines/' },
  gcp:        { label: 'GCP',        url: 'https://cloud.google.com/compute/gpus-pricing' },
  lambda:     { label: 'Lambda',     url: 'https://lambdalabs.com/service/gpu-cloud' },
  runpod:     { label: 'RunPod',     url: 'https://www.runpod.io/gpu-instance/pricing' },
  vast:       { label: 'Vast.ai',    url: 'https://vast.ai/' },
  coreweave:  { label: 'CoreWeave',  url: 'https://www.coreweave.com/gpu-cloud-computing' },
  together:   { label: 'Together',   url: 'https://www.together.ai/' },
  nebius:     { label: 'Nebius',     url: 'https://nebius.com/services/gpu-cloud' },
};

function ProviderLogo({ provider, size = 28 }: { provider: string; size?: number }) {
  const p = provider.toLowerCase();
  if (p === 'aws') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="AWS">
      <rect width="80" height="80" rx="8" fill="#232F3E"/>
      <path d="M24 46c0 1.1.4 2 1.1 2.6.7.6 1.7.9 2.9.9 1 0 1.9-.2 2.6-.7.7-.5 1.1-1.2 1.1-2.1 0-.8-.3-1.4-.8-1.8-.5-.4-1.4-.8-2.6-1.1l-1.2-.3c-.8-.2-1.4-.5-1.7-.8-.3-.3-.5-.7-.5-1.2 0-.6.2-1 .7-1.4.5-.3 1.1-.5 1.9-.5.7 0 1.3.2 1.8.5.5.3.7.8.8 1.4h1.5c-.1-1-.5-1.8-1.2-2.4-.7-.6-1.7-.9-2.9-.9-1.1 0-2 .3-2.7.8-.7.5-1 1.3-1 2.2 0 .8.3 1.4.8 1.9.5.5 1.3.8 2.4 1.1l1.3.3c.9.2 1.5.5 1.9.8.4.3.5.7.5 1.2 0 .6-.3 1.1-.8 1.4-.5.3-1.2.5-2 .5-.9 0-1.6-.2-2.1-.6-.5-.4-.8-1-.8-1.8H24zm13.5 3.3h1.5V38.8h-1.5v10.5zm0-12.3h1.5v-1.8h-1.5V37zm4.2 12.3h1.5v-5.8c0-.9.2-1.6.7-2.1.5-.5 1.1-.8 1.9-.8.7 0 1.2.2 1.6.6.4.4.5 1 .5 1.8v6.3h1.5v-6.5c0-1.1-.3-2-.9-2.6-.6-.6-1.4-.9-2.5-.9-.6 0-1.2.1-1.7.4-.5.3-.9.7-1.1 1.2v-1.4h-1.5v9.8zm10.8 0h1.5v-5.8c0-.9.2-1.6.7-2.1.5-.5 1.1-.8 1.9-.8.7 0 1.2.2 1.6.6.4.4.5 1 .5 1.8v6.3h1.5v-6.5c0-1.1-.3-2-.9-2.6-.6-.6-1.4-.9-2.5-.9-.6 0-1.2.1-1.7.4-.5.3-.9.7-1.1 1.2v-1.4h-1.5v9.8z" fill="#FF9900"/>
      <path d="M20 55h40" stroke="#FF9900" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  if (p === 'azure') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Azure">
      <rect width="80" height="80" rx="8" fill="#0078D4"/>
      <path d="M35 20L20 55h12l5-10 13 10H62L45 30l-10-10z" fill="white" fillOpacity="0.9"/>
      <path d="M38 28l-8 27h8l12-27H38z" fill="white"/>
    </svg>
  );
  if (p === 'gcp') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="GCP">
      <rect width="80" height="80" rx="8" fill="#fff"/>
      <path d="M40 22c-9.9 0-18 8.1-18 18s8.1 18 18 18 18-8.1 18-18-8.1-18-18-18zm0 4c7.7 0 14 6.3 14 14s-6.3 14-14 14-14-6.3-14-14 6.3-14 14-14z" fill="#4285F4"/>
      <circle cx="40" cy="40" r="6" fill="#FBBC05"/>
      <path d="M40 34v12M34 40h12" stroke="#EA4335" strokeWidth="2"/>
    </svg>
  );
  if (p === 'lambda') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Lambda">
      <rect width="80" height="80" rx="8" fill="#7C3AED"/>
      <path d="M22 58L34 22h8L30 58H22zm16 0l12-36h8L46 58H38z" fill="white" fillOpacity="0.9"/>
    </svg>
  );
  if (p === 'runpod') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="RunPod">
      <rect width="80" height="80" rx="8" fill="#EC4899"/>
      <circle cx="40" cy="40" r="16" fill="white" fillOpacity="0.2"/>
      <circle cx="40" cy="40" r="8" fill="white"/>
      <path d="M40 24v6M40 50v6M24 40h6M50 40h6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
  if (p === 'vast' || p === 'vast.ai') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Vast.ai">
      <rect width="80" height="80" rx="8" fill="#06B6D4"/>
      <path d="M20 28h40v4H20zm0 10h30v4H20zm0 10h20v4H20z" fill="white" fillOpacity="0.9"/>
    </svg>
  );
  if (p === 'coreweave') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="CoreWeave">
      <rect width="80" height="80" rx="8" fill="#4F46E5"/>
      <path d="M40 20c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 6c7.7 0 14 6.3 14 14s-6.3 14-14 14-14-6.3-14-14 6.3-14 14-14z" fill="white" fillOpacity="0.3"/>
      <circle cx="40" cy="40" r="5" fill="white"/>
    </svg>
  );
  if (p === 'together') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Together">
      <rect width="80" height="80" rx="8" fill="#0D9488"/>
      <circle cx="30" cy="40" r="8" fill="white" fillOpacity="0.8"/>
      <circle cx="50" cy="40" r="8" fill="white" fillOpacity="0.8"/>
      <ellipse cx="40" cy="40" rx="6" ry="8" fill="white"/>
    </svg>
  );
  if (p === 'nebius') return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-label="Nebius">
      <rect width="80" height="80" rx="8" fill="#1A1A2E"/>
      <path d="M20 52V28l20 24V28" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M44 28h16v24H44" stroke="#818CF8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <div className="w-7 h-7 rounded bg-bg-muted flex items-center justify-center flex-shrink-0">
      <span className="text-[9px] font-bold text-fg-muted">{provider.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

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
              <ProviderLogo provider={inst.provider} size={28} />

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

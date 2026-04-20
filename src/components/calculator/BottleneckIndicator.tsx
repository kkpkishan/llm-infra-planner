import { cn } from '@/lib/utils';

interface BottleneckRowProps {
  label: string;
  capacity: number;
  unit: string;
  isBottleneck: boolean;
  status: 'green' | 'yellow' | 'red';
}

function BottleneckRow({ label, capacity, unit, isBottleneck, status }: BottleneckRowProps) {
  const statusColor = {
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
  }[status];

  const statusDot = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }[status];

  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2 rounded-md border text-xs transition-colors',
      isBottleneck ? 'border-amber-500/60 bg-amber-500/10' : 'border-border-subtle bg-bg-subtle',
    )}>
      <div className="flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot)} />
        <span className="font-medium text-fg-default">{label}</span>
        {isBottleneck && (
          <span className="text-[9px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded font-semibold">
            BOTTLENECK
          </span>
        )}
      </div>
      <span className={cn('font-mono font-semibold', statusColor)}>
        {capacity.toLocaleString()} {unit}
      </span>
    </div>
  );
}

interface BottleneckIndicatorProps {
  maxUsersMemory: number;
  maxUsersThroughput: number;
  maxUsersPrefill: number;
  bottleneck: 'memory' | 'throughput' | 'prefill';
  currentUsers: number;
}

function getStatus(capacity: number, current: number): 'green' | 'yellow' | 'red' {
  if (current > capacity) return 'red';
  if (current > capacity * 0.8) return 'yellow';
  return 'green';
}

export function BottleneckIndicator({
  maxUsersMemory,
  maxUsersThroughput,
  maxUsersPrefill,
  bottleneck,
  currentUsers,
}: BottleneckIndicatorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-fg-default">Capacity Constraints</span>
      <div className="flex flex-col gap-1.5">
        <BottleneckRow
          label="KV Memory"
          capacity={maxUsersMemory}
          unit="users"
          isBottleneck={bottleneck === 'memory'}
          status={getStatus(maxUsersMemory, currentUsers)}
        />
        <BottleneckRow
          label="Decode Bandwidth"
          capacity={maxUsersThroughput}
          unit="users"
          isBottleneck={bottleneck === 'throughput'}
          status={getStatus(maxUsersThroughput, currentUsers)}
        />
        <BottleneckRow
          label="Prefill Compute"
          capacity={maxUsersPrefill}
          unit="users"
          isBottleneck={bottleneck === 'prefill'}
          status={getStatus(maxUsersPrefill, currentUsers)}
        />
      </div>
    </div>
  );
}

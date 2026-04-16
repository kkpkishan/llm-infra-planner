import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-bg-emphasis',
        // Shimmer animation — disabled when prefers-reduced-motion
        'motion-safe:animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  );
}

// Preset skeleton layouts for common use cases
export function SkeletonVRAMBreakdown() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-12 w-32" />
      <Skeleton className="h-7 w-full rounded-md" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGPUCard() {
  return (
    <div className="rounded-lg border border-border-subtle p-4 flex flex-col gap-3">
      <div className="flex justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-1 w-full" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    </div>
  );
}

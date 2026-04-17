import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { PARAMETER_TOOLTIPS } from '@/data/parameter-tooltips';
import type { TooltipContent } from '@/types/tooltip';

export interface InfoTooltipProps {
  /** Look up content by key from the parameter-tooltips database */
  paramKey?: string;
  /** Provide content directly */
  content?: TooltipContent;
  className?: string;
}

export function InfoTooltip({ paramKey, content, className }: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [isHover, setIsHover] = React.useState(false);
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
  const tooltipId = React.useId();

  const resolved: TooltipContent | undefined =
    content ?? (paramKey ? PARAMETER_TOOLTIPS[paramKey] : undefined);

  if (!resolved) return null;

  const handleMouseEnter = () => {
    hoverTimerRef.current = setTimeout(() => {
      setIsHover(true);
      setOpen(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimerRef.current);
    if (isHover) {
      setIsHover(false);
      setOpen(false);
    }
  };

  const handleFocus = () => {
    setOpen(true);
  };

  const handleBlur = () => {
    if (!isHover) setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setIsHover(false);
    }
  };

  return (
    <span
      className={cn('inline-flex items-center', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={`Info: ${resolved.title}`}
          aria-describedby={open ? tooltipId : undefined}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            'text-fg-muted hover:text-fg-default transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'p-0.5'
          )}
          onClick={(e) => {
            // On mobile (touch), toggle; on desktop hover handles it
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          <Info size={14} aria-hidden="true" />
        </PopoverTrigger>

        <PopoverContent
          id={tooltipId}
          role="tooltip"
          align="start"
          className={cn(
            'max-w-[320px] w-[320px] p-3 space-y-2 text-xs',
            'bg-bg-base border border-border-subtle shadow-lg'
          )}
        >
          <TooltipBody content={resolved} />
        </PopoverContent>
      </Popover>
    </span>
  );
}

function TooltipBody({ content }: { content: TooltipContent }) {
  return (
    <>
      <p className="font-semibold text-fg-default text-[13px]">{content.title}</p>

      <p className="text-fg-default leading-relaxed">{content.definition}</p>

      <div className="space-y-1">
        <p className="text-fg-muted">
          <span className="font-medium text-fg-default">Impact: </span>
          {content.impact}
        </p>
        <p className="text-fg-muted">
          <span className="font-medium text-fg-default">Recommended: </span>
          {content.recommended}
        </p>
      </div>

      {content.pitfall && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2.5 py-2">
          <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
            <span className="font-semibold">⚠ Pitfall: </span>
            {content.pitfall}
          </p>
        </div>
      )}

      {content.learnMoreUrl && (
        <a
          href={content.learnMoreUrl}
          className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
        >
          Learn more →
        </a>
      )}
    </>
  );
}

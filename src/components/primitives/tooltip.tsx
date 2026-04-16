import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
  delayMs?: number;
}

function Tooltip({ content, children, className, delayMs = 500 }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const id = React.useId();

  const show = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayMs);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  React.useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {React.cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60]',
            'rounded-md bg-fg-primary text-fg-inverse px-2 py-1 text-xs shadow-md',
            'whitespace-nowrap pointer-events-none animate-in fade-in-0 zoom-in-95',
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
Tooltip.displayName = 'Tooltip';

export { Tooltip };

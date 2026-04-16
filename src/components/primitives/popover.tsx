import * as React from 'react';
import { cn } from '@/lib/utils';

/* ── Context ── */
interface PopoverContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error('Popover compound components must be used within <Popover>');
  return ctx;
}

/* ── Popover root ── */
export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Popover({ open: controlledOpen, onOpenChange: controlledOnChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnChange ?? setInternalOpen;
  const triggerRef = React.useRef<HTMLButtonElement>(null!);

  return (
    <PopoverContext.Provider value={{ open, onOpenChange, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}
Popover.displayName = 'Popover';

/* ── Trigger ── */
export interface PopoverTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, ...props }, ref) => {
    const { open, onOpenChange, triggerRef } = usePopoverContext();

    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref, triggerRef]
    );

    return (
      <button
        ref={mergedRef}
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PopoverTrigger.displayName = 'PopoverTrigger';

/* ── Content ── */
export interface PopoverContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', children, ...props }, ref) => {
    const { open, onOpenChange } = usePopoverContext();
    const contentRef = React.useRef<HTMLDivElement | null>(null);

    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    // Close on outside click
    React.useEffect(() => {
      if (!open) return;
      const handleClick = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          onOpenChange(false);
        }
      };
      // Delay to avoid closing immediately on the trigger click
      const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClick);
      };
    }, [open, onOpenChange]);

    // Close on Escape
    React.useEffect(() => {
      if (!open) return;
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false);
      };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }, [open, onOpenChange]);

    if (!open) return null;

    const alignClass =
      align === 'start'
        ? 'left-0'
        : align === 'end'
          ? 'right-0'
          : 'left-1/2 -translate-x-1/2';

    return (
      <div
        ref={mergedRef}
        className={cn(
          'absolute top-full mt-2 z-[60]',
          alignClass,
          'min-w-[8rem] rounded-lg border border-border bg-bg-base p-4 shadow-md',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };

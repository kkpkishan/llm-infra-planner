import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { cn } from '@/lib/utils';

interface PopoverContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error('Must be inside <Popover>');
  return ctx;
}

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Popover({ open, onOpenChange, children }: PopoverProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null!);
  return (
    <PopoverContext.Provider value={{ open, onOpenChange, triggerRef }}>
      <div className="relative w-full">{children}</div>
    </PopoverContext.Provider>
  );
}
Popover.displayName = 'Popover';

export interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, className, onClick, ...props }, ref) => {
    const { open, onOpenChange, triggerRef } = usePopoverContext();

    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      },
      [ref, triggerRef]
    );

    return (
      <button
        ref={mergedRef}
        type="button"
        aria-expanded={open}
        className={cn('w-full flex items-center', className)}
        onClick={(e) => {
          onOpenChange(!open);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PopoverTrigger.displayName = 'PopoverTrigger';

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'start', children, ...props }, ref) => {
    const { open, onOpenChange, triggerRef } = usePopoverContext();
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(null);

    // Recompute position whenever open changes or on scroll/resize
    React.useLayoutEffect(() => {
      if (!open) return;
      const compute = () => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        setCoords({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
      };
      compute();
      window.addEventListener('scroll', compute, true);
      window.addEventListener('resize', compute);
      return () => {
        window.removeEventListener('scroll', compute, true);
        window.removeEventListener('resize', compute);
      };
    }, [open, triggerRef]);

    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref]
    );

    // Outside click — close after any item click/select has fired
    React.useEffect(() => {
      if (!open) return;
      const handle = (e: PointerEvent) => {
        const t = e.target as Node;
        if (contentRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
        // Defer so cmdk onSelect fires before unmount
        setTimeout(() => onOpenChange(false), 10);
      };
      // Attach after a tick so the trigger's own click doesn't immediately close
      const id = setTimeout(() => document.addEventListener('pointerdown', handle), 50);
      return () => {
        clearTimeout(id);
        document.removeEventListener('pointerdown', handle);
      };
    }, [open, onOpenChange, triggerRef]);

    // Escape key
    React.useEffect(() => {
      if (!open) return;
      const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
      document.addEventListener('keydown', handle);
      return () => document.removeEventListener('keydown', handle);
    }, [open, onOpenChange]);

    if (!open) return null;

    // If coords not yet computed, still render but off-screen so layout can measure
    const style: React.CSSProperties = coords
      ? { position: 'fixed', top: coords.top - window.scrollY, left: coords.left, minWidth: coords.width, zIndex: 9999 }
      : { position: 'fixed', top: -9999, left: -9999, zIndex: 9999 };

    return ReactDOM.createPortal(
      <div
        ref={mergedRef}
        style={style}
        className={cn(
          'rounded-lg border border-border bg-bg-base shadow-xl overflow-hidden',
          className
        )}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };

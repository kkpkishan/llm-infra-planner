import * as React from 'react';
import { cn } from '@/lib/utils';

/* ── Context ── */
interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error('Dialog compound components must be used within <Dialog>');
  return ctx;
}

/* ── Dialog root ── */
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}
Dialog.displayName = 'Dialog';

/* ── Trigger ── */
export interface DialogTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();
    return (
      <button ref={ref} type="button" onClick={() => onOpenChange(true)} {...props}>
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = 'DialogTrigger';

/* ── Overlay ── */
export interface DialogOverlayProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext();
    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 bg-black/50 animate-in fade-in-0',
          className
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
        {...props}
      />
    );
  }
);
DialogOverlay.displayName = 'DialogOverlay';

/* ── Content ── */
export interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext();
    const contentRef = React.useRef<HTMLDivElement | null>(null);

    // Merge refs
    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    // Focus trap + Escape
    React.useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false);
          return;
        }
        if (e.key !== 'Tab' || !contentRef.current) return;

        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Auto-focus first focusable element
      const timer = setTimeout(() => {
        const first = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }, 0);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
      };
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
      <>
        <DialogOverlay />
        <div
          ref={mergedRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-lg rounded-xl border border-border bg-bg-base p-6 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);
DialogContent.displayName = 'DialogContent';

export { Dialog, DialogTrigger, DialogOverlay, DialogContent };

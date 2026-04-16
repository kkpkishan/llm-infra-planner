import * as React from 'react';
import { cn } from '@/lib/utils';

/* ── Context ── */
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs compound components must be used within <Tabs>');
  return ctx;
}

/* ── Tabs root ── */
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value, onValueChange, className, children, ...props }, ref) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div ref={ref} className={cn('flex flex-col', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
);
Tabs.displayName = 'Tabs';

/* ── TabsList ── */
export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    const { value, onValueChange } = useTabsContext();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const triggers = Array.from(
        e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      );
      const currentIndex = triggers.findIndex(
        (t) => t.getAttribute('data-value') === value
      );
      let nextIndex = currentIndex;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % triggers.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
      } else {
        return;
      }

      e.preventDefault();
      const nextValue = triggers[nextIndex].getAttribute('data-value');
      if (nextValue) {
        onValueChange(nextValue);
        triggers[nextIndex].focus();
      }
    };

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          'inline-flex items-center gap-1 border-b border-border-subtle',
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsList.displayName = 'TabsList';

/* ── TabsTrigger ── */
export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value: triggerValue, className, children, ...props }, ref) => {
    const { value, onValueChange } = useTabsContext();
    const isActive = value === triggerValue;

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        data-value={triggerValue}
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        className={cn(
          'inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors duration-fast',
          'border-b-2 -mb-px',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isActive
            ? 'border-accent text-fg-primary'
            : 'border-transparent text-fg-muted hover:text-fg-default hover:border-border-subtle',
          className
        )}
        onClick={() => onValueChange(triggerValue)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

/* ── TabsContent ── */
export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value: contentValue, className, children, ...props }, ref) => {
    const { value } = useTabsContext();
    if (value !== contentValue) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        tabIndex={0}
        className={cn('mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };

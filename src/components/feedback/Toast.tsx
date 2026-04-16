import * as React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  variant?: ToastVariant;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const VARIANT_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  error:   { icon: XCircle,     color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  info:    { icon: Info,        color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const variant = toast.variant ?? 'info';
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-md text-sm',
        'animate-in slide-in-from-bottom-2 fade-in-0 duration-200',
        config.bg
      )}
    >
      <Icon size={16} className={cn('flex-shrink-0', config.color)} />
      <span className="text-fg-default flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-fg-muted hover:text-fg-default transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Toast context ─────────────────────────────────────────────────────────────

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const showToast = React.useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-80 pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

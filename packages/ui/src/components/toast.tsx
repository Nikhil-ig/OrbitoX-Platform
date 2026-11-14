import * as React from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    return {
      toast: () => '',
      dismiss: () => {},
    };
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toastItem) => toastItem.id !== id));
  }, []);

  const toast = React.useCallback(
    (options: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, ...options };
      setToasts((prev) => [...prev, newToast]);

      const duration = options.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast Viewport with aria-live for accessibility */}
      <div
        role="region"
        aria-label={t('toast.notifications')}
        aria-live="polite"
        className="fixed bottom-0 right-0 z-50 m-4 flex max-h-screen w-full flex-col-reverse gap-2 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto relative flex w-full items-start justify-between space-x-3 overflow-hidden rounded-md border p-4 shadow-lg transition-all',
              'bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text)]',
              item.variant === 'success' && 'border-[var(--color-success)]/40',
              item.variant === 'error' && 'border-[var(--color-danger)]/40',
              item.variant === 'warning' && 'border-[var(--color-warning)]/40',
              item.variant === 'info' && 'border-[var(--color-info)]/40'
            )}
          >
            <div className="flex items-start gap-3">
              {item.variant === 'success' && <CheckCircle className="h-5 w-5 text-[var(--color-success)] shrink-0 mt-0.5" />}
              {item.variant === 'error' && <AlertCircle className="h-5 w-5 text-[var(--color-danger)] shrink-0 mt-0.5" />}
              {item.variant === 'warning' && <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5" />}
              {item.variant === 'info' && <Info className="h-5 w-5 text-[var(--color-info)] shrink-0 mt-0.5" />}
              <div className="grid gap-1">
                {item.title && <h5 className="text-sm font-semibold leading-none">{item.title}</h5>}
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{item.description}</p>
              </div>
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-focus-ring)] cursor-pointer"
              aria-label={t('toast.dismiss')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}


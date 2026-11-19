import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';

export interface InlineAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  onClose?: () => void;
}

export function InlineAlert({
  variant = 'info',
  title,
  children,
  onClose,
  className,
  ...props
}: InlineAlertProps) {
  const variantStyles = {
    info: 'border-[var(--color-info)]/30 bg-[var(--color-info-subtle)]/40 text-[var(--color-text)] [&>svg]:text-[var(--color-info)]',
    success: 'border-[var(--color-success)]/30 bg-[var(--color-success-subtle)]/40 text-[var(--color-text)] [&>svg]:text-[var(--color-success)]',
    warning: 'border-[var(--color-warning)]/30 bg-[var(--color-warning-subtle)]/40 text-[var(--color-text)] [&>svg]:text-[var(--color-warning)]',
    danger: 'border-[var(--color-danger)]/30 bg-[var(--color-danger-subtle)]/40 text-[var(--color-text)] [&>svg]:text-[var(--color-danger)]',
  };

  const icons = {
    info: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
    success: <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
    danger: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        'relative flex w-full items-start gap-3 rounded-md border p-3 text-xs leading-relaxed',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 grid gap-0.5">
        {title && <h5 className="font-semibold text-xs leading-tight">{title}</h5>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label={t('alert.dismiss')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}


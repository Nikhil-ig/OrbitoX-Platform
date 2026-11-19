import * as React from 'react';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'staging' | 'info' | 'warning' | 'danger';
  dismissible?: boolean;
  onDismiss?: () => void;
  environment?: string; // e.g. from ORBITOX_ENVIRONMENT
}

export function Banner({
  variant = 'info',
  dismissible = false,
  onDismiss,
  environment,
  children,
  className,
  ...props
}: BannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  // Auto-activate staging banner if environment is 'staging'
  const isStaging = variant === 'staging' || environment === 'staging';
  const effectiveVariant = isStaging ? 'staging' : variant;

  if (dismissed) return null;

  const variantStyles = {
    staging:
      'bg-[var(--color-warning)] text-[var(--color-warning-fg)] font-semibold border-b border-[var(--color-warning)]/40 shadow-sm',
    warning:
      'bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-b border-[var(--color-warning)]/30',
    info:
      'bg-[var(--color-info-subtle)] text-[var(--color-info)] border-b border-[var(--color-info)]/30',
    danger:
      'bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-b border-[var(--color-danger)]/30',
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="banner"
      className={cn(
        'relative flex w-full items-center justify-center px-4 py-2 text-xs sm:text-sm tracking-wide select-none',
        variantStyles[effectiveVariant],
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto">
        {effectiveVariant === 'staging' && <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {effectiveVariant === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {effectiveVariant === 'info' && <Info className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {effectiveVariant === 'danger' && <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}

        <span>
          {isStaging && !children ? t('banner.staging') : children}
        </span>
      </div>

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute right-3 p-1 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-current cursor-pointer"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}


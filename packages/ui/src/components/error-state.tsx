import * as React from 'react';
import { AlertCircle, Copy, Check, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Kbd } from './kbd';
import { t } from '../i18n';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  requestId?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this view. Our telemetry system has logged this incident.',
  requestId,
  onRetry,
  retrying = false,
  className,
  ...props
}: ErrorStateProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyRequestId = () => {
    if (requestId && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(requestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-subtle)]/30 p-8 text-center animate-in fade-in-50',
        className
      )}
      {...props}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] mb-4">
        <AlertCircle className="h-6 w-6 stroke-[2]" />
      </div>

      <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">{title}</h3>
      <p className="max-w-md text-xs text-[var(--color-text-muted)] leading-relaxed mb-4">
        {description}
      </p>

      {requestId && (
        <div className="flex items-center gap-2 mb-6 bg-[var(--color-surface)] px-3 py-1.5 rounded-md border border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)]">Request ID:</span>
          <Kbd className="text-xs font-mono">{requestId}</Kbd>
          <button
            type="button"
            onClick={handleCopyRequestId}
            className="p-1 rounded hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label="Copy request id"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          loading={retrying}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}


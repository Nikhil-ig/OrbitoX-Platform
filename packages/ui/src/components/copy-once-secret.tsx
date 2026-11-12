import * as React from 'react';
import { Copy, Check, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { t } from '../i18n';

export interface CopyOnceSecretProps extends React.HTMLAttributes<HTMLDivElement> {
  secret: string;
  title?: string;
  description?: string;
  onAcknowledged?: () => void;
}

export function CopyOnceSecret({
  secret,
  title,
  description,
  onAcknowledged,
  className,
  ...props
}: CopyOnceSecretProps) {
  const [copied, setCopied] = React.useState(false);
  const [hasConfirmedStorage, setHasConfirmedStorage] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Volatile internal copy: once dismissed, secret is set to empty string
  const [volatileSecret, setVolatileSecret] = React.useState<string | null>(secret);

  const handleCopy = () => {
    if (volatileSecret && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(volatileSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    if (!hasConfirmedStorage) return;
    setVolatileSecret(null); // Wipe secret from memory
    setIsDismissed(true);
    onAcknowledged?.();
  };

  if (isDismissed || !volatileSecret) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)]',
          className
        )}
        {...props}
      >
        <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] shrink-0" />
        <div>
          <h5 className="font-semibold text-xs text-[var(--color-text)]">Secret Acknowledged</h5>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            This sensitive credential has been securely cleared from memory and cannot be viewed again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning-subtle)]/30 p-5 space-y-4 shadow-sm text-xs',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-[var(--color-warning)]/15 text-[var(--color-warning)] shrink-0">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-[var(--color-text)] leading-tight">
            {title || t('copyOnceSecret.title')}
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
            {description || t('copyOnceSecret.warning')}
          </p>
        </div>
      </div>

      {/* Secret Display Box */}
      <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
        <code className="font-mono text-xs break-all text-[var(--color-text)] select-all">
          {volatileSecret}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          icon={copied ? <Check className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <Copy className="h-3.5 w-3.5" />}
          className="shrink-0 h-8 text-xs"
        >
          {copied ? t('common.copied') : t('common.copy')}
        </Button>
      </div>

      {/* Confirmation Checkbox & Dismiss Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[var(--color-border)]/50">
        <div className="flex items-center gap-2">
          <Checkbox
            id="ack-secret-stored"
            checked={hasConfirmedStorage}
            onCheckedChange={(val) => setHasConfirmedStorage(!!val)}
          />
          <Label htmlFor="ack-secret-stored" className="text-xs font-normal cursor-pointer select-none">
            {t('copyOnceSecret.ackLabel')}
          </Label>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!hasConfirmedStorage}
          onClick={handleDone}
          className="shrink-0"
        >
          {t('common.confirm')}
        </Button>
      </div>
    </div>
  );
}


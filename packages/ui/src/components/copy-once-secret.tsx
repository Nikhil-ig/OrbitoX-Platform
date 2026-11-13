import * as React from 'react';
import { Copy, Check, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { t } from '../i18n';

// Tracks one-way non-reversible fingerprints of secrets already shown and acknowledged or unmounted
const consumedFingerprints = new Set<string>();

function fingerprintSecret(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16)}:${h2.toString(16)}:${value.length}`;
}

export interface CopyOnceSecretProps extends React.HTMLAttributes<HTMLDivElement> {
  secret: string;
  title?: string;
  label?: string;
  description?: string;
  confirmLabel?: string;
  onAcknowledged?: () => void;
  onDismiss?: () => void;
}

export function CopyOnceSecret({
  secret,
  title: titleProp,
  label: labelProp,
  description,
  confirmLabel,
  onAcknowledged,
  onDismiss,
  className,
  ...props
}: CopyOnceSecretProps) {
  const title = titleProp || labelProp;
  const handleAcknowledge = onAcknowledged || onDismiss;
  const fingerprint = React.useMemo(() => fingerprintSecret(secret), [secret]);
  const [copied, setCopied] = React.useState(false);
  const [hasConfirmedStorage, setHasConfirmedStorage] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(() => consumedFingerprints.has(fingerprint));

  // Volatile internal copy: initialized only if not previously consumed/unmounted
  const [volatileSecret, setVolatileSecret] = React.useState<string | null>(() =>
    consumedFingerprints.has(fingerprint) ? null : secret
  );

  // Mark secret consumed and wipe volatile state on unmount
  React.useEffect(() => {
    return () => {
      consumedFingerprints.add(fingerprint);
      setVolatileSecret(null);
    };
  }, [fingerprint]);

  const handleCopy = () => {
    if (volatileSecret && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(volatileSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    if (!hasConfirmedStorage) return;
    consumedFingerprints.add(fingerprint);
    setVolatileSecret(null); // Wipe secret from memory
    setIsDismissed(true);
    handleAcknowledge?.();
  };

  if (isDismissed || !volatileSecret) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)]',
          className
        )}
        {...props}
      >
        <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] shrink-0" />
        <div>
          <h5 className="font-semibold text-xs text-[var(--color-text)]">{t('copyOnceSecret.ackTitle')}</h5>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            {t('copyOnceSecret.ackDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 p-6 space-y-4 shadow-sm text-xs',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)] shrink-0">
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

      {/* Secret Display Monospace Key Pill */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
        <code className="font-mono text-xs break-all text-[var(--color-text)] select-all px-2">
          {volatileSecret}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          icon={copied ? <Check className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <Copy className="h-3.5 w-3.5" />}
          className="shrink-0 h-8 text-xs rounded-full"
        >
          {copied ? t('common.copied') : t('common.copy')}
        </Button>
      </div>

      {/* Confirmation & "I've stored it" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]/50">
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
          className="shrink-0 rounded-full"
        >
          {confirmLabel || t('common.confirm')}
        </Button>
      </div>
    </div>
  );
}


import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Input } from './input';
import { t } from '../i18n';

export interface StepUpConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  impactWarning?: string;
  confirmLabel?: string;
  confirmVariant?: 'destructive' | 'danger' | 'primary';
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onConfirm: (totpCode: string) => Promise<void> | void;
}

export function StepUpConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  impactWarning,
  confirmLabel,
  confirmVariant = 'destructive',
  isSubmitting = false,
  errorMessage = null,
  onConfirm,
}: StepUpConfirmationDialogProps) {
  const [totpCode, setTotpCode] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTotpCode('');
      setLocalError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(totpCode)) {
      setLocalError('Please enter a valid 6-digit TOTP authentication code.');
      return;
    }
    setLocalError(null);
    await onConfirm(totpCode);
  };

  const activeError = errorMessage || localError;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
            'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl',
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'outline-hidden'
          )}
          data-testid="step-up-confirmation-dialog"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogPrimitive.Title className="text-base font-bold text-[var(--color-text)] tracking-tight">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 rounded-[var(--radius-button)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] shrink-0"
                aria-label={t('stepUp.cancelAria')}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Impact Warning Banner */}
          {impactWarning && (
            <div className="mt-4 rounded-[var(--radius-row)] border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/10 p-3 text-xs text-[var(--color-danger)] leading-relaxed">
              <strong className="font-semibold block mb-0.5">{t('stepUp.highRiskLabel')}</strong>
              {impactWarning}
            </div>
          )}

          {/* TOTP Step-Up Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="totp-step-up-input"
                className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
              >
                {t('stepUp.totpLabel')}
              </label>
              <div className="relative">
                <Input
                  id="totp-step-up-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t('stepUp.totpPlaceholder')}
                  autoFocus
                  disabled={isSubmitting}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono text-center tracking-widest text-lg h-11"
                />
                <ShieldCheck className="absolute right-3 top-3 h-5 w-5 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                {t('stepUp.totpHelp')}
              </p>
            </div>

            {/* Error Message */}
            {activeError && (
              <div
                className="rounded-[var(--radius-row)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/15 p-2.5 text-xs text-[var(--color-danger)]"
                role="alert"
              >
                {activeError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogPrimitive.Close asChild>
                <Button variant="outline" size="md" disabled={isSubmitting}>
                  {t('common.cancel')}
                </Button>
              </DialogPrimitive.Close>
              <Button
                type="submit"
                variant={confirmVariant}
                size="md"
                disabled={totpCode.length !== 6 || isSubmitting}
              >
                {isSubmitting ? t('common.loading') : (confirmLabel || t('common.confirm'))}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

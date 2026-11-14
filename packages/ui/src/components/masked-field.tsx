import * as React from 'react';
import { Eye, EyeOff, ShieldAlert, Copy, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Textarea } from './textarea';
import { Label } from './label';
import { t } from '../i18n';

export interface MaskedFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'value' | 'children'> {
  maskedPreview?: string; // e.g. "••••• 4821" (only non-sensitive suffix, or defaults to ••••••••••••)
  onReveal: (reason: string) => Promise<string>; // App-supplied callback hitting access-logged API
  autoHideDurationMs?: number; // Defaults to 60,000ms (60s)
  allowCopy?: boolean;
}

export function MaskedField({
  maskedPreview = '••••••••••••',
  onReveal,
  autoHideDurationMs = 60000,
  allowCopy = false,
  className,
  ...props
}: MaskedFieldProps) {
  const [revealedValue, setRevealedValue] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const isRevealed = revealedValue !== null;

  // Auto-hide handler: sets revealedValue to null and cleans up
  const hideValue = React.useCallback(() => {
    setRevealedValue(null);
    setCopied(false);
  }, []);

  // Window blur and document visibilitychange listeners: hides value immediately on tab/app switch
  React.useEffect(() => {
    if (!isRevealed) return;

    const handleWindowBlur = () => {
      hideValue();
    };
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        hideValue();
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRevealed, hideValue]);

  // 60-second auto-hide timer
  React.useEffect(() => {
    if (!isRevealed) return;

    const timer = setTimeout(() => {
      hideValue();
    }, autoHideDurationMs);

    return () => clearTimeout(timer);
  }, [isRevealed, autoHideDurationMs, hideValue]);

  const handleOpenDialog = () => {
    setReason('');
    setIsDialogOpen(true);
  };

  const handleConfirmReveal = async () => {
    if (!reason.trim()) return;

    try {
      setIsLoading(true);
      const secret = await onReveal(reason.trim());
      setRevealedValue(secret);
      setIsDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (revealedValue && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(revealedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)]',
          className
        )}
        {...props}
      >
        {/* Rendered Value: Real secret is strictly NOT in the DOM unless revealed */}
        <span className="font-mono tracking-wider select-all">
          {isRevealed ? revealedValue : maskedPreview}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-2 ml-1">
          {isRevealed ? (
            <>
              {allowCopy && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                  aria-label={t('common.copy')}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={hideValue}
                className="h-6 px-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                icon={<EyeOff className="h-3.5 w-3.5" />}
              >
                {t('common.hide')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenDialog}
              className="h-6 px-1.5 text-xs text-[var(--color-link)] hover:text-[var(--color-link)] hover:bg-[var(--color-surface-raised)]"
              icon={<Eye className="h-3.5 w-3.5" />}
            >
              {t('common.reveal')}
            </Button>
          )}
        </div>
      </div>

      {/* Mandatory Reason Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[var(--color-primary)] mb-1">
              <ShieldAlert className="h-5 w-5" />
              <DialogTitle className="text-base">{t('maskedField.reasonTitle')}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {t('maskedField.reasonPrompt')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="phi-reveal-reason" className="text-xs">
              {t('maskedField.reasonLabel')}
            </Label>
            <Textarea
              id="phi-reveal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('maskedField.reasonPlaceholder')}
              className="text-xs min-h-[70px]"
              autoFocus
            />
            <p className="text-[10px] text-[var(--color-text-subtle)]">
              {t('maskedField.autoHideWarning')}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={reason.trim().length < 3 || isLoading}
              loading={isLoading}
              onClick={handleConfirmReveal}
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

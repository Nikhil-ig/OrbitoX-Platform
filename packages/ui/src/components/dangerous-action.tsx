import * as React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Label } from './label';
import { t } from '../i18n';

export interface DangerousActionProps {
  trigger: React.ReactNode;
  title?: string;
  description: string;
  expectedConfirmationText: string;
  requireReason?: boolean;
  onStepUpAuth?: () => Promise<boolean>;
  onConfirm: (payload: { reason?: string }) => void | Promise<void>;
  confirmButtonLabel?: string;
}

export function DangerousAction({
  trigger,
  title,
  description,
  expectedConfirmationText,
  requireReason = false,
  onStepUpAuth,
  onConfirm,
  confirmButtonLabel,
}: DangerousActionProps) {
  const [open, setOpen] = React.useState(false);
  const [typedConfirmation, setTypedConfirmation] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [stepUpVerified, setStepUpVerified] = React.useState(!onStepUpAuth);
  const [isVerifyingStepUp, setIsVerifyingStepUp] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);

  const isTypedMatch = typedConfirmation.trim() === expectedConfirmationText.trim();
  const isReasonValid = !requireReason || reason.trim().length >= 5;
  const canConfirm = isTypedMatch && stepUpVerified && isReasonValid;

  const handleStepUpAuth = async () => {
    if (!onStepUpAuth) return;
    try {
      setIsVerifyingStepUp(true);
      const success = await onStepUpAuth();
      setStepUpVerified(success === true);
    } catch {
      setStepUpVerified(false);
    } finally {
      setIsVerifyingStepUp(false);
    }
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      setIsExecuting(true);
      await onConfirm({ reason: requireReason ? reason.trim() : undefined });
      setOpen(false);
      resetState();
    } finally {
      setIsExecuting(false);
    }
  };

  const resetState = () => {
    setTypedConfirmation('');
    setReason('');
    setStepUpVerified(!onStepUpAuth);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-w-md border-[var(--color-border)] rounded-[var(--radius-card)] p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[var(--color-text)]">
                {title || t('dangerousAction.title')}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Reason (if required) */}
          {requireReason && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[var(--color-text)]">{t('dangerousAction.reasonLabel')}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('dangerousAction.reasonPlaceholder')}
                className="text-xs min-h-[70px] rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            </div>
          )}

          {/* Typed Confirmation Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[var(--color-text)]">
              {t('dangerousAction.confirmPrompt', { expected: expectedConfirmationText })}
            </Label>
            <Input
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={expectedConfirmationText}
              className="font-mono text-xs rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4"
              autoComplete="off"
            />
          </div>

          {/* Step-Up Notice & Re-Authentication */}
          <div className="rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5 text-[var(--color-text)] text-xs">
                <Lock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                {t('dangerousAction.stepUpTitle')}
              </span>
              {stepUpVerified ? (
                <span className="text-[var(--color-success)] font-medium text-xs">{t('dangerousAction.verified')}</span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={isVerifyingStepUp}
                  onClick={handleStepUpAuth}
                  className="h-7 text-xs rounded-full px-3"
                >
                  {t('dangerousAction.authenticate')}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-normal">
              {t('dangerousAction.stepUpNotice')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isExecuting}
            className="rounded-full"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!canConfirm || isExecuting}
            loading={isExecuting}
            onClick={handleConfirm}
            className="rounded-full shadow-sm"
          >
            {confirmButtonLabel || t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


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

      <DialogContent className="max-w-md border-[var(--color-danger)]/40">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[var(--color-danger)] mb-1">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-base text-[var(--color-danger)]">
              {title || t('dangerousAction.title')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* 1. Step-Up Re-Authentication (if required) */}
          {onStepUpAuth && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5 text-[var(--color-text)]">
                  <Lock className="h-3.5 w-3.5" />
                  {t('dangerousAction.stepUpTitle')}
                </span>
                {stepUpVerified ? (
                  <span className="text-[var(--color-success)] font-medium">{t('dangerousAction.verified')}</span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={isVerifyingStepUp}
                    onClick={handleStepUpAuth}
                    className="h-7 text-xs"
                  >
                    {t('dangerousAction.authenticate')}
                  </Button>
                )}
              </div>
              {!stepUpVerified && (
                <p className="text-[var(--color-text-muted)]">
                  {t('dangerousAction.stepUpPrompt')}
                </p>
              )}
            </div>
          )}

          {/* 2. Typed Confirmation Input */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              {t('dangerousAction.confirmPrompt', { expected: expectedConfirmationText })}
            </Label>
            <Input
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={expectedConfirmationText}
              className="font-mono text-xs"
              autoComplete="off"
            />
          </div>

          {/* 3. Audit Reason (if required) */}
          {requireReason && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('dangerousAction.reasonLabel')}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('dangerousAction.reasonPlaceholder')}
                className="text-xs min-h-[60px]"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isExecuting}
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
          >
            {confirmButtonLabel || t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


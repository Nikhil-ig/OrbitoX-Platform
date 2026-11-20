'use client';

import * as React from 'react';
import { Lock, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@orbitox-io/ui';

interface StepUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function StepUpModal({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  title = 'Step-Up Re-Authentication Required',
  description = 'This administrative operation requires fresh 2FA credential verification (valid for 5 minutes).',
}: StepUpModalProps) {
  const [password, setPassword] = React.useState('');
  const [totpCode, setTotpCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setPassword('');
    setTotpCode('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onCancel();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !totpCode.trim()) {
      setError('Please provide both your operator password and 6-digit TOTP code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const csrfMatch = document.cookie.match(/(?:orbitox_operator_csrf|orbitox_csrf)=([^;]+)/);
      const csrfToken = csrfMatch ? csrfMatch[1] : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch('/api/v1/platform/auth/reauth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          password: password.trim(),
          totpCode: totpCode.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        reset();
        onSuccess();
        onOpenChange(false);
      } else {
        setError(data.error || 'Re-authentication failed. Please check your credentials and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during re-authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else onOpenChange(val); }}>
      <DialogContent className="max-w-md border-[var(--color-border)] rounded-[var(--radius-card)] p-6 bg-[var(--color-surface)]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[var(--color-text)]">
                {title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-danger-subtle)] border border-[var(--color-danger)] text-[var(--color-danger)] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[var(--color-text)]">Operator Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your operator account password"
              className="text-xs rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[var(--color-text)]">TOTP Code / Backup Code</Label>
            <div className="relative">
              <Input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\s+/g, ''))}
                placeholder="6-digit authenticator code (or backup code)"
                className="text-xs font-mono rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4"
                maxLength={16}
                autoComplete="one-time-code"
                required
              />
              <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={loading}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              disabled={loading || !password.trim() || !totpCode.trim()}
              className="rounded-full"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Verify & Re-authenticate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useStepUpAuth() {
  const [isOpen, setIsOpen] = React.useState(false);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const requestStepUpAuth = React.useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setIsOpen(true);
    });
  }, []);

  const handleSuccess = React.useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = React.useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const stepUpDialog = (
    <StepUpModal
      open={isOpen}
      onOpenChange={setIsOpen}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );

  return {
    stepUpDialog,
    requestStepUpAuth,
  };
}

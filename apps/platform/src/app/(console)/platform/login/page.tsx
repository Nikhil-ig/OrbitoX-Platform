'use client';

import * as React from 'react';
import { Card, Button, InlineAlert, Badge } from '@orbitox-io/ui';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';

export default function PlatformLoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [totpCode, setTotpCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/platform/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode }),
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Sign-in failed. Check your credentials and authenticator code.');
      }
      const next = new URLSearchParams(window.location.search).get('next');
      const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/console/overview';
      window.location.assign(target);
    } catch (loginError) {
      setError((loginError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-primary)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Operator Sign-In</h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Use your operator account and time-based authenticator (TOTP) code.
            </p>
          </div>
        </div>

        <Card className="p-6 border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <InlineAlert variant="danger" title="Authentication Error">
                {error}
              </InlineAlert>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Operator Email</label>
              <input
                autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operator@orbitox.io"
                className="w-full px-3.5 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Password</label>
              <input
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3.5 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--color-text)]">TOTP Authenticator Code</label>
                <span className="text-[10px] text-[var(--color-text-muted)]">6 digits</span>
              </div>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-text)] tracking-wider focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="default"
              disabled={busy}
              className="w-full rounded-full mt-2"
            >
              {busy ? 'Authenticating…' : 'Sign in to Operator Console'}
            </Button>
          </form>
        </Card>

        <div className="text-center text-[11px] text-[var(--color-text-muted)]">
          Zero-Trust Protected · Fail-Closed Audit Logging
        </div>
      </div>
    </div>
  );
}

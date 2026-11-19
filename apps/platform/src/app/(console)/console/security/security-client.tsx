'use client';

import * as React from 'react';
import {
  Check,
  Copy,
  Plus,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DangerousAction,
  Input,
  Textarea,
  Label,
} from '@orbitox-io/ui';
import type {
  SecurityOverview,
  ApiKeyItem,
  OperatorItem,
  LockoutItem,
} from '@/server/security/security-console-service';

interface SecurityClientProps {
  initialOverview: SecurityOverview;
}

export function SecurityClient({ initialOverview }: SecurityClientProps) {
  const [keys, setKeys] = React.useState<ApiKeyItem[]>(initialOverview.keys);
  const [operators] = React.useState<OperatorItem[]>(initialOverview.operators);
  const [lockouts, setLockouts] = React.useState<LockoutItem[]>(initialOverview.lockouts);

  // Ephemeral Secret Banner State
  const [bannerKey, setBannerKey] = React.useState<{
    secret: string;
    keyId: string;
    notice: string;
    isNew?: boolean;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState('');
  const [newKeyScope, setNewKeyScope] = React.useState('orders:write');
  const [isCreatingKey, setIsCreatingKey] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  // Unlock Modal State
  const [unlockTarget, setUnlockTarget] = React.useState<LockoutItem | null>(null);
  const [unlockReason, setUnlockReason] = React.useState('');
  const [isUnlocking, setIsUnlocking] = React.useState(false);

  // Rotating Key Loading State
  const [rotatingKeyId, setRotatingKeyId] = React.useState<string | null>(null);

  // Copy secret to clipboard
  const handleCopySecret = async () => {
    if (!bannerKey) return;
    try {
      await navigator.clipboard.writeText(bannerKey.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Create API Key
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || newKeyName.trim().length < 3) {
      setCreateError('API key name must be at least 3 characters.');
      return;
    }

    setIsCreatingKey(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/v1/platform/security-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: [newKeyScope],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create API key');
      }

      const data = await res.json();
      setKeys((prev) => [data.key, ...prev]);
      setBannerKey({
        secret: data.rawSecret,
        keyId: data.key.keyId,
        notice: 'Make sure to copy your new API key now. You will not be able to see it again.',
        isNew: true,
      });

      setIsCreateModalOpen(false);
      setNewKeyName('');
    } catch (err: any) {
      setCreateError(err?.message || 'Error creating API key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  // Rotate Key
  const handleRotateKey = async (key: ApiKeyItem) => {
    setRotatingKeyId(key.id);
    try {
      const res = await fetch(`/api/v1/platform/security-keys/${key.id}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graceWindowHours: 24,
          reason: 'Manual key rotation from Operator Console',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to rotate API key');
      }

      const data = await res.json();
      setKeys((prev) =>
        prev.map((k) => (k.id === key.id ? data.replacementKey : k)),
      );

      setBannerKey({
        secret: data.replacementRawSecret,
        keyId: data.replacementKey.keyId,
        notice: 'The old key keeps working for 24 hours so integrations can switch over, then stops.',
        isNew: false,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to rotate key');
    } finally {
      setRotatingKeyId(null);
    }
  };

  // Revoke Key
  const handleRevokeKey = async (key: ApiKeyItem, reason?: string) => {
    try {
      const res = await fetch(`/api/v1/platform/security-keys/${key.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Revoked by platform operator' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to revoke API key');
      }

      setKeys((prev) => prev.filter((k) => k.id !== key.id));
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke key');
    }
  };

  // Unlock Operator
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTarget) return;
    if (unlockReason.trim().length < 5) {
      alert('Justification reason must be at least 5 characters.');
      return;
    }

    setIsUnlocking(true);
    try {
      const res = await fetch('/api/v1/platform/security-keys/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unlockTarget.email,
          reason: unlockReason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to unlock operator');
      }

      setLockouts((prev) => prev.filter((l) => l.email !== unlockTarget.email));
      setUnlockTarget(null);
      setUnlockReason('');
    } catch (err: any) {
      alert(err?.message || 'Failed to unlock operator');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[var(--color-text-muted)]">
            Keys, operators, sessions and lockouts
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mt-1">
            Security & keys
          </h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="rounded-full"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create API key
        </Button>
      </div>

      {/* 2. Ephemeral Secret Banner (Matching API keys · rotate.png) */}
      {bannerKey && (
        <div className="p-5 rounded-[var(--radius-card)] bg-emerald-950/20 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {bannerKey.isNew
                ? 'Key created · copy it now, it won\'t be shown again'
                : 'Key rotated · copy it now, it won\'t be shown again'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 px-4 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full font-mono text-xs text-[var(--color-text)] truncate select-all">
              {bannerKey.secret.length > 30
                ? `${bannerKey.secret.slice(0, 12)}······································${bannerKey.secret.slice(-4)}`
                : bannerKey.secret}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full bg-white text-zinc-900 hover:bg-white/90"
                onClick={handleCopySecret}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => setBannerKey(null)}
              >
                I&apos;ve stored it
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)]">
            {bannerKey.notice}
          </p>
        </div>
      )}

      {/* 3. API Keys Table Card */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-sm text-[var(--color-text)]">API keys</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="py-2.5 font-medium">Name</th>
                <th className="py-2.5 font-medium">Key</th>
                <th className="py-2.5 font-medium">Scopes</th>
                <th className="py-2.5 font-medium">Last used</th>
                <th className="py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">
                    No active API keys found.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="py-3 font-medium text-[var(--color-text)]">
                      {k.name}
                    </td>
                    <td className="py-3 font-mono text-[var(--color-text-muted)]">
                      {k.maskedDisplay || `${k.keyId}...`}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((scope) => (
                          <span
                            key={scope}
                            className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${
                              scope.includes('tool') || scope.includes('mcp')
                                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-[var(--color-text-muted)]">
                      {k.lastUsedDisplay}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-full h-7 text-xs px-3"
                          disabled={rotatingKeyId === k.id}
                          onClick={() => handleRotateKey(k)}
                        >
                          {rotatingKeyId === k.id ? 'Rotating...' : 'Rotate'}
                        </Button>

                        <DangerousAction
                          trigger={
                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-full h-7 text-xs px-3 text-rose-500 hover:text-rose-600"
                            >
                              Revoke
                            </Button>
                          }
                          title={`Revoke API Key · ${k.name}`}
                          description={`Revoking this key immediately refuses all machine credentials and webhooks authenticating with ${k.keyId}. This cannot be undone.`}
                          expectedConfirmationText={`revoke ${k.keyId}`}
                          requireReason={true}
                          confirmButtonLabel="Revoke Key"
                          onConfirm={async ({ reason }) => {
                            await handleRevokeKey(k, reason);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Bottom 2-Column Grid: Operators & Lockouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Operators Card */}
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-sm text-[var(--color-text)]">Operators</h3>

          <div className="divide-y divide-[var(--color-border)]">
            {operators.map((op) => (
              <div key={op.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${op.colorClass}`}
                  >
                    {op.initials}
                  </div>
                  <div>
                    <div className="font-medium text-xs text-[var(--color-text)]">
                      {op.name}
                    </div>
                  </div>
                </div>

                <div className="text-teal-600 dark:text-teal-400 text-xs font-medium">
                  {op.mfaLabel}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: Lockouts Card */}
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-sm text-[var(--color-text)]">Lockouts</h3>

          {lockouts.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
              No locked-out operator accounts.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {lockouts.map((lockout) => (
                <div key={lockout.id} className="py-3 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-medium text-[var(--color-text)]">
                        {lockout.email}
                      </span>
                    </div>
                    <span className="text-[var(--color-text-muted)]">
                      {lockout.failedAttempts} failed sign-ins
                    </span>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => {
                      setUnlockTarget(lockout);
                      setUnlockReason('');
                    }}
                  >
                    <Unlock className="h-3 w-3 mr-1.5" />
                    Unlock with reason
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 5. Create API Key Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new cryptographic machine credential with least-privilege scopes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs py-2">
            {createError && (
              <div className="p-3 rounded-[var(--radius-card)] bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                {createError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Masala House POS sync, Lab Bridge"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="key-scope">Primary Scope / Capability</Label>
              <select
                id="key-scope"
                value={newKeyScope}
                onChange={(e) => setNewKeyScope(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-card)] text-[var(--color-text)]"
              >
                <option value="orders:write">orders:write (POS / Dining orders write access)</option>
                <option value="labs:read">labs:read (Hospital EHR & lab telemetry read)</option>
                <option value="read-only tools">read-only tools (MCP AI assistant query)</option>
                <option value="platform.admin">platform.admin (Full cluster admin)</option>
              </select>
            </div>

            <DialogFooter className="gap-3 pt-3 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isCreatingKey}
              >
                {isCreatingKey ? 'Generating...' : 'Create Key'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Unlock Operator Dialog */}
      <Dialog open={!!unlockTarget} onOpenChange={(open) => !open && setUnlockTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock Operator · {unlockTarget?.email}</DialogTitle>
            <DialogDescription>
              Unlocking will clear the 5 failed sign-in counter and lift the security freeze.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUnlockSubmit} className="space-y-4 text-xs py-2">
            <div className="space-y-1.5">
              <Label htmlFor="unlock-reason">Justification Reason (min 5 characters)</Label>
              <Textarea
                id="unlock-reason"
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g. Verified operator identity via phone call after accidental lockout..."
                required
              />
            </div>

            <DialogFooter className="gap-3 pt-3 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setUnlockTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isUnlocking || unlockReason.trim().length < 5}
              >
                {isUnlocking ? 'Unlocking...' : 'Confirm Unlock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


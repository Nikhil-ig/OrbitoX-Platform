'use client';

import * as React from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  Search,
  Trash2,
  Lock,
} from 'lucide-react';
import {
  Button,
  Card,
  ProgressBar,
  PillNav,
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
  DataRightsSummary,
  DataRightsRequestItem,
  CertificateVerificationResult,
} from '@/server/data-rights/data-rights-console-service';
import type { SignedDeletionCertificate } from '@/server/data-rights/deletion-certificate';

interface DataRightsClientProps {
  initialSummary: DataRightsSummary;
  initialRequests: DataRightsRequestItem[];
  initialKindFilter?: string;
  initialSearch?: string;
}

export function DataRightsClient({
  initialSummary,
  initialRequests,
  initialKindFilter = 'all',
  initialSearch = '',
}: DataRightsClientProps) {
  const [summary] = React.useState<DataRightsSummary>(initialSummary);
  const [requests, setRequests] = React.useState<DataRightsRequestItem[]>(initialRequests);
  const [kindFilter, setKindFilter] = React.useState<string>(initialKindFilter);
  const [searchQuery, setSearchQuery] = React.useState<string>(initialSearch);

  // Modals & Drawers
  const [isVerifyModalOpen, setIsVerifyModalOpen] = React.useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = React.useState(false);
  const [isCertDrawerOpen, setIsCertDrawerOpen] = React.useState(false);
  const [activeCert, setActiveCert] = React.useState<SignedDeletionCertificate | null>(
    initialSummary.sampleCertificate,
  );

  // Certificate Verification State
  const [certInputText, setCertInputText] = React.useState('');
  const [verificationResult, setVerificationResult] =
    React.useState<CertificateVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);

  // New Request Form State
  const [newRequestType, setNewRequestType] = React.useState<
    'ORGANIZATION_EXPORT' | 'ORGANIZATION_DELETION' | 'PRINCIPAL_RESTRICTION'
  >('ORGANIZATION_EXPORT');
  const [newRequestOrg, setNewRequestOrg] = React.useState('');
  const [newRequestReason, setNewRequestReason] = React.useState('');
  const [isSubmittingNewRequest, setIsSubmittingNewRequest] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Cancel Request State
  const [cancelTarget, setCancelTarget] = React.useState<DataRightsRequestItem | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Filter requests locally by search and category
  const filteredRequests = React.useMemo(() => {
    let result = requests;
    if (kindFilter !== 'all') {
      if (kindFilter === 'exports') {
        result = result.filter((r) => r.kind === 'ORGANIZATION_EXPORT');
      } else if (kindFilter === 'deletions') {
        result = result.filter((r) => r.kind === 'ORGANIZATION_DELETION');
      } else if (kindFilter === 'person') {
        result = result.filter(
          (r) => r.kind === 'PRINCIPAL_RESTRICTION' || r.kind === 'PRINCIPAL_CORRECTION',
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.orgName.toLowerCase().includes(q) ||
          r.orgSlug.toLowerCase().includes(q) ||
          r.kindLabel.toLowerCase().includes(q) ||
          r.resultSummary.toLowerCase().includes(q),
      );
    }

    return result;
  }, [requests, kindFilter, searchQuery]);

  // Handle Verify Certificate
  const handleVerify = async () => {
    if (!certInputText.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch('/api/v1/platform/data-rights/verify-cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate: certInputText.trim() }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        reason: err?.message || 'Network error during verification',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Open Certificate Inspector
  const openCertificate = (cert: SignedDeletionCertificate | null | undefined) => {
    const target = cert || summary.sampleCertificate;
    setActiveCert(target);
    setIsCertDrawerOpen(true);
  };

  // Download Certificate as JSON file
  const downloadCertificateJson = (cert: SignedDeletionCertificate) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cert, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `deletion-certificate-${cert.payload.organizationSlug || cert.payload.organizationId}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle Create New Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestOrg.trim()) {
      setFormError('Organization identifier is required.');
      return;
    }
    if (newRequestReason.trim().length < 5) {
      setFormError('Justification reason must be at least 5 characters.');
      return;
    }

    setIsSubmittingNewRequest(true);
    setFormError(null);

    try {
      const res = await fetch('/api/v1/platform/data-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newRequestType,
          organizationId: newRequestOrg.trim(),
          reason: newRequestReason.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to submit request');
      }

      const created = await res.json();
      const newItem: DataRightsRequestItem = {
        id: created.id,
        kind: newRequestType,
        kindLabel:
          newRequestType === 'ORGANIZATION_DELETION'
            ? 'Organization deletion'
            : newRequestType === 'ORGANIZATION_EXPORT'
            ? 'Customer export'
            : 'Patient restriction',
        orgId: newRequestOrg.trim(),
        orgName: newRequestOrg.trim().replace(/^org_/, '').replace(/_/g, ' '),
        orgSlug: newRequestOrg.trim(),
        status: newRequestType === 'ORGANIZATION_DELETION' ? 'SCHEDULED' : 'RUNNING',
        statusLabel:
          newRequestType === 'ORGANIZATION_DELETION' ? 'Deletion scheduled' : 'Export · running',
        requestedAt: 'Just now',
        resultSummary:
          newRequestType === 'ORGANIZATION_DELETION' ? '30 days remaining' : 'In progress',
        hasCertificate: false,
        canCancel: true,
        canPurge: newRequestType === 'ORGANIZATION_DELETION',
      };

      setRequests((prev) => [newItem, ...prev]);
      setIsNewRequestModalOpen(false);
      setNewRequestOrg('');
      setNewRequestReason('');
    } catch (err: any) {
      setFormError(err?.message || 'Error submitting request');
    } finally {
      setIsSubmittingNewRequest(false);
    }
  };

  // Handle Cancel Request
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    if (cancelReason.trim().length < 5) {
      alert('Justification reason must be at least 5 characters.');
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/v1/platform/data-rights/${cancelTarget.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to cancel request');
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === cancelTarget.id
            ? { ...r, status: 'CANCELLED', statusLabel: 'Cancelled', canCancel: false, canPurge: false }
            : r,
        ),
      );
      setCancelTarget(null);
      setCancelReason('');
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel request');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Dangerous Hard Purge
  const handleExecuteHardPurge = async (target: DataRightsRequestItem, reason?: string) => {
    try {
      const res = await fetch(`/api/v1/platform/data-rights/${target.id}/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Operator confirmed hard purge' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to execute hard purge');
      }

      const data = await res.json();
      setRequests((prev) =>
        prev.map((r) =>
          r.id === target.id
            ? {
                ...r,
                status: 'ERASED',
                statusLabel: 'Erased · 0 rows left',
                resultSummary: 'Certificate',
                hasCertificate: true,
                certificate: data.certificate,
                canCancel: false,
                canPurge: false,
              }
            : r,
        ),
      );

      if (data.certificate) {
        openCertificate(data.certificate);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to execute hard purge');
    }
  };

  const runningExport = summary.cards.runningExport;
  const scheduledDel = summary.cards.scheduledDeletion;
  const patientReq = summary.cards.patientRequest;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[var(--color-text-muted)]">
            Exports, deletions and patient or customer requests
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mt-1">
            Data rights
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setCertInputText(JSON.stringify(summary.sampleCertificate, null, 2));
              setVerificationResult(null);
              setIsVerifyModalOpen(true);
            }}
          >
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Verify a certificate
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-full"
            onClick={() => setIsNewRequestModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New request
          </Button>
        </div>
      </div>

      {/* 2. 3 Status Cards (Hero Cards matching C5 Story) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Active Export */}
        <Card className="p-5 space-y-3">
          <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/40 px-2.5 py-0.5 rounded-full inline-block">
            Export · running
          </span>
          <h3 className="font-bold text-base text-[var(--color-text)]">
            {runningExport?.orgName || 'City Hospital'}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {runningExport?.product || 'Whole organization · HospitalOS'}
          </p>
          <div className="space-y-1.5 pt-2">
            <ProgressBar value={runningExport?.progressPercent || 64} className="h-1.5" />
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {runningExport?.progressLabel || '9 of 14 tables · started 09:15'}
            </p>
          </div>
        </Card>

        {/* Card 2: Deletion Scheduled */}
        <Card className="p-5 space-y-3 border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800/40 px-2.5 py-0.5 rounded-full inline-block">
              Deletion scheduled
            </span>
            {scheduledDel && (
              <DangerousAction
                trigger={
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Purge now
                  </button>
                }
                title={`Permanent Hard Purge · ${scheduledDel.orgName}`}
                description={`Immediate, irreversible destruction of all database records, schemas, and credentials for ${scheduledDel.orgName}. This produces an Ed25519-signed deletion certificate.`}
                expectedConfirmationText={`purge ${scheduledDel.orgSlug}`}
                requireReason={true}
                confirmButtonLabel="Execute Hard Purge"
                onConfirm={async ({ reason }) => {
                  const target: DataRightsRequestItem = requests.find((r) => r.id === scheduledDel.id) || {
                    id: scheduledDel.id,
                    kind: 'ORGANIZATION_DELETION',
                    kindLabel: 'Organization deletion',
                    orgId: scheduledDel.orgSlug,
                    orgName: scheduledDel.orgName,
                    orgSlug: scheduledDel.orgSlug,
                    status: 'SCHEDULED',
                    statusLabel: 'Deletion scheduled',
                    requestedAt: 'Recent',
                    resultSummary: scheduledDel.notice,
                    hasCertificate: false,
                    canCancel: true,
                    canPurge: true,
                  };
                  await handleExecuteHardPurge(target, reason);
                }}
              />
            )}
          </div>
          <h3 className="font-bold text-base text-[var(--color-text)]">
            {scheduledDel?.orgName || 'Orchid Bistro'}
          </h3>
          <div className="text-3xl font-light text-[var(--color-text)]">
            {scheduledDel ? `${scheduledDel.daysRemaining} days` : '17 days'}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {scheduledDel?.notice || 'Erases on 29 Nov · owner can still cancel'}
          </p>
        </Card>

        {/* Card 3: Patient Request / Subject Right */}
        <Card className="p-5 space-y-3 border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
          <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/40 px-2.5 py-0.5 rounded-full inline-block">
            Patient request · restrict
          </span>
          <h3 className="font-bold text-base text-[var(--color-text)]">
            {patientReq?.orgName || 'Sunrise Clinic'}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {patientReq?.summary ||
              'Patient P-•••482 asked to stop processing. Records are hidden and locked.'}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] pt-1">
            Received {patientReq?.receivedDate || 'yesterday'} · due in{' '}
            {patientReq?.dueDays || 29} days
          </p>
        </Card>
      </div>

      {/* 3. Verified Deletion Certificate Banner (C5 Banner) */}
      <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[var(--color-text)]">
              Deletion certificate · Blue Door Café
            </h4>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Signed with Ed25519, key dc-2026-1 · signature valid · 0 rows in 61 tables
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => openCertificate(summary.sampleCertificate)}
          >
            View Details
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text)]"
            onClick={() => downloadCertificateJson(summary.sampleCertificate)}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download JSON
          </Button>
        </div>
      </div>

      {/* 4. All Requests Table Card */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-sm text-[var(--color-text)]">All requests</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
              {filteredRequests.length} total
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>

            <PillNav
              items={[
                { id: 'all', label: 'All' },
                { id: 'exports', label: 'Exports' },
                { id: 'deletions', label: 'Deletions' },
                { id: 'person', label: 'Person requests' },
              ]}
              activeId={kindFilter}
              onSelect={(id) => setKindFilter(id)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="py-2.5 font-medium">Request</th>
                <th className="py-2.5 font-medium">Organization</th>
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5 font-medium">Requested</th>
                <th className="py-2.5 font-medium text-right">Result</th>
                <th className="py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--color-text-muted)]">
                    No data rights requests found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="py-3 font-medium text-[var(--color-text)]">
                      <div className="flex items-center gap-2">
                        {req.kind === 'ORGANIZATION_DELETION' ? (
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        ) : req.kind === 'ORGANIZATION_EXPORT' ? (
                          <Download className="h-3.5 w-3.5 text-teal-500" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span>{req.kindLabel}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[var(--color-text-muted)]">
                      <span className="font-medium text-[var(--color-text)]">{req.orgName}</span>
                    </td>
                    <td className="py-3">
                      {req.status === 'ERASED' ? (
                        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full font-medium">
                          {req.statusLabel}
                        </span>
                      ) : req.status === 'SCHEDULED' ? (
                        <span className="text-[10px] text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/50 px-2 py-0.5 rounded-full font-medium">
                          {req.statusLabel}
                        </span>
                      ) : req.status === 'RUNNING' ? (
                        <span className="text-[10px] text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/50 px-2 py-0.5 rounded-full font-medium">
                          {req.statusLabel}
                        </span>
                      ) : req.status === 'READY' ? (
                        <span className="text-[10px] text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/50 px-2 py-0.5 rounded-full font-medium">
                          {req.statusLabel}
                        </span>
                      ) : req.status === 'CANCELLED' ? (
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                          Cancelled
                        </span>
                      ) : (
                        <span className="text-[10px] text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5 rounded-full font-medium">
                          {req.statusLabel}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--color-text-muted)]">{req.requestedAt}</td>
                    <td className="py-3 text-right">
                      {req.hasCertificate ? (
                        <button
                          type="button"
                          onClick={() => openCertificate(req.certificate)}
                          className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700"
                        >
                          Certificate
                        </button>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">{req.resultSummary}</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {req.canPurge && (
                          <DangerousAction
                            trigger={
                              <button
                                type="button"
                                className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                              >
                                Purge
                              </button>
                            }
                            title={`Permanent Hard Purge · ${req.orgName}`}
                            description={`Immediate, irreversible destruction of all database records, schemas, and credentials for ${req.orgName}. This bypasses any cooling-off period and produces an Ed25519-signed deletion certificate.`}
                            expectedConfirmationText={`purge ${req.orgSlug}`}
                            requireReason={true}
                            confirmButtonLabel="Execute Hard Purge"
                            onConfirm={async ({ reason }) => {
                              await handleExecuteHardPurge(req, reason);
                            }}
                          />
                        )}
                        {req.canCancel && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelTarget(req);
                              setCancelReason('');
                            }}
                            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline"
                          >
                            Cancel
                          </button>
                        )}
                        {!req.canPurge && !req.canCancel && (
                          <span className="text-[11px] text-[var(--color-text-muted)]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Certificate Verification Dialog */}
      <Dialog open={isVerifyModalOpen} onOpenChange={setIsVerifyModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verify Deletion Certificate</DialogTitle>
            <DialogDescription>
              Verify an immutable, Ed25519-signed deletion certificate. Checks cryptographic signatures
              against the platform&apos;s trusted public keys and proves total database and object-store erasure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            <div className="space-y-2">
              <Label htmlFor="cert-json">Certificate JSON Payload</Label>
              <Textarea
                id="cert-json"
                rows={8}
                value={certInputText}
                onChange={(e) => setCertInputText(e.target.value)}
                placeholder='{"algorithm":"Ed25519", "keyId":"dc-2026-1", ...}'
                className="font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCertInputText(JSON.stringify(summary.sampleCertificate, null, 2));
                }}
              >
                Load Sample Certificate
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleVerify}
                disabled={isVerifying || !certInputText.trim()}
              >
                {isVerifying ? 'Verifying...' : 'Verify Cryptographic Signature'}
              </Button>
            </div>

            {verificationResult && (
              <div
                className={`p-4 rounded-[var(--radius-card)] border ${
                  verificationResult.valid
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {verificationResult.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-sm">
                      {verificationResult.valid
                        ? 'Signature Valid · Cryptographically Verified'
                        : 'Verification Failed'}
                    </div>
                    {verificationResult.valid ? (
                      <>
                        <div className="text-[var(--color-text-muted)]">
                          Algorithm:{' '}
                          <span className="font-mono font-medium text-[var(--color-text)]">
                            {verificationResult.algorithm}
                          </span>{' '}
                          · Key ID:{' '}
                          <span className="font-mono font-medium text-[var(--color-text)]">
                            {verificationResult.keyId}
                          </span>
                        </div>
                        <div className="text-[var(--color-text-muted)]">
                          Fingerprint:{' '}
                          <span className="font-mono text-[10px] text-[var(--color-text)]">
                            {verificationResult.spkiFingerprint}
                          </span>
                        </div>
                        <div className="text-[var(--color-text-muted)]">
                          Organization:{' '}
                          <span className="font-semibold text-[var(--color-text)]">
                            {verificationResult.organizationSlug || verificationResult.organizationId}
                          </span>{' '}
                          · Total Rows Deleted:{' '}
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {verificationResult.totalRowsDeleted?.toLocaleString()}
                          </span>
                        </div>
                        {verificationResult.backupNotice && (
                          <div className="text-[11px] text-[var(--color-text-muted)] pt-1 italic">
                            Notice: {verificationResult.backupNotice}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-rose-600 dark:text-rose-400 font-mono text-[11px]">
                        Reason: {verificationResult.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Certificate Inspector Dialog */}
      <Dialog open={isCertDrawerOpen} onOpenChange={setIsCertDrawerOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {activeCert
                ? `Deletion Certificate · ${activeCert.payload.organizationSlug || activeCert.payload.organizationId}`
                : 'Deletion Certificate'}
            </DialogTitle>
          </DialogHeader>

          {activeCert && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-4 rounded-[var(--radius-card)] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-bold text-sm text-[var(--color-text)]">
                      Ed25519 Cryptographic Certificate
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      Key ID: {activeCert.keyId} · SPKI: {activeCert.spkiFingerprint.slice(0, 16)}...
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadCertificateJson(activeCert)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download JSON
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                  <div className="text-[10px] text-[var(--color-text-muted)]">Total Rows Deleted</div>
                  <div className="text-base font-bold text-[var(--color-text)] mt-1">
                    {activeCert.payload.totalRowsDeleted.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                  <div className="text-[10px] text-[var(--color-text-muted)]">Objects Erased</div>
                  <div className="text-base font-bold text-[var(--color-text)] mt-1">
                    {activeCert.payload.objectStoreObjectsDeleted}
                  </div>
                </div>
                <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                  <div className="text-[10px] text-[var(--color-text-muted)]">Backup PITR</div>
                  <div className="text-base font-bold text-[var(--color-text)] mt-1">
                    {activeCert.payload.backupRetentionDays} days
                  </div>
                </div>
                <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                  <div className="text-[10px] text-[var(--color-text-muted)]">Completed At</div>
                  <div className="text-xs font-semibold text-[var(--color-text)] mt-1">
                    {new Date(activeCert.payload.completedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-xs text-[var(--color-text)]">Table Deletion Breakdown</div>
                <div className="max-h-48 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-card)] p-3 space-y-2 font-mono text-[11px] bg-[var(--color-bg)]">
                  {activeCert.payload.plugins.map((plugin) => (
                    <div key={plugin.tenantId} className="space-y-1">
                      <div className="text-[var(--color-accent)] font-semibold">
                        [{plugin.pluginId}] {plugin.tenantId}
                      </div>
                      {Object.entries(plugin.rowsDeletedByTable).map(([table, count]) => (
                        <div key={table} className="flex justify-between pl-4 text-[var(--color-text-muted)]">
                          <span>{table}</span>
                          <span className="text-[var(--color-text)]">{count} rows</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] italic">
                Notice: {activeCert.payload.backupNotice}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. New Data Rights Request Modal */}
      <Dialog open={isNewRequestModalOpen} onOpenChange={setIsNewRequestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Data Rights Request</DialogTitle>
            <DialogDescription>
              Initiate a verified GDPR / DPDP 2023 compliance action. Organization-level actions apply
              across all multi-tenant plugin engines and cell databases.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRequest} className="space-y-4 text-xs py-2">
            {formError && (
              <div className="p-3 rounded-[var(--radius-card)] bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="req-type">Action Type</Label>
              <select
                id="req-type"
                value={newRequestType}
                onChange={(e) => setNewRequestType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-card)] text-[var(--color-text)]"
              >
                <option value="ORGANIZATION_EXPORT">Full Organization Export (ZIP archive)</option>
                <option value="ORGANIZATION_DELETION">
                  Organization Deletion (30-day cooling-off & signed certificate)
                </option>
                <option value="PRINCIPAL_RESTRICTION">
                  Patient / Diner Data Processing Restriction (Lock records)
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-org">Target Organization ID or Slug</Label>
              <Input
                id="req-org"
                value={newRequestOrg}
                onChange={(e) => setNewRequestOrg(e.target.value)}
                placeholder="e.g. oasis-health, orchid-bistro, city-hospital"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-reason">Justification Reason (min 5 characters)</Label>
              <Textarea
                id="req-reason"
                rows={3}
                value={newRequestReason}
                onChange={(e) => setNewRequestReason(e.target.value)}
                placeholder="e.g. Legal erasure request under DPDP section 12, customer off-boarding..."
                required
              />
            </div>

            <DialogFooter className="gap-3 pt-3 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsNewRequestModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingNewRequest}
              >
                {isSubmittingNewRequest ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. Cancel Request Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Request · {cancelTarget?.orgName}</DialogTitle>
            <DialogDescription>
              Cancelling this data rights request will restore normal processing and cancel the scheduled
              erasure or export job.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Cancellation Reason (min 5 characters)</Label>
              <Textarea
                id="cancel-reason"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer renewed contract, erasure requested in error..."
                required
              />
            </div>

            <DialogFooter className="gap-3 pt-3 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCancelTarget(null)}
              >
                Keep Scheduled
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isCancelling || cancelReason.trim().length < 5}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

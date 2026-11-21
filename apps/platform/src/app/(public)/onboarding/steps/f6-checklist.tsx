'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  Printer,
  QrCode,
  Users,
  Smartphone,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  CreditCard,
  ChefHat,
} from 'lucide-react';
import { ProgressBar } from '@orbitox-io/ui';
import { getCustomerCsrfToken } from './csrf';

interface F6ChecklistProps {
  restaurantName: string;
  slug: string;
  tenantId: string;
  tableCount: number;
  planId: string;
  organizationId?: string;
  subscriptionStatus?: string;
  awaitingWebhook?: boolean;
}

type ItemStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ACTION_REQUIRED'
  | 'PENDING_VERIFICATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'UNAVAILABLE';

interface ChecklistItem {
  id: 'qr' | 'kds' | 'staff' | 'payment' | 'printer';
  title: string;
  description: string;
  actionLabel: string;
  status: ItemStatus;
  completed: boolean;
  statusNote?: string;
  evidence?: any;
  icon: React.ReactNode;
}

export function F6ChecklistStep({
  restaurantName,
  slug,
  tenantId,
  tableCount,
  planId,
  organizationId,
  subscriptionStatus: initialSubStatus,
  awaitingWebhook: initialAwaitingWebhook,
}: F6ChecklistProps) {
  const router = useRouter();
  const [liveActions, setLiveActions] = useState<{
    dinerPreviewUrl?: string | null;
    kdsUrl?: string | null;
    tablesUrl?: string | null;
  }>({});
  const [checklistVersion, setChecklistVersion] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [runtimeActive, setRuntimeActive] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | undefined>(initialSubStatus);
  const [awaitingWebhook, setAwaitingWebhook] = useState<boolean>(
    Boolean(initialAwaitingWebhook || initialSubStatus === 'authenticated'),
  );
  const [isServerLive, setIsServerLive] = useState(false);
  const [activationGates, setActivationGates] = useState<{
    orgMapped?: boolean;
    subscriptionActive?: boolean;
    pluginActive?: boolean;
    sagaCompleted?: boolean;
    runtimeProvisioned?: boolean;
    runtimeHealthy?: boolean;
  } | null>(null);

  // Invite Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'BILLING'>('MEMBER');
  const [invitationReference, setInvitationReference] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Printer Configuration Modal state
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerDriver, setPrinterDriver] = useState<'epson_escpos' | 'star_prnt' | 'web_bridge'>('epson_escpos');
  const [printerEndpoint, setPrinterEndpoint] = useState('192.168.1.200:9100');
  const [printerPaper, setPrinterPaper] = useState<'80mm' | '58mm'>('80mm');
  const [printerTestDispatched, setPrinterTestDispatched] = useState(false);
  const [printerTestId, setPrinterTestId] = useState<string | null>(null);
  const [printerTestError, setPrinterTestError] = useState<string | null>(null);
  const [printerSubmitting, setPrinterSubmitting] = useState(false);

  // Default checklist items
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'qr',
      title: 'Print Table QR Codes',
      description: `Download ready-to-print placards for all ${tableCount} tables with authentic cryptographic signatures.`,
      actionLabel: 'Download QR Sheet',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'Not yet printed',
      icon: <QrCode className="h-5 w-5 text-gray-500" />,
    },
    {
      id: 'kds',
      title: 'Station Kitchen Display (KDS)',
      description: 'Bookmark and open the real-time order queue on your kitchen station tablet or monitor.',
      actionLabel: 'Open Station KDS',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'Station unverified',
      icon: <ChefHat className="h-5 w-5 text-gray-500" />,
    },
    {
      id: 'staff',
      title: 'Invite Captains & Service Staff',
      description: 'Grant role-based PIN access to captains, order takers, and kitchen managers.',
      actionLabel: 'Invite Team',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'No invitations sent',
      icon: <Users className="h-5 w-5 text-gray-500" />,
    },
    {
      id: 'payment',
      title: 'Test Live UPI / Card Payment',
      description: 'Place and settle an authentic ₹1 test transaction to verify live bank reconciliation.',
      actionLabel: 'Test Settlement',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'Payment unverified',
      icon: <Smartphone className="h-5 w-5 text-gray-500" />,
    },
    {
      id: 'printer',
      title: 'Connect Thermal ESC/POS Printer',
      description: 'Auto-print Kitchen Order Tickets (KOT) on Bluetooth or LAN receipt printers.',
      actionLabel: 'Configure Printer',
      status: 'NOT_STARTED',
      completed: false,
      statusNote: 'No printer connected',
      icon: <Printer className="h-5 w-5 text-gray-500" />,
    },
  ]);

  // Load authoritative preview summary to ground URLs and runtime status
  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      if (!tenantId) return;
      try {
        const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/preview-summary`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data?.preview?.actions) {
            setLiveActions(data.preview.actions);
          }
          if (data?.preview?.restaurant?.status === 'ACTIVE' || data?.preview?.restaurant?.health === 'HEALTHY') {
            setRuntimeActive(true);
          }
        }
      } catch {}
    }
    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  // Load authoritative checklist state from server
  const loadChecklist = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/checklist`);
      if (res.ok) {
        const data = await res.json();
        if (data?.checklist) {
          if (typeof data.checklist.version === 'number') {
            setChecklistVersion(data.checklist.version);
          }
          if (data.checklist.items) {
            setItems((prev) =>
              prev.map((it) => {
                const match = data.checklist.items.find((c: any) => c.id === it.id);
                if (match) {
                  return {
                    ...it,
                    status: (match.status as ItemStatus) || (match.completed ? 'COMPLETED' : 'NOT_STARTED'),
                    completed: match.status === 'COMPLETED' || Boolean(match.completed),
                    statusNote: match.statusNote ?? it.statusNote,
                    evidence: match.evidence,
                  };
                }
                return it;
              }),
            );
            try {
              localStorage.setItem(`orbitox_onboarding_f6_${tenantId}`, JSON.stringify(data.checklist.items));
            } catch {}
          }
        }
      }
    } catch {}
  }, [tenantId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // Bounded Polling with Backoff & Focus/Visibility Recovery
  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;
    let timer: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 20;
    let delayMs = 3000;

    async function checkActivation() {
      if (cancelled) return;
      attempts++;
      try {
        const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/activation-status`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setIsServerLive(Boolean(data.isLive));
          if (data.gates) {
            setActivationGates(data.gates);
          }
          if (data.subscription?.status) {
            setSubscriptionStatus(data.subscription.status);
          }
          if (data.isAwaitingWebhook !== undefined) {
            setAwaitingWebhook(data.isAwaitingWebhook);
          }
          if (data.runtime?.status === 'ACTIVE' || data.runtime?.health === 'HEALTHY') {
            setRuntimeActive(true);
          }
          if (data.isLive) {
            setSubscriptionStatus('active');
            setAwaitingWebhook(false);
            setRuntimeActive(true);
            return; // Live reached, stop polling
          }
        }
      } catch {}

      if (!cancelled && attempts < maxAttempts) {
        delayMs = Math.min(Math.round(delayMs * 1.3), 10000);
        timer = setTimeout(checkActivation, delayMs);
      }
    }

    const onFocus = () => {
      checkActivation();
      loadChecklist();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkActivation();
        loadChecklist();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    timer = setTimeout(checkActivation, 2500);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tenantId, loadChecklist]);

  // Authoritative server mutation with concurrency control
  const sendChecklistAction = async (payload: Record<string, any>) => {
    setActionError(null);
    const csrf = getCustomerCsrfToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrf) headers['x-csrf-token'] = csrf;

    const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/checklist`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, expectedVersion: checklistVersion }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const msg = data.message || data.error || `Checklist update failed (${res.status})`;
      setActionError(msg);
      throw new Error(msg);
    }

    if (data.checklist) {
      if (typeof data.checklist.version === 'number') {
        setChecklistVersion(data.checklist.version);
      }
      if (data.checklist.items) {
        setItems((prev) =>
          prev.map((it) => {
            const match = data.checklist.items.find((c: any) => c.id === it.id);
            if (match) {
              return {
                ...it,
                status: (match.status as ItemStatus) || (match.completed ? 'COMPLETED' : 'NOT_STARTED'),
                completed: match.status === 'COMPLETED' || Boolean(match.completed),
                statusNote: match.statusNote ?? it.statusNote,
                evidence: match.evidence,
              };
            }
            return it;
          }),
        );
        try {
          localStorage.setItem(`orbitox_onboarding_f6_${tenantId}`, JSON.stringify(data.checklist.items));
        } catch {}
      }
    }
    return data;
  };

  const handleAction = async (id: string) => {
    setActionError(null);
    setActionSuccess(null);

    // 1. QR Code Action - Downloads printable placard sheet
    if (id === 'qr') {
      setActionLoading('qr');
      try {
        const downloadUrl = `/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/tables/qr-sheet`;
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || 'Failed to download QR placard sheet.');
        }

        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `qr-placards-${slug}.html`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        // Explicitly record artifact downloaded with expectedVersion
        await sendChecklistAction({ action: 'RECORD_QR_DOWNLOAD', tablesCount: tableCount });
        setActionSuccess('Ready-to-print Table QR placards downloaded. Print and place placards on tables, then confirm placement.');
      } catch (err: any) {
        setActionError(err.message || 'Failed to download QR placard sheet.');
      } finally {
        setActionLoading(null);
      }
      return;
    }

    // 2. KDS Station Action - Opens station; verifies station connectivity
    if (id === 'kds') {
      setActionLoading('kds');
      try {
        const targetUrl = liveActions.kdsUrl || `/admin/restaurant`;
        if (typeof window !== 'undefined') {
          window.open(targetUrl, '_blank');
        }

        await sendChecklistAction({ action: 'VERIFY_KDS' });
        setActionSuccess('Kitchen Display Station link verified. Mount tablet or monitor in kitchen, then confirm.');
      } catch (err: any) {
        setActionError(err.message || 'Failed to verify KDS station link.');
      } finally {
        setActionLoading(null);
      }
      return;
    }

    // 3. Team Member Invitation Modal
    if (id === 'staff') {
      setInviteError(null);
      setInviteModalOpen(true);
      return;
    }

    // 4. Payment Settlement Test - Genuinely tests order creation AND settlement
    if (id === 'payment') {
      setActionLoading('payment');
      try {
        const csrf = getCustomerCsrfToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (csrf) headers['x-csrf-token'] = csrf;

        // Step 1: Submit authentic test order
        const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/test-orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tableNumber: 'T-01',
            items: [{ name: 'Test Verification Chai', qty: 1, basePriceMinor: 100 }],
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || 'Test order creation failed on runtime.');
        }

        const orderData = await res.json();
        const placedOrderId = orderData.order?.orderId || orderData.order?.id || orderData.orderId;
        if (!placedOrderId) {
          throw new Error('Test order submitted but no order ID returned from runtime.');
        }

        // Step 2: Settle payment via backend settlement contract
        const settleRes = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/tables/settle`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tableNumber: 'T-01',
            orderId: placedOrderId,
            amountMinor: 100,
            paymentMethod: 'UPI',
            idempotencyKey: `test_settle_${tenantId.replaceAll('/', '_')}_order_${placedOrderId}`,
          }),
        }).catch(() => null);

        if (!settleRes || !settleRes.ok) {
          const errData = settleRes ? await settleRes.json().catch(() => ({})) : {};
          throw new Error(errData.message || errData.error || 'Test order placed, but settlement verification failed on runtime.');
        }

        await sendChecklistAction({
          action: 'VERIFY_PREVIEW_PAYMENT',
          orderId: placedOrderId,
          amountMinor: 100,
          paymentMethod: 'UPI',
        });
        setActionSuccess(`Preview test order placed and settled (${placedOrderId}). Now verify live gateway reconciliation.`);
      } catch (err: any) {
        setActionError(err.message || 'Payment test order or settlement failed.');
      } finally {
        setActionLoading(null);
      }
      return;
    }

    // 5. Thermal ESC/POS Printer - Opens configuration modal
    if (id === 'printer') {
      setPrinterTestDispatched(false);
      setPrinterTestId(null);
      setPrinterTestError(null);
      setPrinterModalOpen(true);
      return;
    }
  };

  const handleConfirmQrPlacement = async () => {
    setActionLoading('qr');
    try {
      await sendChecklistAction({ action: 'ATTEST_QR' });
      setActionSuccess('Table QR placard placement verified and confirmed.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to record QR placement confirmation.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmKdsMounted = async () => {
    setActionLoading('kds');
    try {
      await sendChecklistAction({ action: 'ATTEST_KDS' });
      setActionSuccess('Kitchen Display Station hardware placement confirmed.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to record KDS hardware confirmation.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyLiveGateway = async () => {
    setActionLoading('payment');
    try {
      await sendChecklistAction({ action: 'VERIFY_GATEWAY' });
      setActionSuccess('Payment gateway verified and reconciled.');
    } catch (err: any) {
      setActionError(err.message || 'Live gateway verification failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteError('Please enter a valid email address.');
      return;
    }
    setInviteSubmitting(true);
    setInviteError(null);

    try {
      const csrf = getCustomerCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrf) headers['x-csrf-token'] = csrf;

      const effectiveOrgId = organizationId || tenantId.split('/')[1] || 'current';
      const res = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(effectiveOrgId)}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Invitation failed with status ${res.status}`);
      }

      const inviteData = await res.json().catch(() => ({}));
      if (inviteData?.invitationReference) {
        setInvitationReference(inviteData.invitationReference);
      }

      await sendChecklistAction({
        action: 'INVITE_STAFF',
        email: inviteEmail.trim(),
        role: inviteRole,
        invitationReference: inviteData.invitationReference,
      });
      setActionSuccess(`Team invitation dispatched to ${inviteEmail.trim()}. Status: Awaiting recipient acceptance.`);
      setInviteModalOpen(false);
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to dispatch team invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleVerifyStaffMembership = async () => {
    setActionLoading('staff');
    try {
      await sendChecklistAction({
        action: 'VERIFY_STAFF',
        memberEmail: inviteEmail.trim() || undefined,
        invitationReference: invitationReference || undefined,
      });
      setActionSuccess('Team member verified and active in organization.');
    } catch (err: any) {
      setActionError(err.message || 'Team membership has not yet been accepted by the invited user.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatchPrinterTest = async () => {
    setPrinterSubmitting(true);
    setPrinterTestError(null);
    try {
      const csrf = getCustomerCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrf) headers['x-csrf-token'] = csrf;

      const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(tenantId)}/checklist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'DISPATCH_PRINTER_TEST',
          driver: printerDriver,
          endpoint: printerEndpoint.trim(),
          paperWidth: printerPaper,
          expectedVersion: checklistVersion,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.message || data.error || 'No printer hardware detected at this endpoint.';
        setPrinterTestError(msg);
        setPrinterTestDispatched(false);
        setPrinterTestId(null);
        return;
      }

      setPrinterTestDispatched(true);
      setPrinterTestId(data.testPrintId);
      setPrinterTestError(null);
    } catch (err: any) {
      setPrinterTestError(err.message || 'Printer test dispatch failed.');
      setPrinterTestDispatched(false);
      setPrinterTestId(null);
    } finally {
      setPrinterSubmitting(false);
    }
  };

  const handleSavePrinterConfig = async (isCompleted: boolean) => {
    setPrinterSubmitting(true);
    try {
      if (isCompleted) {
        if (!printerTestDispatched || !printerTestId) {
          setPrinterTestError('Please dispatch and verify a test receipt first, or choose "Mark Hardware Pending".');
          setPrinterSubmitting(false);
          return;
        }

        await sendChecklistAction({
          action: 'CONFIGURE_PRINTER',
          driver: printerDriver,
          endpoint: printerEndpoint.trim(),
          paperWidth: printerPaper,
          testPrintId: printerTestId,
        });
        setActionSuccess(`ESC/POS printer configured and verified.`);
      } else {
        await sendChecklistAction({
          action: 'CONFIGURE_PRINTER',
          driver: printerDriver,
          endpoint: printerEndpoint.trim(),
          paperWidth: printerPaper,
          hardwarePending: true,
        });
        setActionSuccess('Printer hardware marked pending. Digital KDS tickets active.');
      }
      setPrinterModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save printer configuration.');
    } finally {
      setPrinterSubmitting(false);
    }
  };

  const completedCount = items.filter((i) => i.completed).length;
  const isAwaitingActivation = Boolean(awaitingWebhook || subscriptionStatus === 'authenticated');
  // Authoritative server live gate: only data.isLive from the backend controls live status
  const isLiveAndActive = isServerLive;
  const isProvisioning = !isLiveAndActive && subscriptionStatus === 'active' && !isAwaitingActivation;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-4">
      {/* Header with truthful lifecycle status */}
      <div className="text-center space-y-2">
        {isAwaitingActivation ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Setup in progress · Activation pending gateway webhook</span>
          </div>
        ) : isProvisioning ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Subscription active · Provisioning runtime</span>
          </div>
        ) : isLiveAndActive ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>You are live!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
            <span>Setup Checklist · Step 6 of 6</span>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          {isLiveAndActive ? `${restaurantName} is live and ready` : `${restaurantName} setup in progress`}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto">
          {isAwaitingActivation
            ? `Your payment was authenticated. While your subscription awaits gateway webhook confirmation, complete your operational checklist below.`
            : `Your dining runtime is provisioned at ${slug}.orbitox.io. Complete setup steps to begin taking live diner orders.`}
        </p>

        {/* Authoritative Six Activation Gates Checklist */}
        {activationGates && !isLiveAndActive && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto text-left text-xs bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${activationGates.orgMapped ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-gray-700">Org & Role: {activationGates.orgMapped ? 'Verified' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${activationGates.subscriptionActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-gray-700">Subscription: {activationGates.subscriptionActive ? 'Active' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${activationGates.pluginActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-gray-700">RestaurantOS: {activationGates.pluginActive ? 'Active' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${activationGates.sagaCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-gray-700">Provisioning: {activationGates.sagaCompleted ? 'Complete' : 'In Progress'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${activationGates.runtimeProvisioned ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-gray-700">Runtime: {activationGates.runtimeProvisioned ? 'Online' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${activationGates.runtimeHealthy ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-gray-700">Health: {activationGates.runtimeHealthy ? 'Healthy' : 'Pending'}</span>
            </div>
          </div>
        )}

        {/* Progress Bar with Zero Inline Styles */}
        <div className="pt-2 max-w-md mx-auto space-y-1">
          <div className="flex justify-between text-xs font-medium text-gray-500">
            <span>Setup Checklist</span>
            <span>{completedCount} of {items.length} completed</span>
          </div>
          <ProgressBar
            value={completedCount}
            max={items.length}
            variant="success"
            size="sm"
            ariaLabel="Setup checklist progress"
            className="w-full"
          />
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Checklist Cards */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              item.completed
                ? 'bg-white border-gray-200 shadow-sm'
                : 'bg-white/70 border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  item.completed
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {item.completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`text-sm font-bold ${
                      item.completed ? 'text-gray-900' : 'text-gray-800'
                    }`}
                  >
                    {item.title}
                  </h3>
                  {item.statusNote && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.completed
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'ACTION_REQUIRED'
                          ? 'bg-amber-100 text-amber-800'
                          : item.status === 'UNAVAILABLE'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.statusNote}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
              {/* Secondary action: Confirm QR Placement */}
              {item.id === 'qr' && item.status === 'ACTION_REQUIRED' && !item.completed && (
                <button
                  type="button"
                  disabled={actionLoading === 'qr'}
                  onClick={handleConfirmQrPlacement}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Confirm Placement</span>
                </button>
              )}

              {/* Secondary action: Confirm KDS Hardware Mounted */}
              {item.id === 'kds' &&
                (item.status === 'ACTION_REQUIRED' || item.status === 'PENDING_VERIFICATION') &&
                !item.completed && (
                  <button
                    type="button"
                    disabled={actionLoading === 'kds'}
                    onClick={handleConfirmKdsMounted}
                    className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm Mounted</span>
                  </button>
                )}

              {/* Secondary action: Verify Live Gateway Payment */}
              {item.id === 'payment' &&
                item.status === 'ACTION_REQUIRED' &&
                !item.completed && (
                  <button
                    type="button"
                    disabled={actionLoading === 'payment'}
                    onClick={handleVerifyLiveGateway}
                    className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Verify Live Gateway</span>
                  </button>
                )}

              {/* Secondary action: Verify Accepted Staff Membership */}
              {item.id === 'staff' &&
                item.status === 'PENDING_VERIFICATION' &&
                !item.completed && (
                  <button
                    type="button"
                    disabled={actionLoading === 'staff'}
                    onClick={handleVerifyStaffMembership}
                    className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Verify Accepted</span>
                  </button>
                )}

              {/* Primary action button */}
              <button
                type="button"
                disabled={actionLoading === item.id}
                onClick={() => handleAction(item.id)}
                className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                  item.completed
                    ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white shadow-xs'
                }`}
              >
                {actionLoading === item.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{item.actionLabel}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Team Invitation Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-gray-200">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">Invite Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Team Member Email</label>
                <input
                  type="email"
                  required
                  placeholder="captain@myrestaurant.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Access Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="MEMBER">Member (Floor Staff / Captain)</option>
                  <option value="ADMIN">Admin (General Manager / Kitchen Head)</option>
                  <option value="BILLING">Billing (Accounts & Invoicing)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {inviteSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESC/POS Printer Configuration Modal */}
      {printerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-gray-200">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">Thermal Printer Configuration</h3>
              </div>
              <button
                type="button"
                onClick={() => setPrinterModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Printer Protocol / Driver</label>
                <select
                  value={printerDriver}
                  onChange={(e) => setPrinterDriver(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                >
                  <option value="epson_escpos">Epson ESC/POS (LAN / TCP port 9100)</option>
                  <option value="star_prnt">Star Micronics (StarPRNT Line Mode)</option>
                  <option value="web_bridge">Localhost Agent Bridge (HTTP 127.0.0.1:9100)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Network IP / Host Endpoint</label>
                <input
                  type="text"
                  value={printerEndpoint}
                  onChange={(e) => setPrinterEndpoint(e.target.value)}
                  placeholder="192.168.1.200:9100"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Paper Width</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrinterPaper('80mm')}
                    className={`py-2 px-3 rounded-xl border text-center font-medium transition-colors ${
                      printerPaper === '80mm'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    80mm Standard KOT
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterPaper('58mm')}
                    className={`py-2 px-3 rounded-xl border text-center font-medium transition-colors ${
                      printerPaper === '58mm'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    58mm Compact
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <button
                  type="button"
                  disabled={printerSubmitting}
                  onClick={handleDispatchPrinterTest}
                  className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {printerSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Dispatch Test Print Receipt</span>
                </button>

                {printerTestDispatched && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Test receipt packet acknowledged by printer bridge ({printerTestId}). Verify printed slip.</span>
                  </div>
                )}

                {printerTestError && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>{printerTestError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleSavePrinterConfig(false)}
                  className="px-3 py-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 font-medium transition-colors cursor-pointer"
                >
                  Mark Hardware Pending
                </button>

                <button
                  type="button"
                  disabled={printerSubmitting}
                  onClick={() => handleSavePrinterConfig(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Confirm Connected</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Action to Open Dashboard */}
      <div className="p-6 rounded-3xl bg-gray-950 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-base">Ready to manage your restaurant?</h4>
          <p className="text-xs text-gray-400 mt-0.5">
            Open the real-time operating dashboard to view floor matrices, revenue, and active orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            router.push('/');
          }}
          className="px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shrink-0"
        >
          <span>Open Operating Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

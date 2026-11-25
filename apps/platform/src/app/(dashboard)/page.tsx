'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Bell,
  Plus,
  ExternalLink,
  Shield,
  Building2,
  UtensilsCrossed,
  ArrowRight,
  X,
  LogIn,
  LogOut,
  Download,
  Lock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Mail,
} from 'lucide-react';

interface CustomerUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: boolean;
}

interface OrganizationRecord {
  id: string;
  slug: string;
  name: string;
  city?: string | null;
  gstin?: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'BILLING' | string;
}

interface TenantPluginItem {
  pluginId: string;
  status: string;
  suspensionReason?: string | null;
  planId?: string | null;
  subscriptionStatus?: string | null;
  currentEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

interface TenantProjectItem {
  tenantId: string;
  projectId: string;
  environmentId: string;
  name: string;
  slug: string;
  environmentName: string;
  status: string;
  plan: string;
  planTier: string;
  monthlyApiCalls: string;
  apiCallQuota: string | null;
  vertical: 'RestaurantOS' | 'HospitalOS';
  domain: string;
  plugins: TenantPluginItem[];
}

interface TeamMemberItem {
  userId: string;
  email: string;
  emailVerified: boolean;
  role: string;
  createdAt?: string;
}

interface PendingInviteItem {
  id: string;
  email: string;
  role: string;
  status: 'PENDING_ACCEPTANCE' | 'EXPIRED' | string;
  expiresAt: string;
  createdAt: string;
}

interface DataExportJobItem {
  id: string;
  status: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  purgedAt?: string | null;
  lastError?: string | null;
}

interface DeletionRequestItem {
  id: string;
  status: string;
  scheduledFor?: string;
  reason?: string | null;
  createdAt?: string;
  cancelledAt?: string | null;
}

interface TenantBillingDetail {
  tenantId: string;
  projectName: string;
  subscription: {
    razorpaySubscriptionId: string;
    pluginId: string;
    status: string;
    currentStart?: string | null;
    currentEnd?: string | null;
    cancelAtPeriodEnd: boolean;
    planMap?: {
      internalPlanId: string;
      amountMinor: number;
      currency: string;
      period: string;
      interval: number;
    } | null;
  } | null;
  invoices: Array<{ id?: string; amount?: number; status?: string; date?: number; short_url?: string }>;
  payments: Array<{ id?: string; amount?: number; status?: string; method?: string; created_at?: number }>;
}

type PendingReauthAction =
  | { type: 'export' }
  | { type: 'scheduleDeletion'; reason: string }
  | { type: 'cancelDeletion' }
  | { type: 'cancelSubscription'; subscriptionId: string };

function getCustomerCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:orbitox_customer_csrf|orbitox_csrf)=([^;]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : '';
}

function isReauthError(status: number, json: any): boolean {
  const combined = `${json?.error || ''} ${json?.code || ''} ${json?.message || ''}`.toUpperCase();
  return (
    (status === 401 || status === 403) &&
    (combined.includes('REAUTH') || combined.includes('RE-AUTH') || combined.includes('STEP_UP'))
  );
}

export default function CustomerDashboardPage() {
  const [user, setUser] = React.useState<CustomerUser | null>(null);
  const [organizations, setOrganizations] = React.useState<OrganizationRecord[]>([]);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>('');
  const [tenants, setTenants] = React.useState<TenantProjectItem[]>([]);
  const [members, setMembers] = React.useState<TeamMemberItem[]>([]);
  const [invites, setInvites] = React.useState<PendingInviteItem[]>([]);
  const [exportJobs, setExportJobs] = React.useState<DataExportJobItem[]>([]);
  const [deletionRequest, setDeletionRequest] = React.useState<DeletionRequestItem | null>(null);
  const [billingDetails, setBillingDetails] = React.useState<TenantBillingDetail[]>([]);
  const [orgLoading, setOrgLoading] = React.useState(false);
  const [billingLoading, setBillingLoading] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'Home' | 'Tenants' | 'Team' | 'Billing' | 'Data & privacy'>('Home');
  const [toastMessage, setToastMessage] = React.useState<{ text: string; tone?: 'info' | 'error' } | null>(null);

  // Customer Sign-In modal state
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginTotp, setLoginTotp] = React.useState('');
  const [showLoginTotp, setShowLoginTotp] = React.useState(false);
  const [loginBusy, setLoginBusy] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Inline Re-Auth modal state
  const [reauthOpen, setReauthOpen] = React.useState(false);
  const [reauthPassword, setReauthPassword] = React.useState('');
  const [reauthTotp, setReauthTotp] = React.useState('');
  const [reauthBusy, setReauthBusy] = React.useState(false);
  const [reauthError, setReauthError] = React.useState<string | null>(null);
  const [pendingReauthAction, setPendingReauthAction] = React.useState<PendingReauthAction | null>(null);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'ADMIN' | 'MEMBER' | 'BILLING'>('MEMBER');
  const [inviteBusy, setInviteBusy] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  // Data rights forms
  const [downloadTokenInput, setDownloadTokenInput] = React.useState('');
  const [downloadBusy, setDownloadBusy] = React.useState(false);
  const [exportBusy, setExportBusy] = React.useState(false);
  const [deletionModalOpen, setDeletionModalOpen] = React.useState(false);
  const [deletionReason, setDeletionReason] = React.useState('Owner requested organization archival');
  const [deletionBusy, setDeletionBusy] = React.useState(false);
  const [cancellingSubId, setCancellingSubId] = React.useState<string | null>(null);

  const showToast = React.useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setToastMessage({ text, tone });
    setTimeout(() => setToastMessage(null), 4200);
  }, []);

  const hydrateSession = React.useCallback(async () => {
    try {
      const meRes = await fetch('/api/v1/customer/auth/me', { cache: 'no-store' });
      if (!meRes.ok) {
        setUser(null);
        setOrganizations([]);
        setSelectedOrgId('');
        setHasLoaded(true);
        return;
      }
      const meJson = await meRes.json();
      if (meJson?.user) {
        setUser(meJson.user);
      }

      const orgRes = await fetch('/api/v1/customer/organizations', { cache: 'no-store' });
      if (orgRes.ok) {
        const orgJson = await orgRes.json();
        const orgs: OrganizationRecord[] = Array.isArray(orgJson?.organizations) ? orgJson.organizations : [];
        setOrganizations(orgs);

        const urlOrgId =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('org') || ''
            : '';
        const matched = orgs.find((o) => o.id === urlOrgId) || orgs[0];
        if (matched) {
          setSelectedOrgId(matched.id);
        } else {
          setSelectedOrgId('');
        }
      }
    } catch {
      // Guest state remains clean
    } finally {
      setHasLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const loadOrganizationWorkspace = React.useCallback(async (orgId: string, orgRole?: string) => {
    if (!orgId) return;
    setOrgLoading(true);
    setTenants([]);
    setMembers([]);
    setInvites([]);
    setExportJobs([]);
    setDeletionRequest(null);
    setBillingDetails([]);

    try {
      const [tRes, mRes, iRes] = await Promise.all([
        fetch(`/api/v1/customer/organizations/${encodeURIComponent(orgId)}/tenants`, { cache: 'no-store' }),
        fetch(`/api/v1/customer/organizations/${encodeURIComponent(orgId)}/members`, { cache: 'no-store' }),
        fetch(`/api/v1/customer/organizations/${encodeURIComponent(orgId)}/invites`, { cache: 'no-store' }),
      ]);

      let mappedTenants: TenantProjectItem[] = [];
      if (tRes.ok) {
        const tJson = await tRes.json();
        const rawTenants: any[] = Array.isArray(tJson?.tenants) ? tJson.tenants : Array.isArray(tJson?.projects) ? tJson.projects : [];
        mappedTenants = rawTenants.map((item) => {
          const p = item.project || item;
          const env = item.environment || {};
          const plugins: TenantPluginItem[] = Array.isArray(item.plugins) ? item.plugins : [];
          const isHospital = plugins.some((pl) => String(pl.pluginId || '').includes('hospital'));
          const slug = p.slug || item.slug || 'tenant';
          return {
            tenantId: item.tenantId || `org/${orgId}/project/${p.id}/environment/${env.id}`,
            projectId: p.id || item.id,
            environmentId: env.id || 'prod',
            name: p.name || item.name || slug,
            slug,
            environmentName: env.name || env.slug || 'Production',
            status: p.status === 'ACTIVE' ? 'Live' : p.status || 'Provisioning',
            plan: p.plan || 'Starter',
            planTier: p.planTier || 'STARTER',
            monthlyApiCalls: String(p.monthlyApiCalls ?? '0'),
            apiCallQuota: p.apiCallQuota ? String(p.apiCallQuota) : null,
            vertical: isHospital ? 'HospitalOS' : 'RestaurantOS',
            domain: `${slug}.localhost:4010`,
            plugins,
          };
        });
        setTenants(mappedTenants);
      }

      if (mRes.ok) {
        const mJson = await mRes.json();
        const rawMembers: any[] = Array.isArray(mJson?.members) ? mJson.members : [];
        setMembers(
          rawMembers.map((mb) => ({
            userId: mb.userId || mb.id,
            email: mb.email || '',
            emailVerified: Boolean(mb.emailVerified),
            role: mb.role || 'MEMBER',
            createdAt: mb.createdAt,
          }))
        );
      }

      if (iRes.ok) {
        const iJson = await iRes.json();
        setInvites(Array.isArray(iJson?.invites) ? iJson.invites : []);
      }

      if (orgRole === 'OWNER') {
        const [expRes, delRes] = await Promise.all([
          fetch(`/api/v1/customer/organizations/${encodeURIComponent(orgId)}/data/export`, { cache: 'no-store' }),
          fetch(`/api/v1/customer/organizations/${encodeURIComponent(orgId)}/data/deletion`, { cache: 'no-store' }),
        ]);
        if (expRes.ok) {
          const expJson = await expRes.json();
          setExportJobs(Array.isArray(expJson?.jobs) ? expJson.jobs : []);
        }
        if (delRes.ok) {
          const delJson = await delRes.json();
          setDeletionRequest(delJson?.request || null);
        }
      }

      if ((orgRole === 'OWNER' || orgRole === 'BILLING') && mappedTenants.length > 0) {
        setBillingLoading(true);
        try {
          const billingResults = await Promise.all(
            mappedTenants.slice(0, 8).map(async (t) => {
              const bRes = await fetch(
                `/api/v1/customer/organizations/${encodeURIComponent(orgId)}/tenants/${encodeURIComponent(t.projectId)}/environments/${encodeURIComponent(t.environmentId)}/billing`,
                { cache: 'no-store' }
              );
              if (!bRes.ok) return null;
              const bJson = await bRes.json();
              return {
                tenantId: t.tenantId,
                projectName: t.name,
                subscription: bJson?.subscription || null,
                invoices: Array.isArray(bJson?.invoices) ? bJson.invoices : [],
                payments: Array.isArray(bJson?.payments) ? bJson.payments : [],
              } as TenantBillingDetail;
            })
          );
          setBillingDetails(billingResults.filter((x): x is TenantBillingDetail => x !== null));
        } finally {
          setBillingLoading(false);
        }
      }
    } catch {
      // Transient fetch failures remain non-fatal
    } finally {
      setOrgLoading(false);
    }
  }, []);

  const activeOrg = organizations.find((o) => o.id === selectedOrgId) || organizations[0] || null;

  React.useEffect(() => {
    if (!selectedOrgId) return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('org') !== selectedOrgId) {
        url.searchParams.set('org', selectedOrgId);
        window.history.replaceState({}, '', url.toString());
      }
    }
    const role = organizations.find((o) => o.id === selectedOrgId)?.role;
    loadOrganizationWorkspace(selectedOrgId, role);
  }, [selectedOrgId, organizations, loadOrganizationWorkspace]);

  const firstName = user?.name ? user.name.split(' ')[0] : user?.email ? user.email.split('@')[0] : null;
  const userInitials = firstName ? firstName.slice(0, 2).toUpperCase() : 'OX';

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Enter your registered email and password.');
      return;
    }
    setLoginBusy(true);
    try {
      const res = await fetch('/api/v1/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
          totpCode: loginTotp.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (String(json?.error || '').toLowerCase().includes('verification code')) {
          setShowLoginTotp(true);
        }
        setLoginError(json?.error || 'Sign-in failed.');
        return;
      }
      setLoginPassword('');
      setLoginTotp('');
      setLoginOpen(false);
      await hydrateSession();
      showToast(json?.mfaSetupRequired ? 'Signed in. MFA setup recommended in security settings.' : 'Signed in to OrbitoX Customer Portal.');
    } catch (err: any) {
      setLoginError(err?.message || 'Unable to contact authentication server.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleCustomerLogout = async () => {
    try {
      await fetch('/api/v1/customer/auth/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': getCustomerCsrfToken() },
      });
    } finally {
      setUser(null);
      setOrganizations([]);
      setSelectedOrgId('');
      setTenants([]);
      setMembers([]);
      setInvites([]);
      setExportJobs([]);
      setDeletionRequest(null);
      setBillingDetails([]);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('org');
        window.history.replaceState({}, '', url.toString());
      }
      showToast('Signed out.');
    }
  };

  const executeRequestExport = React.useCallback(async () => {
    if (!selectedOrgId) return;
    setExportBusy(true);
    try {
      const res = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/data/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCustomerCsrfToken(),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (isReauthError(res.status, json)) {
        setPendingReauthAction({ type: 'export' });
        setReauthOpen(true);
        return;
      }
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Export request rejected.');
      }
      showToast('DPDP/GDPR organization export job queued.');
      await loadOrganizationWorkspace(selectedOrgId, activeOrg?.role);
    } catch (err: any) {
      showToast(err?.message || 'Unable to trigger data export.', 'error');
    } finally {
      setExportBusy(false);
    }
  }, [selectedOrgId, activeOrg?.role, loadOrganizationWorkspace, showToast]);

  const executeScheduleDeletion = React.useCallback(async (reason: string) => {
    if (!selectedOrgId) return;
    setDeletionBusy(true);
    try {
      const res = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/data/deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCustomerCsrfToken(),
        },
        body: JSON.stringify({ reason: reason.trim() || 'Owner initiated via Customer Portal' }),
      });
      const json = await res.json().catch(() => ({}));
      if (isReauthError(res.status, json)) {
        setDeletionModalOpen(false);
        setPendingReauthAction({ type: 'scheduleDeletion', reason });
        setReauthOpen(true);
        return;
      }
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Could not schedule deletion.');
      }
      setDeletionModalOpen(false);
      showToast('30-day organization deletion grace period scheduled.');
      await loadOrganizationWorkspace(selectedOrgId, activeOrg?.role);
    } catch (err: any) {
      showToast(err?.message || 'Unable to schedule deletion.', 'error');
    } finally {
      setDeletionBusy(false);
    }
  }, [selectedOrgId, activeOrg?.role, loadOrganizationWorkspace, showToast]);

  const executeCancelDeletion = React.useCallback(async () => {
    if (!selectedOrgId) return;
    setDeletionBusy(true);
    try {
      const res = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/data/deletion`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCustomerCsrfToken() },
      });
      const json = await res.json().catch(() => ({}));
      if (isReauthError(res.status, json)) {
        setPendingReauthAction({ type: 'cancelDeletion' });
        setReauthOpen(true);
        return;
      }
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Could not cancel scheduled deletion.');
      }
      showToast('Scheduled deletion cancelled.');
      await loadOrganizationWorkspace(selectedOrgId, activeOrg?.role);
    } catch (err: any) {
      showToast(err?.message || 'Unable to cancel deletion.', 'error');
    } finally {
      setDeletionBusy(false);
    }
  }, [selectedOrgId, activeOrg?.role, loadOrganizationWorkspace, showToast]);

  const executeCancelSubscription = React.useCallback(async (subscriptionId: string) => {
    if (!selectedOrgId) return;
    setCancellingSubId(subscriptionId);
    try {
      const res = await fetch(
        `/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCustomerCsrfToken(),
          },
        }
      );
      const json = await res.json().catch(() => ({}));
      if (isReauthError(res.status, json)) {
        setPendingReauthAction({ type: 'cancelSubscription', subscriptionId });
        setReauthOpen(true);
        return;
      }
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Subscription cancellation failed.');
      }
      showToast('Subscription cancellation scheduled at period end.');
      await loadOrganizationWorkspace(selectedOrgId, activeOrg?.role);
    } catch (err: any) {
      showToast(err?.message || 'Unable to cancel subscription.', 'error');
    } finally {
      setCancellingSubId(null);
    }
  }, [selectedOrgId, activeOrg?.role, loadOrganizationWorkspace, showToast]);

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReauthError(null);
    if (!reauthPassword) {
      setReauthError('Enter your password to verify identity.');
      return;
    }
    setReauthBusy(true);
    try {
      const res = await fetch('/api/v1/customer/auth/reauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCustomerCsrfToken(),
        },
        body: JSON.stringify({
          password: reauthPassword,
          totpCode: reauthTotp.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setReauthError(json?.error || 'Re-authentication failed.');
        return;
      }
      const nextAction = pendingReauthAction;
      setReauthPassword('');
      setReauthTotp('');
      setPendingReauthAction(null);
      setReauthOpen(false);
      showToast('Identity verified.');
      if (nextAction?.type === 'export') await executeRequestExport();
      else if (nextAction?.type === 'scheduleDeletion') await executeScheduleDeletion(nextAction.reason);
      else if (nextAction?.type === 'cancelDeletion') await executeCancelDeletion();
      else if (nextAction?.type === 'cancelSubscription') await executeCancelSubscription(nextAction.subscriptionId);
    } catch (err: any) {
      setReauthError(err?.message || 'Unable to complete re-authentication.');
    } finally {
      setReauthBusy(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!selectedOrgId) {
      setInviteError('Select an organization first.');
      return;
    }
    const email = inviteEmail.trim();
    if (!email || !email.includes('@')) {
      setInviteError('Enter a valid work email address.');
      return;
    }
    setInviteBusy(true);
    try {
      const res = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCustomerCsrfToken(),
        },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInviteError(json?.message || json?.error || 'Failed to dispatch invitation.');
        return;
      }
      setInviteEmail('');
      setInviteOpen(false);
      showToast(`Invitation queued for ${json.email || email} (${json.role || inviteRole}).`);
      await loadOrganizationWorkspace(selectedOrgId, activeOrg?.role);
    } catch (err: any) {
      setInviteError(err?.message || 'Could not send invitation.');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleDownloadExportArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;
    const token = downloadTokenInput.trim();
    if (!token) {
      showToast('Paste your one-time export download token first.', 'error');
      return;
    }
    setDownloadBusy(true);
    try {
      const res = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/data/export/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCustomerCsrfToken(),
        },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Download failed (${res.status}).`);
      }
      const blob = await res.blob();
      const disp = res.headers.get('content-disposition') || '';
      const fnMatch = /filename="([^"]+)"/.exec(disp);
      const filename = fnMatch?.[1] || 'orbitox-organization-export.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadTokenInput('');
      showToast(`Downloaded ${filename}.`);
      await loadOrganizationWorkspace(selectedOrgId, activeOrg?.role);
    } catch (err: any) {
      showToast(err?.message || 'Could not download export archive.', 'error');
    } finally {
      setDownloadBusy(false);
    }
  };

  const navTabs = ['Home', 'Tenants', 'Team', 'Billing', 'Data & privacy'] as const;

  const weeklyChartColumns = [
    { id: 'mon', label: 'M', height: 24 },
    { id: 'tue', label: 'T', height: 32 },
    { id: 'wed', label: 'W', height: 40 },
    { id: 'thu', label: 'T', height: 36 },
    { id: 'fri', label: 'F', height: 56 },
    { id: 'sat', label: 'S', height: 72 },
    { id: 'sun', label: 'S', height: 48 },
  ];

  const canInviteMembers = activeOrg?.role === 'OWNER' || activeOrg?.role === 'ADMIN';
  const canReadBilling = activeOrg?.role === 'OWNER' || activeOrg?.role === 'BILLING';
  const isOwner = activeOrg?.role === 'OWNER';

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-slate-900 overflow-x-hidden">
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-semibold shadow-xl flex items-center gap-2 max-w-xs ${
            toastMessage.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shrink-0">
                OX
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm sm:text-base text-slate-900 shrink-0">OrbitoX</span>
                <span className="text-slate-300">/</span>
                {user && organizations.length > 0 ? (
                  <select
                    aria-label="Select organization"
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-800 max-w-[200px] sm:max-w-[240px] truncate outline-none focus:border-blue-500"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-xs sm:text-sm text-slate-500 truncate">
                    Customer Portal
                  </span>
                )}
              </div>
            </div>

            <div className="flex md:hidden items-center gap-2 shrink-0">
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setLoginError(null);
                    setLoginOpen(true);
                  }}
                  className="rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold"
                >
                  Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCustomerLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center"
                >
                  {userInitials}
                </button>
              )}
            </div>
          </div>

          <nav
            aria-label="Customer workspace navigation"
            className="flex bg-slate-100 rounded-full p-1 gap-1 overflow-x-auto max-w-full"
          >
            {navTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <Link
              href="/console/overview"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-full border border-slate-200"
            >
              Operator Console
            </Link>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => showToast(`Signed in as ${user.email}`)}
                  aria-label="Notifications"
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                >
                  <Bell size={16} />
                </button>
                <div
                  title={user.email}
                  className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center"
                >
                  {userInitials}
                </div>
                <button
                  type="button"
                  onClick={handleCustomerLogout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  <LogOut size={13} />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginError(null);
                  setLoginOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 text-xs font-semibold"
              >
                <LogIn size={13} />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {!hasLoaded ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Loading workspace...
          </div>
        ) : !user ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                OrbitoX Customer Workspace
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Launch your hospitality or clinic workspace
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Sign in with your verified customer account to switch organizations, invite team members, manage subscriptions, or create a new RestaurantOS tenant.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setLoginError(null);
                  setLoginOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 text-sm font-semibold shadow-sm"
              >
                <LogIn size={16} />
                <span>Sign in</span>
              </button>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-sm font-semibold shadow-sm"
              >
                <Plus size={16} />
                <span>Start onboarding</span>
              </Link>
              <Link
                href="/console/overview"
                className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-300 text-slate-800 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                <span>Operator console</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ) : null}

        {/* Authenticated tabs */}
        {user && activeTab === 'Home' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  Hello, {firstName}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {activeOrg?.name || 'No organization yet'} · {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'} ·{' '}
                  {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => selectedOrgId && loadOrganizationWorkspace(selectedOrgId, activeOrg?.role)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={14} className={orgLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <Link
                  href={activeOrg ? `/onboarding?org=${encodeURIComponent(activeOrg.id)}` : '/onboarding'}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a tenant</span>
                </Link>
              </div>
            </div>

            {organizations.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Create your first organization</h2>
                  <p className="text-sm text-slate-500 mt-1">Your account has no organizations yet. Complete onboarding to provision a workspace.</p>
                </div>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-2.5 text-xs font-semibold shrink-0"
                >
                  <span>Continue onboarding</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7 bg-white rounded-[28px] border border-slate-200/80 shadow-sm p-6 sm:p-8 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                        <TrendingUp size={15} />
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">Workspace activity</h2>
                    </div>
                    <p className="text-xs text-slate-500 ml-9">
                      {activeOrg?.name}: provisioned environments &amp; API throughput cadence.
                    </p>
                    <div className="mt-5 ml-9 flex flex-wrap items-baseline gap-3">
                      <span className="text-4xl font-extrabold text-slate-900 tabular-nums">{tenants.length}</span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        {tenants.length === 0 ? 'Zero-project org ready' : 'Provisioned environments'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-8 px-4 sm:px-9 h-36">
                    {weeklyChartColumns.map((col, idx) => (
                      <div key={`${col.id}-${idx}`} className="flex flex-col items-center gap-2">
                        <div className="w-1.5 rounded-full bg-slate-200 relative" style={{ height: `${col.height}px` }}>
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -top-1 left-1/2 -translate-x-1/2" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{col.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-slate-900 text-white rounded-[28px] p-6 sm:p-8 flex flex-col justify-between shadow-lg">
                  <div>
                    <h2 className="text-base font-bold text-white">{activeOrg?.name}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeOrg?.city || 'Global'} · {activeOrg?.gstin || 'No GSTIN configured'}
                    </p>
                    <div className="my-5 text-3xl font-extrabold tracking-tight">
                      {activeOrg?.role || 'OWNER'}
                    </div>
                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span>Provisioned tenants</span>
                        <span className="tabular-nums">{tenants.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active team members</span>
                        <span className="tabular-nums">{members.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending invitations</span>
                        <span className="tabular-nums">{invites.filter((i) => i.status === 'PENDING_ACCEPTANCE').length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('Tenants')}
                      className="flex-1 rounded-full bg-white text-slate-900 py-2.5 px-4 text-xs font-semibold hover:bg-slate-100"
                    >
                      View Tenants
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Billing')}
                      className="flex-1 rounded-full bg-slate-800 text-white border border-slate-700 py-2.5 px-4 text-xs font-semibold hover:bg-slate-700"
                    >
                      Billing &amp; Plan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: TENANTS */}
        {user && activeTab === 'Tenants' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Your Tenants</h1>
                <p className="text-sm text-slate-500">
                  All SaaS workspaces deployed for <strong>{activeOrg?.name || 'your organization'}</strong>.
                </p>
              </div>
              <Link
                href={activeOrg ? `/onboarding?org=${encodeURIComponent(activeOrg.id)}` : '/onboarding'}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-2.5 text-xs font-semibold self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>Deploy new tenant</span>
              </Link>
            </div>

            {orgLoading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                Loading organization tenants...
              </div>
            ) : tenants.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                <div className="text-sm font-semibold text-slate-800">
                  No tenants provisioned for {activeOrg?.name || 'this organization'} yet.
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  This organization currently has zero projects. Use the onboarding flow to launch your first RestaurantOS or HospitalOS workspace under {activeOrg?.name}.
                </p>
                <Link
                  href={activeOrg ? `/onboarding?org=${encodeURIComponent(activeOrg.id)}` : '/onboarding'}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-5 py-2 text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Create project &amp; launch</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tenants.map((t) => (
                  <div key={t.tenantId} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between gap-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center shrink-0">
                            {t.vertical === 'HospitalOS' ? <Building2 size={18} /> : <UtensilsCrossed size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{t.name}</div>
                            <div className="text-xs font-mono text-slate-500 truncate">{t.domain}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 shrink-0">
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center justify-between">
                        <span>Environment: <strong>{t.environmentName}</strong></span>
                        <span>Plan: <strong>{t.plan}</strong></span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{t.vertical}</span>
                      <a
                        href={t.vertical === 'HospitalOS' ? '/hms' : `http://${t.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-4 py-1.5 text-xs font-semibold"
                      >
                        <span>Open App</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TEAM */}
        {user && activeTab === 'Team' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Team &amp; Access</h1>
                <p className="text-sm text-slate-500">
                  Manage organization owners, administrators, members, and billing contacts for <strong>{activeOrg?.name}</strong>.
                </p>
              </div>
              {canInviteMembers && (
                <button
                  type="button"
                  onClick={() => {
                    setInviteError(null);
                    setInviteOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-2.5 text-xs font-semibold self-start sm:self-auto"
                >
                  <Plus size={15} />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 overflow-x-auto">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Active Members ({members.length})</h2>
              <table className="w-full text-left text-xs min-w-[540px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-3 px-2 font-semibold">Email</th>
                    <th className="py-3 px-2 font-semibold">Role</th>
                    <th className="py-3 px-2 font-semibold">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">
                        No team members loaded for the selected organization.
                      </td>
                    </tr>
                  ) : (
                    members.map((mb) => (
                      <tr key={mb.userId}>
                        <td className="py-3 px-2 font-semibold text-slate-900">{mb.email}</td>
                        <td className="py-3 px-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">{mb.role}</span>
                        </td>
                        <td className="py-3 px-2 font-semibold">
                          {mb.emailVerified ? (
                            <span className="text-emerald-700">Verified</span>
                          ) : (
                            <span className="text-amber-600">Unverified</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 overflow-x-auto">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Mail size={15} className="text-slate-500" />
                <span>Pending Invitations ({invites.length})</span>
              </h2>
              <table className="w-full text-left text-xs min-w-[540px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-3 px-2 font-semibold">Invited Email</th>
                    <th className="py-3 px-2 font-semibold">Role</th>
                    <th className="py-3 px-2 font-semibold">Status</th>
                    <th className="py-3 px-2 font-semibold">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invites.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        No pending invitations.
                      </td>
                    </tr>
                  ) : (
                    invites.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-3 px-2 font-semibold text-slate-900">{inv.email}</td>
                        <td className="py-3 px-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">{inv.role}</span>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-semibold ${
                              inv.status === 'PENDING_ACCEPTANCE'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {inv.status === 'PENDING_ACCEPTANCE' ? 'Pending acceptance' : 'Expired'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-500">
                          {new Date(inv.expiresAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: BILLING */}
        {user && activeTab === 'Billing' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Subscription &amp; Invoicing</h1>
                <p className="text-sm text-slate-500">
                  Commercial plan status, API quotas, and Razorpay billing records for <strong>{activeOrg?.name}</strong>.
                </p>
              </div>
              <Link
                href={activeOrg ? `/onboarding?org=${encodeURIComponent(activeOrg.id)}` : '/onboarding'}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-2.5 text-xs font-semibold shrink-0"
              >
                New Checkout / Plan Setup
              </Link>
            </div>

            {!canReadBilling ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 text-sm text-slate-600">
                Your current role (<strong>{activeOrg?.role}</strong>) does not have billing read permissions. Only Organization <strong>OWNER</strong> or <strong>BILLING</strong> members can view and manage subscriptions.
              </div>
            ) : billingLoading || orgLoading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                Loading live billing &amp; quota telemetry...
              </div>
            ) : tenants.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                No deployed workspaces in {activeOrg?.name}. Deploy a workspace via onboarding to subscribe to a commercial plan.
              </div>
            ) : (
              <div className="space-y-4">
                {tenants.map((t) => {
                  const detail = billingDetails.find((b) => b.tenantId === t.tenantId);
                  const sub = detail?.subscription;
                  const used = Number(t.monthlyApiCalls) || 0;
                  const quota = t.apiCallQuota ? Number(t.apiCallQuota) : null;
                  const pct = quota && quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

                  return (
                    <div key={t.tenantId} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <CreditCard size={18} />
                          </span>
                          <div>
                            <h2 className="text-base font-bold text-slate-900">
                              {t.name} · <span className="text-slate-500 font-medium">{t.environmentName}</span>
                            </h2>
                            <div className="text-xs text-slate-500">
                              Plan: <strong>{sub?.planMap?.internalPlanId || t.plan}</strong> · Subscription:{' '}
                              <strong>{sub ? sub.status : 'No Razorpay mandate linked'}</strong>
                              {sub?.cancelAtPeriodEnd ? ' (Cancels at period end)' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {sub && isOwner && !sub.cancelAtPeriodEnd && ['active', 'authenticated', 'pending', 'halted', 'paused'].includes(sub.status) && (
                            <button
                              type="button"
                              disabled={cancellingSubId === sub.razorpaySubscriptionId}
                              onClick={() => executeCancelSubscription(sub.razorpaySubscriptionId)}
                              className="rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50 px-4 py-1.5 text-xs font-semibold"
                            >
                              {cancellingSubId === sub.razorpaySubscriptionId ? 'Scheduling...' : 'Cancel at Period End'}
                            </button>
                          )}
                          <Link
                            href={`/onboarding?org=${encodeURIComponent(selectedOrgId)}`}
                            className="rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-1.5 text-xs font-semibold"
                          >
                            Configure Plan
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="font-semibold text-slate-600 mb-1">Monthly API Usage &amp; Quota</div>
                          <div className="text-base font-bold text-slate-900 tabular-nums">
                            {used.toLocaleString()} {quota ? `/ ${quota.toLocaleString()} calls` : 'calls (Unmetered)'}
                          </div>
                          {quota && (
                            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="font-semibold text-slate-600 mb-1">Billing Period &amp; Provider</div>
                          <div className="text-sm font-bold text-slate-900">
                            {sub?.currentEnd ? `Renews ${new Date(sub.currentEnd).toLocaleDateString('en-IN')}` : 'Dev / Pre-checkout'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {sub
                              ? `Subscription ID: ${sub.razorpaySubscriptionId}`
                              : 'Plan tier upgrades apply after verified Razorpay checkout webhook.'}
                          </div>
                        </div>
                      </div>

                      {detail && detail.invoices.length > 0 && (
                        <div className="overflow-x-auto">
                          <div className="text-xs font-bold text-slate-700 mb-2">Provider Invoices ({detail.invoices.length})</div>
                          <table className="w-full text-left text-xs min-w-[440px]">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-500">
                                <th className="py-2 font-semibold">Invoice</th>
                                <th className="py-2 font-semibold">Amount</th>
                                <th className="py-2 font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {detail.invoices.map((inv, idx) => (
                                <tr key={inv.id || idx}>
                                  <td className="py-2 font-mono">{inv.id || `INV-${idx + 1}`}</td>
                                  <td className="py-2 tabular-nums">
                                    {inv.amount ? `₹${(inv.amount / 100).toLocaleString('en-IN')}` : '—'}
                                  </td>
                                  <td className="py-2 font-semibold">{inv.status || 'issued'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DATA & PRIVACY */}
        {user && activeTab === 'Data & privacy' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Data Sovereignty &amp; Privacy</h1>
              <p className="text-sm text-slate-500">
                DPDP/GDPR organization archive exports and deletion scheduling for <strong>{activeOrg?.name}</strong> (step-up re-authentication enforced).
              </p>
            </div>

            {!isOwner ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 text-sm text-slate-600">
                Data export and organization erasure are restricted to Organization <strong>OWNER</strong> members. Your role on {activeOrg?.name} is <strong>{activeOrg?.role}</strong>.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={18} className="text-emerald-600" />
                        <h2 className="text-base font-bold text-slate-900">Organization Data Export</h2>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Queue an encrypted DPDP/GDPR zip bundle of organization settings, members, audit records, and tenant data.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={exportBusy}
                      onClick={executeRequestExport}
                      className="self-start rounded-full bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-semibold"
                    >
                      {exportBusy ? 'Queueing...' : 'Request Data Export'}
                    </button>
                  </div>

                  <div className="bg-white rounded-3xl border border-rose-200 p-6 flex flex-col justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-rose-700 mb-2">Organization Erasure</h2>
                      {deletionRequest && ['SCHEDULED', 'IN_PROGRESS'].includes(deletionRequest.status) ? (
                        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <AlertTriangle size={14} />
                            <span>Deletion {deletionRequest.status}</span>
                          </div>
                          {deletionRequest.scheduledFor && (
                            <div>Purge date: {new Date(deletionRequest.scheduledFor).toLocaleString('en-IN')}</div>
                          )}
                          {deletionRequest.reason && <div>Reason: {deletionRequest.reason}</div>}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Schedule organization deletion with a 30-day cancellable grace period and signed deletion certificate.
                        </p>
                      )}
                    </div>
                    {deletionRequest && deletionRequest.status === 'SCHEDULED' ? (
                      <button
                        type="button"
                        disabled={deletionBusy}
                        onClick={executeCancelDeletion}
                        className="self-start rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-semibold"
                      >
                        {deletionBusy ? 'Cancelling...' : 'Cancel Scheduled Deletion'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletionModalOpen(true)}
                        className="self-start rounded-full bg-white border border-rose-300 text-rose-700 px-5 py-2 text-xs font-semibold hover:bg-rose-50"
                      >
                        Schedule Deletion
                      </button>
                    )}
                  </div>
                </div>

                {/* Export Jobs & Archive Download */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 overflow-x-auto">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Export Job History ({exportJobs.length})</h3>
                    <table className="w-full text-left text-xs min-w-[440px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500">
                          <th className="py-2 font-semibold">Job ID</th>
                          <th className="py-2 font-semibold">Status</th>
                          <th className="py-2 font-semibold">Requested</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {exportJobs.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-slate-500">
                              No data export jobs requested yet.
                            </td>
                          </tr>
                        ) : (
                          exportJobs.map((job) => (
                            <tr key={job.id}>
                              <td className="py-2.5 font-mono text-slate-800">{job.id.slice(0, 16)}…</td>
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-semibold ${
                                    job.status === 'SUCCEEDED'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : job.status === 'FAILED'
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {job.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-500">
                                {new Date(job.createdAt).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Download size={16} className="text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">Download Export Archive</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Once your export worker finishes, enter the one-time download token dispatched to your owner email.
                    </p>
                    <form onSubmit={handleDownloadExportArchive} className="space-y-3">
                      <input
                        type="text"
                        value={downloadTokenInput}
                        onChange={(e) => setDownloadTokenInput(e.target.value)}
                        placeholder="Paste one-time export token..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={downloadBusy}
                        className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-semibold"
                      >
                        {downloadBusy ? 'Downloading ZIP...' : 'Download Export ZIP'}
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Customer Sign-In Dialog */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Customer Portal Sign In</h3>
              <button type="button" onClick={() => setLoginOpen(false)} aria-label="Close sign in" className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            {loginError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 font-medium">
                {loginError}
              </div>
            )}
            <form onSubmit={handleCustomerLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="owner@company.com"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              {(showLoginTotp || loginTotp) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Authenticator Code (MFA)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={loginTotp}
                    onChange={(e) => setLoginTotp(e.target.value)}
                    placeholder="6-digit code"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <Link href="/onboarding" className="text-xs font-semibold text-blue-600 hover:underline">
                  Need an account? Start onboarding
                </Link>
                <button
                  type="submit"
                  disabled={loginBusy}
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {loginBusy ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step-up Re-authentication Dialog */}
      {reauthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={17} className="text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Verify Your Password</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReauthOpen(false);
                  setPendingReauthAction(null);
                }}
                aria-label="Close re-authentication"
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This privileged organization action requires fresh password verification before continuing.
            </p>
            {reauthError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 font-medium">
                {reauthError}
              </div>
            )}
            <form onSubmit={handleReauthSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Confirm account password"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Authenticator Code (if MFA enabled)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={reauthTotp}
                  onChange={(e) => setReauthTotp(e.target.value)}
                  placeholder="Optional 6-digit TOTP"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReauthOpen(false);
                    setPendingReauthAction(null);
                  }}
                  className="rounded-full px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reauthBusy}
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-slate-900 text-white"
                >
                  {reauthBusy ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Dialog */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Invite Team Member</h3>
              <button type="button" onClick={() => setInviteOpen(false)} aria-label="Close invite" className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            {inviteError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 font-medium">
                {inviteError}
              </div>
            )}
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER' | 'BILLING')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="BILLING">Billing Manager</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteBusy}
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-blue-600 text-white"
                >
                  {inviteBusy ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Dialog */}
      {deletionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Confirm Deletion Schedule</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This schedules organization deletion for <strong>{activeOrg?.name}</strong> with a 30-day recovery window. You can cancel anytime before the deadline.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason (audit log)</label>
              <input
                type="text"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletionModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletionBusy}
                onClick={() => executeScheduleDeletion(deletionReason)}
                className="rounded-full px-5 py-2 text-xs font-semibold bg-rose-600 text-white"
              >
                {deletionBusy ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

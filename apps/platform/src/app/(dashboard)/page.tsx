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
} from 'lucide-react';

interface CustomerUser {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

interface OrganizationRecord {
  id: string;
  slug: string;
  name: string;
  city?: string | null;
  gstin?: string | null;
  role: string;
}

interface TenantProjectItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  vertical: 'RestaurantOS' | 'HospitalOS';
  domain: string;
}

interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

function getCustomerCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:orbitox_customer_csrf|orbitox_csrf)=([^;]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : '';
}

export default function CustomerDashboardPage() {
  const [user, setUser] = React.useState<CustomerUser | null>(null);
  const [organizations, setOrganizations] = React.useState<OrganizationRecord[]>([]);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>('');
  const [tenants, setTenants] = React.useState<TenantProjectItem[]>([]);
  const [members, setMembers] = React.useState<TeamMemberItem[]>([]);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'Home' | 'Tenants' | 'Team' | 'Billing' | 'Data & privacy'>('Home');
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Invite modal state (replaces window.prompt)
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('ADMIN');
  const [inviteBusy, setInviteBusy] = React.useState(false);

  // Deletion confirm modal state (replaces window.confirm)
  const [deletionModalOpen, setDeletionModalOpen] = React.useState(false);
  const [deletionBusy, setDeletionBusy] = React.useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  React.useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const meRes = await fetch('/api/v1/customer/auth/me', { cache: 'no-store' });
        if (!meRes.ok) {
          if (mounted) setHasLoaded(true);
          return;
        }
        const meJson = await meRes.json();
        if (mounted && meJson?.user) {
          setUser(meJson.user);
        }

        const orgRes = await fetch('/api/v1/customer/organizations', { cache: 'no-store' });
        if (orgRes.ok) {
          const orgJson = await orgRes.json();
          const orgs: OrganizationRecord[] = Array.isArray(orgJson?.organizations) ? orgJson.organizations : [];
          if (mounted) {
            setOrganizations(orgs);
            const firstOrg = orgs[0];
            if (firstOrg) {
              setSelectedOrgId(firstOrg.id);
            }
          }
        }
      } catch {
        // Leave empty guest view cleanly
      } finally {
        if (mounted) setHasLoaded(true);
      }
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!selectedOrgId) return;
    let mounted = true;
    async function loadOrgDetails() {
      try {
        const [tRes, mRes] = await Promise.all([
          fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/tenants`, { cache: 'no-store' }),
          fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/members`, { cache: 'no-store' }),
        ]);

        if (tRes.ok && mounted) {
          const tJson = await tRes.json();
          const rawTenants: any[] = Array.isArray(tJson?.tenants) ? tJson.tenants : Array.isArray(tJson?.projects) ? tJson.projects : [];
          const mapped: TenantProjectItem[] = rawTenants.map((item) => {
            const p = item.project || item;
            const slug = p.slug || item.slug || 'tenant';
            const pluginIds = Array.isArray(p.pluginIds) ? p.pluginIds : [];
            const isHospital = pluginIds.some((pid: string) => String(pid).includes('hospital'));
            return {
              id: p.id || item.id,
              name: p.name || item.name || slug,
              slug,
              status: item.status === 'ACTIVE' || p.status === 'ACTIVE' ? 'Live' : 'Setting up',
              vertical: isHospital ? 'HospitalOS' : 'RestaurantOS',
              domain: `${slug}.localhost:4010`,
            };
          });
          setTenants(mapped);
        }

        if (mRes.ok && mounted) {
          const mJson = await mRes.json();
          const rawMembers: any[] = Array.isArray(mJson?.members) ? mJson.members : [];
          setMembers(
            rawMembers.map((mb) => ({
              id: mb.userId || mb.id,
              name: mb.user?.name || mb.email || 'Member',
              email: mb.user?.email || mb.email || '',
              role: mb.role || 'MEMBER',
              status: mb.status || 'ACTIVE',
            }))
          );
        }
      } catch {
        // Ignore transient network errors
      }
    }
    loadOrgDetails();
    return () => {
      mounted = false;
    };
  }, [selectedOrgId]);

  const activeOrg = organizations.find((o) => o.id === selectedOrgId) || organizations[0] || null;
  const firstName = user?.name ? user.name.split(' ')[0] : user?.email ? user.email.split('@')[0] : null;
  const userInitials = firstName ? firstName.slice(0, 2).toUpperCase() : 'OX';

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      showToast('Create or select an organization first via Onboarding.');
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
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Failed to send invitation.');
      }
      showToast(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Could not send invitation.');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRequestExport = async () => {
    if (!selectedOrgId) {
      showToast('Sign in with a verified organization to request a data export.');
      return;
    }
    try {
      const res = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/data/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCustomerCsrfToken(),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Export request rejected.');
      showToast('DPDP/GDPR archive job initiated for your organization.');
    } catch (err: any) {
      showToast(err?.message || 'Unable to trigger data export.');
    }
  };

  const handleConfirmDeletion = async () => {
    if (!selectedOrgId) return;
    setDeletionBusy(true);
    try {
      const res = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(selectedOrgId)}/data/deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCustomerCsrfToken(),
        },
        body: JSON.stringify({ reason: 'Owner initiated via Customer Workspace' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Could not schedule deletion.');
      showToast('30-day organization deletion grace period scheduled.');
      setDeletionModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Unable to schedule deletion.');
    } finally {
      setDeletionBusy(false);
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

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-slate-900 overflow-x-hidden">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl text-xs font-semibold shadow-xl flex items-center gap-2 max-w-xs">
          <span>{toastMessage}</span>
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
                <span className="font-medium text-xs sm:text-sm text-slate-500 truncate">
                  {activeOrg?.name || 'Customer Portal'}
                </span>
              </div>
            </div>

            <div className="flex md:hidden items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center">
                {userInitials}
              </div>
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
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
            <button
              type="button"
              onClick={() => showToast('No unread workspace notifications.')}
              aria-label="Notifications"
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <Bell size={16} />
            </button>
            <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center">
              {userInitials}
            </div>
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
                Create an organization, provision dedicated RestaurantOS or HospitalOS tenants with cryptographic data isolation, and manage billing and team access.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
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

        {/* TAB 1: HOME */}
        {activeTab === 'Home' && user && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  Hello, {firstName}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {activeOrg?.name || 'Personal account'} · {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'}
                </p>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Add a tenant</span>
              </Link>
            </div>

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
                    Connected tenants &amp; provisioned environments.
                  </p>
                  <div className="mt-5 ml-9 flex flex-wrap items-baseline gap-3">
                    <span className="text-4xl font-extrabold text-slate-900 tabular-nums">{tenants.length}</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Active tenants
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
                  <h2 className="text-base font-bold text-white">Organization</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeOrg?.city || 'Global'} · {activeOrg?.gstin || 'No GSTIN configured'}
                  </p>
                  <div className="my-5 text-3xl font-extrabold tracking-tight">
                    {activeOrg?.role || 'OWNER'}
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Tenants</span>
                      <span>{tenants.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Team members</span>
                      <span>{members.length}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('Billing')}
                  className="mt-6 w-full rounded-full bg-white text-slate-900 py-2.5 text-xs font-semibold hover:bg-slate-100"
                >
                  Change plan or billing →
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: TENANTS */}
        {activeTab === 'Tenants' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Your Tenants</h1>
                <p className="text-sm text-slate-500">All SaaS workspaces deployed for {activeOrg?.name || 'your account'}.</p>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-2.5 text-xs font-semibold self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>Deploy new tenant</span>
              </Link>
            </div>

            {tenants.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                No tenants provisioned for this organization yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tenants.map((t) => (
                  <div key={t.id} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between gap-4 shadow-sm">
                    <div>
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
        {activeTab === 'Team' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Team &amp; Access</h1>
                <p className="text-sm text-slate-500">Invite organization administrators and billing contacts.</p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-2.5 text-xs font-semibold self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>Invite Member</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[540px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="py-3 px-2 font-semibold">Member</th>
                    <th className="py-3 px-2 font-semibold">Email</th>
                    <th className="py-3 px-2 font-semibold">Role</th>
                    <th className="py-3 px-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No team members loaded for the selected organization.
                      </td>
                    </tr>
                  ) : (
                    members.map((mb) => (
                      <tr key={mb.id}>
                        <td className="py-3 px-2 font-semibold text-slate-900">{mb.name}</td>
                        <td className="py-3 px-2 text-slate-500">{mb.email}</td>
                        <td className="py-3 px-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">{mb.role}</span>
                        </td>
                        <td className="py-3 px-2 text-emerald-700 font-semibold">{mb.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: BILLING */}
        {activeTab === 'Billing' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Subscription &amp; Invoicing</h1>
              <p className="text-sm text-slate-500">Manage commercial subscription tiers, Razorpay mandates, and GST receipts.</p>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Plan &amp; Billing Controls</h2>
                <p className="text-xs text-slate-500 mt-1">
                  To upgrade or cancel commercial plans, use the Onboarding plan flow or Operator Billing dashboard.
                </p>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-5 py-2.5 text-xs font-semibold shrink-0"
              >
                Manage Plan
              </Link>
            </div>
          </div>
        )}

        {/* TAB 5: DATA & PRIVACY */}
        {activeTab === 'Data & privacy' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Data Sovereignty &amp; Privacy</h1>
              <p className="text-sm text-slate-500">Export organization records or schedule a 30-day DPDP/GDPR deletion request.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={18} className="text-emerald-600" />
                    <h2 className="text-base font-bold text-slate-900">Organization Data Export</h2>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Generate a downloadable archive of organization configuration, member audit history, and tenant datasets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRequestExport}
                  className="self-start rounded-full bg-slate-900 text-white px-5 py-2 text-xs font-semibold"
                >
                  Request Data Export
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-rose-200 p-6 flex flex-col justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-rose-700 mb-2">Organization Erasure</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Schedule organization deletion with a 30-day cancellable grace period and cryptographically signed certificate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletionModalOpen(true)}
                  className="self-start rounded-full bg-white border border-rose-300 text-rose-700 px-5 py-2 text-xs font-semibold hover:bg-rose-50"
                >
                  Schedule Deletion
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Invite Member Dialog */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Invite Team Member</h3>
              <button type="button" onClick={() => setInviteOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
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
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="ADMIN">Admin</option>
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
              This schedules organization deletion with a 30-day recovery window. You can cancel anytime before the deadline.
            </p>
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
                onClick={handleConfirmDeletion}
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

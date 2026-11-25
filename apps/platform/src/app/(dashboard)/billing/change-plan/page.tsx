'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';

interface PlanFeatureDto {
  featureKey: string;
  description?: string | null;
  enabled: boolean;
}

interface PlanQuotaDto {
  quotaKey: string;
  limit: number;
  window: string;
  unit?: string | null;
}

interface PlanCatalogueItem {
  id: string;
  planId: string;
  pluginId: string;
  name: string;
  description?: string | null;
  tier: string;
  priceMinor: number;
  currency: string;
  billingInterval: string;
  gracePeriodDays: number;
  features: PlanFeatureDto[];
  quotas: PlanQuotaDto[];
}

interface BillingPlanMapItem {
  razorpayPlanId: string;
  pluginId: string;
  internalPlanId: string;
  amountMinor: number;
  currency: string;
  period: string;
  interval: number;
}

interface SubscriptionRecord {
  razorpaySubscriptionId: string;
  tenantId: string;
  pluginId: string;
  status: string;
  currentStart?: string | null;
  currentEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  planMap: {
    razorpayPlanId: string;
    internalPlanId: string;
    amountMinor: number;
    currency: string;
    period: string;
    interval: number;
  };
}

interface ProjectUsageRecord {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planTier: string;
  monthlyApiCalls: string;
  apiCallQuota: string | null;
  environments: Array<{ id: string; name: string; slug: string }>;
}

function getCustomerCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const m = /(?:^|;\s*)(?:orbitox_customer_csrf|orbitox_csrf)=([^;]+)/.exec(document.cookie);
  return m?.[1] ? decodeURIComponent(m[1]) : '';
}

function formatInrMinor(amountMinor: number): string {
  const rupees = Math.round(amountMinor / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export default function CustomerChangePlanPage() {
  const [orgId, setOrgId] = React.useState('');
  const [subIdParam, setSubIdParam] = React.useState('');
  const [tenantParam, setTenantParam] = React.useState('');

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [organizationName, setOrganizationName] = React.useState('');
  const [organizationGstin, setOrganizationGstin] = React.useState<string | null>(null);
  const [canChangeBillingPlan, setCanChangeBillingPlan] = React.useState(false);

  const [plans, setPlans] = React.useState<PlanCatalogueItem[]>([]);
  const [planMaps, setPlanMaps] = React.useState<BillingPlanMapItem[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionRecord[]>([]);
  const [projects, setProjects] = React.useState<ProjectUsageRecord[]>([]);

  const [cycle, setCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const [selectedRazorpayPlanId, setSelectedRazorpayPlanId] = React.useState<string>('');
  const [selectedPlanInternalId, setSelectedPlanInternalId] = React.useState<string>('');

  const [submitBusy, setSubmitBusy] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [requestedResult, setRequestedResult] = React.useState<{
    subscriptionId: string;
    status: string;
    requestedPlanId: string;
    message: string;
    checkoutKeyId?: string;
  } | null>(null);

  // Inline Re-auth state
  const [reauthOpen, setReauthOpen] = React.useState(false);
  const [reauthPassword, setReauthPassword] = React.useState('');
  const [reauthTotp, setReauthTotp] = React.useState('');
  const [reauthBusy, setReauthBusy] = React.useState(false);
  const [reauthError, setReauthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const o = sp.get('org') || '';
    const s = sp.get('subscription') || '';
    const t = sp.get('tenant') || '';
    setOrgId(o);
    setSubIdParam(s);
    setTenantParam(t);

    if (!o) {
      setError('Missing organization context (?org=...). Return to the Customer Portal Billing tab to select an organization.');
      setLoading(false);
      return;
    }

    fetch(`/api/v1/customer/organizations/${encodeURIComponent(o)}/billing/plans`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || `Unable to load plan catalogue (${res.status}).`);
        }
        setOrganizationName(json?.organization?.name || 'Organization');
        setOrganizationGstin(json?.organization?.gstin || null);
        setCanChangeBillingPlan(Boolean(json?.canChangeBillingPlan));
        setPlans(Array.isArray(json?.plans) ? json.plans : []);
        setPlanMaps(Array.isArray(json?.billingPlanMaps) ? json.billingPlanMaps : []);
        setSubscriptions(Array.isArray(json?.subscriptions) ? json.subscriptions : []);
        setProjects(Array.isArray(json?.projects) ? json.projects : []);
      })
      .catch((err: any) => {
        setError(err?.message || 'Unable to load organization billing catalogue.');
      })
      .finally(() => setLoading(false));
  }, []);

  const activeSubscription =
    subscriptions.find((s) => s.razorpaySubscriptionId === subIdParam) ||
    subscriptions.find((s) => tenantParam && s.tenantId === tenantParam) ||
    subscriptions[0] ||
    null;

  const targetPluginId = activeSubscription?.pluginId || '@orbitox/restaurant';
  const relevantPlans = plans.filter((p) => p.pluginId === targetPluginId);
  const displayPlans = relevantPlans.length > 0 ? relevantPlans : plans;

  const relevantMaps = planMaps.filter((m) => m.pluginId === targetPluginId);
  const hasAnnualOption = relevantMaps.some((m) => m.period === 'yearly' || m.period === 'annual');

  const resolveMapForPlan = (internalPlanId: string): BillingPlanMapItem | undefined => {
    const exactCycle = cycle === 'yearly' ? ['yearly', 'annual'] : ['monthly', 'month'];
    return (
      relevantMaps.find((m) => m.internalPlanId === internalPlanId && exactCycle.includes(m.period)) ||
      relevantMaps.find((m) => m.internalPlanId === internalPlanId) ||
      planMaps.find((m) => m.internalPlanId === internalPlanId)
    );
  };

  React.useEffect(() => {
    if (selectedPlanInternalId || displayPlans.length === 0) return;
    const currentId = activeSubscription?.planMap?.internalPlanId || projects[0]?.plan || '';
    const candidate = displayPlans.find((p) => p.planId !== currentId) || displayPlans[0];
    if (candidate) {
      setSelectedPlanInternalId(candidate.planId);
      const mapRow = resolveMapForPlan(candidate.planId);
      setSelectedRazorpayPlanId(mapRow?.razorpayPlanId || candidate.planId);
    }
  }, [displayPlans, activeSubscription, projects, selectedPlanInternalId]);

  const currentPlanId = activeSubscription?.planMap?.internalPlanId || projects[0]?.plan || '';
  const selectedPlan = displayPlans.find((p) => p.planId === selectedPlanInternalId) || displayPlans[0] || null;
  const selectedMap = selectedPlan ? resolveMapForPlan(selectedPlan.planId) : undefined;

  const totalApiCallsUsed = projects.reduce((sum, p) => sum + (Number(p.monthlyApiCalls) || 0), 0);
  const totalApiCallsQuota = projects.reduce((sum, p) => sum + (Number(p.apiCallQuota) || 0), 0);

  const selectedAmountMinor = selectedMap?.amountMinor ?? selectedPlan?.priceMinor ?? 0;
  const baseTaxableMinor = Math.round(selectedAmountMinor / 1.18);
  const gstMinor = selectedAmountMinor - baseTaxableMinor;

  const executePlanAction = async () => {
    if (!orgId || !selectedPlan) return;
    setSubmitError(null);
    setRequestedResult(null);

    if (!canChangeBillingPlan) {
      setSubmitError('Only the Organization Owner can change billing plans or approve Razorpay mandates.');
      return;
    }

    const effectivePlanId = selectedMap?.razorpayPlanId || selectedRazorpayPlanId || selectedPlan.planId;
    const idempotencyKey = `plan-chg-${orgId.slice(-8)}-${Date.now()}`;
    setSubmitBusy(true);

    try {
      if (activeSubscription) {
        if (!selectedMap) {
          setSubmitError(`Plan "${selectedPlan.name}" does not have an active Razorpay BillingPlanMap SKU for this plugin.`);
          return;
        }
        const res = await fetch(
          `/api/v1/customer/organizations/${encodeURIComponent(orgId)}/billing/subscriptions/${encodeURIComponent(activeSubscription.razorpaySubscriptionId)}/change-plan`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': getCustomerCsrfToken(),
              'idempotency-key': idempotencyKey,
            },
            body: JSON.stringify({ razorpayPlanId: selectedMap.razorpayPlanId }),
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = String(json?.error || '');
          if (msg.toUpperCase().includes('REAUTH') || msg.toUpperCase().includes('RE-AUTH')) {
            setReauthError(null);
            setReauthOpen(true);
            return;
          }
          if (res.status === 403) {
            throw new Error(json?.error || 'Permission denied: only organization owners can modify active subscriptions.');
          }
          if (res.status === 409) {
            throw new Error(`Subscription cannot change plan in its current state (${activeSubscription.status}).`);
          }
          if (res.status === 422) {
            throw new Error(json?.error || 'Invalid billing plan mapping or idempotency check.');
          }
          throw new Error(json?.error || `Provider declined plan change (${res.status}).`);
        }

        setRequestedResult({
          subscriptionId: json.subscriptionId || activeSubscription.razorpaySubscriptionId,
          status: json.status || activeSubscription.status,
          requestedPlanId: json.requestedPlanId || selectedPlan.planId,
          message:
            json.message ||
            'Plan change requested with Razorpay. The new entitlement becomes active only after the verified Razorpay webhook arrives.',
        });
      } else {
        const targetTenantId =
          tenantParam ||
          (projects[0]?.environments?.[0]
            ? `org/${orgId}/project/${projects[0].id}/environment/${projects[0].environments[0].id}`
            : '');
        if (!targetTenantId) {
          throw new Error('Create a project/tenant environment before initiating subscription checkout.');
        }
        const res = await fetch(
          `/api/v1/customer/organizations/${encodeURIComponent(orgId)}/billing/checkout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': getCustomerCsrfToken(),
              'idempotency-key': idempotencyKey,
            },
            body: JSON.stringify({
              tenantId: targetTenantId,
              razorpayPlanId: effectivePlanId,
            }),
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || `Checkout session initialization failed (${res.status}).`);
        }
        setRequestedResult({
          subscriptionId: json.subscriptionId || 'pending',
          status: json.status || 'created',
          requestedPlanId: selectedPlan.planId,
          checkoutKeyId: json.razorpayKeyId,
          message:
            'Razorpay checkout mandate initialized. Final plan activation is applied asynchronously when the verified Razorpay payment webhook arrives.',
        });
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Unable to process plan change request.');
    } finally {
      setSubmitBusy(false);
    }
  };

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReauthError(null);
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
      if (!res.ok) {
        setReauthError(json?.error || 'Re-authentication failed. Check password/TOTP.');
        return;
      }
      setReauthPassword('');
      setReauthTotp('');
      setReauthOpen(false);
      await executePlanAction();
    } catch (err: any) {
      setReauthError(err?.message || 'Unable to verify credentials.');
    } finally {
      setReauthBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8">
        {/* Top Breadcrumb + Billing Cycle Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link
                href={orgId ? `/?org=${encodeURIComponent(orgId)}` : '/'}
                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
              >
                <ArrowLeft size={13} />
                <span>Billing</span>
              </Link>
              <span>/</span>
              <span>Change plan</span>
              {organizationName && (
                <>
                  <span>·</span>
                  <span className="text-slate-700 font-semibold">{organizationName}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Pick what fits your group
            </h1>
            <p className="text-sm text-slate-500">
              Prices are inclusive of 18% GST. Plan entitlements activate strictly upon verified Razorpay webhook settlement.
            </p>
          </div>

          <div className="inline-flex items-center bg-white border border-slate-200 rounded-full p-1 self-start sm:self-auto shadow-sm">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                cycle === 'monthly' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              disabled={!hasAnnualOption}
              title={hasAnnualOption ? 'Switch to annual billing' : 'Annual Razorpay SKUs are not enabled on this catalogue'}
              onClick={() => hasAnnualOption && setCycle('yearly')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                cycle === 'yearly'
                  ? 'bg-slate-900 text-white'
                  : hasAnnualOption
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              Yearly {hasAnnualOption ? '· save 16%' : '(Unavailable)'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Loading authoritative billing plans &amp; quotas...
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 flex items-start gap-3 text-rose-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="text-sm font-bold">{error}</div>
              <Link
                href={orgId ? `/?org=${encodeURIComponent(orgId)}` : '/'}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-4 py-1.5 text-xs font-semibold"
              >
                Return to Portal
              </Link>
            </div>
          </div>
        ) : (
          <>
            {!canChangeBillingPlan && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-900 flex items-center gap-2.5">
                <Lock size={15} className="shrink-0" />
                <span>Only the Organization Owner can request subscription changes. You can compare quotas and pricing in read-only mode.</span>
              </div>
            )}

            {submitError && (
              <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-xs text-rose-800 font-medium flex items-center gap-2.5">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {requestedResult && (
              <div role="status" className="bg-blue-50 border border-blue-200 rounded-3xl p-5 space-y-2 text-blue-950">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Clock size={16} className="text-blue-600" />
                  <span>Plan change requested · Awaiting verified Razorpay webhook</span>
                </div>
                <p className="text-xs leading-relaxed text-blue-900">{requestedResult.message}</p>
                <div className="text-[11px] font-mono text-blue-800 flex flex-wrap gap-4 pt-1">
                  <span>Subscription: {requestedResult.subscriptionId}</span>
                  <span>Status: {requestedResult.status}</span>
                  <span>Requested plan: {requestedResult.requestedPlanId}</span>
                  <span>Applied immediately: false</span>
                </div>
              </div>
            )}

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayPlans.map((plan) => {
                const mapItem = resolveMapForPlan(plan.planId);
                const isCurrent = currentPlanId === plan.planId;
                const isSelected = selectedPlan?.planId === plan.planId;
                const displayMinor = mapItem?.amountMinor ?? plan.priceMinor;
                const tierDiff = selectedPlan ? displayMinor - (activeSubscription?.planMap?.amountMinor ?? 0) : 0;
                const isPro = plan.tier.toLowerCase().includes('pro') || plan.tier.toLowerCase().includes('scale');

                return (
                  <div
                    key={plan.planId}
                    onClick={() => {
                      setSelectedPlanInternalId(plan.planId);
                      setSelectedRazorpayPlanId(mapItem?.razorpayPlanId || plan.planId);
                    }}
                    className={`rounded-[28px] p-6 flex flex-col justify-between gap-6 cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-slate-900 text-white shadow-lg border border-slate-800'
                        : isSelected
                          ? 'bg-white text-slate-900 border-2 border-blue-600 shadow-md'
                          : 'bg-white text-slate-900 border border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-bold">{plan.name}</span>
                        {isCurrent ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-900">
                            Current plan
                          </span>
                        ) : isPro ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                            Recommended
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold tracking-tight tabular-nums">
                          {formatInrMinor(displayMinor)}
                        </span>
                        <span className={`text-xs ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                          /{mapItem?.period || plan.billingInterval}
                        </span>
                      </div>

                      {plan.description && (
                        <p className={`text-xs leading-relaxed ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                          {plan.description}
                        </p>
                      )}

                      <div className="space-y-2 pt-2 border-t border-current/10">
                        {plan.quotas.map((q) => (
                          <div key={q.quotaKey} className="flex items-center justify-between text-xs">
                            <span className={isCurrent ? 'text-slate-300' : 'text-slate-600'}>
                              {q.quotaKey.replace(/_/g, ' ')}
                            </span>
                            <span className="font-bold tabular-nums">
                              {q.limit.toLocaleString()} {q.unit || ''}
                            </span>
                          </div>
                        ))}
                        {plan.features.filter((f) => f.enabled).map((f) => (
                          <div key={f.featureKey} className="flex items-start gap-2 text-xs">
                            <Check size={14} className={`shrink-0 mt-0.5 ${isCurrent ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            <span className={isCurrent ? 'text-slate-200' : 'text-slate-700'}>
                              {f.description || f.featureKey}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanInternalId(plan.planId);
                        setSelectedRazorpayPlanId(mapItem?.razorpayPlanId || plan.planId);
                      }}
                      className={`w-full rounded-full py-2.5 px-4 text-xs font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-white/10 text-white border border-white/20'
                          : isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {isCurrent
                        ? 'Selected (Current Plan)'
                        : tierDiff < 0
                          ? `Select ${plan.name}`
                          : `Choose ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Summary Grid: Current Usage + Tax/Summary CTA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-7 bg-white rounded-[28px] border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Current Organization Usage &amp; Mandate</h2>
                  {organizationGstin && (
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                      GSTIN: {organizationGstin}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <div className="text-slate-500 font-medium">API Calls (Current Month)</div>
                    <div className="text-lg font-extrabold text-slate-900 mt-1 tabular-nums">
                      {totalApiCallsUsed.toLocaleString()}
                      {totalApiCallsQuota > 0 ? ` / ${totalApiCallsQuota.toLocaleString()}` : ''}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <div className="text-slate-500 font-medium">Active Razorpay Mandate</div>
                    <div className="text-sm font-bold text-slate-900 mt-1 break-all">
                      {activeSubscription ? activeSubscription.razorpaySubscriptionId : 'Pre-checkout (No subscription yet)'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {activeSubscription
                        ? `Status: ${activeSubscription.status}`
                        : 'Submitting will create an authenticated checkout mandate.'}
                    </div>
                  </div>
                </div>

                {selectedPlan && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      Target Plan Limits ({selectedPlan.name})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlan.quotas.map((q) => (
                        <span
                          key={q.quotaKey}
                          className="text-[11px] font-semibold bg-slate-100 text-slate-800 px-3 py-1 rounded-full"
                        >
                          {q.quotaKey.replace(/_/g, ' ')}: {q.limit.toLocaleString()} {q.unit || ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dark Summary Card matching 'Change plan (customer).png' */}
              <div className="lg:col-span-5 bg-slate-900 text-white rounded-[28px] p-6 flex flex-col justify-between gap-5 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">Summary</h2>
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </div>

                  {selectedPlan ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>{selectedPlan.name} (Taxable value)</span>
                        <span className="font-mono text-white">{formatInrMinor(baseTaxableMinor)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>IGST / CGST+SGST (18% incl.)</span>
                        <span className="font-mono text-white">{formatInrMinor(gstMinor)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Billing SKU</span>
                        <span className="font-mono text-[11px]">
                          {selectedMap?.razorpayPlanId || 'Not mapped in BillingPlanMap'}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
                        <span className="text-slate-300 font-semibold">Recurring total</span>
                        <span className="text-2xl font-extrabold tabular-nums">
                          {formatInrMinor(selectedAmountMinor)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Select a plan above to review pricing and quotas.</div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={submitBusy || !selectedPlan || !canChangeBillingPlan}
                  onClick={executePlanAction}
                  className="w-full rounded-full bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 py-3 px-5 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <CreditCard size={14} />
                  <span>
                    {submitBusy
                      ? 'Submitting request...'
                      : activeSubscription
                        ? 'Confirm and request plan change'
                        : 'Confirm and start Razorpay checkout'}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Inline Re-authentication Modal for server-enforced plan change */}
      {reauthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="change-plan-reauth-title" className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={17} className="text-amber-600" />
                <h3 id="change-plan-reauth-title" className="text-lg font-bold text-slate-900">
                  Confirm Your Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReauthOpen(false)}
                aria-label="Close re-authentication"
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Changing subscription billing plans requires step-up password confirmation before calling Razorpay.
            </p>
            {reauthError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 font-medium">
                {reauthError}
              </div>
            )}
            <form onSubmit={handleReauthSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Password</label>
                <input
                  type="password"
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter your password"
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
                  onClick={() => setReauthOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reauthBusy}
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  {reauthBusy ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

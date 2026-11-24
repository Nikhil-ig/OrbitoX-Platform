'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Building2,
  ArrowRight,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import { getCustomerCsrfToken } from './csrf';

interface F5PlanProps {
  organizationId: string;
  organizationName: string;
  city: string;
  gstin?: string;
  tenantId: string;
  restaurantName: string;
  onSuccess: (data: {
    planId: string;
    billingCycle: 'monthly' | 'annual';
    subscriptionStatus?: string;
    awaitingWebhook?: boolean;
  }) => void;
  onBack: () => void;
}

interface PlanOption {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Ideal for cafés and single-room restaurants',
    monthlyPrice: 1999,
    annualPrice: 1599,
    features: [
      'Up to 15 tables on 1 floor',
      'Optical cryptographic Dine QR codes',
      'Realtime Kitchen Display System (KDS)',
      'UPI, Credit Card & Netbanking integration',
      'Automated GST compliant billing',
      'Standard email & chat support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For bustling restaurants seeking speed & scale',
    monthlyPrice: 4999,
    annualPrice: 3999,
    popular: true,
    features: [
      'Up to 50 tables across 3 floors',
      'Companion real-time table order pooling',
      'DAG kitchen prep graph scheduler',
      'Dynamic inventory & 86 item toggles',
      'Detailed revenue & dish analytics',
      'Priority WhatsApp & phone hotline',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Enterprise',
    tagline: 'For multi-outlet brands and luxury hospitality',
    monthlyPrice: 9999,
    annualPrice: 7999,
    features: [
      'Unlimited tables & unlimited floors',
      'Multi-location central control plane',
      'Custom domain (e.g. order.mybistro.in)',
      'Fully custom white-label branding',
      'Audit log with Merkle hash integrity',
      'Dedicated success manager & 99.99% SLA',
    ],
  },
];

export function F5PlanStep({
  organizationId,
  organizationName,
  city,
  gstin: initialGstin,
  tenantId,
  restaurantName,
  onSuccess,
  onBack,
}: F5PlanProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('growth');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [gstin, setGstin] = useState(initialGstin || '');
  const [billingEmail, setBillingEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRzpRef = React.useRef<any>(null);

  const isDevEnvironment =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '4010' ||
      window.location.port === '3005' ||
      process.env.NODE_ENV === 'development');

  // Authoritatively extract owning organization ID from canonical tenantId (org/{orgId}/...)
  const resolvedOrgId = React.useMemo(() => {
    const m = /^org\/([^/]+)\//.exec(tenantId);
    return m && m[1] ? m[1] : organizationId;
  }, [tenantId, organizationId]);

  // Safe official Razorpay Checkout SDK loader
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).Razorpay) {
      setIsSdkLoaded(true);
      return;
    }
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      const handleLoad = () => setIsSdkLoaded(true);
      existingScript.addEventListener('load', handleLoad);
      return () => existingScript.removeEventListener('load', handleLoad);
    }
    setSdkLoading(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      setIsSdkLoaded(true);
      setSdkLoading(false);
    };
    script.onerror = () => {
      setSdkLoading(false);
      if (!isDevEnvironment) {
        setError('Payment gateway SDK could not be loaded. Please disable ad-blockers or content filters and refresh.');
      }
    };
    document.body.appendChild(script);
  }, [isDevEnvironment]);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1]!;
  const pricePerMonth = billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
  const subtotal = billingCycle === 'annual' ? pricePerMonth * 12 : pricePerMonth;
  const gstAmount = Math.round(subtotal * 0.18);
  const totalDue = subtotal + gstAmount;

  const handleCancelCheckout = () => {
    try {
      activeRzpRef.current?.close();
    } catch {
      // Ignored if modal was not initialized
    }
    activeRzpRef.current = null;
    setIsSubmitting(false);
  };

  const handleDevSimulatedActivation = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const csrf = getCustomerCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrf) headers['x-csrf-token'] = csrf;

      // 1. Initialize or query checkout
      const res = await fetch(
        `/api/v1/customer/organizations/${encodeURIComponent(resolvedOrgId)}/billing/checkout`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'idempotency-key': `plan_${tenantId.replace(/[^A-Za-z0-9]/g, '_')}_${Date.now()}`,
          },
          body: JSON.stringify({
            tenantId,
            razorpayPlanId: `plan_${selectedPlanId}_${billingCycle}`,
            billingCycle,
            gstin: gstin.trim() || undefined,
          }),
        },
      );

      const checkoutData = await res.json().catch(() => ({}));
      const subscriptionId =
        checkoutData.subscriptionId || checkoutData.result?.subscriptionId || `sub_dev_${Date.now()}`;

      // 2. Direct development confirmation
      const confirmRes = await fetch(
        `/api/v1/customer/organizations/${encodeURIComponent(resolvedOrgId)}/billing/checkout/confirm`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            subscriptionId,
            paymentId: `pay_dev_${Date.now()}`,
            signature: 'dev_mock_signature_valid_for_local_development_testing_only_12345678',
          }),
        },
      );

      const cdata = await confirmRes.json().catch(() => ({}));
      onSuccess({
        planId: selectedPlan.id,
        billingCycle,
        subscriptionStatus: cdata.status || 'authenticated',
        awaitingWebhook: cdata.awaitingWebhook ?? true,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to simulate dev activation. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const csrf = getCustomerCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrf) headers['x-csrf-token'] = csrf;

      // 1. Initialize checkout session with payment gateway
      const res = await fetch(
        `/api/v1/customer/organizations/${encodeURIComponent(resolvedOrgId)}/billing/checkout`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'idempotency-key': `plan_${tenantId.replace(/[^A-Za-z0-9]/g, '_')}_${Date.now()}`,
          },
          body: JSON.stringify({
            tenantId,
            razorpayPlanId: `plan_${selectedPlanId}_${billingCycle}`,
            billingCycle,
            gstin: gstin.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || `Payment gateway checkout failed with status ${res.status}`);
      }

      const checkoutData = await res.json();
      const subscriptionId = checkoutData.subscriptionId || checkoutData.result?.subscriptionId;
      const keyId = checkoutData.keyId || checkoutData.result?.keyId;

      if (!subscriptionId) {
        throw new Error('No subscription ID returned by payment gateway.');
      }

      // Safe local development simulation when running without live Razorpay banking keys
      if (keyId === 'rzp_test_devmock123' || subscriptionId.startsWith('sub_dev_') || isDevEnvironment) {
        const confirmRes = await fetch(
          `/api/v1/customer/organizations/${encodeURIComponent(resolvedOrgId)}/billing/checkout/confirm`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              subscriptionId,
              paymentId: `pay_dev_${Date.now()}`,
              signature: 'dev_mock_signature_valid_for_local_development_testing_only_12345678',
            }),
          },
        );
        if (!confirmRes.ok) {
          const cdata = await confirmRes.json().catch(() => ({}));
          throw new Error(cdata.message || cdata.error || 'Failed to complete development checkout.');
        }
        const cdata = await confirmRes.json();
        onSuccess({
          planId: selectedPlan.id,
          billingCycle,
          subscriptionStatus: cdata.status || 'authenticated',
          awaitingWebhook: cdata.awaitingWebhook ?? true,
        });
        return;
      }

      // For live production environments: verify SDK presence
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Razorpay Checkout SDK is not loaded. Please wait for the payment gateway to initialize or refresh the page.');
      }

      // 2. Open authentic Razorpay checkout modal and await real signature confirmation
      const confirmData = await new Promise<{ status?: string; awaitingWebhook?: boolean }>((resolve, reject) => {
        let settled = false;
        const safeResolve = (val: any) => {
          if (!settled) {
            settled = true;
            resolve(val);
          }
        };
        const safeReject = (err: any) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        };

        try {
          const rzp = new (window as any).Razorpay({
            key: keyId,
            subscription_id: subscriptionId,
            name: organizationName || 'OrbitoX Platform',
            description: `${selectedPlan.name} Subscription (${billingCycle})`,
            prefill: {
              email: billingEmail.trim() || undefined,
            },
            handler: async (resp: {
              razorpay_payment_id: string;
              razorpay_subscription_id?: string;
              razorpay_signature: string;
            }) => {
              try {
                if (!resp.razorpay_payment_id || !resp.razorpay_signature) {
                  throw new Error('Payment gateway did not provide authentic payment credentials.');
                }
                const confirmRes = await fetch(
                  `/api/v1/customer/organizations/${encodeURIComponent(resolvedOrgId)}/billing/checkout/confirm`,
                  {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      subscriptionId: resp.razorpay_subscription_id || subscriptionId,
                      paymentId: resp.razorpay_payment_id,
                      signature: resp.razorpay_signature,
                    }),
                  },
                );

                if (!confirmRes.ok) {
                  const cdata = await confirmRes.json().catch(() => ({}));
                  throw new Error(cdata.message || cdata.error || 'Failed to verify payment confirmation.');
                }
                const cdata = await confirmRes.json();
                safeResolve(cdata);
              } catch (confirmErr: any) {
                safeReject(confirmErr);
              }
            },
            modal: {
              ondismiss: () => {
                safeReject(new Error('Checkout window was closed before completing payment. You can retry activating your plan below.'));
              },
            },
          });

          activeRzpRef.current = rzp;

          // Do NOT reject the entire checkout promise on payment.failed!
          // Razorpay allows the user to retry payment inside the modal!
          rzp.on('payment.failed', (resp: any) => {
            console.warn('[Razorpay] Payment attempt failed:', resp);
            const desc = resp?.error?.description || resp?.error?.reason || 'Payment authentication failed.';
            setError(`Payment attempt failed: ${desc}. You can retry inside the payment window or close it to change plans.`);
          });

          rzp.open();
        } catch (initErr: any) {
          safeReject(initErr);
        }
      });

      onSuccess({
        planId: selectedPlanId,
        billingCycle,
        subscriptionStatus: confirmData?.status || 'authenticated',
        awaitingWebhook: confirmData?.awaitingWebhook ?? true,
      });
    } catch (err: any) {
      setError(err?.message || 'Error processing plan checkout. Please try again.');
    } finally {
      activeRzpRef.current = null;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100 px-3 py-1 rounded-full">
          Step 5 of 6 · Commercial Subscription
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#14161A]">
          Choose a plan and go live
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
          Start on Starter, Growth, or Pro. Includes optical Dine QR codes, kitchen display, and automatic tax invoices.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center pt-3">
          <div className="p-1 rounded-full bg-gray-200 border border-gray-300 flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-[#14161A] shadow-sm'
                  : 'text-gray-600 hover:text-[#14161A]'
              }`}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-white text-[#14161A] shadow-sm'
                  : 'text-gray-600 hover:text-[#14161A]'
              }`}
            >
              <span>Annual billing</span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-800 font-bold ml-2 cursor-pointer text-[11px]"
            >
              ✕ Dismiss
            </button>
          </div>
          {isDevEnvironment && (
            <div className="pt-2 border-t border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] text-gray-600">
                Local development bypass available:
              </span>
              <button
                type="button"
                onClick={handleDevSimulatedActivation}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>1-Click Simulate Activation & Go Live</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const displayPrice = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`relative rounded-3xl p-6 transition-all cursor-pointer flex flex-col justify-between border ${
                isSelected
                  ? 'bg-white border-[#14161A] ring-2 ring-[#14161A] shadow-xl'
                  : 'bg-white/80 border-gray-200 hover:border-gray-400 shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#14161A] text-white text-[10px] font-bold tracking-wider uppercase">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#14161A]">{plan.name}</h3>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-[#14161A] bg-[#14161A] text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 min-h-[32px]">{plan.tagline}</p>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#14161A]">
                      ₹{displayPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-gray-500">/ month</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <div className="text-[10px] text-teal-700 font-medium mt-0.5">
                      Billed annually (₹{(displayPrice * 12).toLocaleString('en-IN')}/yr)
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Includes
                  </span>
                  <ul className="space-y-2 text-xs text-gray-700">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-[11px]">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Billing & Tax Entity Details Card */}
      <form onSubmit={handleCompleteCheckout} className="space-y-6">
        <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#14161A]">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span>Billing & Tax Invoicing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-700">Legal Entity Name</label>
              <input
                type="text"
                value={organizationName}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-700">Operating City</label>
              <input
                type="text"
                value={city}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-700">
                GSTIN / Tax ID <span className="font-normal text-gray-400">(Optional for B2B input tax credit)</span>
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 29ABCDE1234F1Z5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-700">Billing Notification Email</label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="invoices@yourbusiness.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
        </div>

        {/* Order Summary & Activate Action */}
        <div className="p-6 rounded-3xl bg-[#14161A] text-white shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs text-gray-400">Selected Commercial Plan</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {selectedPlan.name} · {billingCycle === 'annual' ? 'Annual Subscription' : 'Monthly Subscription'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                For restaurant: <strong className="text-white">{restaurantName}</strong> ({tenantId})
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-400">Total with 18% GST</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                ₹{totalDue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-full border border-white/20 text-white text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer justify-center disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Preview</span>
            </button>

            <div className="flex items-center gap-3">
              {isSubmitting && (
                <button
                  type="button"
                  onClick={handleCancelCheckout}
                  className="px-5 py-3 rounded-full border border-rose-400/50 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel / Unstick
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (sdkLoading && !isDevEnvironment)}
                className="px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#14161A] text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {isSubmitting
                    ? 'Activating Subscription...'
                    : sdkLoading && !isDevEnvironment
                      ? 'Loading Payment Gateway...'
                      : 'Activate & Go Live'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, Check, Sparkles } from 'lucide-react';
import { generateSubdomainSlugFromName } from '@/lib/slug-utils';
import { getCustomerCsrfToken } from './csrf';

interface F3Props {
  organizationId: string;
  organizationName: string;
  organizationCity: string;
  organizationGstin?: string;
  onSuccess: (result: {
    tenantId: string;
    slug: string;
    restaurantName: string;
    tableCount: number;
    templateId: string;
    operationId?: string;
    operationStatus?: string;
  }) => void;
  onBack: () => void;
}

interface ProvisioningOperationState {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ACTIVE' | 'PARTIAL' | 'PROVISIONING';
  steps: Array<{
    id: string;
    name: string;
    status: string;
    error?: string;
  }>;
  tenantId: string;
  slug: string;
  restaurantName: string;
  tableCount: number;
  templateId: string;
  error?: string;
}

const TEMPLATES = [
  {
    id: 'saffron',
    name: 'Saffron',
    tag: 'Free',
    color: '#FB923C',
    bgColor: '#FFF7ED',
    textColor: '#14161A',
    description: 'Warm terracotta & turmeric gold',
  },
  {
    id: 'ember',
    name: 'Ember',
    tag: 'Free',
    color: '#E06D53',
    bgColor: '#181B20',
    textColor: '#FFFFFF',
    description: 'Charcoal hearth & dark fire',
  },
  {
    id: 'sage',
    name: 'Sage',
    tag: 'Free',
    color: '#34D399',
    bgColor: '#F0FDF4',
    textColor: '#14161A',
    description: 'Fresh botanical & café bakery',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    tag: 'Free',
    color: '#38BDF8',
    bgColor: '#F0F9FF',
    textColor: '#14161A',
    description: 'Deep indigo & coastal brass',
  },
];

export function F3RestaurantStep({
  organizationId,
  organizationName,
  organizationCity,
  organizationGstin,
  onSuccess,
  onBack,
}: F3Props) {
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean;
    available?: boolean;
    reason?: string;
    suggestions?: string[];
  }>({ checking: false });
  const [manualSlugEdit, setManualSlugEdit] = useState(false);

  const [restaurantType, setRestaurantType] = useState('Casual dining');
  const [branchArea, setBranchArea] = useState('Indiranagar');
  const [tableCount, setTableCount] = useState(12);
  const [menuSource, setMenuSource] = useState<'sample' | 'empty'>('sample');
  const [selectedTemplate, setSelectedTemplate] = useState('saffron');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<ProvisioningOperationState | null>(null);
  const [retrying, setRetrying] = useState(false);

  const checkSlugDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const activeOpRef = useRef<ProvisioningOperationState | null>(null);
  activeOpRef.current = activeOperation;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Restore active provisioning operation from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`orbitox_active_provisioning_${organizationId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id && parsed.slug) {
          if (parsed.status === 'COMPLETED' || parsed.status === 'ACTIVE') {
            onSuccessRef.current({
              tenantId: parsed.tenantId,
              slug: parsed.slug,
              restaurantName: parsed.restaurantName,
              tableCount: parsed.tableCount || 12,
              templateId: parsed.templateId || 'saffron',
              operationId: parsed.id,
              operationStatus: parsed.status,
            });
            return;
          }
          setActiveOperation(parsed);
        }
      }
    } catch {}
  }, [organizationId]);

  // Poll operation status until COMPLETED / ACTIVE or FAILED / PARTIAL
  useEffect(() => {
    if (!activeOperation?.id) return;
    if (
      activeOperation.status === 'COMPLETED' ||
      activeOperation.status === 'ACTIVE' ||
      activeOperation.status === 'FAILED' ||
      activeOperation.status === 'PARTIAL'
    ) {
      return;
    }

    const opId = activeOperation.id;
    let isMounted = true;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/v1/customer/organizations/${organizationId}/tenants/operations/${opId}`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!isMounted) return;

        if (json.ok && json.operation) {
          const updatedOp = json.operation;

          if (updatedOp.status === 'COMPLETED' || updatedOp.status === 'ACTIVE') {
            clearInterval(interval);
            try {
              localStorage.removeItem(`orbitox_active_provisioning_${organizationId}`);
            } catch {}
            const currentOp = activeOpRef.current;
            const targetTenantId = updatedOp.tenantId || currentOp?.tenantId || '';
            const targetSlug = currentOp?.slug || '';
            const targetName = currentOp?.restaurantName || '';
            const targetTables = currentOp?.tableCount || 12;
            const targetTemplate = currentOp?.templateId || 'saffron';

            onSuccessRef.current({
              tenantId: targetTenantId,
              slug: targetSlug,
              restaurantName: targetName,
              tableCount: targetTables,
              templateId: targetTemplate,
              operationId: updatedOp.id,
              operationStatus: updatedOp.status,
            });
            return;
          }

          if (updatedOp.status === 'FAILED' || updatedOp.status === 'PARTIAL') {
            clearInterval(interval);
            setActiveOperation((prev) =>
              prev
                ? {
                    ...prev,
                    status: updatedOp.status,
                    steps: updatedOp.steps && updatedOp.steps.length > 0 ? updatedOp.steps : prev.steps,
                    error: updatedOp.error || (updatedOp.status === 'PARTIAL' ? 'Provisioning stopped due to a partial failure.' : 'Provisioning failed.'),
                  }
                : null
            );
            return;
          }

          setActiveOperation((prev) =>
            prev
              ? {
                  ...prev,
                  status: updatedOp.status,
                  steps: updatedOp.steps && updatedOp.steps.length > 0 ? updatedOp.steps : prev.steps,
                  error: updatedOp.error,
                }
              : null
          );
        }
      } catch {
        // Transient network blip, continue polling
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeOperation?.id, activeOperation?.status, organizationId]);

  const handleRetryProvisioning = async () => {
    if (!activeOperation) return;
    setRetrying(true);
    setError(null);
    try {
      const csrfToken = getCustomerCsrfToken();
      const res = await fetch(
        `/api/v1/customer/organizations/${organizationId}/tenants/operations/${activeOperation.id}/retry`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Retry failed to launch.');
      }
      const data = await res.json();
      setActiveOperation((prev) =>
        prev
          ? {
              ...prev,
              status: 'RUNNING',
              steps: data.operation?.steps || prev.steps,
              error: undefined,
            }
          : null
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRetrying(false);
    }
  };

  // Auto-generate slug from name unless manually modified
  const handleNameChange = (val: string) => {
    setRestaurantName(val);
    if (!manualSlugEdit) {
      const generated = generateSubdomainSlugFromName(val);
      setSlug(generated);
      triggerSlugCheck(generated);
    }
  };

  const handleSlugChange = (val: string) => {
    setManualSlugEdit(true);
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
    triggerSlugCheck(clean);
  };

  const triggerSlugCheck = (candidate: string) => {
    if (checkSlugDebounceRef.current) {
      clearTimeout(checkSlugDebounceRef.current);
    }
    if (!candidate || candidate.length < 3) {
      setSlugStatus({ checking: false, available: false, reason: 'Must be at least 3 characters' });
      return;
    }
    setSlugStatus({ checking: true });
    checkSlugDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/customer/tenants/check-slug?slug=${encodeURIComponent(candidate)}`);
        const json = await res.json();
        setSlugStatus({
          checking: false,
          available: json.available,
          reason: json.reason,
          suggestions: json.suggestions,
        });
      } catch {
        setSlugStatus({
          checking: false,
          available: false,
          reason: 'Unable to verify subdomain availability. Please check your connection and retry.',
        });
      }
    }, 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!restaurantName.trim()) {
      setError('Restaurant name is required.');
      return;
    }
    if (!slug || slugStatus.available === false) {
      setError(slugStatus.reason || 'Please select an available subdomain.');
      return;
    }

    setLoading(true);
    try {
      const cleanSlug = slug.trim().toLowerCase();
      const idempotencyKey = `prov_${organizationId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}_${cleanSlug}_v1`;
      const payload = {
        name: restaurantName.trim(),
        slug: cleanSlug,
        plugins: [
          {
            id: 'restaurant-os',
            plan: 'restaurant-starter',
            config: {
              restaurantName: restaurantName.trim(),
              city: organizationCity || 'Bengaluru',
              firstBranchArea: branchArea.trim() || 'Main Area',
              restaurantType,
              tableCount,
              menuSource,
              templateId: selectedTemplate,
              gstin: organizationGstin,
            },
          },
        ],
      };

      const csrfToken = getCustomerCsrfToken();
      const res = await fetch(`/api/v1/customer/organizations/${organizationId}/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempotencyKey,
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to provision restaurant tenant.');
      }

      const opState: ProvisioningOperationState = {
        id: data.operation?.id || `op_${Date.now()}`,
        status: (data.operation?.status || 'RUNNING') as any,
        steps: data.operation?.steps || [
          { id: '1', name: 'Validating tenant configuration', status: 'COMPLETED' },
          { id: '2', name: 'Creating database schema & isolated tenant partition', status: 'RUNNING' },
          { id: '3', name: 'Seeding starter catalogue & menus', status: 'PENDING' },
          { id: '4', name: 'Generating tables & optical QR credentials', status: 'PENDING' },
          { id: '5', name: 'Activating zero-trust preview mode', status: 'PENDING' },
        ],
        tenantId: data.operation?.tenantId || `tenant_${cleanSlug}`,
        slug: cleanSlug,
        restaurantName: restaurantName.trim(),
        tableCount,
        templateId: selectedTemplate,
      };

      // If already finished synchronously:
      if (opState.status === 'COMPLETED' || opState.status === 'ACTIVE') {
        onSuccess({
          tenantId: opState.tenantId,
          slug: cleanSlug,
          restaurantName: restaurantName.trim(),
          tableCount,
          templateId: selectedTemplate,
          operationId: opState.id,
          operationStatus: opState.status,
        });
        return;
      }

      setActiveOperation(opState);
      try {
        localStorage.setItem(`orbitox_active_provisioning_${organizationId}`, JSON.stringify(opState));
      } catch {}
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl space-y-6">
      {/* Top Stepper Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-[#14161A] text-white flex items-center justify-center font-bold text-xs">O</div>
          <span className="font-bold text-base text-[#14161A]">orbitoX</span>
        </div>

        <div className="flex items-center p-1 rounded-full bg-white border border-[#E2E8F0] text-xs shadow-sm">
          <span className="px-3 py-1 text-[#065F46] font-semibold">✓ Account</span>
          <span className="px-3 py-1 text-[#065F46] font-semibold">✓ Organization</span>
          <span className="px-3 py-1 rounded-full bg-[#14161A] text-white font-semibold">3 · Restaurant</span>
        </div>

        <span className="text-xs text-[#5A6170] font-medium truncate max-w-[180px]">
          {organizationName}
        </span>
      </div>

      {activeOperation ? (
        <div className="max-w-xl mx-auto p-8 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-orange-100 text-[#FB923C] flex items-center justify-center mx-auto">
              {activeOperation.status === 'FAILED' || activeOperation.status === 'PARTIAL' ? (
                <AlertCircle className="h-6 w-6 text-red-600" />
              ) : activeOperation.status === 'COMPLETED' || activeOperation.status === 'ACTIVE' ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <RefreshCw className="h-6 w-6 animate-spin text-[#FB923C]" />
              )}
            </div>
            <h2 className="text-xl font-bold text-[#14161A]">
              {activeOperation.status === 'FAILED'
                ? 'Provisioning Interrupted'
                : activeOperation.status === 'PARTIAL'
                ? 'Provisioning Interrupted (Partial)'
                : activeOperation.status === 'COMPLETED' || activeOperation.status === 'ACTIVE'
                ? 'Restaurant Provisioned!'
                : `Provisioning ${activeOperation.restaurantName}`}
            </h2>
            <p className="text-xs text-[#5A6170]">
              {activeOperation.status === 'FAILED'
                ? 'An error occurred while provisioning your restaurant tenant.'
                : activeOperation.status === 'PARTIAL'
                ? 'A provisioning step failed. You can retry to resume from the failed step.'
                : activeOperation.status === 'COMPLETED' || activeOperation.status === 'ACTIVE'
                ? 'Redirecting to your live working preview...'
                : `Setting up database schema, catalog, and preview for ${activeOperation.slug}.orbitox.io`}
            </p>
          </div>

          {activeOperation.error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{activeOperation.error}</span>
            </div>
          )}

          {/* Steps List */}
          <div className="space-y-3 py-2">
            {activeOperation.steps.map((step, idx) => {
              const isDone = step.status === 'COMPLETED';
              const isRunning = step.status === 'RUNNING';
              const isFailed = step.status === 'FAILED';
              return (
                <div
                  key={step.id || idx}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition-colors ${
                    isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : isRunning
                      ? 'bg-orange-50/60 border-orange-200 text-orange-900 font-semibold'
                      : isFailed
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : isRunning ? (
                      <RefreshCw className="h-4 w-4 text-orange-600 animate-spin shrink-0" />
                    ) : isFailed ? (
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-gray-300 shrink-0" />
                    )}
                    <span>{step.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    {step.status}
                  </span>
                </div>
              );
            })}
          </div>

          {(activeOperation.status === 'FAILED' || activeOperation.status === 'PARTIAL') && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRetryProvisioning}
                disabled={retrying}
                className="flex-1 py-3 rounded-full bg-[#14161A] text-white text-xs font-bold hover:bg-[#2A2E37] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {retrying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span>Retry Provisioning</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`orbitox_active_provisioning_${organizationId}`);
                  } catch {}
                  setActiveOperation(null);
                }}
                className="px-5 py-3 rounded-full border border-[#E2E8F0] text-xs font-semibold text-[#5A6170] hover:bg-gray-50 cursor-pointer"
              >
                Edit Form
              </button>
            </div>
          )}
        </div>
      ) : (
      /* Form and Template Selection */
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form (2 cols) */}
        <div className="lg:col-span-2 p-8 rounded-[32px] bg-white border border-[#E2E8F0] shadow-xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#14161A]">Add your first restaurant</h2>
            <p className="text-xs text-[#5A6170] mt-1">You can change all of this later.</p>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="f3-restaurantName" className="text-xs font-semibold text-[#14161A]">Restaurant name</label>
              <input
                id="f3-restaurantName"
                name="restaurantName"
                type="text"
                required
                aria-label="Restaurant name"
                value={restaurantName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Masala House"
                className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
              />
            </div>

            <div>
              <label htmlFor="f3-slug" className="text-xs font-semibold text-[#14161A]">Web address</label>
              <div
                className={`flex items-center mt-1.5 rounded-full border px-4 py-2 text-xs bg-[#F8FAFC] transition-colors ${
                  slugStatus.checking
                    ? 'border-blue-400'
                    : slugStatus.available
                    ? 'border-emerald-600'
                    : 'border-red-400'
                }`}
              >
                <input
                  id="f3-slug"
                  name="slug"
                  type="text"
                  required
                  aria-label="Web address slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="bg-transparent text-[#14161A] font-semibold focus:outline-none flex-1"
                />
                <span className="text-[#5A6170]">.orbitox.io</span>
              </div>

              {slugStatus.checking ? (
                <div className="text-[10px] text-blue-600 font-medium mt-1 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Checking availability...</span>
                </div>
              ) : slugStatus.available ? (
                <div className="text-[10px] text-[#065F46] font-medium mt-1">
                  Available · You can connect your custom domain later.
                </div>
              ) : (
                <div className="mt-1 space-y-1">
                  <div className="text-[10px] text-red-700 font-medium">
                    {slugStatus.reason || 'This subdomain is not available.'}
                  </div>
                  {slugStatus.suggestions && slugStatus.suggestions.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                      <span>Try:</span>
                      {slugStatus.suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setSlug(sug);
                            triggerSlugCheck(sug);
                          }}
                          className="px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-blue-700 font-semibold cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#14161A]">Type</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Casual dining', 'Fine dining', 'Café', 'Quick service', 'Cloud kitchen'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRestaurantType(t)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                      restaurantType === t
                        ? 'bg-[#14161A] text-white shadow-sm'
                        : 'bg-white border border-[#E2E8F0] text-[#5A6170] hover:border-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="f3-branchArea" className="text-xs font-semibold text-[#14161A]">First branch area</label>
                <input
                  id="f3-branchArea"
                  name="branchArea"
                  type="text"
                  required
                  aria-label="First branch area"
                  value={branchArea}
                  onChange={(e) => setBranchArea(e.target.value)}
                  placeholder="e.g. Indiranagar"
                  className="w-full mt-1.5 px-4 py-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#14161A] focus:outline-none focus:border-[#14161A]"
                />
              </div>

              <div>
                <label htmlFor="f3-tableCount" className="text-xs font-semibold text-[#14161A]">About how many tables?</label>
                <div className="flex items-center mt-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1">
                  <button
                    type="button"
                    aria-label="Decrease table count"
                    onClick={() => setTableCount((c) => Math.max(1, c - 1))}
                    className="h-7 w-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    id="f3-tableCount"
                    name="tableCount"
                    type="number"
                    min={1}
                    max={120}
                    aria-label="Table count"
                    value={tableCount}
                    onChange={(e) => setTableCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    className="bg-transparent text-center text-xs font-bold text-[#14161A] focus:outline-none flex-1"
                  />
                  <button
                    type="button"
                    aria-label="Increase table count"
                    onClick={() => setTableCount((c) => Math.min(120, c + 1))}
                    className="h-7 w-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#14161A]">Start your menu with</label>
              <div className="space-y-2 mt-2">
                <div
                  onClick={() => setMenuSource('sample')}
                  className={`p-3 rounded-[20px] flex items-center gap-3 cursor-pointer transition-all ${
                    menuSource === 'sample'
                      ? 'border-2 border-[#14161A] bg-[#F8FAFC]'
                      : 'border border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`h-3.5 w-3.5 rounded-full shrink-0 ${
                      menuSource === 'sample'
                        ? 'border-4 border-[#14161A] bg-white'
                        : 'border border-[#CBD5E1]'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-xs text-[#14161A]">A sample North Indian menu</div>
                    <div className="text-[10px] text-[#5A6170]">Recommended: see your site working right away, then edit</div>
                  </div>
                </div>

                <div
                  onClick={() => setMenuSource('empty')}
                  className={`p-3 rounded-[20px] flex items-center gap-3 cursor-pointer transition-all ${
                    menuSource === 'empty'
                      ? 'border-2 border-[#14161A] bg-[#F8FAFC]'
                      : 'border border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`h-3.5 w-3.5 rounded-full shrink-0 ${
                      menuSource === 'empty'
                        ? 'border-4 border-[#14161A] bg-white'
                        : 'border border-[#CBD5E1]'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-xs text-[#14161A]">An empty menu</div>
                    <div className="text-[10px] text-[#5A6170]">Start with a blank catalog and enter your own dishes</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2.5 rounded-full border border-[#E2E8F0] text-xs font-semibold text-[#14161A] hover:bg-gray-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || slugStatus.available === false}
                className="rounded-full bg-[#14161A] text-white hover:bg-[#14161A]/90 px-8 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Provisioning tenant...</span>
                  </>
                ) : (
                  <>
                    <span>Create restaurant</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Template Picker & What happens next (1 col) */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="p-6 rounded-[32px] bg-white border border-[#E2E8F0] shadow-md space-y-4">
            <h3 className="font-bold text-sm text-[#14161A]">Pick a look for your diners</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-3 rounded-[20px] text-center space-y-1.5 cursor-pointer transition-all ${
                    selectedTemplate === tmpl.id
                      ? 'border-2 border-[#14161A] shadow-sm'
                      : 'border border-[#E2E8F0] hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: tmpl.bgColor }}
                >
                  <div
                    className="h-14 rounded-[12px] flex items-center justify-center text-white font-bold text-sm shadow-inner"
                    style={{ backgroundColor: tmpl.color }}
                  >
                    {selectedTemplate === tmpl.id && <Check className="h-5 w-5" />}
                  </div>
                  <div className="font-bold text-xs" style={{ color: tmpl.textColor }}>
                    {tmpl.name}
                  </div>
                  <div
                    className={`text-[9px] font-semibold ${
                      tmpl.textColor === '#FFFFFF' ? 'text-emerald-400' : 'text-emerald-900'
                    }`}
                  >
                    {tmpl.tag}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-[32px] bg-[#14161A] text-white shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-white">What happens next</h4>
            <p className="text-xs text-[#9AA3AF] leading-relaxed">
              We set up your restaurant, menu, tables and QR codes. It takes about 2 minutes, then you&apos;ll see your real site in preview. No payment yet.
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}


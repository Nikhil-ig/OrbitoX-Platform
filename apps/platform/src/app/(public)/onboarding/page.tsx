'use client';

import React, { useState, useEffect } from 'react';
import { F1AccountStep } from './steps/f1-account';
import { F2OrganizationStep } from './steps/f2-organization';
import { F3RestaurantStep } from './steps/f3-restaurant';
import { F4WorkingPreviewStep } from './steps/f4-preview';
import { F5PlanStep } from './steps/f5-plan';
import { F6ChecklistStep } from './steps/f6-checklist';
import { D6MobilePreviewView } from './steps/d6-mobile-preview';

type OnboardingStep = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6';

interface OnboardingState {
  step: OnboardingStep;
  user?: { userId: string; email: string; name: string };
  organization?: { id: string; name: string; slug: string; city: string; gstin?: string };
  restaurant?: {
    tenantId: string;
    slug: string;
    restaurantName: string;
    tableCount: number;
    templateId: string;
  };
  subscription?: {
    planId: string;
    billingCycle: 'monthly' | 'annual';
    subscriptionStatus?: string;
    awaitingWebhook?: boolean;
  };
}

const STORAGE_KEY = 'orbitox_customer_onboarding_v1';

export default function OnboardingPage() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'd6-mobile'>('desktop');
  const [state, setState] = useState<OnboardingState>({
    step: 'F1',
  });

  // Restore state from localStorage and authoritative server session
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step) {
          setState(parsed);
        }
      }
    } catch { }

    let cancelled = false;
    async function restoreSession() {
      try {
        const meRes = await fetch('/api/v1/customer/auth/me');
        if (!meRes.ok || cancelled) return;
        const meData = await meRes.json();
        if (!meData?.user?.id) return;

        const authUser = {
          userId: meData.user.id,
          email: meData.user.email,
          name: meData.user.name || 'Owner',
        };

        const orgsRes = await fetch('/api/v1/customer/organizations');
        if (!orgsRes.ok || cancelled) {
          updateState((prev) => ({
            ...prev,
            user: prev.user || authUser,
            step: prev.step === 'F1' ? 'F2' : prev.step,
          }));
          return;
        }

        const orgsData = await orgsRes.json();
        const orgList = Array.isArray(orgsData.organizations) ? orgsData.organizations : [];

        if (orgList.length === 0) {
          updateState((prev) => ({
            ...prev,
            user: prev.user || authUser,
            step: prev.step === 'F1' ? 'F2' : prev.step,
          }));
          return;
        }

        // 1. Identify which organization is active:
        // Priority A: If state already had a restaurant with canonical tenantId, find the matching org
        // Priority B: If state had an organization id, match that
        // Priority C: Check which organization actually has provisioned tenants/projects
        // Priority D: Fallback to the first organization
        let activeOrg: any = null;
        let restaurantObj: OnboardingState['restaurant'] = undefined;
        let subscriptionObj: OnboardingState['subscription'] = undefined;

        // Check if saved state has a tenantId with org/<orgId>
        let preferredOrgId: string | undefined = state.organization?.id;
        if (state.restaurant?.tenantId) {
          const m = /^org\/([^/]+)\//.exec(state.restaurant.tenantId);
          if (m && m[1]) preferredOrgId = m[1];
        }

        if (preferredOrgId) {
          activeOrg = orgList.find((o: any) => o.id === preferredOrgId);
        }

        // If not found yet, query orgs to find which one has provisioned tenants
        if (!activeOrg) {
          for (const candidate of orgList) {
            try {
              const candRes = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(candidate.id)}/tenants`);
              if (candRes.ok) {
                const candData = await candRes.json();
                if (Array.isArray(candData.tenants) && candData.tenants.length > 0) {
                  activeOrg = candidate;
                  const firstTenant = candData.tenants[0];
                  restaurantObj = {
                    tenantId: firstTenant.tenantId,
                    slug: firstTenant.project.slug,
                    restaurantName: firstTenant.project.name,
                    tableCount: 12,
                    templateId: 'saffron',
                  };
                  break;
                }
              }
            } catch { }
          }
        }

        if (!activeOrg) {
          activeOrg = orgList[0];
        }

        const orgObj = {
          id: activeOrg.id,
          name: activeOrg.name,
          slug: activeOrg.slug,
          city: activeOrg.city || 'Bengaluru',
          gstin: activeOrg.gstin,
        };

        // Query tenants for the activeOrg if not already discovered
        if (!restaurantObj && !cancelled) {
          try {
            const tenantsRes = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(activeOrg.id)}/tenants`);
            if (tenantsRes.ok) {
              const tenantsData = await tenantsRes.json();
              const primaryTenant = Array.isArray(tenantsData.tenants) && tenantsData.tenants.length > 0
                ? tenantsData.tenants[0]
                : null;

              if (primaryTenant) {
                restaurantObj = {
                  tenantId: primaryTenant.tenantId,
                  slug: primaryTenant.project.slug,
                  restaurantName: primaryTenant.project.name,
                  tableCount: 12,
                  templateId: 'saffron',
                };
              }
            }
          } catch { }
        }

        // Query activation & subscription status if we have a restaurantObj
        if (restaurantObj?.tenantId && !cancelled) {
          try {
            const actRes = await fetch(
              `/api/v1/customer/tenants/${encodeURIComponent(restaurantObj.tenantId)}/activation-status`,
            ).catch(() => null);

            if (actRes && actRes.ok) {
              const actData = await actRes.json();
              if (actData.subscription?.status && actData.subscription.status !== 'none') {
                subscriptionObj = {
                  planId: actData.subscription.planId || 'growth',
                  billingCycle: 'monthly',
                  subscriptionStatus: actData.subscription.status,
                  awaitingWebhook: actData.subscription.awaitingWebhook,
                };
              }
            }
          } catch { }
        }

        updateState((prev) => {
          const nextUser = prev.user || authUser;
          const nextOrg = prev.organization || orgObj;
          const nextRestaurant = prev.restaurant || restaurantObj;
          const nextSubscription = prev.subscription || subscriptionObj;

          let nextStep = prev.step;
          if (nextSubscription?.subscriptionStatus === 'active' || nextSubscription?.awaitingWebhook) {
            nextStep = 'F6';
          } else if (nextRestaurant && (prev.step === 'F1' || prev.step === 'F2' || prev.step === 'F3')) {
            nextStep = 'F4';
          } else if (nextOrg && (prev.step === 'F1' || prev.step === 'F2')) {
            nextStep = 'F3';
          } else if (nextUser && prev.step === 'F1') {
            nextStep = 'F2';
          }

          return {
            ...prev,
            user: nextUser,
            organization: nextOrg,
            restaurant: nextRestaurant,
            subscription: nextSubscription,
            step: nextStep,
          };
        });
      } catch { }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save state updates to localStorage
  const updateState = (updater: (prev: OnboardingState) => OnboardingState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  const handleF1Success = (user: { userId: string; email: string; name: string }) => {
    updateState((prev) => ({
      ...prev,
      user,
      step: 'F2',
    }));
  };

  const handleF2Success = (organization: {
    id: string;
    name: string;
    slug: string;
    city: string;
    gstin?: string;
  }) => {
    updateState((prev) => ({
      ...prev,
      organization,
      step: 'F3',
    }));
  };

  const handleF3Success = (restaurant: {
    tenantId: string;
    slug: string;
    restaurantName: string;
    tableCount: number;
    templateId: string;
  }) => {
    updateState((prev) => ({
      ...prev,
      restaurant,
      step: 'F4',
    }));
  };

  const handleF5Success = (subscription: {
    planId: string;
    billingCycle: 'monthly' | 'annual';
    subscriptionStatus?: string;
    awaitingWebhook?: boolean;
  }) => {
    updateState((prev) => ({
      ...prev,
      subscription,
      step: 'F6',
    }));
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#EEF1F5] flex flex-col items-center justify-center p-3 sm:p-6 md:p-12 overflow-x-hidden">
        <F1AccountStep onSuccess={handleF1Success} />
      </main>
    );
  }

  // D6 Mobile View Override
  if (viewMode === 'd6-mobile' && state.step === 'F4' && state.restaurant) {
    return (
      <main className="min-h-screen bg-[#EEF1F5] flex items-center justify-center p-4">
        <D6MobilePreviewView
          ownerName={state.user?.name || 'Owner'}
          restaurantName={state.restaurant.restaurantName}
          slug={state.restaurant.slug}
          tenantId={state.restaurant.tenantId}
          tableCount={state.restaurant.tableCount}
          templateId={state.restaurant.templateId}
          city={state.organization?.city || 'Bengaluru'}
          onSwitchToDesktop={() => setViewMode('desktop')}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF1F5] flex flex-col items-center justify-center p-3 sm:p-6 md:p-12 overflow-x-hidden">
      {state.step === 'F1' && (
        <F1AccountStep
          onSuccess={handleF1Success}
          initialEmail={state.user?.email}
          initialName={state.user?.name}
        />
      )}

      {state.step === 'F2' && (
        <F2OrganizationStep
          onSuccess={handleF2Success}
          onBack={() => updateState((prev) => ({ ...prev, step: 'F1' }))}
          defaultBusinessName={state.organization?.name}
        />
      )}

      {state.step === 'F3' && state.organization && (
        <F3RestaurantStep
          organizationId={state.organization.id}
          organizationName={state.organization.name}
          organizationCity={state.organization.city}
          organizationGstin={state.organization.gstin}
          onSuccess={handleF3Success}
          onBack={() => updateState((prev) => ({ ...prev, step: 'F2' }))}
        />
      )}

      {state.step === 'F4' && state.restaurant && (
        <F4WorkingPreviewStep
          ownerName={state.user?.name || 'Owner'}
          restaurantName={state.restaurant.restaurantName}
          slug={state.restaurant.slug}
          tenantId={state.restaurant.tenantId}
          tableCount={state.restaurant.tableCount}
          templateId={state.restaurant.templateId}
          city={state.organization?.city || 'Bengaluru'}
          onSwitchToD6Mobile={() => setViewMode('d6-mobile')}
          onGoLive={() => updateState((prev) => ({ ...prev, step: 'F5' }))}
        />
      )}

      {state.step === 'F5' && state.organization && state.restaurant && (
        <F5PlanStep
          organizationId={state.organization.id}
          organizationName={state.organization.name}
          city={state.organization.city}
          gstin={state.organization.gstin}
          tenantId={state.restaurant.tenantId}
          restaurantName={state.restaurant.restaurantName}
          onSuccess={handleF5Success}
          onBack={() => updateState((prev) => ({ ...prev, step: 'F4' }))}
        />
      )}

      {state.step === 'F6' && state.restaurant && (
        <F6ChecklistStep
          restaurantName={state.restaurant.restaurantName}
          slug={state.restaurant.slug}
          tenantId={state.restaurant.tenantId}
          tableCount={state.restaurant.tableCount}
          planId={state.subscription?.planId || 'growth'}
          organizationId={state.organization?.id}
          subscriptionStatus={state.subscription?.subscriptionStatus}
          awaitingWebhook={state.subscription?.awaitingWebhook}
        />
      )}
    </main>
  );
}


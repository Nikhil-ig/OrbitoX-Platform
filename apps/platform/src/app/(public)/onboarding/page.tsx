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

  // Restore state from localStorage if available
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
    } catch {}
  }, []);

  // Save state updates to localStorage
  const updateState = (updater: (prev: OnboardingState) => OnboardingState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
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
      <div className="min-h-screen bg-[#EEF1F5] flex items-center justify-center p-8">
        <div className="text-xs text-gray-500 font-medium">Loading OrbitoX onboarding...</div>
      </div>
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
    <main className="min-h-screen bg-[#EEF1F5] flex flex-col items-center justify-center p-6 md:p-12">
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


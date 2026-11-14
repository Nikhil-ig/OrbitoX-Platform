'use client';

import React, { createContext, useContext } from 'react';
import {
  ServiceItem,
  BusinessProvider,
  INITIAL_SERVICES,
  BUSINESS_PROVIDERS,
} from './platform-catalogue-presets';

export interface GovernanceDockContextType {
  services: ServiceItem[];
  toggleServiceStatus: (serviceId: string) => void;
  isServiceActive: (serviceId: string) => boolean;
  getService: (serviceId: string) => ServiceItem | undefined;
  isProviderActive: (categorySlug: string, providerId: string) => boolean;
  findProviderById: (providerId: string) => { provider: BusinessProvider; categorySlug: string } | undefined;
  toggleProviderStatus: (categorySlug: string, providerId: string) => void;
}

export const DEFAULT_GOVERNANCE_DOCK_CONTEXT: GovernanceDockContextType = {
  services: INITIAL_SERVICES,
  toggleServiceStatus: () => {},
  isServiceActive: (serviceId: string) => {
    const s = INITIAL_SERVICES.find((srv) => srv.id === serviceId);
    return s ? s.status === 'active' : true;
  },
  getService: (serviceId: string) => INITIAL_SERVICES.find((srv) => srv.id === serviceId),
  isProviderActive: (categorySlug: string, providerId: string) => {
    const list = BUSINESS_PROVIDERS[categorySlug] || [];
    const p = list.find((item) => item.id === providerId);
    return p ? p.status === 'active' : true;
  },
  findProviderById: (providerId: string) => {
    for (const [catSlug, list] of Object.entries(BUSINESS_PROVIDERS)) {
      const match = list.find((p) => p.id === providerId);
      if (match) return { provider: match, categorySlug: catSlug };
    }
    return undefined;
  },
  toggleProviderStatus: () => {},
};

export const GovernanceDockContext = createContext<GovernanceDockContextType | null>(null);

export function useGovernanceDock(): GovernanceDockContextType {
  const ctx = useContext(GovernanceDockContext);
  return ctx || DEFAULT_GOVERNANCE_DOCK_CONTEXT;
}


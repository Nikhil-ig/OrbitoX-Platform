'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ServiceItem,
  BusinessProvider,
  ApiKeyItem,
  PlatformQuotaMetric,
  ClientProject,
  INITIAL_SERVICES,
  BUSINESS_PROVIDERS,
  INITIAL_API_KEYS,
  PLATFORM_QUOTAS,
  INITIAL_CLIENT_PROJECTS,
} from './mock-data';
import { OrbitoxLogo } from '../components/icons';

export interface TelemetryLogEntry {
  id: string;
  tenantId?: string;
  categorySlug?: string;
  timestamp: string;
  facade: 'SecurityFacade' | 'AuditFacade' | 'EventsFacade' | 'ContextFacade' | 'AiFacade' | 'DbFacade' | 'BillingFacade' | 'WorkflowsFacade';
  level: 'INFO' | 'WARN' | 'SECURITY' | 'AUDIT';
  message: string;
}

const INITIAL_LOGS: TelemetryLogEntry[] = [
  {
    id: 'log-1',
    tenantId: 'singapore-gen',
    categorySlug: 'hospitals',
    timestamp: '19:48:12',
    facade: 'SecurityFacade',
    level: 'SECURITY',
    message: 'Ed25519 signature session authenticated for tenantId="singapore-gen" via Let\'s Encrypt Wildcard SSL',
  },
  {
    id: 'log-2',
    tenantId: 'singapore-gen',
    categorySlug: 'hospitals',
    timestamp: '19:49:04',
    facade: 'EventsFacade',
    level: 'INFO',
    message: 'Dispatched event "hospitals.telemetry.stream" -> 18 IoT telemetry monitors synced (latency=8ms)',
  },
  {
    id: 'log-3',
    tenantId: 'singapore-gen',
    categorySlug: 'hospitals',
    timestamp: '19:50:22',
    facade: 'DbFacade',
    level: 'AUDIT',
    message: 'Row-level partition query executed: 0 cross-tenant boundary leaks detected for Singapore General Care',
  },
  {
    id: 'log-4',
    tenantId: 'st-jude',
    categorySlug: 'hospitals',
    timestamp: '19:51:10',
    facade: 'EventsFacade',
    level: 'INFO',
    message: 'Patient #MRN-84920 admitted to ICU Ward 4. Triage state machine transitioned to Level 1.',
  },
  {
    id: 'log-5',
    tenantId: 'aura-luxury',
    categorySlug: 'ecommerce',
    timestamp: '19:52:45',
    facade: 'BillingFacade',
    level: 'INFO',
    message: 'Stripe token authorized for Order #ORD-9821 ($420.00). Rate limit meter ticked.',
  },
  {
    id: 'log-6',
    timestamp: '19:53:15',
    facade: 'AuditFacade',
    level: 'SECURITY',
    message: 'SandboxGuard: All 9 runtime facades verified deeply frozen with Object.freezeAllFacades()',
  },
];

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  type: 'receive' | 'send' | 'sync' | 'audit';
  badgeLabel: string;
  icon?: string;
  timestamp: string;
}

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    title: "St. Jude Children's",
    subtitle: 'HMS Bed Allocation Engine',
    amount: '$130',
    type: 'receive',
    badgeLabel: 'Receive',
    icon: 'hospital',
    timestamp: 'Today',
  },
  {
    id: 'act-2',
    title: 'Mayo Health System',
    subtitle: 'Pharmacy Dispense Transaction',
    amount: '$240',
    type: 'receive',
    badgeLabel: 'Receive',
    icon: 'pill',
    timestamp: 'Today',
  },
  {
    id: 'act-3',
    title: 'Aura Luxury Boutiques',
    subtitle: 'Commerce Global Checkout',
    amount: '$169',
    type: 'send',
    badgeLabel: 'Send',
    icon: 'ecommerce',
    timestamp: 'Today',
  },
  {
    id: 'act-4',
    title: 'Apollo Hospitals Hub',
    subtitle: 'Zero-Trust Tenant Sync',
    amount: '99.9%',
    type: 'sync',
    badgeLabel: 'Sync',
    icon: 'zap',
    timestamp: 'Just now',
  },
];

export interface AdminContextType {
  services: ServiceItem[];
  toggleServiceStatus: (serviceId: string) => void;
  updateServiceQuota: (serviceId: string, newCallLimit: number) => void;
  isServiceActive: (serviceId: string) => boolean;
  getService: (serviceId: string) => ServiceItem | undefined;

  providers: Record<string, BusinessProvider[]>;
  toggleProviderStatus: (categorySlug: string, providerId: string) => void;
  updateProvider: (categorySlug: string, providerId: string, updates: Partial<BusinessProvider>) => void;
  addProvider: (categorySlug: string, newProvider: BusinessProvider) => void;
  deleteProvider: (categorySlug: string, providerId: string) => void;
  isProviderActive: (categorySlug: string, providerId: string) => boolean;
  getProvider: (categorySlug: string, providerId: string) => BusinessProvider | undefined;
  findProviderById: (providerId: string) => { provider: BusinessProvider; categorySlug: string } | undefined;

  apiKeys: ApiKeyItem[];
  generateApiKey: (params: {
    name: string;
    serviceId: string;
    serviceName: string;
    providerId?: string;
    providerName?: string;
    environment: 'production' | 'staging' | 'sandbox';
    scopes: string[];
    rateLimitPerMin: number;
  }) => ApiKeyItem;
  rotateApiKey: (keyId: string) => ApiKeyItem;
  revokeApiKey: (keyId: string) => void;
  toggleApiKeyStatus: (keyId: string) => void;
  isApiKeyValid: (keyIdOrPrefix: string) => boolean;
  getTenantApiKeys: (providerId?: string, serviceId?: string) => ApiKeyItem[];

  quotas: PlatformQuotaMetric[];
  consumeQuota: (params: {
    serviceId: string;
    providerId?: string;
    categorySlug?: string;
    actionName?: string;
    callsCount?: number;
  }) => { allowed: boolean; reason?: string };

  telemetryLogs: TelemetryLogEntry[];
  addTelemetryLog: (log: Omit<TelemetryLogEntry, 'id' | 'timestamp'>) => void;
  clearTelemetryLogs: () => void;

  liveActivities: ActivityItem[];
  recordTenantAction: (params: {
    tenantId?: string;
    tenantName?: string;
    categorySlug?: string;
    serviceId: string;
    serviceName?: string;
    action: string;
    details: string;
    amount?: string;
    type?: 'receive' | 'send' | 'sync' | 'audit';
    level?: 'INFO' | 'WARN' | 'SECURITY' | 'AUDIT';
  }) => void;

  toastMessage: string | null;
  showToast: (msg: string) => void;

  projects: ClientProject[];
  addProject: (newProject: ClientProject, initialKey?: ApiKeyItem) => void;
  updateProject: (projectId: string, updates: Partial<ClientProject>) => void;
  updateProjectPlanAndQuotas: (
    projectId: string,
    plan: 'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale',
    apiCallQuota: number,
    rateLimitPerMin: number,
    storageQuotaGb: number
  ) => void;
  toggleProjectService: (projectId: string, serviceId: string) => void;
  toggleProjectStatus: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  getProject: (projectId: string) => ClientProject | undefined;
}

export const DEFAULT_ADMIN_CONTEXT: AdminContextType = {
  services: INITIAL_SERVICES,
  toggleServiceStatus: () => {},
  updateServiceQuota: () => {},
  isServiceActive: (serviceId: string) => {
    const s = INITIAL_SERVICES.find((srv) => srv.id === serviceId);
    return s ? s.status === 'active' : true;
  },
  getService: (serviceId: string) => {
    return INITIAL_SERVICES.find((srv) => srv.id === serviceId);
  },
  providers: BUSINESS_PROVIDERS,
  toggleProviderStatus: () => {},
  updateProvider: () => {},
  addProvider: () => {},
  deleteProvider: () => {},
  isProviderActive: (categorySlug: string, providerId: string) => {
    const list = BUSINESS_PROVIDERS[categorySlug] || [];
    const p = list.find((item) => item.id === providerId);
    return p ? p.status === 'active' : true;
  },
  getProvider: (categorySlug: string, providerId: string) => {
    const list = BUSINESS_PROVIDERS[categorySlug] || [];
    return list.find((item) => item.id === providerId);
  },
  findProviderById: (providerId: string) => {
    for (const [catSlug, list] of Object.entries(BUSINESS_PROVIDERS)) {
      const match = list.find((p) => p.id === providerId);
      if (match) return { provider: match, categorySlug: catSlug };
    }
    return undefined;
  },
  apiKeys: INITIAL_API_KEYS,
  generateApiKey: (params) => {
    const id = `key-${Date.now()}`;
    return {
      id,
      name: params.name,
      maskedKey: `orb_${params.environment === 'production' ? 'live' : 'test'}_********************${Math.floor(1000 + Math.random() * 9000)}`,
      rawKey: `orb_${params.environment === 'production' ? 'live' : 'test'}_sample`,
      keyPrefix: `orb_${params.environment === 'production' ? 'live' : 'test'}_`,
      serviceId: params.serviceId,
      serviceName: params.serviceName,
      providerId: params.providerId,
      providerName: params.providerName,
      environment: params.environment,
      createdAt: 'Just now',
      lastUsedAt: 'Never',
      status: 'active',
      scopes: params.scopes,
      rateLimitPerMin: params.rateLimitPerMin,
      requestsLast30Days: 0,
    };
  },
  rotateApiKey: (keyId: string): ApiKeyItem => {
    const oldKey = INITIAL_API_KEYS.find((k) => k.id === keyId) ?? INITIAL_API_KEYS[0];
    return {
      id: `key-${Date.now()}`,
      name: oldKey?.name || 'Rotated Key',
      keyPrefix: oldKey?.keyPrefix || 'orb_live_',
      serviceId: oldKey?.serviceId || 'all',
      serviceName: oldKey?.serviceName || 'All Services',
      providerId: oldKey?.providerId,
      providerName: oldKey?.providerName,
      environment: oldKey?.environment || 'production',
      scopes: oldKey?.scopes || ['read'],
      status: 'active',
      rateLimitPerMin: oldKey?.rateLimitPerMin || 1000,
      maskedKey: `orb_live_********************${Math.floor(1000 + Math.random() * 9000)}`,
      rawKey: 'orb_live_rotated',
      createdAt: 'Just now',
      lastUsedAt: 'Never',
      requestsLast30Days: 0,
    };
  },
  revokeApiKey: () => {},
  toggleApiKeyStatus: () => {},
  isApiKeyValid: () => true,
  getTenantApiKeys: (providerId?: string, serviceId?: string) => {
    return INITIAL_API_KEYS.filter((k) => {
      if (providerId && k.providerId !== providerId) return false;
      if (serviceId && k.serviceId !== serviceId && k.serviceId !== 'all') return false;
      return true;
    });
  },
  quotas: PLATFORM_QUOTAS,
  consumeQuota: () => ({ allowed: true }),
  telemetryLogs: INITIAL_LOGS,
  addTelemetryLog: () => {},
  clearTelemetryLogs: () => {},
  liveActivities: INITIAL_ACTIVITIES,
  recordTenantAction: () => {},
  toastMessage: null,
  showToast: () => {},
  projects: INITIAL_CLIENT_PROJECTS,
  addProject: () => {},
  updateProject: () => {},
  updateProjectPlanAndQuotas: () => {},
  toggleProjectService: () => {},
  toggleProjectStatus: () => {},
  deleteProject: () => {},
  getProject: (projectId: string) => INITIAL_CLIENT_PROJECTS.find((p) => p.id === projectId),
};

const AdminContext = createContext<AdminContextType>(DEFAULT_ADMIN_CONTEXT);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [providers, setProviders] = useState<Record<string, BusinessProvider[]>>(BUSINESS_PROVIDERS);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_API_KEYS);
  const [quotas, setQuotas] = useState<PlatformQuotaMetric[]>(PLATFORM_QUOTAS);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogEntry[]>(INITIAL_LOGS);
  const [liveActivities, setLiveActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [projects, setProjects] = useState<ClientProject[]>(INITIAL_CLIENT_PROJECTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Safely hydrate from localStorage on client only AFTER initial render to prevent SSR hydration mismatches
  useEffect(() => {
    try {
      const savedServices = localStorage.getItem('orbitox_admin_services');
      if (savedServices) setServices(JSON.parse(savedServices));

      const savedProviders = localStorage.getItem('orbitox_admin_providers');
      if (savedProviders) setProviders(JSON.parse(savedProviders));

      const savedKeys = localStorage.getItem('orbitox_admin_apikeys');
      if (savedKeys) {
        const parsedKeys: ApiKeyItem[] = JSON.parse(savedKeys);
        const existingKeyIds = new Set(parsedKeys.map((k) => k.id));
        const mergedKeys = [...parsedKeys];
        for (const defaultKey of INITIAL_API_KEYS) {
          if (!existingKeyIds.has(defaultKey.id)) {
            mergedKeys.push(defaultKey);
          }
        }
        setApiKeys(mergedKeys);
      }

      const savedActivities = localStorage.getItem('orbitox_admin_activities');
      if (savedActivities) setLiveActivities(JSON.parse(savedActivities));

      const savedProjects = localStorage.getItem('orbitox_admin_projects');
      if (savedProjects) {
        const parsedProjects: ClientProject[] = JSON.parse(savedProjects);
        const existingProjIds = new Set(parsedProjects.map((p) => p.id));
        const mergedProjects = [...parsedProjects];
        for (const defaultProj of INITIAL_CLIENT_PROJECTS) {
          if (!existingProjIds.has(defaultProj.id)) {
            mergedProjects.push(defaultProj);
          }
        }
        setProjects(mergedProjects);
      }
    } catch (e) {
      console.error('Failed to load persisted admin state from localStorage:', e);
    } finally {
      setIsHydrated(true);
    }

    // Cross-tab real-time event sync: any change in another tab immediately updates this tab
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === 'orbitox_admin_services' && e.newValue) {
          setServices(JSON.parse(e.newValue));
        } else if (e.key === 'orbitox_admin_providers' && e.newValue) {
          setProviders(JSON.parse(e.newValue));
        } else if (e.key === 'orbitox_admin_apikeys' && e.newValue) {
          setApiKeys(JSON.parse(e.newValue));
        } else if (e.key === 'orbitox_admin_activities' && e.newValue) {
          setLiveActivities(JSON.parse(e.newValue));
        } else if (e.key === 'orbitox_admin_projects' && e.newValue) {
          setProjects(JSON.parse(e.newValue));
        }
      } catch (err) {
        console.error('Cross-tab storage sync error:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Sync to localStorage ONLY after client hydration has loaded persisted state
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('orbitox_admin_services', JSON.stringify(services));
    } catch {}
  }, [services, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('orbitox_admin_providers', JSON.stringify(providers));
    } catch {}
  }, [providers, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('orbitox_admin_apikeys', JSON.stringify(apiKeys));
    } catch {}
  }, [apiKeys, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('orbitox_admin_projects', JSON.stringify(projects));
    } catch {}
  }, [projects, isHydrated]);

  const toggleServiceStatus = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          const nextStatus = s.status === 'active' ? 'blocked' : 'active';
          showToast(`Service [${s.name}] is now ${nextStatus.toUpperCase()}`);
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  const updateServiceQuota = (serviceId: string, newCallLimit: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          showToast(`Updated quota limit for [${s.name}] to ${(newCallLimit / 1000000).toFixed(1)}M calls`);
          return { ...s, apiCallLimit: newCallLimit };
        }
        return s;
      })
    );
  };

  const toggleProviderStatus = (categorySlug: string, providerId: string) => {
    setProviders((prev) => {
      const list = prev[categorySlug] || [];
      const updated = list.map((p) => {
        if (p.id === providerId) {
          const nextStatus = p.status === 'active' ? 'blocked' : 'active';
          showToast(`Tenant [${p.name}] status changed to ${nextStatus.toUpperCase()}`);
          return { ...p, status: nextStatus as 'active' | 'blocked' };
        }
        return p;
      });
      return { ...prev, [categorySlug]: updated };
    });
  };

  const updateProvider = (categorySlug: string, providerId: string, updates: Partial<BusinessProvider>) => {
    setProviders((prev) => {
      const list = prev[categorySlug] || [];
      const updated = list.map((p) => {
        if (p.id === providerId) {
          return { ...p, ...updates };
        }
        return p;
      });
      showToast('Tenant configuration saved successfully');
      return { ...prev, [categorySlug]: updated };
    });
  };

  const addProvider = (categorySlug: string, newProvider: BusinessProvider) => {
    setProviders((prev) => {
      const currentList = prev[categorySlug] || [];
      showToast(`Provisioned new tenant: ${newProvider.name}`);
      return {
        ...prev,
        [categorySlug]: [newProvider, ...currentList],
      };
    });
  };

  const deleteProvider = (categorySlug: string, providerId: string) => {
    setProviders((prev) => {
      const currentList = prev[categorySlug] || [];
      const filtered = currentList.filter((p) => p.id !== providerId);
      showToast('Tenant successfully deprovisioned');
      return {
        ...prev,
        [categorySlug]: filtered,
      };
    });
  };

  const generateApiKey = (params: {
    name: string;
    serviceId: string;
    serviceName: string;
    providerId?: string;
    providerName?: string;
    environment: 'production' | 'staging' | 'sandbox';
    scopes: string[];
    rateLimitPerMin: number;
  }): ApiKeyItem => {
    const randomHex = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const envPrefix = params.environment === 'production' ? 'orb_live_' : 'orb_test_';
    const sPrefix = params.serviceId === 'all' ? 'root_' : `${params.serviceId}_`;
    const fullKey = `${envPrefix}${sPrefix}${randomHex}`;
    const masked = `${envPrefix}${sPrefix}${randomHex.slice(0, 4)}********************${randomHex.slice(-4)}`;

    const newKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: params.name,
      keyPrefix: `${envPrefix}${sPrefix}`,
      maskedKey: masked,
      rawKey: fullKey,
      serviceId: params.serviceId,
      serviceName: params.serviceName,
      providerId: params.providerId,
      providerName: params.providerName,
      environment: params.environment,
      scopes: params.scopes.length > 0 ? params.scopes : ['*'],
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsedAt: 'Never',
      status: 'active',
      rateLimitPerMin: params.rateLimitPerMin || 1000,
      requestsLast30Days: 0,
    };

    setApiKeys((prev) => [newKey, ...prev]);
    showToast(`Successfully created API key: ${params.name}`);
    return newKey;
  };

  const rotateApiKey = (keyId: string): ApiKeyItem => {
    const oldKey = apiKeys.find((k) => k.id === keyId);
    const randomHex = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const prefix = oldKey?.keyPrefix || 'orb_live_rot_';
    const fullKey = `${prefix}${randomHex}`;
    const masked = `${prefix}${randomHex.slice(0, 4)}********************${randomHex.slice(-4)}`;

    const rotatedKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: `${oldKey?.name || 'Key'} (Rotated)`,
      keyPrefix: prefix,
      maskedKey: masked,
      rawKey: fullKey,
      serviceId: oldKey?.serviceId || 'all',
      serviceName: oldKey?.serviceName || 'Rotated Key',
      providerId: oldKey?.providerId,
      providerName: oldKey?.providerName,
      environment: oldKey?.environment || 'production',
      scopes: oldKey?.scopes || ['*'],
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsedAt: 'Never',
      status: 'active',
      rateLimitPerMin: oldKey?.rateLimitPerMin || 2000,
      requestsLast30Days: 0,
    };

    setApiKeys((prev) => [
      rotatedKey,
      ...prev.map((k) => (k.id === keyId ? { ...k, status: 'revoked' as const } : k)),
    ]);
    showToast(`Rotated secret token for [${oldKey?.name}]. Previous key marked revoked.`);
    return rotatedKey;
  };

  const revokeApiKey = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((k) => {
        if (k.id === keyId) {
          showToast(`API Key [${k.name}] has been permanently REVOKED`);
          return { ...k, status: 'revoked' as const, rateLimitPerMin: 0 };
        }
        return k;
      })
    );
  };

  const toggleApiKeyStatus = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((k) => {
        if (k.id === keyId) {
          if (k.status === 'revoked') return k;
          const next = k.status === 'active' ? 'blocked' : 'active';
          showToast(`API Key [${k.name}] is now ${next.toUpperCase()}`);
          return { ...k, status: next as 'active' | 'blocked' };
        }
        return k;
      })
    );
  };

  const addTelemetryLog = (log: Omit<TelemetryLogEntry, 'id' | 'timestamp'>) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newLog: TelemetryLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: timeStr,
      ...log,
    };
    setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 49)]); // keep latest 50
  };

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem('orbitox_admin_activities', JSON.stringify(liveActivities));
    } catch {}
  }, [liveActivities, isHydrated]);

  const isServiceActive = (serviceId: string): boolean => {
    const s = services.find((srv) => srv.id === serviceId);
    return s ? s.status === 'active' : true;
  };

  const getService = (serviceId: string): ServiceItem | undefined => {
    return services.find((srv) => srv.id === serviceId);
  };

  const isProviderActive = (categorySlug: string, providerId: string): boolean => {
    const list = providers[categorySlug] || [];
    const p = list.find((item) => item.id === providerId);
    return p ? p.status === 'active' : true;
  };

  const getProvider = (categorySlug: string, providerId: string): BusinessProvider | undefined => {
    const list = providers[categorySlug] || [];
    return list.find((item) => item.id === providerId);
  };

  const findProviderById = (providerId: string): { provider: BusinessProvider; categorySlug: string } | undefined => {
    for (const [catSlug, list] of Object.entries(providers)) {
      const match = list.find((p) => p.id === providerId);
      if (match) return { provider: match, categorySlug: catSlug };
    }
    return undefined;
  };

  const isApiKeyValid = (keyIdOrPrefix: string): boolean => {
    const key = apiKeys.find(
      (k) =>
        k.id === keyIdOrPrefix ||
        k.rawKey === keyIdOrPrefix ||
        k.keyPrefix === keyIdOrPrefix ||
        k.maskedKey === keyIdOrPrefix
    );
    if (!key) return false;
    return key.status === 'active';
  };

  const getTenantApiKeys = (providerId?: string, serviceId?: string): ApiKeyItem[] => {
    return apiKeys.filter((k) => {
      if (providerId && k.providerId !== providerId) return false;
      if (serviceId && k.serviceId !== serviceId && k.serviceId !== 'all') return false;
      return true;
    });
  };

  const recordTenantAction = (params: {
    tenantId?: string;
    tenantName?: string;
    categorySlug?: string;
    serviceId: string;
    serviceName?: string;
    action: string;
    details: string;
    amount?: string;
    type?: 'receive' | 'send' | 'sync' | 'audit';
    level?: 'INFO' | 'WARN' | 'SECURITY' | 'AUDIT';
  }) => {
    // 1. Add to live activities
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: params.tenantName || params.tenantId || params.serviceName || params.serviceId,
      subtitle: `${params.action}: ${params.details}`,
      amount: params.amount || '$0',
      type: params.type || 'receive',
      badgeLabel: params.type === 'send' ? 'Send' : params.type === 'sync' ? 'Sync' : params.type === 'audit' ? 'Audit' : 'Receive',
      icon: params.serviceId || 'zap',
      timestamp: 'Just now',
    };
    setLiveActivities((prev) => [newActivity, ...prev.slice(0, 24)]);

    // 2. Add to telemetry stream
    addTelemetryLog({
      tenantId: params.tenantId,
      categorySlug: params.categorySlug,
      facade: params.serviceId === 'commerce' ? 'BillingFacade' : params.serviceId === 'hms' ? 'EventsFacade' : 'ContextFacade',
      level: params.level || 'INFO',
      message: `[${params.serviceId.toUpperCase()}] ${params.action} for ${params.tenantName || params.tenantId || 'system'}: ${params.details}`,
    });
  };

  const consumeQuota = (params: {
    serviceId: string;
    providerId?: string;
    categorySlug?: string;
    actionName?: string;
    callsCount?: number;
  }): { allowed: boolean; reason?: string } => {
    const count = params.callsCount || 1;

    // Check service status
    const s = services.find((srv) => srv.id === params.serviceId);
    if (s && s.status === 'blocked') {
      addTelemetryLog({
        tenantId: params.providerId,
        categorySlug: params.categorySlug,
        facade: 'SecurityFacade',
        level: 'SECURITY',
        message: `Blocked request to service [${s.name}]: Service is set to BLOCKED by Platform Admin.`,
      });
      return {
        allowed: false,
        reason: `Microservice [${s.name}] has been BLOCKED by Platform Administration.`,
      };
    }

    // Check provider status if provider specified
    if (params.providerId) {
      const match = findProviderById(params.providerId);
      if (match && match.provider.status === 'blocked') {
        addTelemetryLog({
          tenantId: params.providerId,
          categorySlug: match.categorySlug,
          facade: 'SecurityFacade',
          level: 'SECURITY',
          message: `Blocked request from tenant [${match.provider.name}]: Tenant is set to BLOCKED in Platform Admin.`,
        });
        return {
          allowed: false,
          reason: `Tenant [${match.provider.name}] has been SUSPENDED by Platform Administration.`,
        };
      }

      // Increment provider monthly API calls
      if (match) {
        setProviders((prev) => {
          const list = prev[match.categorySlug] || [];
          const updated = list.map((p) => {
            if (p.id === match.provider.id) {
              const newCalls = (p.monthlyApiCalls || 0) + count;
              return { ...p, monthlyApiCalls: newCalls };
            }
            return p;
          });
          return { ...prev, [match.categorySlug]: updated };
        });
      }
    }

    return { allowed: true };
  };

  const clearTelemetryLogs = () => {
    setTelemetryLogs([]);
    showToast('Telemetry event stream cleared');
  };

  const addProject = (newProject: ClientProject, initialKey?: ApiKeyItem) => {
    setProjects((prev) => [newProject, ...prev]);
    if (initialKey) {
      setApiKeys((prev) => [initialKey, ...prev]);
    }
    showToast(`Provisioned new project: [${newProject.name}] (${newProject.businessModel})`);
    recordTenantAction({
      tenantId: newProject.slug,
      tenantName: newProject.name,
      serviceId: newProject.enabledServices[0] || 'admin',
      serviceName: 'Client Ecosystem',
      action: 'Project Provisioned',
      details: `Model=${newProject.businessModel} | Plan=${newProject.planLabel} | Quota=${(newProject.apiCallQuota / 1000000).toFixed(1)}M calls`,
      amount: newProject.planLabel,
      type: 'sync',
      level: 'AUDIT',
    });
  };

  const updateProject = (projectId: string, updates: Partial<ClientProject>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return { ...p, ...updates };
        }
        return p;
      })
    );
    showToast(`Project settings saved successfully`);
  };

  const updateProjectPlanAndQuotas = (
    projectId: string,
    plan: 'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale',
    apiCallQuota: number,
    rateLimitPerMin: number,
    storageQuotaGb: number
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const planLabels: Record<string, string> = {
            starter: 'Developer Sandbox',
            growth: 'Growth Startup',
            pro: 'Pro Scale',
            enterprise: 'Enterprise Dedicated',
            hyperscale: 'HyperScale O2O2B2B2C Custom',
          };
          showToast(`Updated [${p.name}] plan to ${planLabels[plan]} with ${(apiCallQuota / 1000000).toFixed(1)}M call limit`);
          return {
            ...p,
            plan,
            planLabel: planLabels[plan] || plan,
            apiCallQuota,
            rateLimitPerMin,
            storageQuotaGb,
          };
        }
        return p;
      })
    );
  };

  const toggleProjectService = (projectId: string, serviceId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const exists = p.enabledServices.includes(serviceId);
          const nextServices = exists
            ? p.enabledServices.filter((s) => s !== serviceId)
            : [...p.enabledServices, serviceId];
          showToast(
            `${exists ? 'Removed' : 'Added'} package [@orbitox/${serviceId}] ${exists ? 'from' : 'to'} [${p.name}]`
          );
          return { ...p, enabledServices: nextServices };
        }
        return p;
      })
    );
  };

  const toggleProjectStatus = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const nextStatus = p.status === 'active' ? 'suspended' : 'active';
          showToast(`Project [${p.name}] status is now ${nextStatus.toUpperCase()}`);
          return { ...p, status: nextStatus };
        }
        return p;
      })
    );
  };

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    showToast(`Project deprovisioned successfully`);
  };

  const getProject = (projectId: string) => {
    return projects.find((p) => p.id === projectId || p.slug === projectId);
  };

  return (
    <AdminContext.Provider
      value={{
        services,
        toggleServiceStatus,
        updateServiceQuota,
        isServiceActive,
        getService,
        providers,
        toggleProviderStatus,
        updateProvider,
        addProvider,
        deleteProvider,
        isProviderActive,
        getProvider,
        findProviderById,
        apiKeys,
        generateApiKey,
        rotateApiKey,
        revokeApiKey,
        toggleApiKeyStatus,
        isApiKeyValid,
        getTenantApiKeys,
        quotas,
        consumeQuota,
        telemetryLogs,
        addTelemetryLog,
        clearTelemetryLogs,
        liveActivities,
        recordTenantAction,
        toastMessage,
        showToast,
        projects,
        addProject,
        updateProject,
        updateProjectPlanAndQuotas,
        toggleProjectService,
        toggleProjectStatus,
        deleteProject,
        getProject,
      }}
    >
      {children}
      {/* Toast Notification HUD */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            color: '#FFFFFF',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 20px rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'fadeInUp 0.25s ease-out',
          }}
        >
          <OrbitoxLogo size={20} />
          <span style={{ color: '#FFFFFF' }}>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '6px',
              color: '#A3AED0',
              cursor: 'pointer',
              marginLeft: '8px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextType {
  const context = useContext(AdminContext);
  return context || DEFAULT_ADMIN_CONTEXT;
}

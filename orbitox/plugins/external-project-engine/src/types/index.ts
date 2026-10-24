import type {
  OrbitoxProjectManifest,
  SignedRuntimeConfiguration,
  ConfigurationRevision,
  ControlCommand,
  RuntimeReconciliationReport,
  ApiRegistrationMeta,
  ProjectRuntimeMetadata,
} from '@orbitox/external-runtime-sdk';

export type {
  OrbitoxProjectManifest,
  SignedRuntimeConfiguration,
  ConfigurationRevision,
  ControlCommand,
  RuntimeReconciliationReport,
  ApiRegistrationMeta,
  ProjectRuntimeMetadata,
};

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: OrbitoxProjectManifest['type'];
  defaultPort: number;
  businessModel: string;
  defaultPlugins: string[];
  defaultFeatures: string[];
  defaultApis: ApiRegistrationMeta[];
  defaultPlans: string[];
  icon: string;
}

export interface ApiRegistryEntry extends ApiRegistrationMeta {
  projectId: string;
  pluginId: string;
  webhookSupported: boolean;
  status: 'ACTIVE' | 'DEPRECATED' | 'DISABLED';
  health: 'HEALTHY' | 'DEGRADED';
  permissions: string[];
  rateLimitPerMin: number;
  lastInvokedAt?: string;
  totalInvocations: number;
}

export interface PlanLimitDefinition {
  key: string;
  name: string;
  limit: number;
  enforced: boolean;
  unit: string;
}

export interface PlanAddonDefinition {
  id: string;
  name: string;
  priceMinor: string;
  currency: string;
  description: string;
}

export interface CentralPlanDefinition {
  id: string;
  name: string;
  tier: 'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale';
  basePriceMinor: string; // minor units e.g. "29900" = $299.00
  currency: string;
  billingInterval: 'monthly' | 'yearly';
  features: string[];
  limits: Record<string, PlanLimitDefinition>;
  addons: PlanAddonDefinition[];
  pricingRules?: Array<{
    code: string;
    description: string;
    modifierMinor: string;
  }>;
}

export interface RuntimeSessionRecord {
  controlSessionId: string;
  projectId: string;
  slug: string;
  runtimeUrl: string;
  runtimePort: number;
  status: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
  registeredAt: string;
  lastHeartbeatAt: string;
  activeConfigVersion: number;
  appliedRevision: number;
  desiredRevision: number;
  syncStatus: 'IN_SYNC' | 'OUT_OF_SYNC' | 'RECONCILING';
  declaredApis: ApiRegistrationMeta[];
  capabilities: string[];
  metrics: {
    pid: number;
    uptimeSeconds: number;
    memoryMb: number;
  };
}

export interface PlatformPluginRecord {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  capabilities: string[];
  dependencies: string[];
  apis: string[];
  installed: boolean;
  enabled: boolean;
  configuration: Record<string, any>;
  schema?: Record<string, any>;
}

export interface ExternalProjectRecord {
  id: string;
  slug: string;
  name: string;
  manifest: OrbitoxProjectManifest;
  status: 'PROVISIONING' | 'ACTIVE' | 'CONNECTED' | 'DISCONNECTED' | 'MAINTENANCE' | 'ARCHIVED';
  localPath: string;
  activeRevisionNumber: number;
  desiredRevisionNumber: number;
  syncStatus: 'IN_SYNC' | 'OUT_OF_SYNC' | 'RECONCILING';
  runtimeSession?: RuntimeSessionRecord;
  projectKeyHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAuditEntry {
  id: string;
  projectId: string;
  timestamp: string;
  actor: string;
  action: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  resourceId?: string;
  details?: Record<string, any>;
}

export interface EnvironmentRecord {
  id: string;
  projectId: string;
  name: 'local' | 'development' | 'preview' | 'staging' | 'production';
  url: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  variables: Record<string, string>;
  secrets: Record<string, string>;
  lastDeployedAt?: string;
}

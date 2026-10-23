/**
 * 🪐 OrbitoX External Runtime SDK - Types & Contracts
 * Definitive contracts decoupling external OS products from internal platform storage.
 */

export interface ProjectRuntimeMetadata {
  type: 'nextjs' | 'vite' | 'express' | 'nest' | 'standalone';
  entrypoint: string;
  defaultPort: number;
  healthEndpoint: string;
}

export interface ApiRegistrationMeta {
  name: string;
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  version: string;
  requiresAuth: boolean;
  scopes: string[];
  rateLimitPerMin?: number;
  description: string;
}

export interface OrbitoxProjectManifest {
  projectId: string;
  slug: string;
  name: string;
  type: 'restaurant-os' | 'celebrations-os' | 'hospital-os' | 'commerce-os' | 'crm-os' | 'custom-os';
  version: string;
  runtime: ProjectRuntimeMetadata;
  enabledPlugins: string[];
  enabledFeatures: string[];
  apis: ApiRegistrationMeta[];
  planReferences: string[];
  environmentMetadata: {
    defaultEnvironment: string;
    supportedEnvironments: string[];
  };
  platformController: {
    controlPlaneUrl: string;
    syncIntervalSeconds: number;
    requireSignedConfig: boolean;
  };
  capabilities: string[];
  customMetadata?: Record<string, any>;
}

export interface ConfigurationRevision {
  revisionId: string;
  revisionNumber: number;
  projectId: string;
  status: 'DRAFT' | 'VALIDATING' | 'VALID' | 'APPLYING' | 'APPLIED' | 'FAILED' | 'SUPERSEDED';
  createdBy: string;
  createdAt: string;
  appliedAt?: string;
  desiredState: {
    features: Record<string, boolean>;
    entitlements: Record<string, { limit: number; used: number; enforced: boolean }>;
    apiPolicies: Record<string, { rateLimit: number; allowedScopes: string[] }>;
    customConfig: Record<string, any>;
    pluginsConfig?: Record<string, any>;
  };
  diff?: {
    added: string[];
    modified: string[];
    removed: string[];
    summary: string;
  };
  validationResult?: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
  };
  runtimeAcknowledgement?: {
    runtimeId: string;
    appliedRevision: number;
    acknowledgedAt: string;
    status: 'SUCCESS' | 'ERROR';
    error?: string;
  };
}

export interface SignedRuntimeConfiguration {
  configVersion: number;
  revisionNumber?: number;
  revisionId?: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
  projectId: string;
  environment: string;
  features: Record<string, boolean>;
  entitlements: Record<string, { limit: number; used: number; enforced: boolean }>;
  apiPolicies: Record<string, { rateLimit: number; allowedScopes: string[] }>;
  mcpTools: Array<{ name: string; actionLevel: number; enabled: boolean }>;
  desiredState: Record<string, any>;
}

export interface RuntimeRegistrationPayload {
  projectId: string;
  slug: string;
  /** Human-readable name shown in the control plane; defaults to the slug. */
  name?: string;
  /** Project type from the manifest (e.g. 'restaurant-os', 'custom-os'). */
  projectType?: string;
  runtimeUrl: string;
  runtimePort: number;
  version: string;
  declaredApis: ApiRegistrationMeta[];
  capabilities: string[];
  appliedRevision?: number;
  processMetrics?: {
    pid: number;
    uptimeSeconds: number;
    memoryMb: number;
  };
}

export interface RuntimeRegistrationResponse {
  success: boolean;
  registeredId: string;
  controlSessionId: string;
  signedConfig: SignedRuntimeConfiguration;
  desiredRevision: number;
  platformTime: string;
}

export interface RuntimeHeartbeatReport {
  projectId: string;
  controlSessionId: string;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  activeConnections: number;
  memoryUsageMb: number;
  uptimeSeconds: number;
  activeConfigVersion: number;
  appliedRevision?: number;
  syncStatus?: 'IN_SYNC' | 'OUT_OF_SYNC' | 'RECONCILING';
  lastSyncAt: string;
}

export interface RuntimeReconciliationReport {
  projectId: string;
  runtimeId: string;
  reportedRevision: number;
  appliedRevision: number;
  desiredRevision: number;
  status: 'IN_SYNC' | 'OUT_OF_SYNC' | 'RECONCILING';
  syncErrors?: string[];
  timestamp: string;
}

export interface ControlCommand {
  commandId: string;
  projectId: string;
  action:
    | 'rotate_qr_locator'
    | 'invalidate_capability_epoch'
    | 'refresh_cache'
    | 'reconcile_plugins'
    | 'restart_runtime'
    | 'run_health_check'
    | 'custom';
  parameters?: Record<string, any>;
  status: 'QUEUED' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'FAILED';
  issuedBy: string;
  issuedAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  result?: Record<string, any>;
  error?: string;
}

export interface RuntimeAuditReport {
  projectId: string;
  action: string;
  actor: string;
  resourceId?: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface CentralQuoteRequest {
  projectId: string;
  tenantId?: string;
  planId: string;
  addons?: string[];
  items?: Array<{
    id: string;
    quantity: number;
    unitPriceMinor?: string;
  }>;
  customDiscountPercent?: number;
}

export interface CentralQuoteResponse {
  quoteId: string;
  projectId: string;
  planId: string;
  baseAmountMinor: string;
  addonsAmountMinor: string;
  discountMinor: string;
  taxMinor: string;
  totalMinor: string;
  currency: string;
  inputHash: string;
  resultHash: string;
  validUntil: string;
}

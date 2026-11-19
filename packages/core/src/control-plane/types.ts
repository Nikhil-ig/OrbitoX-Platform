/**
 * 🪐 OrbitoX Universal Control Plane Core Types & Contracts (v4.1)
 * Authoritative models for the Production Materialized Resource Graph & Orchestration Engines.
 */

export type ResourceType =
  | 'PLATFORM'
  | 'ORGANIZATION'
  | 'PROJECT'
  | 'ENVIRONMENT'
  | 'TENANT'
  | 'COMPANY'
  | 'BRANCH'
  | 'PLAN'
  | 'PLAN_VERSION'
  | 'SUBSCRIPTION'
  | 'FEATURE'
  | 'ENTITLEMENT'
  | 'POLICY'
  | 'FEATURE_FLAG'
  | 'PACKAGE'
  | 'PACKAGE_VERSION'
  | 'PLUGIN'
  | 'PACKAGE_INSTALLATION'
  | 'SERVICE'
  | 'SERVICE_VERSION'
  | 'API'
  | 'API_VERSION'
  | 'API_CAPABILITY'
  | 'API_KEY'
  | 'CREDENTIAL'
  | 'DOMAIN'
  | 'DNS_RECORD'
  | 'TLS_CERTIFICATE'
  | 'EDGE_ROUTE'
  | 'CLUSTER'
  | 'REGION'
  | 'SERVER_NODE'
  | 'SERVICE_DEPLOYMENT'
  | 'REPLICA'
  | 'QUOTA_POLICY'
  | 'RATE_LIMIT_POLICY'
  | 'WEBHOOK'
  | 'INTEGRATION'
  | 'SECURITY_FINDING'
  | 'APPROVAL'
  | 'AUDIT_EVENT'
  | 'AI_MODEL'
  | 'MCP_SERVER'
  | 'MCP_TOOL'
  | 'AI_POLICY'
  | 'INCIDENT'
  | 'TELEMETRY_STREAM'
  | 'WORKFLOW';

export type EdgeType =
  | 'OWNS'
  | 'CONTAINS'
  | 'HOSTS'
  | 'DEPENDS_ON'
  | 'DEPENDED_ON_BY'
  | 'INSTALLS'
  | 'INSTALLED_IN'
  | 'EXPOSES'
  | 'AUTHORIZES'
  | 'USES'
  | 'CONSUMES'
  | 'ROUTES_TO'
  | 'PROTECTED_BY'
  | 'ENTITLED_BY'
  | 'LIMITED_BY'
  | 'DEPLOYS_TO'
  | 'RUNS_ON'
  | 'REQUIRES'
  | 'PROVIDES'
  | 'TRIGGERS'
  | 'AFFECTS'
  | 'GENERATES'
  | 'REQUIRES_APPROVAL'
  | 'OBSERVED_BY'
  | 'CONFIGURED_BY'
  | 'BOUND_TO'
  | 'DEPLOYED_TO'
  | 'SUBSCRIBED_TO'
  | 'FLAGS'
  | 'INVOKES'
  | 'GOVERNS'
  | 'ESCALATES_TO';

export type DriftState =
  | 'IN_SYNC'
  | 'DRIFTED'
  | 'RECONCILING'
  | 'BLOCKED'
  | 'FAILED'
  | 'UNKNOWN';

export type LifecycleState =
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'SUSPENDED'
  | 'DEPRECATED'
  | 'ARCHIVED'
  | 'DECOMMISSIONED'
  | 'RETIRED'
  | 'DRAINING'
  | 'DRAINED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type GraphStatus =
  | 'GRAPH_BUILDING'
  | 'GRAPH_READY'
  | 'GRAPH_DEGRADED'
  | 'GRAPH_CORRUPT';

export type ReconciliationSafetyLevel =
  | 'SAFE'
  | 'CONTROLLED'
  | 'APPROVAL_REQUIRED'
  | 'MANUAL_ONLY';

export interface GraphEdge {
  id: string;
  sourceId: string;
  sourceType: ResourceType;
  targetId: string;
  targetType: ResourceType;
  edgeType: EdgeType;
  metadata?: {
    reason?: string;
    minVersion?: string;
    source?: string;
    [key: string]: unknown;
  };
}

export interface UniversalResource<TDesired = Record<string, unknown>, TObserved = Record<string, unknown>> {
  resourceId: string;
  resourceType: ResourceType;
  name: string;
  resourceVersion: number;
  owner: string;
  organizationId: string;
  projectId?: string;
  environmentId?: string;
  desiredState: TDesired;
  observedState?: TObserved;
  driftState: DriftState;
  lifecycleStatus: LifecycleState;
  effectivePolicyId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceSummary {
  resourceId: string;
  resourceType: ResourceType;
  name: string;
  status: string;
  environmentId?: string;
  projectId?: string;
  reason?: string;
}

export interface ImpactAssessment {
  action: string;
  targetResourceId: string;
  targetResourceType: ResourceType;
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  verdict: 'PERMITTED' | 'REQUIRES_APPROVAL' | 'BLOCKED';
  blockerReason?: string;
  affectedProjectsCount: number;
  affectedEnvironmentsCount: number;
  affectedTenantsCount: number;
  affectedApisCount: number;
  affectedKeysCount: number;
  affectedNodesCount: number;
  directImpacts: ResourceSummary[];
  transitiveImpacts: ResourceSummary[];
  suggestedMitigations: string[];
}

export interface PlatformCommand<TPayload = unknown> {
  commandId: string;
  correlationId: string;
  idempotencyKey: string;
  actor: {
    userId: string;
    role: string;
    ipAddress: string;
  };
  resourceType: ResourceType;
  resourceId: string;
  operation: string;
  desiredPayload: TPayload;
  expectedVersion: number;
  dryRun?: boolean;
  reason?: string;
}

export interface CommandExecutionResult<TResult = unknown> {
  success: boolean;
  status?: 'SUCCESS' | 'FAILED' | 'APPROVAL_PENDING' | 'DRY_RUN';
  commandId: string;
  resourceId: string;
  resourceType: ResourceType;
  version: number;
  dryRun: boolean;
  impact: ImpactAssessment;
  executionPlan: string[];
  data?: TResult;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  executedAt: string;
}

export interface PlanContract {
  planId: string;
  version: number;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
  priceUsd: number;
  billingPeriod: 'MONTHLY' | 'ANNUAL';
  includedPackages: string[];
  includedFeatures: string[];
  maxProjects: number;
  maxEnvironmentsPerProject: number;
  maxTenants: number;
  monthlyApiQuota: number;
  rateLimitRpm: number;
  burstPerSecond: number;
  storageQuotaGb: number;
  supportTier: string;
  slaPercentage: number;
}

export interface PolicyDerivationStep {
  source: string;
  property: string;
  value: unknown;
  reason?: string;
}

export interface EffectivePolicyResult {
  property: string;
  effectiveValue: unknown;
  derivationTree: PolicyDerivationStep[];
  explanation: string;
}

export interface GraphMetadata {
  graphVersion: number;
  lastRebuiltAt: string;
  lastIncrementalUpdateAt?: string;
  lastEventSequence: number;
  consistencyStatus: GraphStatus;
  nodeCount: number;
  edgeCount: number;
}

export interface GraphVerificationReport {
  isConsistent: boolean;
  status: GraphStatus;
  nodeCount: number;
  edgeCount: number;
  missingNodes: string[];
  orphanEdges: string[];
  cycles: string[];
  orphans: ResourceSummary[];
  issues: string[];
  verifiedAt: string;
}

export interface EffectiveKeyAuthorization {
  keyId: string;
  requestedCapability?: string;
  isAllowed: boolean;
  effectiveScopes: string[];
  explanation: string;
  checks: {
    rule: string;
    passed: boolean;
    details: string;
  }[];
}

export interface PlanDowngradePreflightResult {
  allowed: boolean;
  currentPlan: string;
  targetPlan: string;
  currentEnvironmentsCount: number;
  maxEnvironmentsAllowed: number;
  currentPackagesCount: number;
  maxPackagesAllowed: number;
  violations: string[];
  blockers: string[];
  affectedEnvironments: string[];
  recommendedAction: string;
}

export interface ResourceActionDeclaration {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  safetyLevel: ReconciliationSafetyLevel;
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export interface UniversalResourceRegistryContract {
  type: ResourceType;
  displayName?: string;
  identitySchema?: Record<string, unknown>;
  configurationSchema?: Record<string, unknown>;
  relationships?: EdgeType[];
  actions?: string[];
  permissions?: string[];
  lifecycle?: LifecycleState[];
  healthResolver?: (resourceId: string) => Promise<string> | string;
  desiredStateResolver?: (resourceId: string) => Promise<unknown> | unknown;
  observedStateResolver?: (resourceId: string) => Promise<unknown> | unknown;
  impactResolver?: (action: string, resourceId: string, payload?: any) => Promise<Partial<ImpactAssessment>> | Partial<ImpactAssessment>;
}

export interface PackageManifestContract {
  id: string;
  version: string;
  platformCompatibility: string;
  dependencies?: Array<string | { packageId: string; minVersion?: string }>;
  features?: string[];
  capabilities?: Array<string | { id: string; name?: string; defaultProvider?: string }>;
  services?: Array<{ id: string; name?: string; port?: number; replicas?: number; nodeId?: string; apis?: string[] }>;
  apis?: Array<{ id: string; name?: string; method?: string; path?: string; version?: string; capability?: string }>;
  events?: string[];
  configuration?: Record<string, unknown>;
  permissions?: string[];
  credentials?: string[];
  healthChecks?: Array<{ id: string; type: string; endpoint?: string }>;
  tests?: string[];
}

export interface EffectiveCommercialPolicy {
  projectId: string;
  planId: string;
  planVersion: number;
  planName: string;
  priceUsd: number;
  features: string[];
  capabilities: string[];
  packages: string[];
  limits: {
    maxEnvironments: number;
    maxTenants: number;
    monthlyApiQuota: number;
    rateLimitRpm: number;
    storageQuotaGb: number;
  };
  derivationTree: PolicyDerivationStep[];
  explanation: string;
}

export interface EntitlementVerdict {
  allowed: boolean;
  entitled?: boolean;
  subject: string;
  target: string;
  targetType: 'PACKAGE' | 'FEATURE' | 'CAPABILITY' | 'API' | 'SERVICE';
  reason: string;
  explanation?: string;
  rule?: string;
  checks: Array<{ rule: string; passed: boolean; details: string }>;
}

export interface ChangeSetStep {
  id: string;
  order: number;
  action: string;
  targetId: string;
  targetType: ResourceType;
  payload?: Record<string, unknown>;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK' | 'SKIPPED';
  rollbackAction?: string;
  rollbackPayload?: Record<string, unknown>;
  error?: string;
}

export interface ChangeSetPlan {
  changeSetId: string;
  name: string;
  description?: string;
  steps: ChangeSetStep[];
  status: 'PLANNED' | 'VALIDATED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  dryRun?: boolean;
  requiresApproval?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface ProjectBlueprint {
  id: string;
  name: string;
  organizationId: string;
  planTier: string;
  environments: Array<{ slug: string; isProduction: boolean; requireMtls?: boolean }>;
  packages: string[];
  features: string[];
  services: string[];
  domains?: Array<{ domainName: string; environmentSlug: string }>;
  quotas?: { monthlyApiQuota?: number; rateLimitRpm?: number };
  metadata?: Record<string, unknown>;
}

export interface PlatformCanonicalEvent {
  eventId: string;
  eventType: string;
  resourceType: ResourceType;
  resourceId: string;
  contextId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  sequence?: number;
}

export interface RegisteredCommandHandler<TPayload = any, TResult = any> {
  operation: string;
  resourceType: ResourceType;
  requiredPermission?: string;
  riskLevel?: RiskLevel;
  safetyLevel?: ReconciliationSafetyLevel;
  supportsDryRun?: boolean;
  supportsRollback?: boolean;
  requiresApproval?: boolean;
  validate?: (command: PlatformCommand<TPayload>) => Promise<boolean | string> | boolean | string;
  authorize?: (command: PlatformCommand<TPayload>) => Promise<boolean | string> | boolean | string;
  impact?: (command: PlatformCommand<TPayload>) => Promise<Partial<ImpactAssessment>> | Partial<ImpactAssessment>;
  execute: (command: PlatformCommand<TPayload>) => Promise<TResult>;
  rollback?: (command: PlatformCommand<TPayload>, prevResult?: TResult) => Promise<boolean>;
  audit?: (command: PlatformCommand<TPayload>, result: CommandExecutionResult<TResult>) => Promise<void>;
}

export interface AuthoritativeResourceProvider {
  getOrganizations(): Promise<any[]> | any[];
  getProjects(): Promise<any[]> | any[];
  getEnvironments(projectId?: string): Promise<any[]> | any[];
  getTenants?(environmentId?: string): Promise<any[]> | any[];
  getCompanies?(tenantId?: string): Promise<any[]> | any[];
  getBranches?(companyId?: string): Promise<any[]> | any[];
  getPackages(): Promise<any[]> | any[];
  getPackageVersions?(packageId?: string): Promise<any[]> | any[];
  getPackageInstallations?(environmentId?: string): Promise<any[]> | any[];
  getPlugins?(contextId?: string): Promise<any[]> | any[];
  getServices?(): Promise<any[]> | any[];
  getApis?(): Promise<any[]> | any[];
  getCapabilities?(): Promise<any[]> | any[];
  getApiKeys?(filter?: any): Promise<any[]> | any[];
  getCredentials?(filter?: any): Promise<any[]> | any[];
  getDomains?(environmentId?: string): Promise<any[]> | any[];
  getPlans?(): Promise<any[]> | any[];
  getSubscriptions?(): Promise<any[]> | any[];
  getFeatureFlags?(): Promise<any[]> | any[];
  getWebhooks?(): Promise<any[]> | any[];
  getIntegrations?(): Promise<any[]> | any[];
  getComputeNodes?(): Promise<any[]> | any[];
  getDeployments?(): Promise<any[]> | any[];
  getQuotaPolicies?(): Promise<any[]> | any[];
  getAiModels?(): Promise<any[]> | any[];
  getMcpServers?(): Promise<any[]> | any[];
  getMcpTools?(): Promise<any[]> | any[];
  getIncidents?(): Promise<any[]> | any[];
  getApprovals?(): Promise<any[]> | any[];
  getWorkflows?(): Promise<any[]> | any[];
}

export type EditorFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'enum'
  | 'multi-select'
  | 'resource-reference'
  | 'json'
  | 'code'
  | 'cron'
  | 'duration'
  | 'secret-reference';

export interface EditorFieldDefinition {
  key: string;
  label: string;
  description?: string;
  type: EditorFieldType;
  required?: boolean;
  defaultValue?: any;
  currentValue?: any;
  inheritedValue?: any;
  inheritedFrom?: string;
  editable: boolean;
  sensitive?: boolean;
  secret?: boolean;
  readonly?: boolean;
  deprecated?: boolean;
  options?: Array<{ label: string; value: any; description?: string }>;
  targetResourceType?: ResourceType | string;
  dependencies?: Array<{ field: string; equals: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
    customValidator?: string;
  };
}

export interface EditorSection {
  id: string;
  title: string;
  description?: string;
  fields: EditorFieldDefinition[];
}

export interface ResourceActionDefinition {
  id: string;
  label: string;
  description?: string;
  safetyClass: 'SAFE' | 'CONTROLLED' | 'APPROVAL_REQUIRED' | 'MANUAL_ONLY';
  requiresApproval: boolean;
  supportsDryRun: boolean;
  supportsRollback: boolean;
  allowed: boolean;
  disabledReason?: string;
  riskRating: number;
  command?: string;
}

export interface EditorValidationRule {
  field: string;
  rule: 'required' | 'min' | 'max' | 'regex' | 'custom';
  params?: any;
  message: string;
}

export interface EditorPermissionRule {
  action: string;
  requiredPermission: string;
  roleAllowed?: string[];
}

export interface ResourceEditorSchema {
  resourceType: ResourceType;
  resourceId: string;
  displayName: string;
  category: 'INFRASTRUCTURE' | 'COMPUTE' | 'IDENTITY' | 'SECURITY' | 'COMMERCIAL' | 'NETWORKING' | 'GOVERNANCE';
  version: number;
  isEditable: boolean;
  sections: EditorSection[];
  actions: ResourceActionDefinition[];
  immutableFields: string[];
  observedFields: string[];
  validationRules?: EditorValidationRule[];
  permissions?: EditorPermissionRule[];
}

export interface ConfigurationDiffEntry {
  field: string;
  label?: string;
  before: any;
  after: any;
  isRedacted?: boolean;
  isOverride?: boolean;
}

export interface ConfigurationPreviewResult {
  resourceId: string;
  expectedVersion: number;
  diff: ConfigurationDiffEntry[];
  impact: {
    affectedResources: string[];
    affectedServices: string[];
    affectedProjects: string[];
    blastRadius: number;
    riskRating: number;
  };
  requiresApproval: boolean;
  approvalQuorum?: number;
  executionPlan: Array<{
    step: number;
    operation: string;
    description: string;
    safetyLevel: string;
  }>;
  supportsRollback: boolean;
  validationErrors?: string[];
}

export interface ApplyConfigurationPayload {
  resourceId: string;
  expectedVersion?: number;
  changes: Record<string, any>;
  reason?: string;
  actor?: string;
}

export interface ApplyConfigurationResult {
  commandId: string;
  resourceId: string;
  status: 'SUCCESS' | 'RECONCILING' | 'APPROVAL_PENDING' | 'FAILED';
  newVersion?: number;
  reconciliation?: {
    status: 'IN_PROGRESS' | 'RECONCILED' | 'DRIFTED';
    target: string;
    message?: string;
  };
  approval?: {
    requestId: string;
    quorumRequired: number;
    currentApprovals: number;
  };
  auditId?: string;
  error?: string;
}

export interface ConfigurationVersionRecord {
  version: number;
  resourceId: string;
  desiredState: Record<string, any>;
  changedFields: string[];
  actor: string;
  reason?: string;
  timestamp: string;
  rollbackAvailable: boolean;
}


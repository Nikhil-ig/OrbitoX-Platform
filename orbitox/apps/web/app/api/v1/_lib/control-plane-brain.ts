/**
 * 🪐 Control Plane Brain Singleton for Next.js App Router API Routes (v4.1)
 * Single authoritative access point for the Materialized Resource Graph projection,
 * Universal Resource Registry, and Orchestration Engines.
 */

import {
  ResourceGraphService,
  ResourceRegistry,
  ImpactAnalysisService,
  PolicyResolutionService,
  CommandBusService,
  ReconciliationService,
  AuthoritativeResourceProvider,
  PluginRegistryService,
  PlanEntitlementService,
  ChangeSetService,
  BlueprintService,
  ResourceEditorService,
} from '@orbitox/core/control-plane';

import { auditService, approvalEngine } from './platform-governance';
import { platformRepository } from '@/lib/platform-repository';

// Authoritative Resource Provider mapping PlatformRepository into the Materialized DAG
export const platformRepoProvider: AuthoritativeResourceProvider = {
  getOrganizations: () => platformRepository.listOrganizations(),
  getProjects: () => platformRepository.listProjects(),
  getEnvironments: (projectId?: string) => platformRepository.listEnvironments(projectId),
  getPackages: () => platformRepository.listPackages(),
  getPackageVersions: (packageId?: string) => packageId ? platformRepository.listPackageVersions(packageId) : Promise.resolve([]),
  getPackageInstallations: (environmentId?: string) => platformRepository.listInstallations(environmentId),
  getApiKeys: (filter?: any) => platformRepository.listApiKeys(filter),
  getCredentials: (filter?: any) => platformRepository.listCredentials(filter),
  getDomains: (environmentId?: string) => platformRepository.listDomains(environmentId),
  getQuotaPolicies: async () => {
    const environments = await platformRepository.listEnvironments();
    const policies = await Promise.all(environments.map((environment) => platformRepository.getQuotaPolicy(environment.id)));
    return policies.filter(Boolean);
  },
  getPlans: () => {
    return [
      { id: 'plan_starter', name: 'Starter Sandbox', price: 0, features: ['basic_api'], limits: { maxEnvs: 1, maxPackages: 2 } },
      { id: 'plan_growth', name: 'Growth Scale', price: 299, features: ['multi_env', 'standard_support'], limits: { maxEnvs: 3, maxPackages: 5 } },
      { id: 'plan_pro', name: 'Professional Tier', price: 999, features: ['custom_domains', 'sla_99_9'], limits: { maxEnvs: 5, maxPackages: 10 } },
      { id: 'plan_enterprise', name: 'Enterprise Dedicated', price: 2999, features: ['four_eyes_approval', 'custom_domains', 'mtls', 'audit_export'], limits: { maxEnvs: 25, maxPackages: 50 } },
      { id: 'plan_hyperscale', name: 'Hyperscale Mesh', price: 9999, features: ['all_features', 'dedicated_vpc'], limits: { maxEnvs: 100, maxPackages: 200 } },
    ];
  },
  getTenants: async () => {
    const envs = await platformRepository.listEnvironments();
    const omniProd = envs.find((e) => e.slug === 'production' && e.name.toLowerCase().includes('omni'));
    const medProd = envs.find((e) => e.slug === 'production' && e.name.toLowerCase().includes('mednet'));
    const auraProd = envs.find((e) => e.slug === 'production' && e.name.toLowerCase().includes('aura'));

    return [
      {
        tenantId: 'tenant_apollo_hospitals',
        name: 'Apollo Regional Hospitals Trust',
        environmentId: medProd?.id,
        tier: 'enterprise',
        domain: 'apollo.orbito.com',
        status: 'ACTIVE',
        features: ['ehr_sync', 'clinical_ai', 'telehealth'],
      },
      {
        tenantId: 'tenant_metro_fleet',
        name: 'Metro Deliveries Express',
        environmentId: omniProd?.id,
        tier: 'hyperscale',
        domain: 'metro.express.io',
        status: 'ACTIVE',
        features: ['predictive_routing', 'fleet_telematics', 'realtime_kds'],
      },
      {
        tenantId: 'tenant_aura_flagship',
        name: 'Aura Milano Flagship Stores',
        environmentId: auraProd?.id,
        tier: 'growth',
        domain: 'milano.aura-luxury.com',
        status: 'ACTIVE',
        features: ['pos_omnichannel', 'clientele_crm'],
      },
    ];
  },
  getCompanies: () => {
    return [
      {
        id: 'comp_apollo_care_ltd',
        name: 'Apollo Care Operating Ltd',
        tenantId: 'tenant_apollo_hospitals',
        legalName: 'Apollo Clinical Healthcare Pte Ltd',
        status: 'ACTIVE',
      },
      {
        id: 'comp_metro_transit_corp',
        name: 'Metro Transit Logistics Corp',
        tenantId: 'tenant_metro_fleet',
        legalName: 'Metro Fleet Holdings Corp',
        status: 'ACTIVE',
      },
    ];
  },
  getBranches: () => {
    return [
      {
        id: 'branch_apollo_mumbai',
        name: 'Apollo Mumbai Tertiary Care Hospital',
        companyId: 'comp_apollo_care_ltd',
        location: 'Navi Mumbai Sector 10',
        status: 'ACTIVE',
      },
      {
        id: 'branch_metro_hub_central',
        name: 'Metro Central Fulfillment Hub',
        companyId: 'comp_metro_transit_corp',
        location: 'Bandra-Kurla Logistics Depot',
        status: 'ACTIVE',
      },
    ];
  },
  getSubscriptions: async () => {
    const projects = await platformRepository.listProjects();
    const omni = projects.find((p) => p.slug === 'omnideliver');
    const mednet = projects.find((p) => p.slug === 'mednet-health');
    const aura = projects.find((p) => p.slug === 'aura-luxury');

    return [
      {
        id: 'sub_omni_hyperscale',
        name: 'OmniDeliver Hyperscale Active Subscription',
        planId: 'plan_hyperscale',
        projectId: omni?.id,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      {
        id: 'sub_mednet_enterprise',
        name: 'MedNet Enterprise Dedicated Subscription',
        planId: 'plan_enterprise',
        projectId: mednet?.id,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 180 * 86400000).toISOString(),
      },
      {
        id: 'sub_aura_growth',
        name: 'Aura Luxury Scale Subscription',
        planId: 'plan_growth',
        projectId: aura?.id,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 60 * 86400000).toISOString(),
      },
    ];
  },
  getFeatureFlags: async () => {
    const envs = await platformRepository.listEnvironments();
    const omniProd = envs.find((e) => e.slug === 'production' && e.name.toLowerCase().includes('omni'));

    return [
      {
        id: 'flag_edge_routing_v2',
        name: 'Smart Global Anycast Edge Routing (v2)',
        environmentId: omniProd?.id,
        enabled: true,
        overrides: [],
      },
      {
        id: 'flag_four_eyes_enforce',
        name: 'Strict Four-Eyes Security Quorum Enforcement',
        environmentId: omniProd?.id,
        enabled: true,
        overrides: [],
      },
      {
        id: 'flag_ai_copilot_preview',
        name: 'Agentic Control Copilot Streaming Preflight',
        enabled: true,
        overrides: [],
      },
    ];
  },
  getApis: () => {
    return [
      {
        id: 'api_kitchen_orders',
        name: 'Restaurant Orders & Kitchen Display API',
        packageId: '@orbitox/restaurant',
        version: 'v2.2',
        rateLimitRpm: 10000,
      },
      {
        id: 'api_pos_checkout',
        name: 'Retail Point-of-Sale Hardware API',
        packageId: '@orbitox/pos',
        version: 'v1.4',
        rateLimitRpm: 5000,
      },
      {
        id: 'api_clinical_ehr',
        name: 'HIPAA Certified Clinical Records API',
        packageId: '@orbitox/hms',
        version: 'v2.4',
        rateLimitRpm: 3000,
      },
    ];
  },
  getCapabilities: () => {
    return [
      {
        id: 'cap_ai_generation',
        name: 'Multimodal Generative AI Copilot Ingestion',
        apiId: 'api_kitchen_orders',
        defaultProvider: 'gemini_flash',
      },
      {
        id: 'cap_pos_terminal',
        name: 'Hardware EMV / NFC Chip Reader Interface',
        apiId: 'api_pos_checkout',
        defaultProvider: 'stripe_terminal',
      },
      {
        id: 'cap_ehr_audit',
        name: 'Immutable Cryptographic Patient Record Audit',
        apiId: 'api_clinical_ehr',
        defaultProvider: 'merkle_vault',
      },
    ];
  },
  getAiModels: () => {
    return [
      { id: 'model_gemini_2_5_flash', name: 'Gemini 2.5 Flash Ultra-Low Latency', provider: 'google', contextWindow: 1000000 },
      { id: 'model_claude_3_7_sonnet', name: 'Claude 3.7 Sonnet Reasoning Engine', provider: 'anthropic', contextWindow: 200000 },
      { id: 'model_gpt_4o_mini', name: 'GPT-4o Mini Realtime Embedder', provider: 'openai', contextWindow: 128000 },
    ];
  },
  getMcpServers: () => {
    return [
      { id: 'mcp_server_postgres', name: 'Materialized Postgres Data Mesh MCP', nodeId: 'node_mumbai_01', transport: 'sse' },
      { id: 'mcp_server_hardware', name: 'IoT POS Hardware Adapter MCP', nodeId: 'node_singapore_01', transport: 'sse' },
    ];
  },
  getMcpTools: () => {
    return [
      { id: 'tool_query_order_status', name: 'Query Order Realtime Status', serverId: 'mcp_server_postgres', parameters: { orderId: 'string' }, description: 'Retrieves live status from distributed ledger' },
      { id: 'tool_print_kitchen_ticket', name: 'Print Kitchen Preparation Slip', serverId: 'mcp_server_hardware', parameters: { stationId: 'string', items: 'array' }, description: 'Thermal printer ESC/POS driver' },
    ];
  },
  getComputeNodes: () => {
    return [
      { id: 'node_mumbai_01', name: 'ap-south-1a (Compute 01)', region: 'ap-south-1', cpu: 32, memory: 128 },
      { id: 'node_singapore_01', name: 'ap-southeast-1a (Compute 01)', region: 'ap-southeast-1', cpu: 32, memory: 128 },
    ];
  },
  getDeployments: () => {
    return [
      { id: 'dep_gateway_prod', name: 'API Edge Gateway Mesh Deployment', serviceId: 'svc_gateway', nodeId: 'node_mumbai_01', version: '2.1.0', replicas: 4 },
      { id: 'dep_ordering_prod', name: 'Restaurant Order Engine Deployment', serviceId: 'svc_ordering', nodeId: 'node_mumbai_01', version: '2.2.0', replicas: 6 },
      { id: 'dep_kds_prod', name: 'Kitchen Display Service Deployment', serviceId: 'svc_kds', nodeId: 'node_singapore_01', version: '2.2.0', replicas: 2 },
    ];
  },
  getIncidents: () => {
    return [
      { id: 'inc_edge_latency_spike', name: 'Edge Route Latency Anomaly (ap-south-1)', affectedResourceId: 'node_mumbai_01', severity: 'SEV-3', status: 'ACTIVE' },
    ];
  },
  getWorkflows: () => {
    return [
      { id: 'wf_canary_deployment', name: 'Automated 10% Canary Progressive Rollout', trigger: 'RELEASE_PUBLISH' },
      { id: 'wf_disaster_recovery', name: 'Autonomous Inter-Region Compute Failover', trigger: 'HEALTH_CHECK_FAILURE' },
    ];
  },
};

// Singleton store on globalThis for development hot-reloading safety
const brainGlobal = globalThis as unknown as {
  resourceRegistry?: ResourceRegistry;
  resourceGraph?: ResourceGraphService;
  impactAnalysis?: ImpactAnalysisService;
  policyResolution?: PolicyResolutionService;
  commandBus?: CommandBusService;
  reconciliation?: ReconciliationService;
  pluginRegistry?: PluginRegistryService;
  planEntitlement?: PlanEntitlementService;
  changeSet?: ChangeSetService;
  blueprint?: BlueprintService;
  resourceEditor?: ResourceEditorService;
  projectionInitialized?: boolean;
};

// 1. Instantiate Core Registry & Graph
export const resourceRegistry = brainGlobal.resourceRegistry ?? new ResourceRegistry();
export const resourceGraph =
  brainGlobal.resourceGraph && typeof brainGlobal.resourceGraph.projectFromAuthoritativeSources === 'function'
    ? brainGlobal.resourceGraph
    : new ResourceGraphService();

// 2. Materialize authoritative projection immediately once
if (!brainGlobal.projectionInitialized) {
  if (typeof resourceGraph.projectFromAuthoritativeSources === 'function') {
    resourceGraph.projectFromAuthoritativeSources(platformRepoProvider).catch((err) => {
      console.error('[Control Plane] Initial projection failed:', err);
    });
  }
  brainGlobal.projectionInitialized = true;
}

// 3. Orchestration & Policy Engines
export const impactAnalysis = brainGlobal.impactAnalysis ?? new ImpactAnalysisService(resourceGraph);
export const policyResolution = brainGlobal.policyResolution ?? new PolicyResolutionService(resourceGraph);
export const commandBus = brainGlobal.commandBus ?? new CommandBusService(resourceGraph, impactAnalysis, auditService as any, approvalEngine as any);
export const reconciliation = brainGlobal.reconciliation ?? new ReconciliationService(resourceGraph, auditService as any);

// 4. v4.2 Universal Orchestration Engines
export const pluginRegistry = brainGlobal.pluginRegistry ?? new PluginRegistryService(resourceRegistry, resourceGraph);
export const planEntitlement = brainGlobal.planEntitlement ?? new PlanEntitlementService(resourceGraph, auditService as any);
export const changeSet = brainGlobal.changeSet ?? new ChangeSetService(resourceGraph, commandBus);
export const blueprint = brainGlobal.blueprint ?? new BlueprintService(resourceGraph);
export const resourceEditor = brainGlobal.resourceEditor ?? new ResourceEditorService(
  resourceGraph,
  resourceRegistry,
  impactAnalysis,
  commandBus,
  reconciliation,
  planEntitlement,
  policyResolution
);

// Cache on globalThis in non-production
if (process.env.NODE_ENV !== 'production') {
  brainGlobal.resourceRegistry = resourceRegistry;
  brainGlobal.resourceGraph = resourceGraph;
  brainGlobal.impactAnalysis = impactAnalysis;
  brainGlobal.policyResolution = policyResolution;
  brainGlobal.commandBus = commandBus;
  brainGlobal.reconciliation = reconciliation;
  brainGlobal.pluginRegistry = pluginRegistry;
  brainGlobal.planEntitlement = planEntitlement;
  brainGlobal.changeSet = changeSet;
  brainGlobal.blueprint = blueprint;
  brainGlobal.resourceEditor = resourceEditor;
}

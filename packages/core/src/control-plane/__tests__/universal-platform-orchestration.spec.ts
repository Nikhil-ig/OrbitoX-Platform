import { ResourceGraphService } from '../resource-graph.service';
import { ResourceRegistry } from '../resource-registry.service';
import { ImpactAnalysisService } from '../impact-analysis.service';
import { CommandBusService, CommandAuditService, CommandApprovalEngine } from '../command-bus.service';
import { AuthoritativeResourceProvider } from '../types';

describe('🪐 OrbitoX Control Plane Brain v4.2 - Universal Platform Orchestration Spec', () => {
  let graph: ResourceGraphService;
  let registry: ResourceRegistry;
  let impact: ImpactAnalysisService;
  let commandBus: CommandBusService;
  let auditLogs: any[] = [];
  let approvals: any[] = [];

  const mockAuditService: CommandAuditService = {
    log: (record, contextId) => {
      auditLogs.push({ record, contextId, timestamp: new Date().toISOString() });
    },
  };

  const mockApprovalEngine: CommandApprovalEngine = {
    requestApproval: async (params) => {
      const appr = { id: `appr_${Date.now()}`, ...params, status: 'PENDING' };
      approvals.push(appr);
      return appr;
    },
  };

  const universalMockProvider: AuthoritativeResourceProvider = {
    getOrganizations: () => [
      { id: 'org_omni_corp', name: 'OmniCorp Global Holdings', slug: 'omnicorp', complianceTier: 'SOC2_TYPE2' },
    ],
    getPlans: () => [
      { id: 'plan_enterprise_mesh', name: 'Enterprise Mesh', price: 4999, features: ['custom_domains', 'ai_mcp', 'dedicated_vpc'], limits: { maxEnvs: 20, maxPackages: 40 } },
    ],
    getProjects: () => [
      { id: 'proj_logistics_os', name: 'Global Logistics OS', organizationId: 'org_omni_corp', planTier: 'enterprise', status: 'ACTIVE' },
    ],
    getEnvironments: () => [
      { id: 'env_logistics_prod', name: 'Logistics Production', projectId: 'proj_logistics_os', isProduction: true, status: 'ACTIVE' },
    ],
    getTenants: () => [
      { tenantId: 'tenant_asia_express', name: 'Asia Express Cargo', environmentId: 'env_logistics_prod', tier: 'enterprise', domain: 'asia.express.io', status: 'ACTIVE' },
    ],
    getCompanies: () => [
      { id: 'comp_asia_freight_ltd', name: 'Asia Freight Operating Ltd', tenantId: 'tenant_asia_express', legalName: 'Asia Freight Pte Ltd', status: 'ACTIVE' },
    ],
    getBranches: () => [
      { id: 'branch_singapore_port', name: 'Singapore Port Terminal Hub', companyId: 'comp_asia_freight_ltd', location: 'Singapore Port Berth 4', status: 'ACTIVE' },
    ],
    getSubscriptions: () => [
      { id: 'sub_enterprise_001', name: 'Enterprise Mesh Active Sub', planId: 'plan_enterprise_mesh', projectId: 'proj_logistics_os', status: 'active' },
    ],
    getPackageCatalogs: () => [],
    getPackages: () => [
      { packageId: '@orbitox/telematics', name: 'OrbitoX Fleet Telematics Core', category: 'IOT', version: '2.4.0' },
    ],
    getPackageInstallations: () => [
      { id: 'inst_telem_prod', environmentId: 'env_logistics_prod', packageId: '@orbitox/telematics', installedVersionId: '2.4.0' },
    ],
    getApis: () => [
      { id: 'api_telematics_stream', name: 'Fleet Telematics Realtime Stream API', packageId: '@orbitox/telematics', version: 'v2', rateLimitRpm: 12000 },
    ],
    getCapabilities: () => [
      { id: 'cap_iot_telemetry', name: 'IoT Stream Telemetry Ingestion', apiId: 'api_telematics_stream', defaultProvider: 'nats_streaming' },
    ],
    getFeatureFlags: () => [
      { id: 'flag_predictive_routing', name: 'Predictive AI Route Optimization', environmentId: 'env_logistics_prod', enabled: true, overrides: [] },
    ],
    getApiKeys: () => [
      {
        id: 'key_fleet_gateway_live',
        name: 'Fleet Gateway Edge Token',
        projectId: 'proj_logistics_os',
        environmentId: 'env_logistics_prod',
        status: 'ACTIVE',
        capabilities: ['cap_iot_telemetry', 'telematics:ingest'],
      },
    ],
    getCredentials: () => [
      { id: 'cred_nats_tls_key', name: 'NATS Cluster mTLS Certificate', environmentId: 'env_logistics_prod', provider: 'vault', health: 'HEALTHY' },
    ],
    getDomains: () => [
      { id: 'dom_telematics_io', domainName: 'telematics.express.io', environmentId: 'env_logistics_prod', verificationStatus: 'VERIFIED' },
    ],
    getComputeNodes: () => [
      { id: 'node_sg_edge_01', name: 'Singapore Edge Compute 01', region: 'ap-southeast-1', cpu: 32, memory: 128 },
    ],
    getDeployments: () => [
      { id: 'dep_telematics_worker', name: 'Telematics Stream Ingestion Deployment', serviceId: 'svc_telematics_worker', nodeId: 'node_sg_edge_01', version: '2.4.0', replicas: 4 },
    ],
    getAiModels: () => [
      { id: 'model_route_optimizer', name: 'Gemini 2.5 Flash Route Engine', provider: 'google', contextWindow: 1000000 },
    ],
    getMcpServers: () => [
      { id: 'mcp_logistics_dispatch', name: 'Logistics Fleet Dispatch MCP Server', nodeId: 'node_sg_edge_01', transport: 'sse' },
    ],
    getMcpTools: () => [
      { id: 'tool_reroute_vessel', name: 'Reroute Cargo Vessel', serverId: 'mcp_logistics_dispatch', parameters: { vesselId: 'string', waypoint: 'string' } },
    ],
    getIncidents: () => [
      { id: 'inc_strait_congestion', name: 'Malacca Strait Traffic Delay Incident', affectedResourceId: 'node_sg_edge_01', severity: 'SEV-3', status: 'ACTIVE' },
    ],
    getWorkflows: () => [
      { id: 'wf_vessel_reconciliation', name: 'Autonomous Vessel Telemetry Reconciliation', trigger: 'STREAM_EVENT' },
    ],
  };

  beforeEach(async () => {
    auditLogs = [];
    approvals = [];
    registry = new ResourceRegistry();
    graph = new ResourceGraphService();
    await graph.projectFromAuthoritativeSources(universalMockProvider);
    impact = new ImpactAnalysisService(graph);
    commandBus = new CommandBusService(graph, impact, mockAuditService, mockApprovalEngine);
  });

  describe('1. Universal Resource Projection & Graph Completeness', () => {
    it('should project nodes across all 25+ platform domains with status GRAPH_READY', () => {
      const report = graph.verifyGraphIntegrity();
      expect(report.isConsistent).toBe(true);
      expect(report.status).toBe('GRAPH_READY');
      expect(report.cycles.length).toBe(0);
      expect(report.missingNodes.length).toBe(0);

      // Verify representations exist across the spectrum
      expect(graph.getNode('org_omni_corp')?.resourceType).toBe('ORGANIZATION');
      expect(graph.getNode('proj_logistics_os')?.resourceType).toBe('PROJECT');
      expect(graph.getNode('env_logistics_prod')?.resourceType).toBe('ENVIRONMENT');
      expect(graph.getNode('tenant_asia_express')?.resourceType).toBe('TENANT');
      expect(graph.getNode('comp_asia_freight_ltd')?.resourceType).toBe('COMPANY');
      expect(graph.getNode('branch_singapore_port')?.resourceType).toBe('BRANCH');
      expect(graph.getNode('plan_enterprise_mesh')?.resourceType).toBe('PLAN');
      expect(graph.getNode('sub_enterprise_001')?.resourceType).toBe('SUBSCRIPTION');
      expect(graph.getNode('@orbitox/telematics')?.resourceType).toBe('PACKAGE');
      expect(graph.getNode('api_telematics_stream')?.resourceType).toBe('API');
      expect(graph.getNode('cap_iot_telemetry')?.resourceType).toBe('API_CAPABILITY');
      expect(graph.getNode('flag_predictive_routing')?.resourceType).toBe('FEATURE_FLAG');
      expect(graph.getNode('key_fleet_gateway_live')?.resourceType).toBe('API_KEY');
      expect(graph.getNode('cred_nats_tls_key')?.resourceType).toBe('CREDENTIAL');
      expect(graph.getNode('dom_telematics_io')?.resourceType).toBe('DOMAIN');
      expect(graph.getNode('node_sg_edge_01')?.resourceType).toBe('SERVER_NODE');
      expect(graph.getNode('dep_telematics_worker')?.resourceType).toBe('SERVICE_DEPLOYMENT');
      expect(graph.getNode('model_route_optimizer')?.resourceType).toBe('AI_MODEL');
      expect(graph.getNode('mcp_logistics_dispatch')?.resourceType).toBe('MCP_SERVER');
      expect(graph.getNode('tool_reroute_vessel')?.resourceType).toBe('MCP_TOOL');
      expect(graph.getNode('inc_strait_congestion')?.resourceType).toBe('INCIDENT');
      expect(graph.getNode('wf_vessel_reconciliation')?.resourceType).toBe('WORKFLOW');
    });

    it('should correctly traverse multi-tier hierarchical relationships (Tenant -> Company -> Branch)', () => {
      const tenantDeps = graph.getDependencies('tenant_asia_express');
      expect(tenantDeps.some((d) => d.resourceId === 'comp_asia_freight_ltd')).toBe(true);

      const compDeps = graph.getDependencies('comp_asia_freight_ltd');
      expect(compDeps.some((d) => d.resourceId === 'branch_singapore_port')).toBe(true);

      const branchParents = graph.getDependents('branch_singapore_port');
      expect(branchParents.some((p) => p.resourceId === 'comp_asia_freight_ltd')).toBe(true);
    });

    it('should correctly link MCP Servers to Tools and Services to Nodes', () => {
      const mcpTools = graph.getDependencies('mcp_logistics_dispatch');
      expect(mcpTools.some((t) => t.resourceId === 'tool_reroute_vessel')).toBe(true);

      const nodeDependents = graph.getDependents('node_sg_edge_01');
      expect(nodeDependents.some((d) => d.resourceId === 'dep_telematics_worker')).toBe(true);
    });
  });

  describe('2. Universal Command Bus Operational Handlers', () => {
    it('should execute tenant.create and link to environment within graph', async () => {
      const res = await commandBus.executeCommand({
        commandId: 'cmd_ten_01',
        correlationId: 'corr_ten_01',
        idempotencyKey: 'idem_ten_01',
        actor: { userId: 'admin_usr', role: 'PLATFORM_SUPERADMIN', ipAddress: '10.0.0.1' },
        resourceType: 'TENANT',
        resourceId: 'tenant_europe_rail',
        operation: 'tenant.create',
        desiredPayload: {
          name: 'Europe Rail Freight',
          environmentId: 'env_logistics_prod',
          tier: 'enterprise',
          subdomain: 'europe-rail',
        },
        expectedVersion: 0,
      });

      expect(res.success).toBe(true);
      expect((res.data as any).created).toBe(true);

      const newNode = graph.getNode('tenant_europe_rail');
      expect(newNode).toBeDefined();
      expect(newNode?.name).toBe('Europe Rail Freight');
      expect(newNode?.lifecycleStatus).toBe('ACTIVE');

      // Check environment contains edge
      const envDeps = graph.getDependencies('env_logistics_prod');
      expect(envDeps.some((d) => d.resourceId === 'tenant_europe_rail')).toBe(true);
    });

    it('should gate tenant.suspend behind Four-Eyes approval quorum', async () => {
      const res = await commandBus.executeCommand({
        commandId: 'cmd_ten_susp_01',
        correlationId: 'corr_ten_susp_01',
        idempotencyKey: 'idem_ten_susp_01',
        actor: { userId: 'sre_usr', role: 'PLATFORM_ADMIN', ipAddress: '10.0.0.1' },
        resourceType: 'TENANT',
        resourceId: 'tenant_asia_express',
        operation: 'tenant.suspend',
        desiredPayload: { reason: 'Regulatory compliance investigation' },
        expectedVersion: 1,
      });

      // Suspensions affecting production tenants require Four-Eyes approval
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('APPROVAL_REQUIRED');
      expect(approvals.length).toBeGreaterThan(0);
    });

    it('should toggle feature flag dynamically and persist state', async () => {
      const res = await commandBus.executeCommand({
        commandId: 'cmd_flag_01',
        correlationId: 'corr_flag_01',
        idempotencyKey: 'idem_flag_01',
        actor: { userId: 'rel_mgr', role: 'RELEASE_MANAGER', ipAddress: '10.0.0.1' },
        resourceType: 'FEATURE_FLAG',
        resourceId: 'flag_predictive_routing',
        operation: 'feature_flag.toggle',
        desiredPayload: { enabled: false },
        expectedVersion: 1,
      });

      expect(res.success).toBe(true);
      expect((res.data as any).enabled).toBe(false);

      const flagNode = graph.getNode('flag_predictive_routing');
      expect((flagNode?.desiredState as any).enabled).toBe(false);
    });

    it('should invoke MCP Tool through Command Bus with audit capture', async () => {
      const res = await commandBus.executeCommand({
        commandId: 'cmd_mcp_01',
        correlationId: 'corr_mcp_01',
        idempotencyKey: 'idem_mcp_01',
        actor: { userId: 'ai_agent_dispatcher', role: 'AI_AGENT', ipAddress: '127.0.0.1' },
        resourceType: 'MCP_TOOL',
        resourceId: 'tool_reroute_vessel',
        operation: 'mcp_tool.invoke',
        desiredPayload: { parameters: { vesselId: 'VSL-789', waypoint: 'PORT_KL' } },
        expectedVersion: 1,
      });

      expect(res.success).toBe(true);
      expect((res.data as any).invoked).toBe(true);
      expect((res.data as any).toolName).toBe('Reroute Cargo Vessel');
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].record.action).toBe('mcp_tool.invoke');
    });

    it('should execute service deployment and report execution plan', async () => {
      const res = await commandBus.executeCommand({
        commandId: 'cmd_dep_01',
        correlationId: 'corr_dep_01',
        idempotencyKey: 'idem_dep_01',
        actor: { userId: 'cicd_bot', role: 'SRE', ipAddress: '10.0.0.1' },
        resourceType: 'SERVICE_DEPLOYMENT',
        resourceId: 'dep_telematics_worker',
        operation: 'service.deploy',
        desiredPayload: { version: '2.5.0-rc1', replicas: 8 },
        expectedVersion: 1,
      });

      expect(res.success).toBe(true);
      expect((res.data as any).deployed).toBe(true);
      expect((res.data as any).version).toBe('2.5.0-rc1');
      expect(res.executionPlan.length).toBe(7);
    });
  });

  describe('3. Unified Platform Search & Discovery', () => {
    it('should search across disparate domains (Tenants, MCP, Tools, Flags, Subscriptions)', () => {
      const cargoMatches = graph.searchResources('cargo');
      expect(cargoMatches.some((m) => m.resourceId === 'tenant_asia_express')).toBe(true);
      expect(cargoMatches.some((m) => m.resourceId === 'tool_reroute_vessel')).toBe(true);

      const mcpMatches = graph.searchResources('dispatch', { type: 'MCP_SERVER' });
      expect(mcpMatches.length).toBe(1);
      expect(mcpMatches[0].resourceId).toBe('mcp_logistics_dispatch');

      const flagMatches = graph.searchResources('predictive', { type: 'FEATURE_FLAG' });
      expect(flagMatches.length).toBe(1);
      expect(flagMatches[0].resourceId).toBe('flag_predictive_routing');
    });
  });
});

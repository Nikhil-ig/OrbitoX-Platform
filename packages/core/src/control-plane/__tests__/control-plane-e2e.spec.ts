import { ResourceGraphService } from '../resource-graph.service';
import { ResourceRegistry } from '../resource-registry.service';
import { ImpactAnalysisService } from '../impact-analysis.service';
import { PolicyResolutionService } from '../policy-resolution.service';
import { CommandBusService, CommandAuditService, CommandApprovalEngine } from '../command-bus.service';
import { ReconciliationService } from '../reconciliation.service';
import { PluginRegistryService } from '../plugin-registry.service';
import { PlanEntitlementService } from '../plan-entitlement.service';
import { ChangeSetService } from '../changeset.service';
import { BlueprintService } from '../blueprint.service';
import {
  AuthoritativeResourceProvider,
  PackageManifestContract,
  PlatformCanonicalEvent,
  PlatformCommand,
} from '../types';

describe('🪐 OrbitoX Control Plane Brain v4.2 - Master End-to-End Orchestration Suite', () => {
  let graph: ResourceGraphService;
  let registry: ResourceRegistry;
  let impact: ImpactAnalysisService;
  let policy: PolicyResolutionService;
  let commandBus: CommandBusService;
  let reconciler: ReconciliationService;
  let pluginRegistry: PluginRegistryService;
  let planEntitlement: PlanEntitlementService;
  let changeSet: ChangeSetService;
  let blueprint: BlueprintService;

  const auditEvents: any[] = [];
  const approvalRequests: any[] = [];

  const mockAuditService: CommandAuditService = {
    log: (record, contextId) => {
      auditEvents.push({ record, contextId, timestamp: new Date().toISOString() });
    },
  };

  const mockApprovalEngine: CommandApprovalEngine = {
    requestApproval: async (params) => {
      const appr = { id: `appr_test_${Date.now()}`, ...params, status: 'PENDING' };
      approvalRequests.push(appr);
      return appr;
    },
  };

  const baseProvider: AuthoritativeResourceProvider = {
    getOrganizations: () => [
      { id: 'org_e2e_holdings', name: 'E2E Enterprise Holdings', slug: 'e2e-holdings', complianceTier: 'SOC2_TYPE2' },
    ],
    getPlans: () => [
      {
        id: 'plan_starter',
        name: 'Starter Tier',
        price: 99,
        features: ['basic_api'],
        limits: { maxEnvs: 1, maxPackages: 2, maxTenants: 1, monthlyApiQuota: 10000, rateLimitRpm: 600 },
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise Tier',
        price: 2499,
        features: ['custom_domains', 'ai_mcp', 'dedicated_vpc', 'kds_feature', 'multi_env'],
        limits: { maxEnvs: 10, maxPackages: 20, maxTenants: 50, monthlyApiQuota: 1000000, rateLimitRpm: 10000 },
      },
    ],
    getProjects: () => [
      { id: 'proj_e2e_master', name: 'E2E Master Commerce', organizationId: 'org_e2e_holdings', planTier: 'enterprise', status: 'ACTIVE' },
    ],
    getEnvironments: () => [
      { id: 'env_e2e_prod', name: 'Production', projectId: 'proj_e2e_master', isProduction: true, status: 'ACTIVE' },
      { id: 'env_e2e_stage', name: 'Staging', projectId: 'proj_e2e_master', isProduction: false, status: 'ACTIVE' },
    ],
    getPackages: () => [
      { packageId: '@orbitox/restaurant', name: 'Restaurant OS', category: 'RESTAURANT', version: '2.3.0' },
      { packageId: '@orbitox/pos', name: 'Point of Sale Engine', category: 'FINTECH', version: '1.4.0' },
    ],
    getComputeNodes: () => [
      { id: 'node_e2e_01', name: 'Compute Host 01', region: 'us-east-1', cpu: 64, memory: 256, capacity: { totalCpu: 64, usedCpu: 12 } },
    ],
  };

  beforeEach(async () => {
    auditEvents.length = 0;
    approvalRequests.length = 0;

    registry = new ResourceRegistry();
    graph = new ResourceGraphService();
    await graph.projectFromAuthoritativeSources(baseProvider);

    impact = new ImpactAnalysisService(graph);
    policy = new PolicyResolutionService(graph);
    commandBus = new CommandBusService(graph, impact, mockAuditService, mockApprovalEngine);
    reconciler = new ReconciliationService(graph, mockAuditService);
    pluginRegistry = new PluginRegistryService(registry, graph);
    planEntitlement = new PlanEntitlementService(graph, policy);
    changeSet = new ChangeSetService(graph, commandBus);
    blueprint = new BlueprintService(graph);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. "New Plugin Without Core-Code Changes" Test (Sections 6, 91, 92, 93)
  // ─────────────────────────────────────────────────────────────
  describe('🔌 Future Plugin Auto-Registration & Safe Lifecycle', () => {
    const testPluginManifest: PackageManifestContract = {
      id: '@orbitox/test-plugin',
      name: 'Dynamic Telemetry & Streaming Engine',
      version: '1.0.0',
      platformCompatibility: '>=4.0.0',
      dependencies: [{ packageId: '@orbitox/core', minVersion: '4.0.0' }],
      features: ['stream_analytics', 'realtime_events'],
      capabilities: [
        'telemetry.stream.read',
        'telemetry.stream.write',
        'telemetry.aggregates.export',
        'telemetry.config.admin',
        'telemetry.raw.inspect',
      ],
      services: [
        {
          id: 'svc_telemetry_stream',
          name: 'Telemetry Streaming Daemon',
          replicas: 2,
          apis: ['api_telemetry_events', 'api_telemetry_aggregates', 'api_telemetry_export'],
        },
      ],
      apis: [
        { id: 'api_telemetry_events', method: 'POST', path: '/api/v1/telemetry/events', capability: 'telemetry.stream.write' },
        { id: 'api_telemetry_aggregates', method: 'GET', path: '/api/v1/telemetry/aggregates', capability: 'telemetry.stream.read' },
        { id: 'api_telemetry_export', method: 'POST', path: '/api/v1/telemetry/export', capability: 'telemetry.aggregates.export' },
      ],
      configurationSchema: {
        retentionDays: { type: 'number', default: 30 },
        streamBufferSize: { type: 'number', default: 10000 },
      },
      healthChecks: [{ id: 'health_telemetry_ping', path: '/health/telemetry', intervalSeconds: 15 }],
      tests: ['unit_stream_ingest', 'load_buffer_capacity'],
    };

    it('should dynamically discover, register, and materialize all components without core code modifications', async () => {
      // 1. Initial graph check - test plugin must not exist
      expect(graph.getNode('@orbitox/test-plugin')).toBeUndefined();
      expect(graph.getNode('svc_telemetry_stream')).toBeUndefined();
      expect(graph.getNode('api_telemetry_events')).toBeUndefined();

      // 2. Register plugin manifest
      const reg = await pluginRegistry.registerPlugin(testPluginManifest);
      expect(reg.pluginId).toBe('@orbitox/test-plugin');
      expect(reg.servicesCount).toBe(1);
      expect(reg.apisCount).toBe(3);
      expect(reg.capabilitiesCount).toBe(5);

      // 3. Verify graph now understands the plugin ecosystem dynamically
      const pkgNode = graph.getNode('@orbitox/test-plugin');
      expect(pkgNode).toBeDefined();
      expect(pkgNode?.resourceType).toBe('PACKAGE');

      const svcNode = graph.getNode('svc_telemetry_stream');
      expect(svcNode).toBeDefined();
      expect(svcNode?.resourceType).toBe('SERVICE');

      const apiNode = graph.getNode('api_telemetry_events');
      expect(apiNode).toBeDefined();
      expect(apiNode?.resourceType).toBe('API');

      // 4. Verify graph edges connect Service -> Package and Service -> API
      const outDeps = graph.getDependencies('svc_telemetry_stream');
      const pkgDep = outDeps.find((n) => n.resourceId === '@orbitox/test-plugin');
      expect(pkgDep).toBeDefined();

      const apiDep = outDeps.find((n) => n.resourceId === 'api_telemetry_events');
      expect(apiDep).toBeDefined();

      // 5. Verify graph verification passes with 0 cycle or orphan issues
      const report = graph.verifyGraphIntegrity();
      expect(report.isConsistent).toBe(true);
      expect(report.cycles.length).toBe(0);
      expect(report.orphanEdges.length).toBe(0);
    });

    it('should detect orphans and cleanly purge registered plugin resources on uninstallation', async () => {
      // Register plugin first
      await pluginRegistry.registerPlugin(testPluginManifest);

      // Detect potential orphans before uninstall
      const orphans = pluginRegistry.detectOrphans('@orbitox/test-plugin');
      expect(orphans.orphanServices).toContain('svc_telemetry_stream');
      expect(orphans.orphanApis.length).toBe(3);
      expect(orphans.orphanCapabilities.length).toBe(5);

      // Uninstall plugin
      const result = await pluginRegistry.uninstallPlugin('@orbitox/test-plugin');
      expect(result.success).toBe(true);
      expect(result.prunedNodesCount).toBeGreaterThanOrEqual(9);

      // Verify all components were removed from graph
      expect(graph.getNode('@orbitox/test-plugin')).toBeUndefined();
      expect(graph.getNode('svc_telemetry_stream')).toBeUndefined();
      expect(graph.getNode('api_telemetry_events')).toBeUndefined();
      expect(graph.getNode('cap_telemetry.stream.read')).toBeUndefined();

      // Graph remains strictly consistent
      const report = graph.verifyGraphIntegrity();
      expect(report.isConsistent).toBe(true);
      expect(report.orphanEdges.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Full Platform Lifecycle Orchestration E2E (Section 80)
  // ─────────────────────────────────────────────────────────────
  describe('🔄 Full Platform Lifecycle Orchestration', () => {
    it('should orchestrate complete project lifecycle from blueprinting through deployment and audit', async () => {
      // 1. Organization & Project Baseline verification
      const org = graph.getNode('org_e2e_holdings');
      expect(org).toBeDefined();
      const proj = graph.getNode('proj_e2e_master');
      expect(proj).toBeDefined();

      // 2. Create Project Blueprint
      blueprint.registerBlueprint({
        id: 'bp_omnichannel_retail',
        name: 'Omnichannel Retail Template',
        organizationId: 'org_e2e_holdings',
        planTier: 'enterprise',
        environments: [
          { slug: 'production', isProduction: true, requireMtls: true },
          { slug: 'staging', isProduction: false },
        ],
        packages: ['@orbitox/restaurant', '@orbitox/pos'],
        features: ['custom_domains', 'kds_feature'],
        services: ['svc_ordering'],
      });

      const bp = blueprint.getBlueprint('bp_omnichannel_retail');
      expect(bp).toBeDefined();
      expect(bp?.packages).toContain('@orbitox/pos');

      // 3. Attach Plan and evaluate Entitlements
      const effectivePlan = planEntitlement.getEffectivePlan('proj_e2e_master');
      expect(effectivePlan.planTier || effectivePlan.planName).toBeDefined();

      const packageEntitled = planEntitlement.isProjectEntitledToPackage('proj_e2e_master', '@orbitox/restaurant');
      expect(packageEntitled.entitled).toBe(true);
      expect(packageEntitled.explanation).toContain('explicitly included');

      // 4. Execute Multi-step ChangeSet (Topologically ordered)
      const changePlan = changeSet.createChangeSetPlan(
        'Deploy Restaurant Edge Mesh',
        'Provision service and register routes',
        [
          {
            id: 'step_dep',
            order: 2,
            targetId: 'dep_e2e_ordering',
            targetType: 'DEPLOYMENT',
            action: 'service.deploy',
            payload: { serviceId: 'svc_ordering', environmentId: 'env_e2e_prod', version: '2.3.0', replicas: 2 },
          },
          {
            id: 'step_svc',
            order: 1,
            targetId: 'svc_ordering',
            targetType: 'SERVICE',
            action: 'service.scale',
            payload: { replicas: 3 },
          },
        ]
      );

      // Verify topological sorting ordered step_svc before step_dep
      expect(changePlan.steps[0].id).toBe('step_svc');
      expect(changePlan.steps[1].id).toBe('step_dep');

      // Execute ChangeSet
      const execution = await changeSet.executeChangeSet(changePlan, { actor: 'lead_devops', dryRun: false });
      expect(execution.status).toBe('COMPLETED');
      expect(execution.completedSteps.length).toBe(2);

      // 5. Domain creation and reconciliation
      graph.registerNode({
        resourceId: 'dom_order_e2e',
        resourceType: 'CUSTOM_DOMAIN',
        name: 'order.e2e-retail.com',
        resourceVersion: 1,
        owner: 'net_engineer',
        organizationId: 'org_e2e_holdings',
        environmentId: 'env_e2e_prod',
        desiredState: { cname: 'cname.orbitox.io', tlsStatus: 'ACTIVE', status: 'ACTIVE' },
        observedState: { cname: 'cname.orbitox.io', tlsStatus: 'PENDING_DNS', status: 'PENDING' },
        driftState: 'DRIFTED',
        lifecycleStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Detect drift
      const drifted = reconciler.detectDrift('dom_order_e2e');
      expect(drifted.hasDrift).toBe(true);
      expect(drifted.driftFields).toContain('tlsStatus');

      // Reconcile safely
      const recResult = await reconciler.reconcileResource('dom_order_e2e', 'SAFE');
      expect(recResult.status).toBe('RECONCILED');

      const resolvedNode = graph.getNode('dom_order_e2e');
      expect(resolvedNode?.driftState).toBe('IN_SYNC');

      // 6. Audit Trail Verification
      expect(auditEvents.length).toBeGreaterThan(0);
      const lastAudit = auditEvents[auditEvents.length - 1];
      expect(lastAudit.record).toBeDefined();

      // 7. Graph Integrity Check
      const report = graph.verifyGraphIntegrity();
      expect(report.isConsistent).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Negative E2E Security & Governance Gates (Section 81)
  // ─────────────────────────────────────────────────────────────
  describe('🛑 Negative E2E Security & Policy Gate Tests', () => {
    it('should BLOCK unentitled packages for project plan', () => {
      // Create a restricted project on starter plan
      graph.registerNode({
        resourceId: 'proj_starter_trial',
        resourceType: 'PROJECT',
        name: 'Starter Trial Co',
        resourceVersion: 1,
        owner: 'user_trial',
        organizationId: 'org_e2e_holdings',
        desiredState: { planTier: 'plan_starter' },
        driftState: 'IN_SYNC',
        lifecycleStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const verdict = planEntitlement.isProjectEntitledToPackage('proj_starter_trial', '@orbitox/restaurant');
      expect(verdict.entitled).toBe(false);
      expect(verdict.rule).toBe('PLAN_PACKAGE_INCLUSION');
      expect(verdict.explanation).toContain('NOT in plan packages');
    });

    it('should BLOCK revoked API key actions', async () => {
      // Register a revoked API key
      graph.registerNode({
        resourceId: 'key_compromised_01',
        resourceType: 'API_KEY',
        name: 'Compromised POS Key',
        resourceVersion: 1,
        owner: 'security_secops',
        organizationId: 'org_e2e_holdings',
        environmentId: 'env_e2e_prod',
        desiredState: { status: 'REVOKED' },
        observedState: { status: 'REVOKED' },
        driftState: 'IN_SYNC',
        lifecycleStatus: 'RETIRED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cmd: PlatformCommand = {
        commandId: 'cmd_invoke_revoked_key',
        actor: 'attacker',
        resourceType: 'API_KEY',
        resourceId: 'key_compromised_01',
        operation: 'key.invoke',
        desiredPayload: {},
      };

      const result = await commandBus.executeCommand(cmd);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('REVOKED');
    });

    it('should BLOCK plan downgrade when resource counts exceed lower tier limits', () => {
      const preflight = planEntitlement.calculatePlanChangeImpact('proj_e2e_master', 'plan_starter');
      expect(preflight.allowed).toBe(false);
      expect(preflight.blockers.length).toBeGreaterThan(0);
      expect(preflight.blockers[0]).toContain('Active environment count');
    });

    it('should BLOCK cyclic package dependencies', () => {
      const cyclicEdge = () => {
        graph.addEdge({
          id: 'edge_cycle_test',
          sourceId: 'proj_e2e_master',
          sourceType: 'PROJECT',
          targetId: 'org_e2e_holdings',
          targetType: 'ORGANIZATION',
          edgeType: 'CONTAINS',
        });
      };
      expect(cyclicEdge).toThrow(/CYCLIC_DEPENDENCY_DETECTED/);
    });

    it('should BLOCK high-risk production actions without Four-Eyes Approval', async () => {
      const dropProdCmd: PlatformCommand = {
        commandId: 'cmd_drop_prod_env',
        actor: 'junior_dev',
        resourceType: 'ENVIRONMENT',
        resourceId: 'env_e2e_prod',
        operation: 'environment.deprovision',
        desiredPayload: { force: true },
      };

      const result = await commandBus.executeCommand(dropProdCmd);
      expect(result.success).toBe(false);
      expect(result.status).toBe('APPROVAL_PENDING');
      expect(approvalRequests.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Concurrency & Idempotency Tests (Section 82)
  // ─────────────────────────────────────────────────────────────
  describe('⚡ Concurrency & Idempotency Invariants', () => {
    it('should ensure duplicate command dispatches with identical idempotency key are deduplicated', async () => {
      const cmd: PlatformCommand = {
        commandId: 'cmd_scale_replica_01',
        idempotencyKey: 'idem_key_fixed_123',
        actor: 'autoscaler',
        resourceType: 'SERVICE',
        resourceId: 'svc_ordering',
        operation: 'service.scale',
        desiredPayload: { replicas: 5 },
      };

      // Dispatch two concurrent identical commands
      const [res1, res2] = await Promise.all([
        commandBus.executeCommand(cmd),
        commandBus.executeCommand(cmd),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res1.commandId).toBe(res2.commandId);
      expect(res1.executionPlan.executionId).toBe(res2.executionPlan.executionId);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Incremental Event Ingestion, Replay & Restart Consistency (Sections 43, 76, 77)
  // ─────────────────────────────────────────────────────────────
  describe('🔁 Incremental Event Ingestion & Replay Verification', () => {
    it('should update graph incrementally and produce identical state upon clean replay', async () => {
      const initialMeta = graph.getMetadata();

      const events: PlatformCanonicalEvent[] = [
        {
          eventId: 'ev_01',
          eventType: 'project.created',
          resourceType: 'PROJECT',
          resourceId: 'proj_event_stream_01',
          sequence: 1,
          payload: { name: 'Streamed Event Project', organizationId: 'org_e2e_holdings' },
          timestamp: new Date().toISOString(),
        },
        {
          eventId: 'ev_02',
          eventType: 'environment.created',
          resourceType: 'ENVIRONMENT',
          resourceId: 'env_event_stream_prod',
          sequence: 2,
          payload: { name: 'Streamed Production', projectId: 'proj_event_stream_01' },
          timestamp: new Date().toISOString(),
        },
        {
          eventId: 'ev_03',
          eventType: 'domain.drifted',
          resourceType: 'CUSTOM_DOMAIN',
          resourceId: 'dom_stream_01',
          sequence: 3,
          payload: { name: 'stream.orbitox.io', driftDetails: { cname: 'mismatch' } },
          timestamp: new Date().toISOString(),
        },
        {
          eventId: 'ev_04',
          eventType: 'domain.reconciled',
          resourceType: 'CUSTOM_DOMAIN',
          resourceId: 'dom_stream_01',
          sequence: 4,
          payload: { observedState: { cname: 'stream.orbitox.io' } },
          timestamp: new Date().toISOString(),
        },
      ];

      const baseCount = graph.getMetadata().nodeCount;

      // Ingest incrementally
      for (const ev of events) {
        graph.applyIncrementalEvent(ev);
      }

      const projectedNode = graph.getNode('proj_event_stream_01');
      expect(projectedNode).toBeDefined();
      expect(projectedNode?.name).toBe('Streamed Event Project');

      const reconciledDom = graph.getNode('dom_stream_01');
      expect(reconciledDom?.driftState).toBe('IN_SYNC');
      expect(graph.getMetadata().nodeCount).toBe(baseCount + 3);

      // ── Event Replay Test: Clear graph, replay events, verify state matches exactly ──
      graph.clearGraph();
      expect(graph.getMetadata().nodeCount).toBe(0);

      // Replay canonical event stream from scratch onto empty graph
      const replayReport = await graph.replayEvents(events);

      expect(replayReport.isConsistent).toBe(true);
      expect(graph.getMetadata().nodeCount).toBe(3);
      expect(graph.getNode('proj_event_stream_01')).toBeDefined();
      expect(graph.getNode('dom_stream_01')?.driftState).toBe('IN_SYNC');
    });
  });
});

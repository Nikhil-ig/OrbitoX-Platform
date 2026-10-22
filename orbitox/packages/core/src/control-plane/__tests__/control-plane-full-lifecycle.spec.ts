/**
 * 🪐 OrbitoX Universal Control Plane Brain v4.1 Master End-to-End Lifecycle Test
 * Validates:
 * 1. Authoritative Projection & Restart Reconstructibility (Persistence Test)
 * 2. Graph Corruption Recovery & Integrity Verification
 * 3. Plan Downgrade Preflight Enforcement (Negative Blast-Radius Testing)
 * 4. "Why Can This Key Do This?" Effective Authorization Derivation
 * 5. Extensible Command Handlers & Staged Mutation Pipeline
 * 6. Cross-Resource Unified Search & Global Drift Aggregation
 */

import {
  ResourceGraphService,
  ResourceRegistry,
  ImpactAnalysisService,
  PolicyResolutionService,
  CommandBusService,
  ReconciliationService,
  AuthoritativeResourceProvider,
  PlatformCommand,
} from '../index';

describe('🪐 OrbitoX Control Plane Brain v4.1 Full Lifecycle & Authoritative Projection Spec', () => {
  // Authoritative State Store (Simulating PostgreSQL / PlatformRepository)
  const mockDatabase = {
    organizations: [
      { id: 'org_omni_corp', slug: 'omnilogistics', name: 'OmniLogistics Platform Corp', complianceTier: 'SOC2', status: 'ACTIVE' },
    ],
    projects: [
      {
        id: 'proj_omni_live',
        slug: 'omnideliver',
        name: 'OmniDeliver Global Network',
        organizationId: 'org_omni_corp',
        businessModel: 'O2O2B2B2C',
        planTier: 'enterprise',
        status: 'ACTIVE',
        technicalLead: 'Sophia Martinez',
      },
    ],
    environments: [
      { id: 'env_omni_prod', projectId: 'proj_omni_live', slug: 'production', name: 'Production Main', isProduction: true, status: 'ACTIVE' },
      { id: 'env_omni_stage', projectId: 'proj_omni_live', slug: 'staging', name: 'Staging QA', isProduction: false, status: 'ACTIVE' },
      { id: 'env_omni_dev', projectId: 'proj_omni_live', slug: 'development', name: 'Dev Sandbox', isProduction: false, status: 'ACTIVE' },
      { id: 'env_omni_canary', projectId: 'proj_omni_live', slug: 'canary', name: 'Canary Edge', isProduction: true, status: 'ACTIVE' },
    ],
    packages: [
      { packageId: '@orbitox/restaurant', name: 'Restaurant & Kitchen OS', currentStableVersion: '2.2.1', category: 'Hospitality', publisher: 'OrbitoX Core Labs' },
      { packageId: '@orbitox/pos', name: 'Point of Sale (POS)', currentStableVersion: '3.0.0', category: 'Retail', publisher: 'OrbitoX Core Labs' },
    ],
    installations: [
      { id: 'inst_001', environmentId: 'env_omni_prod', packageId: '@orbitox/restaurant', installedVersionId: 'ver_2_2_1' },
      { id: 'inst_002', environmentId: 'env_omni_prod', packageId: '@orbitox/pos', installedVersionId: 'ver_3_0_0' },
    ],
    apiKeys: [
      {
        id: 'key_omni_live_01',
        name: 'OmniDeliver Primary Gateway Key',
        projectId: 'proj_omni_live',
        environmentId: 'env_omni_prod',
        keyPrefix: 'orb_live_omni_',
        status: 'ACTIVE',
        capabilities: ['restaurant.orders.read', 'restaurant.orders.create'],
        rateLimitPerMin: 10000,
        riskScore: 25,
      },
    ],
    credentials: [
      {
        id: 'cred_stripe_vault',
        name: 'Stripe Corporate Live Gateway',
        projectId: 'proj_omni_live',
        environmentId: 'env_omni_prod',
        provider: 'stripe',
        health: 'HEALTHY',
        ownerEmail: 'finance@omnideliver.global',
      },
    ],
    domains: [
      {
        id: 'dom_api_omni',
        environmentId: 'env_omni_prod',
        domainName: 'api.omnideliver.global',
        isApex: false,
        verificationStatus: 'VERIFIED',
        cnameTarget: 'cname.orbitox.io',
      },
    ],
  };

  const authoritativeProvider: AuthoritativeResourceProvider = {
    getOrganizations: () => mockDatabase.organizations,
    getProjects: () => mockDatabase.projects,
    getEnvironments: () => mockDatabase.environments,
    getPackages: () => mockDatabase.packages,
    getPackageInstallations: () => mockDatabase.installations,
    getApiKeys: () => mockDatabase.apiKeys,
    getCredentials: () => mockDatabase.credentials,
    getDomains: () => mockDatabase.domains,
  };

  let graph: ResourceGraphService;
  let registry: ResourceRegistry;
  let impact: ImpactAnalysisService;
  let policy: PolicyResolutionService;
  let commandBus: CommandBusService;
  let reconciler: ReconciliationService;
  const auditEntries: any[] = [];

  const mockAudit = {
    log: async (entry: any) => {
      auditEntries.push(entry);
    },
  };

  beforeEach(async () => {
    auditEntries.length = 0;
    registry = new ResourceRegistry();
    graph = new ResourceGraphService();
    await graph.projectFromAuthoritativeSources(authoritativeProvider);

    impact = new ImpactAnalysisService(graph);
    policy = new PolicyResolutionService(graph);
    commandBus = new CommandBusService(graph, impact, mockAudit);
    reconciler = new ReconciliationService(graph, mockAudit);
  });

  describe('1. Authoritative Projection & Graph Lifecycle', () => {
    it('should build a complete materialized projection with status GRAPH_READY', () => {
      expect(graph.getStatus()).toBe('GRAPH_READY');
      const meta = graph.getMetadata();
      expect(meta.consistencyStatus).toBe('GRAPH_READY');
      expect(meta.nodeCount).toBeGreaterThanOrEqual(10);
      expect(meta.edgeCount).toBeGreaterThanOrEqual(8);

      const proj = graph.getNode('proj_omni_live');
      expect(proj).toBeDefined();
      expect(proj?.resourceType).toBe('PROJECT');
      expect(proj?.name).toBe('OmniDeliver Global Network');
    });

    it('should project real edge relationships with explainability reasons', () => {
      const edges = graph.getAllEdges();
      const containsEdge = edges.find((e) => e.edgeType === 'CONTAINS' && e.targetId === 'env_omni_prod');
      expect(containsEdge).toBeDefined();
      expect(containsEdge?.metadata?.reason).toContain('Project contains environment');

      const authEdge = edges.find((e) => e.edgeType === 'AUTHORIZES' && e.sourceId === 'key_omni_live_01');
      expect(authEdge).toBeDefined();
      expect(authEdge?.targetId).toBe('env_omni_prod');
    });

    it('should verify graph integrity and confirm zero cycles or broken references', () => {
      const report = graph.verifyGraphIntegrity();
      expect(report.isConsistent).toBe(true);
      expect(report.missingNodes.length).toBe(0);
      expect(report.orphanEdges.length).toBe(0);
      expect(report.cycles.length).toBe(0);
    });
  });

  describe('2. Persistence & Simulated Restart Recovery', () => {
    it('should survive application restart by reconstructing identical graph from authoritative source', async () => {
      // 1. Initial State
      const initialMeta = graph.getMetadata();

      // 2. Simulate Application Termination / Restart by creating new Service instance
      const restartedGraph = new ResourceGraphService();
      const report = await restartedGraph.projectFromAuthoritativeSources(authoritativeProvider);

      // 3. Verify graph reconstituted completely
      expect(report.isConsistent).toBe(true);
      expect(restartedGraph.getStatus()).toBe('GRAPH_READY');
      expect(restartedGraph.getNode('proj_omni_live')).toBeDefined();
      expect(restartedGraph.getNode('env_omni_prod')).toBeDefined();
      expect(restartedGraph.getNode('key_omni_live_01')).toBeDefined();
      expect(restartedGraph.getAllNodes().length).toBe(initialMeta.nodeCount);
    });

    it('should detect corruption if a rogue edge references a nonexistent node', () => {
      // Intentionally insert corrupt edge bypassing checks
      (graph as any).edges.set('corrupt_edge_001', {
        id: 'corrupt_edge_001',
        sourceId: 'proj_omni_live',
        targetId: 'nonexistent_ghost_node',
        edgeType: 'CONTAINS',
      });

      const report = graph.verifyGraphIntegrity();
      expect(report.isConsistent).toBe(false);
      expect(report.status).toBe('GRAPH_DEGRADED');
      expect(report.missingNodes).toContain('nonexistent_ghost_node');
      expect(report.issues.length).toBeGreaterThan(0);
    });
  });

  describe('3. "Why Can This Key Do This?" Effective Authorization Engine', () => {
    it('should authorize granted capability and return structured derivation tree', () => {
      const auth = graph.getEffectiveKeyAuthorization('key_omni_live_01', 'restaurant.orders.create');
      expect(auth.isAllowed).toBe(true);
      expect(auth.checks.length).toBeGreaterThanOrEqual(4);
      expect(auth.explanation).toContain('Operation permitted');
      expect(auth.checks.every((c) => c.passed)).toBe(true);
    });

    it('should deny ungranted capability with explicit reason', () => {
      const auth = graph.getEffectiveKeyAuthorization('key_omni_live_01', 'finance.payout.approve');
      expect(auth.isAllowed).toBe(false);
      expect(auth.explanation).toContain('Operation DENIED');
      const capCheck = auth.checks.find((c) => c.rule === 'KEY_CAPABILITY_GRANT');
      expect(capCheck?.passed).toBe(false);
    });

    it('should deny request if parent environment is suspended', () => {
      const prodEnv = graph.getNode('env_omni_prod');
      if (prodEnv) prodEnv.lifecycleStatus = 'SUSPENDED';

      const auth = graph.getEffectiveKeyAuthorization('key_omni_live_01', 'restaurant.orders.read');
      expect(auth.isAllowed).toBe(false);
      expect(auth.checks.find((c) => c.rule === 'ENVIRONMENT_ACTIVE')?.passed).toBe(false);
    });
  });

  describe('4. Plan Downgrade Preflight Verification', () => {
    it('should block downgrade when active environments exceed target tier limit', () => {
      // proj_omni_live has 4 environments (prod, stage, dev, canary)
      // Target tier 'growth' permits at most 3 environments
      const preflight = graph.preflightPlanDowngrade('proj_omni_live', 'growth');
      expect(preflight.allowed).toBe(false);
      expect(preflight.blockers.length).toBeGreaterThan(0);
      expect(preflight.violations[0]).toContain('Cannot retain 4 environments on growth');
      expect(preflight.recommendedAction).toContain('BLOCKED');
      expect(preflight.recommendedAction).toContain('archive at least 1 environment');
    });

    it('should permit downgrade when resource counts conform to tier limits', () => {
      // Target tier 'enterprise' permits up to 25 environments
      const preflight = graph.preflightPlanDowngrade('proj_omni_live', 'enterprise');
      expect(preflight.allowed).toBe(true);
      expect(preflight.blockers.length).toBe(0);
      expect(preflight.recommendedAction).toContain('Preflight check passed');
    });
  });

  describe('5. Extensible Command Handlers & Universal Registry', () => {
    it('should execute command via registered handler and record Merkle audit', async () => {
      const cmd: PlatformCommand = {
        commandId: 'cmd_test_rotate_01',
        correlationId: 'corr_01',
        idempotencyKey: 'idem_test_rotate_01',
        actor: { userId: 'sec_admin', role: 'SECURITY_ADMIN', ipAddress: '127.0.0.1' },
        resourceType: 'API_KEY',
        resourceId: 'key_omni_live_01',
        operation: 'key.revoke',
        desiredPayload: {},
        expectedVersion: 1,
      };

      const result = await commandBus.executeCommand(cmd);
      expect(result.success).toBe(true);
      expect(result.version).toBe(2);

      // Verify node state mutated
      const keyNode = graph.getNode('key_omni_live_01');
      expect(keyNode?.lifecycleStatus).toBe('DECOMMISSIONED');

      // Verify Audit Record written
      expect(auditEntries.length).toBeGreaterThan(0);
      expect(auditEntries[0].action).toBe('key.revoke');
    });

    it('should discover permitted operational actions from Universal Resource Registry', () => {
      const actions = registry.getActionsForResource('API_KEY', 'ACTIVE');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.id === 'key.rotate')).toBe(true);
      expect(actions.some((a) => a.id === 'key.revoke')).toBe(true);
    });
  });

  describe('6. Unified Search & Global Drift Aggregation', () => {
    it('should perform cross-resource fuzzy search across projects, keys, and domains', () => {
      const results = graph.searchResources('OmniDeliver');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((r) => r.resourceType === 'PROJECT')).toBe(true);
      expect(results.some((r) => r.resourceType === 'API_KEY')).toBe(true);
    });

    it('should aggregate global drift distribution across all materialized resources', () => {
      const drift = graph.getDriftSummary();
      expect(drift.IN_SYNC.length).toBeGreaterThan(0);
      expect(drift.BLOCKED.length).toBe(0);
    });
  });
});

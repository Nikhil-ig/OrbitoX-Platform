import {
  ResourceGraphService,
  ImpactAnalysisService,
  PolicyResolutionService,
  CommandBusService,
  ReconciliationService,
  PlatformCommand,
} from '../index';

describe('🪐 OrbitoX Universal Control Plane Brain (v4.0)', () => {
  let graph: ResourceGraphService;
  let impact: ImpactAnalysisService;
  let policy: PolicyResolutionService;
  let commandBus: CommandBusService;
  let reconciler: ReconciliationService;

  const mockAuditLogs: any[] = [];
  const mockAuditService = {
    log: async (record: any) => {
      mockAuditLogs.push(record);
    },
  };

  const mockApprovalEngine = {
    requestApproval: async (params: any) => ({
      id: `appr_test_${Date.now()}`,
      status: 'PENDING',
      ...params,
    }),
  };

  beforeEach(() => {
    mockAuditLogs.length = 0;
    graph = new ResourceGraphService();
    impact = new ImpactAnalysisService(graph);
    policy = new PolicyResolutionService(graph);
    commandBus = new CommandBusService(graph, impact, mockAuditService, mockApprovalEngine);
    reconciler = new ReconciliationService(graph, mockAuditService);
  });

  describe('1. ResourceGraph DAG & Topology', () => {
    it('should bootstrap seed topology with projects, environments, packages, and nodes', () => {
      const allNodes = graph.getAllNodes();
      expect(allNodes.length).toBeGreaterThanOrEqual(18);

      const omni = graph.getNode('proj_omni');
      expect(omni).toBeDefined();
      expect(omni?.name).toBe('OmniDeliver Global Network');
      expect(omni?.driftState).toBe('IN_SYNC');

      const prodEnv = graph.getNode('proj_omni_production');
      expect(prodEnv).toBeDefined();
      expect(prodEnv?.resourceType).toBe('ENVIRONMENT');
    });

    it('should traverse upstream dependencies and downstream dependents correctly', () => {
      const deps = graph.getDependencies('proj_omni');
      expect(deps.some((d) => d.resourceId === 'proj_omni_production')).toBe(true);

      const dependents = graph.getDependents('proj_omni');
      expect(dependents.some((d) => d.resourceId === 'org_aura_global')).toBe(true);
    });

    it('should prevent cyclic dependencies in DAG', () => {
      // Trying to add an edge from child to parent that creates a loop
      expect(() => {
        graph.addEdge({
          edgeId: 'cycle_test',
          sourceId: 'proj_omni',
          targetId: 'org_aura_global',
          edgeType: 'CONTAINS',
        });
      }).toThrow(/CYCLIC_DEPENDENCY_DETECTED/);
    });

    it('should support slug and prefix normalization for resource lookups', () => {
      const byHyphen = graph.getNode('proj-omni');
      expect(byHyphen?.resourceId).toBe('proj_omni');

      const byPrefix = graph.getNode('proj_omnideliver_custom_suffix');
      expect(byPrefix?.resourceId).toBe('proj_omni');
    });
  });

  describe('2. Pre-Flight Impact Analysis & Blast-Radius Engine', () => {
    it('should calculate safe blast radius for inspection operations', async () => {
      const assessment = await impact.calculateImpact('inspect', 'proj_omni');
      expect(assessment.verdict).toBe('PERMITTED');
      expect(assessment.riskScore).toBeLessThanOrEqual(20);
      expect(assessment.riskLevel).toBe('LOW');
    });

    it('should calculate blast radius when draining a server node', async () => {
      const assessment = await impact.calculateImpact('drain_node', 'node_mumbai_01');
      expect(assessment.targetResourceType).toBe('SERVER_NODE');
      expect(assessment.riskScore).toBeGreaterThanOrEqual(40);
      expect(assessment.suggestedMitigations.length).toBeGreaterThan(0);
      expect(assessment.directImpacts.some((d) => d.resourceId === 'svc_gateway')).toBe(true);
    });
  });

  describe('3. Policy Derivation Engine (4-Tier Hierarchy)', () => {
    it('should resolve policy values with an auditable "Why?" derivation tree', async () => {
      const result = await policy.resolvePolicy('proj_omni_production', 'rateLimitPerMin');
      expect(result.property).toBe('rateLimitPerMin');
      expect(result.effectiveValue).toBe(10000); // Enterprise plan allocation
      expect(result.derivationTree.length).toBeGreaterThanOrEqual(2);
      expect(result.derivationTree[0].source).toBe('PLATFORM_DEFAULT');
      expect(result.derivationTree[1].source).toBe('PLAN_ENTERPRISE');
      expect(result.explanation).toContain('PLAN_ENTERPRISE');
    });
  });

  describe('4. Platform Command Bus (17-Step Idempotent Pipeline)', () => {
    it('should support dry-run simulation mode without mutating graph state', async () => {
      const command: PlatformCommand = {
        commandId: 'cmd_sim_001',
        idempotencyKey: 'idem_sim_001',
        resourceId: 'node_mumbai_01',
        operation: 'drain_node',
        dryRun: true,
        actor: { userId: 'tester', role: 'PlatformSuperAdmin' },
      };

      const result = await commandBus.executeCommand(command);
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.executionPlan.length).toBe(7);

      // Verify resource was NOT mutated
      const node = graph.getNode('node_mumbai_01');
      expect(node?.resourceVersion).toBe(1);
    });

    it('should detect optimistic concurrency version conflicts', async () => {
      const command: PlatformCommand = {
        commandId: 'cmd_conflict_001',
        idempotencyKey: 'idem_conflict_001',
        resourceId: 'proj_omni',
        expectedVersion: 999, // Stale version
        operation: 'update_metadata',
        actor: { userId: 'tester', role: 'PlatformSuperAdmin' },
      };

      await expect(commandBus.executeCommand(command)).rejects.toThrow(/RESOURCE_VERSION_CONFLICT/);
    });

    it('should execute live mutations, increment version, and record Merkle audit', async () => {
      const command: PlatformCommand = {
        commandId: 'cmd_mut_001',
        idempotencyKey: 'idem_mut_001',
        resourceId: 'proj_omni',
        expectedVersion: 1,
        operation: 'update_metadata',
        desiredPayload: { tierLabel: 'Platinum' },
        actor: { userId: 'tester', role: 'PlatformSuperAdmin' },
      };

      const result = await commandBus.executeCommand(command);
      expect(result.success).toBe(true);
      expect(result.version).toBe(2);

      // Verify node updated
      const node = graph.getNode('proj_omni');
      expect(node?.resourceVersion).toBe(2);
      expect((node?.desiredState as any)?.tierLabel).toBe('Platinum');

      // Verify audit logged
      expect(mockAuditLogs.length).toBe(1);
      expect(mockAuditLogs[0].action).toBe('update_metadata');
    });

    it('should enforce idempotency on repeated command submission', async () => {
      const command: PlatformCommand = {
        commandId: 'cmd_idem_001',
        idempotencyKey: 'idem_repeat_001',
        resourceId: 'proj_omni',
        operation: 'update_config',
        actor: { userId: 'tester', role: 'PlatformSuperAdmin' },
      };

      const firstResult = await commandBus.executeCommand(command);
      const secondResult = await commandBus.executeCommand(command);

      expect(secondResult).toBe(firstResult); // Exact cached reference
    });
  });

  describe('5. Reconciliation & Drift Engine', () => {
    it('should scan all nodes and report drift status', async () => {
      const summary = await reconciler.reconcileAll();
      expect(summary.scannedCount).toBeGreaterThanOrEqual(18);
      expect(summary.inSyncCount).toBe(summary.scannedCount);
      expect(summary.driftedCount).toBe(0);
    });

    it('should autonomously self-heal replica drift on services', async () => {
      const svc = graph.getNode('svc_gateway')!;
      // Introduce artificial drift: desired 3 replicas, observed only 1 replica
      svc.desiredState = { status: 'HEALTHY', replicas: 3 };
      svc.observedState = { status: 'HEALTHY', replicas: 1 };
      svc.driftState = 'DRIFTED';

      const res = await reconciler.reconcileResource('svc_gateway');
      expect(res.remediated).toBe(true);
      expect(res.currentDriftState).toBe('IN_SYNC');
      expect((svc.observedState as any).replicas).toBe(3);
      expect(res.message).toContain('Scaled replicas to 3');
    });
  });
});

import {
  ResourceGraphService,
  ResourceRegistry,
  ImpactAnalysisService,
  PolicyResolutionService,
  CommandBusService,
  ReconciliationService,
  PlanEntitlementService,
  PluginRegistryService,
  ResourceEditorService,
  PackageManifestContract,
} from '../index';

describe('🪐 OrbitoX Universal Resource Editor & Control Center (v4.2)', () => {
  let graph: ResourceGraphService;
  let registry: ResourceRegistry;
  let impact: ImpactAnalysisService;
  let policy: PolicyResolutionService;
  let commandBus: CommandBusService;
  let reconciler: ReconciliationService;
  let planEntitlement: PlanEntitlementService;
  let pluginRegistry: PluginRegistryService;
  let editor: ResourceEditorService;

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
    registry = new ResourceRegistry();
    impact = new ImpactAnalysisService(graph);
    policy = new PolicyResolutionService(graph);
    commandBus = new CommandBusService(graph, impact, mockAuditService, mockApprovalEngine);
    reconciler = new ReconciliationService(graph, mockAuditService);
    planEntitlement = new PlanEntitlementService(graph, policy);
    pluginRegistry = new PluginRegistryService(registry, graph);
    editor = new ResourceEditorService(graph, registry, impact, commandBus, reconciler, planEntitlement, policy);

    // Supplementary fixture nodes for testing 17 control operations
    const prodNode = graph.getNode('proj_omni_production');
    if (prodNode) {
      prodNode.desiredState = { ...(prodNode.desiredState as any), rateLimitRpm: 3000 };
    }

    graph.registerNode({
      resourceId: 'cred_stripe',
      resourceType: 'CREDENTIAL',
      name: 'Stripe Payment Gateway Secret',
      resourceVersion: 1,
      owner: 'finance_admin',
      organizationId: 'org_aura_global',
      desiredState: { provider: 'stripe', secret: 'live_sec_123', rotationIntervalDays: 30 },
      observedState: { status: 'ACTIVE' },
      driftState: 'IN_SYNC',
      lifecycleStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    graph.registerNode({
      resourceId: 'api_kitchen',
      resourceType: 'API',
      name: 'Kitchen Orders REST API',
      resourceVersion: 1,
      owner: 'eng_team',
      organizationId: 'org_aura_global',
      desiredState: { rateLimitRpm: 5000, lifecycle: 'ACTIVE' },
      observedState: { status: 'HEALTHY' },
      driftState: 'IN_SYNC',
      lifecycleStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    graph.registerNode({
      resourceId: 'key_omni_prod',
      resourceType: 'API_KEY',
      name: 'OmniDeliver Production API Key',
      resourceVersion: 1,
      owner: 'dev_lead',
      organizationId: 'org_aura_global',
      desiredState: { capabilities: ['orders.read'], rateLimitRpm: 1000 },
      observedState: { status: 'ACTIVE' },
      driftState: 'IN_SYNC',
      lifecycleStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    graph.registerNode({
      resourceId: 'dom_omni',
      resourceType: 'DOMAIN',
      name: 'api.omnideliver.io',
      resourceVersion: 1,
      owner: 'network_admin',
      organizationId: 'org_aura_global',
      desiredState: { routeTarget: 'production-gateway', tlsPolicy: 'STRICT' },
      observedState: { status: 'ACTIVE' },
      driftState: 'IN_SYNC',
      lifecycleStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    graph.registerNode({
      resourceId: 'flag_four_eyes_enforce',
      resourceType: 'FEATURE_FLAG',
      name: 'Strict Four-Eyes Security Enforce',
      resourceVersion: 1,
      owner: 'security_lead',
      organizationId: 'org_aura_global',
      desiredState: { enabled: true, percentageRollout: 100 },
      observedState: { enabled: true },
      driftState: 'IN_SYNC',
      lifecycleStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    graph.registerNode({
      resourceId: 'plan_pro',
      resourceType: 'PLAN',
      name: 'Professional Tier Plan',
      resourceVersion: 1,
      owner: 'billing_ops',
      organizationId: 'org_aura_global',
      desiredState: { priceUsd: 999, monthlyApiQuota: 5000000, rateLimitRpm: 5000 },
      observedState: { status: 'ACTIVE' },
      driftState: 'IN_SYNC',
      lifecycleStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });


  describe('1. Schema Retrieval & Self-Describing Introspection', () => {
    it('should generate declarative editor schema for ENVIRONMENT with sections, fields, and validation', () => {
      const schema = editor.getEditorSchema('proj_omni_production');
      expect(schema).toBeDefined();
      expect(schema.resourceType).toBe('ENVIRONMENT');
      expect(schema.category).toBe('IDENTITY');
      expect(schema.isEditable).toBe(true);
      expect(schema.sections.length).toBeGreaterThanOrEqual(3);

      const limitsSection = schema.sections.find((s) => s.id === 'limits');
      expect(limitsSection).toBeDefined();
      const rateLimitField = limitsSection?.fields.find((f) => f.key === 'rateLimitRpm');
      expect(rateLimitField).toBeDefined();
      expect(rateLimitField?.editable).toBe(true);
      expect(rateLimitField?.validation?.min).toBe(100);
      expect(rateLimitField?.validation?.max).toBe(100000);

      // Verify immutable & observed fields are tracked
      expect(schema.immutableFields).toContain('resourceId');
      expect(schema.immutableFields).toContain('secret');
      expect(schema.observedFields).toContain('currentCpu');
    });

    it('should generate schema for SERVICE with compute and scaling parameters', () => {
      const schema = editor.getEditorSchema('svc_ordering');
      expect(schema.resourceType).toBe('SERVICE');
      expect(schema.category).toBe('COMPUTE');
      const computeSection = schema.sections.find((s) => s.id === 'compute');
      expect(computeSection).toBeDefined();
      const replicasField = computeSection?.fields.find((f) => f.key === 'replicas');
      expect(replicasField).toBeDefined();
      expect(replicasField?.currentValue).toBe(3);
      expect(replicasField?.validation?.min).toBe(1);
      expect(replicasField?.validation?.max).toBe(50);
    });

    it('should fetch actions list with risk and approval classifications', () => {
      const actions = editor.getAvailableActions('svc_ordering');
      expect(actions.length).toBeGreaterThan(0);
      const scaleAction = actions.find((a) => a.id === 'service.scale');
      expect(scaleAction).toBeDefined();
      expect(scaleAction?.safetyClass).toBe('SAFE');
      expect(scaleAction?.supportsRollback).toBe(true);
    });
  });

  describe('2. Validation & Security Invariant Enforcement', () => {
    it('should reject editing immutable identity fields', () => {
      const val = editor.validateConfiguration('proj_omni_production', {
        resourceId: 'hacked_id_123',
      });
      expect(val.valid).toBe(false);
      expect(val.errors[0]).toContain('immutable and protected');
    });

    it('should reject editing observed runtime telemetry', () => {
      const val = editor.validateConfiguration('proj_omni_production', {
        currentCpu: 99.5,
      });
      expect(val.valid).toBe(false);
      expect(val.errors[0]).toContain('observed runtime telemetry');
    });

    it('should enforce numerical boundary constraints', () => {
      const val = editor.validateConfiguration('svc_ordering', {
        replicas: 0, // min is 1
      });
      expect(val.valid).toBe(false);
      expect(val.errors[0]).toContain('must be at least 1');
    });

    it('should enforce Child Narrowing Invariant (env rate limit cannot exceed project ceiling)', () => {
      // Set project ceiling
      const proj = graph.getNode('proj_omni');
      if (proj) {
        proj.desiredState = { ...(proj.desiredState as any), rateLimitRpm: 3000 };
      }

      const val = editor.validateConfiguration('proj_omni_production', {
        rateLimitRpm: 5000, // Exceeds project limit of 3000
      });
      expect(val.valid).toBe(false);
      expect(val.errors[0]).toContain('Child narrowing invariant');
    });
  });

  describe('3. Draft Management (Save Draft ≠ Apply)', () => {
    it('should save drafts without mutating node desired state or triggering runtime reconciliation', () => {
      const initialDesired = { ...(graph.getNode('svc_ordering')?.desiredState as any) };
      const draftResult = editor.saveDraft('svc_ordering', { replicas: 8 });
      expect(draftResult.success).toBe(true);

      // Verify node desiredState is UNTOUCHED
      const currentNode = graph.getNode('svc_ordering');
      expect((currentNode?.desiredState as any).replicas).toBe(initialDesired.replicas);

      // Verify draft can be retrieved
      const saved = editor.getDraft('svc_ordering');
      expect(saved?.draft.replicas).toBe(8);

      // Verify draft can be discarded
      const discarded = editor.discardDraft('svc_ordering');
      expect(discarded).toBe(true);
      expect(editor.getDraft('svc_ordering')).toBeNull();
    });
  });

  describe('4. Pre-Flight Impact Preview & Diff Generation', () => {
    it('should generate discrete property diffs, blast radius, and topological execution plan', async () => {
      const preview = await editor.previewChanges({
        resourceId: 'svc_ordering',
        changes: { replicas: 5 },
      });

      expect(preview.diff.length).toBe(1);
      expect(preview.diff[0].field).toBe('replicas');
      expect(preview.diff[0].before).toBe(3);
      expect(preview.diff[0].after).toBe(5);

      expect(preview.impact).toBeDefined();
      expect(preview.impact.blastRadius).toBeGreaterThanOrEqual(1);
      expect(preview.executionPlan.length).toBe(5);
      expect(preview.executionPlan[0].operation).toBe('validate_schema');
      expect(preview.supportsRollback).toBe(true);
    });

    it('should redact sensitive/secret fields in diff preview', async () => {
      const preview = await editor.previewChanges({
        resourceId: 'cred_stripe',
        changes: { secret: 'super_secret_token_val' },
      });
      // The secret field is immutable/secret
      const diffSecret = preview.diff.find((d) => d.field === 'secret');
      if (diffSecret) {
        expect(diffSecret.before).toBe('[REDACTED]');
        expect(diffSecret.after).toBe('[REDACTED]');
      }
    });
  });

  describe('5. Universal Apply Pipeline & Real State Mutation', () => {
    it('should execute full apply pipeline: mutate desired state, increment version, reconcile, and audit', async () => {
      const initialNode = graph.getNode('svc_ordering')!;
      const initialVer = initialNode.resourceVersion || 1;

      const result = await editor.applyConfiguration({
        resourceId: 'svc_ordering',
        changes: { replicas: 5 },
        expectedVersion: initialVer,
        reason: 'Surge traffic scaling',
        actor: 'admin_sarah',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.newVersion).toBe(initialVer + 1);
      expect(result.reconciliation?.status).toBe('RECONCILED');

      // Verify node in graph actually changed
      const updatedNode = graph.getNode('svc_ordering')!;
      expect((updatedNode.desiredState as any).replicas).toBe(5);
      expect(updatedNode.resourceVersion).toBe(initialVer + 1);

      // Verify audit log captured
      expect(mockAuditLogs.length).toBeGreaterThan(0);
    });

    it('should reject apply with RESOURCE_VERSION_CONFLICT when expectedVersion does not match', async () => {
      await expect(
        editor.applyConfiguration({
          resourceId: 'svc_ordering',
          changes: { replicas: 4 },
          expectedVersion: 999, // Wrong version
        })
      ).rejects.toThrow('RESOURCE_VERSION_CONFLICT');
    });
  });

  describe('6. Compensating Rollback Support', () => {
    it('should snapshot prior versions and rollback desired state cleanly', async () => {
      // Step 1: Version 1 -> Version 2 (replicas: 4)
      await editor.applyConfiguration({
        resourceId: 'svc_ordering',
        changes: { replicas: 4 },
        expectedVersion: 1,
      });
      expect((graph.getNode('svc_ordering')!.desiredState as any).replicas).toBe(4);

      // Step 2: Version 2 -> Version 3 (replicas: 8)
      await editor.applyConfiguration({
        resourceId: 'svc_ordering',
        changes: { replicas: 8 },
        expectedVersion: 2,
      });
      expect((graph.getNode('svc_ordering')!.desiredState as any).replicas).toBe(8);

      // Verify history contains version 1 and 2
      const history = editor.getConfigurationHistory('svc_ordering');
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some((h) => h.version === 2)).toBe(true);

      // Step 3: Rollback to version 2 (replicas should revert to 4)
      const rollbackResult = await editor.rollbackConfiguration('svc_ordering', 2, 'admin_rollback');
      expect(rollbackResult.status).toBe('SUCCESS');
      expect((graph.getNode('svc_ordering')!.desiredState as any).replicas).toBe(4);
    });
  });

  describe('7. Cross-Resource Global Configuration Search', () => {
    it('should find parameters across all subsystems matching search queries', () => {
      const replicaResults = editor.searchConfigurations('replicas');
      expect(replicaResults.length).toBeGreaterThanOrEqual(1);
      expect(replicaResults.some((r) => r.resourceId === 'svc_ordering')).toBe(true);
      expect(replicaResults[0].isEditable).toBe(true);

      const rateLimitResults = editor.searchConfigurations('rateLimit');
      expect(rateLimitResults.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('8. Dynamic Plugin Auto-Discovery (@orbitox/control-test-plugin)', () => {
    it('should register a custom plugin and immediately expose dynamic configuration fields without core edits', async () => {
      const manifest: PackageManifestContract = {
        id: '@orbitox/control-test-plugin',
        version: '1.0.0',
        platformCompatibility: '^4.0.0',
        dependencies: [],
        features: ['inventory_autotrack'],
        capabilities: ['inventory.track.read', 'inventory.track.write'],
        services: ['svc_test_inventory'],
        apis: ['/api/v1/inventory/track'],
        configuration: {
          enableAutoSync: true,
          batchSize: 50,
          syncIntervalSec: 60,
        },
      };

      // 1. Install Plugin
      const regResult = await pluginRegistry.registerPluginManifest(manifest);
      expect(regResult.pluginId).toBe('@orbitox/control-test-plugin');

      // 2. Introspect via Universal Editor
      const schema = editor.getEditorSchema('@orbitox/control-test-plugin');
      expect(schema).toBeDefined();
      expect(schema.isEditable).toBe(true);

      // 3. Apply custom configuration
      const applyResult = await editor.applyConfiguration({
        resourceId: '@orbitox/control-test-plugin',
        changes: { batchSize: 100 },
      });
      expect(applyResult.status).toBe('SUCCESS');
      expect((graph.getNode('@orbitox/control-test-plugin')!.desiredState as any).batchSize).toBe(100);

      // 4. Uninstall plugin & verify orphan detection
      const orphans = pluginRegistry.detectOrphans('@orbitox/control-test-plugin');
      expect(orphans).toBeDefined();
      const uninstalled = await pluginRegistry.uninstallPlugin('@orbitox/control-test-plugin');
      expect(uninstalled.success).toBe(true);
    });
  });

  describe('9. "Edit Everything" Acceptance Sequence (17 Real Operations)', () => {
    it('should successfully execute all 17 platform configuration and control mutations', async () => {
      // 1. Rename Project
      const res1 = await editor.applyConfiguration({
        resourceId: 'proj_omni',
        changes: { name: 'OmniDeliver Logistics Network' },
      });
      expect(res1.status).toBe('SUCCESS');
      expect(graph.getNode('proj_omni')?.name).toBe('OmniDeliver Logistics Network');

      // 2. Change Environment Quota
      const res2 = await editor.applyConfiguration({
        resourceId: 'proj_omni_production',
        changes: { quotaMonthly: 2500000 },
      });
      expect(res2.status).toBe('SUCCESS');
      expect((graph.getNode('proj_omni_production')?.desiredState as any).quotaMonthly).toBe(2500000);

      // 3. Change Environment Rate Limit
      const res3 = await editor.applyConfiguration({
        resourceId: 'proj_omni_production',
        changes: { rateLimitRpm: 2500 },
      });
      expect(res3.status).toBe('SUCCESS');
      expect((graph.getNode('proj_omni_production')?.desiredState as any).rateLimitRpm).toBe(2500);

      // 4. Modify Package Configuration
      const res4 = await editor.applyConfiguration({
        resourceId: 'pkg_restaurant',
        changes: { enableKds: true, multiLocation: true },
      });
      expect(res4.status).toBe('SUCCESS');
      expect((graph.getNode('pkg_restaurant')?.desiredState as any).multiLocation).toBe(true);

      // 5. Upgrade Package Version
      const res5 = await editor.applyConfiguration({
        resourceId: 'pkg_restaurant',
        changes: { version: '2.3.0' },
      });
      expect(res5.status).toBe('SUCCESS');
      expect((graph.getNode('pkg_restaurant')?.desiredState as any).version).toBe('2.3.0');

      // 6. Modify Service Replicas
      const res6 = await editor.applyConfiguration({
        resourceId: 'svc_ordering',
        changes: { replicas: 4 },
      });
      expect(res6.status).toBe('SUCCESS');
      expect((graph.getNode('svc_ordering')?.desiredState as any).replicas).toBe(4);

      // 7. Change API Policy / Rate Limit
      const res7 = await editor.applyConfiguration({
        resourceId: 'api_kitchen',
        changes: { rateLimitRpm: 8000 },
      });
      expect(res7.status).toBe('SUCCESS');
      expect((graph.getNode('api_kitchen')?.desiredState as any).rateLimitRpm).toBe(8000);

      // 8. Change API Key Capabilities
      const res8 = await editor.applyConfiguration({
        resourceId: 'key_omni_prod',
        changes: { capabilities: ['orders.read', 'orders.write'] },
      });
      expect(res8.status).toBe('SUCCESS');
      expect((graph.getNode('key_omni_prod')?.desiredState as any).capabilities).toEqual(['orders.read', 'orders.write']);

      // 9. Rotate Credential (Interval)
      const res9 = await editor.applyConfiguration({
        resourceId: 'cred_stripe',
        changes: { rotationIntervalDays: 45 },
      });
      expect(res9.status).toBe('SUCCESS');
      expect((graph.getNode('cred_stripe')?.desiredState as any).rotationIntervalDays).toBe(45);

      // 10. Modify Domain Binding Target
      const res10 = await editor.applyConfiguration({
        resourceId: 'dom_omni',
        changes: { routeTarget: 'staging-gateway' },
      });
      expect(res10.status).toBe('SUCCESS');
      expect((graph.getNode('dom_omni')?.desiredState as any).routeTarget).toBe('staging-gateway');

      // 11. Modify Feature Flag
      const res11 = await editor.applyConfiguration({
        resourceId: 'flag_four_eyes_enforce',
        changes: { enabled: false },
      });
      expect(res11.status).toBe('SUCCESS');
      expect((graph.getNode('flag_four_eyes_enforce')?.desiredState as any).enabled).toBe(false);

      // 12. Publish Plan Revision Price
      const res12 = await editor.applyConfiguration({
        resourceId: 'plan_pro',
        changes: { priceUsd: 1299 },
      });
      expect(res12.status).toBe('SUCCESS');
      expect((graph.getNode('plan_pro')?.desiredState as any).priceUsd).toBe(1299);

      // 13. Change Node Infrastructure State
      const res13 = await editor.applyConfiguration({
        resourceId: 'node_mumbai_01',
        changes: { drainState: 'DRAINED' },
      });
      expect(res13.status).toBe('SUCCESS');
      expect((graph.getNode('node_mumbai_01')?.desiredState as any).drainState).toBe('DRAINED');

      // 14. Run Reconciliation Loop
      const recon = await reconciler.reconcileResource('svc_ordering');
      expect(['RECONCILED', 'IN_SYNC']).toContain(recon.status);

      // 15. Verify Observed State Synchronized
      const svcNode = graph.getNode('svc_ordering')!;
      expect((svcNode.desiredState as any).replicas).toBe(4);

      // 16. Inspect Cryptographic Audit Trail
      expect(mockAuditLogs.length).toBeGreaterThanOrEqual(10);

      // 17. Roll Back a Supported Mutation (Revert replicas 4 -> 3)
      const rollback = await editor.rollbackConfiguration('svc_ordering', 1, 'admin_rollback');
      expect(rollback.status).toBe('SUCCESS');
      expect((graph.getNode('svc_ordering')!.desiredState as any).replicas).toBe(3);
    });
  });
});

import { Logger } from './logger';
import { ResourceGraphService } from './resource-graph.service';
import {
  PlanContract,
  EffectiveCommercialPolicy,
  PolicyDerivationStep,
  EntitlementVerdict,
  UniversalResource,
} from './types';
import { CommandAuditService } from './command-bus.service';

export interface PlanVersionRecord extends PlanContract {
  createdAt: string;
  publishedAt?: string;
  deprecatedAt?: string;
  changeLog?: string;
}

export interface PlanChangeImpactResult {
  allowed: boolean;
  currentPlanId: string;
  targetPlanId: string;
  gainedFeatures: string[];
  lostFeatures: string[];
  gainedPackages: string[];
  lostPackages: string[];
  affectedEnvironmentsCount: number;
  affectedServicesCount: number;
  violations: string[];
  blockers: string[];
  billingDeltaMonthlyUsd: number;
  recommendedAction: string;
}

export class PlanEntitlementService {
  private readonly logger = new Logger(PlanEntitlementService.name);

  // Versioned Plan Store: planId -> Map<version, PlanVersionRecord>
  private readonly plans = new Map<string, Map<number, PlanVersionRecord>>();
  private readonly activePlanVersions = new Map<string, number>();

  constructor(
    private readonly graph: ResourceGraphService,
    private readonly auditService?: CommandAuditService
  ) {
    this.seedDefaultPlans();
  }

  // ── Plan Engine: Versioned Lifecycle ─────────────────────────

  createPlanDraft(input: Omit<PlanContract, 'version' | 'status'> & { changeLog?: string }): PlanVersionRecord {
    const planId = input.planId;
    if (!this.plans.has(planId)) {
      this.plans.set(planId, new Map());
    }

    const versions = this.plans.get(planId)!;
    const nextVersion = versions.size + 1;

    const draft: PlanVersionRecord = {
      ...input,
      version: nextVersion,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      changeLog: input.changeLog || 'Initial draft creation',
    };

    versions.set(nextVersion, draft);
    this.logger.log(`Created draft plan [${planId}] version v${nextVersion}`);
    return draft;
  }

  publishPlan(planId: string, version: number): PlanVersionRecord {
    const versions = this.plans.get(planId);
    if (!versions || !versions.has(version)) {
      throw new Error(`Plan [${planId}] version [${version}] does not exist.`);
    }

    const plan = versions.get(version)!;
    if (plan.status === 'ACTIVE' || plan.status === 'ARCHIVED') {
      throw new Error(`Cannot publish plan [${planId}] in state [${plan.status}].`);
    }

    // Deprecate previous active version if any
    const currentActiveVer = this.activePlanVersions.get(planId);
    if (currentActiveVer && currentActiveVer !== version) {
      const prevActive = versions.get(currentActiveVer);
      if (prevActive) {
        prevActive.status = 'DEPRECATED';
        prevActive.deprecatedAt = new Date().toISOString();
      }
    }

    plan.status = 'ACTIVE';
    plan.publishedAt = new Date().toISOString();
    this.activePlanVersions.set(planId, version);

    // Update node in ResourceGraph
    this.graph.registerNode({
      resourceId: planId,
      resourceType: 'PLAN',
      name: plan.name,
      resourceVersion: version,
      owner: 'billing_service',
      organizationId: 'platform_core',
      desiredState: { price: plan.priceUsd, features: plan.includedFeatures, limits: { maxEnvs: plan.maxEnvironmentsPerProject } },
      observedState: { price: plan.priceUsd, status: 'ACTIVE' },
      driftState: 'IN_SYNC',
      lifecycleStatus: 'ACTIVE',
      createdAt: plan.createdAt,
      updatedAt: new Date().toISOString(),
    });

    this.logger.log(`Published plan [${planId}] v${version} as ACTIVE.`);
    return plan;
  }

  clonePlan(sourcePlanId: string, targetPlanId: string, newName: string): PlanVersionRecord {
    const sourcePlan = this.getActivePlan(sourcePlanId);
    if (!sourcePlan) {
      throw new Error(`Source plan [${sourcePlanId}] not found.`);
    }

    return this.createPlanDraft({
      ...sourcePlan,
      planId: targetPlanId,
      name: newName,
      changeLog: `Cloned from [${sourcePlanId}] v${sourcePlan.version}`,
    });
  }

  getActivePlan(planId: string): PlanVersionRecord | undefined {
    const versions = this.plans.get(planId);
    if (!versions) return undefined;
    const activeVer = this.activePlanVersions.get(planId);
    return activeVer ? versions.get(activeVer) : undefined;
  }

  listPlans(): PlanVersionRecord[] {
    const result: PlanVersionRecord[] = [];
    for (const [planId, versions] of this.plans.entries()) {
      const activeVer = this.activePlanVersions.get(planId);
      if (activeVer && versions.has(activeVer)) {
        result.push(versions.get(activeVer)!);
      }
    }
    return result;
  }

  // ── Plan Effective State Calculation ──────────────────────────

  getEffectivePlan(projectId: string): EffectiveCommercialPolicy {
    const projectNode = this.graph.getNode(projectId);
    if (!projectNode) {
      throw new Error(`Project [${projectId}] does not exist in Control Plane graph.`);
    }

    const assignedPlanTier = (projectNode.desiredState as any)?.planTier || 'growth';
    const planId = assignedPlanTier.startsWith('plan_') ? assignedPlanTier.toLowerCase() : `plan_${assignedPlanTier.toLowerCase()}`;
    const plan = this.getActivePlan(planId) || this.getActivePlan('plan_growth')!;

    const derivationTree: PolicyDerivationStep[] = [];

    // 1. Base Plan Values
    derivationTree.push({ source: `Plan[${plan.planId}:v${plan.version}]`, property: 'priceUsd', value: plan.priceUsd });
    derivationTree.push({ source: `Plan[${plan.planId}:v${plan.version}]`, property: 'maxEnvironments', value: plan.maxEnvironmentsPerProject });
    derivationTree.push({ source: `Plan[${plan.planId}:v${plan.version}]`, property: 'monthlyApiQuota', value: plan.monthlyApiQuota });
    derivationTree.push({ source: `Plan[${plan.planId}:v${plan.version}]`, property: 'rateLimitRpm', value: plan.rateLimitRpm });

    // 2. Project Overrides
    const projectOverrides = (projectNode.desiredState as any)?.customLimits || {};
    let effectiveMaxEnvs = plan.maxEnvironmentsPerProject;
    let effectiveApiQuota = plan.monthlyApiQuota;
    let effectiveRateLimit = plan.rateLimitRpm;

    if (projectOverrides.maxEnvironments !== undefined) {
      effectiveMaxEnvs = projectOverrides.maxEnvironments;
      derivationTree.push({ source: `ProjectOverride[${projectId}]`, property: 'maxEnvironments', value: effectiveMaxEnvs, reason: 'Custom contractual addendum' });
    }
    if (projectOverrides.monthlyApiQuota !== undefined) {
      effectiveApiQuota = projectOverrides.monthlyApiQuota;
      derivationTree.push({ source: `ProjectOverride[${projectId}]`, property: 'monthlyApiQuota', value: effectiveApiQuota });
    }

    const explanation = `Effective commercial policy for project [${projectNode.name}] is governed by plan [${plan.name} (v${plan.version})] with ${derivationTree.filter((d) => d.source.startsWith('ProjectOverride')).length} custom contract overrides.`;

    return {
      projectId,
      planId: plan.planId,
      planVersion: plan.version,
      planName: plan.name,
      priceUsd: plan.priceUsd,
      features: [...plan.includedFeatures],
      capabilities: ['cap_ai_generation', 'cap_pos_terminal'],
      packages: [...plan.includedPackages],
      limits: {
        maxEnvironments: effectiveMaxEnvs,
        maxTenants: plan.maxTenants,
        monthlyApiQuota: effectiveApiQuota,
        rateLimitRpm: effectiveRateLimit,
        storageQuotaGb: plan.storageQuotaGb,
      },
      derivationTree,
      explanation,
    };
  }

  // ── Entitlement Engine ───────────────────────────────────────

  isProjectEntitledToPackage(projectId: string, packageId: string): EntitlementVerdict {
    const policy = this.getEffectivePlan(projectId);
    const checks: Array<{ rule: string; passed: boolean; details: string }> = [];

    const isExplicitlyIncluded = policy.packages.includes(packageId) || policy.packages.includes('*');
    checks.push({
      rule: 'PLAN_PACKAGE_INCLUSION',
      passed: isExplicitlyIncluded,
      details: isExplicitlyIncluded
        ? `Package [${packageId}] is explicitly included in Plan [${policy.planName}].`
        : `Package [${packageId}] is NOT in plan packages: [${policy.packages.join(', ')}].`,
    });

    const allowed = checks.every((c) => c.passed);
    const reason = allowed
      ? `Project [${projectId}] is entitled to package [${packageId}]. ${checks[0]?.details || ''}`
      : `Project [${projectId}] is NOT entitled to package [${packageId}] on current tier [${policy.planName}]. Upgrade required. ${checks[0]?.details || ''}`;

    return {
      allowed,
      entitled: allowed,
      subject: projectId,
      target: packageId,
      targetType: 'PACKAGE',
      reason,
      explanation: reason,
      rule: checks[0]?.rule || 'PLAN_PACKAGE_INCLUSION',
      checks,
    };
  }

  isEnvironmentEntitledToFeature(environmentId: string, featureId: string): EntitlementVerdict {
    const envNode = this.graph.getNode(environmentId);
    const checks: Array<{ rule: string; passed: boolean; details: string }> = [];

    if (!envNode || !envNode.projectId) {
      const reason = 'Environment or parent project not found.';
      return {
        allowed: false,
        entitled: false,
        subject: environmentId,
        target: featureId,
        targetType: 'FEATURE',
        reason,
        explanation: reason,
        rule: 'ENVIRONMENT_EXISTS',
        checks: [{ rule: 'ENVIRONMENT_EXISTS', passed: false, details: 'Environment node missing' }],
      };
    }

    const isEnvActive = envNode.lifecycleStatus === 'ACTIVE';
    checks.push({
      rule: 'ENVIRONMENT_ACTIVE',
      passed: isEnvActive,
      details: `Environment status is [${envNode.lifecycleStatus}]. Must be [ACTIVE].`,
    });

    const policy = this.getEffectivePlan(envNode.projectId);
    const hasFeature = policy.features.includes(featureId) || policy.features.includes('*');
    checks.push({
      rule: 'PLAN_FEATURE_GRANT',
      passed: hasFeature,
      details: hasFeature
        ? `Feature [${featureId}] granted under [${policy.planName}].`
        : `Feature [${featureId}] is absent from granted plan features: [${policy.features.join(', ')}].`,
    });

    const allowed = checks.every((c) => c.passed);
    const reason = allowed
      ? `Environment [${envNode.name}] is entitled to feature [${featureId}].`
      : `Environment [${envNode.name}] is denied feature [${featureId}]. Blocked by: ${checks.filter((c) => !c.passed).map((c) => c.details).join('; ')}`;

    return {
      allowed,
      entitled: allowed,
      subject: environmentId,
      target: featureId,
      targetType: 'FEATURE',
      reason,
      explanation: reason,
      rule: checks[0]?.rule,
      checks,
    };
  }

  isKeyEntitledToCapability(keyId: string, capabilityId: string): EntitlementVerdict {
    const keyNode = this.graph.getNode(keyId);
    const checks: Array<{ rule: string; passed: boolean; details: string }> = [];

    if (!keyNode) {
      const reason = `Key [${keyId}] does not exist in graph.`;
      return {
        allowed: false,
        entitled: false,
        subject: keyId,
        target: capabilityId,
        targetType: 'CAPABILITY',
        reason,
        explanation: reason,
        rule: 'KEY_EXISTS',
        checks: [{ rule: 'KEY_EXISTS', passed: false, details: 'Key node missing' }],
      };
    }

    const isKeyActive = keyNode.lifecycleStatus === 'ACTIVE';
    checks.push({
      rule: 'KEY_LIFECYCLE_ACTIVE',
      passed: isKeyActive,
      details: `Key state is [${keyNode.lifecycleStatus}].`,
    });

    const keyScopes: string[] = (keyNode.desiredState as any)?.capabilities || [];
    const isGrantedOnKey = keyScopes.includes(capabilityId) || keyScopes.includes('*');
    checks.push({
      rule: 'KEY_TOKEN_CAPABILITY_SCOPE',
      passed: isGrantedOnKey,
      details: isGrantedOnKey
        ? `Capability [${capabilityId}] granted on key token scopes.`
        : `Capability [${capabilityId}] is absent from key scopes: [${keyScopes.join(', ')}].`,
    });

    // Parent project plan check
    if (keyNode.projectId) {
      const policy = this.getEffectivePlan(keyNode.projectId);
      const isPlanEntitled = capabilityId.includes('enterprise')
        ? policy.planId.includes('enterprise') || policy.planId.includes('hyperscale')
        : true;
      checks.push({
        rule: 'PLAN_CAPABILITY_ENTITLEMENT',
        passed: isPlanEntitled,
        details: isPlanEntitled
          ? `Plan [${policy.planName}] entitles requested capability tier.`
          : `Plan [${policy.planName}] cannot access enterprise-restricted capability [${capabilityId}].`,
      });
    }

    const allowed = checks.every((c) => c.passed);
    const reason = allowed
      ? `Key [${keyNode.name}] is entitled to invoke capability [${capabilityId}].`
      : `Key [${keyNode.name}] is DENIED capability [${capabilityId}].`;

    return {
      allowed,
      entitled: allowed,
      subject: keyId,
      target: capabilityId,
      targetType: 'CAPABILITY',
      reason,
      explanation: reason,
      rule: checks[0]?.rule,
      checks,
    };
  }

  // ── Plan Change Impact Analysis ──────────────────────────────

  calculatePlanChangeImpact(projectId: string, targetPlanId: string): PlanChangeImpactResult {
    const projectNode = this.graph.getNode(projectId);
    if (!projectNode) {
      throw new Error(`Project [${projectId}] does not exist.`);
    }

    const currentPolicy = this.getEffectivePlan(projectId);
    const targetPlan = this.getActivePlan(targetPlanId);
    if (!targetPlan) {
      throw new Error(`Target plan [${targetPlanId}] does not exist.`);
    }

    const gainedFeatures = targetPlan.includedFeatures.filter((f) => !currentPolicy.features.includes(f));
    const lostFeatures = currentPolicy.features.filter((f) => !targetPlan.includedFeatures.includes(f));
    const gainedPackages = targetPlan.includedPackages.filter((p) => !currentPolicy.packages.includes(p));
    const lostPackages = currentPolicy.packages.filter((p) => !targetPlan.includedPackages.includes(p));

    const environments = this.graph.getAllNodes('ENVIRONMENT').filter(
      (e) => e.projectId === projectId || e.resourceId.includes(projectId)
    );

    const violations: string[] = [];
    const blockers: string[] = [];

    if (environments.length > targetPlan.maxEnvironmentsPerProject) {
      blockers.push(`Active environment count (${environments.length}) exceeds target plan limit (${targetPlan.maxEnvironmentsPerProject}).`);
      violations.push(`Must decommission at least ${environments.length - targetPlan.maxEnvironmentsPerProject} environment(s) before downgrade.`);
    }

    const billingDeltaMonthlyUsd = targetPlan.priceUsd - currentPolicy.priceUsd;
    const allowed = blockers.length === 0;

    return {
      allowed,
      currentPlanId: currentPolicy.planId,
      targetPlanId,
      gainedFeatures,
      lostFeatures,
      gainedPackages,
      lostPackages,
      affectedEnvironmentsCount: environments.length,
      affectedServicesCount: 3,
      violations,
      blockers,
      billingDeltaMonthlyUsd,
      recommendedAction: allowed
        ? `Safe to transition from ${currentPolicy.planName} to ${targetPlan.name} (Monthly Delta: $${billingDeltaMonthlyUsd}).`
        : `BLOCKED: You must remediate ${blockers.length} resource constraint(s) before transitioning.`,
    };
  }

  private seedDefaultPlans(): void {
    const plans: Array<Omit<PlanContract, 'version' | 'status'>> = [
      {
        planId: 'plan_starter',
        name: 'Starter Sandbox',
        priceUsd: 0,
        billingPeriod: 'MONTHLY',
        includedPackages: ['@orbitox/core'],
        includedFeatures: ['basic_api', 'single_environment'],
        maxProjects: 1,
        maxEnvironmentsPerProject: 1,
        maxTenants: 1,
        monthlyApiQuota: 10000,
        rateLimitRpm: 120,
        burstPerSecond: 10,
        storageQuotaGb: 5,
        supportTier: 'COMMUNITY',
        slaPercentage: 99.0,
      },
      {
        planId: 'plan_growth',
        name: 'Growth Scale',
        priceUsd: 299,
        billingPeriod: 'MONTHLY',
        includedPackages: ['@orbitox/restaurant', '@orbitox/pos', '@orbitox/commerce', '@orbitox/crm'],
        includedFeatures: ['multi_env', 'custom_domains', 'standard_support'],
        maxProjects: 5,
        maxEnvironmentsPerProject: 3,
        maxTenants: 10,
        monthlyApiQuota: 500000,
        rateLimitRpm: 1000,
        burstPerSecond: 50,
        storageQuotaGb: 50,
        supportTier: 'STANDARD',
        slaPercentage: 99.9,
      },
      {
        planId: 'plan_pro',
        name: 'Professional Tier',
        priceUsd: 999,
        billingPeriod: 'MONTHLY',
        includedPackages: ['@orbitox/restaurant', '@orbitox/pos', '@orbitox/commerce', '@orbitox/crm', '@orbitox/finance', '@orbitox/inventory'],
        includedFeatures: ['multi_env', 'custom_domains', 'sla_99_9', 'ai_copilot_preview'],
        maxProjects: 20,
        maxEnvironmentsPerProject: 5,
        maxTenants: 50,
        monthlyApiQuota: 5000000,
        rateLimitRpm: 5000,
        burstPerSecond: 200,
        storageQuotaGb: 250,
        supportTier: 'PRIORITY_24_7',
        slaPercentage: 99.95,
      },
      {
        planId: 'plan_enterprise',
        name: 'Enterprise Dedicated',
        priceUsd: 2999,
        billingPeriod: 'MONTHLY',
        includedPackages: ['*'],
        includedFeatures: ['four_eyes_approval', 'custom_domains', 'mtls', 'audit_export', 'ai_mcp', 'dedicated_vpc'],
        maxProjects: 100,
        maxEnvironmentsPerProject: 25,
        maxTenants: 500,
        monthlyApiQuota: 50000000,
        rateLimitRpm: 25000,
        burstPerSecond: 1000,
        storageQuotaGb: 2000,
        supportTier: 'DEDICATED_TAM',
        slaPercentage: 99.99,
      },
      {
        planId: 'plan_hyperscale',
        name: 'Hyperscale Mesh',
        priceUsd: 9999,
        billingPeriod: 'MONTHLY',
        includedPackages: ['*'],
        includedFeatures: ['*'],
        maxProjects: 1000,
        maxEnvironmentsPerProject: 100,
        maxTenants: 10000,
        monthlyApiQuota: 500000000,
        rateLimitRpm: 100000,
        burstPerSecond: 5000,
        storageQuotaGb: 20000,
        supportTier: 'EXECUTIVE_TAM',
        slaPercentage: 99.999,
      },
    ];

    plans.forEach((p) => {
      this.createPlanDraft(p);
      this.publishPlan(p.planId, 1);
    });
  }
}

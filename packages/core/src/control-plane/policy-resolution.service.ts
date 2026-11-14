import { Logger } from './logger';
import { ResourceGraphService } from './resource-graph.service';
import { EffectivePolicyResult, PolicyDerivationStep } from './types';

export class PolicyResolutionService {
  private readonly logger = new Logger(PolicyResolutionService.name);

  // Platform Baseline Safety Floor
  private readonly platformDefaults: Record<string, unknown> = {
    rateLimitPerMin: 600,
    burstPerSecond: 50,
    monthlyCallQuota: 1000000,
    storageQuotaGb: 10.0,
    keyMaxLifetimeDays: 90,
    requireFourEyesForProduction: true,
    requireMtls: false,
    strictIpAllowlist: false,
  };

  // Plan Tiers Caps
  private readonly planPolicies: Record<string, Record<string, unknown>> = {
    starter: {
      rateLimitPerMin: 600,
      monthlyCallQuota: 100000,
      storageQuotaGb: 10.0,
      maxEnvironments: 2,
    },
    growth: {
      rateLimitPerMin: 1200,
      monthlyCallQuota: 1000000,
      storageQuotaGb: 50.0,
      maxEnvironments: 5,
    },
    pro: {
      rateLimitPerMin: 3000,
      monthlyCallQuota: 5000000,
      storageQuotaGb: 250.0,
      maxEnvironments: 10,
    },
    enterprise: {
      rateLimitPerMin: 10000,
      monthlyCallQuota: 25000000,
      storageQuotaGb: 1000.0,
      maxEnvironments: 50,
    },
    hyperscale: {
      rateLimitPerMin: 50000,
      monthlyCallQuota: 100000000,
      storageQuotaGb: 10000.0,
      maxEnvironments: 200,
    },
  };

  constructor(private readonly graph: ResourceGraphService) {}

  async resolvePolicy(environmentId: string, property: string): Promise<EffectivePolicyResult> {
    const derivationTree: PolicyDerivationStep[] = [];

    // Step 1: Platform Safety Baseline
    const platformVal = this.platformDefaults[property];
    if (platformVal !== undefined) {
      derivationTree.push({
        source: 'PLATFORM_DEFAULT',
        property,
        value: platformVal,
        reason: 'Platform global baseline safety floor',
      });
    }

    let effectiveValue = platformVal;

    // Step 2: Resolve Environment & Project from Graph
    const envNode = this.graph.getNode(environmentId);
    let planTier = 'growth';

    if (envNode?.projectId) {
      const projNode = this.graph.getNode(envNode.projectId);
      if (projNode?.desiredState && typeof projNode.desiredState === 'object') {
        const state = projNode.desiredState as Record<string, unknown>;
        if (state.planTier && typeof state.planTier === 'string') {
          planTier = state.planTier;
        }
      }
    }

    // Step 3: Plan Contract Policy Cap
    const planRules = this.planPolicies[planTier] || this.planPolicies.growth;
    const planVal = planRules ? planRules[property] : undefined;
    if (planVal !== undefined) {
      derivationTree.push({
        source: `PLAN_${planTier.toUpperCase()}`,
        property,
        value: planVal,
        reason: `Subscribed commercial contract allocation for ${planTier} tier`,
      });
      effectiveValue = planVal;
    }

    // Step 4: Environment Specific Overrides (e.g. Production Throttling)
    if (envNode?.desiredState && typeof envNode.desiredState === 'object') {
      const envState = envNode.desiredState as Record<string, unknown>;
      if (envState[property] !== undefined) {
        derivationTree.push({
          source: `ENVIRONMENT_${envNode.name}`,
          property,
          value: envState[property],
          reason: 'Explicit environment policy override configured by operator',
        });
        effectiveValue = envState[property];
      }
    }

    // Construct human-readable explanation
    const lastStep = derivationTree[derivationTree.length - 1];
    const explanation = `Resolved to ${effectiveValue} via ${lastStep?.source}: ${lastStep?.reason || 'Calculated'}.`;

    return {
      property,
      effectiveValue,
      derivationTree,
      explanation,
    };
  }
}

/**
 * OrbitoX Service Container
 * ─────────────────────────────────────────────────────────────
 * The single source of truth for all service instances.
 * All facades receive services from here — ensuring shared state.
 * 
 * Solves the classic problem: ContextFacade and FeaturesFacade
 * previously used SEPARATE ContextService instances, so contexts
 * created in one were invisible to the other.
 */

import {
  ContextService,
  AuditService,
  PolicyEngine,
  FeatureFlagService,
  WorkflowService,
  PlanService,
  CapabilityEngine,
  ActionRegistry,
  RbacService,
  EventBusService,
  AIGateway,
} from '@orbitox/core';

export interface OrbitoXConfig {
  /**
   * 'open': Skip ABAC/PBAC — allow all checks by default.
   *         Use in development, prototyping, and testing.
   * 'strict': Full Zero-Trust — all 3 layers must pass (default for production).
   */
  mode?: 'open' | 'strict';

  /**
   * Optional Redis connection for the event bus.
   * If omitted, events use an in-memory fallback emitter.
   */
  redis?: { host: string; port: number };

  /**
   * Optional AI provider keys.
   * If set, AI facade will call real APIs.
   */
  ai?: {
    provider: 'openai' | 'gemini' | 'azure';
    apiKey: string;
    model?: string;
  };
}

export class ServiceContainer {
  private static instance?: ServiceContainer;

  // Core services — shared across all facades
  readonly contextService: ContextService;
  readonly auditService: AuditService;
  readonly policyEngine: PolicyEngine;
  readonly featureService: FeatureFlagService;
  readonly workflowService: WorkflowService;
  readonly planService: PlanService;
  readonly capabilityEngine: CapabilityEngine;
  readonly actionRegistry: ActionRegistry;
  readonly rbacService: RbacService;
  readonly eventBusService: EventBusService;
  readonly aiGateway: AIGateway;
  readonly config: Required<OrbitoXConfig>;

  constructor(config: OrbitoXConfig = {}) {
    this.config = {
      mode: config.mode || 'open',
      redis: config.redis || { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') },
      ai: config.ai || { provider: 'openai', apiKey: process.env.OPENAI_API_KEY || '', model: 'gpt-4o' },
    };

    // Build the dependency graph in the correct order
    this.contextService = new ContextService();
    this.auditService = new AuditService();
    this.policyEngine = new PolicyEngine();
    this.featureService = new FeatureFlagService(this.contextService);
    this.workflowService = new WorkflowService();
    this.planService = new PlanService();
    this.capabilityEngine = new CapabilityEngine(this.contextService);
    this.actionRegistry = new ActionRegistry();
    this.aiGateway = new AIGateway(this.capabilityEngine, this.auditService, this.actionRegistry);

    // RbacService — in 'open' mode the mock role service returns wildcard '*' permissions
    const roleService = this.buildRoleService();
    this.rbacService = new RbacService(roleService, this.policyEngine, console as any);

    // EventBusService — always created; the Events facade decides whether to use BullMQ or in-memory
    this.eventBusService = new EventBusService();
  }

  /** Returns the shared singleton instance */
  static shared(config?: OrbitoXConfig): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(config);
    }
    return ServiceContainer.instance;
  }

  /** Reconfigure and replace the shared instance */
  static reset(config?: OrbitoXConfig): ServiceContainer {
    ServiceContainer.instance = new ServiceContainer(config);
    return ServiceContainer.instance;
  }

  private buildRoleService(): any {
    const mode = this.config.mode;
    return {
      /** Always returns 'platform-admin' in open mode so wildcard perms work */
      getUserRoles: async (_userId: string, _contextId: string): Promise<string[]> => {
        return mode === 'open' ? ['platform-admin'] : [];
      },
      /** Returns ['*'] in open mode — the RBAC layer always passes */
      getEffectivePermissions: async (_roleId: string): Promise<string[]> => {
        return mode === 'open' ? ['*'] : [];
      },
    };
  }
}

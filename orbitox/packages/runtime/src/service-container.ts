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
  PiiService,
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
  readonly piiService: PiiService;
  readonly config: Required<OrbitoXConfig>;

  constructor(config: OrbitoXConfig = {}) {
    // ── 1. Resolve Security Mode ────────────────────────────────
    // Auto-detect production: NODE_ENV=production → strict by default
    const isProduction = process.env.NODE_ENV === 'production';
    const resolvedMode = config.mode || (isProduction ? 'strict' : 'open');

    // ── 2. Resolve Redis Connection ─────────────────────────────
    const redisHost = config.redis?.host || process.env.REDIS_HOST || process.env.REDIS_URL?.replace(/^redis:\/\//, '').split(':')[0] || 'localhost';
    const redisPort = config.redis?.port || parseInt(process.env.REDIS_PORT || '6379', 10);

    // ── 3. Resolve AI Provider & API Keys ───────────────────────
    // Priority: explicit config > OPENAI_API_KEY > GEMINI_API_KEY > stub
    const resolvedAI = this.resolveAIConfig(config.ai);

    this.config = {
      mode: resolvedMode,
      redis: { host: redisHost, port: redisPort },
      ai: resolvedAI,
    };

    // ── 4. Build the dependency graph ───────────────────────────
    this.contextService = new ContextService();
    this.auditService = new AuditService();
    this.policyEngine = new PolicyEngine();
    this.featureService = new FeatureFlagService(this.contextService);
    this.workflowService = new WorkflowService();
    this.planService = new PlanService();
    this.capabilityEngine = new CapabilityEngine(this.contextService);
    this.actionRegistry = new ActionRegistry();
    this.aiGateway = new AIGateway(this.capabilityEngine, this.auditService, this.actionRegistry);
    this.piiService = new PiiService();

    // RbacService — in 'open' mode the mock role service returns wildcard '*' permissions
    const roleService = this.buildRoleService();
    this.rbacService = new RbacService(roleService, this.policyEngine, console as any);

    // EventBusService — always created; the Events facade decides whether to use BullMQ or in-memory
    this.eventBusService = new EventBusService();

    // ── 5. Startup Diagnostics ──────────────────────────────────
    this.logStartupDiagnostics();
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

  /**
   * Auto-detect AI provider from environment variables.
   * Priority: explicit config > OPENAI_API_KEY > GEMINI_API_KEY > stub mode.
   */
  private resolveAIConfig(explicit?: OrbitoXConfig['ai']): { provider: 'openai' | 'gemini' | 'azure'; apiKey: string; model?: string } {
    if (explicit?.apiKey) {
      return { provider: explicit.provider || 'openai', apiKey: explicit.apiKey, model: explicit.model };
    }

    const openaiKey = process.env.OPENAI_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    const azureKey = process.env.AZURE_OPENAI_API_KEY || '';

    if (openaiKey) return { provider: 'openai', apiKey: openaiKey, model: process.env.OPENAI_MODEL || 'gpt-4o' };
    if (geminiKey) return { provider: 'gemini', apiKey: geminiKey, model: process.env.GEMINI_MODEL || 'gemini-pro' };
    if (azureKey) return { provider: 'azure', apiKey: azureKey, model: process.env.AZURE_OPENAI_MODEL || 'gpt-4o' };

    return { provider: 'openai', apiKey: '', model: 'gpt-4o' };
  }

  /**
   * Log production readiness diagnostics at startup.
   */
  private logStartupDiagnostics(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const prefix = '[OrbitoX Boot]';

    console.log(`${prefix} Security Mode: ${this.config.mode.toUpperCase()}${isProduction ? ' (auto-detected from NODE_ENV=production)' : ''}`);
    console.log(`${prefix} Redis: ${this.config.redis.host}:${this.config.redis.port}`);
    console.log(`${prefix} AI Provider: ${this.config.ai.provider}${this.config.ai.apiKey ? ' (live)' : ' (stub — no API key)'}`);

    // Production warnings
    if (isProduction) {
      if (this.config.mode !== 'strict') {
        console.warn(`⚠️  ${prefix} WARNING: Running in '${this.config.mode}' mode in production! All security checks are BYPASSED. Set mode: 'strict' or NODE_ENV=production.`);
      }
      if (this.config.redis.host === 'localhost') {
        console.warn(`⚠️  ${prefix} WARNING: Redis is pointing to localhost in production. Set REDIS_HOST for distributed event processing.`);
      }
      if (!this.config.ai.apiKey) {
        console.warn(`⚠️  ${prefix} WARNING: No AI API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY for live AI responses.`);
      }
    }
  }
}

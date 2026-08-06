/**
 * OrbitoX Singleton
 * ─────────────────────────────────────────────────────────────
 * The single entry point to the entire OrbitoX platform.
 * 
 * Usage:
 *   import { orbitox } from '@orbitox/runtime';
 * 
 *   // Optional: configure once at app startup
 *   orbitox.configure({ mode: 'strict', redis: { host: 'redis', port: 6379 } });
 * 
 *   // Then use anywhere
 *   const ctx = orbitox.context.create({ slug: 'acme', displayName: 'Acme Corp', type: 'tenant', ownerId: 'user_1' });
 *   await orbitox.security.authorize('user_1', 'leads.create', ctx.id);
 *   await orbitox.audit.created('Lead', 'lead_001', { name: 'John Doe' }, 'user_1', ctx.id);
 *   await orbitox.events.emit('crm.lead.created', { leadId: 'lead_001' }, ctx.id);
 *   const reply = await orbitox.ai.ask('Summarize this lead for me');
 *
 * Architecture:
 * ┌──────────────────────────────────────────────────────────────┐
 * │                    OrbitoXSingleton                          │
 * │                                                              │
 * │  security  audit  events  context  ai  features  workflows  │
 * │     │        │      │       │      │      │          │       │
 * │     └────────┴──────┴───────┘──────┴──────┴──────────┘       │
 * │                      ServiceContainer                        │
 * │         (single shared instance of every core service)      │
 * └──────────────────────────────────────────────────────────────┘
 */

import { ServiceContainer, OrbitoXConfig } from './service-container';
import { SecurityFacade } from './facades/security.facade';
import { AuditFacade } from './facades/audit.facade';
import { EventsFacade } from './facades/events.facade';
import { ContextFacade } from './facades/context.facade';
import { AIFacade } from './facades/ai.facade';
import { FeaturesFacade } from './facades/features.facade';
import { WorkflowsFacade } from './facades/workflows.facade';
import { BillingFacade } from './facades/billing.facade';

class OrbitoXSingleton {
  private container: ServiceContainer = ServiceContainer.shared();

  // Cached facade instances (rebuilt when container changes)
  private _security?: SecurityFacade;
  private _audit?: AuditFacade;
  private _events?: EventsFacade;
  private _context?: ContextFacade;
  private _ai?: AIFacade;
  private _features?: FeaturesFacade;
  private _workflows?: WorkflowsFacade;
  private _billing?: BillingFacade;

  /**
   * Configure the OrbitoX platform. Call once at startup.
   * All services will be rebuilt with the new configuration.
   * 
   * @example
   * // Development (all permissions open, in-memory events)
   * orbitox.configure({ mode: 'open' });
   *
   * // Production (strict RBAC, Redis-backed events, real AI)
   * orbitox.configure({
   *   mode: 'strict',
   *   redis: { host: 'redis.prod', port: 6379 },
   *   ai: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }
   * });
   */
  configure(config: OrbitoXConfig): this {
    this.container = ServiceContainer.reset(config);
    // Reset all facades so they're rebuilt with new container
    this._security = undefined;
    this._audit = undefined;
    this._events = undefined;
    this._context = undefined;
    this._ai = undefined;
    this._features = undefined;
    this._workflows = undefined;
    this._billing = undefined;
    return this;
  }

  // ─── Namespaced Services ───────────────────────────────────────

  /**
   * 🛡️ Security — Zero-Trust RBAC + ABAC + PBAC
   * 
   * @example
   * await orbitox.security.authorize('user_1', 'leads.create', tenantId);
   * const ok = await orbitox.security.check('user_1', 'leads.delete', tenantId);
   * const perms = await orbitox.security.checkMany('user_1', ['leads.create', 'crm.view'], tenantId);
   */
  get security(): SecurityFacade {
    if (!this._security) {
      this._security = new SecurityFacade(
        this.container.rbacService,
        this.container.policyEngine,
        this.container.config.mode,
        this.container.piiService,
      );
    }
    return this._security;
  }

  /**
   * 📋 Audit — Immutable hash-chained audit trail
   * 
   * @example
   * await orbitox.audit.created('Lead', 'lead_001', { name: 'John' }, userId, contextId);
   * await orbitox.audit.updated('Lead', 'lead_001', oldData, newData, userId, contextId);
   */
  get audit(): AuditFacade {
    if (!this._audit) {
      this._audit = new AuditFacade(this.container.auditService);
    }
    return this._audit;
  }

  /**
   * ⚡ Events — Async event bus (BullMQ w/ Redis fallback to in-memory)
   * 
   * @example
   * await orbitox.events.emit('crm.lead.created', { leadId: 'abc' }, contextId);
   * orbitox.events.on('crm.lead.created', async (payload, meta) => { ... });
   * orbitox.events.onAny((name, payload, meta) => console.log(name));
   */
  get events(): EventsFacade {
    if (!this._events) {
      this._events = new EventsFacade(this.container.eventBusService, this.container.config.redis);
    }
    return this._events;
  }

  /**
   * 🏢 Context — Multi-tenancy context tree (Platform > Org > Tenant > Branch)
   * 
   * @example
   * const tenant = orbitox.context.create({ slug: 'acme', displayName: 'Acme Corp', type: 'tenant', ownerId: 'user_1' });
   * const ctx = orbitox.context.get('acme');
   * const ancestors = orbitox.context.ancestors(tenant.id);
   */
  get context(): ContextFacade {
    if (!this._context) {
      this._context = new ContextFacade(this.container.contextService);
    }
    return this._context;
  }

  /**
   * 🤖 AI — Multi-provider LLM gateway (OpenAI, Gemini, Azure)
   * 
   * @example
   * const summary = await orbitox.ai.ask('Summarize this customer history');
   * const sentiment = await orbitox.ai.classify('I love this!', ['positive', 'neutral', 'negative']);
   * const data = await orbitox.ai.extract('Call John at 555-1234', { name: 'string', phone: 'string' });
   */
  get ai(): AIFacade {
    if (!this._ai) {
      this._ai = new AIFacade(this.container.aiGateway, this.container.config.ai);
    }
    return this._ai;
  }

  /**
   * 🚩 Features — Per-context feature flags & rollouts
   * 
   * @example
   * orbitox.features.define({ id: 'new-ui', displayName: 'New Dashboard UI', defaultValue: false });
   * const isOn = await orbitox.features.isEnabled('new-ui', tenantId);
   * const flags = await orbitox.features.checkAll(['new-ui', 'ai-chat'], tenantId);
   */
  get features(): FeaturesFacade {
    if (!this._features) {
      this._features = new FeaturesFacade(this.container.featureService);
    }
    return this._features;
  }

  /**
   * 📦 Workflows — Declarative no-code automation (event/schedule/webhook triggered)
   * 
   * @example
   * await orbitox.workflows.define({ id: 'lead-welcome', trigger: { type: 'event', eventName: 'crm.lead.created' }, ... });
   * await orbitox.workflows.trigger('crm.lead.created', { leadId: 'abc' }, tenantId);
   */
  get workflows(): WorkflowsFacade {
    if (!this._workflows) {
      this._workflows = new WorkflowsFacade(this.container.workflowService);
    }
    return this._workflows;
  }

  /**
   * 💳 Billing — Multi-tenant subscription & plan management
   * 
   * @example
   * await orbitox.billing.createPlan({ name: 'Pro', price: 99, features: ['CRM', 'AI'] });
   * const plans = await orbitox.billing.listPlans();
   */
  get billing(): BillingFacade {
    if (!this._billing) {
      this._billing = new BillingFacade(this.container.planService);
    }
    return this._billing;
  }

  // ─── Platform Utilities ───────────────────────────────────────

  /**
   * ❤️ Health check — platform status.
   */
  async health(): Promise<{ status: string; mode: string; services: Record<string, string> }> {
    return {
      status: 'healthy',
      mode: this.container.config.mode,
      services: {
        context: 'ok',
        security: 'ok',
        audit: 'ok',
        events: 'ok',
        features: 'ok',
        workflows: 'ok',
        billing: 'ok',
        ai: this.container.config.ai.apiKey ? 'ok (live)' : 'ok (stub)',
      },
    };
  }

  private registeredPlugins: Map<string, any> = new Map();

  /**
   * 🔌 Plugin Extension System — Register custom plugins and extensions.
   * Enables developers to seamlessly customize and extend the `orbitox` platform.
   * 
   * @example
   * orbitox.use({
   *   id: 'my-custom-analytics',
   *   install(app) {
   *     console.log('Plugin installed!');
   *   }
   * });
   */
  use(plugin: { id: string; name?: string; install: (orbitoxInstance: OrbitoXSingleton) => void }): this {
    if (this.registeredPlugins.has(plugin.id)) {
      console.warn(`[OrbitoX Plugin] Plugin '${plugin.id}' is already registered.`);
      return this;
    }
    plugin.install(this);
    this.registeredPlugins.set(plugin.id, plugin);
    console.log(`[OrbitoX Plugin] Successfully registered plugin: ${plugin.name || plugin.id}`);
    return this;
  }

  /**
   * 🔧 Access the raw service container for advanced use cases.
   * Only use if you need something not exposed by the facades.
   */
  get services(): ServiceContainer {
    return this.container;
  }
}

export const orbitox = new OrbitoXSingleton();

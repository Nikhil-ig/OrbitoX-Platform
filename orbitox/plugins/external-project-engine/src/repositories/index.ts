/**
 * 🪐 OrbitoX Platform Control Plane - Formal Repository Suite
 * Persisted repository implementations backed by PersistentControlStore.
 */

import {
  ExternalProjectRecord,
  PlatformPluginRecord,
  ApiRegistryEntry,
  CentralPlanDefinition,
  EnvironmentRecord,
  RuntimeSessionRecord,
  ConfigurationRevision,
  ProjectAuditEntry,
  ControlCommand,
} from '../types';
import { PersistentControlStore } from '../services/control-store.service';
import { ApiRegistrationMeta, CentralQuoteResponse } from '@orbitox/external-runtime-sdk';

const store = PersistentControlStore.getInstance();

export class ProjectRepository {
  findById(id: string): ExternalProjectRecord | undefined {
    return store.getProject(id);
  }

  findBySlug(slug: string): ExternalProjectRecord | undefined {
    return Object.values(store.getProjects()).find((p) => p.slug === slug);
  }

  list(): ExternalProjectRecord[] {
    return Object.values(store.getProjects());
  }

  save(project: ExternalProjectRecord): void {
    store.saveProject(project);
  }
}

export class PluginRepository {
  findByProject(projectId: string): PlatformPluginRecord[] {
    return store.getPlugins(projectId);
  }

  findById(projectId: string, pluginId: string): PlatformPluginRecord | undefined {
    return store.getPlugins(projectId).find((p) => p.id === pluginId);
  }

  save(projectId: string, plugin: PlatformPluginRecord): void {
    const list = store.getPlugins(projectId);
    const idx = list.findIndex((p) => p.id === plugin.id);
    if (idx >= 0) list[idx] = plugin;
    else list.push(plugin);
    store.savePlugins(projectId, list);
  }
}

export class ApiRepository {
  private inMemoryRegistry: Map<string, ApiRegistryEntry[]> = new Map();

  findByProject(projectId: string): ApiRegistryEntry[] {
    return this.inMemoryRegistry.get(projectId) || [];
  }

  findByName(projectId: string, name: string): ApiRegistryEntry | undefined {
    return this.findByProject(projectId).find((a) => a.name === name);
  }

  register(projectId: string, pluginId: string, meta: ApiRegistrationMeta): ApiRegistryEntry {
    let list = this.inMemoryRegistry.get(projectId) || [];
    const existingIdx = list.findIndex((a) => a.name === meta.name);

    const entry: ApiRegistryEntry = {
      ...meta,
      projectId,
      pluginId,
      webhookSupported: false,
      status: 'ACTIVE',
      health: 'HEALTHY',
      permissions: meta.scopes,
      rateLimitPerMin: meta.rateLimitPerMin || 300,
      totalInvocations: 0,
    };

    if (existingIdx >= 0) list[existingIdx] = entry;
    else list.push(entry);

    this.inMemoryRegistry.set(projectId, list);
    return entry;
  }
}

export class PlanRepository {
  private static plans: CentralPlanDefinition[] = [
    {
      id: 'plan_restaurant_growth',
      name: 'Restaurant Growth Plan',
      tier: 'growth',
      basePriceMinor: '2990000', // ₹29,900.00
      currency: 'INR',
      billingInterval: 'monthly',
      features: ['dine_qr', 'dag_prep_scheduler', 'companion_join', 'realtime_kds'],
      limits: {
        tables: { key: 'tables', name: 'Max Seating Tables', limit: 50, enforced: true, unit: 'tables' },
        orders: { key: 'orders', name: 'Monthly Orders', limit: 15000, enforced: true, unit: 'orders' },
      },
      addons: [],
    },
    {
      id: 'plan_celebrations_pro',
      name: 'Celebrations Studio Pro',
      tier: 'pro',
      basePriceMinor: '4990000',
      currency: 'INR',
      billingInterval: 'monthly',
      features: ['motion_timeline', 'canvas_inspector', '3d_particles'],
      limits: {
        renders: { key: 'renders', name: 'Monthly HD Renders', limit: 500, enforced: true, unit: 'renders' },
      },
      addons: [],
    },
  ];

  list(): CentralPlanDefinition[] {
    return PlanRepository.plans;
  }

  findById(id: string): CentralPlanDefinition | undefined {
    return PlanRepository.plans.find((p) => p.id === id);
  }

  save(plan: CentralPlanDefinition): void {
    const idx = PlanRepository.plans.findIndex((p) => p.id === plan.id);
    if (idx >= 0) PlanRepository.plans[idx] = plan;
    else PlanRepository.plans.push(plan);
  }
}

export class FeatureRepository {
  getFeatures(projectId: string): Record<string, boolean> {
    const desired = store.getDesiredState(projectId) || {};
    return desired.features || {};
  }

  setFeatures(projectId: string, features: Record<string, boolean>): void {
    const desired = store.getDesiredState(projectId) || {};
    desired.features = { ...(desired.features || {}), ...features };
    store.saveDesiredState(projectId, desired);
  }
}

export class EntitlementRepository {
  getEntitlements(projectId: string): Record<string, { limit: number; used: number; enforced: boolean }> {
    const desired = store.getDesiredState(projectId) || {};
    return desired.entitlements || {};
  }

  setEntitlements(projectId: string, entitlements: Record<string, { limit: number; used: number; enforced: boolean }>): void {
    const desired = store.getDesiredState(projectId) || {};
    desired.entitlements = entitlements;
    store.saveDesiredState(projectId, desired);
  }
}

export class QuoteRepository {
  private static quotes: Map<string, CentralQuoteResponse> = new Map();

  save(quote: CentralQuoteResponse): void {
    QuoteRepository.quotes.set(quote.quoteId, quote);
  }

  findById(quoteId: string): CentralQuoteResponse | undefined {
    return QuoteRepository.quotes.get(quoteId);
  }
}

export class EnvironmentRepository {
  findByProject(projectId: string): EnvironmentRecord[] {
    return store.getEnvironments(projectId);
  }

  findById(projectId: string, envId: string): EnvironmentRecord | undefined {
    return store.getEnvironments(projectId).find((e) => e.id === envId);
  }

  save(projectId: string, env: EnvironmentRecord): void {
    const list = store.getEnvironments(projectId);
    const idx = list.findIndex((e) => e.id === env.id);
    if (idx >= 0) list[idx] = env;
    else list.push(env);
    store.saveEnvironments(projectId, list);
  }
}

export class RuntimeRepository {
  getSession(projectId: string): RuntimeSessionRecord | undefined {
    return store.getSession(projectId);
  }

  saveSession(session: RuntimeSessionRecord): void {
    store.saveSession(session);
  }
}

export class RevisionRepository {
  list(projectId: string): ConfigurationRevision[] {
    return store.getRevisions(projectId);
  }

  findById(projectId: string, revisionId: string): ConfigurationRevision | undefined {
    return store.getRevisions(projectId).find((r) => r.revisionId === revisionId);
  }

  findByNumber(projectId: string, revisionNumber: number): ConfigurationRevision | undefined {
    return store.getRevisions(projectId).find((r) => r.revisionNumber === revisionNumber);
  }

  getLatest(projectId: string): ConfigurationRevision | undefined {
    const list = store.getRevisions(projectId);
    return list[0];
  }

  save(projectId: string, revision: ConfigurationRevision): void {
    store.saveRevision(projectId, revision);
  }
}

export class AuditRepository {
  record(entry: ProjectAuditEntry): void {
    store.saveAudit(entry);
  }

  list(projectId?: string): ProjectAuditEntry[] {
    return store.getAudits(projectId);
  }
}

export class CommandRepository {
  issue(cmd: ControlCommand): void {
    store.saveCommand(cmd);
  }

  getPending(projectId?: string): ControlCommand[] {
    return store.getCommands(projectId).filter((c) => c.status === 'QUEUED');
  }

  list(projectId?: string): ControlCommand[] {
    return store.getCommands(projectId);
  }

  complete(commandId: string, result?: Record<string, any>, error?: string): void {
    const cmds = store.getCommands();
    const cmd = cmds.find((c) => c.commandId === commandId);
    if (cmd) {
      cmd.status = error ? 'FAILED' : 'COMPLETED';
      cmd.completedAt = new Date().toISOString();
      cmd.result = result;
      cmd.error = error;
      store.saveCommand(cmd);
    }
  }
}

export interface PlatformRepositories {
  projects: ProjectRepository;
  plugins: PluginRepository;
  apis: ApiRepository;
  plans: PlanRepository;
  features: FeatureRepository;
  entitlements: EntitlementRepository;
  quotes: QuoteRepository;
  environments: EnvironmentRepository;
  runtimes: RuntimeRepository;
  revisions: RevisionRepository;
  audits: AuditRepository;
  commands: CommandRepository;
}

export const platformRepositories: PlatformRepositories = {
  projects: new ProjectRepository(),
  plugins: new PluginRepository(),
  apis: new ApiRepository(),
  plans: new PlanRepository(),
  features: new FeatureRepository(),
  entitlements: new EntitlementRepository(),
  quotes: new QuoteRepository(),
  environments: new EnvironmentRepository(),
  runtimes: new RuntimeRepository(),
  revisions: new RevisionRepository(),
  audits: new AuditRepository(),
  commands: new CommandRepository(),
};

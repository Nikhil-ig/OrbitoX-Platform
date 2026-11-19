/**
 * 🪐 Usage Tracking Service & Persistent Usage Store
 * Real usage counter tracking, quota window resets, plan derivations, and audit integration for OrbitoX Platform.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type {
  UsageWindow,
  UsageCounterRecord,
  CentralPlanDefinition,
  ProjectAuditEntry,
} from '../types';

export interface PersistentUsageData {
  projects: Record<string, Record<string, UsageCounterRecord>>;
}

export function isWindowExpired(
  window: UsageWindow,
  lastResetAt: string | Date,
  now: Date = new Date()
): boolean {
  if (window === 'never') return false;
  const last = typeof lastResetAt === 'string' ? new Date(lastResetAt) : lastResetAt;
  if (Number.isNaN(last.getTime())) return true;

  if (window === 'daily') {
    return (
      now.getUTCFullYear() !== last.getUTCFullYear() ||
      now.getUTCMonth() !== last.getUTCMonth() ||
      now.getUTCDate() !== last.getUTCDate()
    );
  }

  if (window === 'monthly') {
    return (
      now.getUTCFullYear() !== last.getUTCFullYear() ||
      now.getUTCMonth() !== last.getUTCMonth()
    );
  }

  return false;
}

export class PersistentUsageStore {
  private static instance: PersistentUsageStore;
  private filePath: string;
  private data: PersistentUsageData;
  private saveTimeout: any = null;

  public constructor(customFilePath?: string) {
    if (customFilePath) {
      this.filePath = customFilePath;
    } else {
      const candidates = [
        path.resolve(process.cwd(), 'orbitox/data'),
        path.resolve(process.cwd(), 'data'),
        path.resolve(process.cwd(), '../../data'),
        path.resolve(__dirname, '../../../../data'),
      ];

      let dataDir: string = candidates[0] || path.resolve(process.cwd(), 'data');
      for (const cand of candidates) {
        if (fs.existsSync(cand) || cand.includes('data')) {
          dataDir = cand;
          break;
        }
      }

      const configuredDir = process.env.ORBITOX_DATA_DIR?.trim();
      if (configuredDir) {
        dataDir = path.resolve(configuredDir);
      }

      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch {
          dataDir = path.resolve(process.cwd(), '.orbitox_state');
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        }
      }

      this.filePath = path.join(dataDir, 'platform-usage-store.json');
    }

    this.data = this.loadOrCreateDefault();
  }

  public static getInstance(): PersistentUsageStore {
    if (!PersistentUsageStore.instance) {
      PersistentUsageStore.instance = new PersistentUsageStore();
    }
    return PersistentUsageStore.instance;
  }

  public static resetInstanceForTesting(customFilePath?: string): PersistentUsageStore {
    PersistentUsageStore.instance = new PersistentUsageStore(customFilePath);
    return PersistentUsageStore.instance;
  }

  private loadOrCreateDefault(): PersistentUsageData {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          projects: parsed.projects || {},
        };
      } catch (err) {
        console.error('[PersistentUsageStore] Error reading file, re-initializing default:', err);
      }
    }

    return {
      projects: {},
    };
  }

  public saveDebounced(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate();
    }, 150);
  }

  public saveImmediate(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[PersistentUsageStore] Failed to save usage state to disk:', err);
    }
  }

  private checkAndResetCounter(counter: UsageCounterRecord, now: Date): boolean {
    if (isWindowExpired(counter.window, counter.lastResetAt, now)) {
      counter.count = 0;
      counter.lastResetAt = now.toISOString();
      return true;
    }
    return false;
  }

  public incrementUsage(
    projectId: string,
    key: string,
    amount: number,
    window: UsageWindow,
    now: Date = new Date()
  ): { count: number; prevCount: number; resetOccurred: boolean } {
    if (!this.data.projects[projectId]) {
      this.data.projects[projectId] = {};
    }

    const projectCounters = this.data.projects[projectId]!;
    let counter = projectCounters[key];
    let resetOccurred = false;

    if (!counter) {
      counter = {
        count: 0,
        window,
        lastResetAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      projectCounters[key] = counter;
    } else {
      if (counter.window !== window) {
        counter.window = window;
      }
      resetOccurred = this.checkAndResetCounter(counter, now);
    }

    const prevCount = counter.count;
    counter.count += amount;
    counter.updatedAt = now.toISOString();

    this.saveDebounced();

    return {
      count: counter.count,
      prevCount,
      resetOccurred,
    };
  }

  public getUsage(
    projectId: string,
    key: string,
    now: Date = new Date()
  ): UsageCounterRecord | undefined {
    const projectCounters = this.data.projects[projectId];
    if (!projectCounters) return undefined;

    const counter = projectCounters[key];
    if (!counter) return undefined;

    const reset = this.checkAndResetCounter(counter, now);
    if (reset) {
      this.saveDebounced();
    }
    return { ...counter };
  }

  public getProjectUsage(
    projectId: string,
    now: Date = new Date()
  ): Record<string, UsageCounterRecord> {
    const projectCounters = this.data.projects[projectId];
    if (!projectCounters) return {};

    let anyReset = false;
    const result: Record<string, UsageCounterRecord> = {};

    for (const [key, counter] of Object.entries(projectCounters)) {
      if (this.checkAndResetCounter(counter, now)) {
        anyReset = true;
      }
      result[key] = { ...counter };
    }

    if (anyReset) {
      this.saveDebounced();
    }

    return result;
  }

  public resetUsage(
    projectId: string,
    key?: string,
    now: Date = new Date()
  ): void {
    const projectCounters = this.data.projects[projectId];
    if (!projectCounters) return;

    if (key) {
      if (projectCounters[key]) {
        projectCounters[key].count = 0;
        projectCounters[key].lastResetAt = now.toISOString();
        projectCounters[key].updatedAt = now.toISOString();
      }
    } else {
      for (const counter of Object.values(projectCounters)) {
        counter.count = 0;
        counter.lastResetAt = now.toISOString();
        counter.updatedAt = now.toISOString();
      }
    }

    this.saveImmediate();
  }
}

export interface UsageReportResult {
  key: string;
  limit: number;
  used: number;
  enforced: boolean;
  allowed: boolean;
  remaining: number;
  firstExceeded: boolean;
}

export interface IQuoteService {
  getPlan(planId: string): CentralPlanDefinition | undefined;
  listPlans(): CentralPlanDefinition[];
}

export interface IRuntimeController {
  getProject(projectId: string): any;
  getDesiredState(projectId: string): any;
  recordAudit(entry: ProjectAuditEntry): void;
  getAudits(projectId?: string): ProjectAuditEntry[];
}

export class UsageTrackingService {
  private usageStore: PersistentUsageStore;
  private quoteService?: IQuoteService;
  private runtimeController?: IRuntimeController;

  constructor(
    usageStore?: PersistentUsageStore,
    quoteService?: IQuoteService,
    runtimeController?: IRuntimeController
  ) {
    this.usageStore = usageStore || PersistentUsageStore.getInstance();
    this.quoteService = quoteService;
    this.runtimeController = runtimeController;
  }

  public setQuoteService(quoteService: IQuoteService): void {
    this.quoteService = quoteService;
  }

  public setRuntimeController(runtimeController: IRuntimeController): void {
    this.runtimeController = runtimeController;
  }

  public getActivePlan(projectId: string): CentralPlanDefinition | undefined {
    const project = this.runtimeController?.getProject(projectId);
    const desiredState = this.runtimeController?.getDesiredState(projectId) || {};

    const planId =
      desiredState.activePlan ||
      project?.manifest?.planReferences?.[0] ||
      'plan_restaurant_growth';

    let plan = this.quoteService?.getPlan(planId);
    if (!plan && this.quoteService) {
      const allPlans = this.quoteService.listPlans();
      plan = allPlans[0];
    }
    return plan;
  }

  public resolveWindowForKey(projectId: string, key: string): UsageWindow {
    const plan = this.getActivePlan(projectId);
    const planLimit = plan?.limits?.[key];
    if (planLimit?.window) return planLimit.window;

    const keyLower = key.toLowerCase();
    if (keyLower.includes('daily')) return 'daily';
    if (keyLower === 'tables' || keyLower === 'kdsscreens' || keyLower === 'seats') return 'never';
    if (keyLower.includes('month') || plan?.billingInterval === 'monthly') return 'monthly';

    return 'monthly';
  }

  public resolveLimitForKey(
    projectId: string,
    key: string
  ): { limit: number; enforced: boolean; window: UsageWindow; unit: string } {
    const plan = this.getActivePlan(projectId);
    const planLimit = plan?.limits?.[key];
    const desiredState = this.runtimeController?.getDesiredState(projectId) || {};
    const override = desiredState.entitlements?.[key];

    const limit = typeof override?.limit === 'number'
      ? override.limit
      : (planLimit?.limit ?? Infinity);

    const enforced = typeof override?.enforced === 'boolean'
      ? override.enforced
      : (planLimit?.enforced ?? false);

    const window = override?.window || planLimit?.window || this.resolveWindowForKey(projectId, key);
    const unit = planLimit?.unit || 'units';

    return { limit, enforced, window, unit };
  }

  public getProjectEntitlements(
    projectId: string,
    now: Date = new Date()
  ): Record<string, { limit: number; used: number; enforced: boolean }> {
    const plan = this.getActivePlan(projectId);
    const planLimits = plan?.limits || {};
    const desiredState = this.runtimeController?.getDesiredState(projectId) || {};
    const overrides = desiredState.entitlements || {};
    const usageRecords = this.usageStore.getProjectUsage(projectId, now);

    const allKeys = new Set<string>([
      ...Object.keys(planLimits),
      ...Object.keys(overrides),
      ...Object.keys(usageRecords),
    ]);

    const result: Record<string, { limit: number; used: number; enforced: boolean }> = {};

    for (const key of allKeys) {
      const { limit, enforced } = this.resolveLimitForKey(projectId, key);
      const used = usageRecords[key]?.count ?? 0;
      result[key] = {
        limit,
        used,
        enforced,
      };
    }

    return result;
  }

  public reportUsage(
    projectId: string,
    key: string,
    amount: number = 1,
    now: Date = new Date()
  ): UsageReportResult {
    const { limit, enforced, window } = this.resolveLimitForKey(projectId, key);

    const inc = this.usageStore.incrementUsage(projectId, key, amount, window, now);
    const used = inc.count;
    const prevCount = inc.prevCount;

    // Hitting or exceeding an enforced limit flips allowed to false
    const allowed = !enforced || used < limit;
    const remaining = Math.max(0, limit - used);

    // First time crossing the enforced limit
    const wasExceededBefore = enforced && prevCount >= limit;
    const isExceededNow = enforced && used >= limit;
    const firstExceeded = !wasExceededBefore && isExceededNow;

    if (firstExceeded && this.runtimeController) {
      this.runtimeController.recordAudit({
        id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        projectId,
        timestamp: now.toISOString(),
        actor: 'runtime',
        action: 'USAGE_LIMIT_EXCEEDED',
        status: 'DENIED',
        details: {
          key,
          limit,
          used,
          enforced: true,
          window,
        },
      });
    }

    return {
      key,
      limit,
      used,
      enforced,
      allowed,
      remaining,
      firstExceeded,
    };
  }

  public resetUsage(
    projectId: string,
    key?: string,
    now: Date = new Date()
  ): void {
    this.usageStore.resetUsage(projectId, key, now);

    if (this.runtimeController) {
      this.runtimeController.recordAudit({
        id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        projectId,
        timestamp: now.toISOString(),
        actor: 'admin',
        action: 'USAGE_COUNTER_RESET',
        status: 'SUCCESS',
        details: {
          key: key || 'ALL_KEYS',
        },
      });
    }
  }

  public getStore(): PersistentUsageStore {
    return this.usageStore;
  }
}

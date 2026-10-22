import { ApiRegistryEntry, ApiRegistrationMeta } from '../types';

export class ApiRegistryService {
  private static apis: Map<string, ApiRegistryEntry> = new Map();
  private static initialized = false;

  constructor() {
    ApiRegistryService.initialize();
  }

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Seed default canonical RestaurantOS APIs
    const restaurantApis: ApiRegistryEntry[] = [
      {
        projectId: 'project_restaurant_os',
        pluginId: '@orbitox/pos',
        name: 'restaurant.quote',
        route: '/api/restaurant/quote',
        method: 'POST',
        version: 'v1.0.0',
        requiresAuth: false,
        scopes: ['pos.quote', 'diner.public'],
        rateLimitPerMin: 300,
        webhookSupported: false,
        status: 'ACTIVE',
        health: 'HEALTHY',
        permissions: ['restaurant.quote.calculate'],
        description: 'Computes deterministic minor-unit quotes with SHA-256 cryptographic integrity hashes.',
        totalInvocations: 1420,
      },
      {
        projectId: 'project_restaurant_os',
        pluginId: '@orbitox/pos',
        name: 'restaurant.orders',
        route: '/api/restaurant/orders',
        method: 'POST',
        version: 'v1.0.0',
        requiresAuth: true,
        scopes: ['pos.orders.write', 'diner.order'],
        rateLimitPerMin: 120,
        webhookSupported: true,
        status: 'ACTIVE',
        health: 'HEALTHY',
        permissions: ['restaurant.order.create'],
        description: 'Double-idempotent order submission and kitchen DAG task compilation.',
        totalInvocations: 852,
      },
      {
        projectId: 'project_restaurant_os',
        pluginId: '@orbitox/pos',
        name: 'restaurant.kds',
        route: '/api/restaurant/kds',
        method: 'GET',
        version: 'v1.0.0',
        requiresAuth: true,
        scopes: ['kitchen.read', 'staff.kds'],
        rateLimitPerMin: 600,
        webhookSupported: true,
        status: 'ACTIVE',
        health: 'HEALTHY',
        permissions: ['restaurant.kds.view'],
        description: 'Fetches real-time preparation task queues filtered by kitchen station line.',
        totalInvocations: 4321,
      },
      {
        projectId: 'project_restaurant_os',
        pluginId: '@orbitox/pos',
        name: 'restaurant.menu',
        route: '/api/restaurant/menu',
        method: 'GET',
        version: 'v1.0.0',
        requiresAuth: false,
        scopes: ['diner.public', 'menu.read'],
        rateLimitPerMin: 1000,
        webhookSupported: false,
        status: 'ACTIVE',
        health: 'HEALTHY',
        permissions: ['restaurant.menu.read'],
        description: 'Retrieves public culinary menu categories, modifier groups, and allergen tags.',
        totalInvocations: 6510,
      },
      {
        projectId: 'project_restaurant_os',
        pluginId: '@orbitox/pos',
        name: 'restaurant.sessions',
        route: '/api/restaurant/sessions/join',
        method: 'POST',
        version: 'v1.0.0',
        requiresAuth: false,
        scopes: ['diner.join', 'session.write'],
        rateLimitPerMin: 200,
        webhookSupported: true,
        status: 'ACTIVE',
        health: 'HEALTHY',
        permissions: ['restaurant.session.join'],
        description: 'Issues ephemeral GuestCapability tokens for dining party participants.',
        totalInvocations: 940,
      },
      {
        projectId: 'project_restaurant_os',
        pluginId: '@orbitox/pos',
        name: 'restaurant.tables',
        route: '/api/restaurant/qr/:locator',
        method: 'GET',
        version: 'v1.0.0',
        requiresAuth: false,
        scopes: ['diner.public', 'table.discover'],
        rateLimitPerMin: 1200,
        webhookSupported: false,
        status: 'ACTIVE',
        health: 'HEALTHY',
        permissions: ['restaurant.table.discover'],
        description: 'Resolves physical table discovery context without leaking active session state.',
        totalInvocations: 12400,
      },
    ];

    for (const api of restaurantApis) {
      const key = `${api.projectId}:${api.name}`;
      this.apis.set(key, api);
    }
  }

  public registerApi(projectId: string, pluginId: string, meta: ApiRegistrationMeta): ApiRegistryEntry {
    ApiRegistryService.initialize();
    const key = `${projectId}:${meta.name}`;
    const existing = ApiRegistryService.apis.get(key);

    const entry: ApiRegistryEntry = {
      ...meta,
      projectId,
      pluginId,
      webhookSupported: existing ? existing.webhookSupported : false,
      status: 'ACTIVE',
      health: 'HEALTHY',
      permissions: [`${projectId}.${meta.name}`],
      rateLimitPerMin: meta.rateLimitPerMin || 300,
      totalInvocations: existing ? existing.totalInvocations : 0,
      lastInvokedAt: existing?.lastInvokedAt,
    };

    ApiRegistryService.apis.set(key, entry);
    return entry;
  }

  public listApis(projectId?: string): ApiRegistryEntry[] {
    ApiRegistryService.initialize();
    const all = Array.from(ApiRegistryService.apis.values());
    if (projectId) {
      return all.filter((a) => a.projectId === projectId);
    }
    return all;
  }

  public getApi(projectId: string, name: string): ApiRegistryEntry | undefined {
    ApiRegistryService.initialize();
    return ApiRegistryService.apis.get(`${projectId}:${name}`);
  }

  public updateApi(projectId: string, name: string, updates: Partial<ApiRegistryEntry>): ApiRegistryEntry | undefined {
    ApiRegistryService.initialize();
    const key = `${projectId}:${name}`;
    const entry = ApiRegistryService.apis.get(key);
    if (!entry) return undefined;

    const updated = { ...entry, ...updates };
    ApiRegistryService.apis.set(key, updated);
    return updated;
  }

  public recordInvocation(projectId: string, name: string): void {
    const entry = this.getApi(projectId, name);
    if (entry) {
      entry.totalInvocations += 1;
      entry.lastInvokedAt = new Date().toISOString();
    }
  }
}

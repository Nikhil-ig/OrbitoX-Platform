/**
 * 🪐 OrbitoX SDK - Tenants Resource
 */

import { HttpTransport } from './transport';
import { OperationsResource, PlatformOperationResponse } from './operations';

export interface TenantPluginConfig {
  pluginId: string;
  planId?: string;
  config?: Record<string, any>;
}

export interface TenantCreateInput {
  name: string;
  slug: string;
  organizationId?: string;
  organisation?: string;
  environment?: 'production' | 'staging' | 'development';
  region?: string;
  plugins: Array<string | TenantPluginConfig>;
}

export interface TenantCreateResponse {
  tenantId: string;
  operationId: string;
  status: string;
  apiKey?: {
    id: string;
    prefix: string;
    secret: string;
  };
  operation?: PlatformOperationResponse;
}

export interface TenantCreateOptions {
  waitUntilReady?: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
  idempotencyKey?: string;
}

export interface TenantActionResponse {
  success: boolean;
  tenantId: string;
  status: string;
  plugins?: Record<string, any>;
}

export interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  status: string;
  environment: string;
  plugins: Array<{
    pluginId: string;
    status: string;
    plan?: string;
    version?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export class TenantsResource {
  constructor(
    private readonly transport: HttpTransport,
    private readonly operations: OperationsResource
  ) {}

  /**
   * Create a new tenant. Automatically provisions plugins and issues scoped API keys.
   * If `waitUntilReady: true` is passed, waits for the saga to reach COMPLETED state.
   */
  async create(
    input: TenantCreateInput,
    options: TenantCreateOptions = {}
  ): Promise<TenantCreateResponse> {
    const rawPlugins = input.plugins.map((p) => {
      if (typeof p === 'string') {
        const canonical = p.replace(/^@orbitox\//, '').toLowerCase();
        const id = canonical === 'hms' ? 'hospital-os' : canonical === 'restaurant' ? 'restaurant-os' : canonical;
        return { id, pluginId: id };
      }
      return {
        id: p.pluginId,
        pluginId: p.pluginId,
        ...(p.planId ? { plan: p.planId, planId: p.planId } : {}),
        config: p.config,
      };
    });

    const payload = {
      name: input.name,
      slug: input.slug,
      organizationId: input.organizationId || input.organisation,
      environment: input.environment || 'production',
      region: input.region || 'ap-south-1',
      plugins: rawPlugins,
    };

    const res = await this.transport.request<TenantCreateResponse>({
      method: 'POST',
      path: '/api/v1/tenants',
      body: payload,
      idempotencyKey: options.idempotencyKey,
    });

    if (options.waitUntilReady && res.operationId) {
      const completedOp = await this.operations.waitUntilReady(res.operationId, {
        pollIntervalMs: options.pollIntervalMs,
        timeoutMs: options.timeoutMs,
      });

      const canonicalTenantId = completedOp.result?.tenantId || completedOp.tenantId || res.tenantId;
      return {
        ...res,
        tenantId: canonicalTenantId,
        status: completedOp.status,
        operation: completedOp,
      };
    }

    return res;
  }

  async get(tenantId: string): Promise<TenantDetails> {
    return this.transport.request<TenantDetails>({
      method: 'GET',
      path: `/api/v1/tenants/${encodeURIComponent(tenantId)}`,
    });
  }

  async suspend(
    tenantId: string,
    options: { idempotencyKey?: string } = {}
  ): Promise<TenantActionResponse> {
    return this.transport.request<TenantActionResponse>({
      method: 'POST',
      path: `/api/v1/tenants/${encodeURIComponent(tenantId)}/suspend`,
      idempotencyKey: options.idempotencyKey,
    });
  }

  async resume(
    tenantId: string,
    options: { idempotencyKey?: string } = {}
  ): Promise<TenantActionResponse> {
    return this.transport.request<TenantActionResponse>({
      method: 'POST',
      path: `/api/v1/tenants/${encodeURIComponent(tenantId)}/resume`,
      idempotencyKey: options.idempotencyKey,
    });
  }
}

import {
  signBridgeRequest,
  getDefaultBridgeKeys,
  type BridgeKeys,
} from '@orbitox-io/bridge';
import type {
  DataRightsContext,
  ErasureMode,
  PluginDataRightsAdapter,
  PrincipalCorrectionPatch,
  PrincipalCorrectionSummary,
  PrincipalErasureSummary,
  PrincipalExportSummary,
  PrincipalRef,
  TenantErasureSummary,
  TenantExportTableChunk,
} from '@orbitox-io/plugin-engine';
import { PLUGIN_DATA_CONTRACT_VERSION } from '@orbitox-io/plugin-engine';
import { HttpError } from '@/server/db/db-errors';

export interface RestaurantOsAdapterOptions {
  baseUrl?: string;
  bridgeKeys?: BridgeKeys;
  fetcher?: typeof fetch;
}

export class RestaurantOsDataRightsAdapter implements PluginDataRightsAdapter {
  readonly contractVersion = PLUGIN_DATA_CONTRACT_VERSION;
  readonly pluginId = '@orbitox/restaurant';

  private readonly baseUrl: string;
  private readonly bridgeKeys?: BridgeKeys;
  private readonly fetcher: typeof fetch;
  private readonly principal = {
    sub: 'platform_data_rights',
    scopes: ['platform:superuser', 'data-rights:*', 'tenant:admin'],
  };

  constructor(options: RestaurantOsAdapterOptions = {}) {
    this.baseUrl = (
      options.baseUrl ||
      process.env.RESTAURANTOS_RUNTIME_URL ||
      process.env.RESTAURANT_STORE_URL ||
      'http://127.0.0.1:4010'
    ).replace(/\/$/, '');
    this.bridgeKeys = options.bridgeKeys;
    this.fetcher = options.fetcher ?? fetch;
  }

  private getKeys(): BridgeKeys {
    return this.bridgeKeys || getDefaultBridgeKeys();
  }

  private async postBridge<T>(
    endpointPath: string,
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const rawBody = JSON.stringify(payload);
    const signedHeaders = signBridgeRequest(this.getKeys(), {
      method: 'POST',
      pathWithQuery: endpointPath,
      tenantId,
      principal: this.principal,
      body: rawBody,
    });

    const res = await this.fetcher(`${this.baseUrl}${endpointPath}`, {
      method: 'POST',
      headers: {
        ...signedHeaders,
        'content-type': 'application/json',
      },
      body: rawBody,
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new HttpError(
        res.status >= 400 && res.status < 600 ? res.status : 502,
        data?.code || data?.error || 'RESTAURANT_BRIDGE_ERROR',
        data?.message || `RestaurantOS bridge returned HTTP ${res.status}`,
      );
    }

    return data as T;
  }

  async *exportTenant(
    tenantId: string,
    context: DataRightsContext,
  ): AsyncIterable<TenantExportTableChunk> {
    const res = await this.postBridge<{
      chunks?: TenantExportTableChunk[];
    }>('/orbitox/data-rights/export', tenantId, { context });

    for (const chunk of res.chunks || []) {
      yield chunk;
    }
  }

  async eraseTenant(
    tenantId: string,
    mode: ErasureMode,
    context: DataRightsContext,
  ): Promise<TenantErasureSummary> {
    return this.postBridge<TenantErasureSummary>(
      '/orbitox/data-rights/erase',
      tenantId,
      { mode, context },
    );
  }

  async principalExport(
    tenantId: string,
    principal: PrincipalRef,
    context: DataRightsContext,
  ): Promise<PrincipalExportSummary> {
    return this.postBridge<PrincipalExportSummary>(
      '/orbitox/data-rights/principal/export',
      tenantId,
      { principal, context },
    );
  }

  async principalCorrect(
    tenantId: string,
    principal: PrincipalRef,
    patch: PrincipalCorrectionPatch,
    context: DataRightsContext,
  ): Promise<PrincipalCorrectionSummary> {
    return this.postBridge<PrincipalCorrectionSummary>(
      '/orbitox/data-rights/principal/correct',
      tenantId,
      { principal, patch, context },
    );
  }

  async principalErase(
    tenantId: string,
    principal: PrincipalRef,
    mode: ErasureMode,
    context: DataRightsContext,
  ): Promise<PrincipalErasureSummary> {
    return this.postBridge<PrincipalErasureSummary>(
      '/orbitox/data-rights/principal/erase',
      tenantId,
      { principal, mode, context },
    );
  }
}

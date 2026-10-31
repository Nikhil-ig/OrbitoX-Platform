/**
 * 🛰️ OrbitoX Platform -> RestaurantOS Bridge Lifecycle Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 * 1. Cryptographically signs all lifecycle calls (provision, suspend, resume, planChanged)
 *    using @orbitox-io/bridge (HMAC-SHA256, 60s skew, nonce replay protection).
 * 2. Manages idempotency keys and entitlement revisions.
 * 3. Retries failed calls with exponential backoff (up to 3 attempts).
 * 4. Updates package installation state and records audit records on the platform.
 */

import * as crypto from 'crypto';
import {
  signBridgeRequest,
  getDefaultBridgeKeys,
  BridgeKeys,
} from '@orbitox-io/bridge';
import { platformRepository } from './platform-repository';

export interface LifecycleResult {
  ok: boolean;
  tenantId?: string;
  status?: string;
  planId?: string;
  revision?: number;
  replayed?: boolean;
  ignored?: boolean;
  error?: string;
  statusCode?: number;
}

export class RestaurantBridgeClient {
  private baseUrl: string;
  private keys?: BridgeKeys;
  private principal = {
    sub: 'platform_control_plane',
    scopes: ['tenant:admin', 'platform:superuser', 'lifecycle:*'],
  };

  constructor(options?: { baseUrl?: string; keys?: BridgeKeys }) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.RESTAURANTOS_RUNTIME_URL ||
      process.env.RESTAURANT_STORE_URL ||
      'http://127.0.0.1:4010'
    ).replace(/\/$/, '');
    this.keys = options?.keys;
  }

  private getKeys(): BridgeKeys {
    return this.keys || getDefaultBridgeKeys();
  }

  /**
   * Internal request sender with exponential backoff retry for transient network errors.
   */
  private async sendLifecycleRequest(
    method: string,
    endpointPath: string,
    tenantId: string,
    payload: Record<string, any>,
    maxRetries = 3
  ): Promise<LifecycleResult> {
    const keys = this.getKeys();
    const rawBody = JSON.stringify(payload);
    let lastErr: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const signedHeaders = signBridgeRequest(keys, {
          method,
          pathWithQuery: endpointPath,
          tenantId,
          principal: this.principal,
          body: rawBody,
        });

        const url = `${this.baseUrl}${endpointPath}`;
        const res = await fetch(url, {
          method,
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

        if (res.ok) {
          return {
            ok: true,
            tenantId: data.tenantId || tenantId,
            status: data.status,
            planId: data.planId,
            revision: data.revision,
            replayed: data.replayed,
            ignored: data.ignored,
            statusCode: res.status,
          };
        }

        // 4xx client errors should not be retried (except 429)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          return {
            ok: false,
            error: data.message || data.error || `HTTP ${res.status}`,
            statusCode: res.status,
          };
        }

        lastErr = new Error(`HTTP ${res.status}: ${data.message || data.error || text}`);
      } catch (networkErr: any) {
        lastErr = networkErr;
      }

      if (attempt < maxRetries) {
        const backoffMs = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    return {
      ok: false,
      error: lastErr?.message || 'Network request failed after retries',
      statusCode: 502,
    };
  }

  /**
   * Records lifecycle execution result on installation and audit log.
   */
  private async recordInstallationResult(
    tenantId: string,
    action: string,
    result: LifecycleResult
  ): Promise<void> {
    try {
      // If platform DB env vars are not set (e.g. standalone test or external runtime), skip platform repository sync
      if (!process.env.APP_DATABASE_URL || !process.env.PLATFORM_AUDIT_DATABASE_URL) {
        return;
      }

      // Find environment/installation for this tenant
      const parts = tenantId.split('/');
      const orgId = parts[1];
      const projectId = parts[3];
      const envName = parts[5];

      if (projectId) {
        const project = await platformRepository.getProject(projectId);
        if (project) {
          const envs = await platformRepository.listEnvironments(project.id);
          const env = envs.find((e) => e.name === envName || e.isProduction) || envs[0];
          if (env) {
            const installations = await platformRepository.listInstallations(env.id);
            for (const inst of installations) {
              const prevConfig = inst.configOverrides || {};
              await platformRepository.installPackage(
                env.id,
                inst.packageId,
                inst.installedVersionId,
                {
                  ...prevConfig,
                  lastLifecycleAction: action,
                  lastLifecycleStatus: result.ok ? 'SUCCESS' : 'FAILED',
                  lastLifecycleTimestamp: new Date().toISOString(),
                  restaurantOsStatus: result.status,
                  entitlementRevision: result.revision,
                }
              );
            }
          }
        }
      }

      await platformRepository.recordPlatformAdminAudit({
        action: `restaurant.lifecycle.${action.toLowerCase()}`,
        entityType: 'RESTAURANT_TENANT',
        entityId: tenantId,
        organizationId: orgId,
        actorId: 'platform_control_plane',
        reason: `Executed RestaurantOS lifecycle hook: ${action}`,
        metadata: {
          tenantId,
          action,
          ok: result.ok,
          status: result.status,
          revision: result.revision,
          error: result.error,
        },
      });
    } catch (auditErr) {
      console.warn('[RestaurantBridgeClient] Failed to record audit/installation update:', auditErr);
    }
  }

  /**
   * Provision a new restaurant tenant runtime.
   */
  async provisionTenant(input: {
    tenantId: string;
    restaurantName: string;
    slug: string;
    planId?: string;
    revision?: number;
    idempotencyKey?: string;
  }): Promise<LifecycleResult> {
    const idempotencyKey = input.idempotencyKey || `idem_prov_${crypto.randomBytes(8).toString('hex')}`;
    const payload = {
      tenantId: input.tenantId,
      restaurantName: input.restaurantName,
      slug: input.slug,
      planId: input.planId || 'growth',
      revision: input.revision ?? 1,
      idempotencyKey,
    };

    let res: LifecycleResult;
    try {
      res = await this.sendLifecycleRequest('POST', '/orbitox/lifecycle/provision', input.tenantId, payload);
    } catch (sendErr: any) {
      await platformRepository.provisionPluginInstallation({
        tenantId: input.tenantId,
        pluginId: '@orbitox/restaurant',
        runtimeTenantId: input.tenantId,
        status: 'FAILED',
        planId: input.planId || 'growth',
        entitlementRevision: input.revision ?? 1,
      });
      throw sendErr;
    }

    const installationStatus = res.ok ? 'ACTIVE' : 'FAILED';
    await platformRepository.provisionPluginInstallation({
      tenantId: input.tenantId,
      pluginId: '@orbitox/restaurant',
      runtimeTenantId: input.tenantId,
      status: installationStatus,
      planId: input.planId || 'growth',
      entitlementRevision: input.revision ?? 1,
    });
    await this.recordInstallationResult(input.tenantId, 'PROVISION', res);
    return res;
  }

  /**
   * Suspend a restaurant tenant runtime.
   */
  async suspendTenant(
    tenantId: string,
    revision = 1,
    idempotencyKey?: string
  ): Promise<LifecycleResult> {
    const payload = {
      tenantId,
      revision,
      idempotencyKey: idempotencyKey || `idem_susp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    };

    const res = await this.sendLifecycleRequest('POST', '/orbitox/lifecycle/suspend', tenantId, payload);
    if (res.ok) {
      await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'SUSPENDED');
    }
    await this.recordInstallationResult(tenantId, 'SUSPEND', res);
    return res;
  }

  /**
   * Resume a suspended restaurant tenant runtime.
   */
  async resumeTenant(
    tenantId: string,
    revision = 1,
    idempotencyKey?: string
  ): Promise<LifecycleResult> {
    const payload = {
      tenantId,
      revision,
      idempotencyKey: idempotencyKey || `idem_resm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    };

    const res = await this.sendLifecycleRequest('POST', '/orbitox/lifecycle/resume', tenantId, payload);
    if (res.ok) {
      await platformRepository.updatePluginInstallationStatus(tenantId, '@orbitox/restaurant', 'ACTIVE');
    }
    await this.recordInstallationResult(tenantId, 'RESUME', res);
    return res;
  }

  /**
   * Notify runtime that tenant subscription plan or entitlements changed.
   */
  async changePlan(
    tenantId: string,
    planId: string,
    revision = 1,
    idempotencyKey?: string
  ): Promise<LifecycleResult> {
    const payload = {
      tenantId,
      planId,
      revision,
      idempotencyKey: idempotencyKey || `idem_plan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    };

    const res = await this.sendLifecycleRequest('POST', '/orbitox/lifecycle/plan-changed', tenantId, payload);
    await this.recordInstallationResult(tenantId, 'PLAN_CHANGED', res);
    return res;
  }
}

export const restaurantBridgeClient = new RestaurantBridgeClient();

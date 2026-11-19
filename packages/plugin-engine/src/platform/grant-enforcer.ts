import * as crypto from 'crypto';
import {
  verifyGrant,
  canUse,
  EntitlementClaims,
  GrantError,
  RevisionStore,
  MemoryRevisionStore,
} from './entitlement-token';
import { getPublicGrantKeys } from './grant-keys';

export interface GrantEnforcerOptions {
  audience: string;
  trustedKeys?: Record<string, crypto.KeyObject>;
  revisions?: RevisionStore;
  fetchGrant?: (tenantId: string, pluginId: string) => Promise<string | null>;
  allowOfflineReads?: boolean;
}

export interface CachedGrant {
  token: string;
  claims: EntitlementClaims;
  expiresAtMs: number;
}

export interface EnforcementResult {
  allowed: boolean;
  status?: number;
  code?: 'SERVICE_SUSPENDED' | 'FEATURE_NOT_IN_PLAN' | 'PAYMENT_REQUIRED' | 'PLATFORM_UNREACHABLE' | 'UNAUTHORIZED' | 'ROLLBACK';
  message?: string;
  claims?: EntitlementClaims;
}

export class PluginGrantEnforcer {
  public audience: string;
  public trustedKeys: Record<string, crypto.KeyObject>;
  public revisions: RevisionStore;
  public fetchGrant?: (tenantId: string, pluginId: string) => Promise<string | null>;
  public allowOfflineReads: boolean;

  private cache = new Map<string, CachedGrant>();

  constructor(options: GrantEnforcerOptions) {
    this.audience = options.audience;
    this.trustedKeys = options.trustedKeys || {};
    this.revisions = options.revisions || new MemoryRevisionStore();
    this.fetchGrant = options.fetchGrant;
    this.allowOfflineReads = options.allowOfflineReads ?? true;
  }

  public setTrustedKeys(keys: Record<string, crypto.KeyObject>): void {
    this.trustedKeys = { ...keys };
  }

  public setCachedGrant(tenantId: string, token: string, claims: EntitlementClaims): void {
    this.cache.set(tenantId, {
      token,
      claims,
      expiresAtMs: claims.exp * 1000,
    });
  }

  public getCachedGrant(tenantId: string): CachedGrant | undefined {
    return this.cache.get(tenantId);
  }

  public invalidate(tenantId?: string): void {
    if (tenantId) {
      this.cache.delete(tenantId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Evaluates request against signed entitlement grant:
   * 1. Extracts/pulls grant token.
   * 2. Verifies cryptographic signature against pinned Ed25519 keys.
   * 3. Checks rollback protection on monotonic revision.
   * 4. Enforces status and feature gating via canUse.
   */
  public async enforce(params: {
    tenantId: string;
    feature: string;
    write: boolean;
    token?: string;
    now?: number;
  }): Promise<EnforcementResult> {
    const { tenantId, feature, write } = params;
    const now = params.now ?? Date.now();
    let token = params.token;
    let claims: EntitlementClaims | undefined;

    const effectiveKeys = Object.keys(this.trustedKeys).length > 0 ? this.trustedKeys : getPublicGrantKeys();

    if (token) {
      try {
        claims = await verifyGrant<EntitlementClaims>(token, {
          type: 'orbitox-ent',
          audience: this.audience,
          subject: tenantId,
          trustedKeys: effectiveKeys,
          revisions: this.revisions,
          now,
        });
        this.setCachedGrant(tenantId, token, claims);
      } catch (err: any) {
        if (err instanceof GrantError && err.reason === 'ROLLBACK') {
          return { allowed: false, status: 403, code: 'ROLLBACK', message: 'Older grant revision rejected (ROLLBACK)' };
        }
        return { allowed: false, status: 403, code: 'UNAUTHORIZED', message: `Invalid grant: ${err.message}` };
      }
    } else {
      let cached = this.cache.get(tenantId);
      let isStale = false;
      if (cached && this.revisions) {
        try {
          const revKey = `orbitox-ent|${this.audience}|${tenantId}`;
          const currentRev = await this.revisions.highest(revKey);
          if (currentRev > (cached.claims.rev || 0)) {
            isStale = true;
            this.cache.delete(tenantId);
          }
        } catch {}
      }
      const isExpired = !cached || cached.expiresAtMs <= now || isStale;

      if (!isExpired && cached) {
        claims = cached.claims;
      } else {
        // Attempt pull from platform
        let freshToken: string | null = null;
        if (this.fetchGrant) {
          try {
            freshToken = await this.fetchGrant(tenantId, this.audience);
          } catch (err) {
            freshToken = null;
          }
        }

        if (freshToken) {
          try {
            claims = await verifyGrant<EntitlementClaims>(freshToken, {
              type: 'orbitox-ent',
              audience: this.audience,
              subject: tenantId,
              trustedKeys: effectiveKeys,
              revisions: this.revisions,
              now,
            });
            this.setCachedGrant(tenantId, freshToken, claims);
          } catch (err: any) {
            if (err instanceof GrantError && err.reason === 'ROLLBACK') {
              return { allowed: false, status: 403, code: 'ROLLBACK', message: 'Older grant revision rejected (ROLLBACK)' };
            }
            return { allowed: false, status: 403, code: 'UNAUTHORIZED', message: `Invalid grant: ${err.message}` };
          }
        } else {
          // Platform unreachable fallback
          if (cached && cached.expiresAtMs > now) {
            claims = cached.claims;
          } else if (cached && cached.expiresAtMs <= now) {
            // Expired and platform unreachable: offline reads must respect last known status (G7)
            if (cached.claims.status === 'SUSPENDED') {
              return {
                allowed: false,
                status: 403,
                code: 'SERVICE_SUSPENDED',
                message: 'Service is suspended for this tenant (last known status).',
                claims: cached.claims,
              };
            }
            if (write) {
              return {
                allowed: false,
                status: 403,
                code: 'PLATFORM_UNREACHABLE',
                message: 'Platform unreachable and grant expired; writes refused.',
              };
            }
            if (this.allowOfflineReads) {
              claims = cached.claims;
            } else {
              return {
                allowed: false,
                status: 403,
                code: 'PLATFORM_UNREACHABLE',
                message: 'Platform unreachable and grant expired.',
              };
            }
          } else {
            return {
              allowed: false,
              status: 403,
              code: 'PLATFORM_UNREACHABLE',
              message: 'No grant available and platform unreachable.',
            };
          }
        }
      }
    }

    if (!claims) {
      return { allowed: false, status: 403, code: 'UNAUTHORIZED', message: 'No valid grant found.' };
    }

    const decision = canUse(claims, feature, write);
    if (decision === 'SUSPENDED') {
      return { allowed: false, status: 403, code: 'SERVICE_SUSPENDED', message: 'Service is suspended for this tenant' };
    }
    if (decision === 'NOT_IN_PLAN') {
      return { allowed: false, status: 403, code: 'FEATURE_NOT_IN_PLAN', message: `Feature "${feature}" is not in current plan (${claims.plan})` };
    }
    if (decision === 'READ_ONLY') {
      return { allowed: false, status: 402, code: 'PAYMENT_REQUIRED', message: 'Tenant is in READ_ONLY mode. Writes are refused.' };
    }

    return { allowed: true, claims };
  }
}

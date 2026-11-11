import * as http from 'http';
import * as url from 'url';
import {
  verifyStaffToken,
  REGISTERED_STATION_SECRETS,
  DEV_TEST_STAFF_TOKENS,
  DEV_TEST_STATION_TOKENS,
  tryGetActiveTenant,
} from '../../packages/domain';
import { getTenantRepository, RestaurantRepository } from '../../packages/storage';
import { postgresStore, eventBus } from '../shared/state';
import type { RequestIdentity } from './middleware';

// In-Memory Token Bucket Rate Limiter Keyed by Tenant ID
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}
const tenantGuestRateLimits = new Map<string, RateLimitBucket>();
const tenantStaffRateLimits = new Map<string, RateLimitBucket>();

export function checkTenantRateLimit(tenantId: string, isStaff: boolean): { allowed: boolean; remaining: number; resetSeconds: number } {
  // Public guest limit: 100 req/min (refill ~1.67/s); Staff limit: 300 req/min (refill ~5/s)
  const maxTokens = isStaff ? 300 : 100;
  const refillRatePerSec = maxTokens / 60;
  const now = Date.now();
  const map = isStaff ? tenantStaffRateLimits : tenantGuestRateLimits;

  let bucket = map.get(tenantId);
  if (!bucket) {
    bucket = { tokens: maxTokens - 1, lastRefill: now };
    map.set(tenantId, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetSeconds: 60,
    };
  }

  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsedSec * refillRatePerSec);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetSeconds: Math.ceil((maxTokens - bucket.tokens) / refillRatePerSec),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetSeconds: Math.ceil((1 - bucket.tokens) / refillRatePerSec) || 1,
  };
}

export async function resolveRequestIdentity(
  req: http.IncomingMessage,
  expectedTenantId?: string,
  repo?: RestaurantRepository
): Promise<RequestIdentity> {
  const authHeader = (req.headers['authorization'] as string) || '';
  const stationToken = (req.headers['x-station-token'] as string) || '';
  const parsedUrl = url.parse(req.url || '', true);

  // Narrow query tokens for DINER capability only (staff tokens are strictly forbidden in query params)
  const queryCapToken = (parsedUrl.query.capToken as string) || '';

  const cookieHeader = (req.headers['cookie'] as string) || '';
  let cookieToken = '';
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)orb_staff_token=([^;]+)/);
    if (match) {
      cookieToken = decodeURIComponent(match[1].trim());
    }
  }

  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader
      ? authHeader.trim()
      : '';

  let token = '';
  let authSource: 'BEARER' | 'COOKIE' | 'STATION' | 'ANONYMOUS' = 'ANONYMOUS';

  if (stationToken) {
    authSource = 'STATION';
  } else if (bearerToken) {
    token = bearerToken;
    authSource = 'BEARER';
  } else if (cookieToken) {
    token = cookieToken;
    authSource = 'COOKIE';
  } else if (queryCapToken && queryCapToken.startsWith('cap_')) {
    // Narrow exception for QR-scanned diner dining session capability tokens
    token = queryCapToken;
    authSource = 'BEARER';
  }

  const resolve = async (): Promise<RequestIdentity> => {

    // 1. Physical Hardware Kitchen Station Token
    if (stationToken) {
      const registered = REGISTERED_STATION_SECRETS[stationToken];
      if (registered) {
        return {
          type: 'STATION',
          id: `station:${registered.station}`,
          station: registered.station,
          branchId: registered.branchId,
          isPrivileged: registered.isPrivileged,
        };
      }

      // In development/test mode only, support whitelisted test station fixtures
      if (process.env.NODE_ENV !== 'production' && DEV_TEST_STATION_TOKENS[stationToken]) {
        const devStation = DEV_TEST_STATION_TOKENS[stationToken];
        return {
          type: 'STATION',
          id: `station:${devStation.station}`,
          station: devStation.station,
          branchId: devStation.branchId,
          isPrivileged: devStation.isPrivileged,
        };
      }

      return {
        type: 'INVALID_CREDENTIAL',
        id: stationToken,
        isPrivileged: false,
        error: 'Unregistered station token.',
      };
    }

    // 2. Bearer Authentication Header or Query Token
    if (token) {
      // 2a. Guest Capability Token (cap_...)
      if (token.startsWith('cap_')) {
        const isValid = repo ? await repo.isCapabilityValid(token) : false;
        if (!isValid) {
          return {
            type: 'REVOKED_CAPABILITY',
            id: token,
            isPrivileged: false,
          };
        }
        const sessions = repo ? await repo.getSessions() : [];
        const session = sessions.find(
          (s) => s.status === 'ACTIVE' && s.guestCapabilityTokens?.includes(token)
        );
        if (!session) {
          return {
            type: 'REVOKED_CAPABILITY',
            id: token,
            isPrivileged: false,
          };
        }
        return {
          type: 'DINER',
          id: token,
          tableNumber: session.tableNumber,
          sessionId: session.sessionId,
          branchId: session.branchId,
          isPrivileged: false,
        };
      }

      // 2b. Cryptographically Signed Staff Token (orb_stf....)
      if (token.startsWith('orb_stf.')) {
        const activeTenant = tryGetActiveTenant();
        const targetTenantId =
          expectedTenantId ||
          (activeTenant?.tenantId && !activeTenant.isPlatform
            ? activeTenant.tenantId
            : undefined);
        const verification = verifyStaffToken(token, { expectedTenantId: targetTenantId });
        if (!verification.valid) {
          return {
            type: 'INVALID_CREDENTIAL',
            id: token,
            isPrivileged: false,
            error: verification.error,
          };
        }
        const claims = verification.claims!;

        // Check tenant-scoped revocation in database
        if (targetTenantId) {
          try {
            const tenantRepo = getTenantRepository(targetTenantId, postgresStore?.prisma, eventBus);
            const isRevoked = await tenantRepo.isStaffTokenRevoked(claims.jti);
            if (isRevoked) {
              return {
                type: 'INVALID_CREDENTIAL',
                id: token,
                isPrivileged: false,
                error: 'TOKEN_REVOKED',
              };
            }
            if (claims.sub) {
              const member = await tenantRepo.getStaffMember(claims.sub);
              if (member && member.status === 'REVOKED') {
                return {
                  type: 'INVALID_CREDENTIAL',
                  id: token,
                  isPrivileged: false,
                  error: 'TOKEN_REVOKED',
                };
              }
            }
          } catch {
            // Fall through to in-memory check
          }
        }

        const isPriv = claims.role === 'OWNER' || claims.role === 'MANAGER' || claims.role === 'ADMIN' || claims.role === 'POS';
        if (claims.role === 'CHEF') {
          return {
            type: 'STATION',
            id: claims.sub,
            role: 'CHEF',
            station: claims.station || 'ALL',
            branchId: claims.branchId,
            isPrivileged: isPriv,
            rawToken: token,
          };
        }
        return {
          type: claims.role === 'OWNER' || claims.role === 'MANAGER' || claims.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
          id: claims.sub,
          role: claims.role,
          branchId: claims.branchId,
          isPrivileged: isPriv,
          rawToken: token,
        };
      }

      // 2c. Registered Station Secrets (Physical Hardware Kitchen Stations)
      if (REGISTERED_STATION_SECRETS[token]) {
        const reg = REGISTERED_STATION_SECRETS[token];
        return {
          type: 'STATION',
          id: token,
          role: 'CHEF',
          station: reg.station,
          branchId: reg.branchId,
          isPrivileged: reg.isPrivileged,
        };
      }

      // 2d. Whitelisted Dev/Test Staff Fixtures (STRICTLY IN NON-PRODUCTION ONLY!)
      if (process.env.NODE_ENV !== 'production' && DEV_TEST_STAFF_TOKENS[token]) {
        const fixture = DEV_TEST_STAFF_TOKENS[token];
        if (fixture.role === 'CHEF') {
          return {
            type: 'STATION',
            id: token,
            role: 'CHEF',
            station: fixture.station,
            branchId: fixture.branchId,
            isPrivileged: fixture.isPrivileged,
            rawToken: token,
          };
        }
        return {
          type: fixture.role === 'MANAGER' ? 'ADMIN' : 'STAFF',
          id: token,
          role: fixture.role,
          branchId: fixture.branchId,
          isPrivileged: fixture.isPrivileged,
          rawToken: token,
        };
      }

      // 2e. Whitelisted Dev/Test Station Fixtures (STRICTLY IN NON-PRODUCTION ONLY!)
      if (process.env.NODE_ENV !== 'production' && DEV_TEST_STATION_TOKENS[token]) {
        const fixture = DEV_TEST_STATION_TOKENS[token];
        return {
          type: 'STATION',
          id: token,
          role: 'CHEF',
          station: fixture.station,
          branchId: fixture.branchId,
          isPrivileged: fixture.isPrivileged,
        };
      }

      // 2f. Order Tracking Capability Tokens
      if (token.startsWith('ordtok_')) {
        const order = await repo.getOrderByOrderToken(token);
        if (order) {
          return {
            type: 'ORDER_TRACKER',
            id: token,
            orderId: order.orderId,
            isPrivileged: false,
          };
        }
      }

      // Any other Bearer token is an invalid credential
      return {
        type: 'INVALID_CREDENTIAL',
        id: token,
        isPrivileged: false,
        error: 'Unrecognized or forged Bearer token.',
      };
    }

    const orderTokenQuery = (parsedUrl.query.orderToken as string) || '';
    if (orderTokenQuery && orderTokenQuery.startsWith('ordtok_')) {
      const order = await repo.getOrderByOrderToken(orderTokenQuery);
      if (order) {
        return {
          type: 'ORDER_TRACKER',
          id: orderTokenQuery,
          orderId: order.orderId,
          isPrivileged: false,
        };
      }
    }

    return {
      type: 'ANONYMOUS',
      id: 'anon:guest',
      isPrivileged: false,
    };
  };

  const identity = await resolve();
  identity.authSource = authSource;
  return identity;
}

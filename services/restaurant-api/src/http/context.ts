import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  MenuItem,
  KitchenTask,
  TableFloorRecord,
  RestaurantOrder,
  BranchRecord,
  FloorRecord,
  ServiceRequest,
  RestaurantContext,
  validateAndResolveContext,
  issueStaffToken,
  verifyStaffToken,
  revokeStaffToken,
  isStaffTokenRevoked,
  authenticateStaffByPin,
  getStaffAuthSecret,
  getPublicStaffList,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  resetStaffLockout,
  hashStaffSecretSync,
  verifyStaffSecret,
  resolveClientIp,
  checkStaffLockout,
  recordFailedStaffAttempt,
  recordSuccessfulStaffAttempt,
  issueDeviceToken,
  verifyDeviceToken,
  REGISTERED_STATION_SECRETS,
  resolveAllowedOrigin,
  DEV_TEST_STAFF_TOKENS,
  DEV_TEST_STATION_TOKENS,
  validateAndSanitizeCustomCss,
  validateOrGenerateRequestId,
  logger,
  eventLoopMonitor,
  resolveTenantFromRequest,
  withTenantContext,
  getActiveTenant,
  tryGetActiveTenant,
  resolveTenantDisplayName,
  invalidateTenantResolutionCache,
  renderTenantNotFoundPage,
  TenantProvisioningService,
  CustomDomainService,
  OwnerSelfService,
  OnboardingStepKey,
  verifyPlatformAuth,
  validateTenantSlug,
  generateSeats,
  runDatabaseSecuritySelfCheck,
  verifyBridgeRequest,
  signBridgeRequest,
  getDefaultBridgeKeys,
  PostgresNonceStore,
  MemoryNonceStore,
  PostgresEventListener,
} from '../shared';
import { RestaurantRuntimeStore, DomainEvent, getTenantRepository, RestaurantRepository } from '../storage';
import { PosService } from '@orbitox-io/pos';
import { PostgresRestaurantStore } from '../storage/postgres-store';
import { RealtimeEventBus } from '../shared/event-bus';
import { RestaurantControlBridge, restaurantControlBridge } from '../bridge';
import { RazorpayPaymentGatewayAdapter } from '../shared/integrations';
import {
  PluginGrantEnforcer,
  PostgresRevisionStore,
  MemoryRevisionStore,
  SEED_PLANS,
} from '@orbitox-io/plugin-engine';
import {
  assertRestaurantOsProductionConfig,
  GSTIN_REGEX,
} from '../shared/production-config';
export {
  assertRestaurantOsProductionConfig,
  GSTIN_REGEX,
  renderTenantNotFoundPage,
  verifyPlatformAuth,
};

export const isProductionEnvironment =
  process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';

if (process.env.STORAGE_DRIVER === 'json' && isProductionEnvironment) {
  console.error('🚨 [CRITICAL_SECURITY_VIOLATION] STORAGE_DRIVER=json is strictly prohibited in production mode! Halting startup.');
  process.exit(1);
}

export const store: RestaurantRuntimeStore | null =
  process.env.STORAGE_DRIVER === 'json' ? new RestaurantRuntimeStore() : null;
export const eventBus = new RealtimeEventBus();
export const runtimeController = restaurantControlBridge;
export const razorpayAdapter = new RazorpayPaymentGatewayAdapter();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://apple@localhost:5432/restaurant_os';
}

let postgresStore: PostgresRestaurantStore | null = null;
if (process.env.STORAGE_DRIVER !== 'json' && process.env.DATABASE_URL) {
  try {
    postgresStore = new PostgresRestaurantStore();
    (globalThis as any).__restaurantos_prisma = postgresStore.prisma;
  } catch (err: any) {
    console.warn('[Storage] PostgresRestaurantStore deferred:', err.message);
  }
}

export const provisioningService = new TenantProvisioningService(postgresStore ? postgresStore.prisma : undefined);
export const customDomainService = new CustomDomainService(postgresStore ? postgresStore.prisma : undefined);
export const ownerSelfService = new OwnerSelfService(postgresStore ? postgresStore.prisma : undefined);

export const nonceStore = postgresStore?.prisma
  ? new PostgresNonceStore(postgresStore.prisma)
  : new MemoryNonceStore();

let pgEventListener: PostgresEventListener | null = null;
if (process.env.STORAGE_DRIVER !== 'json' && process.env.DATABASE_URL) {
  try {
    pgEventListener = new PostgresEventListener(process.env.DATABASE_URL, eventBus);
    pgEventListener.start().catch((err: any) => console.warn('[PostgresEventListener] Startup warning:', err.message));
  } catch (err: any) {
    console.warn('[PostgresEventListener] Init warning:', err.message);
  }
}

export { pgEventListener, postgresStore };

export function getPinnedGrantKeys(): Record<string, crypto.KeyObject> {
  const isProd = isProductionEnvironment;
  if (isProd) {
    if (!process.env.ORBITOX_GRANT_PUBLIC_KEYS) {
      throw new Error('FATAL: ORBITOX_GRANT_PUBLIC_KEYS is required in production mode. Refusing to start.');
    }
  }

  if (process.env.ORBITOX_GRANT_PUBLIC_KEYS) {
    try {
      const parsed = JSON.parse(process.env.ORBITOX_GRANT_PUBLIC_KEYS);
      const res: Record<string, crypto.KeyObject> = {};
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const kid = item.kid || 'k1';
          const pem = item.publicKeyPem || item.publicKey || item.key;
          if (pem) {
            res[kid] = typeof pem === 'string' ? crypto.createPublicKey(pem) : pem;
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        for (const [k, v] of Object.entries<any>(parsed)) {
          const pem = typeof v === 'string' ? v : (v?.publicKeyPem || v?.publicKey || v?.key);
          if (pem) {
            res[k] = typeof pem === 'string' ? crypto.createPublicKey(pem) : pem;
          }
        }
      }
      if (Object.keys(res).length > 0) {
        return res;
      }
      if (isProd) {
        throw new Error('FATAL: No valid public keys found in ORBITOX_GRANT_PUBLIC_KEYS in production mode.');
      }
    } catch (e: any) {
      if (isProd) {
        throw new Error(`FATAL: Failed to parse ORBITOX_GRANT_PUBLIC_KEYS in production mode: ${e?.message || e}`);
      }
      console.error('[GrantEnforcer] Failed to parse ORBITOX_GRANT_PUBLIC_KEYS:', e?.message || e);
    }
  }

  if (process.env.ORBITOX_GRANT_PUBLIC_KEY) {
    try {
      return { default: crypto.createPublicKey(process.env.ORBITOX_GRANT_PUBLIC_KEY) };
    } catch (e: any) {
      if (isProd) {
        throw new Error(`FATAL: Failed to parse ORBITOX_GRANT_PUBLIC_KEY in production mode: ${e?.message || e}`);
      }
      console.error('[GrantEnforcer] Failed to parse ORBITOX_GRANT_PUBLIC_KEY:', e?.message || e);
    }
  }

  if (isProd) {
    throw new Error('FATAL: Valid grant public keys must be configured in production mode.');
  }

  return {};
}

if (isProductionEnvironment) {
  assertRestaurantOsProductionConfig(process.env);
  getPinnedGrantKeys();
  if (!postgresStore?.prisma) {
    console.error('🚨 [CRITICAL_SECURITY_VIOLATION] PostgreSQL revision store is required in production mode! Halting startup.');
    process.exit(1);
  }
}

const restaurantRevisionStore = postgresStore?.prisma
  ? new PostgresRevisionStore(postgresStore.prisma)
  : (isProductionEnvironment
    ? (() => { throw new Error('FATAL: MemoryRevisionStore cannot be used in production mode.'); })()
    : new MemoryRevisionStore());

export const restaurantGrantEnforcer = new PluginGrantEnforcer({
  audience: '@orbitox/restaurant',
  trustedKeys: getPinnedGrantKeys(),
  revisions: restaurantRevisionStore,
  allowOfflineReads: true,
  fetchGrant: async (tenantId: string, pluginId: string) => {
    let platformUrl = process.env.ORBITOX_CONTROL_PLANE_URL || process.env.ORBITOX_BACKEND_URL;
    if (isProductionEnvironment) {
      if (!platformUrl) {
        throw new Error('ORBITOX_CONTROL_PLANE_URL is required in production mode');
      }
      if (!platformUrl.startsWith('https://')) {
        throw new Error('ORBITOX_CONTROL_PLANE_URL must use https:// in production mode');
      }
    } else {
      platformUrl = platformUrl || 'http://localhost:3005';
    }

    const pathWithQuery = `/api/v1/platform/grants?pluginId=${encodeURIComponent(pluginId)}&tenantId=${encodeURIComponent(tenantId)}`;
    const bridgeKeys = getDefaultBridgeKeys();
    const signedHeaders = signBridgeRequest(bridgeKeys, {
      method: 'GET',
      pathWithQuery,
      tenantId,
      principal: { sub: pluginId, scopes: ['grant:read', pluginId] },
    });

    try {
      const res = await fetch(`${platformUrl}${pathWithQuery}`, {
        method: 'GET',
        headers: signedHeaders,
      });
      if (!res.ok) {
        console.error(`[GrantEnforcer] fetchGrant failed with status ${res.status}: ${await res.text()}`);
        return null;
      }
      const data = await res.json();
      return data.token || data.grant || null;
    } catch (err: any) {
      console.error('[GrantEnforcer] fetchGrant network error:', err?.message || err);
      return null;
    }
  },
});

eventBus.on('tenant.lifecycle.suspended', (event: any) => {
  if (event.tenantId) {
    restaurantGrantEnforcer.invalidate(event.tenantId);
  }
});
eventBus.on('entitlement.updated', (event: any) => {
  if (event.tenantId) {
    restaurantGrantEnforcer.invalidate(event.tenantId);
  }
});

export async function closeRuntimeServer(): Promise<void> {
  if (pgEventListener) {
    await pgEventListener.stop();
  }
  if (postgresStore?.prisma) {
    await postgresStore.prisma.$disconnect();
  }
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}
export const tenantGuestRateLimits = new Map<string, RateLimitBucket>();
export const tenantStaffRateLimits = new Map<string, RateLimitBucket>();

export function checkTenantRateLimit(tenantId: string, isStaff: boolean): { allowed: boolean; remaining: number; resetSeconds: number } {
  if (Boolean((globalThis as Record<string, unknown>).__DISABLE_RATE_LIMITER)) {
    return { allowed: true, remaining: 999999, resetSeconds: 0 };
  }
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

try {
  getStaffAuthSecret();
} catch (startupErr: any) {
  console.error('🚨 [SERVER FATAL STARTUP]', startupErr.message);
  process.exit(1);
}

export let totalRequests = 0;
export const statusCounts = new Map<number, number>();
export const methodCounts = new Map<string, number>();
export let totalDomainEvents = 0;

export function incrementTotalRequests(): void {
  totalRequests++;
}
export function recordStatusCount(code: number): void {
  statusCounts.set(code, (statusCounts.get(code) || 0) + 1);
}
export function recordMethodCount(method: string): void {
  methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
}
export function incrementTotalDomainEvents(): void {
  totalDomainEvents++;
}

if (store) {
  store.onEvent((event) => {
    totalDomainEvents++;
    eventBus.broadcast(event);
  });
}

export const activeSettlementLocks = new Set<string>();
export const activeDispatchLocks = new Set<string>();

export function parseBody(req: http.IncomingMessage): Promise<any> {
  if ((req as any)._parsedBody !== undefined) {
    return Promise.resolve((req as any)._parsedBody);
  }
  if ((req as any)._rawBuffer !== undefined) {
    try {
      const parsed = (req as any)._rawBuffer.length ? JSON.parse((req as any)._rawBuffer.toString('utf8')) : {};
      (req as any)._parsedBody = parsed;
      return Promise.resolve(parsed);
    } catch {
      (req as any)._parsedBody = {};
      return Promise.resolve({});
    }
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      (req as any).rawBody = data;
      (req as any)._rawBuffer = Buffer.from(data);
      try {
        const parsed = data ? JSON.parse(data) : {};
        (req as any)._parsedBody = parsed;
        resolve(parsed);
      } catch (err) {
        (req as any).rawBody = data;
        (req as any)._parsedBody = {};
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

export function readRawBody(req: http.IncomingMessage): Promise<string> {
  if ((req as any).rawBody !== undefined) {
    return Promise.resolve((req as any).rawBody);
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      (req as any).rawBody = data;
      (req as any)._rawBuffer = Buffer.from(data);
      try {
        (req as any)._parsedBody = data ? JSON.parse(data) : {};
      } catch {
        (req as any)._parsedBody = {};
      }
      resolve(data);
    });
    req.on('error', () => resolve(''));
  });
}

export function parseBuffer(req: http.IncomingMessage): Promise<Buffer> {
  if ((req as any)._rawBuffer !== undefined) {
    return Promise.resolve((req as any)._rawBuffer);
  }
  if ((req as any).rawBody !== undefined) {
    const buf = Buffer.from((req as any).rawBody);
    (req as any)._rawBuffer = buf;
    return Promise.resolve(buf);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      (req as any)._rawBuffer = buf;
      (req as any).rawBody = buf.toString('utf8');
      resolve(buf);
    });
    req.on('error', reject);
  });
}

export async function extractImageBuffer(req: http.IncomingMessage): Promise<{ buffer: Buffer; filename: string }> {
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  if (contentType.includes('application/json')) {
    const body = await parseBody(req);
    const dataStr = body.image || body.data || body.file || '';
    if (!dataStr) {
      throw new Error('MISSING_IMAGE_DATA: JSON payload must contain base64 string in image, data, or file field.');
    }
    const cleanBase64 = dataStr.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    return { buffer, filename: body.filename || 'upload.png' };
  }

  const raw = await parseBuffer(req);
  if (contentType.includes('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
    const boundary = boundaryMatch ? boundaryMatch[1].trim().replace(/^"|"$/g, '') : null;
    if (boundary) {
      const boundaryDelimiter = `--${boundary}`;
      const str = raw.toString('binary');
      const startIdx = str.indexOf(boundaryDelimiter);
      if (startIdx !== -1) {
        const headerEnd = str.indexOf('\r\n\r\n', startIdx);
        if (headerEnd !== -1) {
          const headersText = str.slice(startIdx, headerEnd);
          const nextBoundary = str.indexOf(boundaryDelimiter, headerEnd + 4);
          const endIdx = nextBoundary !== -1 ? nextBoundary - 2 : str.length;
          const fileBinary = str.slice(headerEnd + 4, endIdx);
          const buffer = Buffer.from(fileBinary, 'binary');
          const fnMatch = headersText.match(/filename="([^"]+)"/i);
          const filename = fnMatch ? fnMatch[1] : 'upload.png';
          return { buffer, filename };
        }
      }
    }
  }

  return { buffer: raw, filename: 'upload.png' };
}

export function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  const allowedOrigin = resolveAllowedOrigin(res.req);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-idempotency-key, x-session-id, x-order-token, x-request-id, x-correlation-id, x-station-token, x-tenant-id, x-razorpay-signature, x-razorpay-event-id',
    'Access-Control-Expose-Headers': 'x-request-id, x-quota-warning',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  };
  if (res.hasHeader('x-quota-warning')) {
    headers['x-quota-warning'] = String(res.getHeader('x-quota-warning'));
  }
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Vary'] = 'Origin';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

export function sendHtml(res: http.ServerResponse, html: string, statusCode: number = 200) {
  const allowedOrigin = resolveAllowedOrigin(res.req);
  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(statusCode, headers);
  res.end(html);
}

export interface RequestIdentity {
  type: 'ANONYMOUS' | 'DINER' | 'STAFF' | 'STATION' | 'ADMIN' | 'REVOKED_CAPABILITY' | 'INVALID_CREDENTIAL' | 'ORDER_TRACKER' | 'PLATFORM_BRIDGE';
  id: string;
  role?: string;
  station?: string;
  branchId?: string;
  tableNumber?: string;
  sessionId?: string;
  orderId?: string;
  isPrivileged: boolean;
  rawToken?: string;
  authSource?: 'BEARER' | 'COOKIE' | 'STATION' | 'ANONYMOUS' | 'BRIDGE_SIGNATURE';
  error?: string;
  scopes?: string[];
  tenantId?: string;
}

export function isSameOriginRequest(req: http.IncomingMessage): boolean {
  let expectedHost = '';
  const configuredOrigin = process.env.RESTAURANTOS_ORIGIN || process.env.PUBLIC_ORIGIN;
  if (configuredOrigin) {
    try {
      expectedHost = new URL(configuredOrigin).host.toLowerCase();
    } catch { }
  }

  if (!expectedHost) {
    const rawHost = (req.headers['host'] as string) || '';
    if (/^[a-zA-Z0-9.-]+(:[0-9]+)?$/.test(rawHost)) {
      expectedHost = rawHost.toLowerCase();
    } else {
      return false;
    }
  }

  const secFetchSite = (req.headers['sec-fetch-site'] as string) || '';
  if (secFetchSite === 'cross-site') {
    return false;
  }

  const origin = (req.headers['origin'] as string) || '';
  const referer = (req.headers['referer'] as string) || '';

  if (!origin && !referer) {
    return false;
  }

  let originMatches = false;
  let refererMatches = false;

  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host.toLowerCase() === expectedHost) {
        originMatches = true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const parsedReferer = new URL(referer);
      if (parsedReferer.host.toLowerCase() === expectedHost) {
        refererMatches = true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  return (origin ? originMatches : true) && (referer ? refererMatches : true);
}

export async function resolveRequestIdentity(
  req: http.IncomingMessage,
  expectedTenantId?: string,
  repo?: RestaurantRepository
): Promise<RequestIdentity> {
  const authHeader = (req.headers['authorization'] as string) || '';
  const stationToken = (req.headers['x-station-token'] as string) || '';
  const parsedUrl = url.parse(req.url || '', true);

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
    token = queryCapToken;
    authSource = 'BEARER';
  }

  const resolve = async (): Promise<RequestIdentity> => {
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

    if (token) {
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

      if (token.startsWith('ordtok_')) {
        const order = repo ? await repo.getOrderByOrderToken(token) : null;
        if (order) {
          return {
            type: 'ORDER_TRACKER',
            id: token,
            orderId: order.orderId,
            isPrivileged: false,
          };
        }
      }

      return {
        type: 'INVALID_CREDENTIAL',
        id: token,
        isPrivileged: false,
        error: 'Unrecognized or forged Bearer token.',
      };
    }

    const orderTokenQuery = (parsedUrl.query.orderToken as string) || '';
    if (orderTokenQuery && orderTokenQuery.startsWith('ordtok_')) {
      const order = repo ? await repo.getOrderByOrderToken(orderTokenQuery) : null;
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

export function checkTestKillPoint(req: http.IncomingMessage, stage: 'pre-commit' | 'post-commit'): void {
  if (process.env.NODE_ENV === 'production') return;
  const targetStage = req.headers['x-test-kill-point'] as string | undefined;
  if (!targetStage) return;
  if (targetStage === stage) {
    process.kill(process.pid, 'SIGKILL');
  } else if (targetStage === 'random-timing' && stage === 'pre-commit') {
    setTimeout(() => {
      try { process.kill(process.pid, 'SIGKILL'); } catch { }
    }, Math.floor(Math.random() * 20));
  }
}

export function isActiveRestaurantCataloguePlan(planId: unknown): planId is string {
  return typeof planId === 'string' && SEED_PLANS.some(
    (plan) => plan.planId === planId && plan.pluginId === '@orbitox/restaurant' && plan.status === 'ACTIVE',
  );
}

export interface RequestContext {
  pathname: string;
  method: string;
  parsedUrl: url.UrlWithParsedQuery;
  tenantContext: any;
  repo: RestaurantRepository;
  posService: PosService;
  requestIdentity: RequestIdentity;
  activeStaffToken?: string;
  activeStaffRole?: string;
  currentBranch?: BranchRecord;
  currentFloor?: FloorRecord;
  serviceShift?: string;
  requestId: string;
  verifiedBridge?: { tenantId: string; principal: { sub: string; scopes: string[] } } | null;
  params: Record<string, string>;
  sendJson: (statusCode: number, data: any) => void;
  sendHtml: (html: string, statusCode?: number) => void;
  parseBody: () => Promise<any>;
  readRawBody: () => Promise<string>;
  parseBuffer: () => Promise<Buffer>;
  extractImageBuffer: () => Promise<{ buffer: Buffer; filename: string }>;
  checkRateLimit: (isStaff: boolean) => { allowed: boolean; remaining: number; resetSeconds: number };
  checkKillPoint: (stage: 'pre-commit' | 'post-commit') => void;
}

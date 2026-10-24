/**
 * 🍷 RestaurantOS 2.x — Production-Grade Independent Runtime Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Port: 4010
 * Authoritative Runtime Plane: Executes culinary operations, spatial floor management,
 * kitchen display system, diner mobile companion, and realtime SSE gateway.
 *
 * Persistence: File-backed atomic JSON store (data/restaurant-runtime-store.json).
 * Event Outbox: Monotonically sequenced domain events with Server-Sent Events broadcast.
 */

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
} from '../packages/domain';
import {
  buildGSTInvoice,
  computeFiscalYear,
  SAC_RESTAURANT_SERVICES,
  renderPrintableInvoiceHtml,
} from '../packages/domain/invoicing';
import { RestaurantRuntimeStore, DomainEvent, getTenantRepository, RestaurantRepository } from '../packages/storage';
import { PostgresRestaurantStore } from '../packages/storage/postgres-store';
import { RealtimeEventBus } from '../packages/domain/event-bus';
import { RestaurantControlBridge, restaurantControlBridge } from './bridge';
import { RazorpayPaymentGatewayAdapter } from '../packages/integrations';
import {
  renderShell,
  renderOperationsHome,
  renderFloorStudio,
  renderKdsWorkspace,
  renderDinerPwa,
  renderTablesList,
  renderTableQrStand,
  renderOnboardingWorkspace,
  renderOrdersWorkspace,
  renderMenuWorkspace,
  renderGuestsWorkspace,
  renderReportsWorkspace,
  renderLocationsWorkspace,
  renderFloorsWorkspace,
  renderDeveloperInspector,
  renderTemplateCompositionInspector,
  renderMarketplaceWorkspace,
  renderVisualStudio,
  renderWhiteLabelWorkspace,
  renderSupportWorkspace,
  renderStaffWorkspace,
  renderCraveAtlasPage,
  renderSwiftBitePage,
  renderPantryRushPage,
  renderOwnerInvitePage,
  renderSuspendedTenantPage,
} from '../packages/ui';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4010;

// Production storage driver guard: file-backed JSON store is strictly prohibited in production
if (process.env.STORAGE_DRIVER === 'json' && process.env.NODE_ENV === 'production') {
  console.error('🚨 [CRITICAL_SECURITY_VIOLATION] STORAGE_DRIVER=json is strictly prohibited in production mode! Halting startup.');
  process.exit(1);
}

const store: RestaurantRuntimeStore | null =
  process.env.STORAGE_DRIVER === 'json' ? new RestaurantRuntimeStore() : null;
const eventBus = new RealtimeEventBus();
const runtimeController = restaurantControlBridge;
const razorpayAdapter = new RazorpayPaymentGatewayAdapter();

let postgresStore: PostgresRestaurantStore | null = null;
try {
  postgresStore = new PostgresRestaurantStore();
  (globalThis as any).__restaurantos_prisma = postgresStore.prisma;
} catch (err: any) {
  console.warn('[Storage] PostgresRestaurantStore deferred:', err.message);
}

const provisioningService = new TenantProvisioningService(postgresStore ? postgresStore.prisma : undefined);
const customDomainService = new CustomDomainService(postgresStore ? postgresStore.prisma : undefined);
const ownerSelfService = new OwnerSelfService(postgresStore ? postgresStore.prisma : undefined);

// In-Memory Token Bucket Rate Limiter Keyed by Tenant ID
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}
const tenantGuestRateLimits = new Map<string, RateLimitBucket>();
const tenantStaffRateLimits = new Map<string, RateLimitBucket>();

function checkTenantRateLimit(tenantId: string, isStaff: boolean): { allowed: boolean; remaining: number; resetSeconds: number } {
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

// Startup security signing secret verification
try {
  getStaffAuthSecret();
} catch (startupErr: any) {
  console.error('🚨 [SERVER FATAL STARTUP]', startupErr.message);
  process.exit(1);
}

let totalRequests = 0;
const statusCounts = new Map<number, number>();
const methodCounts = new Map<string, number>();
let totalDomainEvents = 0;

// Automatically broadcast all domain events emitted by the authoritative store (when in JSON mode)
if (store) {
  store.onEvent((event) => {
    totalDomainEvents++;
    eventBus.broadcast(event);
  });
}

// In-flight operation locks (strictly scoped by tenant to prevent cross-tenant collisions)
const activeSettlementLocks = new Set<string>();
const activeDispatchLocks = new Set<string>();

function parseBody(req: http.IncomingMessage): Promise<any> {
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

function parseBuffer(req: http.IncomingMessage): Promise<Buffer> {
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

async function extractImageBuffer(req: http.IncomingMessage): Promise<{ buffer: Buffer; filename: string }> {
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

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
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

function sendHtml(res: http.ServerResponse, html: string, statusCode: number = 200) {
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
  type: 'ANONYMOUS' | 'DINER' | 'STAFF' | 'STATION' | 'ADMIN' | 'REVOKED_CAPABILITY' | 'INVALID_CREDENTIAL' | 'ORDER_TRACKER';
  id: string;
  role?: string;
  station?: string;
  branchId?: string;
  tableNumber?: string;
  sessionId?: string;
  orderId?: string;
  isPrivileged: boolean;
  rawToken?: string;
  authSource?: 'BEARER' | 'COOKIE' | 'STATION' | 'ANONYMOUS';
  error?: string;
}

function isSameOriginRequest(req: http.IncomingMessage): boolean {
  // 1. Determine expected host from configuration or validated Host header
  let expectedHost = '';
  const configuredOrigin = process.env.RESTAURANTOS_ORIGIN || process.env.PUBLIC_ORIGIN;
  if (configuredOrigin) {
    try {
      expectedHost = new URL(configuredOrigin).host.toLowerCase();
    } catch {}
  }

  if (!expectedHost) {
    const rawHost = (req.headers['host'] as string) || '';
    // Validate host format: alphanumeric, dashes, dots, optional port (no CRLF or injection)
    if (/^[a-zA-Z0-9.-]+(:[0-9]+)?$/.test(rawHost)) {
      expectedHost = rawHost.toLowerCase();
    } else {
      // Malformed or missing host header: fail closed
      return false;
    }
  }

  // 2. Reject explicit cross-site fetch indicator
  const secFetchSite = (req.headers['sec-fetch-site'] as string) || '';
  if (secFetchSite === 'cross-site') {
    return false;
  }

  // 3. Extract Origin and Referer evidence
  const origin = (req.headers['origin'] as string) || '';
  const referer = (req.headers['referer'] as string) || '';

  // Fail closed: cookie mutations MUST have verified origin or referer evidence
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

async function resolveRequestIdentity(
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

export async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';
  const method = req.method || 'GET';

  if (pathname === '/favicon.ico') {
    res.writeHead(204, { 'Content-Type': 'image/x-icon' });
    res.end();
    return;
  }

  res.on('finish', () => {
    totalRequests++;
    statusCounts.set(res.statusCode, (statusCounts.get(res.statusCode) || 0) + 1);
    methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
  });

  // Readiness check: verifies PostgreSQL and runtime services
  if ((pathname === '/healthz/ready' || pathname === '/ready') && method === 'GET') {
    try {
      if (postgresStore?.prisma) {
        await postgresStore.prisma.$queryRawUnsafe('SELECT 1');
      }
      sendJson(res, 200, {
        status: 'ready',
        checks: {
          database: 'UP',
          store: 'UP',
          eventBus: 'UP',
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      sendJson(res, 503, {
        status: 'not_ready',
        checks: {
          database: 'DOWN',
          error: err.message,
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }
    return;
  }

  // Liveness and basic health probes
  if (pathname === '/health' || pathname === '/healthz') {
    sendJson(res, 200, {
      status: 'healthy',
      service: 'restaurant-os',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Metrics endpoint (Prometheus format or JSON)
  if ((pathname === '/metrics' || pathname === '/internal/metrics') && method === 'GET') {
    if (pathname === '/internal/metrics' && !verifyPlatformAuth(req)) {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
        message: 'Platform service credentials required for internal metrics.',
      });
      return;
    }
    const memory = process.memoryUsage();
    let activeTenantsCount = 1;
    try {
      if (postgresStore?.prisma) {
        activeTenantsCount = await postgresStore.prisma.tenant.count({ where: { status: 'active' } });
      }
    } catch (e) {}

    const isJson = req.headers.accept?.includes('application/json') || parsedUrl.query.format === 'json';
    if (isJson) {
      sendJson(res, 200, {
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          heapUsedBytes: memory.heapUsed,
          heapTotalBytes: memory.heapTotal,
          rssBytes: memory.rss,
        },
        traffic: {
          totalRequests,
          statusCounts: Object.fromEntries(statusCounts.entries()),
          methodCounts: Object.fromEntries(methodCounts.entries()),
        },
        fleet: {
          activeTenantsCount,
          domainEventsEmitted: totalDomainEvents,
        },
      });
      return;
    }

    const lines = [
      '# HELP restaurantos_process_uptime_seconds Process uptime in seconds.',
      '# TYPE restaurantos_process_uptime_seconds gauge',
      `restaurantos_process_uptime_seconds ${Math.floor(process.uptime())}`,
      '# HELP restaurantos_memory_heap_used_bytes Process memory heap used in bytes.',
      '# TYPE restaurantos_memory_heap_used_bytes gauge',
      `restaurantos_memory_heap_used_bytes ${memory.heapUsed}`,
      '# HELP restaurantos_memory_heap_total_bytes Process memory heap total in bytes.',
      '# TYPE restaurantos_memory_heap_total_bytes gauge',
      `restaurantos_memory_heap_total_bytes ${memory.heapTotal}`,
      '# HELP restaurantos_memory_rss_bytes Process resident set size in bytes.',
      '# TYPE restaurantos_memory_rss_bytes gauge',
      `restaurantos_memory_rss_bytes ${memory.rss}`,
      '# HELP restaurantos_active_tenants_total Total active tenants in fleet.',
      '# TYPE restaurantos_active_tenants_total gauge',
      `restaurantos_active_tenants_total ${activeTenantsCount}`,
      '# HELP restaurantos_http_requests_total Total HTTP requests served.',
      '# TYPE restaurantos_http_requests_total counter',
      `restaurantos_http_requests_total ${totalRequests}`,
      '# HELP restaurantos_domain_events_total Total domain events broadcasted.',
      '# TYPE restaurantos_domain_events_total counter',
      `restaurantos_domain_events_total ${totalDomainEvents}`,
    ];
    for (const [code, count] of statusCounts.entries()) {
      lines.push(`restaurantos_http_requests_by_status{status="${code}"} ${count}`);
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
    res.end(lines.join('\n') + '\n');
    return;
  }

  // Static Tenant Uploads Serving (with strict path-traversal protection and security headers)
  if (pathname.startsWith('/uploads/') && method === 'GET') {
    const safeUploadsRoot = path.resolve(
      process.env.RESTAURANT_STORE_PATH
        ? path.join(path.dirname(process.env.RESTAURANT_STORE_PATH), 'uploads')
        : path.join(process.cwd(), 'data', 'uploads')
    );
    const relativeSubpath = pathname.replace(/^\/uploads\/?/, '');
    const targetPath = path.resolve(safeUploadsRoot, relativeSubpath);

    if (!targetPath.startsWith(safeUploadsRoot) || !fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      sendJson(res, 404, { error: 'NOT_FOUND', code: 'ASSET_NOT_FOUND', message: 'Requested upload asset not found.' });
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400, immutable',
    });
    fs.createReadStream(targetPath).pipe(res);
    return;
  }

  // Platform internal management endpoints (require platform auth token, bypass public host resolution)
  if (pathname.startsWith('/internal/')) {
    // Caddy On-Demand TLS Ask gatekeeper: Called by reverse proxy to authorize automated SSL issuance
    if (pathname === '/internal/tls/ask' && method === 'GET') {
      const askDomain = (parsedUrl.query.domain as string) || '';
      const allowed = await customDomainService.isDomainAllowedForTls(askDomain);
      if (allowed) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } else {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('FORBIDDEN: Domain not permitted for TLS');
      }
      return;
    }

    if (!verifyPlatformAuth(req)) {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
        message: 'Platform service credentials required (RESTAURANTOS_PLATFORM_TOKEN >= 32 chars).',
      });
      return;
    }
  }

  // Authoritative host-based tenant resolution
  let tenantContext = await resolveTenantFromRequest(req, postgresStore?.prisma);
  if (!tenantContext) {
    if (pathname.startsWith('/internal/')) {
      tenantContext = {
        tenantId: 'PLATFORM_SUPERUSER',
        tenantSlug: 'platform',
        tenantName: 'Platform Superuser',
        orbitoxProjectId: 'platform',
        status: 'active',
      };
    } else if (pathname === '/accept-invite' || pathname === '/api/restaurant/auth/accept-invite') {
      tenantContext = {
        tenantId: 'PENDING_INVITE',
        tenantSlug: 'invite',
        tenantName: 'Pending Restaurant',
        status: 'trial',
      };
    } else {
      const rawHost = (req.headers.host || '').split(':')[0].trim();
      const acceptHeader = (req.headers.accept || '').toLowerCase();
      if (acceptHeader.includes('text/html')) {
        sendHtml(res, renderTenantNotFoundPage(rawHost || 'unknown'), 404);
      } else {
        sendJson(res, 404, {
          error: 'NOT_FOUND',
          code: 'TENANT_NOT_FOUND',
          message: `No restaurant tenant configured for host: ${rawHost || 'unknown'}`,
        });
      }
      return;
    }
  }

  res.setHeader('x-tenant-id', tenantContext.tenantId);
  return withTenantContext(tenantContext, async () => {
    const repo = getTenantRepository(tenantContext, postgresStore?.prisma, eventBus);
    const startHrTime = process.hrtime.bigint();
    const rawReqId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const requestId = validateOrGenerateRequestId(rawReqId);
    res.setHeader('x-request-id', requestId);

  // Context Hierarchy Validation
  const branches = await repo.getBranches();
  const floors = await repo.getFloors();
  const context = validateAndResolveContext(
    branches,
    floors,
    parsedUrl.query.branch as string,
    parsedUrl.query.floor as string,
    (parsedUrl.query.service || parsedUrl.query.shift) as string
  );

  const currentBranch = (await repo.getBranch(context.branchId)) || branches[0];
  const currentFloor = (await repo.getFloor(context.floorId)) || floors[0];
  const serviceShift = context.serviceName;

  res.on('finish', () => {
    if (pathname === '/favicon.ico') return;
    const durationNs = process.hrtime.bigint() - startHrTime;
    const durationMs = Math.round(Number(durationNs) / 10_000) / 100;
    logger.log({
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      message: `${method} ${pathname} ${res.statusCode} (${durationMs}ms)`,
      requestId,
      tenantId: tenantContext.tenantId,
      method,
      pathname,
      status: res.statusCode,
      durationMs,
      branchId: currentBranch?.id,
    });
  });

  const requestIdentity = await resolveRequestIdentity(req, tenantContext.tenantId, repo);
  const activeStaffToken = requestIdentity.rawToken;
  const activeStaffRole = requestIdentity.role || (requestIdentity.type === 'ADMIN' ? 'ADMIN' : undefined);

  // CSRF Protection Policy for Cookie-Authenticated Mutations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && requestIdentity.authSource === 'COOKIE') {
    if (!isSameOriginRequest(req)) {
      sendJson(res, 403, {
        error: 'CSRF_REJECTED',
        code: 'CSRF_REJECTED',
        message: 'Cross-origin mutation rejected by CSRF protection policy.',
      });
      return;
    }
  }

  // CORS Preflight
  if (method === 'OPTIONS') {
    const allowedOrigin = resolveAllowedOrigin(req);
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-idempotency-key, x-session-id, x-order-token, x-request-id, x-correlation-id, x-station-token',
      'Access-Control-Expose-Headers': 'x-request-id',
    };
    if (allowedOrigin) {
      headers['Access-Control-Allow-Origin'] = allowedOrigin;
      headers['Vary'] = 'Origin';
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // Enforce In-Memory Token Bucket Rate Limiting per Tenant
  if (!pathname.startsWith('/internal/') && pathname !== '/health' && pathname !== '/manifest.json') {
    const isStaffReq = Boolean(activeStaffToken) || requestIdentity.type === 'STAFF' || requestIdentity.type === 'ADMIN' || requestIdentity.type === 'STATION';
    const rateLimit = checkTenantRateLimit(tenantContext.tenantId, isStaffReq);
    res.setHeader('x-ratelimit-remaining', String(rateLimit.remaining));
    if (!rateLimit.allowed) {
      res.setHeader('retry-after', String(rateLimit.resetSeconds));
      sendJson(res, 429, {
        error: 'RATE_LIMIT_EXCEEDED',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests for tenant ${tenantContext.tenantId}. Please retry after ${rateLimit.resetSeconds}s.`,
      });
      return;
    }
  }

  // --- PUBLIC PWA WEB MANIFEST (/manifest.json) ---
  if (pathname === '/manifest.json' && method === 'GET') {
    const brand = await repo.getTenantBrand();
    const manifest = {
      name: brand?.restaurantName || tenantContext.tenantName,
      short_name: brand?.restaurantName || tenantContext.tenantSlug,
      description: brand?.tagline || `${brand?.restaurantName || tenantContext.tenantName} digital dining experience`,
      start_url: '/',
      display: 'standalone',
      theme_color: brand?.primaryColor || '#C86B3C',
      background_color: '#080A0D',
      icons: [
        {
          src: brand?.logoUrl || brand?.faviconUrl || '/favicon.ico',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    };
    res.writeHead(200, {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(JSON.stringify(manifest, null, 2));
    return;
  }

  // Gating for test and debug routes: require RESTAURANTOS_ENABLE_TEST_ROUTES === 'true'
  const isTestOrDebugRoute =
    pathname.startsWith('/api/test/') ||
    pathname.startsWith('/debug/') ||
    pathname === '/debug' ||
    pathname.startsWith('/api/restaurant/test/') ||
    pathname === '/api/restaurant/reseed';

  if (isTestOrDebugRoute) {
    if (process.env.RESTAURANTOS_ENABLE_TEST_ROUTES !== 'true') {
      sendJson(res, 404, {
        error: 'NOT_FOUND',
        code: 'NOT_FOUND',
        message: 'Endpoint not found or test routes disabled.',
      });
      return;
    }
  }

  // Dev/Test helper endpoint for injecting tasks in test environments
  if (process.env.NODE_ENV !== 'production' && pathname === '/api/test/inject-task' && method === 'POST') {
    const body = await parseBody(req);
    await repo.addKitchenTask(body);
    sendJson(res, 200, { success: true, task: body });
    return;
  }

  // --- TENANT SUSPENSION ENFORCEMENT ---
  if (postgresStore && !pathname.startsWith('/internal/')) {
    const currentTenant = await postgresStore.getTenant(tenantContext.tenantId);
    if (currentTenant?.status === 'suspended') {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        sendJson(res, 403, {
          error: 'TENANT_SUSPENDED',
          code: 'TENANT_SUSPENDED',
          message: 'This restaurant account is temporarily suspended. Writes are disabled.',
        });
        return;
      }
      if (method === 'GET' && (pathname === '/' || pathname.startsWith('/dine') || pathname.startsWith('/kds') || pathname.startsWith('/swift-bite') || pathname.startsWith('/crave-atlas') || pathname.startsWith('/operations'))) {
        sendHtml(res, renderSuspendedTenantPage(currentTenant.name));
        return;
      }
    }
  }

  // --- OWNER INVITE ACCEPTANCE FLOW ---
  if (pathname === '/accept-invite' && method === 'GET') {
    const token = (parsedUrl.query.token as string) || '';
    sendHtml(res, renderOwnerInvitePage(token, tenantContext.tenantName));
    return;
  }

  if (pathname === '/api/restaurant/auth/accept-invite' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const secret = (body.secret || body.password || body.pin || '').toString().trim();
      const acceptRes = await provisioningService.acceptOwnerInvite({
        token: body.token,
        pin: secret,
        secret,
        ownerName: body.name || body.ownerName,
      });
      sendJson(res, 200, acceptRes);
    } catch (err: any) {
      sendJson(res, 400, { error: 'INVITE_ACCEPTANCE_FAILED', message: err.message });
    }
    return;
  }

  // --- PLATFORM INTERNAL TENANT PROVISIONING & LIFECYCLE ---
  if (pathname.startsWith('/internal/tenants')) {
    if (!verifyPlatformAuth(req)) {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
        message: 'Platform service credentials required (RESTAURANTOS_PLATFORM_TOKEN >= 32 chars).',
      });
      return;
    }

    if (pathname === '/internal/tenants' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const idemKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
        const result = await provisioningService.provisionTenant({
          ...body,
          idempotencyKey: idemKey,
        });
        sendJson(res, 201, result);
      } catch (err: any) {
        const status = err.message.includes('already taken') ? 409 : 400;
        sendJson(res, status, { error: 'PROVISIONING_FAILED', message: err.message });
      }
      return;
    }

    if (pathname === '/internal/tenants' && method === 'GET') {
      try {
        const page = parsedUrl.query.page ? parseInt(parsedUrl.query.page as string, 10) : 1;
        const limit = parsedUrl.query.limit ? parseInt(parsedUrl.query.limit as string, 10) : 20;
        const search = (parsedUrl.query.search as string) || undefined;
        const status = (parsedUrl.query.status as string) || undefined;
        const list = await provisioningService.listTenants({ page, limit, search, status });
        sendJson(res, 200, list);
      } catch (err: any) {
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: err.message });
      }
      return;
    }

    const exportMatch = /^\/internal\/tenants\/([^/]+)\/export$/.exec(pathname);
    if (exportMatch && method === 'GET') {
      const tenantId = exportMatch[1];
      try {
        const data = await provisioningService.exportTenantData(tenantId);
        sendJson(res, 200, data);
      } catch (err: any) {
        sendJson(res, 404, { error: 'NOT_FOUND', message: err.message });
      }
      return;
    }

    const suspendMatch = /^\/internal\/tenants\/([^/]+)\/suspend$/.exec(pathname);
    if (suspendMatch && method === 'POST') {
      const tenantId = suspendMatch[1];
      try {
        const updated = await provisioningService.suspendTenant(tenantId);
        invalidateTenantResolutionCache(tenantId);
        sendJson(res, 200, { success: true, tenant: updated });
      } catch (err: any) {
        sendJson(res, 400, { error: 'SUSPEND_FAILED', message: err.message });
      }
      return;
    }

    const resumeMatch = /^\/internal\/tenants\/([^/]+)\/resume$/.exec(pathname);
    if (resumeMatch && method === 'POST') {
      const tenantId = resumeMatch[1];
      try {
        const updated = await provisioningService.resumeTenant(tenantId);
        invalidateTenantResolutionCache(tenantId);
        sendJson(res, 200, { success: true, tenant: updated });
      } catch (err: any) {
        sendJson(res, 400, { error: 'RESUME_FAILED', message: err.message });
      }
      return;
    }

    const cancelMatch = /^\/internal\/tenants\/([^/]+)\/cancel$/.exec(pathname);
    if (cancelMatch && method === 'POST') {
      const tenantId = cancelMatch[1];
      try {
        const updated = await provisioningService.cancelTenant(tenantId);
        invalidateTenantResolutionCache(tenantId);
        sendJson(res, 200, { success: true, tenant: updated });
      } catch (err: any) {
        sendJson(res, 400, { error: 'CANCEL_FAILED', message: err.message });
      }
      return;
    }

    const detailMatch = /^\/internal\/tenants\/([^/]+)$/.exec(pathname);
    if (detailMatch && method === 'GET') {
      const tenantId = detailMatch[1];
      try {
        const tenant = await provisioningService.getTenantDetails(tenantId);
        if (!tenant) {
          sendJson(res, 404, { error: 'TENANT_NOT_FOUND', message: `Tenant ${tenantId} not found` });
          return;
        }
        sendJson(res, 200, tenant);
      } catch (err: any) {
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: err.message });
      }
      return;
    }

    if (detailMatch && method === 'PATCH') {
      const tenantId = detailMatch[1];
      try {
        const body = await parseBody(req);
        const updated = await provisioningService.updateTenant(tenantId, body);
        sendJson(res, 200, { success: true, tenant: updated });
      } catch (err: any) {
        sendJson(res, 400, { error: 'UPDATE_FAILED', message: err.message });
      }
      return;
    }
  }

  // --- AUTHENTICATION & CREDENTIAL MANAGEMENT (TENANT-SCOPED) ---
  if (
    (pathname === '/api/restaurant/auth/staff-token' ||
      pathname === '/api/restaurant/auth/token' ||
      pathname === '/api/restaurant/auth/api-token' ||
      pathname === '/api/restaurant/auth/login' ||
      pathname === '/api/restaurant/auth/staff') &&
    method === 'POST'
  ) {
    const body = await parseBody(req);
    const clientIp = resolveClientIp(req);
    const tenantId = tenantContext.tenantId;

    // Staff identifier extraction: staffId, email, phone, or identifier
    const identifier = (
      body.identifier ||
      body.staffId ||
      body.username ||
      body.email ||
      body.phone ||
      ''
    ).toString().trim();

    // Secret extraction: secret, password, or pin
    const secret = (
      body.secret !== undefined
        ? body.secret
        : body.password !== undefined
        ? body.password
        : body.pin !== undefined
        ? body.pin
        : ''
    ).toString().trim();

    // Item 1 requirement: "Do not search all staff by PIN alone."
    if (!identifier) {
      sendJson(res, 400, {
        error: 'IDENTIFIER_REQUIRED',
        code: 'IDENTIFIER_REQUIRED',
        message: 'Staff identifier (staffId, email, or phone) is required. Global PIN search is disabled.',
      });
      return;
    }

    if (!secret) {
      sendJson(res, 400, {
        error: 'SECRET_REQUIRED',
        code: 'SECRET_REQUIRED',
        message: 'Staff secret or password is required.',
      });
      return;
    }

    // 1. Check lockout before searching
    const lockout = checkStaffLockout(tenantId, identifier, clientIp);
    if (lockout.isLocked) {
      await repo.appendEvent('STAFF_AUTH_LOCKED', 'auth-gateway', currentBranch?.id || '*', {
        clientIp,
        identifier,
      });
      sendJson(res, 429, {
        error: 'TOO_MANY_FAILED_ATTEMPTS',
        code: 'TOO_MANY_FAILED_ATTEMPTS',
        message: lockout.error || 'Too many failed login attempts. Account temporarily locked.',
      });
      return;
    }

    // 2. Look up staff strictly within tenant repository
    const member = await repo.getStaffMemberByIdentifier(identifier);
    if (!member) {
      const fail = recordFailedStaffAttempt(tenantId, identifier, clientIp);
      await repo.appendEvent('STAFF_AUTH_FAILED', 'auth-gateway', currentBranch?.id || '*', {
        clientIp,
        identifier,
        reason: 'STAFF_NOT_FOUND',
      });
      if (fail.isLocked) {
        sendJson(res, 429, {
          error: 'TOO_MANY_FAILED_ATTEMPTS',
          code: 'TOO_MANY_FAILED_ATTEMPTS',
          message: fail.error,
        });
        return;
      }
      sendJson(res, 401, {
        error: 'INVALID_CREDENTIALS',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid staff identifier or secret.',
      });
      return;
    }

    // 3. Status check
    if (member.status !== 'ACTIVE') {
      sendJson(res, 401, {
        error: 'ACCOUNT_REVOKED',
        code: 'ACCOUNT_REVOKED',
        message: 'Staff account has been revoked or suspended.',
      });
      return;
    }

    // 4. Role & Secret strength enforcement
    const isHighPrivilege = member.role === 'OWNER' || member.role === 'ADMIN' || member.role === 'MANAGER';
    if (isHighPrivilege) {
      // Owner/Manager require a stronger secret (>= 8 chars password or PIN + second factor)
      if (secret.length < 8) {
        const secondFactor =
          body.secondFactor ||
          body.mfaCode ||
          body.totp ||
          body.deviceToken ||
          (req.headers['x-second-factor'] as string) ||
          (req.headers['x-device-token'] as string);
        if (!secondFactor) {
          sendJson(res, 400, {
            error: 'STRONG_SECRET_REQUIRED',
            code: 'STRONG_SECRET_REQUIRED',
            message:
              'Owner and Manager roles require a password of at least 8 characters or a PIN paired with a verified second factor.',
          });
          return;
        }
      }
    } else {
      // Floor / kitchen roles (SERVER, OPERATIONS, POS, CHEF)
      // "floor/kitchen roles may keep short PINs only when the device is enrolled to the tenant and branch (device token), not from the open internet."
      if (secret.length < 8) {
        const deviceToken = body.deviceToken || (req.headers['x-device-token'] as string);
        if (!deviceToken) {
          sendJson(res, 403, {
            error: 'DEVICE_ENROLLMENT_REQUIRED',
            code: 'DEVICE_ENROLLMENT_REQUIRED',
            message:
              'Short PIN login for floor and kitchen roles requires an enrolled device token.',
          });
          return;
        }
        const verifyDev = verifyDeviceToken(deviceToken, tenantId, member.branchId);
        if (!verifyDev.valid) {
          sendJson(res, 403, {
            error: 'INVALID_DEVICE_TOKEN',
            code: 'INVALID_DEVICE_TOKEN',
            message: `Invalid device token for tenant/branch: ${verifyDev.error}`,
          });
          return;
        }
      }
    }

    // 5. Cryptographic secret verification (scrypt slow hash with timing-safe comparison)
    const verification = verifyStaffSecret(secret, member.pinHash, member.salt);
    if (!verification.valid) {
      const fail = recordFailedStaffAttempt(tenantId, member.id, clientIp);
      await repo.appendEvent('STAFF_AUTH_FAILED', 'auth-gateway', member.branchId, {
        clientIp,
        staffId: member.id,
        reason: 'SECRET_MISMATCH',
      });
      if (fail.isLocked) {
        sendJson(res, 429, {
          error: 'TOO_MANY_FAILED_ATTEMPTS',
          code: 'TOO_MANY_FAILED_ATTEMPTS',
          message: fail.error,
        });
        return;
      }
      sendJson(res, 401, {
        error: 'INVALID_CREDENTIALS',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid staff authentication secret.',
      });
      return;
    }

    // 6. Reset failed counter on success
    recordSuccessfulStaffAttempt(tenantId, member.id, clientIp);

    // 7. Transparent migration path: re-hash on login if using legacy hash
    if (verification.needsRehash) {
      const updatedHash = hashStaffSecretSync(secret, member.salt);
      await repo.updateStaffMemberSecret(member.id, updatedHash, member.salt);
    }

    // 8. Issue strictly tenant-bound staff token
    const token = issueStaffToken({
      sub: member.id,
      name: member.name,
      role: member.role,
      tenantId: tenantContext.tenantId, // STRICTLY BOUND
      branchId: member.branchId,
      station: member.station,
      permissions: member.permissions as string[] | undefined,
      expiresInSeconds: 3600, // Short expiry (1 hour)
    });

    await repo.appendEvent('STAFF_TOKEN_ISSUED', 'auth-gateway', member.branchId, {
      staffId: member.id,
      role: member.role,
      tenantId: tenantContext.tenantId,
    });

    const isExplicitApiFlow =
      pathname === '/api/restaurant/auth/token' ||
      pathname === '/api/restaurant/auth/staff-token' ||
      pathname === '/api/restaurant/auth/api-token' ||
      body.flow === 'token' ||
      body.flow === 'bearer' ||
      parsedUrl.query.flow === 'token' ||
      parsedUrl.query.flow === 'bearer';

    if (!isExplicitApiFlow) {
      const isHttps = Boolean((req.socket as any)?.encrypted || req.headers['x-forwarded-proto'] === 'https');
      const secureFlag = isHttps ? '; Secure' : '';
      res.setHeader(
        'Set-Cookie',
        `orb_staff_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=3600`
      );

      sendJson(res, 200, {
        success: true,
        data: {
          staffId: member.id,
          name: member.name,
          role: member.role,
          station: member.station,
          branchId: member.branchId,
          tenantId: tenantContext.tenantId,
          expiresInSeconds: 3600,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      });
      return;
    } else {
      sendJson(res, 200, {
        success: true,
        data: {
          token,
          tokenType: 'Bearer',
          staffId: member.id,
          name: member.name,
          role: member.role,
          station: member.station,
          branchId: member.branchId,
          tenantId: tenantContext.tenantId,
          expiresInSeconds: 3600,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      });
      return;
    }
  }

  // --- DEVICE ENROLLMENT ENDPOINT ---
  if (pathname === '/api/restaurant/auth/device-enroll' && method === 'POST') {
    const identity = requestIdentity;
    if (
      identity.type !== 'ADMIN' &&
      identity.role !== 'MANAGER' &&
      identity.role !== 'OWNER' &&
      !verifyPlatformAuth(req)
    ) {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        message: 'Manager or Owner credentials required to enroll physical devices.',
      });
      return;
    }
    const body = await parseBody(req);
    const targetBranch = body.branchId || identity.branchId || currentBranch?.id || '*';
    const deviceToken = issueDeviceToken({
      tenantId: tenantContext.tenantId,
      branchId: targetBranch,
      deviceId: body.deviceId,
    });
    sendJson(res, 200, {
      success: true,
      data: {
        deviceToken,
        tenantId: tenantContext.tenantId,
        branchId: targetBranch,
        deviceId: body.deviceId,
      },
    });
    return;
  }

  // --- LOGOUT ENDPOINT ---
  if (pathname === '/api/restaurant/auth/logout' && method === 'POST') {
    const isHttps = Boolean((req.socket as any)?.encrypted || req.headers['x-forwarded-proto'] === 'https');
    const secureFlag = isHttps ? '; Secure' : '';
    res.setHeader('Set-Cookie', `orb_staff_token=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0`);

    const tokenToRevoke = requestIdentity.rawToken;
    if (tokenToRevoke) {
      if (tokenToRevoke.startsWith('cap_')) {
        await repo.revokeCapabilityToken(tokenToRevoke);
        eventBus.disconnectClientsForToken(tokenToRevoke);
      } else {
        await repo.revokeStaffToken(tokenToRevoke);
        eventBus.disconnectClientsForToken(tokenToRevoke);
      }
      await repo.appendEvent(
        'STAFF_SESSION_TERMINATED',
        'auth-gateway',
        requestIdentity.branchId || '*',
        { staffId: requestIdentity.id, reason: 'LOGOUT' }
      );
    }
    sendJson(res, 200, { success: true, message: 'Logged out successfully' });
    return;
  }

  if (pathname === '/api/restaurant/auth/revoke' && method === 'POST') {
    const identity = requestIdentity;
    const body = await parseBody(req);
    const targetToken = body.token || '';

    if (!targetToken) {
      sendJson(res, 400, { error: 'MISSING_TOKEN', code: 'MISSING_TOKEN', message: 'Token parameter is required.' });
      return;
    }

    // Must be privileged (MANAGER/ADMIN) OR revoking one's own token
    const isSelfRevocation = identity.id === targetToken;
    if (!identity.isPrivileged && !isSelfRevocation) {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Revoking other credentials requires manager privileges.',
      });
      return;
    }

    if (targetToken.startsWith('cap_')) {
      await repo.revokeCapabilityToken(targetToken);
      eventBus.disconnectClientsForToken(targetToken);
    } else {
      await repo.revokeStaffToken(targetToken);
      eventBus.disconnectClientsForToken(targetToken);
    }

    await repo.appendEvent(
      'SECURITY_TOKEN_REVOKED',
      'auth-gateway',
      identity.branchId || '*',
      { authorizedBy: identity.id, isSelfRevocation }
    );

    sendJson(res, 200, { success: true, message: 'Credential revoked successfully.' });
    return;
  }

  // --- STAFF MANAGEMENT API ---
  // List staff directory (PIN hashes & salts stripped)
  if (pathname === '/api/restaurant/staff' && method === 'GET') {
    const identity = requestIdentity;
    if (
      identity.type === 'ANONYMOUS' ||
      identity.type === 'DINER' ||
      identity.type === 'REVOKED_CAPABILITY' ||
      identity.type === 'INVALID_CREDENTIAL'
    ) {
      sendJson(res, 401, {
        error: 'AUTHENTICATION_REQUIRED',
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Staff or manager credentials required to view staff directory.',
      });
      return;
    }

    const queryBranch = (parsedUrl.query.branchId as string) || (identity.branchId !== '*' ? identity.branchId : undefined);
    const members = await repo.getStaffMembers();
    const staffList = members
      .filter((m) => !queryBranch || queryBranch === '*' || m.branchId === '*' || m.branchId === queryBranch)
      .map(({ salt, pinHash, ...safe }) => safe);
    sendJson(res, 200, { success: true, data: staffList });
    return;
  }

  // Create staff member
  if (pathname === '/api/restaurant/staff' && method === 'POST') {
    const identity = requestIdentity;
    if (
      identity.type === 'ANONYMOUS' ||
      identity.type === 'INVALID_CREDENTIAL' ||
      identity.type === 'REVOKED_CAPABILITY'
    ) {
      sendJson(res, 401, {
        error: 'AUTHENTICATION_REQUIRED',
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
      return;
    }

    if (identity.role !== 'MANAGER' && identity.role !== 'ADMIN' && identity.role !== 'OWNER' && identity.type !== 'ADMIN') {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Manager or administrator credentials required to provision staff members.',
      });
      return;
    }

    const body = await parseBody(req);
    const targetBranchId = body.branchId || identity.branchId || 'branch_ldh';

    // Cross-branch check: Non-admin manager cannot assign staff to other branches
    if (identity.branchId && identity.branchId !== '*' && targetBranchId !== identity.branchId) {
      sendJson(res, 403, {
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Manager for branch ${identity.branchId} cannot provision staff for branch ${targetBranchId}.`,
      });
      return;
    }

    // Privilege escalation check: only ADMIN/OWNER can assign ADMIN role
    if (body.role === 'ADMIN' && identity.role !== 'ADMIN' && identity.role !== 'OWNER') {
      sendJson(res, 403, {
        error: 'PRIVILEGE_ESCALATION',
        code: 'PRIVILEGE_ESCALATION',
        message: 'Only platform administrators or owners can provision the ADMIN role.',
      });
      return;
    }

    if (!body.name || (!body.pin && !body.secret) || !body.role) {
      sendJson(res, 400, {
        error: 'VALIDATION_ERROR',
        code: 'VALIDATION_ERROR',
        message: 'Name, role, and PIN/secret are required.',
      });
      return;
    }

    try {
      const id = `stf_${body.role.toLowerCase()}_${targetBranchId.replace('branch_', '')}_${Date.now().toString(36)}`;
      const salt = `salt_${targetBranchId}_${crypto.randomBytes(8).toString('hex')}`;
      const pinHash = hashStaffSecretSync(body.secret || body.pin, salt);
      const member = {
        id,
        name: body.name.trim(),
        role: body.role,
        branchId: targetBranchId,
        station: body.station,
        salt,
        pinHash,
        status: 'ACTIVE' as const,
        permissions: body.permissions,
      };
      await repo.saveStaffMember(member);

      await runtimeController.emitAudit('STAFF_MEMBER_CREATED', identity.id, {
        staffId: member.id,
        role: member.role,
        branchId: member.branchId,
        station: member.station,
      });

      const { salt: _s, pinHash: _p, ...safe } = member;
      sendJson(res, 201, { success: true, data: safe });
      return;
    } catch (err: any) {
      sendJson(res, 400, { error: 'VALIDATION_ERROR', message: err.message });
      return;
    }
  }

  // Update staff member
  if (
    pathname.startsWith('/api/restaurant/staff/') &&
    !pathname.endsWith('/revoke') &&
    (method === 'PATCH' || method === 'PUT')
  ) {
    const identity = requestIdentity;
    if (
      identity.type === 'ANONYMOUS' ||
      identity.type === 'INVALID_CREDENTIAL' ||
      identity.type === 'REVOKED_CAPABILITY'
    ) {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    if (identity.role !== 'MANAGER' && identity.role !== 'ADMIN' && identity.role !== 'OWNER' && identity.type !== 'ADMIN') {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Manager credentials required.' });
      return;
    }

    const staffId = pathname.split('/')[4];
    const targetMember = await repo.getStaffMember(staffId);
    if (!targetMember) {
      sendJson(res, 404, { error: 'STAFF_NOT_FOUND', code: 'STAFF_NOT_FOUND', message: `Staff member ${staffId} not found.` });
      return;
    }

    // Branch scoping
    if (identity.branchId && identity.branchId !== '*' && targetMember.branchId !== '*' && targetMember.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Manager for branch ${identity.branchId} cannot modify staff in branch ${targetMember.branchId}.`,
      });
      return;
    }

    const body = await parseBody(req);
    // Privilege escalation guard
    if (body.role === 'ADMIN' && identity.role !== 'ADMIN' && identity.role !== 'OWNER') {
      sendJson(res, 403, {
        error: 'PRIVILEGE_ESCALATION',
        code: 'PRIVILEGE_ESCALATION',
        message: 'Only platform administrators or owners can grant the ADMIN role.',
      });
      return;
    }

    if (body.name !== undefined) targetMember.name = body.name.trim();
    if (body.role !== undefined) targetMember.role = body.role;
    if (body.branchId !== undefined) targetMember.branchId = body.branchId;
    if (body.station !== undefined) targetMember.station = body.station;
    if (body.status !== undefined) targetMember.status = body.status;
    if (body.permissions !== undefined) targetMember.permissions = body.permissions;
    if (body.pin || body.secret) {
      targetMember.salt = `salt_${targetMember.branchId}_${crypto.randomBytes(8).toString('hex')}`;
      targetMember.pinHash = hashStaffSecretSync(body.secret || body.pin, targetMember.salt);
    }

    await repo.saveStaffMember(targetMember);
    await runtimeController.emitAudit('STAFF_MEMBER_UPDATED', identity.id, {
      staffId,
      updates: { role: body.role, station: body.station, branchId: body.branchId, status: body.status },
    });

    const { salt: _s, pinHash: _p, ...safe } = targetMember;
    sendJson(res, 200, { success: true, data: safe });
    return;
  }

  // Revoke staff member tokens by staff ID
  if (pathname.startsWith('/api/restaurant/staff/') && pathname.endsWith('/revoke') && method === 'POST') {
    const identity = requestIdentity;
    if (
      identity.type === 'ANONYMOUS' ||
      identity.type === 'INVALID_CREDENTIAL' ||
      identity.type === 'REVOKED_CAPABILITY'
    ) {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    const staffId = pathname.split('/')[4];
    const targetMember = await repo.getStaffMember(staffId);
    if (!targetMember) {
      sendJson(res, 404, { error: 'STAFF_NOT_FOUND', code: 'STAFF_NOT_FOUND', message: `Staff member ${staffId} not found.` });
      return;
    }

    const isSelf = identity.id === staffId;
    if (!identity.isPrivileged && !isSelf) {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Manager privileges required to revoke staff credentials.',
      });
      return;
    }

    // Branch scoping
    if (identity.branchId && identity.branchId !== '*' && targetMember.branchId !== '*' && targetMember.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Manager for branch ${identity.branchId} cannot revoke staff in branch ${targetMember.branchId}.`,
      });
      return;
    }

    await repo.revokeStaffMember(staffId);
    await runtimeController.emitAudit('STAFF_MEMBER_REVOKED', identity.id, { staffId });

    sendJson(res, 200, {
      success: true,
      message: `All current and future tokens for staff member ${staffId} have been durably revoked.`,
    });
    return;
  }

  // Reset PIN lockout tracker
  if (pathname === '/api/restaurant/staff/reset-lockout' && method === 'POST') {
    const identity = requestIdentity;
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager privileges required to reset lockouts.' });
      return;
    }
    const body = await parseBody(req);
    resetStaffLockout(body.key);
    sendJson(res, 200, { success: true, message: 'Lockout tracker reset successfully.' });
    return;
  }

  // --- KUBERNETES / DOCKER STANDARD HEALTH PROBES (Phase 6A) ---
  // 1. Liveness Probe (/healthz/live): confirms process is responsive and event loop is alive
  if (pathname === '/healthz/live' && method === 'GET') {
    sendJson(res, 200, {
      status: 'LIVE',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 2. Readiness Probe (/healthz/ready): verifies operational dependencies required for serving traffic
  if (pathname === '/healthz/ready' && method === 'GET') {
    const lagMetrics = eventLoopMonitor.getMetrics();
    const isStoreWritable = store && typeof (store as any).checkWritable === 'function' ? (store as any).checkWritable() : true;
    const isSecurityReady = typeof isStaffTokenRevoked === 'function';

    const checks: Record<string, string> = {
      storage: isStoreWritable ? 'OK' : 'DEGRADED',
      eventLoop: lagMetrics.healthy ? 'OK' : 'DEGRADED',
      security: isSecurityReady ? 'OK' : 'DEGRADED',
    };

    const isReady = isStoreWritable && lagMetrics.healthy && isSecurityReady;
    const statusCode = isReady ? 200 : 503;

    sendJson(res, statusCode, {
      status: isReady ? 'READY' : 'NOT_READY',
      checks,
      latency: {
        eventLoopP50Ms: lagMetrics.p50Ms,
        eventLoopP99Ms: lagMetrics.p99Ms,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 3. Event Cursor State Inspection (/api/restaurant/events/cursor) (Phase 6B)
  if (pathname === '/api/restaurant/events/cursor' && method === 'GET') {
    const events = await repo.getEvents();
    const lastSeq = events.length > 0 ? (events[events.length - 1].sequence || events.length) : 0;
    const oldestSeq = events.length > 0 ? (events[0].sequence || 1) : 0;
    sendJson(res, 200, {
      currentSequence: lastSeq,
      oldestSequence: oldestSeq,
      retainedEventsCount: events.length,
      branchId: currentBranch.id,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // --- HEALTH & STATUS ---
  if (pathname === '/health') {
    const config = runtimeController.getActiveConfig();
    const tables = await repo.getTables();
    const events = await repo.getEvents();
    sendJson(res, 200, {
      status: 'HEALTHY',
      service: 'restaurant-os-runtime',
      port: PORT,
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      controlBridgeConnected: true,
      desiredRevision: runtimeController.getDesiredRevision(),
      appliedRevision: runtimeController.getAppliedRevision(),
      configVersion: config?.configVersion || 1,
      features: config?.features || {},
      storeRevision: 1,
      totalTables: tables.length,
      outboxEventsCount: events.length,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // --- REALTIME SERVER-SENT EVENTS (SSE) STREAM ---
  if (pathname === '/api/restaurant/events') {
    const identity = requestIdentity;
    if (identity.type === 'REVOKED_CAPABILITY' || identity.type === 'INVALID_CREDENTIAL') {
      sendJson(res, 401, {
        error: 'REVOKED_CAPABILITY',
        code: identity.type,
        message: 'Guest capability token has expired or credential is invalid. SSE subscription rejected.',
      });
      return;
    }
    if (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS') {
      sendJson(res, 401, {
        error: 'AUTHENTICATION_REQUIRED',
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Realtime SSE subscription requires a valid guest or staff credential in production mode.',
      });
      return;
    }
    eventBus.registerClient(req, res, repo, identity);
    return;
  }

  // --- RESTAURANT REST APIS ---

  // 1. Table QR Discovery
  if (pathname.startsWith('/api/restaurant/qr/')) {
    const locator = pathname.replace('/api/restaurant/qr/', '');
    const table = await repo.getTableByLocator(locator);
    if (!table) {
      sendJson(res, 404, {
        error: 'TABLE_NOT_FOUND',
        code: 'TABLE_NOT_FOUND',
        message: `No table found for locator: ${locator}`,
      });
      return;
    }
    const tenantBrand = await repo.getTenantBrand();
    sendJson(res, 200, {
      success: true,
      data: {
        tableId: `tbl_${table.id}`,
        tableNumber: table.number,
        capacity: table.capacity,
        status: table.status,
        locator: table.locator,
        section: table.section,
        restaurantName: tenantBrand?.restaurantName || tenantContext.tenantName || 'OrbitoX Restaurant',
        activeSession: {
          sessionId: table.activeSessionId || `sess_${locator.slice(0, 4)}`,
          hostName: 'Guest Host',
          seatingCapacity: table.capacity,
        },
      },
    });
    return;
  }

  // 2. Public Culinary Menu Catalog
  if (pathname === '/api/restaurant/menu') {
    const items = await repo.getMenuItems();
    sendJson(res, 200, {
      success: true,
      data: items,
    });
    return;
  }

  // 3. Seating Session Join
  if (pathname === '/api/restaurant/sessions/join' && method === 'POST') {
    const body = await parseBody(req);
    let targetTbl: TableFloorRecord | undefined;
    if (body.locator) {
      targetTbl = await repo.getTableByLocator(body.locator);
    }
    if (!targetTbl && body.tableNumber) {
      targetTbl = await repo.getTableByNumber(body.tableNumber);
    }
    if (!targetTbl && body.tableNumber) {
      targetTbl = await repo.getTableByNumber(`T-${body.tableNumber}`);
    }
    if (!targetTbl && body.tableId) {
      targetTbl = await repo.getTable(body.tableId);
    }

    if (!targetTbl) {
      sendJson(res, 404, {
        error: 'TABLE_NOT_FOUND',
        code: 'TABLE_NOT_FOUND',
        message: `Table not found for provided locator/number: ${body.locator || body.tableNumber || body.tableId}`,
      });
      return;
    }

    const tableNum = targetTbl.number;
    const capabilityToken = `cap_${crypto.randomBytes(16).toString('hex')}`;
    const hostName = body.guestName || body.name || 'Primary Host';

    const session = await repo.createOrJoinSession(
      tableNum,
      hostName,
      targetTbl.branchId || currentBranch.id,
      targetTbl.floorId || currentFloor.id,
      capabilityToken
    );

    const s1 = targetTbl.seats?.find((s) => s.seatNumber === 1);
    if (s1 && !s1.guestName) {
      await repo.assignGuestToSeat(s1.id, hostName);
    }

    sendJson(res, 200, {
      success: true,
      data: {
        sessionId: session.sessionId,
        capabilityToken,
        tableNumber: tableNum,
        seatingType: body.seatingType || 'PRIMARY_HOST',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      },
    });
    return;
  }

  // 4. Session Close
  if (pathname === '/api/restaurant/sessions/close' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, {
        error: 'REVOKED_CAPABILITY',
        code: 'REVOKED_CAPABILITY',
        message: 'Guest capability token has expired or session is closed.',
      });
      return;
    }

    const body = await parseBody(req);
    let targetTbl: TableFloorRecord | undefined;
    if (body.tableNumber) {
      targetTbl = await repo.getTableByNumber(body.tableNumber);
    }
    if (!targetTbl && body.tableId) {
      targetTbl = await repo.getTable(body.tableId);
    }

    if (!targetTbl) {
      sendJson(res, 404, {
        error: 'TABLE_NOT_FOUND',
        code: 'TABLE_NOT_FOUND',
        message: `Table not found for session closure: ${body.tableNumber || body.tableId || 'unspecified'}`,
      });
      return;
    }

    const tableNum = targetTbl.number;

    if (identity.type === 'DINER' && identity.tableNumber && identity.tableNumber !== tableNum) {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Diner cannot close session for a different table.',
      });
      return;
    }

    const settlement =
      body.settlement ||
      (body.settlementMethod
        ? {
            method: body.settlementMethod,
            status: body.settlementStatus || 'PAID',
            amountMinor: body.amountMinor,
            reference: body.settlementRef,
            authorizedBy: body.authorizedBy || identity.id,
            reason: body.reason,
          }
        : undefined);

    const force = body.force === true;

    // Emergency force close or COMP/VOID settlements require verified privileged credentials!
    if (force || (settlement && (settlement.status === 'COMPED' || settlement.status === 'VOIDED' || settlement.method === 'EMERGENCY_OVERRIDE'))) {
      if (!identity.isPrivileged) {
        sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL') ? 401 : 403, {
          error: 'UNAUTHORIZED_OVERRIDE',
          code: 'UNAUTHORIZED_OVERRIDE',
          message: 'Emergency force closure or complimentary/void settlements require verified manager or privileged staff credentials.',
        });
        return;
      }
    }

    // Authorizer is strictly the authenticated identity, never an unverified string from request body!
    const authorizer = identity.isPrivileged ? identity.id : (identity.type === 'STAFF' ? identity.id : 'staff:pos');

    if (identity.branchId && identity.branchId !== '*' && targetTbl.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot close session for table in branch ${targetTbl.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }

    const result = await repo.closeSession(tableNum, settlement, force, {
      expectedRevision: body.expectedRevision,
      authorizedBy: authorizer,
      reason: body.reason,
    });

    if (!result.success) {
      const statusCode =
        result.code === 'TABLE_NOT_FOUND' ? 404 : result.code === 'REVISION_CONFLICT' ? 409 : 422;
      sendJson(res, statusCode, {
        code: result.code,
        error: result.code,
        message: result.error,
      });
      return;
    }

    if (result.session?.sessionId) {
      eventBus.disconnectClientsForSession(result.session.sessionId);
    }

    await runtimeController.emitAudit('SESSION_CLOSED', authorizer || 'staff:pos', {
      tableNumber: tableNum,
      settlement: result.session?.settlement,
      isEmergency: result.session?.settlement?.method === 'EMERGENCY_OVERRIDE',
    });

    sendJson(res, 200, {
      success: true,
      message: `Session closed for ${tableNum}`,
      table: result.table,
      session: result.session,
      isIdempotent: result.isIdempotent,
    });
    return;
  }

  // 4b. Authoritative Table Bill Settlement (POST /api/restaurant/tables/:id/settle & POST /api/restaurant/tables/settle)
  const isTableSettle =
    (pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/settle') && method === 'POST') ||
    (pathname === '/api/restaurant/tables/settle' && method === 'POST');

  if (isTableSettle) {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL') {
      sendJson(res, 401, {
        error: 'INVALID_CREDENTIAL',
        code: 'INVALID_CREDENTIAL',
        message: 'Supplied authorization token is invalid or tampered.',
      });
      return;
    }
    if (identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, {
        error: 'REVOKED_CAPABILITY',
        code: 'REVOKED_CAPABILITY',
        message: 'Credential or token has been revoked.',
      });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, {
        error: 'AUTHENTICATION_REQUIRED',
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Table settlement requires authenticated staff credentials.',
      });
      return;
    }

    const hasSettlementPrivilege =
      identity.isPrivileged ||
      identity.role === 'POS' ||
      identity.role === 'MANAGER' ||
      identity.role === 'ADMIN';

    if (!hasSettlementPrivilege) {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Table settlement requires POS or Manager privileges.',
      });
      return;
    }

    const body = await parseBody(req);
    let tableParam: string | number | undefined;
    if (pathname === '/api/restaurant/tables/settle') {
      tableParam = body.tableId !== undefined ? body.tableId : body.tableNumber;
    } else {
      const cleanPath = pathname.replace('/api/restaurant/tables/', '').replace('/settle', '');
      tableParam = /^\d+$/.test(cleanPath) ? parseInt(cleanPath, 10) : cleanPath;
    }

    const targetTable =
      typeof tableParam === 'number'
        ? await repo.getTable(tableParam)
        : await repo.getTableByNumber(String(tableParam));

    if (!targetTable) {
      sendJson(res, 404, {
        error: 'TABLE_NOT_FOUND',
        code: 'TABLE_NOT_FOUND',
        message: `Table ${tableParam} not found.`,
      });
      return;
    }

    if (identity.branchId && identity.branchId !== '*' && targetTable.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Staff token for branch ${identity.branchId} cannot settle table in branch ${targetTable.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }

    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
    if (idempotencyKey) {
      const existingIdempotent = await repo.getIdempotencyRecord(idempotencyKey);
      if (existingIdempotent) {
        const isPayloadMatch =
          existingIdempotent.tableNumber === targetTable.number &&
          (body.amountMinor === undefined || body.amountMinor === existingIdempotent.settlement?.amountMinor);
        if (isPayloadMatch) {
          sendJson(res, 200, {
            success: true,
            idempotentReplay: true,
            message: `Settlement already completed for Table ${targetTable.number} (idempotent replay)`,
            ...existingIdempotent,
          });
          return;
        } else {
          sendJson(res, 409, {
            error: 'IDEMPOTENCY_CONFLICT',
            code: 'IDEMPOTENCY_CONFLICT',
            message: `Idempotency key ${idempotencyKey} has already been used with different settlement parameters.`,
          });
          return;
        }
      }
    }

    const lockKey = `table_settle_${tenantContext.tenantId}_${targetTable.id}`;
    const idempLockKey = idempotencyKey ? `idemp_${tenantContext.tenantId}_${idempotencyKey}` : undefined;

    if (activeSettlementLocks.has(lockKey) || (idempLockKey && activeSettlementLocks.has(idempLockKey))) {
      sendJson(res, 409, {
        error: 'SETTLEMENT_IN_PROGRESS',
        code: 'SETTLEMENT_IN_PROGRESS',
        message: `Settlement is currently in progress for Table ${targetTable.number}. Concurrent settlement requests locked.`,
      });
      return;
    }
    activeSettlementLocks.add(lockKey);
    if (idempLockKey) {
      activeSettlementLocks.add(idempLockKey);
    }

    try {
      const authorizer = identity.id;
      await runtimeController.emitAudit('TABLE_SETTLEMENT_ATTEMPT', authorizer, {
        tableNumber: targetTable.number,
        tableId: targetTable.id,
        branchId: targetTable.branchId,
        requestedAmountMinor: body.amountMinor,
        method: body.paymentMethod || body.method || 'CASH',
      });

      const isProviderConfirmed = Boolean(body.providerConfirmed && body.gatewayTransactionId);
      const settlementPayload = {
        method: body.paymentMethod || body.method || 'CASH',
        status: body.paymentStatus || body.status || 'PAID',
        amountMinor: body.amountMinor,
        authorizedBy: authorizer,
        reason: body.reason,
        verification: isProviderConfirmed ? ('PROVIDER_CONFIRMED' as const) : ('MANUAL_STAFF_RECORDED' as const),
        providerConfirmed: isProviderConfirmed,
        gatewayTransactionId: body.gatewayTransactionId,
        settledAt: new Date().toISOString(),
      };

      const result = await repo.settleTableSession(targetTable.id, settlementPayload, {
        expectedRevision: body.expectedRevision,
        authorizedBy: authorizer,
        reason: body.reason,
        idempotencyKey,
        idempotencyRecord: idempotencyKey ? {
          tableNumber: targetTable.number,
          table: targetTable,
          settlement: settlementPayload,
        } : undefined,
      });

      if (!result.success) {
        const statusCode =
          result.code === 'TABLE_NOT_FOUND'
            ? 404
            : result.code === 'REVISION_CONFLICT'
            ? 409
            : result.code === 'PARTIAL_SETTLEMENT_UNRESOLVED'
            ? 422
            : result.code === 'UNPAID_BALANCE'
            ? 422
            : 400;
        sendJson(res, statusCode, {
          code: result.code,
          error: result.code,
          message: result.error,
        });
        return;
      }

      if (result.session?.sessionId) {
        try {
          eventBus.disconnectClientsForSession(result.session.sessionId);
        } catch (e) {
          console.error('⚠️ [Server] Failed to disconnect session clients:', e);
        }
      }

      try {
        await runtimeController.emitAudit('TABLE_SETTLEMENT_SUCCESS', authorizer, {
          tableNumber: targetTable.number,
          tableId: targetTable.id,
          settlement: result.session?.settlement,
          closedAt: result.session?.closedAt,
        });
      } catch (e) {
        console.error('⚠️ [Server] Failed to emit settlement audit:', e);
      }

      const responsePayload = {
        table: result.table,
        session: result.session,
        settlement: result.settlement || result.session?.settlement || settlementPayload,
        tableNumber: targetTable.number,
      };

      if (idempotencyKey) {
        await repo.saveIdempotencyRecord(idempotencyKey, responsePayload);
      }

      sendJson(res, 200, {
        success: true,
        message: `Table ${targetTable.number} successfully settled and vacated.`,
        ...responsePayload,
      });
      return;
    } finally {
      activeSettlementLocks.delete(lockKey);
      if (idempLockKey) {
        activeSettlementLocks.delete(idempLockKey);
      }
    }
  }

  // 5. Deterministic Pricing Quote
  if (pathname === '/api/restaurant/quote' && method === 'POST') {
    const body = await parseBody(req);
    const items = body.items || body.cartItems || [];
    let subtotalMinor = 0;
    const menuItems = await repo.getMenuItems();

    for (const item of items) {
      const found = menuItems.find((m) => m.id === (item.id || item.itemId));
      let unitPrice = found ? found.basePriceMinor : 35000;
      if (item.selectedModifierIds && Array.isArray(item.selectedModifierIds) && found?.modifierGroups) {
        for (const modId of item.selectedModifierIds) {
          for (const grp of found.modifierGroups) {
            const opt = grp.options.find((o) => o.id === modId);
            if (opt) {
              unitPrice += opt.priceDeltaMinor;
            }
          }
        }
      } else if (item.modifierPriceDeltaMinor) {
        unitPrice += Number(item.modifierPriceDeltaMinor);
      }
      subtotalMinor += unitPrice * (item.quantity || 1);
    }

    const taxBasisPoints = 500; // 5% GST
    const taxMinor = Math.round((subtotalMinor * taxBasisPoints) / 10000);
    const totalMinor = subtotalMinor + taxMinor;

    const inputHash = crypto.createHash('sha256').update(JSON.stringify({ items, taxBasisPoints })).digest('hex');
    const resultHash = crypto.createHash('sha256').update(`${subtotalMinor}:${taxMinor}:${totalMinor}`).digest('hex');

    sendJson(res, 200, {
      success: true,
      data: {
        quoteId: `quote_${Date.now()}`,
        subtotalMinor: subtotalMinor.toString(),
        taxMinor: taxMinor.toString(),
        totalMinor: totalMinor.toString(),
        currency: 'INR',
        breakdown: {
          subtotalFormatted: `₹${(subtotalMinor / 100).toFixed(2)}`,
          taxFormatted: `₹${(taxMinor / 100).toFixed(2)}`,
          totalFormatted: `₹${(totalMinor / 100).toFixed(2)}`,
        },
        inputHash,
        resultHash,
      },
    });
    return;
  }

  // 6. Idempotent Order Submission
  if (pathname === '/api/restaurant/orders' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL') {
      sendJson(res, 401, {
        error: 'INVALID_CREDENTIAL',
        code: 'INVALID_CREDENTIAL',
        message: 'Supplied authorization token is invalid or tampered.',
      });
      return;
    }
    if (identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, {
        error: 'CAPABILITY_REVOKED',
        code: 'CAPABILITY_REVOKED',
        message: 'Guest capability token has expired or session is closed. Please scan QR to join a new session.',
      });
      return;
    }
    if (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS') {
      sendJson(res, 401, {
        error: 'CAPABILITY_REQUIRED',
        code: 'CAPABILITY_REQUIRED',
        message: 'A valid diner capability token or staff credential is required to place an order.',
      });
      return;
    }

    const body = await parseBody(req);
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || `idem_${Date.now()}`;
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    const cached = await repo.getIdempotencyRecord(idempotencyKey);
    if (cached) {
      if (cached.payloadHash && cached.payloadHash !== payloadHash) {
        sendJson(res, 409, {
          error: 'IDEMPOTENCY_CONFLICT',
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'An order was already processed with this idempotency key using different order contents.',
        });
        return;
      }
      sendJson(res, 200, cached?.response || cached);
      return;
    }

    const items = body.items || body.cartItems || [];
    if (!Array.isArray(items) || items.length === 0) {
      sendJson(res, 400, {
        error: 'EMPTY_ORDER',
        code: 'EMPTY_ORDER',
        message: 'Order must contain at least one valid item.',
      });
      return;
    }

    const menuItems = await repo.getMenuItems();
    for (const it of items) {
      const q = it.quantity !== undefined ? it.quantity : 1;
      if (!Number.isInteger(q) || q < 1 || q > 50) {
        sendJson(res, 400, {
          error: 'INVALID_QUANTITY',
          code: 'INVALID_QUANTITY',
          message: `Item quantity must be an integer between 1 and 50. Received: ${q}`,
        });
        return;
      }
      const found = menuItems.find((m) => m.id === (it.id || it.itemId));
      if (!found) {
        sendJson(res, 400, {
          error: 'INVALID_MENU_ITEM',
          code: 'INVALID_MENU_ITEM',
          message: `Item ${it.id || it.itemId} is not in the menu catalog.`,
        });
        return;
      }
    }

    const orderId = (body.orderId && typeof body.orderId === 'string') ? body.orderId : `ord_${Date.now()}`;
    if (!body.tableNumber && !body.tableId) {
      sendJson(res, 400, {
        error: 'TABLE_REQUIRED',
        code: 'TABLE_REQUIRED',
        message: 'tableNumber is required to place an order.',
      });
      return;
    }
    const targetTableRecord = body.tableNumber
      ? await repo.getTableByNumber(body.tableNumber)
      : await repo.getTable(body.tableId);
    if (!targetTableRecord) {
      sendJson(res, 404, {
        error: 'TABLE_NOT_FOUND',
        code: 'TABLE_NOT_FOUND',
        message: `Table ${body.tableNumber || body.tableId} does not exist in this restaurant.`,
      });
      return;
    }
    const tableNumber = targetTableRecord.number;

    // Authoritative Plan Limits & Quota Enforcement
    try {
      const quotaCheck = await ownerSelfService.checkPlanLimits(tenantContext.tenantId, 'ORDERS');
      if (!quotaCheck.allowed) {
        sendJson(res, 403, {
          error: 'PLAN_LIMIT_EXCEEDED',
          code: 'PLAN_LIMIT_EXCEEDED',
          message: quotaCheck.error || 'Monthly order limit reached for your subscription plan.',
          quota: quotaCheck,
        });
        return;
      }
      if (quotaCheck.warning) {
        res.setHeader('x-quota-warning', `${quotaCheck.percentage}%`);
      }
    } catch (quotaErr: any) {
      // Allow fallback if running in-memory without database
    }

    const normIdTable = (identity.tableNumber || '').replace(/^T-/, '');
    const normOrderTable = (tableNumber || '').replace(/^T-/, '');

    if (identity.type === 'DINER') {
      if (identity.tableNumber && normIdTable !== normOrderTable) {
        sendJson(res, 403, {
          error: 'TABLE_MISMATCH',
          code: 'TABLE_MISMATCH',
          message: `Diner capability for ${identity.tableNumber} cannot submit orders for ${tableNumber}.`,
        });
        return;
      }
      const activeTable = targetTableRecord;
      if (activeTable && activeTable.activeSessionId && identity.sessionId && activeTable.activeSessionId !== identity.sessionId) {
        sendJson(res, 403, {
          error: 'SESSION_MISMATCH',
          code: 'SESSION_MISMATCH',
          message: 'Diner capability does not match the active session for this table.',
        });
        return;
      }
    }

    if (identity.branchId && identity.branchId !== '*' && targetTableRecord.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Staff token for branch ${identity.branchId} cannot create orders for table in branch ${targetTableRecord.branchId}`,
      });
      return;
    }

    let subtotalMinor = 0;
    for (const it of items) {
      const found = menuItems.find((m) => m.id === (it.id || it.itemId))!;
      const q = it.quantity !== undefined ? it.quantity : 1;
      let unitPrice = found.basePriceMinor;
      if (it.selectedModifierIds && Array.isArray(it.selectedModifierIds) && found.modifierGroups) {
        for (const modId of it.selectedModifierIds) {
          for (const grp of found.modifierGroups) {
            const opt = grp.options.find((o) => o.id === modId);
            if (opt) {
              unitPrice += opt.priceDeltaMinor;
            }
          }
        }
      } else if (it.modifierPriceDeltaMinor) {
        unitPrice += Number(it.modifierPriceDeltaMinor);
      }
      subtotalMinor += unitPrice * q;

      // Route each item to Kitchen Task Queue in Persistent Store
      const newTask: KitchenTask = {
        id: `task_${crypto.randomUUID()}`,
        orderId,
        tableNumber,
        branchId: body.branchId || targetTableRecord?.branchId || currentBranch.id,
        itemName: found.name,
        quantity: q,
        station: found.station as any,
        status: 'QUEUED',
        fireAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        targetServeAt: new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        elapsedMinutes: 0,
        slaMinutes: found.prepDurationMinutes || 12,
        modifiers: it.modifiers || (it.modifier ? [it.modifier] : []),
        guestName: body.guestName || 'Guest',
      };
      await repo.addKitchenTask(newTask);
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'task.created',
        timestamp: new Date().toISOString(),
        producer: 'api:order-service',
        branchId: body.branchId || currentBranch.id,
        tableNumber,
        tenantId: tenantContext.tenantId,
        payload: newTask,
      });
    }

    const taxMinor = Math.round((subtotalMinor * 500) / 10000);
    const totalMinor = subtotalMinor + taxMinor;
    const boundSessionId =
      identity.type === 'DINER' && identity.sessionId
        ? identity.sessionId
        : body.sessionId || targetTableRecord?.activeSessionId || 'sess_demo';

    const newOrder: RestaurantOrder = {
      orderId,
      tableNumber,
      sessionId: boundSessionId,
      branchId: body.branchId || targetTableRecord?.branchId || currentBranch.id,
      guestName: body.guestName || 'Guest',
      status: 'CONFIRMED',
      items: items.map((it: any) => {
        const found = menuItems.find((m) => m.id === (it.id || it.itemId))!;
        return {
          id: it.id || it.itemId,
          name: found.name,
          quantity: it.quantity !== undefined ? it.quantity : 1,
          unitPriceMinor: found.basePriceMinor,
          station: found.station || 'TANDOOR',
          guestName: body.guestName || 'Guest',
        };
      }),
      subtotalMinor,
      taxMinor,
      totalMinor,
      currency: 'INR',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    await repo.addOrder(newOrder);
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'order.created',
      timestamp: new Date().toISOString(),
      producer: 'api:order-service',
      branchId: body.branchId || currentBranch.id,
      tableNumber,
      tenantId: tenantContext.tenantId,
      payload: newOrder,
    });

    const response = {
      success: true,
      data: {
        orderId,
        tableNumber: newOrder.tableNumber,
        status: 'CONFIRMED',
        totalMinor: totalMinor.toString(),
        totalFormatted: `₹${(totalMinor / 100).toFixed(2)}`,
        estimatedPrepMinutes: 15,
      },
    };

    if (idempotencyKey) {
      await repo.saveIdempotencyRecord(idempotencyKey, { payloadHash, response });
    }
    await runtimeController.emitAudit('ORDER_PLACED', `table:${newOrder.tableNumber}`, { orderId, totalMinor });
    await runtimeController.reportOrderProcessed(orderId, totalMinor);

    sendJson(res, 201, response);
    return;
  }

  // 6b. Orders Query Endpoint
  if (pathname === '/api/restaurant/orders' && method === 'GET') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL') {
      sendJson(res, 401, { error: 'INVALID_CREDENTIAL', code: 'INVALID_CREDENTIAL' });
      return;
    }
    if (identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: 'CAPABILITY_REVOKED', code: 'CAPABILITY_REVOKED' });
      return;
    }

    const tableFilter = parsedUrl.query.tableNumber as string;
    const sessionFilter = parsedUrl.query.sessionId as string;
    const orderIdFilter = parsedUrl.query.orderId as string;
    const branchFilter = (parsedUrl.query.branchId as string) || (identity.isPrivileged ? undefined : identity.branchId);
    const statusFilter = (parsedUrl.query.status as string) || 'ALL';
    const searchQuery = ((parsedUrl.query.search || parsedUrl.query.q || '') as string).toLowerCase().trim();

    let orders = await repo.getOrders(tableFilter, sessionFilter, branchFilter, statusFilter);

    if (identity.type === 'DINER') {
      // Diner is strictly scoped to their own session
      orders = orders.filter((o) => o.sessionId === identity.sessionId);
    }

    if (orderIdFilter) {
      orders = orders.filter((o) => o.orderId === orderIdFilter);
    }

    if (searchQuery) {
      orders = orders.filter((o) => {
        const idMatch = o.orderId.toLowerCase().includes(searchQuery);
        const tblMatch = o.tableNumber.toLowerCase().includes(searchQuery);
        const custMatch =
          o.customer?.name?.toLowerCase().includes(searchQuery) ||
          o.customer?.phone?.includes(searchQuery) ||
          o.guestName?.toLowerCase().includes(searchQuery);
        const itemMatch = (o.items || []).some((it) => it.name.toLowerCase().includes(searchQuery));
        return idMatch || tblMatch || custMatch || itemMatch;
      });
    }

    sendJson(res, 200, {
      success: true,
      count: orders.length,
      data: orders,
      orders,
    });
    return;
  }

  // 6c. Order Single Fetch (GET /api/restaurant/orders/:id)
  if (
    pathname.startsWith('/api/restaurant/orders/') &&
    !pathname.endsWith('/status') &&
    !pathname.endsWith('/cancel') &&
    method === 'GET'
  ) {
    const identity = requestIdentity;
    const orderId = pathname.replace('/api/restaurant/orders/', '');
    const order = await repo.getOrder(orderId);
    if (!order) {
      sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
      return;
    }

    const targetTable = await repo.getTableByNumber(order.tableNumber);
    const orderBranch = order.branchId || targetTable?.branchId;
    if (
      identity.branchId &&
      identity.branchId !== '*' &&
      orderBranch &&
      identity.branchId !== orderBranch
    ) {
      sendJson(res, 403, {
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Staff member for branch ${identity.branchId} cannot view order in branch ${orderBranch}.`,
      });
      return;
    }

    const tasks = (await repo.getKitchenTasks()).filter((t) => t.orderId === order.orderId);
    sendJson(res, 200, { success: true, data: order, tasks });
    return;
  }

  // 6d. Order Status Transition (PATCH /api/restaurant/orders/:id/status & PATCH /api/restaurant/orders/:id)
  if (
    pathname.startsWith('/api/restaurant/orders/') &&
    (pathname.endsWith('/status') || method === 'PATCH') &&
    !pathname.endsWith('/cancel')
  ) {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type });
      return;
    }
    if (identity.type === 'ANONYMOUS' || identity.type === 'DINER') {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Staff credentials required to update order status.',
      });
      return;
    }

    const orderId = pathname.replace('/api/restaurant/orders/', '').replace('/status', '');
    const order = await repo.getOrder(orderId);
    if (!order) {
      sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
      return;
    }

    const targetTable = await repo.getTableByNumber(order.tableNumber);
    const orderBranch = order.branchId || targetTable?.branchId;
    if (
      identity.branchId &&
      identity.branchId !== '*' &&
      orderBranch &&
      identity.branchId !== orderBranch
    ) {
      sendJson(res, 403, {
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Staff credential for branch ${identity.branchId} cannot update status for order in branch ${orderBranch}.`,
      });
      return;
    }

    const canUpdateStatus =
      identity.isPrivileged ||
      ['MANAGER', 'ADMIN', 'OPERATIONS', 'POS', 'CHEF', 'SERVER', 'EXPO'].includes(identity.role || '');
    if (!canUpdateStatus) {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: `Role ${identity.role} is not authorized to update order status.`,
      });
      return;
    }

    const body = await parseBody(req);
    const newStatus = body.status || body.newStatus;

    if (!newStatus) {
      sendJson(res, 400, { success: false, error: 'Target status required', code: 'STATUS_REQUIRED' });
      return;
    }

    const success = await repo.updateOrderStatus(orderId, newStatus);
    if (!success) {
      sendJson(res, 400, { success: false, error: 'Failed to update order status', code: 'UPDATE_FAILED' });
      return;
    }

    const updatedOrder = await repo.getOrder(orderId);
    sendJson(res, 200, { success: true, data: updatedOrder });
    return;
  }

  // 6e. Order Cancellation (POST /api/restaurant/orders/:id/cancel)
  if (pathname.startsWith('/api/restaurant/orders/') && pathname.endsWith('/cancel') && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type });
      return;
    }
    if (identity.type === 'ANONYMOUS' || identity.type === 'DINER') {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Staff credentials required to cancel order.',
      });
      return;
    }

    const orderId = pathname.replace('/api/restaurant/orders/', '').replace('/cancel', '');
    const order = await repo.getOrder(orderId);
    if (!order) {
      sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
      return;
    }

    const targetTable = await repo.getTableByNumber(order.tableNumber);
    const orderBranch = order.branchId || targetTable?.branchId;
    if (
      identity.branchId &&
      identity.branchId !== '*' &&
      orderBranch &&
      identity.branchId !== orderBranch
    ) {
      sendJson(res, 403, {
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Staff credential for branch ${identity.branchId} cannot cancel order in branch ${orderBranch}.`,
      });
      return;
    }

    const canCancel =
      identity.isPrivileged ||
      ['MANAGER', 'ADMIN', 'OPERATIONS', 'POS'].includes(identity.role || '');
    if (!canCancel) {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: `Role ${identity.role} is not authorized to cancel orders. Manager or Operations role required.`,
      });
      return;
    }

    const body = await parseBody(req);
    const reason = body.reason || body.cancellationReason;

    if (!reason || reason.trim().length < 3) {
      sendJson(res, 400, {
        success: false,
        error: 'A mandatory cancellation reason with at least 3 characters is required.',
        code: 'REASON_REQUIRED',
      });
      return;
    }

    const result = await repo.cancelOrder(orderId, reason);
    if (!result.success) {
      const statusCode = result.code === 'ORDER_NOT_FOUND' ? 404 : 400;
      sendJson(res, statusCode, { success: false, error: result.error, code: result.code });
      return;
    }

    sendJson(res, 200, { success: true, message: `Order ${orderId} cancelled`, data: result.order });
    return;
  }

  // 6d. Razorpay Payment Order Creation (Server-Recomputed Amounts)
  if (
    (pathname === '/api/restaurant/payments/create-order' ||
      pathname === '/api/commerce/payments/create-session' ||
      pathname === '/api/commerce/razorpay/create-order' ||
      pathname === '/api/restaurant/checkout/razorpay/order' ||
      pathname === '/api/restaurant/checkout/razorpay/create-order') &&
    method === 'POST'
  ) {
    const body = await parseBody(req);
    const orderId = body.orderId;
    if (!orderId) {
      sendJson(res, 400, {
        error: 'ORDER_ID_REQUIRED',
        code: 'ORDER_ID_REQUIRED',
        message: 'A valid orderId is required to create a payment session.',
      });
      return;
    }

    const tenant = getActiveTenant();
    const tid = tenant.tenantId;

    let order = await repo.getOrder(orderId);

    if (!order) {
      sendJson(res, 404, {
        error: 'ORDER_NOT_FOUND',
        code: 'ORDER_NOT_FOUND',
        message: `Order ${orderId} was not found.`,
      });
      return;
    }

    // Server-recomputed amounts: Never trust client-passed amountMinor
    const amountMinor = order.totalMinor;
    const tableNumber = order.tableNumber || body.tableNumber;
    if (!tableNumber) {
      sendJson(res, 400, {
        error: 'TABLE_REQUIRED',
        code: 'TABLE_REQUIRED',
        message: 'Order has no associated table number.',
      });
      return;
    }

    // Tenant-isolated Razorpay adapter instantiation
    let activeRazorpay = razorpayAdapter;
    try {
      const pConfig = await ownerSelfService.getPaymentConfig(tid, true);
      if (pConfig && pConfig.configured && pConfig.keyId && pConfig.keySecret) {
        activeRazorpay = new RazorpayPaymentGatewayAdapter({
          keyId: pConfig.keyId,
          keySecret: pConfig.keySecret,
          webhookSecret: pConfig.webhookSecret,
        });
      }
    } catch {
      // Fallback to default configured adapter
    }

    try {
      const result = await activeRazorpay.createOrder({
        orderId,
        amountMinor,
        currency: order.currency || 'INR',
        tableNumber,
        tenantId: tid,
        notes: {
          guestName: order.guestName || body.guestName || 'Guest',
          branchId: order.branchId || currentBranch?.id || '',
        },
      });

      if (postgresStore) {
        try {
          await postgresStore.savePaymentSession(
            {
              id: result.razorpayOrderId,
              orderId,
              tableNumber,
              amountMinor,
              currency: result.currency,
              status: 'created',
            },
            tid
          );
        } catch (dbErr: any) {
          console.warn('[Payments] Postgres savePaymentSession failed:', dbErr.message);
        }
      }

      await runtimeController.emitAudit('PAYMENT_ORDER_CREATED', `table:${tableNumber}`, {
        orderId,
        razorpayOrderId: result.razorpayOrderId,
        amountMinor,
        tenantId: tid,
      });

      sendJson(res, 201, {
        success: true,
        data: {
          razorpayOrderId: result.razorpayOrderId,
          amountMinor,
          currency: result.currency,
          keyId: activeRazorpay.keyId,
          orderId,
          tableNumber,
          paymentUrl: result.paymentUrl,
        },
      });
    } catch (err: any) {
      sendJson(res, 500, {
        error: 'PAYMENT_CREATION_FAILED',
        code: 'PAYMENT_CREATION_FAILED',
        message: err.message,
      });
    }
    return;
  }

  // 6e. Razorpay Webhook Receiver with HMAC-SHA256 Verification & Invoicing
  if (
    (pathname === '/api/restaurant/payments/webhook' ||
      pathname === '/api/commerce/payments/webhook' ||
      pathname === '/api/restaurant/checkout/razorpay/webhook') &&
    method === 'POST'
  ) {
    const body = await parseBody(req);
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    const signature = (req.headers['x-razorpay-signature'] as string) || '';

    const tenant = getActiveTenant();
    const tid = tenant.tenantId;

    let activeRazorpay = razorpayAdapter;
    try {
      const pConfig = await ownerSelfService.getPaymentConfig(tid, true);
      if (pConfig && pConfig.configured && pConfig.keyId && pConfig.keySecret) {
        activeRazorpay = new RazorpayPaymentGatewayAdapter({
          keyId: pConfig.keyId,
          keySecret: pConfig.keySecret,
          webhookSecret: pConfig.webhookSecret,
        });
      }
    } catch {
      // Fallback
    }

    // Verify HMAC-SHA256 signature
    const isValidSignature = activeRazorpay.verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      sendJson(res, 401, {
        error: 'INVALID_SIGNATURE',
        code: 'INVALID_SIGNATURE',
        message: 'Razorpay webhook signature verification failed.',
      });
      return;
    }

    // Durable Webhook Deduplication / Idempotency
    const eventId =
      (req.headers['x-razorpay-event-id'] as string) ||
      body.event_id ||
      body.id ||
      (body.payload?.payment?.entity?.id ? `evt_${body.payload.payment.entity.id}` : null);

    if (eventId) {
      const existingEvt = await repo.getIdempotencyRecord(eventId);
      if (existingEvt) {
        sendJson(res, 200, { success: true, status: 'idempotent_duplicate', eventId });
        return;
      }
    }

    const eventType = body.event || 'payment.captured';
    const paymentEntity = body.payload?.payment?.entity || body.payment || {};
    const razorpayPaymentId = paymentEntity.id || body.payment_id || `pay_${Date.now()}`;
    const razorpayOrderId = paymentEntity.order_id || body.order_id;
    const notes = paymentEntity.notes || body.notes || {};
    const orderId = notes.orderId || body.orderId;
    const targetTid = notes.tenantId || tid;

    if (
      eventType === 'payment.captured' ||
      eventType === 'payment.authorized' ||
      eventType === 'order.paid'
    ) {
      // Transition order and payment session state idempotently: UNPAID -> AUTHORIZED -> CAPTURED
      let existingSession = null;
      if (postgresStore && razorpayOrderId) {
        try {
          existingSession = await postgresStore.getPaymentSessionById(razorpayOrderId, tid);
        } catch {}
      }

      if (existingSession && existingSession.status === 'captured') {
        sendJson(res, 200, {
          success: true,
          status: 'idempotent_duplicate',
          orderId: existingSession.orderId,
          razorpayPaymentId: existingSession.razorpayPaymentId,
        });
        return;
      }

      const amountMinor = paymentEntity.amount || existingSession?.amountMinor || 0;
      const tableNumber = notes.tableNumber || existingSession?.tableNumber || '';

      if (postgresStore && razorpayOrderId) {
        try {
          await postgresStore.savePaymentSession(
            {
              id: razorpayOrderId,
              orderId: orderId || existingSession?.orderId || `ord_${Date.now()}`,
              tableNumber,
              amountMinor,
              status: 'captured',
              razorpayPaymentId,
              razorpaySignature: signature,
            },
            tid
          );
        } catch (dbErr: any) {
          console.warn('[Payments] Postgres update payment session failed:', dbErr.message);
        }
      }

      // Update Order and Table via repository
      const targetOrderId = orderId || existingSession?.orderId;
      let order = targetOrderId ? await repo.getOrder(targetOrderId) : null;
      if (order) {
        order.status = 'PAID';
        (order as any).paymentMethod = 'RAZORPAY';
        (order as any).paymentStatus = 'PAID';
        await repo.updateOrderStatus(order.orderId, 'PAID', 'Order paid via Razorpay');
      }

      // Automatically generate statutory Indian GST Tax Invoice
      let invoiceRecord = null;
      if (order) {
        try {
          invoiceRecord = await repo.getInvoiceByOrderId(order.orderId);
          if (!invoiceRecord) {
            const { fiscalYear } = computeFiscalYear();
            const seq = await repo.getNextInvoiceSequence(fiscalYear);
            invoiceRecord = buildGSTInvoice({
              order,
              sequenceNumber: seq,
              tenantId: tid,
            });
            await repo.saveInvoice(invoiceRecord);
            eventBus.broadcast({
              id: `evt_${Date.now()}`,
              sequence: (await repo.getEvents()).length,
              type: 'invoice.generated',
              timestamp: new Date().toISOString(),
              producer: 'api:payment-service',
              branchId: order.branchId || currentBranch?.id || 'branch_main',
              tableNumber: order.tableNumber,
              tenantId: tid,
              payload: invoiceRecord,
            });
          }
        } catch (invErr: any) {
          console.warn('[Invoicing] Automatic invoice generation failed:', invErr.message);
        }
      }

      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'payment.captured',
        timestamp: new Date().toISOString(),
        producer: 'api:payment-service',
        branchId: order?.branchId || currentBranch?.id || 'branch_main',
        tableNumber,
        tenantId: tid,
        payload: {
          razorpayPaymentId,
          razorpayOrderId,
          orderId: targetOrderId,
          amountMinor,
          invoiceNumber: invoiceRecord?.invoiceNumber,
        },
      });

      await runtimeController.emitAudit('PAYMENT_CAPTURED', `payment:${razorpayPaymentId}`, {
        orderId: targetOrderId,
        amountMinor,
        razorpayPaymentId,
        invoiceNumber: invoiceRecord?.invoiceNumber,
      });

      if (eventId) {
        await repo.saveIdempotencyRecord(eventId, { status: 'captured', razorpayPaymentId, targetOrderId });
      }

      sendJson(res, 200, {
        success: true,
        status: 'captured',
        razorpayPaymentId,
        orderId: targetOrderId,
        invoiceNumber: invoiceRecord?.invoiceNumber,
      });
      return;
    }

    if (eventType === 'payment.failed') {
      if (postgresStore && razorpayOrderId) {
        try {
          await postgresStore.savePaymentSession(
            {
              id: razorpayOrderId,
              orderId: orderId || `ord_${Date.now()}`,
              tableNumber: notes.tableNumber || '',
              amountMinor: paymentEntity.amount || 0,
              status: 'failed',
              razorpayPaymentId,
            },
            tid
          );
        } catch {}
      }

      await runtimeController.emitAudit('PAYMENT_FAILED', `payment:${razorpayPaymentId}`, {
        razorpayPaymentId,
        orderId,
      });

      if (eventId) {
        await repo.saveIdempotencyRecord(eventId, { status: 'failed', razorpayPaymentId });
      }

      sendJson(res, 200, { success: true, status: 'failed', razorpayPaymentId });
      return;
    }

    if (eventId) {
      await repo.saveIdempotencyRecord(eventId, { received: true, eventType });
    }
    sendJson(res, 200, { success: true, received: true, event: eventType });
    return;
  }

  // 6f. GST Invoicing Retrieval Endpoints
  // GET /invoices/:id, /invoices/:id/print, GET /api/restaurant/invoices/:id
  if (
    (pathname.startsWith('/api/restaurant/invoices/') || pathname.startsWith('/invoices/')) &&
    pathname !== '/api/restaurant/invoices/generate' &&
    pathname !== '/api/restaurant/invoices' &&
    method === 'GET'
  ) {
    const isApi = pathname.startsWith('/api/');
    const isPrint = pathname.endsWith('/print');
    const rawParam = pathname
      .replace('/api/restaurant/invoices/', '')
      .replace('/invoices/', '')
      .replace('/print', '');

    let invoice = await repo.getInvoiceByOrderId(rawParam);
    if (!invoice && rawParam.startsWith('INV-')) {
      invoice = await repo.getInvoiceByNumber(rawParam);
    }
    if (!invoice && postgresStore) {
      invoice = await postgresStore.getInvoiceByOrderId(rawParam, tenantContext.tenantId);
      if (!invoice && rawParam.startsWith('INV-')) {
        invoice = await postgresStore.getInvoiceByNumber(rawParam, tenantContext.tenantId);
      }
    }

    if (!invoice) {
      sendJson(res, 404, {
        error: 'INVOICE_NOT_FOUND',
        code: 'INVOICE_NOT_FOUND',
        message: `Invoice not found for identifier: ${rawParam}`,
      });
      return;
    }

    const wantsHtml = !isApi || isPrint || parsedUrl.query.format === 'html';
    if (wantsHtml) {
      const tenantBrand = await repo.getTenantBrand();
      const html = renderPrintableInvoiceHtml(invoice, tenantBrand, currentBranch);
      sendHtml(res, html);
      return;
    }

    sendJson(res, 200, { success: true, data: invoice });
    return;
  }

  // GET /api/restaurant/invoices (query by ?orderId=... or ?number=...)
  if (pathname === '/api/restaurant/invoices' && method === 'GET') {
    const tid = getActiveTenant().tenantId;
    const orderIdQuery = parsedUrl.query.orderId as string;
    const numberQuery = (parsedUrl.query.number || parsedUrl.query.invoiceNumber) as string;

    if (!postgresStore) {
      sendJson(res, 503, {
        error: 'POSTGRES_STORE_UNAVAILABLE',
        message: 'PostgreSQL storage required for durable invoices.',
      });
      return;
    }

    if (orderIdQuery) {
      const invoice = await postgresStore.getInvoiceByOrderId(orderIdQuery, tid);
      if (!invoice) {
        sendJson(res, 404, { error: 'INVOICE_NOT_FOUND', message: `No invoice for order ${orderIdQuery}` });
        return;
      }
      sendJson(res, 200, { success: true, data: invoice });
      return;
    }

    if (numberQuery) {
      const invoice = await postgresStore.getInvoiceByNumber(numberQuery, tid);
      if (!invoice) {
        sendJson(res, 404, { error: 'INVOICE_NOT_FOUND', message: `No invoice with number ${numberQuery}` });
        return;
      }
      sendJson(res, 200, { success: true, data: invoice });
      return;
    }

    const invoices = await (postgresStore as any).prisma.invoice.findMany({
      where: { tenantId: tid },
      orderBy: { sequenceNumber: 'desc' },
      take: 50,
    });
    sendJson(res, 200, { success: true, count: invoices.length, data: invoices });
    return;
  }

  // POST /api/restaurant/invoices/generate (Manual or Staff-Initiated GST Invoice Generation)
  if (pathname === '/api/restaurant/invoices/generate' && method === 'POST') {
    const body = await parseBody(req);
    const orderId = body.orderId;
    if (!orderId) {
      sendJson(res, 400, { error: 'ORDER_ID_REQUIRED', message: 'orderId is required' });
      return;
    }

    const tid = getActiveTenant().tenantId;

    const existing = await repo.getInvoiceByOrderId(orderId);
    if (existing) {
      sendJson(res, 200, { success: true, message: 'Invoice already exists', data: existing });
      return;
    }

    let order = await repo.getOrder(orderId);
    if (!order) {
      sendJson(res, 404, { error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found` });
      return;
    }

    const { fiscalYear } = computeFiscalYear();
    const seq = await repo.getNextInvoiceSequence(fiscalYear);
    const invoiceRecord = buildGSTInvoice({
      order,
      sequenceNumber: seq,
      tenantId: tid,
      gstin: body.gstin,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      customerGstin: body.customerGstin,
    });

    await repo.saveInvoice(invoiceRecord);
    sendJson(res, 201, { success: true, data: invoiceRecord });
    return;
  }

  // 6g. Level 4 Refund Governance Endpoint
  if (pathname === '/api/restaurant/payments/refund' && method === 'POST') {
    const identity = requestIdentity;
    const body = await parseBody(req);
    const staffRole = identity.role || body.staffRole;
    const isPinVerified = identity.isPrivileged || Boolean(body.staffPinVerified);

    const governance = razorpayAdapter.checkRefundGovernance(staffRole, isPinVerified);
    if (!governance.allowed) {
      sendJson(res, 403, {
        error: 'REFUND_GOVERNANCE_BLOCKED',
        code: 'REFUND_GOVERNANCE_BLOCKED',
        message: governance.reason,
      });
      return;
    }

    await runtimeController.emitAudit('REFUND_APPROVED', identity.id || 'staff', {
      paymentId: body.paymentId,
      orderId: body.orderId,
      amountMinor: body.amountMinor,
      reason: body.reason,
    });

    sendJson(res, 200, {
      success: true,
      message: 'Refund approved via Level 4 Staff Authorization and logged to audit trail.',
      data: {
        paymentId: body.paymentId,
        orderId: body.orderId,
        status: 'REFUND_AUTHORIZED',
        authorizedBy: identity.id || 'staff',
      },
    });
    return;
  }

  // 7. Kitchen Display System Stream / List
  if ((pathname === '/api/restaurant/kds' || pathname === '/api/restaurant/kds/tasks') && method === 'GET') {
    const stationFilter = (parsedUrl.query.station || parsedUrl.query.stationId) as string;
    const branchFilter = (parsedUrl.query.branchId as string) || (requestIdentity.isPrivileged ? undefined : requestIdentity.branchId);
    const tasks = await repo.getKitchenTasks(stationFilter, branchFilter);
    sendJson(res, 200, {
      success: true,
      data: tasks,
    });
    return;
  }

  // --- KDS Mutation Authorization Helper ---
  const authorizeKdsRequest = (
    identity: RequestIdentity,
    targetBranchId?: string,
    targetStation?: string,
    isExpoDispatch = false
  ): { authorized: boolean; statusCode?: number; error?: string; code?: string } => {
    // 1. Missing authentication (Fail-closed in both prod & dev)
    if (identity.type === 'ANONYMOUS') {
      return {
        authorized: false,
        statusCode: 401,
        error: 'Staff or kitchen station credentials required.',
        code: 'UNAUTHENTICATED',
      };
    }
    // 2. Malformed / forged credential
    if (identity.type === 'INVALID_CREDENTIAL') {
      const isRevoked = identity.error === 'TOKEN_REVOKED';
      return {
        authorized: false,
        statusCode: 401,
        error: isRevoked ? 'Staff credential has been explicitly revoked.' : (identity.error || 'Supplied authorization token is invalid or tampered.'),
        code: isRevoked ? 'REVOKED_TOKEN' : 'INVALID_CREDENTIAL',
      };
    }
    // 3. Revoked credential
    if (identity.type === 'REVOKED_CAPABILITY') {
      return {
        authorized: false,
        statusCode: 401,
        error: 'Credential or token has been revoked.',
        code: 'REVOKED_TOKEN',
      };
    }
    // 4. Diner capability forbidden from KDS
    if (identity.type === 'DINER') {
      return {
        authorized: false,
        statusCode: 403,
        error: 'Diner capability cannot mutate kitchen display tasks.',
        code: 'FORBIDDEN',
      };
    }

    // 5. Appropriate Role Check
    const allowedRoles = ['CHEF', 'EXPO', 'OPERATIONS', 'MANAGER', 'ADMIN'];
    const effectiveRole = identity.role || (identity.type === 'ADMIN' ? 'ADMIN' : undefined);
    const isAuthorizedRole =
      (identity.type === 'STATION' && (!identity.role || allowedRoles.includes(identity.role))) ||
      (effectiveRole && allowedRoles.includes(effectiveRole));

    if (!isAuthorizedRole) {
      return {
        authorized: false,
        statusCode: 403,
        error: `Role ${identity.role || identity.type} is not authorized to mutate kitchen display tasks.`,
        code: 'FORBIDDEN',
      };
    }

    // 6. Branch Scoping Check
    // Wildcard '*' is permitted across branches. Specific branch identities must match target branch.
    if (targetBranchId !== undefined && identity.branchId && identity.branchId !== '*') {
      if (!targetBranchId || targetBranchId === 'unknown') {
        return {
          authorized: false,
          statusCode: 403,
          error: `Task has missing, malformed, or untrusted branch identifier and cannot be mutated by branch-scoped credential (${identity.branchId}).`,
          code: 'BRANCH_MISMATCH',
        };
      }
      if (identity.branchId !== targetBranchId) {
        return {
          authorized: false,
          statusCode: 403,
          error: `Staff credential for branch ${identity.branchId} cannot mutate kitchen resource in branch ${targetBranchId}.`,
          code: 'BRANCH_MISMATCH',
        };
      }
    }

    // 7. Station Scoping Check
    if (isExpoDispatch) {
      if (
        identity.type === 'STATION' &&
        identity.station &&
        identity.station !== 'ALL' &&
        identity.station !== 'EXPO'
      ) {
        return {
          authorized: false,
          statusCode: 403,
          error: `Station credential for ${identity.station} cannot dispatch tables from Expo pass.`,
          code: 'STATION_MISMATCH',
        };
      }
      if (
        identity.role === 'CHEF' &&
        identity.station &&
        identity.station !== 'ALL' &&
        identity.station !== 'EXPO'
      ) {
        return {
          authorized: false,
          statusCode: 403,
          error: `Chef assigned to ${identity.station} cannot dispatch tables from Expo pass.`,
          code: 'STATION_MISMATCH',
        };
      }
    } else if (targetStation) {
      const assignedStation = identity.station;
      if (assignedStation && assignedStation !== 'ALL' && assignedStation !== targetStation) {
        return {
          authorized: false,
          statusCode: 403,
          error: `Station credential for ${assignedStation} is not authorized for task assigned to ${targetStation}.`,
          code: 'STATION_MISMATCH',
        };
      }
    }

    return { authorized: true };
  };

  // --- Task Branch Resolution & Controlled Migration ---
  interface TaskBranchResolution {
    branchId: string | null;
    quarantined: boolean;
    code?: 'TASK_BRANCH_UNRESOLVED' | 'BRANCH_MISMATCH' | 'MALFORMED_BRANCH_IDENTIFIER';
    error?: string;
  }

  const resolveTaskAuthoritativeBranch = async (task: any): Promise<TaskBranchResolution> => {
    const branches = await repo.getBranches();
    const registeredBranches = branches.map((b) => b.id);

    // 1. Direct task.branchId validation
    if (task.branchId && typeof task.branchId === 'string' && task.branchId.trim().length > 0) {
      const trimmed = task.branchId.trim();
      if (trimmed === 'unknown' || trimmed === 'null' || trimmed === 'undefined' || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return {
          branchId: null,
          quarantined: true,
          code: 'MALFORMED_BRANCH_IDENTIFIER',
          error: `Task ${task.id} has malformed or untrusted branch identifier: "${task.branchId}".`,
        };
      }
      if (registeredBranches.includes(trimmed)) {
        return { branchId: trimmed, quarantined: false };
      }
      return {
        branchId: null,
        quarantined: true,
        code: 'TASK_BRANCH_UNRESOLVED',
        error: `Task ${task.id} specifies unknown branch "${trimmed}" not registered in system.`,
      };
    }

    // 2. Controlled migration from authoritative linked order
    if (task.orderId) {
      const linkedOrder = await repo.getOrder(task.orderId);
      if (linkedOrder && linkedOrder.branchId && registeredBranches.includes(linkedOrder.branchId)) {
        task.branchId = linkedOrder.branchId;
        return { branchId: linkedOrder.branchId, quarantined: false };
      }
    }

    // 3. Controlled migration from authoritative linked table session
    if (task.sessionId) {
      const linkedSession = await repo.getSession(task.sessionId);
      if (linkedSession && linkedSession.branchId && registeredBranches.includes(linkedSession.branchId)) {
        task.branchId = linkedSession.branchId;
        return { branchId: linkedSession.branchId, quarantined: false };
      }
    }

    // 4. Invariant: Never infer task's branch from caller's active branch or global table number!
    return {
      branchId: null,
      quarantined: true,
      code: 'TASK_BRANCH_UNRESOLVED',
      error: `Task ${task.id} has no trusted branch association and cannot be mutated by branch-scoped credentials.`,
    };
  };

  // --- KDS Mutation Idempotency Helper ---
  const checkKdsIdempotency = async (
    idempotencyKey: string | undefined,
    operation: string,
    targetId: string,
    targetBranchId: string | null | undefined,
    payload: any
  ): Promise<{ hasConflict: boolean; isReplay: boolean; cachedResponse?: any; payloadHash: string }> => {
    if (!idempotencyKey) {
      return { hasConflict: false, isReplay: false, payloadHash: '' };
    }

    const canonicalObj = {
      operation,
      targetId,
      branchId: targetBranchId || '',
      payload,
    };
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(canonicalObj)).digest('hex');

    const existing = await repo.getIdempotencyRecord(idempotencyKey);
    if (existing) {
      if (
        existing.operation !== operation ||
        existing.targetId !== targetId ||
        existing.payloadHash !== payloadHash
      ) {
        return { hasConflict: true, isReplay: false, payloadHash };
      }
      return {
        hasConflict: false,
        isReplay: true,
        cachedResponse: existing.responseBody || existing.response,
        payloadHash,
      };
    }

    return { hasConflict: false, isReplay: false, payloadHash };
  };

  // 8. KDS Task State Transition / Bump
  if (
    ((pathname === '/api/restaurant/kds' || pathname === '/api/restaurant/kds/bump') ||
      (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/bump'))) &&
    method === 'POST'
  ) {
    const identity = requestIdentity;
    const body = await parseBody(req);
    const taskId = body.taskId || (pathname.startsWith('/api/restaurant/kds/tasks/') ? pathname.split('/')[5] : undefined);
    const nextStatus = body.newStatus || body.status;
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

    // 1. Authenticate identity
    const authCheck = authorizeKdsRequest(identity);
    if (!authCheck.authorized) {
      sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
      return;
    }

    if (!taskId) {
      sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
      return;
    }

    const allTasks = await repo.getKitchenTasks();
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) {
      sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
      return;
    }

    // Branch Resolution & Quarantine
    const taskBranchRes = await resolveTaskAuthoritativeBranch(task);
    if (taskBranchRes.quarantined && identity.branchId !== '*') {
      sendJson(res, 403, {
        error: taskBranchRes.error,
        code: taskBranchRes.code || 'BRANCH_MISMATCH',
      });
      return;
    }
    const taskBranch = taskBranchRes.branchId || undefined;

    // 2. Branch & Station Scoping
    const scopeCheck = authorizeKdsRequest(identity, taskBranch, task.station);
    if (!scopeCheck.authorized) {
      sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
      return;
    }

    let requestedStation = (req.headers['x-station'] as string) || body.station;
    if (identity.type === 'STATION' && identity.station) {
      if (requestedStation && requestedStation !== 'ALL' && requestedStation !== identity.station) {
        sendJson(res, 403, {
          error: `Station credential for ${identity.station} cannot mutate station ${requestedStation}`,
          code: 'STATION_MISMATCH',
        });
        return;
      }
      requestedStation = identity.station;
    }
    if (requestedStation && requestedStation !== 'ALL' && task.station !== requestedStation) {
      sendJson(res, 403, {
        error: `Station ${requestedStation} is not authorized for task assigned to ${task.station}`,
        code: 'STATION_MISMATCH',
      });
      return;
    }

    // 3. Idempotency Check
    const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.bump', taskId, taskBranch, {
      nextStatus,
      station: requestedStation,
    });
    if (idempCheck.hasConflict) {
      sendJson(res, 409, {
        error: 'IDEMPOTENCY_CONFLICT',
        code: 'IDEMPOTENCY_CONFLICT',
        message: `Idempotency key ${idempotencyKey} has already been used with a different operation, target, or payload.`,
      });
      return;
    }
    if (idempCheck.isReplay) {
      sendJson(res, 200, {
        ...idempCheck.cachedResponse,
        isIdempotent: true,
        idempotentReplay: true,
      });
      return;
    }

    const result = await repo.updateKitchenTaskStatus(taskId, nextStatus, {
      station: requestedStation,
      expectedRevision: body.expectedRevision,
    });
    if (!result.success) {
      if (result.code === 'TASK_NOT_FOUND') {
        sendJson(res, 404, { error: result.error, code: result.code });
      } else if (result.code === 'STATION_MISMATCH') {
        sendJson(res, 403, { error: result.error, code: result.code });
      } else if (result.code === 'REVISION_CONFLICT') {
        sendJson(res, 409, { error: result.error, code: result.code });
      } else {
        sendJson(res, 400, { error: result.error, code: result.code });
      }
      return;
    }

    await runtimeController.emitAudit('KDS_BUMP', `chef:${result.task?.station}`, {
      taskId,
      status: result.task?.status,
    });

    const responsePayload = {
      success: true,
      data: result.task,
      isIdempotent: result.isIdempotent,
    };
    if (idempotencyKey) {
      const record = {
        operation: 'kds.bump',
        targetId: taskId,
        branchId: taskBranch,
        payloadHash: idempCheck.payloadHash,
        response: responsePayload,
      };
      await repo.saveIdempotencyRecord(idempotencyKey, record);
    }

    if (result.task) {
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: `task.${result.task.status.toLowerCase()}`,
        timestamp: new Date().toISOString(),
        producer: result.task.orderId || result.task.id,
        branchId: taskBranch,
        tableNumber: result.task.tableNumber,
        tenantId: tenantContext.tenantId,
        payload: {
          taskId: result.task.id,
          orderId: result.task.orderId,
          status: result.task.status,
          task: result.task,
        },
      });
    }

    sendJson(res, 200, responsePayload);
    return;
  }

  // 9. KDS Individual Item Fulfillment
  if (
    (pathname === '/api/restaurant/kds/item-fulfill' ||
      pathname === '/api/restaurant/kds/fulfill-item' ||
      (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/fulfill-item'))) &&
    method === 'POST'
  ) {
    const identity = requestIdentity;
    const body = await parseBody(req);
    const taskId = body.taskId || (pathname.startsWith('/api/restaurant/kds/tasks/') ? pathname.split('/')[5] : undefined);
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

    // 1. Authenticate identity
    const authCheck = authorizeKdsRequest(identity);
    if (!authCheck.authorized) {
      sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
      return;
    }

    if (!taskId) {
      sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
      return;
    }

    const allTasks = await repo.getKitchenTasks();
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) {
      sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
      return;
    }

    // Branch Resolution & Quarantine
    const taskBranchRes = await resolveTaskAuthoritativeBranch(task);
    if (taskBranchRes.quarantined && identity.branchId !== '*') {
      sendJson(res, 403, {
        error: taskBranchRes.error,
        code: taskBranchRes.code || 'BRANCH_MISMATCH',
      });
      return;
    }
    const taskBranch = taskBranchRes.branchId || undefined;

    // 2. Branch and Station Scoping
    const scopeCheck = authorizeKdsRequest(identity, taskBranch, task.station);
    if (!scopeCheck.authorized) {
      sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
      return;
    }

    // 3. Idempotency Check
    const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.fulfill-item', taskId, taskBranch, {
      targetCount: body.targetCount,
    });
    if (idempCheck.hasConflict) {
      sendJson(res, 409, {
        error: 'IDEMPOTENCY_CONFLICT',
        code: 'IDEMPOTENCY_CONFLICT',
        message: `Idempotency key ${idempotencyKey} has already been used with a different operation, target, or payload.`,
      });
      return;
    }
    if (idempCheck.isReplay) {
      sendJson(res, 200, {
        ...idempCheck.cachedResponse,
        isIdempotent: true,
        idempotentReplay: true,
      });
      return;
    }

    const result = await repo.fulfillTaskItem(taskId, body.targetCount);
    if (!result.success) {
      const status = result.code === 'TASK_NOT_FOUND' ? 404 : 400;
      sendJson(res, status, { error: result.error, code: result.code });
      return;
    }

    const responsePayload = { success: true, data: result.task, isIdempotent: result.isIdempotent };
    if (idempotencyKey) {
      const record = {
        operation: 'kds.fulfill-item',
        targetId: taskId,
        branchId: taskBranch,
        payloadHash: idempCheck.payloadHash,
        response: responsePayload,
      };
      await repo.saveIdempotencyRecord(idempotencyKey, record);
    }

    sendJson(res, 200, responsePayload);
    return;
  }

  // 10. KDS Task Recall
  if (
    (pathname === '/api/restaurant/kds/recall' ||
      (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/recall'))) &&
    method === 'POST'
  ) {
    const identity = requestIdentity;
    const body = await parseBody(req);
    const taskId = body.taskId || (pathname.startsWith('/api/restaurant/kds/tasks/') ? pathname.split('/')[5] : undefined);
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

    // 1. Authenticate identity
    const authCheck = authorizeKdsRequest(identity);
    if (!authCheck.authorized) {
      sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
      return;
    }

    if (!taskId) {
      sendJson(res, 400, { error: 'Task ID is required', code: 'TASK_ID_REQUIRED' });
      return;
    }

    const allTasks = await repo.getKitchenTasks();
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) {
      sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
      return;
    }

    // Branch Resolution & Quarantine
    const taskBranchRes = await resolveTaskAuthoritativeBranch(task);
    if (taskBranchRes.quarantined && identity.branchId !== '*') {
      sendJson(res, 403, {
        error: taskBranchRes.error,
        code: taskBranchRes.code || 'BRANCH_MISMATCH',
      });
      return;
    }
    const taskBranch = taskBranchRes.branchId || undefined;

    // 2. Branch and Station Scoping
    const scopeCheck = authorizeKdsRequest(identity, taskBranch, task.station);
    if (!scopeCheck.authorized) {
      sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
      return;
    }

    // 3. Idempotency Check
    const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.recall', taskId, taskBranch, {
      targetStatus: body.targetStatus,
    });
    if (idempCheck.hasConflict) {
      sendJson(res, 409, {
        error: 'IDEMPOTENCY_CONFLICT',
        code: 'IDEMPOTENCY_CONFLICT',
        message: `Idempotency key ${idempotencyKey} has already been used with a different operation, target, or payload.`,
      });
      return;
    }
    if (idempCheck.isReplay) {
      sendJson(res, 200, {
        ...idempCheck.cachedResponse,
        isIdempotent: true,
        idempotentReplay: true,
      });
      return;
    }

    const result = await repo.recallTask(taskId, body.targetStatus);
    if (!result.success) {
      const status = result.code === 'TASK_NOT_FOUND' ? 404 : 400;
      sendJson(res, status, { error: result.error, code: result.code });
      return;
    }

    const responsePayload = { success: true, data: result.task, isIdempotent: result.isIdempotent };
    if (idempotencyKey) {
      const record = {
        operation: 'kds.recall',
        targetId: taskId,
        branchId: taskBranch,
        payloadHash: idempCheck.payloadHash,
        response: responsePayload,
      };
      await repo.saveIdempotencyRecord(idempotencyKey, record);
    }

    sendJson(res, 200, responsePayload);
    return;
  }

  // 11. KDS Expo Dispatch (All tasks for table marked BUMPED / Table SERVED)
  if ((pathname === '/api/restaurant/kds/expo-dispatch' || (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/dispatch'))) && method === 'POST') {
    const identity = requestIdentity;
    const authCheck = authorizeKdsRequest(identity, undefined, undefined, true);
    if (!authCheck.authorized) {
      sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
      return;
    }

    const body = await parseBody(req);
    const tableNumber = body.tableNumber;
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;

    if (!tableNumber) {
      sendJson(res, 400, { error: 'Table number is required', code: 'TABLE_NUMBER_REQUIRED' });
      return;
    }

    const allTasks = await repo.getKitchenTasks();
    const tasks = allTasks.filter((t) => t.tableNumber === tableNumber);
    if (tasks.length === 0) {
      sendJson(res, 400, { error: `No kitchen tasks found for table ${tableNumber}`, code: 'TASKS_NOT_FOUND' });
      return;
    }

    const tbl = await repo.getTableByNumber(tableNumber);
    let targetBranch: string | null = null;
    for (const t of tasks) {
      const tRes = await resolveTaskAuthoritativeBranch(t);
      if (!tRes.quarantined && tRes.branchId) {
        targetBranch = tRes.branchId;
        break;
      }
    }
    const currentBranches = await repo.getBranches();
    if (!targetBranch && tbl && tbl.branchId && currentBranches.some((b) => b.id === tbl.branchId)) {
      targetBranch = tbl.branchId;
    }
    if (!targetBranch && identity.branchId !== '*') {
      sendJson(res, 403, {
        error: `Tasks for table ${tableNumber} have no trusted branch association and cannot be dispatched by branch-scoped credentials.`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }

    const scopeCheck =  authorizeKdsRequest(identity, targetBranch || undefined, undefined, true);
    if (!scopeCheck.authorized) {
      sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
      return;
    }

    // Idempotency Check
    const idempCheck = await checkKdsIdempotency(idempotencyKey, 'kds.expo-dispatch', tableNumber, targetBranch, {
      tableNumber,
    });
    if (idempCheck.hasConflict) {
      sendJson(res, 409, {
        error: 'IDEMPOTENCY_CONFLICT',
        code: 'IDEMPOTENCY_CONFLICT',
        message: `Idempotency key ${idempotencyKey} has already been used with a different operation, target, or payload.`,
      });
      return;
    }
    if (idempCheck.isReplay) {
      sendJson(res, 200, {
        ...idempCheck.cachedResponse,
        isIdempotent: true,
        idempotentReplay: true,
      });
      return;
    }

    // 3. Mutex Lock Check for Concurrent Dispatches
    const lockKey = `dispatch:${tenantContext.tenantId}:${tableNumber}:${targetBranch || '*'}`;
    if (activeDispatchLocks.has(lockKey)) {
      sendJson(res, 409, {
        error: 'DISPATCH_IN_PROGRESS',
        code: 'DISPATCH_IN_PROGRESS',
        message: `Dispatch is currently in progress for table ${tableNumber}. Concurrent dispatch requests locked.`,
      });
      return;
    }
    activeDispatchLocks.add(lockKey);

    try {
      const unbumped = tasks.filter((t) => t.status !== 'BUMPED');
      if (unbumped.length === 0) {
        const alreadyPayload = {
          success: true,
          message: `All tasks for table ${tableNumber} already dispatched`,
          isIdempotent: true,
        };
        if (idempotencyKey) {
          const record = {
            operation: 'kds.expo-dispatch',
            targetId: tableNumber,
            branchId: targetBranch,
            payloadHash: idempCheck.payloadHash,
            response: alreadyPayload,
          };
          await repo.saveIdempotencyRecord(idempotencyKey, record);
        }
        sendJson(res, 200, alreadyPayload);
        return;
      }

      // Readiness Gating: Every cooking task must reach READY before table dispatch
      const unreadyTasks = unbumped.filter((t) => t.status !== 'READY');
      const isForced = Boolean(body.force || body.override);
      if (unreadyTasks.length > 0 && !isForced) {
        sendJson(res, 422, {
          error: 'TASKS_NOT_READY',
          code: 'TASKS_NOT_READY',
          message: `Cannot dispatch table ${tableNumber}: ${unreadyTasks.length} task(s) are not yet marked READY. All station tasks must reach READY before Expo dispatch.`,
          pendingTasks: unreadyTasks.map((t) => ({
            taskId: t.id,
            itemName: t.itemName,
            station: t.station,
            status: t.status,
            fulfilledCount: t.fulfilledItemCount || 0,
            quantity: t.quantity,
          })),
        });
        return;
      }

      if (unreadyTasks.length > 0 && isForced) {
        if (!identity.isPrivileged) {
          sendJson(res, 403, {
            error: 'FORBIDDEN',
            code: 'FORBIDDEN',
            message: 'Force dispatching unready tasks requires manager or admin credentials.',
          });
          return;
        }
        await runtimeController.emitAudit('EXPO_FORCE_DISPATCH', identity.id, {
          tableNumber,
          unreadyCount: unreadyTasks.length,
          taskIds: unreadyTasks.map((t) => t.id),
        });
      }

      for (const t of unbumped) {
        await repo.updateKitchenTaskStatus(t.id, 'BUMPED');
      }

      // Advance linked order status to SERVED when all tasks are dispatched
      const orderIds = Array.from(new Set(tasks.map((t) => t.orderId).filter(Boolean)));
      for (const ordId of orderIds) {
        const ord = await repo.getOrder(ordId);
        if (ord && ord.status !== 'CANCELLED') {
          const ordTasks = (await repo.getKitchenTasks()).filter((t) => t.orderId === ordId);
          if (ordTasks.every((t) => t.status === 'BUMPED')) {
            await repo.updateOrderStatus(ordId, 'SERVED');
          }
        }
      }

      await repo.appendEvent(
        'expo.dispatched',
        'api:expo-pass',
        targetBranch || tbl?.branchId || currentBranch.id,
        { tableNumber, taskCount: unbumped.length },
        tbl?.floorId || currentFloor.id,
        tableNumber
      );

      const responsePayload = {
        success: true,
        message: `Order for table ${tableNumber} dispatched to floor (${unbumped.length} tasks bumped)`,
        isIdempotent: false,
      };
      if (idempotencyKey) {
        const record = {
          operation: 'kds.expo-dispatch',
          targetId: tableNumber,
          branchId: targetBranch,
          payloadHash: idempCheck.payloadHash,
          response: responsePayload,
        };
        await repo.saveIdempotencyRecord(idempotencyKey, record);
      }

      sendJson(res, 200, responsePayload);
      return;
    } finally {
      activeDispatchLocks.delete(lockKey);
    }
  }

  // 11b. KDS Expo Table Recall
  if (pathname === '/api/restaurant/kds/expo-recall' && method === 'POST') {
    const identity = requestIdentity;
    const authCheck = authorizeKdsRequest(identity, undefined, undefined, true);
    if (!authCheck.authorized) {
      sendJson(res, authCheck.statusCode!, { error: authCheck.error, code: authCheck.code });
      return;
    }

    const body = await parseBody(req);
    const tableNumber = body.tableNumber;
    if (!tableNumber) {
      sendJson(res, 400, { error: 'Table number is required', code: 'TABLE_NUMBER_REQUIRED' });
      return;
    }

    const allTasks = await repo.getKitchenTasks();
    const tasks = allTasks.filter((t) => t.tableNumber === tableNumber);
    const bumpedTasks = tasks.filter((t) => t.status === 'BUMPED');
    if (bumpedTasks.length === 0) {
      sendJson(res, 400, { error: `No bumped tasks to recall for table ${tableNumber}`, code: 'NO_BUMPED_TASKS' });
      return;
    }

    for (const t of bumpedTasks) {
      await repo.updateKitchenTaskStatus(t.id, 'READY');
    }

    await runtimeController.emitAudit('EXPO_TABLE_RECALLED', identity.id, {
      tableNumber,
      recalledCount: bumpedTasks.length,
    });

    sendJson(res, 200, {
      success: true,
      message: `Recalled ${bumpedTasks.length} task(s) for table ${tableNumber} back to READY pass.`,
      recalledTasks: bumpedTasks,
    });
    return;
  }

  // 12. Floor Tables List
  if ((pathname === '/api/restaurant/floor' || pathname === '/api/restaurant/tables') && method === 'GET') {
    const bId = (parsedUrl.query.branchId as string) || currentBranch.id;
    const fId = (parsedUrl.query.floorId as string) || undefined;
    const tables = await repo.getTables(bId, fId);
    sendJson(res, 200, {
      success: true,
      tables,
    });
    return;
  }

  // 13. Floor Layout Persist
  // Invariant: Single table payload updates ONLY that table in place!
  // Multi-table payload updates ONLY tables for the target floor/branch!
  if (pathname === '/api/restaurant/floor/save' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: 'Invalid or revoked credential', code: identity.type });
      return;
    }
    if (identity.type === 'DINER') {
      sendJson(res, 403, { error: 'Diner capability cannot modify floor layout', code: 'FORBIDDEN' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'Floor layout modification requires Manager or Admin privileges', code: 'FORBIDDEN' });
      return;
    }

    const body = await parseBody(req);
    if (Array.isArray(body.tables)) {
      const saveResult = await repo.saveFloorTables(body.tables, currentBranch.id, currentFloor.id, {
        expectedRevision: body.expectedRevision,
      });
      if (!saveResult.success) {
        sendJson(res, 409, {
          error: saveResult.error,
          code: saveResult.code || 'REVISION_CONFLICT',
        });
        return;
      }
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'table.updated',
        timestamp: new Date().toISOString(),
        producer: 'api:floor-save',
        branchId: currentBranch.id,
        tenantId: tenantContext.tenantId,
        payload: { totalTables: body.tables.length },
      });
      await runtimeController.emitAudit('FLOOR_LAYOUT_SAVED', 'admin:operations', { totalTables: body.tables.length });
      sendJson(res, 200, { success: true, message: 'Floor layout saved successfully' });
      return;
    }
    sendJson(res, 400, { error: 'Invalid tables payload' });
    return;
  }

  // 14a. Table Bill & Authoritative Breakdown (GET /api/restaurant/tables/:id/bill)
  if (pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/bill') && method === 'GET') {
    const rawId = pathname.replace('/api/restaurant/tables/', '').replace('/bill', '');
    const tableId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : rawId;
    const targetTable = typeof tableId === 'number' ? await repo.getTable(tableId) : await repo.getTableByNumber(tableId);
    if (!targetTable) {
      sendJson(res, 404, { success: false, error: `Table ${tableId} not found`, code: 'TABLE_NOT_FOUND' });
      return;
    }

    const identity = requestIdentity;
    if (
      identity.branchId &&
      identity.branchId !== '*' &&
      targetTable.branchId &&
      targetTable.branchId !== identity.branchId
    ) {
      sendJson(res, 403, {
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Staff credential for branch ${identity.branchId} cannot access bill for table in branch ${targetTable.branchId}.`,
      });
      return;
    }

    const billData = await repo.getTableBill(targetTable.id);
    sendJson(res, 200, { success: true, ...billData });
    return;
  }

  // 14b. Table Single Fetch & Update (GET & PATCH /api/restaurant/tables/:id)
  if (
    pathname.startsWith('/api/restaurant/tables/') &&
    !pathname.includes('/seats') &&
    !pathname.includes('/settle') &&
    !pathname.includes('/rotate-locator') &&
    !pathname.endsWith('/bill') &&
    method === 'GET'
  ) {
    const parts = pathname.split('/');
    const rawId = parts[parts.length - 1];
    const tableId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : rawId;
    const table = typeof tableId === 'number' ? await repo.getTable(tableId) : await repo.getTableByNumber(tableId);
    if (!table) {
      sendJson(res, 404, { error: 'Table not found' });
      return;
    }
    const bill = await repo.getTableBill(table.id);
    sendJson(res, 200, { success: true, table, bill });
    return;
  }

  // 14c. Table Creation with Quota Enforcement (POST /api/restaurant/tables)
  if (pathname === '/api/restaurant/tables' && method === 'POST') {
    if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER' || !requestIdentity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Table creation requires Manager or Admin privileges.' });
      return;
    }

    try {
      const quotaCheck = await ownerSelfService.checkPlanLimits(tenantContext.tenantId, 'TABLES');
      if (!quotaCheck.allowed) {
        sendJson(res, 403, {
          error: 'PLAN_LIMIT_EXCEEDED',
          code: 'PLAN_LIMIT_EXCEEDED',
          message: quotaCheck.error || 'Table limit exceeded for current plan tier.',
          quota: quotaCheck,
        });
        return;
      }
      if (quotaCheck.warning) {
        res.setHeader('x-quota-warning', `${quotaCheck.percentage}%`);
      }

      const body = await parseBody(req);
      const allTables = await repo.getTables();
      const nextId = body.id ? (typeof body.id === 'number' ? body.id : parseInt(body.id, 10)) : Math.max(0, ...allTables.map((t) => t.id)) + 1;
      const tableNumber = body.number || `T-${nextId < 10 ? '0' + nextId : nextId}`;
      const capacity = Number(body.capacity) || 4;

      const newTable: TableFloorRecord = {
        id: nextId,
        number: tableNumber,
        capacity,
        status: 'AVAILABLE',
        x: body.x || 100,
        y: body.y || 100,
        width: body.width || 90,
        height: body.height || 90,
        shape: body.shape || 'rectangle',
        section: body.section || 'Main',
        floorId: body.floorId || currentFloor?.id || 'fl_main',
        branchId: body.branchId || currentBranch?.id || 'branch_main',
        locator: crypto.randomBytes(6).toString('base64url'),
        seats: generateSeats(capacity, nextId),
      };

      await repo.saveFloorTables([newTable]);
      await ownerSelfService.updateOnboardingStep(tenantContext.tenantId, 'TABLES_REVIEWED', true);

      sendJson(res, 201, { success: true, table: newTable });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/tables/') && method === 'PATCH') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL') {
      sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
      return;
    }
    if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 403, { error: 'Diner capability cannot modify table properties', code: 'FORBIDDEN' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'Table modification requires Manager or Admin privileges', code: 'FORBIDDEN' });
      return;
    }

    const parts = pathname.split('/');
    const tableId = parseInt(parts[parts.length - 1], 10);
    const existingTable = await repo.getTable(tableId);
    if (!existingTable) {
      sendJson(res, 404, { error: 'Table not found' });
      return;
    }
    if (identity.branchId && identity.branchId !== '*' && existingTable.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot modify table in branch ${existingTable.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }
    const body = await parseBody(req);

    let updatedTable: TableFloorRecord | undefined;
    if (body.capacity) {
      updatedTable = await repo.updateTableCapacity(tableId, parseInt(body.capacity, 10));
    } else {
      updatedTable = await repo.getTable(tableId);
      if (updatedTable) {
        if (body.status) updatedTable.status = body.status;
        if (body.serverName) updatedTable.serverName = body.serverName;
        await repo.saveFloorTables([updatedTable]);
      }
    }

    if (!updatedTable) {
      sendJson(res, 404, { error: 'Table not found' });
      return;
    }

    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'table.updated',
      timestamp: new Date().toISOString(),
      producer: 'api:table-patch',
      branchId: currentBranch.id,
      tableNumber: updatedTable.number,
      tenantId: tenantContext.tenantId,
      payload: updatedTable,
    });

    sendJson(res, 200, { success: true, table: updatedTable });
    return;
  }

  // 15. Seat Management (POST /api/restaurant/tables/:id/seats & DELETE /api/restaurant/tables/:id/seats/:seatId)
  if (pathname.startsWith('/api/restaurant/tables/') && pathname.includes('/seats')) {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Seat management requires authenticated staff credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Seat management requires Manager or Admin privileges.' });
      return;
    }

    const parts = pathname.split('/');
    const tableId = parseInt(parts[4], 10);

    if (method === 'POST') {
      const body = await parseBody(req);
      const newSeat = await repo.addSeatToTable(tableId, body.label);
      if (!newSeat) {
        sendJson(res, 404, { error: 'Table not found' });
        return;
      }
      sendJson(res, 201, { success: true, seat: newSeat });
      return;
    }

    if (method === 'DELETE') {
      const seatId = parts[6];
      const ok = await repo.removeSeatFromTable(tableId, seatId);
      sendJson(res, ok ? 200 : 404, { success: ok });
      return;
    }
  }

  // Table Deletion (DELETE /api/restaurant/tables/:id)
  if (pathname.startsWith('/api/restaurant/tables/') && !pathname.includes('/seats') && method === 'DELETE') {
    const identity = requestIdentity;
    if (!identity.isPrivileged) {
      sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') ? 401 : 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Deleting tables requires manager privileges.',
      });
      return;
    }
    const parts = pathname.split('/');
    const tableId = parseInt(parts[parts.length - 1], 10);
    const table = await repo.getTable(tableId);
    if (!table) {
      sendJson(res, 404, { error: 'Table not found', deletedTableId: tableId });
      return;
    }
    if (identity.branchId && identity.branchId !== '*' && table.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot delete table in branch ${table.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }
    const ok = await repo.deleteTable(tableId);
    sendJson(res, ok ? 200 : 404, { success: ok, deletedTableId: tableId });
    return;
  }

  // Table QR Locator Explicit Rotation (POST /api/restaurant/tables/:id/rotate-locator)
  if (pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/rotate-locator') && method === 'POST') {
    const parts = pathname.split('/');
    const tableId = parseInt(parts[4], 10);
    const identity = requestIdentity;
    if (!identity.isPrivileged) {
      sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL') ? 401 : 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Rotating table QR locators requires authorized staff or manager privileges.',
      });
      return;
    }
    const targetTable = await repo.getTable(tableId);
    if (targetTable && identity.branchId && identity.branchId !== '*' && targetTable.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot rotate table in branch ${targetTable.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }
    const body = await parseBody(req);
    const result = await repo.rotateTableLocator(tableId, identity.id, body.reason);
    if (!result.success) {
      sendJson(res, 404, { error: result.error, code: 'TABLE_NOT_FOUND' });
      return;
    }
    await runtimeController.emitAudit('TABLE_LOCATOR_ROTATED', identity.id, {
      tableId,
      oldLocator: result.oldLocator,
      newLocator: result.newLocator,
      reason: body.reason,
    });
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'table.locator_rotated',
      timestamp: new Date().toISOString(),
      producer: 'api:table-security',
      branchId: currentBranch.id,
      tableNumber: result.table?.number,
      tenantId: tenantContext.tenantId,
      payload: result,
    });
    sendJson(res, 200, {
      success: true,
      data: result,
      message: `Table ${result.table?.number} QR locator rotated successfully.`,
    });
    return;
  }

  // Test Reset Endpoint (POST /api/restaurant/test/reset)
  if (pathname === '/api/restaurant/test/reset' && method === 'POST') {
    if (process.env.NODE_ENV === 'production') {
      sendJson(res, 403, {
        error: 'FORBIDDEN_IN_PRODUCTION',
        code: 'FORBIDDEN_IN_PRODUCTION',
        message: 'Test destructive reset endpoint is strictly forbidden in production mode.',
      });
      return;
    }
    await repo.resetToArchetypes();
    sendJson(res, 200, { success: true, message: 'Store reset to canonical archetypes' });
    return;
  }

  // 16. Assign Seated Guest (POST /api/restaurant/seats/:seatId/guest)
  if (pathname.startsWith('/api/restaurant/seats/') && pathname.endsWith('/guest') && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Assigning guests requires authenticated staff credentials.' });
      return;
    }
    const parts = pathname.split('/');
    const seatId = parts[4];
    const body = await parseBody(req);

    const result = await repo.assignGuestToSeat(seatId, body.name, body.preferences);
    if (!result) {
      sendJson(res, 404, { error: 'Seat not found' });
      return;
    }

    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'guest.joined',
      timestamp: new Date().toISOString(),
      producer: 'api:guest-assign',
      branchId: currentBranch.id,
      tenantId: tenantContext.tenantId,
      payload: result,
    });

    sendJson(res, 200, { success: true, data: result });
    return;
  }

  // 17. Branches API
  if (pathname === '/api/restaurant/branches') {
    if (method === 'GET') {
      sendJson(res, 200, { success: true, data: await repo.getBranches() });
      return;
    }
    if (method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch management requires manager credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Creating or updating branches requires Manager or Admin privileges.' });
        return;
      }
      const body = await parseBody(req);
      const saved = await repo.saveBranch(body);
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'branch.updated',
        timestamp: new Date().toISOString(),
        producer: 'api:branch-save',
        branchId: saved.id,
        tenantId: tenantContext.tenantId,
        payload: saved,
      });
      sendJson(res, 200, { success: true, data: saved });
      return;
    }
  }

  if (pathname.startsWith('/api/restaurant/branches/') && method === 'DELETE') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch deletion requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Deleting branches requires Manager or Admin privileges.' });
      return;
    }
    const branchId = pathname.replace('/api/restaurant/branches/', '');
    const ok = await repo.deleteBranch(branchId);
    sendJson(res, ok ? 200 : 404, { success: ok, deletedBranchId: branchId });
    return;
  }

  // 18. Floors API
  if (pathname === '/api/restaurant/floors') {
    if (method === 'GET') {
      const bFilter = parsedUrl.query.branchId as string;
      const result = await repo.getFloors(bFilter);
      sendJson(res, 200, { success: true, data: result });
      return;
    }
    if (method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
        return;
      }
      if (identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Floor management requires staff credentials.' });
        return;
      }
      if (!identity.isPrivileged) {
        sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Floor creation and layout management requires Manager or Admin privileges.' });
        return;
      }
      const body = await parseBody(req);
      if (body.action === 'SWITCH_LAYOUT') {
        const f = await repo.getFloor(body.floorId);
        if (f) {
          f.activeLayout = body.layoutName;
          await repo.saveFloor(f);
        }
        sendJson(res, 200, { success: true, floor: f });
        return;
      }
      if (body.action === 'RENAME') {
        const f = await repo.getFloor(body.floorId);
        if (f) {
          f.name = body.name;
          await repo.saveFloor(f);
        }
        sendJson(res, 200, { success: true, floor: f });
        return;
      }
      const floorRecord = {
        id: body.id || `floor_${crypto.randomUUID()}`,
        name: body.name || 'New Service Area',
        branchId: body.branchId || currentBranch.id,
        section: body.section || 'MAIN',
        activeLayout: body.activeLayout || 'Default Service',
        type: body.type || 'Standard',
        availableLayouts: body.availableLayouts || ['Default Service'],
        capacity: body.capacity || 40,
        tablesCount: body.tablesCount || 0,
        status: body.status || 'ACTIVE',
        ...body,
      };
      const saved = await repo.saveFloor(floorRecord);
      sendJson(res, 200, { success: true, data: saved });
      return;
    }
  }

  if (pathname.startsWith('/api/restaurant/floors/') && method === 'DELETE') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Floor deletion requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Deleting floor plans requires Manager or Admin privileges.' });
      return;
    }
    const floorId = pathname.replace('/api/restaurant/floors/', '');
    const ok = await repo.deleteFloor(floorId);
    sendJson(res, ok ? 200 : 404, { success: ok, deletedFloorId: floorId });
    return;
  }

  // 19. Table Merging API
  if (pathname === '/api/restaurant/tables/merge' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL') {
      sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
      return;
    }
    if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 403, { error: 'Diners cannot merge tables', code: 'FORBIDDEN' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
      return;
    }

    const body = await parseBody(req);
    const ok = await repo.mergeTables(body.tableId1, body.tableId2);
    if (!ok) {
      sendJson(res, 404, { error: 'One or both tables not found' });
      return;
    }
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'table.merged',
      timestamp: new Date().toISOString(),
      producer: 'api:table-merge',
      branchId: currentBranch.id,
      tenantId: tenantContext.tenantId,
      payload: body,
    });
    sendJson(res, 200, { success: true, message: 'Tables merged successfully' });
    return;
  }

  // 20. Table Unmerging API
  if (pathname === '/api/restaurant/tables/unmerge' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL') {
      sendJson(res, 401, { error: 'Invalid credential', code: 'INVALID_CREDENTIAL' });
      return;
    }
    if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 403, { error: 'Diners cannot unmerge tables', code: 'FORBIDDEN' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'Staff credential required', code: 'UNAUTHENTICATED' });
      return;
    }

    const body = await parseBody(req);
    const ok = await repo.unmergeTables(body.tableId);
    if (!ok) {
      sendJson(res, 404, { error: 'Table not found' });
      return;
    }
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'table.unmerged',
      timestamp: new Date().toISOString(),
      producer: 'api:table-unmerge',
      branchId: currentBranch.id,
      tenantId: tenantContext.tenantId,
      payload: body,
    });
    sendJson(res, 200, { success: true, message: 'Table unmerged successfully' });
    return;
  }

  // 21. Service Requests API
  if (pathname === '/api/restaurant/service-requests') {
    if (method === 'GET') {
      sendJson(res, 200, { success: true, data: await repo.getServiceRequests(currentBranch.id) });
      return;
    }
    if (method === 'POST') {
      const identity = requestIdentity;
      if (identity.type === 'INVALID_CREDENTIAL') {
        sendJson(res, 401, { error: 'INVALID_CREDENTIAL', code: 'INVALID_CREDENTIAL' });
        return;
      }
      if (identity.type === 'REVOKED_CAPABILITY') {
        sendJson(res, 401, { error: 'CAPABILITY_REVOKED', code: 'CAPABILITY_REVOKED' });
        return;
      }
      if (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS') {
        sendJson(res, 401, { error: 'CAPABILITY_REQUIRED', code: 'CAPABILITY_REQUIRED' });
        return;
      }

      const body = await parseBody(req);
      const tableNumber = body.tableNumber;
      if (!tableNumber) {
        sendJson(res, 400, { error: 'TABLE_REQUIRED', code: 'TABLE_REQUIRED', message: 'Table number is required.' });
        return;
      }

      if (identity.type === 'DINER' && identity.tableNumber) {
        const normIdTable = (identity.tableNumber || '').replace(/^T-/, '');
        const normReqTable = (tableNumber || '').replace(/^T-/, '');
        if (normIdTable !== normReqTable) {
          sendJson(res, 403, {
            error: 'TABLE_MISMATCH',
            code: 'TABLE_MISMATCH',
            message: `Diner capability for ${identity.tableNumber} cannot create service requests for ${tableNumber}.`,
          });
          return;
        }
      }

      const newReq: ServiceRequest = {
        id: body.id || `sreq_${Date.now()}`,
        tableNumber,
        branchId: body.branchId || currentBranch.id,
        floorId: body.floorId || currentFloor.id,
        type: body.type || 'WATER',
        status: 'PENDING',
        requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        note: body.note,
      };
      await repo.addServiceRequest(newReq);

      if (body.type === 'BILL') {
        const t = await repo.getTableByNumber(newReq.tableNumber);
        if (t) {
          t.status = 'BILL_REQUESTED';
          await repo.saveFloorTables([t]);
        }
      }

      sendJson(res, 201, { success: true, data: newReq });
      return;
    }
  }

  // 22. Resolve Service Request
  if (pathname.startsWith('/api/restaurant/service-requests/') && pathname.endsWith('/resolve') && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'ANONYMOUS') {
      sendJson(res, 401, {
        error: 'UNAUTHENTICATED',
        code: 'UNAUTHENTICATED',
        message: 'Resolving service requests requires authenticated staff or manager credentials.',
      });
      return;
    }
    if (identity.type === 'DINER' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Diners cannot resolve service requests.',
      });
      return;
    }
    if (!identity.isPrivileged && identity.type !== 'STAFF' && identity.type !== 'STATION') {
      sendJson(res, 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Resolving service requests requires operations staff or manager credentials.',
      });
      return;
    }
    const parts = pathname.split('/');
    const reqId = parts[4];
    const sReqs = await repo.getServiceRequests();
    const sReq = sReqs.find((r) => r.id === reqId);
    if (!sReq) {
      sendJson(res, 404, { error: 'Request not found' });
      return;
    }
    const targetTbl = await repo.getTableByNumber(sReq.tableNumber);
    if (targetTbl && identity.branchId && identity.branchId !== '*' && targetTbl.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot resolve request in branch ${targetTbl.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }
    const resolved = await repo.resolveServiceRequest(reqId);
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'service_request.resolved',
      timestamp: new Date().toISOString(),
      producer: 'api:service-resolve',
      branchId: currentBranch.id,
      tableNumber: resolved?.tableNumber || sReq.tableNumber,
      tenantId: tenantContext.tenantId,
      payload: resolved,
    });
    sendJson(res, 200, { success: true, data: resolved });
    return;
  }

  // 23. Reseed Storage to Canonical Archetypes
  if (pathname === '/api/restaurant/reseed' && method === 'POST') {
    if (process.env.NODE_ENV === 'production') {
      sendJson(res, 403, {
        error: 'FORBIDDEN_IN_PRODUCTION',
        code: 'FORBIDDEN_IN_PRODUCTION',
        message: 'Reseed endpoint is strictly forbidden in production mode.',
      });
      return;
    }
    await repo.reseed();
    sendJson(res, 200, { success: true, message: 'Runtime store reseeded successfully' });
    return;
  }

  // 24. Full State Inspection Dump
  if (pathname === '/api/restaurant/state' && method === 'GET') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, {
        error: identity.type === 'REVOKED_CAPABILITY' ? 'REVOKED_CAPABILITY' : (identity.error || 'INVALID_CREDENTIAL'),
        code: identity.type,
        message: 'Invalid or revoked credential. Access denied.',
      });
      return;
    }
    if (identity.type === 'DINER' || (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS')) {
      sendJson(res, (identity.type === 'ANONYMOUS') ? 401 : 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Full state inspection requires staff or manager credentials.',
      });
      return;
    }
    const [tables, menu, orders, tasks, sreqs, brand] = await Promise.all([
      repo.getTables(),
      repo.getMenuItems(true),
      repo.getOrders(),
      repo.getKitchenTasks(),
      repo.getServiceRequests(),
      repo.getTenantBrand(),
    ]);
    sendJson(res, 200, { tables, menu, orders, tasks, sreqs, brand });
    return;
  }

  // 25. Authoritative Financial Ledger Reconciliation
  if (pathname === '/api/restaurant/finance/reconciliation' && method === 'GET') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: 'INVALID_CREDENTIAL', code: identity.type });
      return;
    }
    if (identity.type === 'DINER' || (process.env.NODE_ENV === 'production' && !identity.isPrivileged)) {
      sendJson(res, (identity.type === 'ANONYMOUS') ? 401 : 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Financial reconciliation requires manager privileges.',
      });
      return;
    }
    const branchFilter = (parsedUrl.query.branchId as string) || undefined;
    const report = await repo.reconcileFinancialLedger(branchFilter);
    sendJson(res, 200, {
      success: true,
      data: report,
      branchId: branchFilter || 'ALL_BRANCHES',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 26. Template Marketplace Discovery & Installation
  if (pathname === '/api/restaurant/templates' && method === 'GET') {
    sendJson(res, 200, { success: true, data: await repo.getTemplates() });
    return;
  }

  if (
    (pathname === '/api/restaurant/templates/install' ||
      (pathname.startsWith('/api/restaurant/templates/') && pathname.endsWith('/install'))) &&
    method === 'POST'
  ) {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Template installation requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Installing templates requires Manager or Admin privileges.' });
      return;
    }
    const body = pathname === '/api/restaurant/templates/install' ? await parseBody(req) : {};
    const templateId = body.templateId || pathname.replace('/api/restaurant/templates/', '').replace('/install', '');
    try {
      const result = await repo.installTemplate(templateId);
      sendJson(res, 200, { success: true, ...result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 27. Visual Brand Studio Draft, Publish & Revisions
  if (pathname === '/api/restaurant/studio/draft' && method === 'GET') {
    sendJson(res, 200, { success: true, data: await repo.getTemplateDraft() });
    return;
  }

  if (pathname === '/api/restaurant/studio/draft' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Visual Studio draft editing requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Editing template drafts requires Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    try {
      const draft = await repo.saveTemplateDraft({
        draftSections: body.sections || body.draftSections,
        draftTokens: body.customTokens || body.draftTokens,
      });
      sendJson(res, 200, { success: true, data: draft });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/restaurant/studio/publish' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Publishing templates requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Publishing template changes requires Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    try {
      const pub = await repo.publishTemplateDraft(body.changeNotes);
      sendJson(res, 200, { success: true, data: pub });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/studio/revisions/') && pathname.endsWith('/restore') && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Restoring revisions requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Restoring template revisions requires Manager or Admin privileges.' });
      return;
    }
    const revisionId = pathname.replace('/api/restaurant/studio/revisions/', '').replace('/restore', '');
    try {
      const restored = await repo.restoreTemplateRevision(revisionId);
      sendJson(res, 200, { success: true, data: restored });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 28. Tenant Branding & Custom Domain Verification
  if ((pathname === '/api/restaurant/branding' || pathname === '/api/restaurant/settings/whitelabel') && method === 'GET') {
    const reqBranchId = (parsedUrl.query.branchId as string) || (parsedUrl.query.branch as string);
    sendJson(res, 200, { success: true, data: await repo.getTenantBrand(reqBranchId) });
    return;
  }

  // 28b. Branch-Scoped White-Label Overrides
  if (pathname === '/api/restaurant/branding/branch-overrides' && method === 'GET') {
    const targetBranchId = (parsedUrl.query.branchId as string) || (parsedUrl.query.branch as string);
    if (!targetBranchId) {
      sendJson(res, 400, { success: false, error: 'BRANCH_REQUIRED', message: 'branchId query parameter is required.' });
      return;
    }
    const branch = await repo.getBranch(targetBranchId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
      return;
    }
    const baseBrand = await repo.getTenantBrand();
    const branchOverride = await repo.getBranchBrandOverride(targetBranchId);
    const effectiveBrand = await repo.getTenantBrand(targetBranchId);
    sendJson(res, 200, {
      success: true,
      branchId: targetBranchId,
      base: baseBrand,
      override: branchOverride,
      effective: effectiveBrand,
      isOverridden: !!branchOverride,
    });
    return;
  }

  if (pathname === '/api/restaurant/branding/branch-overrides' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch override updates require authenticated manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branch override updates require Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    const targetBranchId = body.branchId;
    if (!targetBranchId) {
      sendJson(res, 400, { success: false, error: 'BRANCH_REQUIRED', message: 'Target branchId is required.' });
      return;
    }
    // Scope check: branch-scoped credentials cannot modify another branch's overrides!
    if (identity.branchId && identity.branchId !== '*' && identity.branchId !== targetBranchId) {
      sendJson(res, 403, {
        success: false,
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Staff credential for branch ${identity.branchId} cannot configure overrides for branch ${targetBranchId}.`,
      });
      return;
    }
    const branch = await repo.getBranch(targetBranchId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
      return;
    }
    // Validate supported override fields
    const allowedOverrides: any = {};
    if (body.restaurantName !== undefined) {
      const name = String(body.restaurantName).trim();
      if (name.length > 0 && (name.length < 2 || name.length > 100)) {
        sendJson(res, 400, { success: false, error: 'INVALID_NAME', message: 'Branch restaurant name must be between 2 and 100 characters.' });
        return;
      }
      if (name.length > 0) allowedOverrides.restaurantName = name;
    }
    if (body.tagline !== undefined) {
      allowedOverrides.tagline = String(body.tagline).trim();
    }
    if (body.primaryColor !== undefined) {
      const col = String(body.primaryColor).trim();
      if (col.length > 0 && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(col)) {
        sendJson(res, 400, { success: false, error: 'INVALID_COLOR', message: 'Primary color must be a valid hex color code (e.g. #C86B3C).' });
        return;
      }
      if (col.length > 0) allowedOverrides.primaryColor = col;
    }
    if (body.subdomain !== undefined) {
      const sub = String(body.subdomain).trim();
      if (sub.length > 0 && !/^[a-zA-Z0-9.-]+$/.test(sub)) {
        sendJson(res, 400, { success: false, error: 'INVALID_SUBDOMAIN', message: 'Subdomain contains invalid characters.' });
        return;
      }
      if (sub.length > 0) allowedOverrides.subdomain = sub;
    }
    if (body.phone !== undefined) {
      allowedOverrides.phone = String(body.phone).trim();
    }
    if (body.customDomain !== undefined) {
      allowedOverrides.customDomain = String(body.customDomain).trim();
    }

    const effective = await repo.updateBranchBrandOverride(targetBranchId, allowedOverrides, identity.id || 'Manager');
    sendJson(res, 200, {
      success: true,
      branchId: targetBranchId,
      override: await repo.getBranchBrandOverride(targetBranchId),
      effective,
      message: `Branch-specific overrides for ${branch.name} saved durably.`,
    });
    return;
  }

  if (pathname.startsWith('/api/restaurant/branding/branch-overrides/') && method === 'DELETE') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Resetting branch overrides requires authenticated manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Resetting branch overrides requires Manager or Admin privileges.' });
      return;
    }
    const targetBranchId = pathname.replace('/api/restaurant/branding/branch-overrides/', '');
    if (identity.branchId && identity.branchId !== '*' && identity.branchId !== targetBranchId) {
      sendJson(res, 403, {
        success: false,
        error: 'BRANCH_MISMATCH',
        code: 'BRANCH_MISMATCH',
        message: `Staff credential for branch ${identity.branchId} cannot reset overrides for branch ${targetBranchId}.`,
      });
      return;
    }
    const branch = await repo.getBranch(targetBranchId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
      return;
    }
    const effective = await repo.updateBranchBrandOverride(targetBranchId, null, identity.id || 'Manager');
    sendJson(res, 200, {
      success: true,
      branchId: targetBranchId,
      override: null,
      effective,
      message: `Branch ${branch.name} overrides reset. Inheriting platform brand defaults.`,
    });
    return;
  }

  if ((pathname === '/api/restaurant/branding' || pathname === '/api/restaurant/settings/whitelabel') && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branding updates require authenticated manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branding updates require Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    // Sanitize and validate custom CSS if provided via allowlist parser
    if (body.customCss && typeof body.customCss === 'string') {
      const cssCheck = validateAndSanitizeCustomCss(body.customCss, '.brand-custom-theme');
      if (!cssCheck.valid) {
        sendJson(res, 400, {
          success: false,
          error: 'INVALID_CUSTOM_CSS',
          message: cssCheck.error || 'Custom CSS contains prohibited rules or constructs.',
          rejectedRule: cssCheck.rejectedRule,
        });
        return;
      }
      body.customCss = cssCheck.sanitizedCss;
    }
    try {
      const updated = await repo.updateTenantBrand(body);
      sendJson(res, 200, { success: true, data: updated });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 28b. Custom Domains Management & DNS Verification
  if (pathname === '/api/restaurant/domains' && method === 'GET') {
    const identity = requestIdentity;
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Viewing custom domains requires Manager or Admin privileges.' });
      return;
    }
    try {
      const list = await customDomainService.listCustomDomains(tenantContext.tenantId);
      sendJson(res, 200, { success: true, data: list });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/restaurant/domains' && method === 'POST') {
    const identity = requestIdentity;
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Adding custom domains requires Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    try {
      const challenge = await customDomainService.addCustomDomain(tenantContext.tenantId, body.domain);
      sendJson(res, 201, { success: true, data: challenge });
    } catch (err: any) {
      const isCollision = err.message.includes('DOMAIN_ALREADY_CLAIMED');
      sendJson(res, isCollision ? 409 : 400, { success: false, error: err.message });
    }
    return;
  }

  if (
    (pathname === '/api/restaurant/domains/verify' ||
      pathname === '/api/restaurant/branding/verify-domain' ||
      pathname === '/api/restaurant/settings/domains/verify') &&
    method === 'POST'
  ) {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Domain verification requires authenticated manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Domain verification requires Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    const brand = await repo.getTenantBrand();
    const domain = body.domain || brand.customDomain;
    if (!domain || !domain.includes('.')) {
      sendJson(res, 400, { success: false, error: 'INVALID_DOMAIN', message: 'Domain must be a fully qualified domain name.' });
      return;
    }
    try {
      const verifyRes = await customDomainService.verifyCustomDomain(tenantContext.tenantId, domain);
      if (verifyRes.verified) {
        await repo.updateTenantBrand({
          customDomain: domain,
          domainStatus: 'VERIFIED',
          sslStatus: 'ACTIVE',
        });
        sendJson(res, 200, {
          success: true,
          data: verifyRes,
          message: `Domain ${domain} successfully verified with SSL provisioned.`,
        });
      } else {
        sendJson(res, 400, {
          success: false,
          data: verifyRes,
          error: verifyRes.error || 'DNS TXT verification failed.',
        });
      }
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/domains/') && method === 'DELETE') {
    const identity = requestIdentity;
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Removing custom domains requires Manager or Admin privileges.' });
      return;
    }
    const targetDomain = decodeURIComponent(pathname.replace('/api/restaurant/domains/', '')).trim();
    try {
      const deleteRes = await customDomainService.removeCustomDomain(tenantContext.tenantId, targetDomain);
      sendJson(res, 200, deleteRes);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 28c. Owner Self-Service Onboarding, Secure Image Uploads & Encrypted Gateway Credentials
  if (pathname === '/api/restaurant/onboarding' && method === 'GET') {
    try {
      const state = await ownerSelfService.getOnboardingState(tenantContext.tenantId);
      sendJson(res, 200, { success: true, onboarding: state });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: 'ONBOARDING_FETCH_FAILED', message: err.message });
    }
    return;
  }

  if (pathname === '/api/restaurant/onboarding/step' && method === 'POST') {
    if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER') {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Staff credentials required to update onboarding checklist.' });
      return;
    }
    const body = await parseBody(req);
    if (!body.step) {
      sendJson(res, 400, { success: false, error: 'MISSING_STEP', message: 'Field "step" is required.' });
      return;
    }
    try {
      const state = await ownerSelfService.updateOnboardingStep(
        tenantContext.tenantId,
        body.step as OnboardingStepKey,
        body.completed !== false
      );
      sendJson(res, 200, { success: true, onboarding: state });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (
    (pathname === '/api/restaurant/uploads/logo' ||
      pathname === '/api/restaurant/uploads/hero' ||
      pathname === '/api/restaurant/branding/upload-image') &&
    method === 'POST'
  ) {
    if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER' || !requestIdentity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required to upload branding assets.' });
      return;
    }
    try {
      const parsed = await parseBody(req).catch(() => ({}));
      const kind = pathname.endsWith('/hero') || parsed.kind === 'hero' ? 'hero' : 'logo';
      const { buffer } = await extractImageBuffer(req);
      const saved = await ownerSelfService.saveTenantImage(tenantContext.tenantId, buffer, kind);
      if (kind === 'logo') {
        await repo.updateTenantBrand({ logoUrl: saved.url });
      } else {
        await repo.updateTenantBrand({ heroBannerUrl: saved.url });
      }
      sendJson(res, 200, { success: true, data: saved });
    } catch (err: any) {
      const isSecurity = err.message.includes('SECURITY_VIOLATION');
      const isFormat = err.message.includes('UNSUPPORTED_IMAGE_FORMAT');
      const isLarge = err.message.includes('IMAGE_TOO_LARGE');
      const statusCode = (isSecurity || isFormat || isLarge) ? 400 : 500;
      sendJson(res, statusCode, {
        success: false,
        error: isSecurity ? 'SECURITY_VIOLATION' : (isFormat ? 'UNSUPPORTED_IMAGE_FORMAT' : (isLarge ? 'IMAGE_TOO_LARGE' : 'UPLOAD_FAILED')),
        message: err.message,
      });
    }
    return;
  }

  if (pathname === '/api/restaurant/payments/config' && method === 'GET') {
    if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER') {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Staff credentials required to view payment configuration.' });
      return;
    }
    const unmasked = parsedUrl.query.unmasked === 'true' && requestIdentity.isPrivileged;
    try {
      const paymentConfig = await ownerSelfService.getPaymentConfig(tenantContext.tenantId, unmasked);
      sendJson(res, 200, { success: true, paymentConfig });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: 'PAYMENT_CONFIG_FAILED', message: err.message });
    }
    return;
  }

  if (pathname === '/api/restaurant/payments/config' && method === 'POST') {
    if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (requestIdentity.type === 'ANONYMOUS' || requestIdentity.type === 'DINER' || !requestIdentity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', message: 'Manager or Admin privileges required to configure payment gateway.' });
      return;
    }
    const body = await parseBody(req);
    try {
      const result = await ownerSelfService.savePaymentConfig(tenantContext.tenantId, {
        keyId: body.keyId,
        keySecret: body.keySecret,
        webhookSecret: body.webhookSecret,
        gstin: body.gstin,
        legalEntityName: body.legalEntityName,
      });
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: 'PAYMENT_CONFIG_FAILED', message: err.message });
    }
    return;
  }

  // 29. Customer Support Desk & Cases
  if (pathname === '/api/restaurant/support/tickets' && method === 'GET') {
    if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (requestIdentity.type !== 'STAFF' && requestIdentity.type !== 'ADMIN') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Staff or manager authentication required to view support tickets.' });
      return;
    }
    sendJson(res, 200, { success: true, data: await repo.getSupportTickets() });
    return;
  }

  if (pathname === '/api/restaurant/support/tickets' && method === 'POST') {
    if (requestIdentity.type === 'INVALID_CREDENTIAL' || requestIdentity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: requestIdentity.type, code: requestIdentity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (requestIdentity.type !== 'STAFF' && requestIdentity.type !== 'ADMIN') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Staff or manager authentication required to create support tickets.' });
      return;
    }
    const body = await parseBody(req);
    const initialMessage = body.initialMessage || body.description || body.message || body.subject;
    if (!body.subject || !initialMessage) {
      sendJson(res, 400, { success: false, error: 'Missing subject or initialMessage' });
      return;
    }
    try {
      const ticket = await repo.createSupportTicket({
        branchId: body.branchId || currentBranch.id,
        branchName: body.branchName || currentBranch.name,
        staffId: body.staffId || 'staff_mgr_ldh',
        staffName: body.staffName || body.senderName || 'Restaurant Operator',
        category: body.category || 'URGENT_INCIDENT',
        severity: body.severity || 'MEDIUM',
        subject: body.subject,
        description: body.description || initialMessage || body.subject,
        initialMessage,
      });
      sendJson(res, 201, { success: true, data: ticket });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/support/tickets/') && pathname.endsWith('/message') && method === 'POST') {
    const ticketId = pathname.replace('/api/restaurant/support/tickets/', '').replace('/message', '');
    const body = await parseBody(req);
    if (!body.body && !body.text) {
      sendJson(res, 400, { success: false, error: 'Missing body for support message' });
      return;
    }
    try {
      const success = await repo.addSupportTicketMessage(ticketId, {
        text: body.body || body.text,
        sender: body.senderRole === 'ORBITOX_SUPPORT' ? 'ORBITOX_SUPPORT' : 'RESTAURANT_STAFF',
        authorName: body.senderName || body.authorName || 'Staff Member',
        attachments: body.attachmentUrl ? [body.attachmentUrl] : undefined,
      });
      const ticket = await repo.getSupportTicketById(ticketId);
      sendJson(res, 200, { success, data: ticket });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/support/tickets/') && pathname.endsWith('/status') && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Updating support ticket status requires authenticated staff credentials.' });
      return;
    }
    const ticketId = pathname.replace('/api/restaurant/support/tickets/', '').replace('/status', '');
    const body = await parseBody(req);
    try {
      const ok = await repo.updateSupportTicketStatus(ticketId, body.status);
      const ticket = await repo.getSupportTicketById(ticketId);
      sendJson(res, 200, { success: ok, data: ticket });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 30. Menu Catalog Management (Create, Edit, Delete)
  if (pathname === '/api/restaurant/menu/items' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog mutation requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog mutation requires Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    try {
      const newItem = await repo.createMenuItem(body);
      sendJson(res, 201, { success: true, data: newItem });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'PATCH') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog modification requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog modification requires Manager or Admin privileges.' });
      return;
    }
    const itemId = pathname.replace('/api/restaurant/menu/items/', '');
    const body = await parseBody(req);
    try {
      const updated = await repo.updateMenuItem(itemId, body);
      sendJson(res, 200, { success: true, data: updated });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'DELETE') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Menu catalog deletion requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Menu catalog deletion requires Manager or Admin privileges.' });
      return;
    }
    const itemId = pathname.replace('/api/restaurant/menu/items/', '');
    try {
      await repo.deleteMenuItem(itemId);
      sendJson(res, 200, { success: true, message: `Item ${itemId} deleted` });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 30b. Menu Items Query
  if (pathname === '/api/restaurant/menu/items' && method === 'GET') {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const includeArchived = urlObj.searchParams.get('includeArchived') === 'true';
    const cat = urlObj.searchParams.get('category');
    let items = await repo.getMenuItems(includeArchived);
    if (cat && cat !== 'ALL') {
      items = items.filter((i) => i.category.toLowerCase() === cat.toLowerCase() || i.categoryId === cat);
    }
    sendJson(res, 200, { success: true, count: items.length, data: items });
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'GET') {
    const itemId = pathname.replace('/api/restaurant/menu/items/', '');
    const item = await repo.getMenuItem(itemId);
    if (!item) {
      sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Item ${itemId} not found` });
      return;
    }
    sendJson(res, 200, { success: true, data: item });
    return;
  }

  // 30c. Category Taxonomy Management
  if (pathname === '/api/restaurant/menu/categories' && method === 'GET') {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const includeArchived = urlObj.searchParams.get('includeArchived') === 'true';
    const categories = await repo.getCategories(includeArchived);
    const allItems = await repo.getMenuItems(true);
    const enriched = categories.map((c) => ({
      ...c,
      itemCount: allItems.filter((i) => !i.isArchived && (i.category === c.name || i.categoryId === c.id)).length,
    }));
    sendJson(res, 200, { success: true, count: enriched.length, data: enriched });
    return;
  }

  if (pathname === '/api/restaurant/menu/categories' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category creation requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category creation requires Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    try {
      const newCat = await repo.createCategory(body);
      sendJson(res, 201, { success: true, data: newCat });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/restaurant/menu/categories/reorder' && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category reordering requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category reordering requires Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    if (!Array.isArray(body.orderedIds)) {
      sendJson(res, 400, { success: false, error: 'INVALID_ORDERED_IDS', message: 'orderedIds array required' });
      return;
    }
    try {
      const reordered = await repo.reorderCategories(body.orderedIds);
      sendJson(res, 200, { success: true, data: reordered });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/categories/') && method === 'PATCH') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category modification requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category modification requires Manager or Admin privileges.' });
      return;
    }
    const catId = pathname.replace('/api/restaurant/menu/categories/', '');
    const body = await parseBody(req);
    try {
      const updated = await repo.updateCategory(catId, body);
      if (!updated) {
        sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Category ${catId} not found` });
        return;
      }
      sendJson(res, 200, { success: true, data: updated });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/categories/') && method === 'DELETE') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Category deletion requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Category deletion requires Manager or Admin privileges.' });
      return;
    }
    const catId = pathname.replace('/api/restaurant/menu/categories/', '');
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const reassignTo = urlObj.searchParams.get('reassignTo') || undefined;
    try {
      const result = await repo.archiveCategory(catId, reassignTo);
      if (!result.success) {
        sendJson(res, 422, { success: false, error: 'CATEGORY_ARCHIVE_FAILED', message: result.error });
        return;
      }
      sendJson(res, 200, { success: true, message: `Category ${catId} archived`, reassignedCount: result.reassignedCount });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 30b. Branch Menu Resolution & Overrides
  if (pathname.startsWith('/api/restaurant/branches/') && pathname.endsWith('/menu') && method === 'GET') {
    const bId = pathname.replace('/api/restaurant/branches/', '').replace('/menu', '');
    const branch = await repo.getBranch(bId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${bId} not found.` });
      return;
    }
    const resolvedMenu = await repo.getResolvedMenuForBranch(bId);
    sendJson(res, 200, { success: true, branchId: bId, branchName: branch.name, count: resolvedMenu.length, data: resolvedMenu });
    return;
  }

  if (pathname.startsWith('/api/restaurant/branches/') && method === 'GET') {
    const bId = pathname.replace('/api/restaurant/branches/', '');
    const branch = await repo.getBranch(bId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${bId} not found.` });
      return;
    }
    sendJson(res, 200, { success: true, data: branch });
    return;
  }

  if ((pathname === '/api/restaurant/menu/branch-overrides' || pathname === '/api/restaurant/menu/branch-override') && method === 'GET') {
    const bId = parsedUrl.query.branchId as string | undefined;
    sendJson(res, 200, { success: true, data: await repo.getBranchMenuOverrides(bId) });
    return;
  }

  if ((pathname === '/api/restaurant/menu/branch-overrides' || pathname === '/api/restaurant/menu/branch-override') && method === 'POST') {
    const identity = requestIdentity;
    if (identity.type === 'INVALID_CREDENTIAL' || identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, { error: identity.type, code: identity.type, message: 'Invalid or revoked credential.' });
      return;
    }
    if (identity.type === 'ANONYMOUS') {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED', message: 'Branch menu override requires manager credentials.' });
      return;
    }
    if (!identity.isPrivileged) {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Branch menu override requires Manager or Admin privileges.' });
      return;
    }
    const body = await parseBody(req);
    if (!body.itemId || !body.branchId) {
      sendJson(res, 400, { success: false, error: 'MISSING_FIELDS', message: 'itemId and branchId are required.' });
      return;
    }
    if (identity.branchId && identity.branchId !== '*' && identity.branchId !== body.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot modify overrides for branch ${body.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }
    const saved = await repo.setBranchMenuOverride(body);
    sendJson(res, 200, { success: true, data: saved });
    return;
  }

  // 30c. Resolved Branch Menu Commerce Endpoint
  if (pathname === '/api/commerce/menu' && method === 'GET') {
    const branchId = (parsedUrl.query.branch as string) || currentBranch.id;
    const resolvedMenu = await repo.getResolvedMenuForBranch(branchId);
    sendJson(res, 200, { success: true, branchId, count: resolvedMenu.length, data: resolvedMenu });
    return;
  }

  // 31. Multi-Experience Commerce Marketplace & Quick-Commerce APIs
  if (pathname === '/api/commerce/restaurants' && method === 'GET') {
    res.setHeader('X-API-Deprecation', 'single-brand-migration; use /api/commerce/menu instead');
    const partners = await repo.getRestaurantPartners();
    sendJson(res, 200, { success: true, count: partners.length, data: partners });
    return;
  }

  if (pathname.startsWith('/api/commerce/restaurants/') && method === 'GET') {
    const partnerId = pathname.replace('/api/commerce/restaurants/', '');
    const partner = await repo.getRestaurantPartnerById(partnerId);
    if (!partner) {
      sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Restaurant partner ${partnerId} not found.` });
      return;
    }
    sendJson(res, 200, { success: true, data: partner });
    return;
  }

  if ((pathname === '/api/commerce/grocery/skus' || pathname === '/api/commerce/grocery/catalog') && method === 'GET') {
    const categoryFilter = parsedUrl.query.category as string | undefined;
    const skus = await repo.getGrocerySkus(categoryFilter);
    sendJson(res, 200, { success: true, count: skus.length, data: skus });
    return;
  }

  if (pathname.startsWith('/api/commerce/grocery/skus/') && method === 'GET') {
    const skuId = pathname.replace('/api/commerce/grocery/skus/', '');
    const sku = await repo.getGrocerySkuById(skuId);
    if (!sku) {
      sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Grocery SKU ${skuId} not found.` });
      return;
    }
    sendJson(res, 200, { success: true, data: sku });
    return;
  }

  // 31b. Order Status Tracking API (High-entropy token validation & PII redaction)
  if (pathname.startsWith('/api/commerce/orders/') && method === 'GET') {
    const orderId = pathname.replace('/api/commerce/orders/', '');
    const order = await repo.getOrder(orderId);
    const cachedRecord = await repo.getIdempotencyRecord(orderId);
    const cached = cachedRecord?.response || cachedRecord;
    if (!order && !cached) {
      sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Order ${orderId} not found.` });
      return;
    }

    const authHeader = (req.headers['authorization'] as string) || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const headerToken = (req.headers['x-order-token'] as string) || bearerToken;
    const queryToken = (parsedUrl.query.orderToken as string) || '';
    const reqToken = headerToken || queryToken;

    const identity = requestIdentity;
    const isStaff = identity.type === 'STAFF' || identity.type === 'ADMIN' || identity.type === 'STATION';
    const expectedToken = order?.orderToken || cached?.orderToken;

    // If an invalid tracking token is explicitly provided, reject with 403
    if (reqToken && expectedToken && reqToken !== expectedToken && !isStaff) {
      sendJson(res, 403, {
        success: false,
        error: 'UNAUTHORIZED_ORDER_ACCESS',
        message: 'The provided order tracking token does not match this order.',
      });
      return;
    }

    const tasks = (await repo.getKitchenTasks()).filter((t) => t.orderId === orderId);
    let liveStatus = 'CONFIRMED';
    let statusLabel = 'Order Confirmed & Sent to Kitchen';

    if (order?.status === 'CANCELLED' || cached?.status === 'CANCELLED') {
      liveStatus = 'CANCELLED';
      statusLabel = 'Order Cancelled';
    } else if (order?.status === 'SERVED' || order?.status === 'PAID') {
      liveStatus = 'SERVED';
      statusLabel = 'Completed & Dispatched';
    } else if (tasks.length > 0) {
      if (tasks.every((t) => t.status === 'BUMPED')) {
        liveStatus = 'SERVED';
        statusLabel = 'Completed & Dispatched';
      } else if (tasks.every((t) => t.status === 'READY' || t.status === 'BUMPED')) {
        liveStatus = 'READY';
        statusLabel = 'Ready for Pickup / Out for Delivery';
      } else if (tasks.some((t) => t.status === 'IN_PROGRESS' || t.status === 'READY')) {
        liveStatus = 'IN_PREPARATION';
        statusLabel = 'Preparing Fresh in Kitchen';
      } else {
        liveStatus = 'CONFIRMED';
        statusLabel = 'Order Confirmed & Queued in Kitchen';
      }
    }

    const targetOrder = { ...(cached || {}), ...(order || {}) };
    const rawCustomer = cached?.customer || (order as any)?.customer;
    const isAuthorized = isStaff || (expectedToken && reqToken === expectedToken);
    const safeCustomer = isAuthorized && rawCustomer
      ? rawCustomer
      : {
          name: rawCustomer?.name || targetOrder?.guestName || 'Guest Patron',
          phone: rawCustomer?.phone ? rawCustomer.phone.slice(0, 4) + '******' + rawCustomer.phone.slice(-4) : undefined,
          address: rawCustomer?.address ? '[Protected Delivery Address]' : undefined,
          notes: isAuthorized ? rawCustomer?.notes : undefined,
        };

    const orderBranchId = targetOrder.branchId || targetOrder.branch || currentBranch.id;
    const orderBranch = (await repo.getBranch(orderBranchId)) || currentBranch;
    const targetBranchMeta = {
      id: orderBranch.id,
      name: orderBranch.name,
      city: orderBranch.city,
      phone: orderBranch.phone,
    };
    const sanitizedTasks = tasks.map((t) => ({
      id: t.id,
      itemName: t.itemName,
      station: t.station,
      status: t.status,
      quantity: t.quantity,
    }));

    sendJson(res, 200, {
      success: true,
      orderId,
      status: liveStatus,
      statusLabel,
      order: {
        ...targetOrder,
        status: liveStatus,
        branchId: orderBranch.id,
        branchName: orderBranch.name,
        targetBranch: targetBranchMeta,
        customer: safeCustomer,
        customerName: safeCustomer.name,
        customerPhone: safeCustomer.phone,
        deliveryAddress: safeCustomer.address,
        customerNotes: safeCustomer.notes,
      },
      branch: targetBranchMeta,
      targetBranch: targetBranchMeta,
      tasks: sanitizedTasks,
      branchId: orderBranch.id,
      lastUpdatedAt: new Date().toISOString(),
    });
    return;
  }

  // Commerce Order Cancellation
  if (pathname.startsWith('/api/commerce/orders/') && pathname.endsWith('/cancel') && method === 'POST') {
    const orderId = pathname.replace('/api/commerce/orders/', '').replace('/cancel', '');
    const order = await repo.getOrder(orderId);
    const cachedRecord = await repo.getIdempotencyRecord(orderId);
    const cached = cachedRecord?.response || cachedRecord;
    if (!order && !cached) {
      sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Order ${orderId} not found.` });
      return;
    }

    const authHeader = (req.headers['authorization'] as string) || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const headerToken = (req.headers['x-order-token'] as string) || bearerToken;
    const queryToken = (parsedUrl.query.orderToken as string) || '';
    const reqToken = headerToken || queryToken;

    const identity = requestIdentity;
    const isStaff = identity.type === 'STAFF' || identity.type === 'ADMIN' || identity.type === 'STATION';
    const expectedToken = order?.orderToken || cached?.orderToken;

    const isAuthorized = isStaff || (expectedToken && reqToken === expectedToken);
    if (!isAuthorized) {
      sendJson(res, 403, {
        success: false,
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Valid order token or staff credentials required to cancel order.',
      });
      return;
    }

    const tasks = (await repo.getKitchenTasks()).filter((t) => t.orderId === orderId);
    const alreadyStarted = tasks.some((t) => t.status === 'IN_PROGRESS' || t.status === 'READY' || t.status === 'BUMPED');
    if (alreadyStarted && !isStaff) {
      sendJson(res, 400, {
        success: false,
        error: 'ORDER_ALREADY_IN_PREPARATION',
        code: 'ORDER_ALREADY_IN_PREPARATION',
        message: 'Order is already being prepared in the kitchen and cannot be cancelled automatically.',
      });
      return;
    }

    const body = await parseBody(req);
    const reason = body.reason || 'Customer requested cancellation';

    if (order) {
      await repo.cancelOrder(orderId, reason, isStaff ? identity.id : 'customer');
    }
    if (cached) {
      cached.status = 'CANCELLED';
      cached.statusLabel = 'Order Cancelled';
    }
    for (const t of tasks) {
      if (t.status === 'QUEUED') {
        t.status = 'CANCELLED' as any;
      }
    }

    const orderBranchId = order?.branchId || cached?.branchId || currentBranch.id;
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'order.cancelled',
      timestamp: new Date().toISOString(),
      producer: orderId,
      branchId: orderBranchId,
      tenantId: tenantContext.tenantId,
      payload: { orderId, reason, status: 'CANCELLED' },
    });

    sendJson(res, 200, {
      success: true,
      message: `Order ${orderId} has been cancelled successfully.`,
      orderId,
      status: 'CANCELLED',
      statusLabel: 'Order Cancelled',
    });
    return;
  }

  if (pathname === '/api/commerce/orders' && method === 'POST') {
    const body = await parseBody(req);
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    const cached = idempotencyKey ? await repo.getIdempotencyRecord(idempotencyKey) : null;
    if (cached) {
      const replayData = cached?.response || cached;
      const cachedItemIds = new Set((replayData?.items || []).map((i: any) => i.id));
      const incomingItems = Array.isArray(body.items) ? body.items : [];
      const incBranch = body.branchId || currentBranch.id;
      const cachedBranch = replayData?.branchId;
      const branchConflict = Boolean(incBranch && cachedBranch && incBranch !== cachedBranch);

      const incName = String(body.customerName || body.customer?.name || '').trim().toLowerCase();
      const cachedName = String(replayData?.customer?.name || '').trim().toLowerCase();
      const nameConflict = Boolean(incName && cachedName && incName !== cachedName);

      const incPhone = (body.customerPhone || body.customer?.phone || '').replace(/\D/g, '').slice(-10);
      const cachedPhone = (replayData?.customer?.phone || '').replace(/\D/g, '').slice(-10);
      const phoneConflict = Boolean(incPhone && cachedPhone && incPhone !== cachedPhone);

      const itemConflict = incomingItems.length > 0 && incomingItems.some((inItem: any) => !cachedItemIds.has(inItem.id));

      const hasConflict = branchConflict || nameConflict || phoneConflict || itemConflict;

      if (hasConflict) {
        sendJson(res, 409, {
          success: false,
          error: 'IDEMPOTENCY_CONFLICT',
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'An order was already processed with this idempotency key using different order contents or customer identity.',
        });
        return;
      }
      sendJson(res, 200, { ...replayData, idempotentReplay: true });
      return;
    }

    // 1. Validate Target Branch
    const targetBranchId = body.branchId || currentBranch.id;
    const targetBranch = await repo.getBranch(targetBranchId);
    if (!targetBranch) {
      sendJson(res, 400, {
        success: false,
        error: 'INVALID_BRANCH',
        code: 'INVALID_BRANCH',
        message: `Branch ${targetBranchId} is not a valid outlet of this restaurant.`,
      });
      return;
    }

    // 2. Validate Customer Identity (Name, Validated Phone, Delivery Address)
    const rawCustomerName = String(body.customerName || body.customer?.name || '').trim();
    if (!rawCustomerName || rawCustomerName.length < 2 || rawCustomerName.length > 80 || /<[^>]*>/.test(rawCustomerName)) {
      sendJson(res, 400, {
        success: false,
        error: 'INVALID_CUSTOMER_NAME',
        code: 'INVALID_CUSTOMER_NAME',
        message: 'A valid customer name between 2 and 80 characters is required (no HTML tags).',
      });
      return;
    }

    const rawCustomerPhone = String(body.customerPhone || body.customer?.phone || '').trim();
    const cleanedPhone = rawCustomerPhone.replace(/[\s\-\(\)\.]/g, '');
    const phoneMatch = cleanedPhone.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
    if (!phoneMatch) {
      sendJson(res, 400, {
        success: false,
        error: 'INVALID_PHONE_NUMBER',
        code: 'INVALID_PHONE_NUMBER',
        message: 'A valid 10-digit Indian mobile number starting with 6-9 is required (e.g. +91 98765 43210).',
      });
      return;
    }
    const formattedPhone = `+91 ${phoneMatch[1].slice(0, 5)} ${phoneMatch[1].slice(5)}`;
    const maskedPhone = `+91 ******${phoneMatch[1].slice(6)}`;

    const fulfillmentMethod = body.fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery';
    const rawAddress = String(body.deliveryAddress || body.customer?.address || '').trim();
    if (fulfillmentMethod === 'delivery' && (!rawAddress || rawAddress.length < 5 || rawAddress.length > 250)) {
      sendJson(res, 400, {
        success: false,
        error: 'INVALID_DELIVERY_ADDRESS',
        code: 'INVALID_DELIVERY_ADDRESS',
        message: 'A valid delivery street address of at least 5 characters is required for delivery orders.',
      });
      return;
    }
    const deliveryAddress = fulfillmentMethod === 'pickup' ? 'Pick-up Counter' : rawAddress;
    const customerNotes = typeof body.customerNotes === 'string'
      ? body.customerNotes.trim().slice(0, 200)
      : (body.notes ? String(body.notes).trim().slice(0, 200) : '');

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      sendJson(res, 400, { success: false, error: 'EMPTY_CART', code: 'EMPTY_CART', message: 'Order must contain at least one item.' });
      return;
    }

    // 3. Validate Items & Availability against Branch-Resolved Menu
    const resolvedMenu = await repo.getResolvedMenuForBranch(targetBranch.id);
    let subtotalMinor = 0;
    const validatedOrderItems: Array<{
      id: string;
      name: string;
      quantity: number;
      priceMinor: number;
      station: string;
    }> = [];

    for (const item of items) {
      const resolvedItem = resolvedMenu.find((m) => m.id === item.id);
      if (!resolvedItem) {
        sendJson(res, 400, {
          success: false,
          error: 'INVALID_MENU_ITEM',
          code: 'INVALID_MENU_ITEM',
          message: `Menu item '${item.id}' was not found in catalog for branch ${targetBranch.name}.`,
          invalidItemId: item.id,
        });
        return;
      }
      if (!resolvedItem.isAvailableAtBranch) {
        sendJson(res, 400, {
          success: false,
          error: 'ITEM_UNAVAILABLE_AT_BRANCH',
          code: 'ITEM_UNAVAILABLE_AT_BRANCH',
          message: `${resolvedItem.name} is currently 86'd / unavailable at ${targetBranch.name}.`,
          unavailableItemId: item.id,
        });
        return;
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      let unitPrice = resolvedItem.effectivePriceMinor;
      if (item.selectedModifierIds && Array.isArray(item.selectedModifierIds) && resolvedItem.modifierGroups) {
        for (const modId of item.selectedModifierIds) {
          for (const grp of resolvedItem.modifierGroups) {
            const opt = grp.options.find((o) => o.id === modId);
            if (opt) {
              unitPrice += opt.priceDeltaMinor;
            }
          }
        }
      }
      subtotalMinor += qty * unitPrice;
      validatedOrderItems.push({
        id: resolvedItem.id,
        name: resolvedItem.name,
        quantity: qty,
        priceMinor: unitPrice,
        station: resolvedItem.station || 'CURRY_LINE',
      });
    }

    // 4. Authoritative Quote Calculation
    const deliveryFeeMinor = fulfillmentMethod === 'pickup' ? 0 : 4000;
    const taxMinor = Math.round(subtotalMinor * 0.05);
    const totalMinor = subtotalMinor + deliveryFeeMinor + taxMinor;
    const orderId = 'ord_mkt_' + crypto.randomUUID().slice(0, 8);
    const orderToken = 'ordtok_' + crypto.randomBytes(24).toString('hex');
    const tableNum = body.tableNumber || (fulfillmentMethod === 'pickup' ? 'Takeaway' : 'Delivery');

    const orderPayload = {
      success: true,
      orderId,
      orderToken,
      status: 'CONFIRMED',
      statusLabel: 'Order Confirmed & Sent to Kitchen',
      branchId: targetBranch.id,
      branchName: targetBranch.name,
      fulfillmentMethod,
      restaurantId: tenantContext.tenantId,
      quote: {
        subtotalMinor,
        taxMinor,
        deliveryFeeMinor,
        totalMinor,
        currency: 'INR',
        formattedTotal: `₹${(totalMinor / 100).toFixed(2)}`,
      },
      items: validatedOrderItems,
      customer: {
        name: rawCustomerName,
        phone: formattedPhone,
        address: deliveryAddress,
        notes: customerNotes || undefined,
      },
      createdAt: new Date().toISOString(),
    };

    if (idempotencyKey) {
      await repo.saveIdempotencyRecord(idempotencyKey, { payloadHash, response: orderPayload });
    }
    await repo.saveIdempotencyRecord(orderId, { payloadHash, response: orderPayload });

    // 5. Create and Persist Restaurant Order in Domain Store with Correct Branch Scoping
    const restaurantOrder: RestaurantOrder = {
      orderId,
      branchId: targetBranch.id,
      tableNumber: tableNum,
      sessionId: body.sessionId || `sess_${orderId}`,
      guestName: rawCustomerName,
      status: 'CONFIRMED',
      orderToken,
      items: validatedOrderItems.map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity,
        unitPriceMinor: it.priceMinor,
        station: it.station,
      })),
      subtotalMinor,
      taxMinor,
      totalMinor,
      currency: 'INR',
      customer: orderPayload.customer,
      createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
    await repo.addOrder(restaurantOrder);

    // 6. Spawn Kitchen Tasks for each item routed to target branch KDS stations
    for (const it of restaurantOrder.items) {
      const resolvedItem = resolvedMenu.find((m) => m.id === it.id);
      const task: KitchenTask = {
        id: 'task_' + crypto.randomUUID().slice(0, 8),
        orderId,
        tableNumber: tableNum,
        branchId: targetBranch.id,
        guestName: restaurantOrder.guestName,
        itemName: it.name,
        quantity: it.quantity,
        station: (resolvedItem?.station as any) || 'CURRY_LINE',
        status: 'QUEUED',
        fireAt: new Date().toISOString(),
        targetServeAt: new Date(Date.now() + 20 * 60000).toISOString(),
        elapsedMinutes: 0,
        slaMinutes: resolvedItem?.prepDurationMinutes || 18,
        modifiers: [],
      };
      await repo.addKitchenTask(task);
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: (await repo.getEvents()).length,
        type: 'task.created',
        timestamp: new Date().toISOString(),
        producer: orderId,
        branchId: targetBranch.id,
        tableNumber: tableNum,
        tenantId: tenantContext.tenantId,
        payload: { orderId, task },
      });
    }

    await repo.appendEvent(
      'COMMERCE_ORDER_CREATED',
      orderId,
      targetBranch.id,
      orderPayload
    );
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: (await repo.getEvents()).length,
      type: 'order.created',
      timestamp: new Date().toISOString(),
      producer: orderId,
      branchId: targetBranch.id,
      tenantId: tenantContext.tenantId,
      tableNumber: tableNum,
      payload: orderPayload,
    });

    sendJson(res, 201, orderPayload);
    return;
  }

  if (pathname === '/api/commerce/grocery/orders' && method === 'POST') {
    const body = await parseBody(req);
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || body.idempotencyKey;
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    const cached = idempotencyKey ? await repo.getIdempotencyRecord(idempotencyKey) : null;
    if (cached) {
      if (cached.payloadHash && cached.payloadHash !== payloadHash) {
        sendJson(res, 409, {
          success: false,
          error: 'IDEMPOTENCY_CONFLICT',
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'A grocery order was already processed with this idempotency key using different contents.',
        });
        return;
      }
      const replayData = cached.response || cached;
      sendJson(res, 200, { ...replayData, idempotentReplay: true });
      return;
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      sendJson(res, 400, { success: false, error: 'EMPTY_BASKET', message: 'Grocery basket cannot be empty.' });
      return;
    }

    // 1. Authoritative Inventory Stock Verification
    let subtotalMinor = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const sku = await repo.getGrocerySkuById(item.skuId);
      if (!sku) {
        sendJson(res, 404, { success: false, error: 'SKU_NOT_FOUND', message: `Product SKU ${item.skuId} was not found in catalog.` });
        return;
      }
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const stockAvailable = typeof sku.stockQuantity === 'number' ? sku.stockQuantity : (sku.stockOnHand || 0);
      if (stockAvailable < qty) {
        sendJson(res, 400, {
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `${sku.name} only has ${stockAvailable} units available in local dark store inventory. Requested: ${qty}`,
          availableStock: stockAvailable,
          skuId: item.skuId,
        });
        return;
      }
      subtotalMinor += qty * sku.sellingPriceMinor;
      orderItems.push({
        skuId: sku.id,
        name: sku.name,
        brand: sku.brand,
        packSize: sku.packSize,
        quantity: qty,
        unitPriceMinor: sku.sellingPriceMinor,
        totalPriceMinor: qty * sku.sellingPriceMinor,
      });
    }

    // 2. Authoritative Atomic Stock Transaction (all-or-nothing rollback guard)
    const stockTx = await repo.transactGroceryStock(orderItems.map((it) => ({ skuId: it.skuId, quantity: it.quantity })));
    if (!stockTx.success) {
      sendJson(res, 400, {
        success: false,
        error: 'INSUFFICIENT_STOCK',
        message: stockTx.error || 'Insufficient stock for requested grocery items.',
        availableStock: stockTx.availableStock,
        skuId: stockTx.insufficientSkuId,
      });
      return;
    }

    // 3. Server Quote Calculation
    const deliveryFeeMinor = subtotalMinor >= 29900 ? 0 : 2500;
    const packagingMinor = 1000;
    const taxMinor = Math.round(subtotalMinor * 0.05);
    const totalMinor = subtotalMinor + deliveryFeeMinor + packagingMinor + taxMinor;
    const orderId = 'ord_gro_' + crypto.randomUUID().slice(0, 8);

    const groceryOrderPayload = {
      success: true,
      orderId,
      status: 'packed',
      estimatedDeliveryMinutes: 15,
      substitutionPreference: body.substitutionPreference || 'ask_customer',
      quote: {
        subtotalMinor,
        taxMinor,
        deliveryFeeMinor,
        packagingMinor,
        totalMinor,
        currency: 'INR',
        formattedTotal: `₹${(totalMinor / 100).toFixed(2)}`,
      },
      items: orderItems,
      dispatchStation: {
        darkStoreId: 'ds_central_ludhiana',
        pincode: body.pincode || '141001',
        dispatchedAt: new Date().toISOString(),
      },
      customer: {
        phone: body.customerPhone || '+91 98765 43210',
        address: body.deliveryAddress || 'Sector 32, Urban Estate, Ludhiana',
      },
      createdAt: new Date().toISOString(),
    };

    if (idempotencyKey) {
      await repo.saveIdempotencyRecord(idempotencyKey, { payloadHash, response: groceryOrderPayload });
    }

    await repo.appendEvent(
      'GROCERY_ORDER_PLACED',
      orderId,
      currentBranch.id,
      groceryOrderPayload
    );

    sendJson(res, 201, groceryOrderPayload);
    return;
  }

  // ==========================================
  // RUNTIME PRODUCT USER INTERFACES (PORT 4010)
  // ==========================================

  // --- APPROVED ROUTE REDIRECTS (MILESTONE 1) ---
  if (pathname === '/crave-atlas' || pathname === '/crave-atlas/') {
    const search = parsedUrl.search || '';
    res.writeHead(302, { Location: `/apps/crave-atlas${search}` });
    res.end();
    return;
  }
  if (pathname === '/swift-bite' || pathname === '/swift-bite/') {
    const search = parsedUrl.search || '';
    res.writeHead(302, { Location: `/apps/swift-bite${search}` });
    res.end();
    return;
  }
  if (pathname === '/pantry-rush' || pathname === '/pantry-rush/') {
    const search = parsedUrl.search || '';
    res.writeHead(302, { Location: `/apps/pantry-rush${search}` });
    res.end();
    return;
  }
  if (pathname === '/locations' || pathname === '/locations/') {
    const search = parsedUrl.search || '';
    res.writeHead(302, { Location: `/operations/locations${search}` });
    res.end();
    return;
  }

  // --- 1. OPERATIONS HOME (/) ---
  if (pathname === '/' || pathname === '/overview') {
    const branchTables = await repo.getTables(currentBranch.id);
    const branchTasks = await repo.getKitchenTasks(undefined, currentBranch.id);
    const branchRequests = await repo.getServiceRequests(currentBranch.id);
    const branchOrders = await repo.getOrders(undefined, undefined, currentBranch.id);
    const branchEvents = await repo.getEvents(0, currentBranch.id);
    const tenantBrand = await repo.getTenantBrand();

    const html = renderShell(
      renderOperationsHome(
        branchTables,
        branchTasks,
        branchRequests,
        currentBranch.name,
        serviceShift,
        branchOrders,
        branchEvents
      ),
      {
        title: 'Operations Command',
        activeNav: 'overview',
        restaurantName: tenantBrand.restaurantName || 'OrbitoX Bistro',
        currentBranchId: currentBranch.id,
        currentFloorId: currentFloor.id,
        currentServiceShift: serviceShift,
        branches,
        floors,
        staffRole: activeStaffRole,
      }
    );
    sendHtml(res, html);
    return;
  }

  // --- 2. SPATIAL FLOOR STUDIO (/operations or /operations/floor) ---
  if (pathname === '/operations' || pathname === '/operations/floor') {
    const selectedTableId = parsedUrl.query.table ? parseInt(parsedUrl.query.table as string, 10) : undefined;
    const allTables = await repo.getTables(currentBranch.id);
    const allOrders = await repo.getOrders(undefined, undefined, currentBranch.id);
    const tenantBrand = await repo.getTenantBrand();

    const html = renderShell(
      renderFloorStudio(allTables, selectedTableId, currentFloor.id, currentBranch.id, floors, allOrders),
      {
        title: 'Spatial Floor Studio',
        activeNav: 'floor',
        restaurantName: tenantBrand.restaurantName || 'OrbitoX Bistro',
        currentBranchId: currentBranch.id,
        currentFloorId: currentFloor.id,
        currentServiceShift: serviceShift,
        branches,
        floors,
        staffRole: activeStaffRole,
      }
    );
    sendHtml(res, html);
    return;
  }

  // --- 3. TABLES WORKSPACE (/operations/tables) ---
  if (pathname === '/operations/tables') {
    const section = (parsedUrl.query.section as string) || 'ALL';
    const tables = await repo.getTables(currentBranch.id);
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(renderTablesList(tables, currentBranch.id, section), {
      title: 'Tables Fleet',
      activeNav: 'tables',
      restaurantName: tenantBrand.restaurantName || 'OrbitoX Bistro',
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 3b. TABLE PRINTABLE QR STAND (/operations/tables/:id/qr-stand) ---
  if (
    pathname.startsWith('/operations/tables/') &&
    pathname.endsWith('/qr-stand') &&
    method === 'GET'
  ) {
    const tableId = pathname.replace('/operations/tables/', '').replace('/qr-stand', '');
    const table = (await repo.getTable(tableId)) || (await repo.getTableByNumber(tableId));
    if (!table) {
      sendJson(res, 404, {
        error: 'TABLE_NOT_FOUND',
        message: `Table "${tableId}" does not exist in this restaurant.`,
      });
      return;
    }
    const tenantBrand = await repo.getTenantBrand();
    const branchName = currentBranch?.name || 'Main Dining';
    const html = renderTableQrStand(table, tenantBrand, branchName);
    sendHtml(res, html);
    return;
  }

  // --- 4. ORDERS WORKSPACE (/operations/orders & /orders) ---
  if (pathname === '/operations/orders' || pathname === '/orders') {
    const branchOrders = await repo.getOrders(undefined, undefined, currentBranch.id);
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(renderOrdersWorkspace(branchOrders, branches, currentBranch.id), {
      title: 'Service Orders',
      activeNav: 'orders',
      restaurantName: tenantBrand.restaurantName,
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 5. HIGH-DENSITY KITCHEN DISPLAY SYSTEM (/kds) ---
  if (pathname === '/kds') {
    const activeStation = ((parsedUrl.query.station || parsedUrl.query.stationId || 'ALL') as string).toUpperCase();
    
    // Only pass validated staff identity if requester is authenticated and has kitchen access
    const isKitchenAuthorized =
      Boolean(activeStaffToken) &&
      (requestIdentity.type === 'STATION' ||
       requestIdentity.role === 'CHEF' ||
       requestIdentity.role === 'EXPO' ||
       requestIdentity.role === 'OPERATIONS' ||
       requestIdentity.role === 'MANAGER' ||
       requestIdentity.role === 'ADMIN');

    const kdsRole = isKitchenAuthorized ? (requestIdentity.role || 'CHEF') : undefined;

    const branchTasks = await repo.getKitchenTasks(undefined, currentBranch.id);
    const lastSeq = await repo.getLastEventSequence();
    const tenantBrand = await repo.getTenantBrand();
    const html = renderKdsWorkspace(
      branchTasks,
      activeStation,
      currentBranch.name,
      serviceShift,
      undefined,
      lastSeq,
      currentBranch.id,
      kdsRole,
      isKitchenAuthorized,
      tenantBrand?.restaurantName
    );
    sendHtml(res, html);
    return;
  }

  // --- 6. MENU CATALOG WORKSPACE (/menu) ---
  if (pathname === '/menu') {
    const branchOverrides = await repo.getBranchMenuOverrides();
    const categories = await repo.getCategories(true);
    const menuItems = await repo.getMenuItems(true);
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(renderMenuWorkspace(menuItems, branches, currentBranch.id, branchOverrides, categories), {
      title: 'Menu Catalog',
      activeNav: 'menu',
      restaurantName: tenantBrand.restaurantName,
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 7. GUESTS WORKSPACE (/guests) ---
  if (pathname === '/guests') {
    const branchTables = await repo.getTables(currentBranch.id);
    const guests = await repo.getGuests();
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(renderGuestsWorkspace(branchTables, currentBranch.id, guests), {
      title: 'Active Guests',
      activeNav: 'guests',
      restaurantName: tenantBrand.restaurantName || 'OrbitoX Bistro',
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 8. LOCATIONS WORKSPACE (/operations/locations) ---
  if (pathname === '/operations/locations') {
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(renderLocationsWorkspace(branches, currentBranch.id), {
      title: 'Locations & Branches',
      activeNav: 'locations',
      restaurantName: tenantBrand.restaurantName || 'OrbitoX Bistro',
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 9. FLOORS WORKSPACE (/operations/floors) ---
  if (pathname === '/operations/floors') {
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(renderFloorsWorkspace(floors, currentBranch), {
      title: 'Floor Plans & Layouts',
      activeNav: 'floors',
      restaurantName: tenantBrand.restaurantName || 'OrbitoX Bistro',
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 10. SERVICE REPORTS WORKSPACE (/reports) ---
  if (pathname === '/reports') {
    const orders = await repo.getOrders(undefined, undefined, currentBranch.id);
    const tasks = await repo.getKitchenTasks(undefined, currentBranch.id);
    const tables = await repo.getTables(currentBranch.id);
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(renderReportsWorkspace(orders, tasks, tables), {
      title: 'Service Analytics',
      activeNav: 'reports',
      restaurantName: tenantBrand.restaurantName || 'OrbitoX Bistro',
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 10b. STAFF & SECURITY WORKSPACE (/staff, /operations/staff) ---
  if (pathname === '/staff' || pathname === '/operations/staff') {
    const tenantBrand = await repo.getTenantBrand();
    const staffMembers = await repo.getStaffMembers();
    const html = renderShell(renderStaffWorkspace(branches, currentBranch.id, staffMembers), {
      title: 'Staff Directory & RBAC Security',
      activeNav: 'staff',
      restaurantName: tenantBrand.restaurantName,
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 11. DINER MOBILE PWA (/dine/:locator) ---
  if (pathname.startsWith('/dine/')) {
    const locator = pathname.split('/')[2];
    if (!locator) {
      sendJson(res, 404, { error: 'NOT_FOUND', message: 'Table locator required' });
      return;
    }
    const currentTable = await repo.getTableByLocator(locator);
    if (!currentTable) {
      sendHtml(res, renderTenantNotFoundPage(`Table locator "${locator}"`), 404);
      return;
    }
    const allOrders = await repo.getOrders();
    const tableOrders = currentTable.activeSessionId
      ? allOrders.filter((o) => o.tableNumber === currentTable.number && o.sessionId === currentTable.activeSessionId)
      : [];
    const allTasks = await repo.getKitchenTasks();
    const tableTasks = currentTable.activeSessionId
      ? allTasks.filter((t) => t.tableNumber === currentTable.number && tableOrders.some((o) => o.orderId === t.orderId))
      : [];
    const tableBranch = await repo.getBranch(currentTable.branchId);
    const branchName = tableBranch ? tableBranch.name : currentBranch.name;
    const tenantBrand = await repo.getTenantBrand();
    const queryTmplId = (parsedUrl.query.templateId || parsedUrl.query.template) as string | undefined;
    const activeTemplate = (queryTmplId ? await repo.getTemplateById(queryTmplId) : undefined) || (tenantBrand?.activeTemplateId ? await repo.getTemplateById(tenantBrand.activeTemplateId) : undefined);
    const effectiveBrand = queryTmplId && activeTemplate ? { ...tenantBrand, activeTemplateId: activeTemplate.id } : tenantBrand;
    const menuItems = await repo.getMenuItems();
    const html = renderDinerPwa(currentTable, menuItems, branchName, tableOrders, tableTasks, effectiveBrand, activeTemplate);
    sendHtml(res, html);
    return;
  }

  // --- 12. TEMPLATE MARKETPLACE (/marketplace) ---
  if (pathname === '/marketplace') {
    const templates = await repo.getTemplates();
    const tenantBrand = await repo.getTenantBrand();
    const menuItems = await repo.getMenuItems();
    const html = renderMarketplaceWorkspace(
      templates,
      tenantBrand,
      menuItems,
      currentBranch.id,
      branches
    );
    sendHtml(res, html);
    return;
  }

  // --- 12a. CRAVEATLAS SINGLE-BRAND RESTAURANT WEBSITE (/apps/crave-atlas) ---
  if (pathname === '/apps/crave-atlas') {
    const branchParam = parsedUrl.query.branch as string | undefined;
    const targetBranch = branchParam ? ((await repo.getBranch(branchParam)) || currentBranch) : currentBranch;
    const resolvedMenu = await repo.getResolvedMenuForBranch(targetBranch.id);
    const tenantBrand = await repo.getTenantBrand();
    const html = renderCraveAtlasPage(branches, targetBranch, resolvedMenu, tenantBrand);
    sendHtml(res, html);
    return;
  }

  // --- 12b. SWIFTBITE SPEED-FIRST FOOD ORDERING (/apps/swift-bite) ---
  if (pathname === '/apps/swift-bite') {
    const branchParam = parsedUrl.query.branch as string | undefined;
    const targetBranch = branchParam ? ((await repo.getBranch(branchParam)) || currentBranch) : currentBranch;
    const resolvedMenu = await repo.getResolvedMenuForBranch(targetBranch.id);
    const tenantBrand = await repo.getTenantBrand();
    const tableNumber = (parsedUrl.query.table || '1') as string;
    const orders = await repo.getOrders();
    const html = renderSwiftBitePage(branches, targetBranch, resolvedMenu, tenantBrand, tableNumber, orders);
    sendHtml(res, html);
    return;
  }

  // --- 12c. PANTRYRUSH QUICK-COMMERCE GROCERY (/apps/pantry-rush) ---
  if (pathname === '/apps/pantry-rush') {
    const branchParam = parsedUrl.query.branch as string | undefined;
    const targetBranch = branchParam ? ((await repo.getBranch(branchParam)) || currentBranch) : currentBranch;
    const skus = await repo.getGrocerySkus();
    const tenantBrand = await repo.getTenantBrand();
    const pincode = (parsedUrl.query.pincode || '141001') as string;
    const html = renderPantryRushPage(skus, tenantBrand, branches, targetBranch, pincode);
    sendHtml(res, html);
    return;
  }

  // --- 13. VISUAL BRAND STUDIO & EDITOR (/studio) ---
  if (pathname === '/studio') {
    const activeBrand = await repo.getTenantBrand();
    const activeTemplate = (activeBrand?.activeTemplateId ? await repo.getTemplateById(activeBrand.activeTemplateId) : undefined) || (await repo.getTemplates())[0];
    const draft = await repo.getTemplateDraft();
    const menuItems = await repo.getMenuItems();
    const html = renderVisualStudio(
      activeTemplate,
      draft,
      activeBrand,
      menuItems,
      currentBranch.id
    );
    sendHtml(res, html);
    return;
  }

  // --- 14. WHITE-LABEL & DOMAINS (/white-label & /whitelabel) ---
  if (pathname === '/white-label' || pathname === '/whitelabel') {
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(
      renderWhiteLabelWorkspace(tenantBrand, branches, currentBranch.id),
      {
        title: 'White-Label & Domains',
        activeNav: 'whitelabel',
        restaurantName: tenantBrand.restaurantName,
        currentBranchId: currentBranch.id,
        currentFloorId: currentFloor.id,
        currentServiceShift: serviceShift,
        branches,
        floors,
        staffRole: activeStaffRole,
      }
    );
    sendHtml(res, html);
    return;
  }

  // --- 15. STAFF DIRECTORY & SECURITY (/staff) ---
  if (pathname === '/staff') {
    const tenantBrand = await repo.getTenantBrand();
    const staffMembers = await repo.getStaffMembers();
    const html = renderShell(
      renderStaffWorkspace(branches, currentBranch.id, staffMembers),
      {
        title: 'Staff Directory & RBAC Security',
        activeNav: 'staff',
        restaurantName: tenantBrand.restaurantName,
        currentBranchId: currentBranch.id,
        currentFloorId: currentFloor.id,
        currentServiceShift: serviceShift,
        branches,
        floors,
        staffRole: activeStaffRole,
      }
    );
    sendHtml(res, html);
    return;
  }

  // --- 16. CUSTOMER SUPPORT DESK (/support) ---
  if (pathname === '/support') {
    const tickets = await repo.getSupportTickets();
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(
      renderSupportWorkspace(tickets, branches, currentBranch.id),
      {
        title: 'Customer Support Desk',
        activeNav: 'support',
        restaurantName: tenantBrand.restaurantName,
        currentBranchId: currentBranch.id,
        currentFloorId: currentFloor.id,
        currentServiceShift: serviceShift,
        branches,
        floors,
        staffRole: activeStaffRole,
      }
    );
    sendHtml(res, html);
    return;
  }

  // --- 16b. OWNER ONBOARDING WORKSPACE (/operations/onboarding & /onboarding) ---
  if (pathname === '/operations/onboarding' || pathname === '/onboarding') {
    const onboardingState = await ownerSelfService.getOnboardingState(tenantContext.tenantId);
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(
      renderOnboardingWorkspace(onboardingState, tenantBrand, currentBranch?.name),
      {
        title: 'Owner Onboarding',
        activeNav: 'onboarding',
        restaurantName: tenantBrand.restaurantName,
        currentBranchId: currentBranch.id,
        currentFloorId: currentFloor.id,
        currentServiceShift: serviceShift,
        branches,
        floors,
        staffRole: activeStaffRole,
      }
    );
    sendHtml(res, html);
    return;
  }

  // --- 11b. TEMPLATE COMPOSITION INSPECTOR (/developer/templates) ---
  if (pathname === '/developer/templates') {
    const tenantBrand = await repo.getTenantBrand();
    const selected = (parsedUrl.query.selected as string) || tenantBrand.activeTemplateId || 'tmpl_haute_gastronomy';
    const compare = (parsedUrl.query.compare as string) || 'tmpl_artisan_coffee';
    const templates = await repo.getTemplates();
    const menuItems = await repo.getMenuItems();
    const html = renderShell(
      renderTemplateCompositionInspector(templates, selected, compare, menuItems),
      {
        title: 'Template Composition Inspector',
        activeNav: 'marketplace',
        restaurantName: tenantBrand.restaurantName,
        currentBranchId: currentBranch.id,
        currentFloorId: currentFloor.id,
        currentServiceShift: serviceShift,
        branches,
        floors,
        staffRole: activeStaffRole,
      }
    );
    sendHtml(res, html);
    return;
  }

  // --- 12. DEVELOPER RUNTIME INSPECTOR (/developer/inspector) ---
  if (pathname === '/developer/inspector') {
    const rawData = await repo.getRawData();
    const tenantBrand = await repo.getTenantBrand();
    const html = renderShell(renderDeveloperInspector(context, rawData), {
      title: 'Runtime Inspector',
      activeNav: 'overview',
      restaurantName: tenantBrand.restaurantName || 'OrbitoX Bistro',
      currentBranchId: currentBranch.id,
      currentFloorId: currentFloor.id,
      currentServiceShift: serviceShift,
      branches,
      floors,
      staffRole: activeStaffRole,
    });
    sendHtml(res, html);
    return;
  }

  // --- 13. DEVELOPER & DIAGNOSTICS (/developer/diagnostics) ---
  if (pathname === '/developer/diagnostics') {
    const config = runtimeController.getActiveConfig();
    const revisions = await repo.getRevisions();
    const events = await repo.getEvents();
    const storageEngine = process.env.STORAGE_DRIVER === 'postgres'
      ? 'PostgreSQL 16 with Row-Level Security (RLS) (Non-superuser role: restaurantos_app)'
      : 'Atomic File-Backed JSON (data/restaurant-runtime-store.json)';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Developer Diagnostics · RestaurantOS (Port 4010)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0A0D10; color: #FFFFFF; font-family: monospace; padding: 32px; }
    h1 { font-size: 20px; font-weight: 900; margin-bottom: 20px; color: #10B981; }
    .panel { background: #13171F; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; margin-bottom: 20px; line-height: 1.6; font-size: 13px; }
    .key { color: #818CF8; font-weight: 800; }
    .val { color: #F8FAFC; }
    pre { background: #070912; padding: 16px; border-radius: 8px; overflow-x: auto; color: #A3AED0; margin-top: 12px; }
    a { color: #C86B3C; text-decoration: none; font-weight: 800; }
  </style>
</head>
<body>
  <h1>🛰️ RestaurantOS Developer Diagnostics</h1>
  <div style="margin-bottom: 20px; display: flex; gap: 12px;">
    <a href="/">← Operations Home</a>
    <a href="/developer/inspector">Live Runtime Inspector 🛰️</a>
    <a href="http://localhost:3005/admin/projects/project_restaurant_os" target="_blank">Open in OrbitoX Control Plane ↗</a>
  </div>

  <div class="panel">
    <div><span class="key">RUNTIME_PORT:</span> <span class="val">4010</span></div>
    <div><span class="key">PROCESS_PID:</span> <span class="val">${process.pid}</span></div>
    <div><span class="key">STORAGE_ENGINE:</span> <span class="val">${storageEngine}</span></div>
    <div><span class="key">STORAGE_REVISION:</span> <span class="val">${revisions}</span></div>
    <div><span class="key">OUTBOX_EVENTS:</span> <span class="val">${events.length}</span></div>
    <div><span class="key">SSE_CLIENTS_CONNECTED:</span> <span class="val">${eventBus.getConnectedClientsCount()}</span></div>
    <div><span class="key">PROCESS_UPTIME:</span> <span class="val">${Math.floor(process.uptime())}s</span></div>
    <div><span class="key">MEMORY_HEAP_MB:</span> <span class="val">${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB</span></div>
    <div><span class="key">CONTROL_PLANE_URL:</span> <span class="val">${runtimeController.manifest.platformController.controlPlaneUrl}</span></div>
    <div><span class="key">CONTROL_SESSION_ID:</span> <span class="val">${runtimeController.client.getSessionId() || 'ACTIVE'}</span></div>
    <div><span class="key">DESIRED_REVISION:</span> <span class="val">${runtimeController.getDesiredRevision()}</span></div>
    <div><span class="key">APPLIED_REVISION:</span> <span class="val">${runtimeController.getAppliedRevision()}</span></div>
    <div><span class="key">LAST_SYNC:</span> <span class="val">${runtimeController.getLastSyncTime()}</span></div>
  </div>

  <div class="panel">
    <div style="font-size: 14px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px;">Active Signed Desired-State Configuration</div>
    <pre>${JSON.stringify(config, null, 2)}</pre>
  </div>
</body>
</html>`;
    sendHtml(res, html);
    return;
  }

  // 404
  sendJson(res, 404, { error: `Route not found: ${pathname}` });
  });
}

export const server = http.createServer(handleRequest);

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DANGEROUS_RESET === 'true') {
  console.error('🚨 [SECURITY FATAL] Dangerous reset flags cannot be enabled in production mode! Halting startup.');
  process.exit(1);
}

if (process.env.RESTAURANTOS_DISABLE_AUTOLISTEN !== 'true') {
server.listen(PORT, async () => {
  if (postgresStore?.prisma) {
    try {
      console.log('🔒 Executing Database Security Self-Check (RLS & non-superuser role enforcement)...');
      const checkResult = await runDatabaseSecuritySelfCheck(postgresStore.prisma, {
        isProduction: process.env.NODE_ENV === 'production',
      });
      if (!checkResult.ok && process.env.NODE_ENV === 'production') {
        console.error('🚨 [DATABASE SECURITY FAILED] RLS self-check failed in production! Halting startup.', checkResult.errors);
        process.exit(1);
      }
    } catch (checkErr: any) {
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 [DATABASE SECURITY FATAL] Error running security self-check:', checkErr.message);
        process.exit(1);
      } else {
        console.warn('⚠️ [Storage] Database security self-check deferred in non-prod:', checkErr.message);
      }
    }
  }

  console.log(`\n🍷 =========================================================`);
  console.log(`🍷  RestaurantOS 2.x (Hospitality Runtime Plane) Active`);
  console.log(`🍷  Operations Command: http://localhost:${PORT}/`);
  console.log(`🍷  Spatial Floor Studio: http://localhost:${PORT}/operations/floor`);
  console.log(`🍷  Tables Fleet: http://localhost:${PORT}/operations/tables`);
  console.log(`🍷  Branches Management: http://localhost:${PORT}/operations/locations`);
  console.log(`🍷  Floor Plans: http://localhost:${PORT}/operations/floors`);
  console.log(`🍷  Kitchen KDS: http://localhost:${PORT}/kds`);
  console.log(`🍷  Diner Mobile PWA: http://localhost:${PORT}/dine/7Kp9xQ8m2L`);
  console.log(`🍷  Developer Inspector: http://localhost:${PORT}/developer/inspector`);
  console.log(`🍷  Realtime SSE Gateway: http://localhost:${PORT}/api/restaurant/events`);
  console.log(`🍷 =========================================================\n`);

  await runtimeController.start();
});
}

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
  REGISTERED_STATION_SECRETS,
  DEV_TEST_STAFF_TOKENS,
  DEV_TEST_STATION_TOKENS,
  validateAndSanitizeCustomCss,
  validateOrGenerateRequestId,
  logger,
  eventLoopMonitor,
} from '../packages/domain';
import { RestaurantRuntimeStore, DomainEvent } from '../packages/storage';
import { RealtimeEventBus } from '../packages/domain/event-bus';
import { RestaurantRuntimeController } from '../packages/runtime';
import {
  renderShell,
  renderOperationsHome,
  renderFloorStudio,
  renderKdsWorkspace,
  renderDinerPwa,
  renderTablesList,
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
} from '../packages/ui';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4010;
const store = new RestaurantRuntimeStore();
const eventBus = new RealtimeEventBus();
const runtimeController = new RestaurantRuntimeController();

// Startup security signing secret verification
try {
  getStaffAuthSecret();
} catch (startupErr: any) {
  console.error('🚨 [SERVER FATAL STARTUP]', startupErr.message);
  process.exit(1);
}

// Automatically broadcast all domain events emitted by the authoritative store
store.onEvent((event) => {
  eventBus.broadcast(event);
});

const idempotencyRecords = new Map<string, any>();
const orderTokens = new Map<string, string>();
const activeSettlementLocks = new Set<string>();
const activeDispatchLocks = new Set<string>();

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-idempotency-key, x-session-id, x-order-token, x-request-id, x-correlation-id',
    'Access-Control-Expose-Headers': 'x-request-id',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}

function sendHtml(res: http.ServerResponse, html: string) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
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
  const origin = (req.headers['origin'] as string) || '';
  const host = (req.headers['host'] as string) || '';
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      return parsedOrigin.host.toLowerCase() === host.toLowerCase();
    } catch {
      return false;
    }
  }
  const referer = (req.headers['referer'] as string) || '';
  if (referer) {
    try {
      const parsedReferer = new URL(referer);
      return parsedReferer.host.toLowerCase() === host.toLowerCase();
    } catch {
      return false;
    }
  }
  const secFetchSite = (req.headers['sec-fetch-site'] as string) || '';
  if (secFetchSite === 'cross-site') {
    return false;
  }
  return true;
}

function resolveRequestIdentity(req: http.IncomingMessage): RequestIdentity {
  const authHeader = (req.headers['authorization'] as string) || '';
  const stationToken = (req.headers['x-station-token'] as string) || '';
  const parsedUrl = url.parse(req.url || '', true);
  const queryToken = (parsedUrl.query.token as string) || (parsedUrl.query.access_token as string) || (parsedUrl.query.staffToken as string) || '';

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
  } else if (queryToken) {
    token = queryToken;
    authSource = 'BEARER';
  } else if (cookieToken) {
    token = cookieToken;
    authSource = 'COOKIE';
  }

  const resolve = (): RequestIdentity => {

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
      const isValid = store.isCapabilityValid(token);
      if (!isValid) {
        return {
          type: 'REVOKED_CAPABILITY',
          id: token,
          isPrivileged: false,
        };
      }
      const session = store.getSessions().find(
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
      const verification = verifyStaffToken(token);
      if (!verification.valid) {
        return {
          type: 'INVALID_CREDENTIAL',
          id: token,
          isPrivileged: false,
          error: verification.error,
        };
      }
      const claims = verification.claims!;
      const isPriv = claims.role === 'MANAGER' || claims.role === 'ADMIN' || claims.role === 'POS';
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
        type: claims.role === 'MANAGER' || claims.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
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
      for (const [oId, t] of orderTokens.entries()) {
        if (t === token) {
          return {
            type: 'ORDER_TRACKER',
            id: token,
            orderId: oId,
            isPrivileged: false,
          };
        }
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
    for (const [oId, t] of orderTokens.entries()) {
      if (t === orderTokenQuery) {
        return {
          type: 'ORDER_TRACKER',
          id: orderTokenQuery,
          orderId: oId,
          isPrivileged: false,
        };
      }
    }
  }

    return {
      type: 'ANONYMOUS',
      id: 'anon:guest',
      isPrivileged: false,
    };
  };

  const identity = resolve();
  identity.authSource = authSource;
  return identity;
}

const server = http.createServer(async (req, res) => {
  const startHrTime = process.hrtime.bigint();
  const rawReqId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = validateOrGenerateRequestId(rawReqId);
  res.setHeader('x-request-id', requestId);

  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';
  const method = req.method || 'GET';

  if (pathname === '/favicon.ico') {
    res.writeHead(204, { 'Content-Type': 'image/x-icon' });
    res.end();
    return;
  }

  // Context Hierarchy Validation
  const context = validateAndResolveContext(
    store.getBranches(),
    store.getFloors(),
    parsedUrl.query.branch as string,
    parsedUrl.query.floor as string,
    (parsedUrl.query.service || parsedUrl.query.shift) as string
  );

  const branches = store.getBranches();
  const currentBranch = store.getBranch(context.branchId) || branches[0];
  const floors = store.getFloors();
  const currentFloor = store.getFloor(context.floorId) || floors[0];
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
      method,
      pathname,
      status: res.statusCode,
      durationMs,
      branchId: currentBranch?.id,
    });
  });

  const requestIdentity = resolveRequestIdentity(req);
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
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-idempotency-key, x-session-id, x-order-token, x-request-id, x-correlation-id',
      'Access-Control-Expose-Headers': 'x-request-id',
    });
    res.end();
    return;
  }

  // Dev/Test helper endpoint for injecting tasks in test environments
  if (process.env.NODE_ENV !== 'production' && pathname === '/api/test/inject-task' && method === 'POST') {
    const body = await parseBody(req);
    store.addKitchenTask(body);
    sendJson(res, 200, { success: true, task: body });
    return;
  }

  // --- AUTHENTICATION & CREDENTIAL MANAGEMENT ---
  if ((pathname === '/api/restaurant/auth/staff-token' || pathname === '/api/restaurant/auth/login' || pathname === '/api/restaurant/auth/staff') && method === 'POST') {
    const body = await parseBody(req);
    const pin = body.pin || '';
    const requestedBranchId = body.branchId || currentBranch.id;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    // Authenticate PIN against server-authoritative staff directory with brute-force lockout
    const authResult = authenticateStaffByPin(pin, {
      branchId: requestedBranchId,
      staffId: body.staffId,
      clientIp,
    });

    if (authResult.isLocked) {
      store.appendEvent(
        'STAFF_AUTH_LOCKED',
        'auth-gateway',
        requestedBranchId,
        { clientIp, staffId: body.staffId }
      );
      sendJson(res, 429, {
        error: 'TOO_MANY_FAILED_ATTEMPTS',
        code: 'TOO_MANY_FAILED_ATTEMPTS',
        message: authResult.error || 'Too many failed PIN attempts. Account temporarily locked.',
      });
      return;
    }

    if (!authResult.success || !authResult.member) {
      store.appendEvent(
        'STAFF_AUTH_FAILED',
        'auth-gateway',
        requestedBranchId,
        { clientIp, staffId: body.staffId, reason: authResult.error }
      );
      sendJson(res, 401, {
        error: 'INVALID_CREDENTIALS',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid staff authentication PIN or credential.',
      });
      return;
    }

    // Role and branch are derived authoritatively from server directory record
    const member = authResult.member;
    const token = issueStaffToken({
      sub: member.id,
      name: member.name,
      role: member.role,
      branchId: member.branchId,
      station: member.station,
    });

    store.appendEvent(
      'STAFF_TOKEN_ISSUED',
      'auth-gateway',
      member.branchId,
      { staffId: member.id, role: member.role }
    );

    const isHttps = Boolean((req.socket as any)?.encrypted || req.headers['x-forwarded-proto'] === 'https');
    const secureFlag = isHttps ? '; Secure' : '';
    res.setHeader(
      'Set-Cookie',
      `orb_staff_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=28800`
    );

    sendJson(res, 200, {
      success: true,
      data: {
        token,
        role: member.role,
        station: member.station,
        branchId: member.branchId,
        expiresInSeconds: 8 * 3600,
        expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
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
        store.revokeCapabilityToken(tokenToRevoke);
        eventBus.disconnectClientsForToken(tokenToRevoke);
      } else {
        store.revokeStaffToken(tokenToRevoke);
        eventBus.disconnectClientsForToken(tokenToRevoke);
      }
      store.appendEvent(
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
    const identity = resolveRequestIdentity(req);
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
      store.revokeCapabilityToken(targetToken);
      eventBus.disconnectClientsForToken(targetToken);
    } else {
      store.revokeStaffToken(targetToken);
      eventBus.disconnectClientsForToken(targetToken);
    }

    store.appendEvent(
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
    const identity = resolveRequestIdentity(req);
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
    const staffList = getPublicStaffList(queryBranch);
    sendJson(res, 200, { success: true, data: staffList });
    return;
  }

  // Create staff member
  if (pathname === '/api/restaurant/staff' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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

    if (identity.role !== 'MANAGER' && identity.role !== 'ADMIN' && identity.type !== 'ADMIN') {
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

    // Privilege escalation check: only ADMIN can assign ADMIN role
    if (body.role === 'ADMIN' && identity.role !== 'ADMIN') {
      sendJson(res, 403, {
        error: 'PRIVILEGE_ESCALATION',
        code: 'PRIVILEGE_ESCALATION',
        message: 'Only platform administrators can provision the ADMIN role.',
      });
      return;
    }

    if (!body.name || !body.pin || !body.role) {
      sendJson(res, 400, {
        error: 'VALIDATION_ERROR',
        code: 'VALIDATION_ERROR',
        message: 'Name, role, and PIN are required.',
      });
      return;
    }

    try {
      const created = createStaffMember({
        name: body.name,
        role: body.role,
        branchId: targetBranchId,
        station: body.station,
        pin: body.pin,
        permissions: body.permissions,
      });

      await runtimeController.emitAudit('STAFF_MEMBER_CREATED', identity.id, {
        staffId: created.id,
        role: created.role,
        branchId: created.branchId,
        station: created.station,
      });

      sendJson(res, 201, { success: true, data: created });
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
    const identity = resolveRequestIdentity(req);
    if (
      identity.type === 'ANONYMOUS' ||
      identity.type === 'INVALID_CREDENTIAL' ||
      identity.type === 'REVOKED_CAPABILITY'
    ) {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    if (identity.role !== 'MANAGER' && identity.role !== 'ADMIN' && identity.type !== 'ADMIN') {
      sendJson(res, 403, { error: 'FORBIDDEN', code: 'FORBIDDEN', message: 'Manager credentials required.' });
      return;
    }

    const staffId = pathname.split('/')[4];
    const targetMember = getStaffMember(staffId);
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
    if (body.role === 'ADMIN' && identity.role !== 'ADMIN') {
      sendJson(res, 403, {
        error: 'PRIVILEGE_ESCALATION',
        code: 'PRIVILEGE_ESCALATION',
        message: 'Only platform administrators can grant the ADMIN role.',
      });
      return;
    }

    const updated = updateStaffMember(staffId, body);
    await runtimeController.emitAudit('STAFF_MEMBER_UPDATED', identity.id, {
      staffId,
      updates: { role: body.role, station: body.station, branchId: body.branchId, status: body.status },
    });

    sendJson(res, 200, { success: true, data: updated });
    return;
  }

  // Revoke staff member tokens by staff ID
  if (pathname.startsWith('/api/restaurant/staff/') && pathname.endsWith('/revoke') && method === 'POST') {
    const identity = resolveRequestIdentity(req);
    if (
      identity.type === 'ANONYMOUS' ||
      identity.type === 'INVALID_CREDENTIAL' ||
      identity.type === 'REVOKED_CAPABILITY'
    ) {
      sendJson(res, 401, { error: 'AUTHENTICATION_REQUIRED', code: 'AUTHENTICATION_REQUIRED' });
      return;
    }

    const staffId = pathname.split('/')[4];
    const targetMember = getStaffMember(staffId);
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

    store.revokeStaffMember(staffId);
    await runtimeController.emitAudit('STAFF_MEMBER_REVOKED', identity.id, { staffId });

    sendJson(res, 200, {
      success: true,
      message: `All current and future tokens for staff member ${staffId} have been durably revoked.`,
    });
    return;
  }

  // Reset PIN lockout tracker
  if (pathname === '/api/restaurant/staff/reset-lockout' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
    const isStoreWritable = typeof (store as any).checkWritable === 'function' ? (store as any).checkWritable() : true;
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
    sendJson(res, 200, {
      currentSequence: store.getLastEventSequence(),
      oldestSequence: store.getOldestEventSequence(),
      retainedEventsCount: store.getEvents().length,
      branchId: currentBranch.id,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // --- HEALTH & STATUS ---
  if (pathname === '/health') {
    const config = runtimeController.getActiveConfig();
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
      storeRevision: store.getRevisions(),
      totalTables: store.getTables().length,
      outboxEventsCount: store.getEvents().length,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // --- REALTIME SERVER-SENT EVENTS (SSE) STREAM ---
  if (pathname === '/api/restaurant/events') {
    const identity = resolveRequestIdentity(req);
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
    eventBus.registerClient(req, res, store, identity);
    return;
  }

  // --- RESTAURANT REST APIS ---

  // 1. Table QR Discovery
  if (pathname.startsWith('/api/restaurant/qr/')) {
    const locator = pathname.replace('/api/restaurant/qr/', '');
    const table = store.getTableByLocator(locator) || store.getTable(14) || store.getTables()[0];
    sendJson(res, 200, {
      success: true,
      data: {
        tableId: `tbl_${table.id}`,
        tableNumber: table.number,
        capacity: table.capacity,
        status: table.status,
        locator: table.locator,
        section: table.section,
        restaurantName: 'OrbitoX Bistro',
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
    sendJson(res, 200, {
      success: true,
      data: store.getMenuItems(),
    });
    return;
  }

  // 3. Seating Session Join
  if (pathname === '/api/restaurant/sessions/join' && method === 'POST') {
    const body = await parseBody(req);
    const targetTbl = (body.locator ? store.getTableByLocator(body.locator) : null) ||
                      store.getTableByNumber(body.tableNumber) ||
                      store.getTableByNumber(`T-${body.tableNumber}`) ||
                      store.getTable(14);
    const tableNum = targetTbl ? targetTbl.number : (body.tableNumber || 'T-14');
    const capabilityToken = `cap_${crypto.randomBytes(16).toString('hex')}`;
    const hostName = body.guestName || body.name || 'Primary Host';

    const session = store.createOrJoinSession(
      tableNum,
      hostName,
      capabilityToken,
      targetTbl?.branchId || currentBranch.id,
      targetTbl?.floorId || currentFloor.id
    );

    if (targetTbl) {
      const s1 = targetTbl.seats?.find((s) => s.seatNumber === 1);
      if (s1 && !s1.guestName) {
        store.assignGuestToSeat(s1.id, hostName);
      }
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
    const identity = resolveRequestIdentity(req);
    if (identity.type === 'REVOKED_CAPABILITY') {
      sendJson(res, 401, {
        error: 'REVOKED_CAPABILITY',
        code: 'REVOKED_CAPABILITY',
        message: 'Guest capability token has expired or session is closed.',
      });
      return;
    }

    const body = await parseBody(req);
    const tableNum =
      body.tableNumber || (body.tableId ? store.getTable(body.tableId)?.number : undefined) || 'T-14';

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

    const targetTableRecord = store.getTableByNumber(tableNum);
    if (targetTableRecord && identity.branchId && identity.branchId !== '*' && targetTableRecord.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot close session for table in branch ${targetTableRecord.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }

    const result = store.closeSession(tableNum, settlement, force, {
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
    const identity = resolveRequestIdentity(req);
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
        ? store.getTable(tableParam)
        : store.getTableByNumber(String(tableParam));

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
      const existingIdempotent = store.getIdempotencyRecord(idempotencyKey) || idempotencyRecords.get(idempotencyKey);
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

    const lockKey = `table_settle_${targetTable.id}`;
    const idempLockKey = idempotencyKey ? `idemp_${idempotencyKey}` : undefined;

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

      const result = store.settleTableSession(targetTable.id, settlementPayload, {
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
        idempotencyRecords.set(idempotencyKey, responsePayload);
        if (!store.getIdempotencyRecord(idempotencyKey)?.table) {
          store.saveIdempotencyRecord(idempotencyKey, responsePayload);
        }
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
    const menuItems = store.getMenuItems();

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
  // 6. Idempotent Order Submission
  if (pathname === '/api/restaurant/orders' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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

    if (idempotencyRecords.has(idempotencyKey)) {
      const cached = idempotencyRecords.get(idempotencyKey);
      if (cached && cached.payloadHash && cached.payloadHash !== payloadHash) {
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

    const menuItems = store.getMenuItems();
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

    const orderId = `ord_${Date.now()}`;
    const tableNumber = body.tableNumber || 'T-14';
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
      const activeTable = store.getTableByNumber(tableNumber);
      if (activeTable && activeTable.activeSessionId && identity.sessionId && activeTable.activeSessionId !== identity.sessionId) {
        sendJson(res, 403, {
          error: 'SESSION_MISMATCH',
          code: 'SESSION_MISMATCH',
          message: 'Diner capability does not match the active session for this table.',
        });
        return;
      }
    }

    const targetTableRecord = store.getTableByNumber(tableNumber);
    if (targetTableRecord && identity.branchId && identity.branchId !== '*' && targetTableRecord.branchId !== identity.branchId) {
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
        id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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
      store.addKitchenTask(newTask);
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: store.getEvents().length,
        type: 'task.created',
        timestamp: new Date().toISOString(),
        producer: 'api:order-service',
        branchId: body.branchId || currentBranch.id,
        tableNumber,
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

    store.addOrder(newOrder);
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: store.getEvents().length,
      type: 'order.created',
      timestamp: new Date().toISOString(),
      producer: 'api:order-service',
      branchId: body.branchId || currentBranch.id,
      tableNumber,
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

    idempotencyRecords.set(idempotencyKey, { payloadHash, response });
    await runtimeController.emitAudit('ORDER_PLACED', `table:${newOrder.tableNumber}`, { orderId, totalMinor });

    sendJson(res, 201, response);
    return;
  }

  // 6b. Orders Query Endpoint
  if (pathname === '/api/restaurant/orders' && method === 'GET') {
    const identity = resolveRequestIdentity(req);
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

    let orders = store.getOrders(tableFilter, sessionFilter, branchFilter, statusFilter);

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
    const identity = resolveRequestIdentity(req);
    const orderId = pathname.replace('/api/restaurant/orders/', '');
    const order = store.getOrder(orderId);
    if (!order) {
      sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
      return;
    }

    const targetTable = store.getTableByNumber(order.tableNumber);
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

    const tasks = store.getKitchenTasks().filter((t) => t.orderId === order.orderId);
    sendJson(res, 200, { success: true, data: order, tasks });
    return;
  }

  // 6d. Order Status Transition (PATCH /api/restaurant/orders/:id/status & PATCH /api/restaurant/orders/:id)
  if (
    pathname.startsWith('/api/restaurant/orders/') &&
    (pathname.endsWith('/status') || method === 'PATCH') &&
    !pathname.endsWith('/cancel')
  ) {
    const identity = resolveRequestIdentity(req);
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
    const order = store.getOrder(orderId);
    if (!order) {
      sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
      return;
    }

    const targetTable = store.getTableByNumber(order.tableNumber);
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

    const result = store.updateOrderStatus(orderId, newStatus, {
      authorizedBy: identity.id,
      reason: body.reason,
    });

    if (!result.success) {
      const statusCode = result.code === 'ORDER_NOT_FOUND' ? 404 : 400;
      sendJson(res, statusCode, { success: false, error: result.error, code: result.code });
      return;
    }

    sendJson(res, 200, { success: true, data: result.order });
    return;
  }

  // 6e. Order Cancellation (POST /api/restaurant/orders/:id/cancel)
  if (pathname.startsWith('/api/restaurant/orders/') && pathname.endsWith('/cancel') && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
    const order = store.getOrder(orderId);
    if (!order) {
      sendJson(res, 404, { success: false, error: `Order ${orderId} not found`, code: 'ORDER_NOT_FOUND' });
      return;
    }

    const targetTable = store.getTableByNumber(order.tableNumber);
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

    const result = store.cancelOrder(orderId, reason, identity.id);
    if (!result.success) {
      const statusCode = result.code === 'ORDER_NOT_FOUND' ? 404 : 400;
      sendJson(res, statusCode, { success: false, error: result.error, code: result.code });
      return;
    }

    sendJson(res, 200, { success: true, message: `Order ${orderId} cancelled`, data: result.order });
    return;
  }

  // 7. Kitchen Display System Stream / List
  if ((pathname === '/api/restaurant/kds' || pathname === '/api/restaurant/kds/tasks') && method === 'GET') {
    const stationFilter = (parsedUrl.query.station || parsedUrl.query.stationId) as string;
    const tasks = store.getKitchenTasks(stationFilter);
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

  const resolveTaskAuthoritativeBranch = (task: any): TaskBranchResolution => {
    const registeredBranches = store.getBranches().map((b) => b.id);

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
      const linkedOrder = store.getOrder(task.orderId);
      if (linkedOrder && linkedOrder.branchId && registeredBranches.includes(linkedOrder.branchId)) {
        task.branchId = linkedOrder.branchId;
        return { branchId: linkedOrder.branchId, quarantined: false };
      }
    }

    // 3. Controlled migration from authoritative linked table session
    if (task.sessionId) {
      const linkedSession = store.getSession(task.sessionId);
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
  const checkKdsIdempotency = (
    idempotencyKey: string | undefined,
    operation: string,
    targetId: string,
    targetBranchId: string | null | undefined,
    payload: any
  ): { hasConflict: boolean; isReplay: boolean; cachedResponse?: any; payloadHash: string } => {
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

    const existing = store.getIdempotencyRecord(idempotencyKey) || idempotencyRecords.get(idempotencyKey);
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
        cachedResponse: existing.response,
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
    const identity = resolveRequestIdentity(req);
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

    const task = store.getKitchenTasks().find((t) => t.id === taskId);
    if (!task) {
      sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
      return;
    }

    // Branch Resolution & Quarantine
    const taskBranchRes = resolveTaskAuthoritativeBranch(task);
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
    const idempCheck = checkKdsIdempotency(idempotencyKey, 'kds.bump', taskId, taskBranch, {
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

    const result = store.updateKitchenTaskStatus(taskId, nextStatus, {
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
      idempotencyRecords.set(idempotencyKey, record);
      store.saveIdempotencyRecord(idempotencyKey, record);
    }

    if (result.task) {
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: store.getEvents().length,
        type: `task.${result.task.status.toLowerCase()}`,
        timestamp: new Date().toISOString(),
        producer: result.task.orderId || result.task.id,
        branchId: taskBranch,
        tableNumber: result.task.tableNumber,
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
    const identity = resolveRequestIdentity(req);
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

    const task = store.getKitchenTasks().find((t) => t.id === taskId);
    if (!task) {
      sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
      return;
    }

    // Branch Resolution & Quarantine
    const taskBranchRes = resolveTaskAuthoritativeBranch(task);
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
    const idempCheck = checkKdsIdempotency(idempotencyKey, 'kds.fulfill-item', taskId, taskBranch, {
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

    const result = store.fulfillTaskItem(taskId, body.targetCount);
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
      idempotencyRecords.set(idempotencyKey, record);
      store.saveIdempotencyRecord(idempotencyKey, record);
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
    const identity = resolveRequestIdentity(req);
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

    const task = store.getKitchenTasks().find((t) => t.id === taskId);
    if (!task) {
      sendJson(res, 404, { error: `Task ${taskId} not found`, code: 'TASK_NOT_FOUND' });
      return;
    }

    // Branch Resolution & Quarantine
    const taskBranchRes = resolveTaskAuthoritativeBranch(task);
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
    const idempCheck = checkKdsIdempotency(idempotencyKey, 'kds.recall', taskId, taskBranch, {
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

    const result = store.recallTask(taskId, body.targetStatus);
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
      idempotencyRecords.set(idempotencyKey, record);
      store.saveIdempotencyRecord(idempotencyKey, record);
    }

    sendJson(res, 200, responsePayload);
    return;
  }

  // 11. KDS Expo Dispatch (All tasks for table marked BUMPED / Table SERVED)
  if ((pathname === '/api/restaurant/kds/expo-dispatch' || (pathname.startsWith('/api/restaurant/kds/tasks/') && pathname.endsWith('/dispatch'))) && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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

    const tasks = store.getKitchenTasks().filter((t) => t.tableNumber === tableNumber);
    if (tasks.length === 0) {
      sendJson(res, 400, { error: `No kitchen tasks found for table ${tableNumber}`, code: 'TASKS_NOT_FOUND' });
      return;
    }

    const tbl = store.getTableByNumber(tableNumber);
    let targetBranch: string | null = null;
    for (const t of tasks) {
      const tRes = resolveTaskAuthoritativeBranch(t);
      if (!tRes.quarantined && tRes.branchId) {
        targetBranch = tRes.branchId;
        break;
      }
    }
    if (!targetBranch && tbl && tbl.branchId && store.getBranches().some((b) => b.id === tbl.branchId)) {
      targetBranch = tbl.branchId;
    }
    if (!targetBranch && identity.branchId !== '*') {
      sendJson(res, 403, {
        error: `Tasks for table ${tableNumber} have no trusted branch association and cannot be dispatched by branch-scoped credentials.`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }

    const scopeCheck = authorizeKdsRequest(identity, targetBranch || undefined, undefined, true);
    if (!scopeCheck.authorized) {
      sendJson(res, scopeCheck.statusCode!, { error: scopeCheck.error, code: scopeCheck.code });
      return;
    }

    // Idempotency Check
    const idempCheck = checkKdsIdempotency(idempotencyKey, 'kds.expo-dispatch', tableNumber, targetBranch, {
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
    const lockKey = `dispatch:${tableNumber}:${targetBranch || '*'}`;
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
          idempotencyRecords.set(idempotencyKey, record);
          store.saveIdempotencyRecord(idempotencyKey, record);
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

      unbumped.forEach((t) => {
        t.status = 'BUMPED';
        t.fulfilledItemCount = t.quantity;
      });

      if (tbl) tbl.status = 'OCCUPIED';

      // Advance linked order status to SERVED when all tasks are dispatched
      const orderIds = Array.from(new Set(tasks.map((t) => t.orderId).filter(Boolean)));
      for (const ordId of orderIds) {
        const ord = store.getOrder(ordId);
        if (ord && ord.status !== 'CANCELLED') {
          const ordTasks = store.getKitchenTasks().filter((t) => t.orderId === ordId);
          if (ordTasks.every((t) => t.status === 'BUMPED')) {
            ord.status = 'SERVED';
          }
        }
      }

      const evt = store.appendEvent(
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
        idempotencyRecords.set(idempotencyKey, record);
        store.saveIdempotencyRecord(idempotencyKey, record);
      }

      sendJson(res, 200, responsePayload);
      return;
    } finally {
      activeDispatchLocks.delete(lockKey);
    }
  }

  // 11b. KDS Expo Table Recall
  if (pathname === '/api/restaurant/kds/expo-recall' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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

    const tasks = store.getKitchenTasks().filter((t) => t.tableNumber === tableNumber);
    const bumpedTasks = tasks.filter((t) => t.status === 'BUMPED');
    if (bumpedTasks.length === 0) {
      sendJson(res, 400, { error: `No bumped tasks to recall for table ${tableNumber}`, code: 'NO_BUMPED_TASKS' });
      return;
    }

    bumpedTasks.forEach((t) => {
      t.status = 'READY';
    });

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
  if (pathname === '/api/restaurant/floor' && method === 'GET') {
    const bId = (parsedUrl.query.branchId as string) || currentBranch.id;
    const fId = (parsedUrl.query.floorId as string) || undefined;
    const tables = store.getTables(bId, fId);
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
    const identity = resolveRequestIdentity(req);
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
      const saveResult = store.saveFloorTables(body.tables, currentBranch.id, currentFloor.id, {
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
        sequence: store.getEvents().length,
        type: 'table.updated',
        timestamp: new Date().toISOString(),
        producer: 'api:floor-save',
        branchId: currentBranch.id,
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
    const targetTable = typeof tableId === 'number' ? store.getTable(tableId) : store.getTableByNumber(tableId);
    if (!targetTable) {
      sendJson(res, 404, { success: false, error: `Table ${tableId} not found`, code: 'TABLE_NOT_FOUND' });
      return;
    }

    const identity = resolveRequestIdentity(req);
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

    const billData = store.getTableBill(targetTable.id);
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
    const table = typeof tableId === 'number' ? store.getTable(tableId) : store.getTableByNumber(tableId);
    if (!table) {
      sendJson(res, 404, { error: 'Table not found' });
      return;
    }
    const bill = store.getTableBill(table.id);
    sendJson(res, 200, { success: true, table, bill });
    return;
  }

  if (pathname.startsWith('/api/restaurant/tables/') && method === 'PATCH') {
    const identity = resolveRequestIdentity(req);
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
    const existingTable = store.getTable(tableId);
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
      updatedTable = store.updateTableCapacity(tableId, parseInt(body.capacity, 10));
    } else {
      updatedTable = store.getTable(tableId);
      if (updatedTable) {
        if (body.status) updatedTable.status = body.status;
        if (body.serverName) updatedTable.serverName = body.serverName;
        store.saveFloorTables([updatedTable]);
      }
    }

    if (!updatedTable) {
      sendJson(res, 404, { error: 'Table not found' });
      return;
    }

    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: store.getEvents().length,
      type: 'table.updated',
      timestamp: new Date().toISOString(),
      producer: 'api:table-patch',
      branchId: currentBranch.id,
      tableNumber: updatedTable.number,
      payload: updatedTable,
    });

    sendJson(res, 200, { success: true, table: updatedTable });
    return;
  }

  // 15. Seat Management (POST /api/restaurant/tables/:id/seats & DELETE /api/restaurant/tables/:id/seats/:seatId)
  if (pathname.startsWith('/api/restaurant/tables/') && pathname.includes('/seats')) {
    const identity = resolveRequestIdentity(req);
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
      const newSeat = store.addSeatToTable(tableId, body.label);
      if (!newSeat) {
        sendJson(res, 404, { error: 'Table not found' });
        return;
      }
      sendJson(res, 201, { success: true, seat: newSeat });
      return;
    }

    if (method === 'DELETE') {
      const seatId = parts[6];
      const ok = store.removeSeatFromTable(tableId, seatId);
      sendJson(res, ok ? 200 : 404, { success: ok });
      return;
    }
  }

  // Table Deletion (DELETE /api/restaurant/tables/:id)
  if (pathname.startsWith('/api/restaurant/tables/') && !pathname.includes('/seats') && method === 'DELETE') {
    const identity = resolveRequestIdentity(req);
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
    const table = store.getTable(tableId);
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
    const ok = store.deleteTable(tableId);
    sendJson(res, ok ? 200 : 404, { success: ok, deletedTableId: tableId });
    return;
  }

  // Table QR Locator Explicit Rotation (POST /api/restaurant/tables/:id/rotate-locator)
  if (pathname.startsWith('/api/restaurant/tables/') && pathname.endsWith('/rotate-locator') && method === 'POST') {
    const parts = pathname.split('/');
    const tableId = parseInt(parts[4], 10);
    const identity = resolveRequestIdentity(req);
    if (!identity.isPrivileged) {
      sendJson(res, (identity.type === 'ANONYMOUS' || identity.type === 'INVALID_CREDENTIAL') ? 401 : 403, {
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Rotating table QR locators requires authorized staff or manager privileges.',
      });
      return;
    }
    const targetTable = store.getTable(tableId);
    if (targetTable && identity.branchId && identity.branchId !== '*' && targetTable.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot rotate table in branch ${targetTable.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }
    const body = await parseBody(req);
    const result = store.rotateTableLocator(tableId, identity.id, body.reason);
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
      sequence: store.getEvents().length,
      type: 'table.locator_rotated',
      timestamp: new Date().toISOString(),
      producer: 'api:table-security',
      branchId: currentBranch.id,
      tableNumber: result.table?.number,
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
    store.resetToArchetypes();
    sendJson(res, 200, { success: true, message: 'Store reset to canonical archetypes' });
    return;
  }

  // 16. Assign Seated Guest (POST /api/restaurant/seats/:seatId/guest)
  if (pathname.startsWith('/api/restaurant/seats/') && pathname.endsWith('/guest') && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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

    const result = store.assignGuestToSeat(seatId, body.name, body.preferences);
    if (!result) {
      sendJson(res, 404, { error: 'Seat not found' });
      return;
    }

    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: store.getEvents().length,
      type: 'guest.joined',
      timestamp: new Date().toISOString(),
      producer: 'api:guest-assign',
      branchId: currentBranch.id,
      payload: result,
    });

    sendJson(res, 200, { success: true, data: result });
    return;
  }

  // 17. Branches API
  if (pathname === '/api/restaurant/branches') {
    if (method === 'GET') {
      sendJson(res, 200, { success: true, data: store.getBranches() });
      return;
    }
    if (method === 'POST') {
      const identity = resolveRequestIdentity(req);
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
      const saved = store.saveBranch(body);
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: store.getEvents().length,
        type: 'branch.updated',
        timestamp: new Date().toISOString(),
        producer: 'api:branch-save',
        branchId: saved.id,
        payload: saved,
      });
      sendJson(res, 200, { success: true, data: saved });
      return;
    }
  }

  if (pathname.startsWith('/api/restaurant/branches/') && method === 'DELETE') {
    const identity = resolveRequestIdentity(req);
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
    const ok = store.deleteBranch(branchId);
    sendJson(res, ok ? 200 : 404, { success: ok, deletedBranchId: branchId });
    return;
  }

  // 18. Floors API
  if (pathname === '/api/restaurant/floors') {
    if (method === 'GET') {
      const bFilter = parsedUrl.query.branchId as string;
      const result = store.getFloors(bFilter);
      sendJson(res, 200, { success: true, data: result });
      return;
    }
    if (method === 'POST') {
      const identity = resolveRequestIdentity(req);
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
        const f = store.getFloor(body.floorId);
        if (f) {
          f.activeLayout = body.layoutName;
          store.saveFloor(f);
        }
        sendJson(res, 200, { success: true, floor: f });
        return;
      }
      if (body.action === 'RENAME') {
        const f = store.getFloor(body.floorId);
        if (f) {
          f.name = body.name;
          store.saveFloor(f);
        }
        sendJson(res, 200, { success: true, floor: f });
        return;
      }
      const floorRecord = {
        id: body.id || `floor_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
      const saved = store.saveFloor(floorRecord);
      sendJson(res, 200, { success: true, data: saved });
      return;
    }
  }

  if (pathname.startsWith('/api/restaurant/floors/') && method === 'DELETE') {
    const identity = resolveRequestIdentity(req);
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
    const ok = store.deleteFloor(floorId);
    sendJson(res, ok ? 200 : 404, { success: ok, deletedFloorId: floorId });
    return;
  }

  // 19. Table Merging API
  if (pathname === '/api/restaurant/tables/merge' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
    const ok = store.mergeTables(body.tableId1, body.tableId2);
    if (!ok) {
      sendJson(res, 404, { error: 'One or both tables not found' });
      return;
    }
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: store.getEvents().length,
      type: 'table.merged',
      timestamp: new Date().toISOString(),
      producer: 'api:table-merge',
      branchId: currentBranch.id,
      payload: body,
    });
    sendJson(res, 200, { success: true, message: 'Tables merged successfully' });
    return;
  }

  // 20. Table Unmerging API
  if (pathname === '/api/restaurant/tables/unmerge' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
    const ok = store.unmergeTables(body.tableId);
    if (!ok) {
      sendJson(res, 404, { error: 'Table not found' });
      return;
    }
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: store.getEvents().length,
      type: 'table.unmerged',
      timestamp: new Date().toISOString(),
      producer: 'api:table-unmerge',
      branchId: currentBranch.id,
      payload: body,
    });
    sendJson(res, 200, { success: true, message: 'Table unmerged successfully' });
    return;
  }

  // 21. Service Requests API
  if (pathname === '/api/restaurant/service-requests') {
    if (method === 'GET') {
      sendJson(res, 200, { success: true, data: store.getServiceRequests(currentBranch.id) });
      return;
    }
    if (method === 'POST') {
      const identity = resolveRequestIdentity(req);
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
      const tableNumber = body.tableNumber || 'T-14';

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
      store.addServiceRequest(newReq);

      if (body.type === 'BILL') {
        const t = store.getTableByNumber(newReq.tableNumber);
        if (t) t.status = 'BILL_REQUESTED';
      }

      sendJson(res, 201, { success: true, data: newReq });
      return;
    }
  }

  // 22. Resolve Service Request
  if (pathname.startsWith('/api/restaurant/service-requests/') && pathname.endsWith('/resolve') && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
    const sReq = store.getServiceRequests().find((r) => r.id === reqId);
    if (!sReq) {
      sendJson(res, 404, { error: 'Request not found' });
      return;
    }
    const targetTbl = store.getTableByNumber(sReq.tableNumber);
    if (targetTbl && identity.branchId && identity.branchId !== '*' && targetTbl.branchId !== identity.branchId) {
      sendJson(res, 403, {
        error: `Credential for branch ${identity.branchId} cannot resolve request in branch ${targetTbl.branchId}`,
        code: 'BRANCH_MISMATCH',
      });
      return;
    }
    const resolved = store.resolveServiceRequest(reqId);
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: store.getEvents().length,
      type: 'service_request.resolved',
      timestamp: new Date().toISOString(),
      producer: 'api:service-resolve',
      branchId: currentBranch.id,
      tableNumber: resolved.tableNumber,
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
    store.reseed();
    sendJson(res, 200, { success: true, message: 'Runtime store reseeded successfully' });
    return;
  }

  // 24. Full State Inspection Dump
  if (pathname === '/api/restaurant/state' && method === 'GET') {
    const identity = resolveRequestIdentity(req);
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
    sendJson(res, 200, store.getRawData());
    return;
  }

  // 25. Authoritative Financial Ledger Reconciliation
  if (pathname === '/api/restaurant/finance/reconciliation' && method === 'GET') {
    const identity = resolveRequestIdentity(req);
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
    const report = store.reconcileFinancialLedger(branchFilter);
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
    sendJson(res, 200, { success: true, data: store.getTemplates() });
    return;
  }

  if (
    (pathname === '/api/restaurant/templates/install' ||
      (pathname.startsWith('/api/restaurant/templates/') && pathname.endsWith('/install'))) &&
    method === 'POST'
  ) {
    const identity = resolveRequestIdentity(req);
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
      const result = store.installTemplate(templateId);
      sendJson(res, 200, { success: true, ...result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 27. Visual Brand Studio Draft, Publish & Revisions
  if (pathname === '/api/restaurant/studio/draft' && method === 'GET') {
    sendJson(res, 200, { success: true, data: store.getTemplateDraft() });
    return;
  }

  if (pathname === '/api/restaurant/studio/draft' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
      const draft = store.saveTemplateDraft({
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
    const identity = resolveRequestIdentity(req);
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
      const pub = store.publishTemplateDraft(body.changeNotes);
      sendJson(res, 200, { success: true, data: pub });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/studio/revisions/') && pathname.endsWith('/restore') && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
      const restored = store.restoreTemplateRevision(revisionId);
      sendJson(res, 200, { success: true, data: restored });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 28. Tenant Branding & Custom Domain Verification
  if ((pathname === '/api/restaurant/branding' || pathname === '/api/restaurant/settings/whitelabel') && method === 'GET') {
    const reqBranchId = (parsedUrl.query.branchId as string) || (parsedUrl.query.branch as string);
    sendJson(res, 200, { success: true, data: store.getTenantBrand(reqBranchId) });
    return;
  }

  // 28b. Branch-Scoped White-Label Overrides
  if (pathname === '/api/restaurant/branding/branch-overrides' && method === 'GET') {
    const targetBranchId = (parsedUrl.query.branchId as string) || (parsedUrl.query.branch as string);
    if (!targetBranchId) {
      sendJson(res, 400, { success: false, error: 'BRANCH_REQUIRED', message: 'branchId query parameter is required.' });
      return;
    }
    const branch = store.getBranch(targetBranchId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
      return;
    }
    const baseBrand = store.getTenantBrand();
    const branchOverride = store.getBranchBrandOverride(targetBranchId);
    const effectiveBrand = store.getTenantBrand(targetBranchId);
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
    const identity = resolveRequestIdentity(req);
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
    const branch = store.getBranch(targetBranchId);
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

    const effective = store.updateBranchBrandOverride(targetBranchId, allowedOverrides, identity.id || 'Manager');
    sendJson(res, 200, {
      success: true,
      branchId: targetBranchId,
      override: store.getBranchBrandOverride(targetBranchId),
      effective,
      message: `Branch-specific overrides for ${branch.name} saved durably.`,
    });
    return;
  }

  if (pathname.startsWith('/api/restaurant/branding/branch-overrides/') && method === 'DELETE') {
    const identity = resolveRequestIdentity(req);
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
    const branch = store.getBranch(targetBranchId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${targetBranchId} does not exist.` });
      return;
    }
    const effective = store.updateBranchBrandOverride(targetBranchId, null, identity.id || 'Manager');
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
    const identity = resolveRequestIdentity(req);
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
      const updated = store.updateTenantBrand(body);
      sendJson(res, 200, { success: true, data: updated });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if ((pathname === '/api/restaurant/branding/verify-domain' || pathname === '/api/restaurant/settings/domains/verify') && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
    const domain = body.domain || store.getTenantBrand().customDomain;
    if (!domain || !domain.includes('.')) {
      sendJson(res, 400, { success: false, error: 'INVALID_DOMAIN', message: 'Domain must be a fully qualified domain name.' });
      return;
    }
    const updated = store.updateTenantBrand({
      customDomain: domain,
      domainStatus: 'VERIFIED',
      sslStatus: 'ACTIVE',
    });
    sendJson(res, 200, {
      success: true,
      data: updated,
      message: `Domain ${domain} successfully verified with SSL provisioned.`,
    });
    return;
  }

  // 29. Customer Support Desk & Cases
  if (pathname === '/api/restaurant/support/tickets' && method === 'GET') {
    sendJson(res, 200, { success: true, data: store.getSupportTickets() });
    return;
  }

  if (pathname === '/api/restaurant/support/tickets' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.subject || !body.initialMessage) {
      sendJson(res, 400, { success: false, error: 'Missing subject or initialMessage' });
      return;
    }
    try {
      const ticket = store.createSupportTicket({
        branchId: body.branchId || currentBranch.id,
        branchName: body.branchName || currentBranch.name,
        staffId: body.staffId || 'staff_mgr_ldh',
        staffName: body.staffName || body.senderName || 'Restaurant Operator',
        category: body.category || 'URGENT_INCIDENT',
        severity: body.severity || 'MEDIUM',
        subject: body.subject,
        description: body.description || body.initialMessage || body.subject,
        initialMessage: body.initialMessage,
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
      const success = store.addSupportTicketMessage(ticketId, {
        text: body.body || body.text,
        sender: body.senderRole === 'ORBITOX_SUPPORT' ? 'ORBITOX_SUPPORT' : 'RESTAURANT_STAFF',
        authorName: body.senderName || body.authorName || 'Staff Member',
        attachments: body.attachmentUrl ? [body.attachmentUrl] : undefined,
      });
      const ticket = store.getSupportTicketById(ticketId);
      sendJson(res, 200, { success, data: ticket });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/support/tickets/') && pathname.endsWith('/status') && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
      const ok = store.updateSupportTicketStatus(ticketId, body.status);
      const ticket = store.getSupportTicketById(ticketId);
      sendJson(res, 200, { success: ok, data: ticket });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  // 30. Menu Catalog Management (Create, Edit, Delete)
  if (pathname === '/api/restaurant/menu/items' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
      const newItem = store.createMenuItem(body);
      sendJson(res, 201, { success: true, data: newItem });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'PATCH') {
    const identity = resolveRequestIdentity(req);
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
      const updated = store.updateMenuItem(itemId, body);
      sendJson(res, 200, { success: true, data: updated });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'DELETE') {
    const identity = resolveRequestIdentity(req);
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
      store.deleteMenuItem(itemId);
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
    let items = store.getMenuItems(includeArchived);
    if (cat && cat !== 'ALL') {
      items = items.filter((i) => i.category.toLowerCase() === cat.toLowerCase() || i.categoryId === cat);
    }
    sendJson(res, 200, { success: true, count: items.length, data: items });
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/items/') && method === 'GET') {
    const itemId = pathname.replace('/api/restaurant/menu/items/', '');
    const item = store.getMenuItem(itemId);
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
    const categories = store.getCategories(includeArchived);
    const allItems = store.getMenuItems(true);
    const enriched = categories.map((c) => ({
      ...c,
      itemCount: allItems.filter((i) => !i.isArchived && (i.category === c.name || i.categoryId === c.id)).length,
    }));
    sendJson(res, 200, { success: true, count: enriched.length, data: enriched });
    return;
  }

  if (pathname === '/api/restaurant/menu/categories' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
      const newCat = store.createCategory(body);
      sendJson(res, 201, { success: true, data: newCat });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/restaurant/menu/categories/reorder' && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
      const reordered = store.reorderCategories(body.orderedIds);
      sendJson(res, 200, { success: true, data: reordered });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/api/restaurant/menu/categories/') && method === 'PATCH') {
    const identity = resolveRequestIdentity(req);
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
      const updated = store.updateCategory(catId, body);
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
    const identity = resolveRequestIdentity(req);
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
      const result = store.archiveCategory(catId, reassignTo);
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
    const branch = store.getBranch(bId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${bId} not found.` });
      return;
    }
    const resolvedMenu = store.getResolvedMenuForBranch(bId);
    sendJson(res, 200, { success: true, branchId: bId, branchName: branch.name, count: resolvedMenu.length, data: resolvedMenu });
    return;
  }

  if (pathname.startsWith('/api/restaurant/branches/') && method === 'GET') {
    const bId = pathname.replace('/api/restaurant/branches/', '');
    const branch = store.getBranch(bId);
    if (!branch) {
      sendJson(res, 404, { success: false, error: 'BRANCH_NOT_FOUND', message: `Branch ${bId} not found.` });
      return;
    }
    sendJson(res, 200, { success: true, data: branch });
    return;
  }

  if ((pathname === '/api/restaurant/menu/branch-overrides' || pathname === '/api/restaurant/menu/branch-override') && method === 'GET') {
    const bId = parsedUrl.query.branchId as string | undefined;
    sendJson(res, 200, { success: true, data: store.getBranchMenuOverrides(bId) });
    return;
  }

  if ((pathname === '/api/restaurant/menu/branch-overrides' || pathname === '/api/restaurant/menu/branch-override') && method === 'POST') {
    const identity = resolveRequestIdentity(req);
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
    const saved = store.setBranchMenuOverride(body);
    sendJson(res, 200, { success: true, data: saved });
    return;
  }

  // 30c. Resolved Branch Menu Commerce Endpoint
  if (pathname === '/api/commerce/menu' && method === 'GET') {
    const branchId = (parsedUrl.query.branch as string) || currentBranch.id;
    const resolvedMenu = store.getResolvedMenuForBranch(branchId);
    sendJson(res, 200, { success: true, branchId, count: resolvedMenu.length, data: resolvedMenu });
    return;
  }

  // 31. Multi-Experience Commerce Marketplace & Quick-Commerce APIs
  if (pathname === '/api/commerce/restaurants' && method === 'GET') {
    res.setHeader('X-API-Deprecation', 'single-brand-migration; use /api/commerce/menu instead');
    const partners = store.getRestaurantPartners();
    sendJson(res, 200, { success: true, count: partners.length, data: partners });
    return;
  }

  if (pathname.startsWith('/api/commerce/restaurants/') && method === 'GET') {
    const partnerId = pathname.replace('/api/commerce/restaurants/', '');
    const partner = store.getRestaurantPartnerById(partnerId);
    if (!partner) {
      sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Restaurant partner ${partnerId} not found.` });
      return;
    }
    sendJson(res, 200, { success: true, data: partner });
    return;
  }

  if ((pathname === '/api/commerce/grocery/skus' || pathname === '/api/commerce/grocery/catalog') && method === 'GET') {
    const categoryFilter = parsedUrl.query.category as string | undefined;
    const skus = store.getGrocerySkus(categoryFilter);
    sendJson(res, 200, { success: true, count: skus.length, data: skus });
    return;
  }

  if (pathname.startsWith('/api/commerce/grocery/skus/') && method === 'GET') {
    const skuId = pathname.replace('/api/commerce/grocery/skus/', '');
    const sku = store.getGrocerySkuById(skuId);
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
    const order = store.getOrders().find((o) => o.orderId === orderId);
    const cachedRecord = idempotencyRecords.get(orderId);
    const cached = cachedRecord?.response || cachedRecord;
    if (!order && !cached) {
      sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Order ${orderId} not found.` });
      return;
    }

    const authHeader = (req.headers['authorization'] as string) || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const headerToken = (req.headers['x-order-token'] as string) || bearerToken;
    const queryToken = (parsedUrl.query.token as string) || (parsedUrl.query.orderToken as string);
    const reqToken = headerToken || queryToken;

    const identity = resolveRequestIdentity(req);
    const isStaff = identity.type === 'STAFF' || identity.type === 'ADMIN' || identity.type === 'STATION';
    const expectedToken = orderTokens.get(orderId) || order?.orderToken || cached?.orderToken;

    // If an invalid tracking token is explicitly provided, reject with 403
    if (reqToken && expectedToken && reqToken !== expectedToken && !isStaff) {
      sendJson(res, 403, {
        success: false,
        error: 'UNAUTHORIZED_ORDER_ACCESS',
        message: 'The provided order tracking token does not match this order.',
      });
      return;
    }

    const tasks = store.getKitchenTasks().filter((t) => t.orderId === orderId);
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
    const orderBranch = store.getBranch(orderBranchId) || currentBranch;
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
    const order = store.getOrder(orderId);
    const cachedRecord = idempotencyRecords.get(orderId);
    const cached = cachedRecord?.response || cachedRecord;
    if (!order && !cached) {
      sendJson(res, 404, { success: false, error: 'NOT_FOUND', message: `Order ${orderId} not found.` });
      return;
    }

    const authHeader = (req.headers['authorization'] as string) || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const headerToken = (req.headers['x-order-token'] as string) || bearerToken;
    const queryToken = (parsedUrl.query.token as string) || (parsedUrl.query.orderToken as string);
    const reqToken = headerToken || queryToken;

    const identity = resolveRequestIdentity(req);
    const isStaff = identity.type === 'STAFF' || identity.type === 'ADMIN' || identity.type === 'STATION';
    const expectedToken = orderTokens.get(orderId) || order?.orderToken || cached?.orderToken;

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

    const tasks = store.getKitchenTasks().filter((t) => t.orderId === orderId);
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
      store.cancelOrder(orderId, reason, isStaff ? identity.id : 'customer');
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
      sequence: store.getEvents().length,
      type: 'order.cancelled',
      timestamp: new Date().toISOString(),
      producer: orderId,
      branchId: orderBranchId,
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

    if (idempotencyKey && idempotencyRecords.has(idempotencyKey)) {
      const cached = idempotencyRecords.get(idempotencyKey);
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
    const targetBranch = store.getBranch(targetBranchId);
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
    const resolvedMenu = store.getResolvedMenuForBranch(targetBranch.id);
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
    orderTokens.set(orderId, orderToken);
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
      restaurantId: 'tenant_orbitox_bistro',
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
      idempotencyRecords.set(idempotencyKey, { payloadHash, response: orderPayload });
    }
    idempotencyRecords.set(orderId, { payloadHash, response: orderPayload });

    // 5. Create and Persist Restaurant Order in Domain Store with Correct Branch Scoping
    const restaurantOrder: RestaurantOrder = {
      orderId,
      branchId: targetBranch.id,
      tableNumber: tableNum,
      sessionId: body.sessionId || `sess_${orderId}`,
      guestName: rawCustomerName,
      status: 'CONFIRMED',
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
    store.addOrder(restaurantOrder);

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
      store.addKitchenTask(task);
      eventBus.broadcast({
        id: `evt_${Date.now()}`,
        sequence: store.getEvents().length,
        type: 'task.created',
        timestamp: new Date().toISOString(),
        producer: orderId,
        branchId: targetBranch.id,
        tableNumber: tableNum,
        payload: { orderId, task },
      });
    }

    store.appendEvent(
      'COMMERCE_ORDER_CREATED',
      orderId,
      targetBranch.id,
      orderPayload
    );
    eventBus.broadcast({
      id: `evt_${Date.now()}`,
      sequence: store.getEvents().length,
      type: 'order.created',
      timestamp: new Date().toISOString(),
      producer: orderId,
      branchId: targetBranch.id,
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

    if (idempotencyKey && idempotencyRecords.has(idempotencyKey)) {
      const cached = idempotencyRecords.get(idempotencyKey);
      if (cached && cached.payloadHash && cached.payloadHash !== payloadHash) {
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
      const sku = store.getGrocerySkuById(item.skuId);
      if (!sku) {
        sendJson(res, 404, { success: false, error: 'SKU_NOT_FOUND', message: `Product SKU ${item.skuId} was not found in catalog.` });
        return;
      }
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      if (sku.stockQuantity < qty) {
        sendJson(res, 400, {
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `${sku.name} only has ${sku.stockQuantity} units available in local dark store inventory. Requested: ${qty}`,
          availableStock: sku.stockQuantity,
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
    const stockTx = store.transactGroceryStock(orderItems.map((it) => ({ skuId: it.skuId, quantity: it.quantity })));
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
      idempotencyRecords.set(idempotencyKey, { payloadHash, response: groceryOrderPayload });
    }

    store.appendEvent(
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
    const branchTables = store.getTables(currentBranch.id);
    const branchTasks = store.getKitchenTasks(undefined, currentBranch.id);
    const branchRequests = store.getServiceRequests(currentBranch.id);
    const branchOrders = store.getOrders(undefined, undefined, currentBranch.id);
    const branchEvents = store.getEvents(0, currentBranch.id);

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
        restaurantName: store.getTenantBrand().restaurantName || 'OrbitoX Bistro',
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
    const allTables = store.getTables(currentBranch.id);
    const allOrders = store.getOrders(undefined, undefined, currentBranch.id);

    const html = renderShell(
      renderFloorStudio(allTables, selectedTableId, currentFloor.id, currentBranch.id, floors, allOrders),
      {
        title: 'Spatial Floor Studio',
        activeNav: 'floor',
        restaurantName: store.getTenantBrand().restaurantName || 'OrbitoX Bistro',
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
    const html = renderShell(renderTablesList(store.getTables(currentBranch.id), currentBranch.id, section), {
      title: 'Tables Fleet',
      activeNav: 'tables',
      restaurantName: store.getTenantBrand().restaurantName || 'OrbitoX Bistro',
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

  // --- 4. ORDERS WORKSPACE (/operations/orders & /orders) ---
  if (pathname === '/operations/orders' || pathname === '/orders') {
    const branchOrders = store.getOrders(undefined, undefined, currentBranch.id);
    const html = renderShell(renderOrdersWorkspace(branchOrders, branches, currentBranch.id), {
      title: 'Service Orders',
      activeNav: 'orders',
      restaurantName: store.getTenantBrand().restaurantName,
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

    const branchTasks = store.getKitchenTasks(undefined, currentBranch.id);
    const html = renderKdsWorkspace(
      branchTasks,
      activeStation,
      currentBranch.name,
      serviceShift,
      undefined,
      store.getLastEventSequence(),
      currentBranch.id,
      kdsRole,
      isKitchenAuthorized
    );
    sendHtml(res, html);
    return;
  }

  // --- 6. MENU CATALOG WORKSPACE (/menu) ---
  if (pathname === '/menu') {
    const branchOverrides = store.getBranchMenuOverrides();
    const categories = store.getCategories(true);
    const html = renderShell(renderMenuWorkspace(store.getMenuItems(true), branches, currentBranch.id, branchOverrides, categories), {
      title: 'Menu Catalog',
      activeNav: 'menu',
      restaurantName: store.getTenantBrand().restaurantName,
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
    const html = renderShell(renderGuestsWorkspace(store.getTables(currentBranch.id), currentBranch.id, store.getGuests()), {
      title: 'Active Guests',
      activeNav: 'guests',
      restaurantName: store.getTenantBrand().restaurantName || 'OrbitoX Bistro',
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
    const html = renderShell(renderLocationsWorkspace(branches, currentBranch.id), {
      title: 'Locations & Branches',
      activeNav: 'locations',
      restaurantName: store.getTenantBrand().restaurantName || 'OrbitoX Bistro',
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
    const html = renderShell(renderFloorsWorkspace(floors, currentBranch), {
      title: 'Floor Plans & Layouts',
      activeNav: 'floors',
      restaurantName: store.getTenantBrand().restaurantName || 'OrbitoX Bistro',
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
    const html = renderShell(renderReportsWorkspace(store.getOrders(undefined, undefined, currentBranch.id), store.getKitchenTasks(undefined, currentBranch.id), store.getTables(currentBranch.id)), {
      title: 'Service Analytics',
      activeNav: 'reports',
      restaurantName: store.getTenantBrand().restaurantName || 'OrbitoX Bistro',
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
    const html = renderShell(renderStaffWorkspace(branches, currentBranch.id), {
      title: 'Staff Directory & RBAC Security',
      activeNav: 'staff',
      restaurantName: store.getTenantBrand().restaurantName,
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
    const locator = pathname.split('/')[2] || '7Kp9xQ8m2L';
    const currentTable = store.getTableByLocator(locator) || store.getTable(14) || store.getTables()[0];
    const tableOrders = currentTable.activeSessionId
      ? store.getOrders().filter((o) => o.tableNumber === currentTable.number && o.sessionId === currentTable.activeSessionId)
      : [];
    const tableTasks = currentTable.activeSessionId
      ? store.getKitchenTasks().filter((t) => t.tableNumber === currentTable.number && tableOrders.some((o) => o.orderId === t.orderId))
      : [];
    const tableBranch = store.getBranch(currentTable.branchId);
    const branchName = tableBranch ? tableBranch.name : currentBranch.name;
    const tenantBrand = store.getTenantBrand();
    const queryTmplId = (parsedUrl.query.templateId || parsedUrl.query.template) as string | undefined;
    const activeTemplate = (queryTmplId ? store.getTemplateById(queryTmplId) : undefined) || store.getTemplateById(tenantBrand.activeTemplateId);
    const effectiveBrand = queryTmplId && activeTemplate ? { ...tenantBrand, activeTemplateId: activeTemplate.id } : tenantBrand;
    const html = renderDinerPwa(currentTable, store.getMenuItems(), branchName, tableOrders, tableTasks, effectiveBrand, activeTemplate);
    sendHtml(res, html);
    return;
  }

  // --- 12. TEMPLATE MARKETPLACE (/marketplace) ---
  if (pathname === '/marketplace') {
    const html = renderMarketplaceWorkspace(
      store.getTemplates(),
      store.getTenantBrand(),
      store.getMenuItems(),
      currentBranch.id,
      branches
    );
    sendHtml(res, html);
    return;
  }

  // --- 12a. CRAVEATLAS SINGLE-BRAND RESTAURANT WEBSITE (/apps/crave-atlas) ---
  if (pathname === '/apps/crave-atlas') {
    const branchParam = parsedUrl.query.branch as string | undefined;
    const targetBranch = branchParam ? (store.getBranch(branchParam) || currentBranch) : currentBranch;
    const resolvedMenu = store.getResolvedMenuForBranch(targetBranch.id);
    const tenantBrand = store.getTenantBrand();
    const html = renderCraveAtlasPage(branches, targetBranch, resolvedMenu, tenantBrand);
    sendHtml(res, html);
    return;
  }

  // --- 12b. SWIFTBITE SPEED-FIRST FOOD ORDERING (/apps/swift-bite) ---
  if (pathname === '/apps/swift-bite') {
    const branchParam = parsedUrl.query.branch as string | undefined;
    const targetBranch = branchParam ? (store.getBranch(branchParam) || currentBranch) : currentBranch;
    const resolvedMenu = store.getResolvedMenuForBranch(targetBranch.id);
    const tenantBrand = store.getTenantBrand();
    const tableNumber = (parsedUrl.query.table || '1') as string;
    const html = renderSwiftBitePage(branches, targetBranch, resolvedMenu, tenantBrand, tableNumber, store.getOrders());
    sendHtml(res, html);
    return;
  }

  // --- 12c. PANTRYRUSH QUICK-COMMERCE GROCERY (/apps/pantry-rush) ---
  if (pathname === '/apps/pantry-rush') {
    const branchParam = parsedUrl.query.branch as string | undefined;
    const targetBranch = branchParam ? (store.getBranch(branchParam) || currentBranch) : currentBranch;
    const skus = store.getGrocerySkus();
    const tenantBrand = store.getTenantBrand();
    const pincode = (parsedUrl.query.pincode || '141001') as string;
    const html = renderPantryRushPage(skus, tenantBrand, branches, targetBranch, pincode);
    sendHtml(res, html);
    return;
  }

  // --- 13. VISUAL BRAND STUDIO & EDITOR (/studio) ---
  if (pathname === '/studio') {
    const activeBrand = store.getTenantBrand();
    const activeTemplate = store.getTemplateById(activeBrand.activeTemplateId) || store.getTemplates()[0];
    const draft = store.getTemplateDraft();
    const html = renderVisualStudio(
      activeTemplate,
      draft,
      activeBrand,
      store.getMenuItems(),
      currentBranch.id
    );
    sendHtml(res, html);
    return;
  }

  // --- 14. WHITE-LABEL & DOMAINS (/white-label & /whitelabel) ---
  if (pathname === '/white-label' || pathname === '/whitelabel') {
    const html = renderShell(
      renderWhiteLabelWorkspace(store.getTenantBrand(), branches, currentBranch.id),
      {
        title: 'White-Label & Domains',
        activeNav: 'whitelabel',
        restaurantName: store.getTenantBrand().restaurantName,
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
    const html = renderShell(
      renderStaffWorkspace(branches, currentBranch.id),
      {
        title: 'Staff Directory & RBAC Security',
        activeNav: 'staff',
        restaurantName: store.getTenantBrand().restaurantName,
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
    const html = renderShell(
      renderSupportWorkspace(store.getSupportTickets(), branches, currentBranch.id),
      {
        title: 'Customer Support Desk',
        activeNav: 'support',
        restaurantName: store.getTenantBrand().restaurantName,
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
    const selected = (parsedUrl.query.selected as string) || store.getTenantBrand().activeTemplateId || 'tmpl_haute_gastronomy';
    const compare = (parsedUrl.query.compare as string) || 'tmpl_artisan_coffee';
    const html = renderShell(
      renderTemplateCompositionInspector(store.getTemplates(), selected, compare, store.getMenuItems()),
      {
        title: 'Template Composition Inspector',
        activeNav: 'marketplace',
        restaurantName: store.getTenantBrand().restaurantName,
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
    const html = renderShell(renderDeveloperInspector(context, store.getRawData()), {
      title: 'Runtime Inspector',
      activeNav: 'overview',
      restaurantName: 'OrbitoX Bistro',
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
    <div><span class="key">STORAGE_ENGINE:</span> <span class="val">Atomic File-Backed JSON (data/restaurant-runtime-store.json)</span></div>
    <div><span class="key">STORAGE_REVISION:</span> <span class="val">${store.getRevisions()}</span></div>
    <div><span class="key">OUTBOX_EVENTS:</span> <span class="val">${store.getEvents().length}</span></div>
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

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DANGEROUS_RESET === 'true') {
  console.error('🚨 [SECURITY FATAL] Dangerous reset flags cannot be enabled in production mode! Halting startup.');
  process.exit(1);
}

server.listen(PORT, async () => {
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

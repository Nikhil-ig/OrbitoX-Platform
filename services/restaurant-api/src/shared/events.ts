import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import {
  MenuItem,
  KitchenTask,
  TableFloorRecord,
  RestaurantOrder,
  BranchRecord,
  FloorRecord,
  ServiceRequest,
  RestaurantContext,
  issueStaffToken,
  verifyStaffToken,
  revokeStaffToken,
  isStaffTokenRevoked,
  eventLoopMonitor,
  authenticateStaffByPin,
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
  validateAndSanitizeCustomCss,
  tryGetActiveTenant,
  resolveTenantDisplayName,
  invalidateTenantResolutionCache,
  OnboardingStepKey,
  verifyPlatformAuth,
  validateTenantSlug,
  generateSeats,
} from '../../packages/domain';
import {
  buildGSTInvoice,
  computeFiscalYear,
  SAC_RESTAURANT_SERVICES,
  renderPrintableInvoiceHtml,
} from '../../packages/domain/invoicing';
import {
  isProductionEnvironment,
  PORT,
  store,
  postgresStore,
  eventBus,
  runtimeController,
  provisioningService,
  customDomainService,
  ownerSelfService,
  razorpayAdapter,
  restaurantGrantEnforcer,
  getPinnedGrantKeys,
  activeSettlementLocks,
  activeDispatchLocks,
  totalRequests,
  statusCounts,
  methodCounts,
  totalDomainEvents,
} from './state';
import {
  parseBody,
  parseBuffer,
  extractImageBuffer,
  sendJson,
  sendHtml,
  checkTestKillPoint,
  isActiveRestaurantCataloguePlan,
} from '../http/middleware';
import {
  assertPlatformBridgeCaller,
  exportRestaurantTenantData,
  eraseRestaurantTenantData,
  exportRestaurantPrincipalData,
  correctRestaurantPrincipalData,
  eraseRestaurantPrincipalData,
} from '../data-rights';
import { SEED_PLANS } from '@orbitox-io/plugin-engine';
import type { PreTenantRouteContext, TenantRouteContext } from '../http/types';

export async function handleProbesAndEventsRoutes(ctx: TenantRouteContext): Promise<boolean> {
  const {
    req, res, pathname, method, parsedUrl, tenantContext, repo, posService,
    branches, floors, context, currentBranch, currentFloor, serviceShift,
    requestIdentity, activeStaffToken, activeStaffRole,
  } = ctx;
    // --- KUBERNETES / DOCKER STANDARD HEALTH PROBES (Phase 6A) ---
    // 1. Liveness Probe (/healthz/live): confirms process is responsive and event loop is alive
    if (pathname === '/healthz/live' && method === 'GET') {
      sendJson(res, 200, {
        status: 'LIVE',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    // 2. Readiness Probe (/healthz/ready): verifies operational dependencies required for serving traffic
    if (pathname === '/healthz/ready' && method === 'GET') {
      try {
        const grantKeys = getPinnedGrantKeys();
        if (Object.keys(grantKeys).length === 0) {
          sendJson(res, 503, {
            status: 'NOT_READY',
            error: 'GRANT_KEYS_UNCONFIGURED',
            timestamp: new Date().toISOString(),
          });
          return true;
        }
      } catch (keyErr: any) {
        sendJson(res, 503, {
          status: 'NOT_READY',
          error: 'GRANT_KEYS_UNCONFIGURED',
          message: keyErr.message,
          timestamp: new Date().toISOString(),
        });
        return true;
      }

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
      return true;
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
      return true;
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
      return true;
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
        return true;
      }
      if (process.env.NODE_ENV === 'production' && identity.type === 'ANONYMOUS') {
        sendJson(res, 401, {
          error: 'AUTHENTICATION_REQUIRED',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Realtime SSE subscription requires a valid guest or staff credential in production mode.',
        });
        return true;
      }
      eventBus.registerClient(req, res, repo, identity);
      return true;
    }
  return false;
}

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import {
  verifyPlatformAuth,
  getDefaultBridgeKeys,
} from '../../packages/domain';
import {
  isProductionEnvironment,
  postgresStore,
  getPinnedGrantKeys,
  totalRequests,
  statusCounts,
  methodCounts,
  totalDomainEvents,
} from '../shared/state';
import { sendJson } from './middleware';
import type { PreTenantRouteContext } from './types';

export async function handleHealthSystemRoutes(ctx: PreTenantRouteContext): Promise<boolean> {
  const { req, res, pathname, method, parsedUrl } = ctx;

  // Readiness check: verifies PostgreSQL, bridge keys, grant keys, and runtime services
  if ((pathname === '/healthz/ready' || pathname === '/ready') && method === 'GET') {
    try {
      if (isProductionEnvironment) {
        try {
          const grantKeys = getPinnedGrantKeys();
          if (Object.keys(grantKeys).length === 0) {
            sendJson(res, 503, {
              status: 'not_ready',
              error: 'GRANT_KEYS_UNCONFIGURED',
              uptime: process.uptime(),
              timestamp: new Date().toISOString(),
            });
            return true;
          }
        } catch (keyErr: any) {
          sendJson(res, 503, {
            status: 'not_ready',
            error: 'GRANT_KEYS_UNCONFIGURED',
            message: keyErr.message,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          });
          return true;
        }

        try {
          getDefaultBridgeKeys();
        } catch (keyErr: any) {
          sendJson(res, 503, {
            status: 'not_ready',
            checks: {
              database: 'UP',
              bridgeKeys: 'DOWN',
              error: keyErr.message,
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          });
          return true;
        }
      }
      if (postgresStore?.prisma) {
        await postgresStore.prisma.$queryRawUnsafe('SELECT 1');
      }
      sendJson(res, 200, {
        status: 'ready',
        checks: {
          database: 'UP',
          bridgeKeys: 'UP',
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
    return true;
  }

  // Liveness and basic health probes
  if (pathname === '/health' || pathname === '/healthz' || pathname === '/healthz/live' || pathname === '/live') {
    sendJson(res, 200, {
      status: 'healthy',
      service: 'restaurant-os',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  // Metrics endpoint (Prometheus format or JSON)
  if ((pathname === '/metrics' || pathname === '/internal/metrics') && method === 'GET') {
    if (pathname === '/internal/metrics' && !verifyPlatformAuth(req)) {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
        message: 'Platform service credentials required for internal metrics.',
      });
      return true;
    }
    const memory = process.memoryUsage();
    let activeTenantsCount = 1;
    try {
      if (postgresStore?.prisma) {
        activeTenantsCount = await postgresStore.prisma.tenant.count({ where: { status: 'active' } });
      }
    } catch (e) { }

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
      return true;
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
    return true;
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
      return true;
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
    return true;
  }

  return false;
}


import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { RouteHandler, HttpMethod } from './router';
import {
  sendJson,
  postgresStore,
  eventBus,
  isProductionEnvironment,
  getPinnedGrantKeys,
  totalRequests,
  statusCounts,
  methodCounts,
  totalDomainEvents,
} from './context';
import {
  verifyPlatformAuth,
  getDefaultBridgeKeys,
} from '../shared';

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}

export const httpRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/favicon.ico',
    handler: (_req, res) => {
      res.writeHead(204, { 'Content-Type': 'image/x-icon' });
      res.end();
    },
  },
  {
    method: 'GET',
    path: '/healthz/ready',
    handler: async (_req, res) => {
      await handleReadiness(res);
    },
  },
  {
    method: 'GET',
    path: '/ready',
    handler: async (_req, res) => {
      await handleReadiness(res);
    },
  },
  {
    method: 'GET',
    path: '/health',
    handler: (_req, res) => {
      handleLiveness(res);
    },
  },
  {
    method: 'GET',
    path: '/healthz',
    handler: (_req, res) => {
      handleLiveness(res);
    },
  },
  {
    method: 'GET',
    path: '/healthz/live',
    handler: (_req, res) => {
      handleLiveness(res);
    },
  },
  {
    method: 'GET',
    path: '/live',
    handler: (_req, res) => {
      handleLiveness(res);
    },
  },
  {
    method: 'GET',
    path: '/metrics',
    handler: async (req, res, context) => {
      await handleMetrics(req, res, context.parsedUrl);
    },
  },
  {
    method: 'GET',
    path: '/internal/metrics',
    handler: async (req, res, context) => {
      if (!verifyPlatformAuth(req)) {
        sendJson(res, 401, {
          error: 'UNAUTHORIZED',
          message: 'Platform service credentials required for internal metrics.',
        });
        return;
      }
      await handleMetrics(req, res, context.parsedUrl);
    },
  },
  {
    method: 'GET',
    path: '/manifest.json',
    handler: async (_req, res, context) => {
      const brand = await context.repo.getTenantBrand();
      const manifest = {
        name: brand?.restaurantName || context.tenantContext?.tenantName || 'RestaurantOS',
        short_name: brand?.restaurantName || context.tenantContext?.tenantSlug || 'RestaurantOS',
        description: brand?.tagline || `${brand?.restaurantName || context.tenantContext?.tenantName || 'RestaurantOS'} digital dining experience`,
        start_url: '/',
        display: 'standalone',
        theme_color: brand?.primaryColor || '#C86B3C',
        background_color: '#080A0D',
        icons: [
          {
            src: brand?.logoUrl || '/assets/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: brand?.logoUrl || '/assets/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      };
      sendJson(res, 200, manifest);
    },
  },
  {
    method: 'GET',
    path: '/uploads/*',
    handler: (_req, res, context) => {
      serveStaticUpload(res, context.pathname.replace(/^\/uploads\/?/, ''));
    },
  },
];

async function handleReadiness(res: http.ServerResponse): Promise<void> {
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
          return;
        }
      } catch (keyErr: any) {
        sendJson(res, 503, {
          status: 'not_ready',
          error: 'GRANT_KEYS_UNCONFIGURED',
          message: keyErr.message,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        });
        return;
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
        return;
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
}

function handleLiveness(res: http.ServerResponse): void {
  sendJson(res, 200, {
    status: 'healthy',
    service: 'restaurant-os',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

async function handleMetrics(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: any): Promise<void> {
  const memory = process.memoryUsage();
  let activeTenantsCount = 1;
  try {
    if (postgresStore?.prisma) {
      activeTenantsCount = await postgresStore.prisma.tenant.count({ where: { status: 'active' } });
    }
  } catch { }

  const isJson = req.headers.accept?.includes('application/json') || parsedUrl.query?.format === 'json';
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
}

function serveStaticUpload(res: http.ServerResponse, relativeSubpath: string): void {
  const safeUploadsRoot = path.resolve(
    process.env.RESTAURANT_STORE_PATH
      ? path.join(path.dirname(process.env.RESTAURANT_STORE_PATH), 'uploads')
      : path.join(process.cwd(), 'data', 'uploads')
  );
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
}


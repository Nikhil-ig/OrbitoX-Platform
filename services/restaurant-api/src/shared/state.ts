import * as crypto from 'crypto';
import {
  getStaffAuthSecret,
  PostgresNonceStore,
  MemoryNonceStore,
  PostgresEventListener,
  TenantProvisioningService,
  CustomDomainService,
  OwnerSelfService,
  signBridgeRequest,
  getDefaultBridgeKeys,
} from '../../packages/domain';
import { RestaurantRuntimeStore } from '../../packages/storage';
import { PostgresRestaurantStore } from '../../packages/storage/postgres-store';
import { RealtimeEventBus } from '../../packages/domain/event-bus';
import { restaurantControlBridge } from '../bridge';
import { PluginGrantEnforcer, PostgresRevisionStore, MemoryRevisionStore } from '@orbitox-io/plugin-engine';
import { RazorpayPaymentGatewayAdapter } from '../../packages/integrations';
import { assertRestaurantOsProductionConfig, GSTIN_REGEX, PORT, HOSTNAME, isProductionEnvironment } from './config';

export { assertRestaurantOsProductionConfig, GSTIN_REGEX, PORT, HOSTNAME, isProductionEnvironment };

// Production storage driver guard: file-backed JSON store is strictly prohibited in production
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

export let postgresStore: PostgresRestaurantStore | null = null;
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

export let pgEventListener: PostgresEventListener | null = null;
if (process.env.STORAGE_DRIVER !== 'json' && process.env.DATABASE_URL) {
  try {
    pgEventListener = new PostgresEventListener(process.env.DATABASE_URL, eventBus);
    pgEventListener.start().catch((err: any) => console.warn('[PostgresEventListener] Startup warning:', err.message));
  } catch (err: any) {
    console.warn('[PostgresEventListener] Init warning:', err.message);
  }
}


// --- ORBITOX PLUGIN GRANT ENFORCER SETUP (C1, C2, C3) ---
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

// C3: Refuse to start in production if PostgreSQL is unavailable or configuration is invalid
if (isProductionEnvironment) {
  assertRestaurantOsProductionConfig(process.env);
  getPinnedGrantKeys(); // Startup validation: throws if unconfigured
  if (!postgresStore?.prisma) {
    console.error('🚨 [CRITICAL_SECURITY_VIOLATION] PostgreSQL revision store is required in production mode! Halting startup.');
    process.exit(1);
  }
}

export const restaurantRevisionStore = postgresStore?.prisma
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

// Startup security signing secret verification
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

export function incrementTotalRequests(statusCode: number, method: string): void {
  totalRequests++;
  statusCounts.set(statusCode, (statusCounts.get(statusCode) || 0) + 1);
  methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
}

if (store) {
  store.onEvent((event) => {
    totalDomainEvents++;
    eventBus.broadcast(event);
  });
}

export const activeSettlementLocks = new Set<string>();
export const activeDispatchLocks = new Set<string>();

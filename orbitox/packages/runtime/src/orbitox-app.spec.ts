import http from 'http';
import { createOrbitoXApp } from './orbitox-app';
import { defineOrbitoXPlugin } from '@orbitox-io/plugin-engine';

describe('Hardened createOrbitoXApp', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Production Startup Guards', () => {
    it('should refuse to boot in production without auth.provider', async () => {
      process.env.NODE_ENV = 'production';

      await expect(
        createOrbitoXApp({
          app: { name: 'ProdApp', port: 0 },
          tenancy: {
            resolver: () => ({ tenantId: 'tenant_1' }),
          },
        } as any)
      ).rejects.toThrow('SECURITY CRITICAL: createOrbitoXApp refuses to start in production without an explicit "auth.provider"');
    });

    it('should refuse to boot in production without tenancy.resolver', async () => {
      process.env.NODE_ENV = 'production';

      await expect(
        createOrbitoXApp({
          app: { name: 'ProdApp', port: 0 },
          auth: {
            provider: () => ({ id: 'usr_1' }),
          },
        } as any)
      ).rejects.toThrow('SECURITY CRITICAL: createOrbitoXApp refuses to start in production without an explicit "tenancy.resolver"');
    });
  });

  describe('HTTP Multi-Tenancy & Guards (401, 403, 402)', () => {
    let serverInstance: http.Server;
    let baseUrl: string;
    const reportedUsages: any[] = [];

    const mockPlugin = defineOrbitoXPlugin({
      manifest: {
        id: 'billing-pos',
        name: '@orbitox/billing-pos',
        version: '1.0.0',
        displayName: 'Billing & POS Engine',
        entitlements: {
          features: ['pos.advanced_orders'],
          quotas: [{ key: 'orders_monthly', defaultLimit: 5 }],
        },
      },
      domain: {},
      service: {
        createOrder: (data: any) => ({ orderId: 'ord_999', ...data }),
      },
      routes: [
        {
          path: '/api/v1/orders/public-catalog',
          method: 'GET',
          handler: () => ({ catalog: ['item1', 'item2'] }),
        },
        {
          path: '/api/v1/orders/submit',
          method: 'POST',
          requiresAuth: true,
          scopes: ['pos.orders.write'],
          entitlement: {
            feature: 'pos.advanced_orders',
            quotaKey: 'orders_monthly',
          },
          handler: (ctx) => ({
            status: 201,
            body: {
              success: true,
              order: ctx.services.createOrder(ctx.body),
            },
          }),
        },

      ],
    });

    beforeAll(async () => {
      process.env.NODE_ENV = 'development';

      const mockPlatformSdk = {
        entitlements: {
          check: (key: string) => {
            if (key === 'orders_monthly') {
              // Return quota exceeded if requested
              return { allowed: true, remaining: 10, enforced: true };
            }
            return { allowed: true, remaining: Infinity, enforced: false };
          },
          reportUsage: async (key: string, amount: number) => {
            reportedUsages.push({ key, amount });
            return { allowed: true, remaining: 9, used: 1, limit: 10 };
          },
        },
      };

      const result = await createOrbitoXApp({
        app: { name: 'TestHardenedApp', port: 0 },
        tenancy: {
          resolver: (req) => {
            const tenantHeader = req.headers['x-tenant-id'];
            if (!tenantHeader) return null;
            if (tenantHeader === 'suspended_tenant') {
              return { tenantId: 'suspended_tenant', status: 'SUSPENDED', name: 'Suspended Cafe' };
            }
            if (tenantHeader === 'quota_exceeded_tenant') {
              return {
                tenantId: 'quota_exceeded_tenant',
                status: 'ACTIVE',
                features: ['pos.advanced_orders'],
                quotas: { items_monthly: 10, orders_monthly: 10 },
                usage: { items_monthly: 10, orders_monthly: 10 },
              };
            }

            const isEntitled = req.headers['x-tenant-plan'] === 'pro';
            return {
              tenantId: tenantHeader as string,
              status: 'ACTIVE',
              features: isEntitled ? ['pos.advanced_orders'] : [],
              quotas: { orders_monthly: 100 },
              usage: { orders_monthly: 2 },
            };
          },
        },
        auth: {
          provider: (req) => {
            const authHeader = req.headers['authorization'];
            if (authHeader === 'Bearer valid_staff_token') {
              return { id: 'staff_1', roles: ['pos.orders.write'] };
            }
            if (authHeader === 'Bearer invalid_scope_token') {
              return { id: 'staff_guest', roles: ['guest.read'] };
            }
            return null;
          },
        },
        plugins: [mockPlugin],
        platform: {
          enabled: true,
          sdk: mockPlatformSdk,
        },
        entities: [
          {
            id: 'menu_item',
            name: 'Menu Item',
            entitlement: {
              feature: 'pos.advanced_orders',
              quotaKey: 'items_monthly',
            },
            fields: [{ name: 'title', type: 'text', required: true }],
          },
        ],
      });

      serverInstance = result.server;
      const addr = serverInstance.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
    });

    afterAll((done) => {
      serverInstance.close(done);
    });

    it('should allow /health bypass without tenant headers', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.pluginsCount).toBe(1);
    });

    it('should reject requests without tenant headers with 404 TENANT_NOT_FOUND', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/public-catalog`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('TENANT_NOT_FOUND');
    });

    it('should reject requests from suspended tenant with 403 TENANT_SUSPENDED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/public-catalog`, {
        headers: { 'x-tenant-id': 'suspended_tenant' },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('TENANT_SUSPENDED');
    });

    it('should allow public catalog with active tenant', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/public-catalog`, {
        headers: { 'x-tenant-id': 'tenant_cafe_1' },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.catalog).toEqual(['item1', 'item2']);
    });

    it('should return 401 UNAUTHORIZED when caller is unauthenticated on protected route', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_cafe_1',
          'x-tenant-plan': 'pro',
        },
        body: JSON.stringify({ item: 'Pasta' }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when user lacks required scopes', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_cafe_1',
          'x-tenant-plan': 'pro',
          Authorization: 'Bearer invalid_scope_token',
        },
        body: JSON.stringify({ item: 'Pasta' }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('FORBIDDEN');
    });

    it('should return 403 FEATURE_NOT_ENTITLED when tenant plan lacks feature entitlement', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_cafe_1',
          'x-tenant-plan': 'basic', // Lacks 'pos.advanced_orders'
          Authorization: 'Bearer valid_staff_token',
        },
        body: JSON.stringify({ item: 'Pasta' }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('FEATURE_NOT_ENTITLED');
      expect(data.feature).toBe('pos.advanced_orders');
    });

    it('should return 402 QUOTA_EXCEEDED when tenant monthly quota is exceeded', async () => {
      const res = await fetch(`${baseUrl}/api/menu-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'quota_exceeded_tenant',
          Authorization: 'Bearer valid_staff_token',
        },
        body: JSON.stringify({ title: 'Gourmet Truffle Burger' }),
      });
      expect(res.status).toBe(402);
      const data = await res.json();
      expect(data.error).toBe('QUOTA_EXCEEDED');
      expect(data.quotaKey).toBe('items_monthly');
    });

    it('should allow valid request with authentic token, entitled plan, and quota headroom', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_cafe_1',
          'x-tenant-plan': 'pro',
          Authorization: 'Bearer valid_staff_token',
        },
        body: JSON.stringify({ item: 'Signature Risotto' }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.order.item).toBe('Signature Risotto');
    });
  });
});

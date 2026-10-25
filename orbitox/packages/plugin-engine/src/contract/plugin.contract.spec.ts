import express from 'express';
import http from 'http';
import {
  defineOrbitoXPlugin,
  OrbitoXPlugin,
  PluginClock,
  PluginRequestContext,
  PluginResponse,
} from './plugin.contract';
import { PluginContractLoader } from './plugin-contract-loader';

describe('OrbitoX Plugin Contract & Loader', () => {
  describe('Manifest Validation', () => {
    it('should reject manifest without id or name or version', () => {
      const invalid: any = {
        displayName: 'Broken Plugin',
        entitlements: { features: [] },
      };
      const res = PluginContractLoader.validateManifest(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Manifest "id" is required and must be a non-empty string');
      expect(res.errors).toContain('Manifest "name" is required and must be a valid package name (e.g. "@orbitox/pos")');
      expect(res.errors).toContain('Manifest "version" is required and must follow semantic versioning (e.g. "1.0.0")');
    });

    it('should reject manifest with invalid id format', () => {
      const invalid: any = {
        id: 'Invalid ID with Spaces',
        name: '@orbitox/invalid',
        version: '1.0.0',
        displayName: 'Invalid',
        entitlements: { features: [] },
      };
      const res = PluginContractLoader.validateManifest(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Manifest "id" must contain only lowercase alphanumeric characters, dashes, or underscores');
    });

    it('should reject manifest with invalid semver version', () => {
      const invalid: any = {
        id: 'valid-id',
        name: '@orbitox/valid',
        version: 'beta-1',
        displayName: 'Valid Plugin',
        entitlements: { features: [] },
      };
      const res = PluginContractLoader.validateManifest(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Manifest "version" is not a valid semantic version');
    });

    it('should reject manifest without entitlements.features array', () => {
      const invalid: any = {
        id: 'valid-id',
        name: '@orbitox/valid',
        version: '1.0.0',
        displayName: 'Valid Plugin',
        entitlements: {} as any,
      };
      const res = PluginContractLoader.validateManifest(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Manifest "entitlements.features" is required and must be an array of feature strings');
    });

    it('should accept a fully valid manifest', () => {
      const valid = {
        id: 'pos',
        name: '@orbitox/pos',
        version: '1.2.0',
        displayName: 'Point of Sale Engine',
        description: 'Complete order management and kitchen DAG engine',
        author: 'OrbitoX',
        entitlements: {
          features: ['pos.orders', 'pos.quote', 'pos.kds'],
          quotas: [{ key: 'pos_orders_monthly', defaultLimit: 5000, window: 'monthly' as const }],
        },
        events: {
          emits: ['order.placed', 'order.completed'],
          subscribes: ['payment.settled'],
        },
      };
      const res = PluginContractLoader.validateManifest(valid);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });
  });

  describe('Plugin Lifecycle & Dependency Injection', () => {
    interface MockDomain {
      calculateTotal: (items: Array<{ price: number; qty: number }>) => number;
    }

    interface MockRepo {
      saveOrder: (order: any) => Promise<any>;
    }

    interface MockService {
      submitOrder: (orderData: any) => Promise<any>;
    }

    const testPlugin: OrbitoXPlugin<MockDomain, MockService, MockRepo> = defineOrbitoXPlugin({
      manifest: {
        id: 'pos-test',
        name: '@orbitox/pos-test',
        version: '1.0.0',
        displayName: 'POS Test Engine',
        entitlements: {
          features: ['pos.orders', 'pos.quote'],
        },
      },
      domain: {
        calculateTotal: (items) => items.reduce((acc, curr) => acc + curr.price * curr.qty, 0),
      },
      service: ({ repository, clock }) => ({
        submitOrder: async (data: any) => {
          const total = testPlugin.domain.calculateTotal(data.items);
          return repository.saveOrder({
            ...data,
            total,
            createdAt: clock.iso(),
          });
        },
      }),
      routes: [
        {
          path: '/quote',
          method: 'POST',
          handler: (ctx) => {
            const total = testPlugin.domain.calculateTotal(ctx.body.items || []);
            return { total };
          },
        },
        {
          path: '/orders',
          method: 'POST',
          requiresAuth: true,
          scopes: ['pos.write'],
          entitlement: { feature: 'pos.orders' },
          handler: async (ctx) => {
            const order = await ctx.services.submitOrder(ctx.body);
            return {
              status: 201,
              body: { success: true, order },
            };
          },
        },
      ],
      migrations: [
        {
          id: '20261025_pos_init',
          up: async (ctx: any) => {
            ctx.tablesCreated.push('pos_orders');
          },
        },
      ],
    });

    it('should execute pure domain functions with zero external IO', () => {
      const items = [
        { price: 100, qty: 2 },
        { price: 50, qty: 1 },
      ];
      const total = testPlugin.domain.calculateTotal(items);
      expect(total).toBe(250);
    });

    it('should inject custom repository and mock clock into service factory', async () => {
      const mockSaved: any[] = [];
      const mockRepo: MockRepo = {
        saveOrder: async (order) => {
          mockSaved.push(order);
          return { id: 'ord_123', ...order };
        },
      };

      const mockClock: PluginClock = {
        now: () => new Date('2026-10-25T12:00:00Z'),
        iso: () => '2026-10-25T12:00:00.000Z',
      };

      const loaded = PluginContractLoader.loadPlugin(testPlugin, {
        repositories: { 'pos-test': mockRepo },
        clock: mockClock,
      });

      expect(loaded.isLoaded).toBe(true);
      expect(loaded.routes.length).toBe(2);

      const res = await loaded.service.submitOrder({
        customer: 'Alice',
        items: [{ price: 200, qty: 3 }],
      });

      expect(res.id).toBe('ord_123');
      expect(res.total).toBe(600);
      expect(res.createdAt).toBe('2026-10-25T12:00:00.000Z');
      expect(mockSaved.length).toBe(1);
    });

    it('should execute declarative migrations sequentially', async () => {
      const migrationCtx = { tablesCreated: [] as string[] };
      const loaded = PluginContractLoader.loadPlugin(testPlugin);

      await PluginContractLoader.runMigrations(loaded, migrationCtx);
      expect(migrationCtx.tablesCreated).toEqual(['pos_orders']);
    });
  });

  describe('Express Router Compilation & Guard Enforcement', () => {
    let app: express.Express;
    let server: http.Server;
    let baseUrl: string;

    const authGuardedPlugin: OrbitoXPlugin = defineOrbitoXPlugin({
      manifest: {
        id: 'secure-plugin',
        name: '@orbitox/secure-plugin',
        version: '1.0.0',
        displayName: 'Secure Plugin',
        entitlements: {
          features: ['premium_feature'],
        },
      },
      domain: {},
      service: {
        getData: () => ({ sensitive: 'classified_data' }),
      },
      routes: [
        {
          path: '/public',
          method: 'GET',
          handler: () => ({ message: 'public_ok' }),
        },
        {
          path: '/protected',
          method: 'GET',
          requiresAuth: true,
          scopes: ['secure.read'],
          handler: (ctx) => ({ user: ctx.user?.id, data: ctx.services.getData() }),
        },
        {
          path: '/premium',
          method: 'GET',
          entitlement: { feature: 'premium_feature' },
          handler: () => ({ premium: true }),
        },
      ],
    });

    beforeAll((done) => {
      app = express();
      app.use(express.json());

      // Simulate a tenant resolver and optional auth header reader
      app.use((req: any, res, next) => {
        const tenantHeader = req.headers['x-tenant-id'];
        const isPremium = req.headers['x-tenant-premium'] === 'true';
        if (tenantHeader) {
          req.tenant = {
            tenantId: tenantHeader,
            features: isPremium ? ['premium_feature'] : [],
          };
        }

        const authHeader = req.headers['authorization'];
        if (authHeader === 'Bearer valid_token') {
          req.user = { id: 'usr_alice', scopes: ['secure.read'] };
        } else if (authHeader === 'Bearer bad_scope_token') {
          req.user = { id: 'usr_bob', scopes: ['other.scope'] };
        }
        next();
      });

      const loaded = PluginContractLoader.loadPlugin(authGuardedPlugin);
      const pluginRouter = PluginContractLoader.compileExpressRouter(loaded);
      app.use('/api', pluginRouter);

      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}/api`;
        done();
      });
    });

    afterAll((done) => {
      server.close(done);
    });

    it('should allow public routes without authentication or tenant', async () => {
      const res = await fetch(`${baseUrl}/public`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ message: 'public_ok' });
    });

    it('should reject unauthenticated requests to protected route with 401', async () => {
      const res = await fetch(`${baseUrl}/protected`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('should reject authenticated requests with missing scopes with 403', async () => {
      const res = await fetch(`${baseUrl}/protected`, {
        headers: { Authorization: 'Bearer bad_scope_token' },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FORBIDDEN');
    });

    it('should allow authenticated requests with valid scopes with 200', async () => {
      const res = await fetch(`${baseUrl}/protected`, {
        headers: { Authorization: 'Bearer valid_token' },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBe('usr_alice');
      expect(body.data).toEqual({ sensitive: 'classified_data' });
    });

    it('should reject requests when tenant lacks feature entitlement with 403', async () => {
      const res = await fetch(`${baseUrl}/premium`, {
        headers: { 'x-tenant-id': 'tenant_standard' },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('FEATURE_NOT_ENTITLED');
      expect(body.feature).toBe('premium_feature');
    });

    it('should allow requests when tenant possesses feature entitlement with 200', async () => {
      const res = await fetch(`${baseUrl}/premium`, {
        headers: {
          'x-tenant-id': 'tenant_enterprise',
          'x-tenant-premium': 'true',
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ premium: true });
    });
  });
});

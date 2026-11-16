import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '../generated/prisma';
import {
  getCleanStarterTemplate,
  CLEAN_STARTER_TEMPLATES,
  issuePreviewCapabilityToken,
  verifyPreviewCapabilityToken,
  signBridgeRequest,
  getDefaultBridgeKeys,
} from '../src/shared';

process.env.NODE_ENV = 'test';
process.env.RESTAURANTOS_DISABLE_AUTOLISTEN = 'true';
process.env.DATABASE_URL ||= 'postgresql://apple@localhost:5432/restaurant_os';

const prisma = new PrismaClient();
const bridgeKeys = getDefaultBridgeKeys();

describe('Phase 7 F1–F4 Security Remediation: Preview Test Orders & Accounting Gate', () => {
  let serverInstance: http.Server;
  let closeRuntimeServer: () => Promise<void>;
  let baseUrl = '';
  let previewTenantId = '';
  let activeTenantId = '';
  let expiredTenantId = '';
  let sentinelTenantId = '';
  let previewSlug = '';
  let activeSlug = '';
  let expiredSlug = '';
  let sentinelSlug = '';
  let testBranchId = '';
  let previewTableNumber = 'T-101';
  let activeTableNumber = 'T-201';
  let expiredTableNumber = 'T-301';
  let sentinelTableNumber = 'T-999';
  let sentinelOrderId = '';
  let sentinelTaskId = '';
  let sampleItems: any[] = [];
  const testTenantIds = new Set<string>();
  const testOrderIds = new Set<string>();
  const testTaskIds = new Set<string>();

  before(async () => {
    try {
      const serverModule = await import('../src/server');
      const handleRequest = serverModule.handleRequest;
      closeRuntimeServer = serverModule.closeRuntimeServer;

      await new Promise<void>((resolve) => {
        serverInstance = http.createServer(handleRequest);
        serverInstance.listen(0, '127.0.0.1', () => {
          const addr = serverInstance.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });

      const { TenantProvisioningService } = await import('../src/shared/provisioning');
      const provisioningService = new TenantProvisioningService(prisma);

      const runId = crypto.randomBytes(4).toString('hex');
      previewSlug = `prev-resto-${runId}`;
      activeSlug = `active-resto-${runId}`;
      expiredSlug = `exp-resto-${runId}`;
      sentinelSlug = `sent-resto-${runId}`;

      previewTenantId = `org/test-org-${runId}/project/${previewSlug}/environment/prod`;
      activeTenantId = `org/test-org-${runId}/project/${activeSlug}/environment/prod`;
      expiredTenantId = `org/test-org-${runId}/project/${expiredSlug}/environment/prod`;
      sentinelTenantId = `org/sentinel-org-${runId}/project/${sentinelSlug}/environment/prod`;

      // Track test tenants for scoped cleanup (sentinel is tracked separately)
      testTenantIds.add(previewTenantId);
      testTenantIds.add(activeTenantId);
      testTenantIds.add(expiredTenantId);

      // Provision preview tenant via authoritative TenantProvisioningService
      await provisioningService.provisionTenant({
        tenantId: previewTenantId,
        slug: previewSlug,
        restaurantName: 'Preview Masala Lounge',
        status: 'preview',
        planId: 'restaurant-starter',
        templateId: 'saffron',
        tableCount: 6,
      });

      // Provision active tenant via authoritative TenantProvisioningService
      await provisioningService.provisionTenant({
        tenantId: activeTenantId,
        slug: activeSlug,
        restaurantName: 'Active Masala Kitchen',
        status: 'active',
        planId: 'restaurant-starter',
        templateId: 'saffron',
        tableCount: 6,
      });

      // Provision expired preview tenant
      await provisioningService.provisionTenant({
        tenantId: expiredTenantId,
        slug: expiredSlug,
        restaurantName: 'Expired Masala Kitchen',
        status: 'preview',
        planId: 'restaurant-starter',
        templateId: 'saffron',
        tableCount: 6,
      });
      await prisma.tenant.update({
        where: { id: expiredTenantId },
        data: { previewExpiresAt: new Date(Date.now() - 3600000) },
      });

      // Provision sentinel tenant (unrelated tenant whose data must survive untouched)
      await provisioningService.provisionTenant({
        tenantId: sentinelTenantId,
        slug: sentinelSlug,
        restaurantName: 'Sentinel Sovereign Bistro',
        status: 'active',
        planId: 'restaurant-starter',
        templateId: 'saffron',
        tableCount: 4,
      });

      const sBranch = await prisma.branch.findFirst({ where: { tenantId: sentinelTenantId } });
      const sTable = await prisma.tableFloor.findFirst({ where: { tenantId: sentinelTenantId } });
      sentinelTableNumber = sTable?.number || 'T-999';

      sentinelOrderId = `ord_sentinel_${runId}`;
      await prisma.restaurantOrder.create({
        data: {
          id: sentinelOrderId,
          tenantId: sentinelTenantId,
          branchId: sBranch?.id || 'branch_sentinel',
          tableNumber: sentinelTableNumber,
          sessionId: `sess_sentinel_${runId}`,
          status: 'CONFIRMED',
          subtotalMinor: 50000,
          taxMinor: 2500,
          totalMinor: 52500,
          currency: 'INR',
          items: [],
          isTest: false,
        },
      });

      sentinelTaskId = `task_sentinel_${runId}`;
      await prisma.kitchenTask.create({
        data: {
          id: sentinelTaskId,
          tenantId: sentinelTenantId,
          orderId: sentinelOrderId,
          branchId: sBranch?.id || 'branch_sentinel',
          tableNumber: sentinelTableNumber,
          itemName: 'Sentinel Special Tikka',
          quantity: 1,
          station: 'GRILL',
          status: 'PREPARING',
          isTest: false,
        },
      });

      const prevTable = await prisma.tableFloor.findFirst({ where: { tenantId: previewTenantId } });
      previewTableNumber = prevTable?.number || 'T-01';

      const actTable = await prisma.tableFloor.findFirst({ where: { tenantId: activeTenantId } });
      activeTableNumber = actTable?.number || 'T-01';

      const expTable = await prisma.tableFloor.findFirst({ where: { tenantId: expiredTenantId } });
      expiredTableNumber = expTable?.number || 'T-01';

      const prevItem = await prisma.menuItem.findFirst({ where: { tenantId: previewTenantId } });
      sampleItems = [
        {
          id: prevItem?.id || 'item_1',
          name: prevItem?.name || 'Tandoori Murgh Half',
          quantity: 2,
          unitPriceMinor: prevItem?.basePriceMinor || 38000,
          station: prevItem?.station || 'GRILL',
        },
      ];
    } catch (err) {
      console.error('[BEFORE HOOK ERROR]:', err);
      throw err;
    }
  });



  async function makeRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: any
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: any }> {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined;
      const parsedUrl = new URL(baseUrl);
      const req = http.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path,
          method,
          headers: {
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...headers,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let json: any = null;
            try {
              json = JSON.parse(data);
            } catch {
              json = data;
            }
            resolve({ status: res.statusCode || 500, headers: res.headers, json });
          });
        }
      );
      req.on('error', reject);
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Starter Template Catalogue Integrity
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Starter Template Catalogue Alignment', () => {
    it('resolves saffron, ember, sage, and ocean templates by ID and slug', () => {
      const saffron = getCleanStarterTemplate('saffron');
      assert.equal(saffron.slug, 'saffron');
      assert.ok(saffron.categories.length > 0);

      const ember = getCleanStarterTemplate('ember');
      assert.equal(ember.slug, 'ember');
      assert.ok(ember.categories.length > 0);

      const sage = getCleanStarterTemplate('sage');
      assert.equal(sage.slug, 'sage');
      assert.ok(sage.categories.length > 0);

      const ocean = getCleanStarterTemplate('ocean');
      assert.equal(ocean.slug, 'ocean');
      assert.ok(ocean.categories.length > 0);
    });

    it('throws INVALID_STARTER_TEMPLATE error when an unknown template is requested (fail-closed)', () => {
      assert.throws(
        () => getCleanStarterTemplate('cyberpunk_neon_diner'),
        (err: any) => {
          assert.match(err.message, /INVALID_STARTER_TEMPLATE/);
          return true;
        }
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Preview Capability Token Cryptographic Verification
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Preview Capability Token Security', () => {
    it('issues a cryptographically signed orb_prev token and verifies it against the correct tenant', () => {
      const token = issuePreviewCapabilityToken({
        tenantId: previewTenantId,
        sub: 'usr_owner_123',
        ttlSeconds: 600,
      });
      assert.ok(token.startsWith('orb_prev.'), 'Token must start with orb_prev. prefix');

      const verification = verifyPreviewCapabilityToken(token, previewTenantId);
      assert.equal(verification.valid, true);
      assert.equal(verification.claims?.sub, 'usr_owner_123');
      assert.equal(verification.claims?.tenantId, previewTenantId);
    });

    it('rejects preview capability token when evaluated against a foreign tenant', () => {
      const token = issuePreviewCapabilityToken({
        tenantId: previewTenantId,
        sub: 'usr_owner_123',
        ttlSeconds: 600,
      });

      const verification = verifyPreviewCapabilityToken(token, activeTenantId);
      assert.equal(verification.valid, false);
      assert.ok(verification.error);
    });

    it('rejects tampered or malformed preview capability token', () => {
      const token = issuePreviewCapabilityToken({
        tenantId: previewTenantId,
        sub: 'usr_owner_123',
        ttlSeconds: 600,
      });
      const tampered = token.slice(0, -6) + 'xxxxxx';
      const verification = verifyPreviewCapabilityToken(tampered, previewTenantId);
      assert.equal(verification.valid, false);
      assert.match(verification.error || '', /INVALID_SIGNATURE/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. P0: Preview Test Order Authorization Bypass Remediation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. P0: Test-Order Authorization Boundary', () => {

    it('rejects anonymous caller asserting body.isTest against preview tenant with 403 PREVIEW_MODE', async () => {
      const res = await makeRequest(
        'POST',
        '/api/restaurant/orders',
        {
          Host: `${previewSlug}.orbitox.live`,
        },
        {
          tableNumber: previewTableNumber,
          items: sampleItems,
          isTest: true,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'PREVIEW_MODE');
      assert.equal(res.json.previewMode, true);
    });

    it('rejects anonymous caller asserting x-orbitox-test-order header against preview tenant with 403 PREVIEW_MODE', async () => {
      const res = await makeRequest(
        'POST',
        '/api/restaurant/orders',
        {
          Host: `${previewSlug}.orbitox.live`,
          'x-orbitox-test-order': 'true',
        },
        {
          tableNumber: previewTableNumber,
          items: sampleItems,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'PREVIEW_MODE');
    });

    it('rejects caller asserting isTest against an ACTIVE tenant with 403 TEST_ORDERS_ONLY_IN_PREVIEW', async () => {
      const res = await makeRequest(
        'POST',
        '/api/restaurant/orders',
        {
          Host: `${activeSlug}.orbitox.live`,
        },
        {
          tableNumber: activeTableNumber,
          items: sampleItems,
          isTest: true,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'TEST_ORDERS_ONLY_IN_PREVIEW');
    });

    it('rejects test order against an ACTIVE tenant even with valid preview token with 403 TEST_ORDERS_ONLY_IN_PREVIEW', async () => {
      const previewToken = issuePreviewCapabilityToken({
        tenantId: activeTenantId,
        sub: 'usr_active_owner',
        ttlSeconds: 600,
      });

      const res = await makeRequest(
        'POST',
        '/api/restaurant/orders',
        {
          Host: `${activeSlug}.orbitox.live`,
          Authorization: `Bearer ${previewToken}`,
        },
        {
          tableNumber: activeTableNumber,
          items: sampleItems,
          isTest: true,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'TEST_ORDERS_ONLY_IN_PREVIEW');
    });

    it('rejects test order against an EXPIRED preview tenant with 403 PREVIEW_EXPIRED', async () => {
      const previewToken = issuePreviewCapabilityToken({
        tenantId: expiredTenantId,
        sub: 'usr_exp_owner',
        ttlSeconds: 600,
      });

      const res = await makeRequest(
        'POST',
        '/api/restaurant/orders',
        {
          Host: `${expiredSlug}.orbitox.live`,
          Authorization: `Bearer ${previewToken}`,
        },
        {
          tableNumber: expiredTableNumber,
          items: sampleItems,
        }
      );

      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'PREVIEW_EXPIRED');
    });

    it('rejects platform bridge request without preview:test-order scope (e.g. generic ADMIN) with 403 INSUFFICIENT_TEST_ORDER_SCOPE', async () => {
      const pathWithQuery = '/api/restaurant/orders';
      const orderBody = {
        tableNumber: previewTableNumber,
        items: sampleItems,
        isTest: true,
      };
      const bodyStr = JSON.stringify(orderBody);

      // Sign with generic ADMIN scope instead of preview:test-order
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'platform_onboarding', scopes: ['ADMIN'] },
        body: bodyStr,
      });

      const res = await makeRequest(
        'POST',
        pathWithQuery,
        {
          ...signedHeaders,
          Host: `${previewSlug}.orbitox.live`,
        },
        orderBody
      );

      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'INSUFFICIENT_TEST_ORDER_SCOPE');
    });

    it('accepts test order when authorized via valid preview capability token', async () => {
      const previewToken = issuePreviewCapabilityToken({
        tenantId: previewTenantId,
        sub: 'usr_test_owner',
        ttlSeconds: 600,
      });

      const res = await makeRequest(
        'POST',
        '/api/restaurant/orders',
        {
          Host: `${previewSlug}.orbitox.live`,
          Authorization: `Bearer ${previewToken}`,
        },
        {
          tableNumber: previewTableNumber,
          items: sampleItems,
        }
      );

      assert.equal(res.status, 201, 'Test order should be created with 201 Created');
      assert.equal(res.headers['x-orbitox-test-order'], 'true', 'Must set x-orbitox-test-order response header');
      assert.equal(res.headers['x-orbitox-preview-mode'], 'true', 'Must set x-orbitox-preview-mode response header');
      assert.ok(res.json.orderId, 'Must return orderId');
      testOrderIds.add(res.json.orderId);

      // Verify order is flagged isTest in PostgreSQL
      const dbOrder = await prisma.restaurantOrder.findUnique({
        where: { id: res.json.orderId },
      });
      assert.ok(dbOrder, 'Order must exist in Postgres');
      assert.equal(dbOrder.isTest, true, 'isTest column must be true in Postgres');

      // Verify kitchen tasks are flagged isTest in PostgreSQL
      const dbTasks = await prisma.kitchenTask.findMany({
        where: { orderId: res.json.orderId },
      });
      assert.ok(dbTasks.length > 0, 'Kitchen tasks must exist');
      for (const task of dbTasks) {
        testTaskIds.add(task.id);
        assert.equal(task.isTest, true, 'Kitchen task must have isTest = true');
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 4. Downstream Statutory & Accounting Protections
      // ─────────────────────────────────────────────────────────────────────────
      // Invoicing must reject test orders
      const invoiceRes = await makeRequest(
        'POST',
        '/api/restaurant/invoices/generate',
        {
          Host: `${previewSlug}.orbitox.live`,
          Authorization: `Bearer ${previewToken}`,
        },
        { orderId: res.json.orderId }
      );
      assert.equal(invoiceRes.status, 400);
      assert.equal(invoiceRes.json.code, 'TEST_ORDER_CANNOT_BE_INVOICED');

      // Payment session must reject test orders
      const payRes = await makeRequest(
        'POST',
        '/api/commerce/payments/create-session',
        {
          Host: `${previewSlug}.orbitox.live`,
          Authorization: `Bearer ${previewToken}`,
        },
        { orderId: res.json.orderId }
      );
      assert.equal(payRes.status, 400);
      assert.equal(payRes.json.code, 'TEST_ORDER_CANNOT_BE_PAID');

      // Monthly order quota count must NOT count test orders
      const nonTestCount = await prisma.restaurantOrder.count({
        where: {
          tenantId: previewTenantId,
          tableNumber: previewTableNumber,
          isTest: false,
        },
      });
      assert.equal(nonTestCount, 0, 'Test orders must not increment billable/quota order count');
    });

    it('accepts test order when authorized via signed platform bridge request', async () => {
      const pathWithQuery = '/api/restaurant/orders';
      const orderBody = {
        tableNumber: previewTableNumber,
        items: sampleItems,
        isTest: true,
      };
      const bodyStr = JSON.stringify(orderBody);

      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'platform_onboarding', scopes: ['preview:test-order'] },
        body: bodyStr,
      });

      const res = await makeRequest(
        'POST',
        pathWithQuery,
        {
          ...signedHeaders,
          Host: `${previewSlug}.orbitox.live`,
        },
        orderBody
      );

      assert.equal(res.status, 201);
      assert.equal(res.headers['x-orbitox-test-order'], 'true');
      assert.ok(res.json.orderId);
      testOrderIds.add(res.json.orderId);

      const dbOrder = await prisma.restaurantOrder.findUnique({
        where: { id: res.json.orderId },
      });
      assert.equal(dbOrder?.isTest, true);

      const tasks = await prisma.kitchenTask.findMany({ where: { orderId: res.json.orderId } });
      for (const t of tasks) {
        testTaskIds.add(t.id);
      }
    });

    it('sentinel data safety: unrelated tenant order and task remain untouched and fully intact', async () => {
      const sOrder = await prisma.restaurantOrder.findUnique({
        where: { id: sentinelOrderId },
      });
      assert.ok(sOrder, 'Sentinel order must exist untouched');
      assert.equal(sOrder.tenantId, sentinelTenantId);
      assert.equal(sOrder.isTest, false);

      const sTask = await prisma.kitchenTask.findUnique({
        where: { id: sentinelTaskId },
      });
      assert.ok(sTask, 'Sentinel kitchen task must exist untouched');
      assert.equal(sTask.tenantId, sentinelTenantId);
      assert.equal(sTask.orderId, sentinelOrderId);
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise<void>((resolve) => serverInstance.close(() => resolve()));
    }
    if (closeRuntimeServer) {
      await closeRuntimeServer();
    }

    try {
      // 1. Assert sentinel record survival before test cleanup
      const sentinelOrderCheck = await prisma.restaurantOrder.findUnique({
        where: { id: sentinelOrderId },
      });
      assert.ok(sentinelOrderCheck, 'Sentinel order must still exist before suite cleanup');
      const sentinelTaskCheck = await prisma.kitchenTask.findUnique({
        where: { id: sentinelTaskId },
      });
      assert.ok(sentinelTaskCheck, 'Sentinel task must still exist before suite cleanup');

      // 2. Safe, strictly-scoped test data cleanup (by exact IDs only)
      if (testTaskIds.size > 0) {
        await prisma.kitchenTask.deleteMany({
          where: { id: { in: Array.from(testTaskIds) } },
        });
      }
      if (testOrderIds.size > 0) {
        await prisma.restaurantOrder.deleteMany({
          where: { id: { in: Array.from(testOrderIds) } },
        });
      }

      // 3. Clean up test tenants and their relational fixtures
      const tIds = Array.from(testTenantIds);
      if (tIds.length > 0) {
        await prisma.tableFloor.deleteMany({ where: { tenantId: { in: tIds } } });
        await prisma.floor.deleteMany({ where: { tenantId: { in: tIds } } });
        await prisma.branch.deleteMany({ where: { tenantId: { in: tIds } } });
        await prisma.menuItem.deleteMany({ where: { tenantId: { in: tIds } } });
        await prisma.menuCategory.deleteMany({ where: { tenantId: { in: tIds } } });
        await prisma.tenantBrandConfig.deleteMany({ where: { tenantId: { in: tIds } } });
        await prisma.ownerInvite.deleteMany({ where: { tenantId: { in: tIds } } });
        await prisma.tenant.deleteMany({ where: { id: { in: tIds } } });
      }

      // 4. Finally clean up sentinel fixtures safely
      await prisma.kitchenTask.deleteMany({ where: { id: sentinelTaskId } });
      await prisma.restaurantOrder.deleteMany({ where: { id: sentinelOrderId } });
      await prisma.tableFloor.deleteMany({ where: { tenantId: sentinelTenantId } });
      await prisma.floor.deleteMany({ where: { tenantId: sentinelTenantId } });
      await prisma.branch.deleteMany({ where: { tenantId: sentinelTenantId } });
      await prisma.menuItem.deleteMany({ where: { tenantId: sentinelTenantId } });
      await prisma.menuCategory.deleteMany({ where: { tenantId: sentinelTenantId } });
      await prisma.tenantBrandConfig.deleteMany({ where: { tenantId: sentinelTenantId } });
      await prisma.ownerInvite.deleteMany({ where: { tenantId: sentinelTenantId } });
      await prisma.tenant.deleteMany({ where: { id: sentinelTenantId } });
    } catch (cleanupErr) {
      console.error('[SUITE CLEANUP ERROR]:', cleanupErr);
    } finally {
      await prisma.$disconnect();
      setTimeout(() => process.exit(0), 100).unref();
    }
  });
});

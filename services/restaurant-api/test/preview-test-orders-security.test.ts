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
  let previewSlug = '';
  let activeSlug = '';
  let testBranchId = '';
  let previewTableNumber = 'T-101';
  let activeTableNumber = 'T-201';
  let sampleItems: any[] = [];

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
      previewTenantId = `org/test-org-${runId}/project/${previewSlug}/environment/prod`;
      activeTenantId = `org/test-org-${runId}/project/${activeSlug}/environment/prod`;

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

      const prevTable = await prisma.tableFloor.findFirst({ where: { tenantId: previewTenantId } });
      previewTableNumber = prevTable?.number || 'T-01';

      const actTable = await prisma.tableFloor.findFirst({ where: { tenantId: activeTenantId } });
      activeTableNumber = actTable?.number || 'T-01';

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

  after(async () => {
    if (serverInstance) {
      await new Promise<void>((resolve) => serverInstance.close(() => resolve()));
    }
    // Clean up test data
    try {
      const tIds = [previewTenantId, activeTenantId];
      await prisma.kitchenTask.deleteMany({
        where: { orderId: { contains: 'ord_' } },
      });
      await prisma.restaurantOrder.deleteMany({
        where: { tableNumber: { in: [previewTableNumber, activeTableNumber] } },
      });
      await prisma.tableFloor.deleteMany({
        where: { tenantId: { in: tIds } },
      });
      await prisma.floor.deleteMany({
        where: { tenantId: { in: tIds } },
      });
      await prisma.branch.deleteMany({
        where: { tenantId: { in: tIds } },
      });
      await prisma.menuItem.deleteMany({
        where: { tenantId: { in: tIds } },
      });
      await prisma.menuCategory.deleteMany({
        where: { tenantId: { in: tIds } },
      });
      await prisma.tenantBrandConfig.deleteMany({
        where: { tenantId: { in: tIds } },
      });
      await prisma.ownerInvite.deleteMany({
        where: { tenantId: { in: tIds } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: tIds } },
      });
    } catch {}
    await prisma.$disconnect();
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

    it('rejects anonymous caller asserting isTest against an ACTIVE tenant with 403 UNAUTHORIZED_TEST_ORDER', async () => {
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
      assert.equal(res.json.code, 'UNAUTHORIZED_TEST_ORDER');
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

      const dbOrder = await prisma.restaurantOrder.findUnique({
        where: { id: res.json.orderId },
      });
      assert.equal(dbOrder?.isTest, true);
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise<void>((resolve) => serverInstance.close(() => resolve()));
    }
    if (closeRuntimeServer) {
      await closeRuntimeServer();
    }
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 100).unref();
  });
});

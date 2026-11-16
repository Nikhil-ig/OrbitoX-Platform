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
  issueStaffToken,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. P0: Preview KDS Authorization Boundary
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. P0: Preview KDS Authorization Boundary', () => {
    let previewTestOrderId: string;
    let previewTestTaskId: string;
    let commercialOrderId: string;
    let commercialTaskId: string;
    let staffPinToken: string;

    before(async () => {
      // 1. Create a test order and KDS task on preview tenant
      previewTestOrderId = `ord_prev_test_${crypto.randomBytes(4).toString('hex')}`;
      testOrderIds.add(previewTestOrderId);
      await prisma.restaurantOrder.create({
        data: {
          id: previewTestOrderId,
          tenantId: previewTenantId,
          tableNumber: previewTableNumber,
          sessionId: `sess_${previewTableNumber}`,
          status: 'CONFIRMED',
          subtotalMinor: 38000,
          taxMinor: 1900,
          totalMinor: 39900,
          currency: 'INR',
          items: sampleItems,
          isTest: true,
        },
      });

      previewTestTaskId = `task_prev_test_${crypto.randomBytes(4).toString('hex')}`;
      testTaskIds.add(previewTestTaskId);
      await prisma.kitchenTask.create({
        data: {
          id: previewTestTaskId,
          tenantId: previewTenantId,
          orderId: previewTestOrderId,
          tableNumber: previewTableNumber,
          itemName: 'Preview Butter Chicken',
          quantity: 1,
          station: 'CURRY_LINE',
          status: 'QUEUED',
          isTest: true,
        },
      });

      // 2. Create a commercial order and KDS task on preview tenant
      commercialOrderId = `ord_comm_${crypto.randomBytes(4).toString('hex')}`;
      testOrderIds.add(commercialOrderId);
      await prisma.restaurantOrder.create({
        data: {
          id: commercialOrderId,
          tenantId: previewTenantId,
          tableNumber: previewTableNumber,
          sessionId: `sess_${previewTableNumber}`,
          status: 'CONFIRMED',
          subtotalMinor: 40000,
          taxMinor: 2000,
          totalMinor: 42000,
          currency: 'INR',
          items: sampleItems,
          isTest: false,
        },
      });

      commercialTaskId = `task_comm_${crypto.randomBytes(4).toString('hex')}`;
      testTaskIds.add(commercialTaskId);
      await prisma.kitchenTask.create({
        data: {
          id: commercialTaskId,
          tenantId: previewTenantId,
          orderId: commercialOrderId,
          tableNumber: previewTableNumber,
          itemName: 'Commercial Paneer Tikka',
          quantity: 1,
          station: 'TANDOOR',
          status: 'QUEUED',
          isTest: false,
        },
      });

      // 3. Issue staff token for staff KDS workflow tests
      staffPinToken = issueStaffToken({
        tenantId: previewTenantId,
        sub: 'staff_chef_1',
        role: 'CHEF',
        station: 'ALL',
      });
    });

    it('1. platform-bridge with preview:kds:bump can bump test order KDS task on PREVIEW tenant', async () => {
      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: previewTestTaskId };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` }, body);
      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      assert.equal(res.json.data.status, 'IN_PROGRESS');
    });

    it('2. platform-bridge cannot bump commercial task (even on preview tenant)', async () => {
      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: commercialTaskId };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` }, body);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW');
    });

    it('3. rejects preview KDS mutation on non-preview (ACTIVE) tenant', async () => {
      const activeTestOrderId = `ord_act_test_${crypto.randomBytes(4).toString('hex')}`;
      testOrderIds.add(activeTestOrderId);
      await prisma.restaurantOrder.create({
        data: {
          id: activeTestOrderId,
          tenantId: activeTenantId,
          tableNumber: activeTableNumber,
          sessionId: `sess_${activeTableNumber}`,
          status: 'CONFIRMED',
          subtotalMinor: 20000,
          taxMinor: 1000,
          totalMinor: 21000,
          currency: 'INR',
          items: sampleItems,
          isTest: true,
        },
      });

      const activeTestTaskId = `task_act_test_${crypto.randomBytes(4).toString('hex')}`;
      testTaskIds.add(activeTestTaskId);
      await prisma.kitchenTask.create({
        data: {
          id: activeTestTaskId,
          tenantId: activeTenantId,
          orderId: activeTestOrderId,
          tableNumber: activeTableNumber,
          itemName: 'Active Naan',
          quantity: 1,
          station: 'TANDOOR',
          status: 'QUEUED',
          isTest: true,
        },
      });

      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: activeTestTaskId };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: activeTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${activeSlug}.orbitox.live` }, body);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'TEST_TASKS_ONLY_IN_PREVIEW');
    });

    it('4. rejects preview KDS mutation on expired preview tenant', async () => {
      const expiredTestOrderId = `ord_exp_test_${crypto.randomBytes(4).toString('hex')}`;
      testOrderIds.add(expiredTestOrderId);
      await prisma.restaurantOrder.create({
        data: {
          id: expiredTestOrderId,
          tenantId: expiredTenantId,
          tableNumber: expiredTableNumber,
          sessionId: `sess_${expiredTableNumber}`,
          status: 'CONFIRMED',
          subtotalMinor: 20000,
          taxMinor: 1000,
          totalMinor: 21000,
          currency: 'INR',
          items: sampleItems,
          isTest: true,
        },
      });

      const expiredTestTaskId = `task_exp_test_${crypto.randomBytes(4).toString('hex')}`;
      testTaskIds.add(expiredTestTaskId);
      await prisma.kitchenTask.create({
        data: {
          id: expiredTestTaskId,
          tenantId: expiredTenantId,
          orderId: expiredTestOrderId,
          tableNumber: expiredTableNumber,
          itemName: 'Expired Roti',
          quantity: 1,
          station: 'TANDOOR',
          status: 'QUEUED',
          isTest: true,
        },
      });

      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: expiredTestTaskId };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: expiredTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${expiredSlug}.orbitox.live` }, body);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'PREVIEW_EXPIRED');
    });

    it('5. rejects cross-tenant KDS task bump', async () => {
      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: previewTestTaskId };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: activeTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${activeSlug}.orbitox.live` }, body);
      assert.ok([403, 404].includes(res.status));
      if (res.status === 403) {
        assert.ok(['TASK_TENANT_MISMATCH', 'TEST_TASKS_ONLY_IN_PREVIEW'].includes(res.json.code));
      }
    });

    it('6. rejects platform-bridge request without narrow preview scope (arbitrary scope)', async () => {
      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: previewTestTaskId };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['arbitrary:scope'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` }, body);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'INSUFFICIENT_KDS_SCOPE');
    });

    it('7. rejects generic ADMIN platform-bridge request without preview:kds:bump scope', async () => {
      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: previewTestTaskId };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['ADMIN'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` }, body);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'INSUFFICIENT_KDS_SCOPE');
    });

    it('8. rejects task bump if task is test but parent order is commercial', async () => {
      const mismatchedOrderId = `ord_mis_${crypto.randomBytes(4).toString('hex')}`;
      testOrderIds.add(mismatchedOrderId);
      await prisma.restaurantOrder.create({
        data: {
          id: mismatchedOrderId,
          tenantId: previewTenantId,
          tableNumber: previewTableNumber,
          sessionId: `sess_${previewTableNumber}`,
          status: 'CONFIRMED',
          subtotalMinor: 10000,
          taxMinor: 500,
          totalMinor: 10500,
          currency: 'INR',
          items: sampleItems,
          isTest: false,
        },
      });

      const mismatchedTaskId = `task_mis_${crypto.randomBytes(4).toString('hex')}`;
      testTaskIds.add(mismatchedTaskId);
      await prisma.kitchenTask.create({
        data: {
          id: mismatchedTaskId,
          tenantId: previewTenantId,
          orderId: mismatchedOrderId,
          tableNumber: previewTableNumber,
          itemName: 'Mismatched Dal',
          quantity: 1,
          station: 'CURRY_LINE',
          status: 'QUEUED',
          isTest: true,
        },
      });

      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: mismatchedTaskId };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` }, body);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW');
    });

    it('9. staff KDS workflows unaffected: CHEF can bump commercial task', async () => {
      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: commercialTaskId };
      const res = await makeRequest(
        'POST',
        pathWithQuery,
        {
          Host: `${previewSlug}.orbitox.live`,
          Authorization: `Bearer ${staffPinToken}`,
        },
        body
      );

      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
    });

    it('10. staff KDS workflows unaffected: CHEF can bump test task', async () => {
      const pathWithQuery = '/api/restaurant/kds/bump';
      const body = { taskId: previewTestTaskId };
      const res = await makeRequest(
        'POST',
        pathWithQuery,
        {
          Host: `${previewSlug}.orbitox.live`,
          Authorization: `Bearer ${staffPinToken}`,
        },
        body
      );

      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
    });

    it('11. anonymous GET /api/restaurant/kds and /tasks rejected with 401 UNAUTHENTICATED', async () => {
      const res1 = await makeRequest('GET', '/api/restaurant/kds', { Host: `${previewSlug}.orbitox.live` });
      assert.equal(res1.status, 401);
      assert.equal(res1.json.code, 'UNAUTHENTICATED');

      const res2 = await makeRequest('GET', '/api/restaurant/kds/tasks', { Host: `${previewSlug}.orbitox.live` });
      assert.equal(res2.status, 401);
      assert.equal(res2.json.code, 'UNAUTHENTICATED');
    });

    it('12. platform-bridge GET without preview:kds:read scope rejected with 403 INSUFFICIENT_KDS_SCOPE', async () => {
      const pathWithQuery = '/api/restaurant/kds/tasks';
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'GET',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] }, // wrong scope
      });

      const res = await makeRequest('GET', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` });
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'INSUFFICIENT_KDS_SCOPE');
    });

    it('13. rejects preview KDS read on non-preview (ACTIVE) tenant', async () => {
      const pathWithQuery = '/api/restaurant/kds/tasks';
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'GET',
        pathWithQuery,
        tenantId: activeTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:read'] },
      });

      const res = await makeRequest('GET', pathWithQuery, { ...signedHeaders, Host: `${activeSlug}.orbitox.live` });
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'TEST_TASKS_ONLY_IN_PREVIEW');
    });

    it('14. rejects preview KDS read on expired preview tenant', async () => {
      const pathWithQuery = '/api/restaurant/kds/tasks';
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'GET',
        pathWithQuery,
        tenantId: expiredTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:read'] },
      });

      const res = await makeRequest('GET', pathWithQuery, { ...signedHeaders, Host: `${expiredSlug}.orbitox.live` });
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'PREVIEW_EXPIRED');
    });

    it('15. platform-bridge GET with preview:kds:read returns ONLY test tasks without commercial task leakage', async () => {
      const pathWithQuery = '/api/restaurant/kds/tasks';
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'GET',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:read'] },
      });

      const res = await makeRequest('GET', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` });
      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      const tasks = res.json.tasks || res.json.data || [];
      assert.ok(tasks.length > 0, 'Must contain test tasks');
      for (const t of tasks) {
        assert.equal(t.isTest, true, 'Every returned task must have isTest = true');
        assert.notEqual(t.id, commercialTaskId, 'Must NEVER leak commercial tasks');
      }
    });

    it('16. staff caller can GET all tasks including commercial tasks', async () => {
      const res = await makeRequest(
        'GET',
        '/api/restaurant/kds/tasks',
        {
          Host: `${previewSlug}.orbitox.live`,
          Authorization: `Bearer ${staffPinToken}`,
        }
      );

      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      const tasks = res.json.tasks || res.json.data || [];
      const foundCommercial = tasks.some((t: any) => t.id === commercialTaskId);
      assert.ok(foundCommercial, 'Staff must be able to see commercial tasks');
    });

    it('17. platform-bridge with preview:kds:bump scope attempting recall is rejected with 403 INSUFFICIENT_KDS_SCOPE', async () => {
      const pathWithQuery = '/api/restaurant/kds/recall';
      const body = { taskId: previewTestTaskId, targetStatus: 'READY' };
      const bodyStr = JSON.stringify(body);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` }, body);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'INSUFFICIENT_KDS_SCOPE');
    });

    it('18. platform-bridge with preview:kds:bump scope attempting expo-dispatch or fulfill is rejected with 403', async () => {
      const dispatchPath = '/api/restaurant/kds/expo-dispatch';
      const dispatchBody = { tableNumber: previewTableNumber };
      const signedDispatch = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: dispatchPath,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: JSON.stringify(dispatchBody),
      });
      const res1 = await makeRequest('POST', dispatchPath, { ...signedDispatch, Host: `${previewSlug}.orbitox.live` }, dispatchBody);
      assert.equal(res1.status, 403);
      assert.equal(res1.json.code, 'INSUFFICIENT_KDS_SCOPE');

      const fulfillPath = '/api/restaurant/kds/fulfill-item';
      const fulfillBody = { taskId: previewTestTaskId, targetCount: 1 };
      const signedFulfill = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: fulfillPath,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: JSON.stringify(fulfillBody),
      });
      const res2 = await makeRequest('POST', fulfillPath, { ...signedFulfill, Host: `${previewSlug}.orbitox.live` }, fulfillBody);
      assert.equal(res2.status, 403);
      assert.equal(res2.json.code, 'INSUFFICIENT_KDS_SCOPE');
    });

    it('19. expo-recall rejects preview:kds:bump scope with 403 INSUFFICIENT_KDS_SCOPE', async () => {
      const recallPath = '/api/restaurant/kds/expo-recall';
      const recallBody = { tableNumber: previewTableNumber };
      const signed = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: recallPath,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:bump'] },
        body: JSON.stringify(recallBody),
      });

      const res = await makeRequest('POST', recallPath, { ...signed, Host: `${previewSlug}.orbitox.live` }, recallBody);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'INSUFFICIENT_KDS_SCOPE');
    });

    it('20. expo-recall rejects caller on expired preview tenant with 403 PREVIEW_EXPIRED', async () => {
      // Create a bumped test task on the expired tenant
      const expiredTaskId = `task_exp_rec_${crypto.randomBytes(4).toString('hex')}`;
      testTaskIds.add(expiredTaskId);
      await prisma.kitchenTask.create({
        data: {
          id: expiredTaskId,
          tenantId: expiredTenantId,
          orderId: `ord_exp_${crypto.randomBytes(4).toString('hex')}`,
          tableNumber: 'Table 99',
          itemName: 'Expired Naan',
          quantity: 1,
          station: 'TANDOOR',
          status: 'BUMPED',
          isTest: true,
        },
      });

      const recallPath = '/api/restaurant/kds/expo-recall';
      const recallBody = { tableNumber: 'Table 99' };
      const signed = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: recallPath,
        tenantId: expiredTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:recall'] },
        body: JSON.stringify(recallBody),
      });

      const res = await makeRequest('POST', recallPath, { ...signed, Host: `${expiredSlug}.orbitox.live` }, recallBody);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'PREVIEW_EXPIRED');
    });

    it('21. expo-recall rejects commercial bumped task in preview tenant with 403 CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW', async () => {
      // Update commercial task to BUMPED on previewTableNumber
      await prisma.kitchenTask.update({
        where: { id: commercialTaskId },
        data: { status: 'BUMPED' },
      });

      const recallPath = '/api/restaurant/kds/expo-recall';
      const recallBody = { tableNumber: previewTableNumber };
      const signed = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: recallPath,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:recall'] },
        body: JSON.stringify(recallBody),
      });

      const res = await makeRequest('POST', recallPath, { ...signed, Host: `${previewSlug}.orbitox.live` }, recallBody);
      assert.equal(res.status, 403);
      assert.equal(res.json.code, 'CANNOT_MUTATE_COMMERCIAL_TASK_IN_PREVIEW');

      // Reset commercial task to QUEUED so it doesn't pollute subsequent test assertions
      await prisma.kitchenTask.update({
        where: { id: commercialTaskId },
        data: { status: 'QUEUED' },
      });
    });

    it('22. expo-recall rejects cross-tenant task with 403 TASK_TENANT_MISMATCH', async () => {
      // Create a bumped test task belonging to activeTenantId on Table 77
      const foreignOrderId = `ord_foreign_${crypto.randomBytes(4).toString('hex')}`;
      testOrderIds.add(foreignOrderId);
      await prisma.restaurantOrder.create({
        data: {
          id: foreignOrderId,
          tenantId: activeTenantId,
          tableNumber: 'Table 77',
          sessionId: 'sess_77',
          status: 'CONFIRMED',
          subtotalMinor: 1000,
          taxMinor: 50,
          totalMinor: 1050,
          currency: 'INR',
          items: sampleItems,
          isTest: true,
        },
      });

      const foreignTaskId = `task_foreign_${crypto.randomBytes(4).toString('hex')}`;
      testTaskIds.add(foreignTaskId);
      await prisma.kitchenTask.create({
        data: {
          id: foreignTaskId,
          tenantId: activeTenantId,
          orderId: foreignOrderId,
          tableNumber: 'Table 77',
          itemName: 'Cross Roti',
          quantity: 1,
          station: 'TANDOOR',
          status: 'BUMPED',
          isTest: true,
        },
      });

      const recallPath = '/api/restaurant/kds/expo-recall';
      const recallBody = { tableNumber: 'Table 77' };
      const signed = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: recallPath,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:recall'] },
        body: JSON.stringify(recallBody),
      });

      const res = await makeRequest('POST', recallPath, { ...signed, Host: `${previewSlug}.orbitox.live` }, recallBody);
      assert.ok([400, 403].includes(res.status), 'Cross-tenant task recall must be rejected with 400 or 403');
      if (res.status === 403) {
        assert.equal(res.json.code, 'TASK_TENANT_MISMATCH');
      } else {
        assert.equal(res.json.code, 'TASKS_NOT_FOUND');
      }
    });

    it('23. expo-recall succeeds with preview:kds:recall on valid preview test task', async () => {
      // Set preview test task to BUMPED
      await prisma.kitchenTask.update({
        where: { id: previewTestTaskId },
        data: { status: 'BUMPED' },
      });

      const recallPath = '/api/restaurant/kds/expo-recall';
      const recallBody = { tableNumber: previewTableNumber };
      const signed = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: recallPath,
        tenantId: previewTenantId,
        principal: { sub: 'usr_owner_123', scopes: ['preview:kds:recall'] },
        body: JSON.stringify(recallBody),
      });

      const res = await makeRequest('POST', recallPath, { ...signed, Host: `${previewSlug}.orbitox.live` }, recallBody);
      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      assert.equal(res.json.tableNumber, previewTableNumber);

      const dbTask = await prisma.kitchenTask.findUnique({ where: { id: previewTestTaskId } });
      assert.equal(dbTask?.status, 'READY');
    });

    it('24. expo-recall succeeds for authorized staff (CHEF/EXPO)', async () => {
      // Set task to BUMPED first
      await prisma.kitchenTask.update({
        where: { id: previewTestTaskId },
        data: { status: 'BUMPED' },
      });

      const res = await makeRequest(
        'POST',
        '/api/restaurant/kds/expo-recall',
        {
          Host: `${previewSlug}.orbitox.live`,
          Authorization: `Bearer ${staffPinToken}`,
        },
        { tableNumber: previewTableNumber }
      );

      assert.equal(res.status, 200);
      assert.equal(res.json.success, true);
      const dbTask = await prisma.kitchenTask.findUnique({ where: { id: previewTestTaskId } });
      assert.equal(dbTask?.status, 'READY');
    });

    it('25. station:kds bridge principal cannot access admin/billing/domains or tables (scope isolation)', async () => {
      const pathWithQuery = '/api/restaurant/tables';
      const body = { tableNumber: 'Table 999', capacity: 4 };
      const bodyStr = JSON.stringify(body);

      // Sign bridge request with strictly station:kds (kitchen station role, NOT generic admin)
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: previewTenantId,
        principal: { sub: 'kds_hardware_terminal', scopes: ['station:kds'] },
        body: bodyStr,
      });

      const res = await makeRequest('POST', pathWithQuery, { ...signedHeaders, Host: `${previewSlug}.orbitox.live` }, body);
      assert.equal(res.status, 403);
      assert.equal(res.json.error, 'FORBIDDEN');
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

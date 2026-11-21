import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'http';
import {
  getDefaultBridgeKeys,
  signBridgeRequest,
} from '../src/shared';

process.env.NODE_ENV = 'test';
process.env.RESTAURANTOS_DISABLE_AUTOLISTEN = 'true';

describe('RestaurantOS F6 Hardware & Station Trust Boundaries', () => {
  let serverInstance: http.Server;
  let baseUrl = '';
  const bridgeKeys = getDefaultBridgeKeys();
  const testTenantId = 'org/org_test/project/proj_test/environment/prod';

  before(async () => {
    const serverModule = await import('../src/server');
    const handleRequest = serverModule.handleRequest;

    await new Promise<void>((resolve) => {
      serverInstance = http.createServer((req, res) => {
        handleRequest(req, res).catch((err) => {
          console.error('Test server error:', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message || 'INTERNAL_SERVER_ERROR' }));
          }
        });
      });
      serverInstance.listen(0, '127.0.0.1', () => {
        const addr = serverInstance.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise<void>((resolve) => serverInstance.close(() => resolve()));
    }
    try {
      const serverModule = await import('../src/server');
      if (serverModule.closeRuntimeServer) {
        await serverModule.closeRuntimeServer();
      }
    } catch {}
    setTimeout(() => process.exit(0), 100).unref();
  });

  describe('1. Thermal Printer Hardware Anti-Forgery & Production Isolation', () => {
    it('rejects invalid or forged bridge signatures with 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/restaurant/printer/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-orbitox-signature': 'forged_invalid_signature_hex',
          'x-orbitox-key-id': 'k1',
          'x-orbitox-timestamp': String(Date.now()),
          'x-orbitox-nonce': 'nonce_123',
          'x-orbitox-tenant': testTenantId,
        },
        body: JSON.stringify({ endpoint: '192.168.1.200:9100' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'UNAUTHORIZED');
    });

    it('rejects unauthorized bridge callers without devices:printer or tenant:admin scope with 403', async () => {
      const pathWithQuery = '/api/restaurant/printer/test';
      const body = JSON.stringify({ endpoint: '192.168.1.200:9100', driver: 'epson_escpos' });
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: 'usr_guest', scopes: ['tables:read'] },
        body,
      });

      const res = await fetch(`${baseUrl}${pathWithQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...signedHeaders },
        body,
      });
      assert.strictEqual(res.status, 403);
    });

    it('in production mode, strictly rejects hard-coded or random fixture tokens with 503', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalBridgeKeys = process.env.ORBITOX_BRIDGE_KEYS;
      process.env.NODE_ENV = 'production';
      process.env.ORBITOX_BRIDGE_KEYS = JSON.stringify({
        activeKeyId: bridgeKeys.activeKeyId,
        keys: bridgeKeys.keys,
      });

      try {
        const pathWithQuery = '/api/restaurant/printer/test';
        const body = JSON.stringify({
          endpoint: '192.168.1.200:9100',
          driver: 'epson_escpos',
          mockHardwareAckToken: 'test_hw_fixture_token',
        });
        const signedHeaders = signBridgeRequest(bridgeKeys, {
          method: 'POST',
          pathWithQuery,
          tenantId: testTenantId,
          principal: { sub: 'usr_admin', scopes: ['tenant:admin', 'devices:printer'] },
          body,
        });

        const res = await fetch(`${baseUrl}${pathWithQuery}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...signedHeaders },
          body,
        });

        assert.strictEqual(res.status, 503, 'In production, fixture tokens MUST NOT return 200 hardware acknowledgement');
        const data = await res.json();
        assert.strictEqual(data.code, 'PRINTER_HARDWARE_UNAVAILABLE');
        assert.strictEqual(data.acknowledged, false);
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalBridgeKeys === undefined) {
          delete process.env.ORBITOX_BRIDGE_KEYS;
        } else {
          process.env.ORBITOX_BRIDGE_KEYS = originalBridgeKeys;
        }
      }
    });

    it('in non-production mode, returns clearly marked simulated status without hardware acknowledgement', async () => {
      const pathWithQuery = '/api/restaurant/printer/test';
      const body = JSON.stringify({
        endpoint: '192.168.1.200:9100',
        driver: 'epson_escpos',
      });
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: 'usr_admin', scopes: ['tenant:admin', 'devices:printer'] },
        body,
      });

      const res = await fetch(`${baseUrl}${pathWithQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...signedHeaders },
        body,
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.acknowledged, false, 'Simulated adapter MUST NOT report acknowledged: true');
      assert.strictEqual(data.isSimulation, true, 'Simulated adapter MUST report isSimulation: true');
      assert.strictEqual(data.simulated, true);
    });

    it('rejects fabricated hardware acknowledgements with 503 PRINTER_HARDWARE_UNAVAILABLE', async () => {
      const pathWithQuery = '/api/restaurant/printer/ack';
      const body = JSON.stringify({
        jobId: 'job_real_hw_123',
        deviceIdentity: 'agent_pos_terminal_counter',
        branchId: 'branch_main',
      });
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: 'agent_daemon', scopes: ['devices:printer'] },
        body,
      });

      const res = await fetch(`${baseUrl}${pathWithQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...signedHeaders },
        body,
      });

      assert.strictEqual(res.status, 503);
      const data = await res.json();
      assert.strictEqual(data.acknowledged, false);
      assert.strictEqual(data.code, 'PRINTER_HARDWARE_UNAVAILABLE');
      assert.strictEqual(data.status, 'unconfigured');
      assert.strictEqual(data.hardwareStatus, 'pending');
      assert.strictEqual(data.deviceAckId, undefined);
    });
  });

  describe('2. KDS Station Registration & Durable Heartbeat', () => {
    it('registers a new station with tenant-scoped high-entropy credential', async () => {
      const pathWithQuery = '/api/restaurant/kds/station/register';
      const body = JSON.stringify({
        stationId: 'EXPO_LINE_1',
        branchId: 'branch_main',
        stationType: 'EXPO',
      });
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: 'usr_admin', scopes: ['tenant:admin', 'kds:admin'] },
        body,
      });

      const res = await fetch(`${baseUrl}${pathWithQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...signedHeaders },
        body,
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.stationId, 'EXPO_LINE_1');
      assert.ok(data.stationToken);
      assert.ok(data.stationToken.startsWith('stn_tok_'));
    });

    it('rejects station registration from unauthorized callers', async () => {
      const pathWithQuery = '/api/restaurant/kds/station/register';
      const body = JSON.stringify({ stationId: 'UNAUTH_STN' });
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: 'usr_waiter', scopes: ['tables:read'] },
        body,
      });

      const res = await fetch(`${baseUrl}${pathWithQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...signedHeaders },
        body,
      });

      assert.strictEqual(res.status, 403);
    });

    it('authenticates station heartbeat via signed bridge for registered station', async () => {
      // First register station
      const regPath = '/api/restaurant/kds/station/register';
      const regBody = JSON.stringify({
        stationId: 'GRILL_STN_1',
        branchId: 'branch_main',
      });
      const regHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: regPath,
        tenantId: testTenantId,
        principal: { sub: 'usr_admin', scopes: ['tenant:admin'] },
        body: regBody,
      });

      await fetch(`${baseUrl}${regPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...regHeaders },
        body: regBody,
      });

      // Heartbeat using signed bridge referencing the registered station
      const hbPath = '/api/restaurant/kds/station/heartbeat';
      const hbBody = JSON.stringify({ stationId: 'GRILL_STN_1', branchId: 'branch_main' });
      const hbHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: hbPath,
        tenantId: testTenantId,
        principal: { sub: 'station_agent', scopes: ['kds:station'] },
        body: hbBody,
      });

      const res = await fetch(`${baseUrl}${hbPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hbHeaders },
        body: hbBody,
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.active, true);
      assert.strictEqual(data.station.stationId, 'GRILL_STN_1');
    });

    it('returns station status derived from durable records on GET /kds/station/status', async () => {
      const pathWithQuery = '/api/restaurant/kds/station/status';
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'GET',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: 'usr_monitor', scopes: ['kds:station', 'tenant:admin'] },
      });

      const res = await fetch(`${baseUrl}${pathWithQuery}`, {
        headers: signedHeaders,
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.active, true);
      assert.ok(data.station.stationId);
    });
  });

  describe('3. Runtime Table Settlement Authorization Scopes', () => {
    it('prevents tenant:admin or tables:write from asserting providerConfirmed without billing:reconcile', async () => {
      const { handleTableSettle } = await import('../src/modules/tables/service');

      let capturedResponse: { status: number; body: any } | null = null;
      const headersMap: Record<string, string> = {};
      const mockRes = {
        hasHeader: (h: string) => Boolean(headersMap[h.toLowerCase()]),
        setHeader: (h: string, v: string) => { headersMap[h.toLowerCase()] = v; },
        getHeader: (h: string) => headersMap[h.toLowerCase()],
        writeHead: () => {},
        end: (bodyStr: string) => {
          try {
            capturedResponse = { status: 200, body: JSON.parse(bodyStr) };
          } catch {
            capturedResponse = { status: 200, body: bodyStr };
          }
        },
      };

      const mockReq = { headers: {} };
      const mockContext = {
        pathname: '/api/restaurant/tables/1/settle',
        tenantContext: { tenantId: testTenantId },
        requestIdentity: {
          id: 'usr_admin',
          type: 'PLATFORM_BRIDGE',
          scopes: ['tenant:admin', 'tables:write'], // NO billing:reconcile!
          branchId: 'branch_main',
        },
        params: { id: 1 },
        parseBody: async () => ({
          tableId: 1,
          amountMinor: 5000,
          providerConfirmed: true,
          gatewayTransactionId: 'fake_client_tx_123',
        }),
        repo: {
          getTable: async () => ({ id: 1, number: '1', branchId: 'branch_main' }),
          getIdempotencyRecord: async () => null,
          settleTableSession: async (_id: any, payload: any) => {
            assert.strictEqual(
              payload.providerConfirmed,
              false,
              'Generic tenant:admin or tables:write MUST NOT establish providerConfirmed status',
            );
            assert.strictEqual(
              payload.verification,
              'MANUAL_STAFF_RECORDED',
              'Without billing:reconcile, verification must remain MANUAL_STAFF_RECORDED',
            );
            return { success: true, table: {} };
          },
        },
      };

      await handleTableSettle(mockReq, mockRes, mockContext);
    });
  });
});

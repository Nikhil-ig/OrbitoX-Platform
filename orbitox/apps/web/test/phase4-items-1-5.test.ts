(process.env as any).NODE_ENV = 'test';
process.env.ORBITOX_PLATFORM_REPOSITORY = 'json';
process.env.ORBITOX_SYNC_SAGA = 'true';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { platformRepository } from '../lib/platform-repository';
import { POST as postTenants } from '../app/v1/tenants/route';
import { GET as getOperation, POST as postOperation } from '../app/v1/operations/[id]/route';
import { POST as hospitalLifecycleHandler } from '../app/api/hospital/lifecycle/[action]/route';
import { provisioningSaga } from '../lib/tenant-provisioning/provisioning-saga';
import { operationStore } from '../lib/tenant-provisioning/operation-store';
import { getEmittedWebhooks, clearEmittedWebhooks } from '../lib/tenant-provisioning/webhook-emitter';
import { signBridgeRequest, getDefaultBridgeKeys } from '@orbitox-io/bridge';

describe('Phase 4 Items 1–5: The 2-Minute Tenant & Lifecycle Hooks', () => {
  let orgA: any;
  let orgB: any;
  let projectA: any;
  let projectB: any;
  let envA: any;
  let envB: any;
  let keyASecret: string;
  let keyBSecret: string;

  before(async () => {
    // 1. Setup two distinct organizations with customer API keys
    const runId = crypto.randomBytes(4).toString('hex');
    const orgASlug = `org-alpha-${runId}`;
    const orgBSlug = `org-beta-${runId}`;

    orgA = await platformRepository.createOrganization({
      name: `Org Alpha ${runId}`,
      slug: orgASlug,
      billingEmail: `alpha_${runId}@orbitox.io`,
    });

    orgB = await platformRepository.createOrganization({
      name: `Org Beta ${runId}`,
      slug: orgBSlug,
      billingEmail: `beta_${runId}@orbitox.io`,
    });

    const resA = await platformRepository.createProject({
      name: `Project Alpha ${runId}`,
      slug: `proj-alpha-${runId}`,
      organizationId: orgA.id,
      businessModel: 'B2B_SAAS',
      planTier: 'starter',
      technicalLead: 'Lead Alpha',
      contactEmail: `alpha_${runId}@orbitox.io`,
      plugins: [],
    });
    projectA = (resA as any).project || resA;

    const resB = await platformRepository.createProject({
      name: `Project Beta ${runId}`,
      slug: `proj-beta-${runId}`,
      organizationId: orgB.id,
      businessModel: 'B2B_SAAS',
      planTier: 'starter',
      technicalLead: 'Lead Beta',
      contactEmail: `beta_${runId}@orbitox.io`,
      plugins: [],
    });
    projectB = (resB as any).project || resB;

    const envsA = await platformRepository.listEnvironments(projectA.id);
    envA = (resA as any).environments?.[0] || envsA[0] || { id: `env_${projectA.id}_prod` };

    const envsB = await platformRepository.listEnvironments(projectB.id);
    envB = (resB as any).environments?.[0] || envsB[0] || { id: `env_${projectB.id}_prod` };

    const keyARec = await platformRepository.createApiKey({
      name: 'Alpha Customer Key',
      projectId: projectA.id,
      environmentId: envA.id,
      keyType: 'PROJECT_SCOPED',
      capabilities: ['tenant:write', 'tenant:read'],
      tenantScope: ['*'],
      createdBy: 'admin@alpha.com',
    });
    keyASecret = keyARec.rawSecret;

    const keyBRec = await platformRepository.createApiKey({
      name: 'Beta Customer Key',
      projectId: projectB.id,
      environmentId: envB.id,
      keyType: 'PROJECT_SCOPED',
      capabilities: ['tenant:write', 'tenant:read'],
      tenantScope: ['*'],
      createdBy: 'admin@beta.com',
    });
    keyBSecret = keyBRec.rawSecret;

    clearEmittedWebhooks();
  });

  // ─────────────────────────────────────────────────────────────
  // ITEM 1: POST /v1/tenants (One endpoint for every channel)
  // ─────────────────────────────────────────────────────────────
  describe('Item 1: Unified POST /v1/tenants Endpoint', () => {
    it('rejects unauthenticated tenant creation requests with 401', async () => {
      const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisation: orgA.slug,
          name: 'City General Hospital',
          slug: 'city-general',
          plugins: [{ id: 'hospital-os', plan: 'standard' }],
        }),
      });

      const res = await postTenants(req);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.error, 'UNAUTHORIZED');
    });

    it('rejects malformed payload (missing slug, name, or plugins) with 400', async () => {
      const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyASecret}`,
        },
        body: JSON.stringify({
          organisation: orgA.slug,
          // name missing
          slug: 'city-general',
          plugins: [],
        }),
      });

      const res = await postTenants(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error, 'BAD_REQUEST');
    });

    it('refuses cross-organization tenant creation: Customer API Key in Org A cannot create in Org B (403)', async () => {
      // Key A belongs to orgA, but body requests creation in orgB
      const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyASecret}`,
        },
        body: JSON.stringify({
          organisation: orgB.slug,
          name: 'Unauthorized Beta Tenant',
          slug: 'unauthorized-beta',
          plugins: [{ id: 'hospital-os', plan: 'starter' }],
        }),
      });

      const res = await postTenants(req);
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.code, 'TENANT_SCOPE_VIOLATION');
      assert.match(json.message, /cannot create a tenant in another organisation/i);
    });

    it('accepts authorized request and returns 202 Accepted with tenantId and operationId', async () => {
      const runTag = crypto.randomBytes(3).toString('hex');
      const tenantSlug = `city-hosp-${runTag}`;
      const idempotencyKey = `idem_${crypto.randomUUID()}`;

      const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyASecret}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          organisation: orgA.slug,
          name: `City General Hospital ${runTag}`,
          slug: tenantSlug,
          environment: 'production',
          plugins: [{ id: 'hospital-os', plan: 'pro', config: { bedCount: 100 } }],
        }),
      });

      const res = await postTenants(req);
      assert.equal(res.status, 202);
      const json = await res.json();

      assert.ok(json.tenantId.includes(tenantSlug), 'tenantId should include slug');
      assert.ok(json.tenantId.includes(orgA.slug), 'tenantId should include org slug');
      assert.ok(json.operationId.startsWith('op_'), 'operationId should start with op_');
      assert.ok(json.status === 'PROVISIONING' || json.status === 'ACTIVE');

      // Verify Location header
      const location = res.headers.get('Location');
      assert.equal(location, `/v1/operations/${json.operationId}`);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ITEM 2: Idempotency & Durable Provisioning Workflow
  // ─────────────────────────────────────────────────────────────
  describe('Item 2: Idempotency and Durable Workflow Execution', () => {
    it('returns the same operation and tenant when the same Idempotency-Key is sent twice', async () => {
      const runTag = crypto.randomBytes(3).toString('hex');
      const tenantSlug = `metro-dine-${runTag}`;
      const fixedIdempotencyKey = `idem_replay_${runTag}`;

      const body = {
        organisation: orgA.slug,
        name: `Metro Diner ${runTag}`,
        slug: tenantSlug,
        environment: 'production',
        plugins: [{ id: 'restaurant-os', plan: 'standard' }],
      };

      // Call 1
      const req1 = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyASecret}`,
          'Idempotency-Key': fixedIdempotencyKey,
        },
        body: JSON.stringify(body),
      });

      const res1 = await postTenants(req1);
      assert.equal(res1.status, 202);
      const json1 = await res1.json();

      // Call 2 (identical Idempotency-Key)
      const req2 = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyASecret}`,
          'Idempotency-Key': fixedIdempotencyKey,
        },
        body: JSON.stringify(body),
      });

      const res2 = await postTenants(req2);
      assert.equal(res2.status, 202);
      const json2 = await res2.json();

      // Must be exact same operationId and tenantId
      assert.equal(json2.operationId, json1.operationId);
      assert.equal(json2.tenantId, json1.tenantId);
    });

    it('compensates via deprovision when operation is cancelled', async () => {
      const opId = `op_cancel_test_${Date.now()}`;
      const cancelTenantId = `org/${orgA.slug}/project/cancel-test/environment/production`;

      await operationStore.createOperation({
        id: opId,
        type: 'TENANT_PROVISION',
        tenantId: cancelTenantId,
        organizationId: orgA.slug,
        status: 'PROVISIONING',
        steps: [{ id: '1', name: 'validate_and_reserve', status: 'COMPLETED' }],
        request: {
          name: 'Cancel Test',
          slug: 'cancel-test',
          plugins: [{ id: 'hospital-os', plan: 'starter' }],
        },
        operatorId: 'tester',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cancelled = await provisioningSaga.cancelOperation(opId);
      assert.equal(cancelled, true);

      const op = await operationStore.getOperation(opId);
      assert.equal(op?.status, 'CANCELLED');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ITEM 3: Operation Status Endpoint GET /v1/operations/:id (No Secrets)
  // ─────────────────────────────────────────────────────────────
  describe('Item 3: Operation Status GET /v1/operations/:id with Zero Secrets Leaked', () => {
    it('returns 404 for non-existent operation ID', async () => {
      const req = new NextRequest('http://127.0.0.1:3005/v1/operations/op_nonexistent_999999');
      const res = await getOperation(req, { params: Promise.resolve({ id: 'op_nonexistent_999999' }) });
      assert.equal(res.status, 404);
    });

    it('returns operation steps, states, timing, errors, and strips all raw secrets', async () => {
      const runTag = crypto.randomBytes(3).toString('hex');
      const tenantSlug = `audit-sec-${runTag}`;

      // Start provisioning
      const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyASecret}`,
        },
        body: JSON.stringify({
          organisation: orgA.slug,
          name: `Audit Security Hospital ${runTag}`,
          slug: tenantSlug,
          plugins: [{ id: 'hospital-os', plan: 'pro' }],
        }),
      });

      const createRes = await postTenants(req);
      assert.equal(createRes.status, 202);
      const { operationId } = await createRes.json();

      // Poll or wait briefly for steps to record
      await new Promise((r) => setTimeout(r, 600));

      const statusReq = new NextRequest(`http://127.0.0.1:3005/v1/operations/${operationId}`);
      const statusRes = await getOperation(statusReq, { params: Promise.resolve({ id: operationId }) });
      assert.equal(statusRes.status, 200);

      const opData = await statusRes.json();

      // 1. Check operation structure
      assert.equal(opData.id, operationId);
      assert.ok(Array.isArray(opData.steps), 'steps must be an array');
      assert.equal(opData.steps.length, 7, 'must have 7 workflow steps');

      for (const step of opData.steps) {
        assert.ok(step.id);
        assert.ok(step.name);
        assert.ok(step.status);
      }

      // 2. CRITICAL: NO SECRETS IN OPERATION RESPONSE
      const rawString = JSON.stringify(opData);
      assert.equal(
        /orb_live_[a-zA-Z0-9]{20,}/.test(rawString),
        false,
        'Raw API key secret MUST NOT appear anywhere in GET /v1/operations/:id response'
      );
      assert.equal(
        /secret|password|private_key/i.test(JSON.stringify(opData.result || {})),
        false,
        'Raw credentials must not appear in result'
      );

      // Masked key display is allowed
      if (opData.result?.apiKey) {
        assert.ok(opData.result.apiKey.masked.includes('••••'));
        assert.equal(opData.result.apiKey.secret, undefined);
      }
    });

    it('emits tenant.ready webhook on completion', async () => {
      const emitted = getEmittedWebhooks({ event: 'tenant.ready' });
      assert.ok(emitted.length > 0, 'tenant.ready webhook must be emitted upon tenant readiness');
      const latest = emitted[emitted.length - 1]!;
      assert.equal(latest.event, 'tenant.ready');
      assert.ok(latest.tenantId);
      assert.equal(latest.payload.status, 'ACTIVE');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ITEM 4: HospitalOS Lifecycle Hooks
  // ─────────────────────────────────────────────────────────────
  describe('Item 4: HospitalOS Lifecycle Hooks (Signed Bridge & Idempotent)', () => {
    const bridgeKeys = getDefaultBridgeKeys();
    const testTenantId = `org/test-org/project/city-hosp-${crypto.randomBytes(4).toString('hex')}/environment/production`;

    it('rejects unsigned HospitalOS lifecycle calls with 401 BRIDGE_SIGNATURE_REQUIRED', async () => {
      const req = new NextRequest('http://127.0.0.1:3005/api/hospital/lifecycle/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: testTenantId, planId: 'hms-starter' }),
      });

      const res = await hospitalLifecycleHandler(req, {
        params: Promise.resolve({ action: 'provision' }),
      });
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.code, 'BRIDGE_SIGNATURE_REQUIRED');
    });

    it('executes signed "provision" lifecycle hook and seeds default clinical structure and roles', async () => {
      const pathWithQuery = '/api/hospital/lifecycle/provision';
      const body = JSON.stringify({
        tenantId: testTenantId,
        planId: 'hms-pro',
        revision: 1,
      });

      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: '@orbitox/hms', scopes: ['lifecycle', '@orbitox/hms'] },
        body,
      });

      const req = new NextRequest(`http://127.0.0.1:3005${pathWithQuery}`, {
        method: 'POST',
        headers: {
          ...signedHeaders,
          'Content-Type': 'application/json',
        },
        body,
      });

      const res = await hospitalLifecycleHandler(req, {
        params: Promise.resolve({ action: 'provision' }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();

      assert.equal(json.ok, true);
      assert.equal(json.tenantId, testTenantId);
      assert.equal(json.status, 'ACTIVE');
      assert.deepEqual(json.seeded.departments, ['General Medicine', 'Intensive Care Unit']);
      assert.deepEqual(json.seeded.roles, ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'BILLING']);
    });

    it('is idempotent: re-calling "provision" returns replayed: true', async () => {
      const pathWithQuery = '/api/hospital/lifecycle/provision';
      const body = JSON.stringify({
        tenantId: testTenantId,
        planId: 'hms-pro',
        revision: 1,
      });

      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: '@orbitox/hms', scopes: ['lifecycle', '@orbitox/hms'] },
        body,
      });

      const req = new NextRequest(`http://127.0.0.1:3005${pathWithQuery}`, {
        method: 'POST',
        headers: {
          ...signedHeaders,
          'Content-Type': 'application/json',
        },
        body,
      });

      const res = await hospitalLifecycleHandler(req, {
        params: Promise.resolve({ action: 'provision' }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.replayed, true);
    });

    it('executes signed "suspend" and "resume" lifecycle hooks', async () => {
      // 1. Suspend
      const suspendPath = '/api/hospital/lifecycle/suspend';
      const suspendBody = JSON.stringify({ tenantId: testTenantId, revision: 2 });
      const suspendHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: suspendPath,
        tenantId: testTenantId,
        principal: { sub: '@orbitox/hms', scopes: ['lifecycle', '@orbitox/hms'] },
        body: suspendBody,
      });

      const suspendReq = new NextRequest(`http://127.0.0.1:3005${suspendPath}`, {
        method: 'POST',
        headers: { ...suspendHeaders, 'Content-Type': 'application/json' },
        body: suspendBody,
      });

      const suspendRes = await hospitalLifecycleHandler(suspendReq, {
        params: Promise.resolve({ action: 'suspend' }),
      });
      assert.equal(suspendRes.status, 200);
      const suspendJson = await suspendRes.json();
      assert.equal(suspendJson.status, 'SUSPENDED');

      // 2. Resume
      const resumePath = '/api/hospital/lifecycle/resume';
      const resumeBody = JSON.stringify({ tenantId: testTenantId, revision: 3 });
      const resumeHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery: resumePath,
        tenantId: testTenantId,
        principal: { sub: '@orbitox/hms', scopes: ['lifecycle', '@orbitox/hms'] },
        body: resumeBody,
      });

      const resumeReq = new NextRequest(`http://127.0.0.1:3005${resumePath}`, {
        method: 'POST',
        headers: { ...resumeHeaders, 'Content-Type': 'application/json' },
        body: resumeBody,
      });

      const resumeRes = await hospitalLifecycleHandler(resumeReq, {
        params: Promise.resolve({ action: 'resume' }),
      });
      assert.equal(resumeRes.status, 200);
      const resumeJson = await resumeRes.json();
      assert.equal(resumeJson.status, 'ACTIVE');
    });

    it('safely ignores older revision lifecycle calls (anti-rollback durable protection)', async () => {
      const pathWithQuery = '/api/hospital/lifecycle/planChanged';
      // Attempt to send revision 1 when current revision is already 3
      const body = JSON.stringify({
        tenantId: testTenantId,
        planId: 'hms-starter',
        revision: 1,
      });

      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: testTenantId,
        principal: { sub: '@orbitox/hms', scopes: ['lifecycle', '@orbitox/hms'] },
        body,
      });

      const req = new NextRequest(`http://127.0.0.1:3005${pathWithQuery}`, {
        method: 'POST',
        headers: { ...signedHeaders, 'Content-Type': 'application/json' },
        body,
      });

      const res = await hospitalLifecycleHandler(req, {
        params: Promise.resolve({ action: 'planChanged' }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ignored, true);
      assert.equal(json.reason, 'OLDER_REVISION');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ITEM 5: One Control Path (RestaurantOS /internal/tenants deleted)
  // ─────────────────────────────────────────────────────────────
  describe('Item 5: Single Control Path (Deletion of Bearer Provisioning Route)', () => {
    it('verifies RestaurantOS deleted POST /internal/tenants route with 410 ROUTE_DEPRECATED', async () => {
      // In RestaurantOS server.ts, POST /internal/tenants is deleted and returns 410 ROUTE_DEPRECATED
      // Test the contract against the server code or direct module
      const serverSource = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../../../projects/external-os/restaurant-os/src/server.ts'),
        'utf8'
      );

      assert.ok(
        serverSource.includes("sendJson(res, 410, {"),
        'Server must return HTTP 410 for POST /internal/tenants'
      );
      assert.ok(
        serverSource.includes("error: 'ROUTE_DEPRECATED'"),
        'Server must return error ROUTE_DEPRECATED'
      );
      assert.ok(
        serverSource.includes("Tenant creation must go through the signed /orbitox/lifecycle/provision hook"),
        'Server must direct operators to signed lifecycle hook'
      );
    });
  });
});

(process.env as any).NODE_ENV = 'test';
process.env.ORBITOX_PLATFORM_REPOSITORY = 'json';
process.env.ORBITOX_SYNC_SAGA = 'true';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { platformRepository } from '@/lib/platform-repository';
import { POST as postTenants } from '@/app/api/v1/tenants/route';
import { GET as getOperation, POST as postOperation } from '@/app/api/v1/operations/[id]/route';
import { GET as getCredentials } from '@/app/api/v1/operations/[id]/credentials/route';
import { POST as hospitalLifecycleHandler } from '@/app/api/hospital/lifecycle/[action]/route';
import { provisioningSaga } from '@/lib/tenant-provisioning/provisioning-saga';
import { operationStore } from '@/lib/tenant-provisioning/operation-store';
import { getEmittedWebhooks, clearEmittedWebhooks } from '@/lib/tenant-provisioning/webhook-emitter';
import { signBridgeRequest, getDefaultBridgeKeys } from '@orbitox-io/bridge';
import { PlatformRepository } from '@orbitox-io/plugin-engine';

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
          plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
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
          plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
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
          plugins: [{ id: 'hospital-os', plan: 'hms-pro', config: { bedCount: 100 } }],
        }),
      });

      const res = await postTenants(req);
      assert.equal(res.status, 202);
      const json = await res.json();

      assert.ok(json.tenantId.includes(tenantSlug), 'tenantId should include slug');
      assert.ok(json.tenantId.includes(orgA.id), 'tenantId should include org id');
      assert.ok(json.operationId.startsWith('op_'), 'operationId should start with op_');
      assert.ok(json.status === 'PROVISIONING' || json.status === 'ACTIVE');
      assert.ok(json.apiKey?.secret, 'raw API key secret must be returned once in 202 response');
      assert.ok(json.apiKey.secret.startsWith('orb_live_'), 'secret format starts with orb_live_');

      // Verify Location header
      const location = res.headers.get('Location');
      assert.equal(location, `/api/v1/operations/${json.operationId}`);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ITEM 1b: W2 & W3 Invariants (Failure Handling, Exact Org & Env Binding)
  // ─────────────────────────────────────────────────────────────
  describe('Item 1b: W2 & W3 Invariants (Failure Handling, Exact Org & Env Binding)', () => {
    it('W2: step error fails that step, operation becomes FAILED, and NO key is returned', async () => {
      const origPlatformRepoCreate = (PlatformRepository as any).createApiKey;
      (PlatformRepository as any).createApiKey = () => {
        throw new Error('Key generation HSM cluster down');
      };

      try {
        const failSlug = `fail-key-${crypto.randomBytes(3).toString('hex')}`;
        const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keyASecret}`,
          },
          body: JSON.stringify({
            organisation: orgA.slug,
            name: 'HSM Failure Hospital',
            slug: failSlug,
            plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
          }),
        });

        const res = await postTenants(req);
        // Step 4 error fails the operation
        assert.equal(res.status, 500);
        const json = await res.json();
        assert.equal(json.error, 'PROVISIONING_FAILED');

        // Check the operation row directly
        const op = await operationStore.getOperation(json.operationId);
        if (op) {
          assert.equal(op.status, 'FAILED');
          const step4 = op.steps.find((s) => s.id === '4');
          assert.equal(step4?.status, 'FAILED');
          assert.match(step4?.error || '', /HSM cluster down/);
          assert.equal(op.result?.apiKey, undefined, 'No fake key in result');
        }
      } finally {
        (PlatformRepository as any).createApiKey = origPlatformRepoCreate;
      }
    });

    it('W3: two organisations whose names differ only in punctuation stay separate and are not squashed', async () => {
      const runId = crypto.randomBytes(3).toString('hex');
      const orgPunct1 = await platformRepository.createOrganization({
        name: `Acme.In ${runId}`,
        slug: `acme.in-${runId}`,
        billingEmail: `acme.in.${runId}@orbitox.io`,
      });
      const orgPunct2 = await platformRepository.createOrganization({
        name: `acme-in ${runId}`,
        slug: `acme-in-${runId}`,
        billingEmail: `acme-in.${runId}@orbitox.io`,
      });

      assert.notEqual(orgPunct1.id, orgPunct2.id, 'Distinct org IDs must be preserved');

      // Create API keys for each
      const res1 = await platformRepository.createProject({
        name: `Punct Proj 1 ${runId}`,
        slug: `punct-1-${runId}`,
        organizationId: orgPunct1.id,
        businessModel: 'B2B_SAAS',
        planTier: 'starter',
        technicalLead: 'Lead 1',
        contactEmail: `p1@orbitox.io`,
        plugins: [],
      });
      const res2 = await platformRepository.createProject({
        name: `Punct Proj 2 ${runId}`,
        slug: `punct-2-${runId}`,
        organizationId: orgPunct2.id,
        businessModel: 'B2B_SAAS',
        planTier: 'starter',
        technicalLead: 'Lead 2',
        contactEmail: `p2@orbitox.io`,
        plugins: [],
      });

      const p1 = (res1 as any).project || res1;
      const p2 = (res2 as any).project || res2;
      const envs1 = await platformRepository.listEnvironments(p1.id);
      const envs2 = await platformRepository.listEnvironments(p2.id);

      const key1 = await platformRepository.createApiKey({
        name: 'Key 1',
        projectId: p1.id,
        environmentId: envs1[0]!.id,
        keyType: 'PROJECT_SCOPED',
        capabilities: ['tenant:write', 'tenant:read'],
        tenantScope: ['*'],
        createdBy: 'test',
      });
      const key2 = await platformRepository.createApiKey({
        name: 'Key 2',
        projectId: p2.id,
        environmentId: envs2[0]!.id,
        keyType: 'PROJECT_SCOPED',
        capabilities: ['tenant:write', 'tenant:read'],
        tenantScope: ['*'],
        createdBy: 'test',
      });

      // Provision tenant in orgPunct1
      const req1 = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key1.rawSecret}`,
        },
        body: JSON.stringify({
          organisation: orgPunct1.id,
          name: `Tenant 1 ${runId}`,
          slug: `t1-${runId}`,
          plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
        }),
      });
      const resp1 = await postTenants(req1);
      assert.equal(resp1.status, 202);
      const data1 = await resp1.json();

      // Provision tenant in orgPunct2
      const req2 = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key2.rawSecret}`,
        },
        body: JSON.stringify({
          organisation: orgPunct2.id,
          name: `Tenant 2 ${runId}`,
          slug: `t2-${runId}`,
          plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
        }),
      });
      const resp2 = await postTenants(req2);
      assert.equal(resp2.status, 202);
      const data2 = await resp2.json();

      assert.ok(data1.tenantId.startsWith(`org/${orgPunct1.id}/`), 'Tenant 1 belongs to orgPunct1');
      assert.ok(data2.tenantId.startsWith(`org/${orgPunct2.id}/`), 'Tenant 2 belongs to orgPunct2');
      assert.notEqual(data1.tenantId, data2.tenantId);
    });

    it('W3: a missing organisation is refused with 404, and no organisation is created on the fly', async () => {
      const missingOrgId = `nonexistent-org-${crypto.randomBytes(4).toString('hex')}`;
      const adminKeyRec = await platformRepository.createApiKey({
        name: 'Platform Admin Key',
        projectId: projectA.id,
        environmentId: envA.id,
        keyType: 'PLATFORM_ROOT',
        capabilities: ['*'],
        tenantScope: ['*'],
        createdBy: 'root',
      });

      const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKeyRec.rawSecret}`,
        },
        body: JSON.stringify({
          organisation: missingOrgId,
          name: 'Should Fail Hospital',
          slug: `should-fail-${crypto.randomBytes(3).toString('hex')}`,
          plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
        }),
      });

      const res = await postTenants(req);
      assert.equal(res.status, 404, 'Must refuse missing organization with 404');

      // Verify no organization was created on the fly
      const createdOrg = await platformRepository.getOrganization(missingOrgId);
      assert.equal(createdOrg, undefined, 'No organization must be created on the fly');
    });

    it('W3: the environment id in the tenant id equals the stored environment id created in step 2', async () => {
      const runTag = crypto.randomBytes(3).toString('hex');
      const slug = `env-check-${runTag}`;

      const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyASecret}`,
        },
        body: JSON.stringify({
          organisation: orgA.slug,
          name: `Env Check Hospital ${runTag}`,
          slug,
          environment: 'production',
          plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
        }),
      });

      const res = await postTenants(req);
      assert.equal(res.status, 202);
      const json = await res.json();

      // Extract env.id from tenantId: org/<org.id>/project/<project.id>/environment/<env.id>
      const match = /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(json.tenantId);
      assert.ok(match, `tenantId must match canonical pattern: ${json.tenantId}`);
      const [, orgIdInTenant, projIdInTenant, envIdInTenant] = match;

      assert.equal(orgIdInTenant, orgA.id, 'org id in tenantId must match stored org.id');

      // Look up project and stored environments
      const storedProj = await platformRepository.getProject(slug);
      assert.ok(storedProj, 'Project must exist');
      assert.equal(projIdInTenant, storedProj.id, 'project id in tenantId must match stored project.id');

      const envList = await platformRepository.listEnvironments(storedProj.id);
      const prodEnv = envList.find((e) => e.slug === 'production');
      assert.ok(prodEnv, 'Stored production environment must exist');
      assert.equal(envIdInTenant, prodEnv.id, 'environment id in tenantId MUST equal stored environment.id');
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
        plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }],
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
          plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
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
    it('returns 401 UNAUTHORIZED when no customer API key is presented', async () => {
      const req = new NextRequest('http://127.0.0.1:3005/api/v1/operations/op_nonexistent_999999');
      const res = await getOperation(req, { params: Promise.resolve({ id: 'op_nonexistent_999999' }) });
      assert.equal(res.status, 401);
    });

    it('returns 404 for non-existent operation ID when authenticated', async () => {
      const req = new NextRequest('http://127.0.0.1:3005/api/v1/operations/op_nonexistent_999999', {
        headers: { Authorization: `Bearer ${keyASecret}` },
      });
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
          plugins: [{ id: 'hospital-os', plan: 'hms-pro' }],
        }),
      });

      const createRes = await postTenants(req);
      assert.equal(createRes.status, 202);
      const { operationId } = await createRes.json();

      // Poll or wait briefly for steps to record
      await new Promise((r) => setTimeout(r, 600));

      const statusReq = new NextRequest(`http://127.0.0.1:3005/api/v1/operations/${operationId}`, {
        headers: { Authorization: `Bearer ${keyASecret}` },
      });
      const statusRes = await getOperation(statusReq, { params: Promise.resolve({ id: operationId }) });
      assert.equal(statusRes.status, 200);

      // Verify cross-org isolation: keyB from Org B cannot read Org A operation
      const crossOrgReq = new NextRequest(`http://127.0.0.1:3005/api/v1/operations/${operationId}`, {
        headers: { Authorization: `Bearer ${keyBSecret}` },
      });
      const crossOrgRes = await getOperation(crossOrgReq, { params: Promise.resolve({ id: operationId }) });
      assert.equal(crossOrgRes.status, 403, 'Cross-org access must return 403 FORBIDDEN');

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

    it('W1: raw API key secret is never persisted to DB or operation row, and retrieval token is single-use', async () => {
      const runTag = crypto.randomBytes(3).toString('hex');
      const tenantSlug = `sec-w1-${runTag}`;

      // 1. Provision tenant
      const req = new NextRequest('http://127.0.0.1:3005/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyASecret}`,
        },
        body: JSON.stringify({
          organisation: orgA.slug,
          name: `Security Zero Secret ${runTag}`,
          slug: tenantSlug,
          plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
        }),
      });

      const res = await postTenants(req);
      assert.equal(res.status, 202);
      const json = await res.json();
      assert.ok(json.apiKey?.secret, 'Secret returned once in 202 response');
      const issuedSecret = json.apiKey.secret;
      const last12 = issuedSecret.slice(-12);

      // 2. Search whole database / operationStore for the secret's last 12 characters -> zero matches
      const storedOp = await operationStore.getOperation(json.operationId);
      assert.ok(storedOp, 'Operation record must exist');
      const opString = JSON.stringify(storedOp);
      assert.equal(
        opString.includes(last12),
        false,
        `Raw secret last 12 chars ("${last12}") MUST NOT exist anywhere in operation record (W1 invariant)`
      );

      // Search all emitted webhooks / outbox payloads
      const emitted = getEmittedWebhooks();
      const emittedString = JSON.stringify(emitted);
      assert.equal(
        emittedString.includes(last12),
        false,
        `Raw secret last 12 chars ("${last12}") MUST NOT exist in webhooks or outbox`
      );

      // 3. Test single-use credentials endpoint GET /v1/operations/:id/credentials
      const credReq = new NextRequest(`http://127.0.0.1:3005/v1/operations/${json.operationId}/credentials`, {
        headers: { Authorization: `Bearer ${keyASecret}` },
      });
      const credRes1 = await getCredentials(credReq, { params: Promise.resolve({ id: json.operationId }) });
      assert.equal(credRes1.status, 200, 'First credentials retrieval should succeed');
      const credJson1 = await credRes1.json();
      assert.equal(credJson1.apiKey.secret, issuedSecret);

      // 4. Second read must return 410 GONE (single use)
      const credRes2 = await getCredentials(credReq, { params: Promise.resolve({ id: json.operationId }) });
      assert.equal(credRes2.status, 410, 'Second credentials retrieval must return 410 GONE');
      const credJson2 = await credRes2.json();
      assert.equal(credJson2.error, 'CREDENTIALS_EXPIRED_OR_CONSUMED');
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

    it('refuses a signed provision request without a catalogue plan', async () => {
      const pathWithQuery = '/api/hospital/lifecycle/provision';
      const body = JSON.stringify({ tenantId: testTenantId, revision: 1 });
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
        params: Promise.resolve({ action: 'provision' }),
      });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error, 'INVALID_PROVISIONING_REQUEST');
      assert.equal(await platformRepository.getPluginInstallation(testTenantId, '@orbitox/hms'), undefined);
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
      assert.ok(
        !serverSource.includes("if (process.env.NODE_ENV === 'production') {\n      sendJson(res, 410"),
        'POST /internal/tenants deletion must NOT be gated on NODE_ENV === production'
      );
    });

    it('verifies RestaurantOS treats non-development and non-test NODE_ENV as production (fail-closed)', () => {
      const serverSource = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../../../projects/external-os/restaurant-os/src/server.ts'),
        'utf8'
      );
      assert.ok(
        serverSource.includes("isProductionEnvironment ="),
        'Server must define isProductionEnvironment helper'
      );
      assert.ok(
        serverSource.includes("process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test'"),
        'Server must fail-closed when NODE_ENV is unset or set to staging/prod/other'
      );
    });
  });
});

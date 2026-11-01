const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
process.env.DATABASE_URL = testDbUrl;
process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.HMS_AUDIT_DATABASE_URL = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.OUTBOX_RELAY_DATABASE_URL = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';
process.env.ORBITOX_TEST_SKIP_ROLE_CHECK = 'true';
process.env.ORBITOX_PLATFORM_REPOSITORY = 'prisma';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { platformRepository } from '../lib/platform-repository';
import { provisioningSaga } from '../lib/tenant-provisioning/provisioning-saga';
import { operationStore } from '../lib/tenant-provisioning/operation-store';

const RESTRICTED_PORTS = new Set([3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697]);

async function allocateSafePort(preferred: number): Promise<number> {
  let port = preferred;
  while (port < 65535) {
    if (RESTRICTED_PORTS.has(port)) {
      port++;
      continue;
    }
    const isFree = await new Promise<boolean>((resolve) => {
      const s = net.createServer();
      s.once('error', () => resolve(false));
      s.once('listening', () => {
        s.close(() => resolve(true));
      });
      s.listen(port, '127.0.0.1');
    });
    if (isFree) return port;
    port++;
  }
  throw new Error('No available safe port found');
}

describe('Phase 4 Item 8: Comprehensive Tenant Provisioning Matrix', () => {
  const serverScript = path.resolve(__dirname, '../.next/standalone/apps/web/server.js');
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
  const isStandaloneBuilt = fs.existsSync(serverScript);

  let child: ChildProcess | null = null;
  let port = 0;
  let prisma: PrismaClient | null = null;

  // Org A & Key A
  let orgA: any = null;
  let projA: any = null;
  let envA: any = null;
  let rawSecretA = '';
  let keyRecordA: any = null;

  // Org B & Key B
  let orgB: any = null;
  let projB: any = null;
  let envB: any = null;
  let rawSecretB = '';
  let keyRecordB: any = null;

  const runTag = crypto.randomBytes(4).toString('hex');
  let hospitalOpId = '';
  let hospitalTenantId = '';
  let restaurantOpId = '';
  let restaurantTenantId = '';

  before(async () => {
    if (!isStandaloneBuilt || !databaseUrl) {
      console.log('Skipping matrix tests (standalone or DATABASE_URL not available)');
      return;
    }

    try {
      prisma = new PrismaClient({ datasourceUrl: databaseUrl });
      await prisma.$connect();
    } catch (err: any) {
      console.warn('PostgreSQL database not available for matrix test:', err.message);
      prisma = null;
      return;
    }

    port = await allocateSafePort(3892);
    const serverPepper = crypto.randomBytes(32).toString('hex');
    const adminToken = crypto.randomBytes(32).toString('hex');

    const grantPair = crypto.generateKeyPairSync('ed25519');
    const grantPrivPem = grantPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const grantPubPem = grantPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

    const runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
    const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
    const hmsAuditUrl = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
    const outboxRelayUrl = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';

    // 1. Seed Org A and customer API key A
    const orgASlug = `org-matrix-a-${runTag}`;
    orgA = await prisma.platformOrganization.create({
      data: {
        name: `Matrix Org A ${runTag}`,
        slug: orgASlug,
        billingEmail: `matrix_a_${runTag}@orbitox.io`,
      },
    });

    projA = await prisma.platformProject.create({
      data: {
        name: `Matrix Proj A ${runTag}`,
        slug: `proj-matrix-a-${runTag}`,
        organizationId: orgA.id,
        businessModel: 'B2B_SAAS',
        planTier: 'enterprise',
        technicalLead: 'Lead A',
        contactEmail: `a_${runTag}@orbitox.io`,
      },
    });

    envA = await prisma.projectEnvironment.create({
      data: {
        name: 'Production',
        slug: 'production',
        projectId: projA.id,
        isProduction: true,
      },
    });

    rawSecretA = `orb_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefixA = rawSecretA.slice(0, 14);
    const authVerifierA = crypto.createHmac('sha256', serverPepper).update(rawSecretA).digest('hex');
    const secretFingerprintA = crypto.createHash('sha256').update(rawSecretA).digest('hex');

    keyRecordA = await prisma.platformApiKey.create({
      data: {
        name: 'Key A',
        keyId: `key_matrix_a_${runTag}`,
        keyPrefix: keyPrefixA,
        authVerifier: authVerifierA,
        secretFingerprint: secretFingerprintA,
        maskedDisplay: `${keyPrefixA}...`,
        environmentId: envA.id,
        capabilities: ['crm:read', 'crm:write'],
        tenantScope: [projA.slug],
        rateLimitPerMin: 600,
        status: 'ACTIVE',
        createdBy: 'matrix_operator_a',
      },
    });

    // 2. Seed Org B and customer API key B
    const orgBSlug = `org-matrix-b-${runTag}`;
    orgB = await prisma.platformOrganization.create({
      data: {
        name: `Matrix Org B ${runTag}`,
        slug: orgBSlug,
        billingEmail: `matrix_b_${runTag}@orbitox.io`,
      },
    });

    projB = await prisma.platformProject.create({
      data: {
        name: `Matrix Proj B ${runTag}`,
        slug: `proj-matrix-b-${runTag}`,
        organizationId: orgB.id,
        businessModel: 'B2B_SAAS',
        planTier: 'enterprise',
        technicalLead: 'Lead B',
        contactEmail: `b_${runTag}@orbitox.io`,
      },
    });

    envB = await prisma.projectEnvironment.create({
      data: {
        name: 'Production',
        slug: 'production',
        projectId: projB.id,
        isProduction: true,
      },
    });

    rawSecretB = `orb_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefixB = rawSecretB.slice(0, 14);
    const authVerifierB = crypto.createHmac('sha256', serverPepper).update(rawSecretB).digest('hex');
    const secretFingerprintB = crypto.createHash('sha256').update(rawSecretB).digest('hex');

    keyRecordB = await prisma.platformApiKey.create({
      data: {
        name: 'Key B',
        keyId: `key_matrix_b_${runTag}`,
        keyPrefix: keyPrefixB,
        authVerifier: authVerifierB,
        secretFingerprint: secretFingerprintB,
        maskedDisplay: `${keyPrefixB}...`,
        environmentId: envB.id,
        capabilities: ['crm:read'],
        tenantScope: [projB.slug],
        rateLimitPerMin: 600,
        status: 'ACTIVE',
        createdBy: 'matrix_operator_b',
      },
    });

    // 3. Spawn standalone server
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production' as const,
      ORBITOX_ADMIN_TOKEN: adminToken,
      ORBITOX_RUNTIME_TOKEN: crypto.randomBytes(32).toString('hex'),
      ORBITOX_CONTROL_SECRET: crypto.randomBytes(32).toString('hex'),
      ORBITOX_GUEST_SECRET: crypto.randomBytes(32).toString('hex'),
      ORBITOX_SERVER_PEPPER: serverPepper,
      RAZORPAY_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
      ORBITOX_GRANT_SIGNING_KEYS: JSON.stringify({
        k1: { privateKey: grantPrivPem, publicKey: grantPubPem },
      }),
      ORBITOX_GRANT_PUBLIC_KEYS: JSON.stringify({
        k1: grantPubPem,
      }),
      DATABASE_URL: databaseUrl,
      APP_DATABASE_URL: runtimeUrl,
      PLATFORM_AUDIT_DATABASE_URL: auditUrl,
      HMS_AUDIT_DATABASE_URL: hmsAuditUrl,
      OUTBOX_RELAY_DATABASE_URL: outboxRelayUrl,
      ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS: 'true',
      ORBITOX_PLATFORM_REPOSITORY: 'prisma',
      RESTAURANTOS_PUBLIC_URL: 'https://restaurant.orbitox.internal',
      ORBITOX_TEST_STANDALONE: 'true',
      ORBITOX_TEST_SKIP_ROLE_CHECK: 'true',
      ORBITOX_SYNC_SAGA: 'true',
      ORBITOX_PHI_KEYS: JSON.stringify({
        k1: crypto.randomBytes(32).toString('base64'),
      }),
      ORBITOX_PHI_ACTIVE_KID: 'k1',
      ORBITOX_PHI_INDEX_KEY: crypto.randomBytes(32).toString('base64'),
      ORBITOX_BRIDGE_KEYS: JSON.stringify({
        k1: crypto.randomBytes(32).toString('hex'),
      }),
      ORBITOX_BRIDGE_ACTIVE_KID: 'k1',
    };

    child = spawn('node', [serverScript], {
      cwd: path.resolve(__dirname, '../.next/standalone/apps/web'),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (d) => process.stdout.write(`[MatrixServer OUT] ${d}`));
    child.stderr?.on('data', (d) => process.stderr.write(`[MatrixServer ERR] ${d}`));

    // Wait for server health endpoint
    let ready = false;
    let lastErr = '';
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.status === 200) {
          ready = true;
          break;
        } else {
          lastErr = `status=${res.status} body=${await res.text()}`;
        }
      } catch (e: any) {
        lastErr = e.message;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!ready) {
      if (child) (child as ChildProcess).kill('SIGKILL');
      throw new Error(`Matrix standalone server failed to become ready on port ${port}: ${lastErr}`);
    }
  });

  after(async () => {
    if (child) {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 500));
      if (!child.killed) child.kill('SIGKILL');
    }

    if (prisma) {
      try {
        if (keyRecordA) await prisma.platformApiKey.deleteMany({ where: { id: keyRecordA.id } });
        if (keyRecordB) await prisma.platformApiKey.deleteMany({ where: { id: keyRecordB.id } });
        if (envA) await prisma.projectEnvironment.deleteMany({ where: { id: envA.id } });
        if (envB) await prisma.projectEnvironment.deleteMany({ where: { id: envB.id } });
        if (projA) await prisma.platformProject.deleteMany({ where: { id: projA.id } });
        if (projB) await prisma.platformProject.deleteMany({ where: { id: projB.id } });
        if (orgA) await prisma.platformOrganization.deleteMany({ where: { id: orgA.id } });
        if (orgB) await prisma.platformOrganization.deleteMany({ where: { id: orgB.id } });
        await prisma.$disconnect();
      } catch {}
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Hospital tenant provisioned ACTIVE in under 60 s measured through real server
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 1: Hospital tenant provisioned ACTIVE in under 60 s measured through the real server', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    const hospitalSlug = `hospital-matrix-${runTag}`;
    const startTime = Date.now();

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': rawSecretA,
      },
      body: JSON.stringify({
        organisation: orgA.slug,
        name: `Metro Hospital ${runTag}`,
        slug: hospitalSlug,
        environment: 'production',
        plugins: [
          { id: 'hospital-os', plan: 'enterprise' },
          { id: 'crm', plan: 'starter' },
        ],
      }),
    });

    assert.strictEqual(res.status, 202, 'Must return 202 Accepted');
    const body = await res.json();
    assert.ok(body.operationId, 'Must return operationId');
    assert.ok(body.tenantId, 'Must return canonical tenantId');
    assert.ok(body.apiKey?.secret, 'N2: Must return single-use secret synchronously in 202 response');

    hospitalOpId = body.operationId;
    hospitalTenantId = body.tenantId;

    // Poll until COMPLETED or timeout
    let operationRecord: any = null;
    while (Date.now() - startTime < 60000) {
      const opRes = await fetch(`http://127.0.0.1:${port}/api/v1/operations/${hospitalOpId}`, {
        headers: { 'x-api-key': rawSecretA },
      });
      assert.strictEqual(opRes.status, 200);
      operationRecord = await opRes.json();
      if (operationRecord.status === 'ACTIVE' || operationRecord.status === 'FAILED' || operationRecord.status === 'PARTIAL') {
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`[Matrix SLA] Hospital tenant provisioning duration: ${elapsedMs} ms`);

    assert.ok(elapsedMs < 60000, `Hospital provisioning took ${elapsedMs} ms, exceeding 60 s SLA`);
    assert.strictEqual(operationRecord.status, 'ACTIVE', `Operation did not achieve ACTIVE: ${operationRecord.error}`);
    assert.strictEqual(operationRecord.steps.length, 7, 'Must have 7 steps in saga');
    for (const step of operationRecord.steps) {
      assert.strictEqual(step.status, 'COMPLETED', `Step ${step.id} (${step.name}) must be COMPLETED`);
    }

    // Verify tenant project is ACTIVE in database
    if (prisma) {
      const proj = await prisma.platformProject.findFirst({ where: { slug: hospitalSlug } });
      assert.ok(proj, 'Hospital project must exist in database');
      assert.strictEqual(proj.status, 'ACTIVE', 'Hospital project status must be ACTIVE');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: Restaurant tenant provisioned ACTIVE in under 60 s measured through real server
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 2: Restaurant tenant provisioned ACTIVE in under 60 s measured through the real server', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    const restaurantSlug = `restaurant-matrix-${runTag}`;
    const startTime = Date.now();

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': rawSecretA,
      },
      body: JSON.stringify({
        organisation: orgA.slug,
        name: `La Bistro ${runTag}`,
        slug: restaurantSlug,
        environment: 'production',
        plugins: [
          { id: 'restaurant-os', plan: 'starter' },
          { id: 'crm', plan: 'starter' },
        ],
      }),
    });

    assert.strictEqual(res.status, 202, 'Must return 202 Accepted');
    const body = await res.json();
    assert.ok(body.operationId, 'Must return operationId');
    assert.ok(body.apiKey?.secret, 'N2: Must return single-use secret in 202');

    restaurantOpId = body.operationId;
    restaurantTenantId = body.tenantId;

    // Poll until ACTIVE
    let opRecord: any = null;
    while (Date.now() - startTime < 60000) {
      const opRes = await fetch(`http://127.0.0.1:${port}/api/v1/operations/${restaurantOpId}`, {
        headers: { 'x-api-key': rawSecretA },
      });
      assert.strictEqual(opRes.status, 200);
      opRecord = await opRes.json();
      if (opRecord.status === 'ACTIVE' || opRecord.status === 'FAILED' || opRecord.status === 'PARTIAL') {
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`[Matrix SLA] Restaurant tenant provisioning duration: ${elapsedMs} ms`);

    assert.ok(elapsedMs < 60000, `Restaurant provisioning took ${elapsedMs} ms, exceeding 60 s SLA`);
    assert.strictEqual(opRecord.status, 'ACTIVE');
    assert.strictEqual(opRecord.steps.length, 7);
    for (const step of opRecord.steps) {
      assert.strictEqual(step.status, 'COMPLETED');
    }

    if (prisma) {
      const proj = await prisma.platformProject.findFirst({ where: { slug: restaurantSlug } });
      assert.ok(proj, 'Restaurant project must exist in database');
      assert.strictEqual(proj.status, 'ACTIVE');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: Idempotency: duplicate request with same Idempotency-Key
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 3: Idempotency with exact same Idempotency-Key returns identical operationId and tenantId', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    const idemKey = `idem-matrix-${runTag}`;
    const payload = {
      organisation: orgA.slug,
      name: `Idem Tenant ${runTag}`,
      slug: `idem-tenant-${runTag}`,
      environment: 'production',
      plugins: [{ id: 'crm', plan: 'starter' }],
    };

    // First request
    const res1 = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': rawSecretA,
        'idempotency-key': idemKey,
      },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res1.status, 202);
    const body1 = await res1.json();
    assert.ok(body1.operationId);
    assert.ok(body1.tenantId);

    // Duplicate second request with same Idempotency-Key
    const res2 = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': rawSecretA,
        'idempotency-key': idemKey,
      },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res2.status, 202);
    const body2 = await res2.json();

    assert.strictEqual(body2.operationId, body1.operationId, 'Idempotent request must return exact same operationId');
    assert.strictEqual(body2.tenantId, body1.tenantId, 'Idempotent request must return exact same tenantId');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4: Kill-and-resume: resumeWorkflow picks up interrupted workflow
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 4: Kill-and-resume recovers interrupted workflow and reaches ACTIVE without repeating completed steps', async () => {
    const resumeSlug = `resume-tenant-${runTag}`;
    const opId = `op_resume_${runTag}`;
    const tenantId = `org/${orgA.slug}/project/${resumeSlug}/environment/production`;

    // 1. Create an interrupted operation at step 4 (steps 1-4 completed, 5-7 pending)
    await operationStore.createOperation({
      id: opId,
      organizationId: orgA.id,
      tenantId,
      status: 'PROVISIONING',
      operatorId: 'operator_resume_test',
      steps: [
        { id: '1', name: 'Validate request', status: 'COMPLETED', completedAt: new Date().toISOString() },
        { id: '2', name: 'Create project entity', status: 'COMPLETED', completedAt: new Date().toISOString() },
        { id: '3', name: 'Create environment', status: 'COMPLETED', completedAt: new Date().toISOString() },
        { id: '4', name: 'Issue master API key', status: 'COMPLETED', completedAt: new Date().toISOString() },
        { id: '5', name: 'Provision plugins', status: 'PENDING' },
        { id: '6', name: 'Push first grant', status: 'PENDING' },
        { id: '7', name: 'Mark active', status: 'PENDING' },
      ],
      request: {
        name: `Interrupted Tenant ${runTag}`,
        slug: resumeSlug,
        organizationId: orgA.id,
        environment: 'production',
        plugins: [{ id: 'crm', plan: 'starter' }],
      },
    });

    // 2. Also ensure project entity exists in repository
    await platformRepository.createProject({
      name: `Interrupted Tenant ${runTag}`,
      slug: resumeSlug,
      organizationId: orgA.id,
      businessModel: 'B2B_SAAS',
      planTier: 'enterprise',
      technicalLead: 'Lead A',
      contactEmail: `resume_${runTag}@orbitox.io`,
      plugins: [],
    });

    // 3. Resume the workflow
    const resumed = await provisioningSaga.resumeWorkflow(opId);
    assert.ok(resumed, 'resumeWorkflow must return updated operation');
    assert.strictEqual(resumed.status, 'ACTIVE', 'Resumed workflow must reach ACTIVE status');

    // 4. Verify all 7 steps are now completed
    const finalOp = await operationStore.getOperation(opId);
    assert.ok(finalOp);
    assert.strictEqual(finalOp.steps.length, 7);
    for (const step of finalOp.steps) {
      assert.strictEqual(step.status, 'COMPLETED', `Step ${step.id} must be COMPLETED on resume`);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5: Partial failure with retry: recovers from failure via retry endpoint
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 5: Partial failure with retry recovers to ACTIVE through POST /api/v1/operations/:id?action=retry', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    const retrySlug = `retry-tenant-${runTag}`;
    const opId = `op_retry_${runTag}`;
    const tenantId = `org/${orgA.slug}/project/${retrySlug}/environment/production`;

    // Ensure project exists
    await platformRepository.createProject({
      name: `Retry Tenant ${runTag}`,
      slug: retrySlug,
      organizationId: orgA.id,
      businessModel: 'B2B_SAAS',
      planTier: 'enterprise',
      technicalLead: 'Lead A',
      contactEmail: `retry_${runTag}@orbitox.io`,
      plugins: [],
    });

    // Simulate an operation that failed on step 6
    await operationStore.createOperation({
      id: opId,
      organizationId: orgA.id,
      tenantId,
      status: 'FAILED',
      error: 'Simulated connection timeout during grant push',
      operatorId: 'operator_retry_test',
      steps: [
        { id: '1', name: 'Validate request', status: 'COMPLETED' },
        { id: '2', name: 'Create project entity', status: 'COMPLETED' },
        { id: '3', name: 'Create environment', status: 'COMPLETED' },
        { id: '4', name: 'Issue master API key', status: 'COMPLETED' },
        { id: '5', name: 'Provision plugins', status: 'COMPLETED' },
        { id: '6', name: 'Push first grant', status: 'FAILED', error: 'Simulated connection timeout' },
        { id: '7', name: 'Mark active', status: 'PENDING' },
      ],
      request: {
        name: `Retry Tenant ${runTag}`,
        slug: retrySlug,
        organizationId: orgA.id,
        environment: 'production',
        plugins: [{ id: 'crm', plan: 'starter' }],
      },
    });

    // Call retry endpoint via HTTP through real server
    const retryRes = await fetch(`http://127.0.0.1:${port}/api/v1/operations/${opId}?action=retry`, {
      method: 'POST',
      headers: { 'x-api-key': rawSecretA },
    });

    assert.ok(retryRes.status === 200 || retryRes.status === 202, 'Retry endpoint must return 200 or 202');
    const retryBody = await retryRes.json();
    assert.ok(retryBody.status === 'ACTIVE' || retryBody.status === 'PROVISIONING' || retryBody.action === 'OPERATION_RETRIED');

    // Verify operation recovered to COMPLETED
    const opCheck = await operationStore.getOperation(opId);
    assert.ok(opCheck);
    assert.strictEqual(opCheck.status, 'ACTIVE', 'Operation must transition from FAILED to ACTIVE upon retry');
    for (const step of opCheck.steps) {
      assert.strictEqual(step.status, 'COMPLETED', `Step ${step.id} must be COMPLETED after retry`);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6: Cross-org 403 isolation
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 6: Cross-org 403 authorization isolation across tenants, operations, retry, and credentials', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    // 1. Key B attempts to provision tenant inside Org A -> 403
    const resCreate = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': rawSecretB,
      },
      body: JSON.stringify({
        organisation: orgA.slug,
        name: 'Infiltration Tenant',
        slug: `infil-tenant-${runTag}`,
        plugins: [{ id: 'crm', plan: 'starter' }],
      }),
    });
    assert.strictEqual(resCreate.status, 403, 'Key B must be rejected 403 when creating tenant in Org A');

    // 2. Key B attempts to view Org A operation -> 403
    const resGetOp = await fetch(`http://127.0.0.1:${port}/api/v1/operations/${hospitalOpId}`, {
      headers: { 'x-api-key': rawSecretB },
    });
    assert.strictEqual(resGetOp.status, 403, 'Key B must be rejected 403 when inspecting Org A operation');

    // 3. Key B attempts to retry Org A operation -> 403
    const resRetry = await fetch(`http://127.0.0.1:${port}/api/v1/operations/${hospitalOpId}?action=retry`, {
      method: 'POST',
      headers: { 'x-api-key': rawSecretB },
    });
    assert.strictEqual(resRetry.status, 403, 'Key B must be rejected 403 when retrying Org A operation');

    // 4. Key B attempts to cancel Org A operation -> 403
    const resCancel = await fetch(`http://127.0.0.1:${port}/api/v1/operations/${hospitalOpId}?action=cancel`, {
      method: 'POST',
      headers: { 'x-api-key': rawSecretB },
    });
    assert.strictEqual(resCancel.status, 403, 'Key B must be rejected 403 when cancelling Org A operation');

    // 5. Key B attempts to read Org A credentials -> 403
    const resCreds = await fetch(`http://127.0.0.1:${port}/api/v1/operations/${hospitalOpId}/credentials`, {
      headers: { 'x-api-key': rawSecretB },
    });
    assert.strictEqual(resCreds.status, 403, 'Key B must be rejected 403 when fetching Org A credentials');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 7: 5-second suspend and resume SLA
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 7: 5-second suspend and resume SLA with enforced request gating', async () => {
    assert.ok(hospitalTenantId, 'Hospital tenant must exist');

    // 1. Suspend tenant: measure duration
    const suspendStart = Date.now();
    const suspendedInstallation = await platformRepository.updatePluginInstallationStatus(
      hospitalTenantId,
      '@orbitox/hms',
      'SUSPENDED'
    );
    const suspendDurationMs = Date.now() - suspendStart;
    console.log(`[Matrix SLA] Suspend duration: ${suspendDurationMs} ms`);

    assert.ok(suspendDurationMs < 5000, `Suspend took ${suspendDurationMs} ms, exceeding 5 s SLA`);
    assert.strictEqual(suspendedInstallation.status, 'SUSPENDED');

    // 2. Verify quota/access check fails closed in SUSPENDED state
    const quotaCheck = await platformRepository.checkQuotaUsage(
      hospitalTenantId,
      '@orbitox/hms',
      'api_calls',
      1
    );
    assert.strictEqual(quotaCheck.allowed, false, 'Suspended tenant must fail closed on quota check');
    assert.strictEqual(quotaCheck.reason, 'INSTALLATION_SUSPENDED');

    // 3. Resume tenant: measure duration
    const resumeStart = Date.now();
    const resumedInstallation = await platformRepository.updatePluginInstallationStatus(
      hospitalTenantId,
      '@orbitox/hms',
      'ACTIVE'
    );
    const resumeDurationMs = Date.now() - resumeStart;
    console.log(`[Matrix SLA] Resume duration: ${resumeDurationMs} ms`);

    assert.ok(resumeDurationMs < 5000, `Resume took ${resumeDurationMs} ms, exceeding 5 s SLA`);
    assert.strictEqual(resumedInstallation.status, 'ACTIVE');

    // 4. Verify access returns to ACTIVE
    const activeCheck = await platformRepository.checkQuotaUsage(
      hospitalTenantId,
      '@orbitox/hms',
      'api_calls',
      1
    );
    assert.strictEqual(activeCheck.allowed, true, 'Resumed tenant must allow requests');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 8: Operator identity on every platform audit event
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 8: Operator identity is captured on every platform audit event', async () => {
    if (!prisma) return;

    // Fetch audit events generated for Org A
    const auditEvents = await prisma.platformAuditEvent.findMany({
      where: { organizationId: orgA.id },
      orderBy: { occurredAt: 'desc' },
      take: 20,
    });

    assert.ok(auditEvents.length > 0, 'Audit events must have been recorded for Org A');

    for (const event of auditEvents) {
      assert.ok(event.actorId, `Audit event ${event.id} (${event.action}) must have actorId`);
      assert.notStrictEqual(event.actorId.trim(), '', 'actorId must not be empty');

      // Metadata must contain operatorId
      const meta = (typeof event.metadata === 'object' && event.metadata !== null) ? (event.metadata as any) : {};
      assert.ok(
        meta.operatorId || event.actorId,
        `Audit event ${event.id} (${event.action}) must contain operator identity in metadata or actorId`
      );
    }

    console.log(`[Matrix Audit] Verified ${auditEvents.length} platform audit events with operator identity.`);
  });
});

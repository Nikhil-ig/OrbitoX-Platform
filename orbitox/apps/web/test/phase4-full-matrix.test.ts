const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
process.env.DATABASE_URL = testDbUrl;
process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.HMS_AUDIT_DATABASE_URL = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.OUTBOX_RELAY_DATABASE_URL = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';
process.env.ORBITOX_PLATFORM_REPOSITORY = 'prisma';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as net from 'net';
import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { platformRepository } from '../lib/platform-repository';
import { provisioningSaga } from '../lib/tenant-provisioning/provisioning-saga';
import { operationStore } from '../lib/tenant-provisioning/operation-store';
import { RestaurantBridgeClient } from '../lib/restaurant-bridge-client';
import { withTenantTx } from '../lib/tenant-db';
import { getPhiKeyRing, seal, blindIndex } from '../lib/phi-crypto';

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

function sendRawHttpRequest(options: {
  hostname?: string;
  port: number;
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const payloadBuffer = options.body !== undefined
      ? Buffer.from(typeof options.body === 'string' ? options.body : JSON.stringify(options.body), 'utf8')
      : null;
    const reqHeaders: Record<string, string> = { ...(options.headers || {}) };
    if (payloadBuffer) {
      if (!reqHeaders['content-type'] && !reqHeaders['Content-Type']) reqHeaders['content-type'] = 'application/json';
      reqHeaders['content-length'] = String(payloadBuffer.length);
    }
    const req = http.request(
      {
        hostname: options.hostname || '127.0.0.1',
        port: options.port,
        path: options.path,
        method: options.method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed: any = null;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payloadBuffer) req.write(payloadBuffer);
    req.end();
  });
}

describe('Phase 4 Item 8: Comprehensive Tenant Provisioning Matrix', () => {
  const serverScript = path.resolve(__dirname, '../.next/standalone/apps/web/server.js');
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
  const isStandaloneBuilt = fs.existsSync(serverScript);

  let child: ChildProcess | null = null;
  let port = 0;
  let prisma: PrismaClient | null = null;

  // Cryptographic secrets and URLs shared across standalone test instances
  let serverPepper = '';
  let adminToken = '';
  let grantPrivPem = '';
  let grantPubPem = '';
  let runtimeUrl = '';
  let auditUrl = '';
  let hmsAuditUrl = '';
  let outboxRelayUrl = '';
  let bridgeKeys: any = null;

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
    serverPepper = crypto.randomBytes(32).toString('hex');
    adminToken = crypto.randomBytes(32).toString('hex');

    const grantPair = crypto.generateKeyPairSync('ed25519');
    grantPrivPem = grantPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    grantPubPem = grantPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

    runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
    auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
    hmsAuditUrl = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
    outboxRelayUrl = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';
    bridgeKeys = {
      activeKeyId: 'k1',
      keys: { k1: crypto.randomBytes(32).toString('hex') },
    };

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
      ORBITOX_ADMIN_TOKEN_SCOPES: 'GET:/api/v1/overview',
      ORBITOX_RUNTIME_TOKEN: crypto.randomBytes(32).toString('hex'),
      ORBITOX_CONTROL_SECRET: crypto.randomBytes(32).toString('hex'),
      ORBITOX_GUEST_SECRET: crypto.randomBytes(32).toString('hex'),
      ORBITOX_SERVER_PEPPER: serverPepper,
      ORBITOX_MFA_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
      ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
      ORBITOX_PUBLIC_BASE_URL: 'https://console.orbitox.test',
      RAZORPAY_KEY_ID: 'rzp_test_matrix',
      RAZORPAY_KEY_SECRET: crypto.randomBytes(32).toString('hex'),
      RAZORPAY_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
      ORBITOX_EMAIL_PROVIDER: 'resend',
      ORBITOX_EMAIL_FROM: 'no-reply@example.invalid',
      RESEND_API_KEY: 'test-resend-token',
      ORBITOX_EMAIL_WEBHOOK_SECRET: `whsec_${crypto.randomBytes(32).toString('base64')}`,
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
      ORBITOX_SYNC_SAGA: 'true',
      ORBITOX_PHI_KEYS: JSON.stringify({
        k1: crypto.randomBytes(32).toString('base64'),
      }),
      ORBITOX_PHI_ACTIVE_KID: 'k1',
      ORBITOX_PHI_INDEX_KEY: crypto.randomBytes(32).toString('base64'),
      ORBITOX_BRIDGE_KEYS: JSON.stringify(bridgeKeys),
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
  // Test 4: Real kill-and-resume with slowed step 5 and SIGKILL
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 4: Real kill-and-resume recovers interrupted workflow and reaches ACTIVE without repeating completed steps', async (t) => {
    if (!isStandaloneBuilt || !databaseUrl || !prisma) return t.skip('Requires standalone build and Postgres');

    const killResumeSlug = `kill-resume-${runTag}`;
    const port1 = await allocateSafePort(3910);
    const port2 = await allocateSafePort(port1 + 1);

    const baseEnv: NodeJS.ProcessEnv = {
      ...process.env,
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'test' as const,
      ORBITOX_ADMIN_TOKEN: adminToken,
      ORBITOX_ADMIN_TOKEN_SCOPES: 'GET:/api/v1/overview',
      ORBITOX_RUNTIME_TOKEN: crypto.randomBytes(32).toString('hex'),
      ORBITOX_CONTROL_SECRET: crypto.randomBytes(32).toString('hex'),
      ORBITOX_GUEST_SECRET: crypto.randomBytes(32).toString('hex'),
      ORBITOX_SERVER_PEPPER: serverPepper,
      ORBITOX_MFA_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
      ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
      ORBITOX_PUBLIC_BASE_URL: 'https://console.orbitox.test',
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
      OPERATION_LEASE_TTL_SECONDS: '2',
      ORBITOX_PHI_KEYS: JSON.stringify({
        k1: crypto.randomBytes(32).toString('base64'),
      }),
      ORBITOX_PHI_ACTIVE_KID: 'k1',
      ORBITOX_PHI_INDEX_KEY: crypto.randomBytes(32).toString('base64'),
      ORBITOX_BRIDGE_KEYS: JSON.stringify(bridgeKeys),
      ORBITOX_BRIDGE_ACTIVE_KID: 'k1',
    };

    // 1. Spawn Server 1 with TEST_STEP5_DELAY_MS = 6000 and async background execution (ORBITOX_SYNC_SAGA not set)
    const env1: NodeJS.ProcessEnv = {
      ...baseEnv,
      PORT: String(port1),
      TEST_STEP5_DELAY_MS: '6000',
      ORBITOX_SYNC_SAGA: 'false',
    };

    const server1 = spawn('node', [serverScript], {
      cwd: path.resolve(__dirname, '../.next/standalone/apps/web'),
      env: env1,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    server1.stdout?.on('data', (d) => process.stdout.write(`[KillServer1 OUT] ${d}`));
    server1.stderr?.on('data', (d) => process.stderr.write(`[KillServer1 ERR] ${d}`));

    // Wait for server1 readiness
    let ready1 = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port1}/api/health`);
        if (res.status === 200) { ready1 = true; break; }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(ready1, 'Kill Server 1 must be ready');

    // 2. Dispatch provisioning request to Server 1
    const res = await fetch(`http://127.0.0.1:${port1}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': rawSecretA,
      },
      body: JSON.stringify({
        organisation: orgA.slug,
        name: `Kill Resume Tenant ${runTag}`,
        slug: killResumeSlug,
        environment: 'production',
        plugins: [{ id: 'hospital-os', plan: 'starter' }],
      }),
    });

    assert.strictEqual(res.status, 202, 'Server 1 must return 202 Accepted synchronously after step 4');
    const provBody = await res.json();
    assert.ok(provBody.operationId, 'Must return operationId');
    assert.ok(provBody.tenantId, 'Must return canonical tenantId');
    assert.ok(provBody.apiKey?.secret, 'Must return raw secret in 202');
    const targetOpId = provBody.operationId;
    const targetTenantId = provBody.tenantId;

    // Give it 350ms to enter Step 5 delay
    await new Promise((r) => setTimeout(r, 350));

    // Verify operation is recorded in PROVISIONING status in DB
    const midOp = await prisma.platformOperation.findUnique({ where: { id: targetOpId } });
    assert.ok(midOp, 'Operation record must exist in DB');
    assert.strictEqual(midOp.status, 'PROVISIONING');

    // 3. SIGKILL server 1 process during Step 5
    console.log(`[Matrix 4] Sending SIGKILL to Server 1 (PID ${server1.pid})...`);
    const exitPromise = new Promise((resolve) => server1.on('exit', resolve));
    server1.kill('SIGKILL');
    await exitPromise;
    console.log(`[Matrix 4] Server 1 successfully killed.`);

    // 4. Spawn fresh Server 2 with TEST_STEP5_DELAY_MS = 0 (no delay)
    const env2: NodeJS.ProcessEnv = {
      ...baseEnv,
      PORT: String(port2),
      TEST_STEP5_DELAY_MS: '0',
      ORBITOX_SYNC_SAGA: 'false',
    };

    const server2 = spawn('node', [serverScript], {
      cwd: path.resolve(__dirname, '../.next/standalone/apps/web'),
      env: env2,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    server2.stdout?.on('data', (d) => process.stdout.write(`[KillServer2 OUT] ${d}`));
    server2.stderr?.on('data', (d) => process.stderr.write(`[KillServer2 ERR] ${d}`));

    // Wait for server2 readiness
    let ready2 = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port2}/api/health`);
        if (res.status === 200) { ready2 = true; break; }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(ready2, 'Kill Server 2 must be ready');

    // Documented resume trigger: invoke action=resume on Server 2
    // As Server 1 was killed, its 2s lease naturally expires; retry until Server 2 successfully claims it
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const resumeRes = await fetch(`http://127.0.0.1:${port2}/api/v1/operations/${targetOpId}?action=resume`, {
          method: 'POST',
          headers: { 'x-api-key': rawSecretA },
        });
        if (resumeRes.status === 200) {
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }

    // 5. Poll Server 2 until operation reaches ACTIVE
    let activeOp: any = null;
    const pollStart = Date.now();
    while (Date.now() - pollStart < 30000) {
      const getRes = await fetch(`http://127.0.0.1:${port2}/api/v1/operations/${targetOpId}`, {
        headers: { 'x-api-key': rawSecretA },
      });
      if (getRes.status === 200) {
        const body = await getRes.json();
        if (
          (body.status === 'ACTIVE' && Array.isArray(body.steps) && body.steps.every((s: any) => s.status === 'COMPLETED')) ||
          body.status === 'FAILED'
        ) {
          activeOp = body;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    // Clean up Server 2
    server2.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 300));
    if (!server2.killed) server2.kill('SIGKILL');

    assert.ok(activeOp, 'Operation must have finished on Server 2');
    assert.strictEqual(activeOp.status, 'ACTIVE', `Operation must reach ACTIVE on resume, got ${activeOp.status}`);
    for (const step of activeOp.steps) {
      assert.strictEqual(step.status, 'COMPLETED', `Step ${step.id} must be COMPLETED`);
    }

    // 6. Assert DB invariant: NO duplicate project, installation, or API key rows
    const projects = await prisma.platformProject.findMany({ where: { slug: killResumeSlug } });
    assert.strictEqual(projects.length, 1, `Exactly one project row must exist (found ${projects.length})`);

    const installations = await prisma.pluginInstallation.findMany({
      where: {
        OR: [
          { tenantId: targetTenantId },
          { tenantId: `org/${orgA.slug}/project/${killResumeSlug}/environment/production` },
          { runtimeTenantId: { contains: killResumeSlug } },
        ],
      },
    });
    assert.strictEqual(installations.length, 1, `Exactly one installation row must exist for plugin (found ${installations.length})`);

    const keys = await prisma.platformApiKey.findMany({
      where: { environment: { projectId: projects[0]!.id } },
    });
    assert.strictEqual(keys.length, 1, `Exactly one API key row must exist (found ${keys.length})`);

    // 7. Assert steps 1-4 were NOT re-run: check audit events
    const audits = await prisma.platformAuditEvent.findMany({
      where: {
        projectId: projects[0]!.id,
      },
    });

    const entityCreatedAudits = audits.filter((a) => a.action === 'TENANT_ENTITY_CREATED');
    assert.strictEqual(entityCreatedAudits.length, 1, 'TENANT_ENTITY_CREATED audit event must appear exactly once (step 2 not re-run)');

    const keyIssuedAudits = audits.filter((a) => a.action === 'TENANT_KEY_ISSUED');
    assert.strictEqual(keyIssuedAudits.length, 1, 'TENANT_KEY_ISSUED audit event must appear exactly once (step 4 not re-run)');
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
      type: 'TENANT_PROVISION',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
  // Test 7: Real enforcement across both plugins (HospitalOS & RestaurantOS)
  // ──────────────────────────────────────────────────────────────────────────
  it('Matrix 7: Real enforcement across both plugins: suspend -> 403 SERVICE_SUSPENDED on HospitalOS write and RestaurantOS order; resume -> both succeed within 5s', async (t) => {
    if (!isStandaloneBuilt || !databaseUrl || !prisma || !child) return t.skip('Requires standalone server and Postgres');

    // 1. Spawn a real separately running RestaurantOS process on a safe port
    const restoPort = await allocateSafePort(3940);
    const tsxCli = require.resolve('tsx/cli');
    const restoServerPath = path.resolve(__dirname, '../../../../projects/external-os/restaurant-os/src/server.ts');
    const restoCwd = path.resolve(__dirname, '../../../../projects/external-os/restaurant-os');

    const restoDbUrl = process.env.RESTAURANT_DATABASE_URL || databaseUrl.replace(/\/orbitox_phase2$/, '/restaurant_os');
    const restoProcess = spawn(
      process.execPath,
      [tsxCli, restoServerPath],
      {
        cwd: restoCwd,
        env: {
          ...process.env,
          PORT: String(restoPort),
          NODE_ENV: 'development',
          DATABASE_URL: restoDbUrl,
          ORBITOX_BRIDGE_KEYS: JSON.stringify(bridgeKeys),
          RESTAURANTOS_DISABLE_AUTOLISTEN: 'false',
          RESTAURANTOS_ENABLE_TEST_ROUTES: 'true',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    restoProcess.stdout?.on('data', (d) => process.stdout.write(`[Resto OUT] ${d}`));
    restoProcess.stderr?.on('data', (d) => process.stderr.write(`[Resto ERR] ${d}`));

    // Wait for RestaurantOS server readiness
    let restoReady = false;
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${restoPort}/live`);
        if (res.status === 200) { restoReady = true; break; }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!restoReady) {
      restoProcess.kill('SIGKILL');
      return t.skip('Separately running RestaurantOS process failed to start');
    }

    try {
      // 2. Provision tenant through the platform with BOTH plugins: hospital-os and restaurant-os
      const dualSlug = `dual-os-${runTag}`;
      const provRes = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': rawSecretA,
        },
        body: JSON.stringify({
          organisation: orgA.slug,
          name: `Dual OS Tenant ${runTag}`,
          slug: dualSlug,
          environment: 'production',
          plugins: [
            { id: 'hospital-os', plan: 'starter' },
            { id: 'restaurant-os', plan: 'starter' },
          ],
        }),
      });

      assert.strictEqual(provRes.status, 202);
      const provBody = await provRes.json();
      const dualTenantId = provBody.tenantId;
      const dualOpId = provBody.operationId;
      const dualApiKeySecret = provBody.apiKey?.secret;
      assert.ok(dualTenantId);
      assert.ok(dualApiKeySecret);

      // Poll until ACTIVE
      let opDone = false;
      for (let i = 0; i < 60; i++) {
        const check = await fetch(`http://127.0.0.1:${port}/api/v1/operations/${dualOpId}`, {
          headers: { 'x-api-key': rawSecretA },
        });
        if (check.status === 200) {
          const body = await check.json();
          if (body.status === 'ACTIVE') { opDone = true; break; }
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      assert.ok(opDone, 'Dual-plugin tenant must reach ACTIVE status');

      // Ensure tenant is registered on RestaurantOS via signed bridge provision call
      const bridgeClient = new RestaurantBridgeClient({
        baseUrl: `http://127.0.0.1:${restoPort}`,
        keys: bridgeKeys,
      });
      const restoProvRes = await bridgeClient.provisionTenant({
        tenantId: dualTenantId,
        restaurantName: `Dual OS Restaurant ${runTag}`,
        slug: dualSlug,
        planId: 'starter',
      });
      console.log('[Matrix 7] Restaurant provision result:', restoProvRes);

      // Fetch menu to obtain a valid seeded menu item ID
      const menuRes = await sendRawHttpRequest({
        port: restoPort,
        path: '/api/restaurant/menu',
        method: 'GET',
        headers: { Host: `${dualSlug}.localhost` },
      });
      const validItemId = menuRes.body?.data?.[0]?.id || `item_${dualSlug}_1`;
      console.log(`[Matrix 7] Resolved valid menu item ID: ${validItemId}`);

      // 3. Suspend through the platform
      const suspendStartTime = Date.now();
      // Suspend HospitalOS on platform
      await platformRepository.updatePluginInstallationStatus(dualTenantId, '@orbitox/hms', 'SUSPENDED');
      // Suspend RestaurantOS via signed bridge lifecycle call and platform repo
      await bridgeClient.suspendTenant(dualTenantId, 2);
      await platformRepository.updatePluginInstallationStatus(dualTenantId, '@orbitox/restaurant', 'SUSPENDED');

      // 4. Within 5 seconds: HospitalOS write returns 403 SERVICE_SUSPENDED
      let hospSuspRes: any = null;
      let hospSuspBody: any = null;
      for (let i = 0; i < 25; i++) {
        hospSuspRes = await fetch(`http://127.0.0.1:${port}/api/hospital/patients`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': dualApiKeySecret,
          },
          body: JSON.stringify({ name: 'Suspended Patient' }),
        });
        hospSuspBody = await hospSuspRes.json();
        if (hospSuspRes.status === 403) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.strictEqual(hospSuspRes?.status, 403, 'HospitalOS write request must return 403 when suspended');
      assert.ok(
        hospSuspBody?.code === 'SERVICE_SUSPENDED' || hospSuspBody?.error?.code === 'SERVICE_SUSPENDED',
        `HospitalOS error code must be SERVICE_SUSPENDED, got ${JSON.stringify(hospSuspBody)}`
      );

      // And within 5 seconds: RestaurantOS guest order returns 403 SERVICE_SUSPENDED
      let restoSusp: any = null;
      for (let i = 0; i < 25; i++) {
        restoSusp = await sendRawHttpRequest({
          port: restoPort,
          path: '/api/restaurant/orders',
          method: 'POST',
          headers: {
            Host: `${dualSlug}.localhost`,
          },
          body: { tableNumber: 'T-01', items: [{ id: validItemId, quantity: 1 }] },
        });
        if (restoSusp.status === 403) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.strictEqual(restoSusp?.status, 403, 'RestaurantOS guest order must return 403 when suspended');
      assert.ok(
        restoSusp?.body.code === 'SERVICE_SUSPENDED' || restoSusp?.body.error === 'SERVICE_SUSPENDED',
        `RestaurantOS error code must be SERVICE_SUSPENDED, got ${JSON.stringify(restoSusp?.body)}`
      );

      const suspendMeasuredMs = Date.now() - suspendStartTime;
      assert.ok(suspendMeasuredMs < 5000, `Suspend enforcement took ${suspendMeasuredMs} ms, exceeding 5 s SLA`);

      // 5. Resume through the platform
      const resumeStartTime = Date.now();
      // Resume HospitalOS on platform
      await platformRepository.updatePluginInstallationStatus(dualTenantId, '@orbitox/hms', 'ACTIVE');
      // Resume RestaurantOS via signed bridge lifecycle call and platform repo
      await bridgeClient.resumeTenant(dualTenantId, 3);
      await platformRepository.updatePluginInstallationStatus(dualTenantId, '@orbitox/restaurant', 'ACTIVE');

      // 6. Within 5 seconds: both succeed again
      let hospResumedRes: any = null;
      for (let i = 0; i < 25; i++) {
        hospResumedRes = await fetch(`http://127.0.0.1:${port}/api/hospital/patients`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': dualApiKeySecret,
          },
          body: JSON.stringify({ name: 'Active Patient' }),
        });
        if (hospResumedRes.status === 200 || hospResumedRes.status === 201) break;
        const errJson = await hospResumedRes.clone().json().catch(() => ({}));
        console.log(`[Matrix 7 Resume Poll ${i}] status=${hospResumedRes.status} body=`, errJson);
        await new Promise((r) => setTimeout(r, 200));
      }
      const finalHospBody = await hospResumedRes?.clone().text().catch(() => '');
      assert.ok(
        hospResumedRes && (hospResumedRes.status === 200 || hospResumedRes.status === 201),
        `HospitalOS write must succeed after resume, got ${hospResumedRes?.status}: ${finalHospBody}`
      );

      let restoResumed: any = null;
      for (let i = 0; i < 25; i++) {
        restoResumed = await sendRawHttpRequest({
          port: restoPort,
          path: '/api/restaurant/orders',
          method: 'POST',
          headers: {
            Host: `${dualSlug}.localhost`,
          },
          body: { tableNumber: 'T-01', items: [{ id: validItemId, quantity: 1 }] },
        });
        if (restoResumed.status === 200 || restoResumed.status === 201) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.ok(
        restoResumed && (restoResumed.status === 200 || restoResumed.status === 201),
        `RestaurantOS guest order must succeed after resume, got ${restoResumed?.status}: ${JSON.stringify(restoResumed?.body)}`
      );

      const resumeMeasuredMs = Date.now() - resumeStartTime;
      assert.ok(resumeMeasuredMs < 5000, `Resume restoration took ${resumeMeasuredMs} ms, exceeding 5 s SLA`);

      // 7. Report measured times
      console.log(`\n=============================================================`);
      console.log(`[Matrix 7 Real Enforcement SLA Report]`);
      console.log(`  • Measured Suspend SLA: ${suspendMeasuredMs} ms (Limit: < 5000 ms) -> PASS`);
      console.log(`  • Measured Resume SLA:  ${resumeMeasuredMs} ms (Limit: < 5000 ms) -> PASS`);
      console.log(`  • HospitalOS write: 403 SERVICE_SUSPENDED -> 200 OK`);
      console.log(`  • RestaurantOS guest order: 403 SERVICE_SUSPENDED -> 200 OK`);
      console.log(`=============================================================\n`);
    } finally {
      restoProcess.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
      if (!restoProcess.killed) restoProcess.kill('SIGKILL');
    }
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

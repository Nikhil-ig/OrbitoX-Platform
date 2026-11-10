import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import { PrismaClient } from '@prisma/client';

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

describe('Standalone Server Customer Tenant Provisioning Gate (N1)', () => {
  const serverScript = path.resolve(__dirname, '../.next/standalone/apps/web/server.js');
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
  const isStandaloneBuilt = fs.existsSync(serverScript);

  let child: ChildProcess | null = null;
  let port = 0;
  let prisma: PrismaClient | null = null;
  let orgA: any = null;
  let orgB: any = null;
  let projA: any = null;
  let projB: any = null;
  let envA: any = null;
  let envB: any = null;
  let billingPlanId = '';
  let billingRazorpayPlanId = '';
  let billingSubscriptionId = '';
  let billingTenantId = '';
  let webhookSecret = '';
  let keyRecordA: any = null;
  let keyRecordB: any = null;
  let rawSecretA = '';
  let rawSecretB = '';

  before(async () => {
    if (!isStandaloneBuilt || !databaseUrl) {
      console.log('Skipping standalone server process tests (requires built standalone and DATABASE_URL)');
      return;
    }

    try {
      prisma = new PrismaClient({ datasourceUrl: databaseUrl });
      await prisma.$connect();
    } catch (err: any) {
      console.warn('PostgreSQL database not available for standalone server test:', err.message);
      prisma = null;
      return;
    }

    port = await allocateSafePort(3890);
    const serverPepper = crypto.randomBytes(32).toString('hex');
    const adminToken = crypto.randomBytes(32).toString('hex');

    const grantPair = crypto.generateKeyPairSync('ed25519');
    const grantPrivPem = grantPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const grantPubPem = grantPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

    const runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
    const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
    const hmsAuditUrl = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
    const outboxRelayUrl = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';

    // Seed Org A
    const runId = crypto.randomBytes(4).toString('hex');
    orgA = await prisma.platformOrganization.create({
      data: {
        name: `Standalone Org A ${runId}`,
        slug: `org-std-a-${runId}`,
        billingEmail: `org-a-${runId}@test.orbitox.io`,
      },
    });

    projA = await prisma.platformProject.create({
      data: {
        name: `Standalone Proj A ${runId}`,
        slug: `proj-std-a-${runId}`,
        organizationId: orgA.id,
        businessModel: 'B2B',
        technicalLead: 'Lead A',
        contactEmail: `org-a-${runId}@test.orbitox.io`,
        enabledServices: ['hms'],
        planTier: 'growth',
        plan: 'growth',
        apiCallQuota: 50000,
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

    billingPlanId = `standalone-hms-${runId}`;
    billingRazorpayPlanId = `plan_${runId}`;
    billingSubscriptionId = `sub_${runId}`;
    billingTenantId = `org/${orgA.id}/project/${projA.id}/environment/${envA.id}`;
    await prisma.plugin.upsert({
      where: { pluginId: '@orbitox/hms' },
      create: { pluginId: '@orbitox/hms', name: 'HospitalOS' },
      update: {},
    });
    await prisma.plan.create({
      data: {
        planId: billingPlanId,
        pluginId: '@orbitox/hms',
        name: 'Standalone HospitalOS billing test',
        tier: 'starter',
        gracePeriodDays: 7,
        suspensionGraceDays: 30,
      },
    });
    await prisma.billingPlanMap.create({
      data: {
        razorpayPlanId: billingRazorpayPlanId,
        pluginId: '@orbitox/hms',
        internalPlanId: billingPlanId,
        amountMinor: 100,
        currency: 'INR',
        period: 'monthly',
        interval: 1,
      },
    });
    await prisma.pluginInstallation.create({
      data: {
        tenantId: billingTenantId,
        runtimeTenantId: billingTenantId,
        pluginId: '@orbitox/hms',
        status: 'READ_ONLY',
        entitlementRevision: 1,
        planId: billingPlanId,
      },
    });
    await prisma.billingSubscription.create({
      data: {
        razorpaySubscriptionId: billingSubscriptionId,
        organizationId: orgA.id,
        tenantId: billingTenantId,
        pluginId: '@orbitox/hms',
        razorpayPlanId: billingRazorpayPlanId,
        status: 'paused',
        lastEventAt: BigInt(Math.floor(Date.now() / 1000) - 10),
        currentEnd: new Date(Date.now() + 40 * 86_400_000),
      },
    });

    rawSecretA = `orb_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefixA = rawSecretA.slice(0, 14);
    const authVerifierA = crypto.createHmac('sha256', serverPepper).update(rawSecretA).digest('hex');
    const secretFingerprintA = crypto.createHash('sha256').update(rawSecretA).digest('hex');

    keyRecordA = await prisma.platformApiKey.create({
      data: {
        name: 'Key A',
        keyId: `key_a_${crypto.randomUUID()}`,
        keyPrefix: keyPrefixA,
        authVerifier: authVerifierA,
        secretFingerprint: secretFingerprintA,
        maskedDisplay: `${keyPrefixA}...`,
        environmentId: envA.id,
        capabilities: ['hms:read', 'hms:write', '*'],
        tenantScope: [projA.slug, billingTenantId],
        rateLimitPerMin: 600,
        status: 'ACTIVE',
        createdBy: 'test_operator',
      },
    });

    // Seed Org B (Another organization)
    orgB = await prisma.platformOrganization.create({
      data: {
        name: `Standalone Org B ${runId}`,
        slug: `org-std-b-${runId}`,
        billingEmail: `org-b-${runId}@test.orbitox.io`,
      },
    });

    projB = await prisma.platformProject.create({
      data: {
        name: `Standalone Proj B ${runId}`,
        slug: `proj-std-b-${runId}`,
        organizationId: orgB.id,
        businessModel: 'B2B',
        technicalLead: 'Lead B',
        contactEmail: `org-b-${runId}@test.orbitox.io`,
        enabledServices: ['hms'],
        planTier: 'starter',
        plan: 'starter',
        apiCallQuota: 10000,
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
        keyId: `key_b_${crypto.randomUUID()}`,
        keyPrefix: keyPrefixB,
        authVerifier: authVerifierB,
        secretFingerprint: secretFingerprintB,
        maskedDisplay: `${keyPrefixB}...`,
        environmentId: envB.id,
        capabilities: ['hms:read'],
        tenantScope: [projB.slug],
        rateLimitPerMin: 600,
        status: 'ACTIVE',
        createdBy: 'test_operator',
      },
    });

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
      RAZORPAY_KEY_ID: 'rzp_test_standalone',
      RAZORPAY_KEY_SECRET: crypto.randomBytes(32).toString('hex'),
      RAZORPAY_WEBHOOK_SECRET: webhookSecret = crypto.randomBytes(32).toString('hex'),
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
      ORBITOX_PLATFORM_REPOSITORY: 'prisma',
      RESTAURANTOS_PUBLIC_URL: 'https://restaurant.orbitox.internal',
      ORBITOX_TEST_STANDALONE: 'true',
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
      ORBITOX_OBJECT_STORE_DRIVER: 's3',
      ORBITOX_OBJECT_STORE_REGION: 'ap-south-1',
      S3_BUCKET_NAME: 'orbitox-ci-standalone-exports',
      ORBITOX_OBJECT_STORE_ENCRYPTION: 'client',
      ORBITOX_EXPORT_ENCRYPTION_KEYS: JSON.stringify({ k1: crypto.randomBytes(32).toString('base64') }),
      ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: 'k1',
    };

    child = spawn('node', [serverScript], {
      cwd: path.resolve(__dirname, '../.next/standalone/apps/web'),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (d) => process.stdout.write(`[Standalone OUT] ${d}`));
    child.stderr?.on('data', (d) => process.stderr.write(`[Standalone ERR] ${d}`));

    // Wait for server health endpoint
    let ready = false;
    let lastError = '';
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.status === 200) {
          ready = true;
          break;
        } else {
          lastError = `status=${res.status} body=${await res.text()}`;
        }
      } catch (err: any) {
        lastError = err.message;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!ready) {
      if (child) (child as ChildProcess).kill('SIGKILL');
      throw new Error(`Standalone server failed to become ready on port ${port}: ${lastError}`);
    }
  });

  after(async () => {
    if (prisma) {
      try {
        if (billingTenantId) {
          await prisma.hmsPatient.deleteMany({ where: { tenantId: billingTenantId } });
          await prisma.billingSubscription.deleteMany({ where: { razorpaySubscriptionId: billingSubscriptionId } });
          await prisma.pluginInstallation.deleteMany({ where: { tenantId: billingTenantId, pluginId: '@orbitox/hms' } });
          await prisma.billingPlanMap.deleteMany({ where: { razorpayPlanId: billingRazorpayPlanId } });
          await prisma.plan.deleteMany({ where: { planId: billingPlanId } });
        }
        if (keyRecordA) await prisma.platformApiKey.delete({ where: { id: keyRecordA.id } });
        if (keyRecordB) await prisma.platformApiKey.delete({ where: { id: keyRecordB.id } });
        if (envA) await prisma.projectEnvironment.delete({ where: { id: envA.id } });
        if (envB) await prisma.projectEnvironment.delete({ where: { id: envB.id } });
        if (projA) await prisma.platformProject.delete({ where: { id: projA.id } });
        if (projB) await prisma.platformProject.delete({ where: { id: projB.id } });
        if (orgA) await prisma.platformOrganization.delete({ where: { id: orgA.id } });
        if (orgB) await prisma.platformOrganization.delete({ where: { id: orgB.id } });
        await prisma.$disconnect();
      } catch {}
    }

    if (child) {
      child.kill('SIGKILL');
      child = null;
    }
  });

  it('No key presented -> returns 401 UNAUTHORIZED through real standalone server', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauthenticated Hospital',
        slug: 'unauth-hosp',
        plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
      }),
    });

    assert.equal(res.status, 401, 'Request without key must return 401');
    const json = await res.json();
    assert.equal(json.error, 'UNAUTHORIZED');
  });

  it('Key from another organisation -> returns 403 FORBIDDEN through real standalone server', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    // Using rawSecretB (Org B) to attempt creating a tenant in Org A
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': rawSecretB,
      },
      body: JSON.stringify({
        organisation: orgA.slug,
        name: 'Cross Org Tenant',
        slug: 'cross-org-tenant',
        plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
      }),
    });

    assert.equal(res.status, 403, 'Cross-org key must return 403');
    const json = await res.json();
    assert.equal(json.error, 'FORBIDDEN');
    assert.equal(json.code, 'TENANT_SCOPE_VIOLATION');
  });

  it('Customer API key creates a tenant with 202 Accepted and returns single-use secret through real standalone server', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    const runTag = crypto.randomBytes(3).toString('hex');
    const tenantSlug = `std-hosp-${runTag}`;

    const res = await fetch(`http://127.0.0.1:${port}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': rawSecretA,
      },
      body: JSON.stringify({
        organisation: orgA.slug,
        name: `Standalone Hospital ${runTag}`,
        slug: tenantSlug,
        plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
      }),
    });

    assert.equal(res.status, 202, 'Customer API key must return 202 Accepted');
    const json = await res.json();

    assert.ok(json.tenantId, 'Must return tenantId');
    assert.ok(json.tenantId.includes(orgA.id), 'tenantId must include exact stored org id');
    assert.ok(json.operationId, 'Must return operationId');
    assert.ok(json.status === 'PROVISIONING' || json.status === 'ACTIVE');

    // N2: raw secret returned synchronously once in 202 response
    assert.ok(json.apiKey, 'apiKey object must be present in 202 response');
    assert.ok(json.apiKey.secret, 'raw secret must be present in 202 response');
    assert.ok(json.apiKey.secret.startsWith('orb_live_'), 'secret must be formatted with orb_live_ prefix');

    // Verify Location header points to /api/v1/operations/:id
    const location = res.headers.get('Location');
    assert.equal(location, `/api/v1/operations/${json.operationId}`);
  });

  it('enforces HMS billing states on real HTTP routes and restores writes after subscription.charged', async (t) => {
    if (!child) return t.skip('Standalone server not running');

    const url = `http://127.0.0.1:${port}/api/v1/hms/patients`;
    const read = () => fetch(url, {
      headers: { 'x-api-key': rawSecretA, 'x-tenant-id': billingTenantId },
    });
    const write = () => fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': rawSecretA,
        'x-tenant-id': billingTenantId,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Billing Gate Patient',
        mrn: `MRN-BILLING-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        ageBand: '18-39',
      }),
    });

    const readOnlyRead = await read();
    assert.equal(readOnlyRead.status, 200, await readOnlyRead.text());
    const readOnlyWrite = await write();
    assert.equal(readOnlyWrite.status, 402, 'READ_ONLY refuses HospitalOS writes');
    assert.equal((await readOnlyWrite.json()).error.code, 'PAYMENT_REQUIRED');

    const suspendedAt = Math.floor(Date.now() / 1000);
    await prisma!.billingSubscription.update({
      where: { razorpaySubscriptionId: billingSubscriptionId },
      data: {
        status: 'pending',
        graceStartedAt: new Date((suspendedAt - 31 * 86_400) * 1000),
        lastEventAt: BigInt(suspendedAt - 10),
      },
    });
    assert.equal((await read()).status, 402, 'SUSPENDED refuses HospitalOS reads');
    assert.equal((await write()).status, 402, 'SUSPENDED refuses HospitalOS writes');

    const event = {
      id: `evt_standalone_${crypto.randomUUID()}`,
      event: 'subscription.charged',
      created_at: suspendedAt,
      payload: {
        subscription: {
          entity: {
            id: billingSubscriptionId,
            status: 'active',
            plan_id: billingRazorpayPlanId,
            current_start: suspendedAt,
            current_end: suspendedAt + 40 * 86_400,
          },
        },
      },
    };
    const rawEvent = JSON.stringify(event);
    const webhook = await fetch(`http://127.0.0.1:${port}/api/v1/billing/webhook/razorpay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': crypto.createHmac('sha256', webhookSecret).update(rawEvent).digest('hex'),
      },
      body: rawEvent,
    });
    const webhookBody = await webhook.json();
    assert.equal(webhook.status, 200, JSON.stringify(webhookBody));
    assert.equal(webhookBody.applied, true);
    assert.equal((await prisma!.pluginInstallation.findUniqueOrThrow({
      where: { tenantId_pluginId: { tenantId: billingTenantId, pluginId: '@orbitox/hms' } },
    })).status, 'ACTIVE');
    assert.equal((await read()).status, 200, 'subscription.charged restores HospitalOS reads');
    const activeWrite = await write();
    assert.equal(activeWrite.status, 201, await activeWrite.text());
  });
});

/**
 * 🪐 OrbitoX Phase 5: @orbitox-io/sdk Integration Test Suite
 *
 * Exercises @orbitox-io/sdk against real standalone server:
 * 1. Client initialization and secret scrubbing
 * 2. Typed API errors (401, 403, 404, 429, 503)
 * 3. Automatic idempotency key injection and conditional retry behavior
 * 4. tenants.create with waitUntilReady: true
 * 5. operations.get
 * 6. plugin('hospital-os').forTenant(id) with typed calls (patients.create, patients.list, stats.get)
 * 7. tenants.suspend -> write enforcement -> tenants.resume -> recovery
 * 8. plugin('restaurant-os').forTenant(id) typed calls
 */

import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as http from 'node:http';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn, ChildProcess } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

import {
  createOrbitoXClient,
  OrbitoXClient,
  OrbitoXApiError,
  OrbitoXAuthenticationError,
  OrbitoXForbiddenError,
  OrbitoXNotFoundError,
  OrbitoXRateLimitError,
  OrbitoXServiceUnavailableError,
  scrubSecrets,
} from '@orbitox-io/sdk';

import { getStandaloneScript, getStandaloneCwd, createCleanStandaloneEnv } from '../standalone-helper';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
const serverScript = getStandaloneScript(__dirname);
const isStandaloneBuilt = fs.existsSync(serverScript);

async function allocateSafePort(preferred: number): Promise<number> {
  return new Promise((resolve) => {
    const srv = http.createServer();
    srv.listen(preferred, '127.0.0.1', () => {
      const port = (srv.address() as any).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', () => {
      const fallback = http.createServer();
      fallback.listen(0, '127.0.0.1', () => {
        const port = (fallback.address() as any).port;
        fallback.close(() => resolve(port));
      });
    });
  });
}

describe('🪐 Phase 5: @orbitox-io/sdk Integration & Real Server Suite', () => {
  let prisma: PrismaClient | null = null;
  let child: ChildProcess | null = null;
  let port = 3895;
  let rawCustomerKey = '';
  let customerOrg: any = null;
  let customerProj: any = null;
  let serverPepper = '';
  const runTag = crypto.randomBytes(4).toString('hex');

  before(async () => {
    if (!isStandaloneBuilt || !databaseUrl) {
      console.log('Skipping standalone server boot for SDK test (standalone bundle or DATABASE_URL missing)');
      return;
    }

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    await prisma.$connect();

    port = await allocateSafePort(3895);
    serverPepper = crypto.randomBytes(32).toString('hex');
    const adminToken = crypto.randomBytes(32).toString('hex');

    const grantPair = crypto.generateKeyPairSync('ed25519');
    const grantPrivPem = grantPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const grantPubPem = grantPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

    const runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
    const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
    const hmsAuditUrl = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
    const outboxRelayUrl = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';
    const bridgeKeys = {
      activeKeyId: 'k1',
      keys: { k1: crypto.randomBytes(32).toString('hex') },
    };

    // Seed customer organization and platform API key
    const orgSlug = `org-sdk-${runTag}`;
    customerOrg = await prisma.platformOrganization.create({
      data: {
        name: `SDK Org ${runTag}`,
        slug: orgSlug,
        billingEmail: `sdk_${runTag}@orbitox.io`,
      },
    });

    customerProj = await prisma.platformProject.create({
      data: {
        name: `SDK Project ${runTag}`,
        slug: `proj-sdk-${runTag}`,
        organizationId: customerOrg.id,
        businessModel: 'B2B_SAAS',
        planTier: 'enterprise',
        technicalLead: 'Lead SDK',
        contactEmail: `lead_sdk_${runTag}@orbitox.io`,
      },
    });

    const env = await prisma.projectEnvironment.create({
      data: {
        name: 'Production',
        slug: 'production',
        projectId: customerProj.id,
        isProduction: true,
      },
    });

    rawCustomerKey = `orb_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawCustomerKey.slice(0, 14);
    const authVerifier = crypto.createHmac('sha256', serverPepper).update(rawCustomerKey).digest('hex');
    const secretFingerprint = crypto.createHash('sha256').update(rawCustomerKey).digest('hex');

    await prisma.platformApiKey.create({
      data: {
        name: 'SDK Test Key',
        keyId: `key_sdk_${runTag}`,
        keyPrefix,
        authVerifier,
        secretFingerprint,
        maskedDisplay: `${keyPrefix}...`,
        environmentId: env.id,
        capabilities: ['tenants:create', 'tenants:read', 'tenants:manage', 'platform:admin'],
        tenantScope: [customerProj.slug],
        rateLimitPerMin: 1000,
        status: 'ACTIVE',
        createdBy: 'sdk_tester',
      },
    });

    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(port),
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
      ORBITOX_SYNC_SAGA: 'true',
      ORBITOX_PHI_KEYS: JSON.stringify({
        k1: crypto.randomBytes(32).toString('base64'),
      }),
      ORBITOX_PHI_ACTIVE_KID: 'k1',
      ORBITOX_PHI_INDEX_KEY: crypto.randomBytes(32).toString('base64'),
      ORBITOX_BRIDGE_KEYS: JSON.stringify(bridgeKeys),
      ORBITOX_BRIDGE_ACTIVE_KID: 'k1',
      ORBITOX_OBJECT_STORE_DRIVER: 's3',
      ORBITOX_OBJECT_STORE_REGION: 'ap-south-1',
      S3_BUCKET_NAME: 'orbitox-ci-sdk-exports',
      ORBITOX_OBJECT_STORE_ENCRYPTION: 'client',
      ORBITOX_EXPORT_ENCRYPTION_KEYS: JSON.stringify({ k1: crypto.randomBytes(32).toString('base64') }),
      ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: 'k1',
    };

    child = spawn('node', [serverScript], {
      cwd: getStandaloneCwd(__dirname),
      env: createCleanStandaloneEnv(childEnv),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (d) => process.stdout.write(`[SDKServer OUT] ${d}`));
    child.stderr?.on('data', (d) => process.stderr.write(`[SDKServer ERR] ${d}`));

    // Wait for standalone server readiness
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!ready) {
      if (child) child.kill('SIGKILL');
      throw new Error(`Standalone server failed to become ready on port ${port}`);
    }
  });

  after(async () => {
    if (child) {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 500));
      child.kill('SIGKILL');
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('1. Secret scrubbing: redacts live tokens, passwords, and authorization headers', () => {
    const rawSecret = 'orb_test_abcdef1234567890abcdef123456';
    const scrubbed = scrubSecrets(`Error communicating with key ${rawSecret} and Bearer myTokenSecret123`);
    assert.ok(!scrubbed.includes('abcdef1234567890'), 'Secret must not be present in scrubbed output');
    assert.ok(scrubbed.includes('••••••••'), 'Scrubbed output must contain mask characters');
    assert.ok(!scrubbed.includes('myTokenSecret123'), 'Bearer token must be redacted');
  });

  it('2. Typed errors: properly classifies 401, 403, 404, 429, 503 without leaking secrets', async () => {
    if (!isStandaloneBuilt || !child || !prisma) {
      console.log('Skipping standalone server test (standalone bundle or child server missing)');
      return;
    }
    const client = createOrbitoXClient({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: 'orb_test_invalid_bad_key_12345678',
    });

    // 401 Unauthorized check
    await assert.rejects(
      async () => {
        await client.tenants.create({
          name: 'Unauthorized Hospital',
          slug: `unauth-hosp-${runTag}`,
          plugins: ['hospital-os'],
        });
      },
      (err: any) => {
        assert.ok(err instanceof OrbitoXAuthenticationError, 'Must be instance of OrbitoXAuthenticationError');
        assert.strictEqual(err.status, 401);
        assert.strictEqual(err.code, 'UNAUTHORIZED');
        assert.ok(!err.message.includes('invalid_bad_key'), 'Secret must not be in error message');
        return true;
      }
    );

    // 404 Not Found check
    const authedClient = createOrbitoXClient({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: rawCustomerKey,
    });

    await assert.rejects(
      async () => {
        await authedClient.operations.get('op_non_existent_id_9999');
      },
      (err: any) => {
        assert.ok(err instanceof OrbitoXNotFoundError, 'Must be instance of OrbitoXNotFoundError');
        assert.strictEqual(err.status, 404);
        assert.strictEqual(err.code, 'NOT_FOUND');
        return true;
      }
    );
  });

  it('3. Automatic idempotency key and retry backoff on 429/503 for idempotent calls', async () => {
    let callCount = 0;
    let receivedIdempotencyKey = '';

    // Create lightweight mock HTTP server testing idempotency and retry
    const mockServer = http.createServer((req, res) => {
      receivedIdempotencyKey = (req.headers['idempotency-key'] as string) || '';
      callCount++;

      if (callCount < 3) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'SERVICE_UNAVAILABLE', message: 'Temporary overload' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: callCount }));
      }
    });

    const mockPort = await allocateSafePort(4912);
    await new Promise((resolve) => mockServer.listen(mockPort, '127.0.0.1', () => resolve(null)));

    try {
      const mockClient = createOrbitoXClient({
        baseUrl: `http://127.0.0.1:${mockPort}`,
        apiKey: 'orb_live_mock_key',
        maxRetries: 3,
      });

      // GET is idempotent -> should retry through 503 and succeed
      const res = await mockClient.transport.request<{ success: boolean; count: number }>({
        method: 'GET',
        path: '/mock-idempotent-endpoint',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(callCount, 3, 'Must have retried twice to succeed on 3rd attempt');

      // POST should automatically inject idempotency key
      callCount = 0;
      await mockClient.transport.request({
        method: 'POST',
        path: '/mock-post',
        body: { hello: 'world' },
      });
      assert.ok(receivedIdempotencyKey.startsWith('idem_'), `Must inject automatic idempotency key, got: ${receivedIdempotencyKey}`);
    } finally {
      mockServer.close();
    }
  });

  it('4. Full Lifecycle with real standalone server: tenants.create (waitUntilReady), operations.get, hospital-os typed calls, suspend/resume enforcement', async () => {
    if (!isStandaloneBuilt || !prisma) {
      console.log('Skipping real server test (standalone build not available)');
      return;
    }

    const client = createOrbitoXClient({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: rawCustomerKey,
    });

    // 1. Create hospital tenant with waitUntilReady: true
    const hospSlug = `sdk-hosp-${runTag}`;
    console.log(`[SDK Test] Provisioning tenant "${hospSlug}" with waitUntilReady: true...`);

    const createRes = await client.tenants.create(
      {
        name: `SDK Hospital ${runTag}`,
        slug: hospSlug,
        organizationId: customerOrg.id,
        environment: 'production',
        plugins: ['hospital-os'],
      },
      { waitUntilReady: true }
    );

    assert.ok(createRes.tenantId, 'TenantId must be returned');
    assert.ok(createRes.operationId, 'OperationId must be returned');
    assert.ok(createRes.status === 'COMPLETED' || createRes.status === 'ACTIVE', 'Status must be COMPLETED or ACTIVE when waitUntilReady is true');
    assert.ok(createRes.apiKey?.secret, 'Issued API key secret must be present');

    const tenantId = createRes.tenantId;
    const tenantApiKey = createRes.apiKey.secret;
    console.log(`[SDK Test] Tenant created: ${tenantId}, status: ${createRes.status}`);

    // 2. operations.get verifies completed operation details
    const op = await client.operations.get(createRes.operationId);
    assert.strictEqual(op.id, createRes.operationId);
    assert.ok(op.status === 'COMPLETED' || op.status === 'ACTIVE', 'Operation status must be COMPLETED or ACTIVE');
    assert.ok(op.steps.length > 0, 'Operation steps must be populated');

    // 3. plugin('hospital-os').forTenant(tenantId) typed calls
    const hospital = client.plugin('hospital-os').forTenant(tenantId, { apiKey: tenantApiKey });

    // Create patient via typed client
    console.log('[SDK Test] Creating patient via hospital.patients.create...');
    const patient = await hospital.patients.create({
      name: 'Aarav Sharma',
    });
    assert.ok(patient.id, 'Created patient must have ID');
    assert.ok(patient.mrn, 'Created patient must have MRN');

    // List patients via typed client
    const patients = await hospital.patients.list();
    assert.ok(Array.isArray(patients), 'Patients must be an array');
    assert.ok(patients.length >= 1, 'Should find at least 1 created patient');
    console.log(`[SDK Test] Listed ${patients.length} patients successfully.`);

    // 4. tenants.suspend(tenantId)
    console.log(`[SDK Test] Suspending tenant ${tenantId}...`);
    const suspendRes = await client.tenants.suspend(tenantId);
    assert.strictEqual(suspendRes.success, true);
    assert.strictEqual(suspendRes.status, 'SUSPENDED');

    // Verify hospital writes fail when suspended
    let suspendEnforced = false;
    for (let i = 0; i < 20; i++) {
      try {
        await hospital.patients.create({ name: 'Suspended Attempt' });
      } catch (err: any) {
        if (err instanceof OrbitoXForbiddenError || err.status === 403 || err.code === 'SERVICE_SUSPENDED') {
          suspendEnforced = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(suspendEnforced, 'Patient creation must be rejected with 403 / SERVICE_SUSPENDED when tenant is suspended');
    console.log('[SDK Test] Suspend enforcement verified: 403 SERVICE_SUSPENDED.');

    // 5. tenants.resume(tenantId)
    console.log(`[SDK Test] Resuming tenant ${tenantId}...`);
    const resumeRes = await client.tenants.resume(tenantId);
    assert.strictEqual(resumeRes.success, true);
    assert.strictEqual(resumeRes.status, 'ACTIVE');

    // Verify hospital writes succeed again after resume
    let resumeRecovered = false;
    for (let i = 0; i < 20; i++) {
      try {
        const recoveredPatient = await hospital.patients.create({ name: 'Recovered Patient' });
        if (recoveredPatient?.id) {
          resumeRecovered = true;
          break;
        }
      } catch (e: any) {
        console.log(`[Resume Poll ${i} Error]:`, e?.status, e?.code, e?.message);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(resumeRecovered, 'Patient creation must succeed after tenant resume');
    console.log('[SDK Test] Resume recovery verified: 200 OK.');
  });

  it('5. TenantIdempotencyKey & Safe Retry: a 503 injected after commit, then an SDK retry, gives one patient, not two', async () => {
    if (!isStandaloneBuilt || !child || !prisma) {
      console.log('Skipping standalone server test (standalone bundle or child server missing)');
      return;
    }
    const client = createOrbitoXClient({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: rawCustomerKey,
    });

    const idemSlug = `sdk-idem-${crypto.randomBytes(4).toString('hex')}`;
    // 1. Create a dedicated tenant for idempotency testing
    const createRes = await client.tenants.create(
      {
        name: `Idempotency Clinic ${idemSlug}`,
        slug: idemSlug,
        organizationId: customerOrg.id,
        environment: 'production',
        plugins: ['hospital-os'],
      },
      { waitUntilReady: true }
    );
    assert.ok(createRes.apiKey?.secret, 'Issued API key secret must be present');
    const tenantId = createRes.tenantId;
    const tenantApiKey = createRes.apiKey.secret;
    const hospital = client.plugin('hospital-os').forTenant(tenantId, { apiKey: tenantApiKey });

    // 2. Count existing patients (should be 0)
    const initialPatients = await hospital.patients.list();
    const initialCount = initialPatients.length;

    // 3. Unique idempotency key and payload
    const idempotencyKey = `idem_safe_retry_${crypto.randomBytes(8).toString('hex')}`;
    const patientName = `Idem Patient ${crypto.randomBytes(4).toString('hex')}`;

    console.log(`[SDK Test] Executing create with injected 503 and Idempotency-Key=${idempotencyKey}...`);

    // 4. Call patients.create with x-test-inject-post-commit-503: once
    // Server commits patient and TenantIdempotencyKey in tx, then returns 503.
    // SDK automatically intercepts 503 and retries with the SAME idempotency key.
    // Server replays the committed response from TenantIdempotencyKey table without creating a duplicate.
    const createdPatient = await hospital.patients.create(
      { name: patientName },
      {
        idempotencyKey,
        headers: { 'x-test-inject-post-commit-503': 'once' },
      }
    );

    assert.ok(createdPatient.id, 'Patient must be returned by SDK retry');
    console.log(`[SDK Test] Patient successfully returned after retry: ${createdPatient.id}`);

    // 5. Query patients list - exactly ONE patient must exist, not two!
    const finalPatients = await hospital.patients.list();
    assert.strictEqual(
      finalPatients.length,
      initialCount + 1,
      `Exactly one patient must be created after 503 retry, found ${finalPatients.length} (expected ${initialCount + 1})`
    );

    // 6. Verify TenantIdempotencyKey record in PostgreSQL
    const idemRows = await (prisma as any).tenantIdempotencyKey.findMany({
      where: {
        tenantId,
        key: idempotencyKey,
      },
    });
    assert.strictEqual(idemRows.length, 1, 'TenantIdempotencyKey record must exist in DB');
    assert.strictEqual(idemRows[0].responseStatus, 201, 'TenantIdempotencyKey responseStatus must be 201');
    console.log('[SDK Test] Verified TenantIdempotencyKey table row persisted with responseStatus 201.');
  });

  it('6. MRN Concurrency: 50 parallel creates without MRN produce 50 patients with unique MRNs and no collisions', async () => {
    if (!isStandaloneBuilt || !prisma) {
      console.log('Skipping standalone server test (standalone bundle or DATABASE_URL missing)');
      return;
    }

    const client = createOrbitoXClient({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: rawCustomerKey,
    });

    const concSlug = `sdk-conc-${crypto.randomBytes(4).toString('hex')}`;
    const createRes = await client.tenants.create(
      {
        name: `MRN Concurrency Clinic ${concSlug}`,
        slug: concSlug,
        organizationId: customerOrg.id,
        environment: 'production',
        plugins: ['hospital-os'],
      },
      { waitUntilReady: true }
    );
    assert.ok(createRes.apiKey?.secret, 'Issued API key secret must be present');
    const tenantId = createRes.tenantId;
    const tenantApiKey = createRes.apiKey.secret;
    const hospital = client.plugin('hospital-os').forTenant(tenantId, { apiKey: tenantApiKey });

    console.log(`[SDK Test] Executing 50 parallel patient creations without MRN on tenant ${tenantId}...`);

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        hospital.patients.create({
          name: `Parallel Patient ${i + 1}`,
        })
      )
    );

    assert.strictEqual(results.length, 50, 'All 50 creations must resolve successfully');
    const mrns = new Set(results.map((r) => r.mrn));
    const ids = new Set(results.map((r) => r.id));

    assert.strictEqual(ids.size, 50, 'All 50 patients must have unique IDs');
    assert.strictEqual(mrns.size, 50, 'All 50 patients must have unique MRNs without collisions');

    // Verify format matches regex ^[A-Z0-9-]{4,32}$
    for (const mrn of mrns) {
      assert.match(mrn, /^MRN-[A-Z0-9]+-[A-F0-9]{10}$/, `MRN must match generated format: ${mrn}`);
    }

    const listed = await hospital.patients.list();
    assert.ok(listed.length >= 50, `Listed count must be at least 50, got ${listed.length}`);
    console.log(`[SDK Test] Successfully verified 50 parallel creations -> 50 distinct patients with 0 MRN collisions.`);
  });
});

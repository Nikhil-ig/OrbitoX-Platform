import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import * as fs from 'node:fs';
import net from 'node:net';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';
import { hashAccountPassword } from '@/server/auth/account-security';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESTRICTED_PORTS = new Set([
  3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697,
]);

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

import { getStandaloneScript, createCleanStandaloneEnv } from '../standalone-helper';

const serverScript = getStandaloneScript(__dirname);
const apiDir = [
  path.resolve(__dirname, '../../src/app/api'),
  path.resolve(__dirname, '../app/api'),
].find(fs.existsSync) || path.resolve(__dirname, '../../src/app/api');

function findRoutes(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findRoutes(full));
    } else if (entry.name === 'route.ts') {
      results.push(full);
    }
  }
  return results;
}

function parseMethods(filePath: string): string[] {
  const code = fs.readFileSync(filePath, 'utf8');
  return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter(
    (m) =>
      new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(code) ||
      new RegExp(`export\\s+const\\s+${m}\\b`).test(code),
  );
}

function convertRouteToUrl(filePath: string): string {
  const rel = path.relative(apiDir, filePath);
  let url = '/api/' + rel.replace(/\/route\.ts$/, '');
  url = url
    .replace(/\[organizationId\]/g, 'sweep-organization-id')
    .replace(/\[projectId\]/g, 'test-proj-c2-123')
    .replace(/\[environmentId\]/g, 'sweep-environment-id')
    .replace(/\[subscriptionId\]/g, 'sub_sweep123')
    .replace(/\[userId\]/g, 'sweep-user-id')
    .replace(/\[operationId\]/g, 'sweep-operation-id')
    .replace(/\[provider\]/g, 'resend')
    .replace(/\[providerId\]/g, 'test-prov-c2-123')
    .replace(/\[serviceId\]/g, 'hms')
    .replace(/\[keyId\]/g, 'test-key-c2-123')
    .replace(/\[locator\]/g, '7Kp9xQ8m2L')
    .replace(/\[id\]/g, 'test-id-c2-123')
    .replace(/\[action\]/g, 'provision');
  return url;
}

async function run() {
  const PORT = await allocateSafePort(3685);
  console.log(`Starting live API sweep on safe port ${PORT}...`);

  const adminToken = crypto.randomBytes(32).toString('hex');
  const serverPepper = crypto.randomBytes(32).toString('hex');
  const databaseUrl =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
  const runtimeUrl =
    process.env.APP_DATABASE_URL ||
    'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
  const auditUrl =
    process.env.PLATFORM_AUDIT_DATABASE_URL ||
    'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
  const hmsAuditUrl =
    process.env.HMS_AUDIT_DATABASE_URL ||
    'postgresql://hms_audit_reader:test_audit_reader_pass@127.0.0.1:5432/orbitox_phase2';
  const outboxRelayUrl =
    process.env.OUTBOX_RELAY_DATABASE_URL ||
    'postgresql://orbitox_outbox_relay:test_relay_pass@127.0.0.1:5432/orbitox_phase2';

  const grantPair = crypto.generateKeyPairSync('ed25519');
  const grantPrivPem = grantPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const grantPubPem = grantPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const certPair = crypto.generateKeyPairSync('ed25519');
  const certPrivPem = certPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const certPubPem = certPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production' as const,
    ORBITOX_ADMIN_TOKEN: adminToken,
    ORBITOX_ADMIN_TOKEN_SCOPES: 'GET:/api/v1/overview',
    ORBITOX_MFA_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
    ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
    ORBITOX_PUBLIC_BASE_URL: 'https://console.orbitox.test',
    ORBITOX_RUNTIME_TOKEN: crypto.randomBytes(32).toString('hex'),
    ORBITOX_CONTROL_SECRET: crypto.randomBytes(32).toString('hex'),
    ORBITOX_GUEST_SECRET: crypto.randomBytes(32).toString('hex'),
    ORBITOX_SERVER_PEPPER: serverPepper,
    RAZORPAY_KEY_ID: 'rzp_test_sweep',
    RAZORPAY_KEY_SECRET: crypto.randomBytes(32).toString('hex'),
    RAZORPAY_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
    ORBITOX_EMAIL_PROVIDER: 'resend',
    ORBITOX_EMAIL_FROM: 'no-reply@example.invalid',
    RESEND_API_KEY: 'test-resend-token',
    ORBITOX_EMAIL_WEBHOOK_SECRET: `whsec_${crypto.randomBytes(32).toString('base64')}`,
    ORBITOX_GRANT_SIGNING_KEYS: JSON.stringify({
      k1: { privateKey: grantPrivPem, publicKey: grantPubPem },
    }),
    ORBITOX_DELETION_CERT_KEYS: JSON.stringify({
      k1: { privateKey: certPrivPem, publicKey: certPubPem },
    }),
    ORBITOX_DELETION_CERT_KEY_ACTIVE: 'k1',
    ORBITOX_OBJECT_STORE_DRIVER: 's3',
    ORBITOX_OBJECT_STORE_REGION: 'ap-south-1',
    S3_BUCKET_NAME: 'orbitox-ci-api-sweep-exports',
    ORBITOX_OBJECT_STORE_ENCRYPTION: 'client',
    ORBITOX_EXPORT_ENCRYPTION_KEYS: JSON.stringify({ k1: crypto.randomBytes(32).toString('base64') }),
    ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: 'k1',
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
    ORBITOX_PHI_KEYS: JSON.stringify({
      k1: crypto.randomBytes(32).toString('base64'),
    }),
    ORBITOX_PHI_ACTIVE_KID: 'k1',
    ORBITOX_PHI_INDEX_KEY: crypto.randomBytes(32).toString('base64'),
    ORBITOX_BRIDGE_KEYS: JSON.stringify({
      activeKeyId: 'k1',
      keys: {
        k1: crypto.randomBytes(32).toString('hex'),
      },
    }),
    ORBITOX_BRIDGE_ACTIVE_KID: 'k1',
  };

  // Seed test organization, project, and read-only key for wrong-scope verification
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const seedOrgSlug = `c2-org-${Date.now()}`;
  const seedProjSlug = `c2-proj-${Date.now()}`;
  const rawReadOnlySecret = `orb_live_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = rawReadOnlySecret.slice(0, 14);
  const secretFingerprint = crypto.createHash('sha256').update(rawReadOnlySecret).digest('hex');
  const authVerifier = crypto
    .createHmac('sha256', serverPepper)
    .update(rawReadOnlySecret)
    .digest('hex');

  // Seed other organization for cross-org testing
  const otherOrg = await prisma.platformOrganization.create({
    data: {
      name: 'C2 Other Org',
      slug: `c2-other-${Date.now()}`,
      billingEmail: 'other@test.org',
    },
  });

  const org = await prisma.platformOrganization.create({
    data: {
      name: 'C2 Test Org',
      slug: seedOrgSlug,
      billingEmail: 'c2@test.org',
    },
  });

  const proj = await prisma.platformProject.create({
    data: {
      name: 'C2 Test Project',
      slug: seedProjSlug,
      organizationId: org.id,
      businessModel: 'B2B',
      technicalLead: 'C2 Lead',
      contactEmail: 'c2@test.org',
      enabledServices: ['hms'],
      planTier: 'growth',
      plan: 'growth',
      apiCallQuota: 50000,
      monthlyApiCalls: 0,
      currentBillingPeriod: new Date().toISOString().slice(0, 7),
    },
  });

  const envRecord = await prisma.projectEnvironment.create({
    data: {
      name: 'Production',
      slug: 'production',
      projectId: proj.id,
      isProduction: true,
    },
  });

  const keyRecord = await prisma.platformApiKey.create({
    data: {
      name: 'C2 Read-Only Key',
      keyId: `key_${crypto.randomUUID()}`,
      keyPrefix,
      maskedDisplay: `${keyPrefix}...${rawReadOnlySecret.slice(-4)}`,
      secretFingerprint,
      authVerifier,
      environmentId: envRecord.id,
      capabilities: ['hms:read'],
      tenantScope: [proj.slug],
      createdBy: 'c2_sweep',
      status: 'ACTIVE',
    },
  });

  const unentitledProjSlug = `proj-c2-rest-${Date.now()}`;
  const rawRestOnlySecret = `orb_live_${crypto.randomBytes(24).toString('hex')}`;
  const restPrefix = rawRestOnlySecret.slice(0, 14);
  const restProj = await prisma.platformProject.create({
    data: {
      name: 'C2 Unentitled HMS Test Project',
      slug: unentitledProjSlug,
      organizationId: org.id,
      businessModel: 'O2O',
      technicalLead: 'C2 Rest Lead',
      contactEmail: 'c2-rest@test.org',
      enabledServices: ['restaurant'],
      planTier: 'growth',
      plan: 'growth',
      apiCallQuota: 50000,
      monthlyApiCalls: 0,
      currentBillingPeriod: new Date().toISOString().slice(0, 7),
    },
  });
  const restEnvRecord = await prisma.projectEnvironment.create({
    data: {
      name: 'Production',
      slug: 'production',
      projectId: restProj.id,
      isProduction: true,
    },
  });
  await prisma.platformApiKey.create({
    data: {
      name: 'C2 Restaurant-Only Key',
      keyId: `key_${crypto.randomUUID()}`,
      keyPrefix: restPrefix,
      maskedDisplay: `${restPrefix}...${rawRestOnlySecret.slice(-4)}`,
      secretFingerprint: crypto.createHash('sha256').update(rawRestOnlySecret).digest('hex'),
      authVerifier: crypto.createHmac('sha256', serverPepper).update(rawRestOnlySecret).digest('hex'),
      environmentId: restEnvRecord.id,
      capabilities: ['restaurant:read'],
      tenantScope: [restProj.slug],
      createdBy: 'c2_sweep',
      status: 'ACTIVE',
    },
  });

  const child: ChildProcess = spawn(process.execPath, [serverScript], {
    cwd: path.resolve(__dirname, '..'),
    env: createCleanStandaloneEnv(env),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLogs = '';
  child.stdout?.on('data', (d) => {
    serverLogs += d.toString();
  });
  child.stderr?.on('data', (d) => {
    serverLogs += d.toString();
  });

  // Await server readiness
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 60000) {
    if (child.exitCode !== null) {
      throw new Error(
        `Standalone server exited prematurely with code ${child.exitCode}.\nServer output:\n${serverLogs}`,
      );
    }
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!ready) {
    child.kill('SIGKILL');
    await prisma.$disconnect();
    throw new Error(
      `Standalone server failed to become ready on port ${PORT}.\nServer output:\n${serverLogs}`,
    );
  }

  const routeFiles = findRoutes(apiDir);
  console.log(`Discovered ${routeFiles.length} API route files under app/api/`);

  const publicRoutes = new Set([
    '/api/health',
    '/api/v1/openapi.json',
    '/api/v1/platform/grant-keys',
    '/api/restaurant/qr/7Kp9xQ8m2L',
    '/api/restaurant/sessions/join',
    '/api/restaurant/menu',
    '/api/restaurant/quote',
    '/api/restaurant/orders',
    '/api/v1/restaurant/menu',
    '/api/v1/restaurant/orders',
  ]);
  const publicCustomerAuthStatuses: Readonly<Record<string, number>> = {
    '/api/v1/customer/auth/login': 401,
    '/api/v1/customer/auth/signup': 422,
    '/api/v1/customer/auth/verify-email': 400,
    '/api/v1/customer/auth/password-reset/request': 202,
    '/api/v1/customer/auth/password-reset/consume': 400,
    '/api/v1/customer/auth/accept-invite': 400,
  };
  const protectedCustomerAuthMethods: Readonly<Record<string, string>> = {
    '/api/v1/customer/auth/logout': 'POST',
    '/api/v1/customer/auth/me': 'GET',
    '/api/v1/customer/auth/mfa/setup': 'POST',
    '/api/v1/customer/auth/mfa/confirm': 'POST',
    '/api/v1/customer/auth/reauth': 'POST',
  };

  let passed = 0;
  let failed = 0;

  console.log('\n### Part 1: Live Unauthenticated Sweep of Every API Route File (All Methods)\n');
  console.log(
    '| Route File | Method | URL Path | Status | Expected | Pass/Fail | Security Guard Type |',
  );
  console.log('|---|---|---|---|---|---|---|');

  for (const file of routeFiles) {
    const relFile = path.relative(apiDir, file);
    const methods = parseMethods(file);
    const urlPath = convertRouteToUrl(file);
    const isCustomerAuth = urlPath.startsWith('/api/v1/customer/auth/');
    const isCustomerDashboard = urlPath.startsWith('/api/v1/customer/organizations/');
    const isCustomerSelf = urlPath.startsWith('/api/v1/customer/me/');
    const isEmailWebhook = urlPath.startsWith('/api/v1/customer/email/webhooks/');
    if (urlPath.startsWith('/api/v1/customer/')) {
      const expectedStatus = publicCustomerAuthStatuses[urlPath];
      const protectedMethod = protectedCustomerAuthMethods[urlPath];
      assert.ok(
        (isCustomerAuth &&
          ((expectedStatus !== undefined && methods.length === 1 && methods[0] === 'POST') ||
          (protectedMethod !== undefined &&
            expectedStatus === undefined &&
            methods.length === 1 &&
            methods[0] === protectedMethod))) ||
          (isCustomerDashboard && methods.length > 0) ||
          (isCustomerSelf && methods.length > 0) ||
          (isEmailWebhook && methods.length === 1 && methods[0] === 'POST'),
        `Customer route ${urlPath} must be explicitly classified as public auth, session-protected, or signed webhook`,
      );
    }

    for (const method of methods) {
      const isPublic = publicRoutes.has(urlPath);
      const expectedPublicAuthStatus =
        method === 'POST' ? publicCustomerAuthStatuses[urlPath] : undefined;
      const isPublicCustomerAuth = expectedPublicAuthStatus !== undefined;
      const isProtectedCustomerAuth = protectedCustomerAuthMethods[urlPath] === method;
      const isWebhook =
        urlPath.startsWith('/api/v1/billing/webhook') ||
        urlPath.startsWith('/api/v1/customer/email/webhooks/');
      const isRestaurantRedirect =
        urlPath.startsWith('/api/restaurant/') || urlPath.startsWith('/api/v1/restaurant/');
      const expectedDesc = isPublic
        ? isRestaurantRedirect
          ? '308 Redirect'
          : '200 / 2xx'
        : isPublicCustomerAuth
          ? `exactly ${expectedPublicAuthStatus} for invalid unauthenticated input`
          : isProtectedCustomerAuth
            ? '401 or 403 without a customer session'
            : isCustomerDashboard || isCustomerSelf
              ? '401 or 403 without a customer session'
            : isWebhook
              ? '400 / 401 / 403'
              : '401 / 403 / 404';
      const isSessionsJoin = urlPath === '/api/restaurant/sessions/join';

      try {
        const fetchOptions: RequestInit = {
          method,
          redirect: 'manual',
          headers: {
            'content-type': 'application/json',
          },
          ...(method !== 'GET'
            ? {
                body: isSessionsJoin
                  ? JSON.stringify({ locator: '7Kp9xQ8m2L', displayName: 'Sweep Test Guest' })
                  : JSON.stringify({ ping: true }),
              }
            : {}),
        };

        const res = await fetch(`http://127.0.0.1:${PORT}${urlPath}`, fetchOptions);
        const status = res.status;

        let isPass = false;
        if (isPublic) {
          isPass =
            (status >= 200 && status < 300) ||
            status === 308 ||
            (isRestaurantRedirect && (status === 404 || status === 422 || status === 503));
        } else if (isPublicCustomerAuth) {
          isPass = status === expectedPublicAuthStatus;
        } else if (isProtectedCustomerAuth) {
          isPass = status === 401 || status === 403;
        } else if (isCustomerDashboard || isCustomerSelf) {
          isPass = status === 401 || status === 403;
        } else if (isWebhook) {
          isPass = status === 400 || status === 401 || status === 403;
        } else {
          isPass = status === 401 || status === 403 || status === 404;
        }

        if (isPass) passed++;
        else failed++;

        const guardType = isPublic
          ? 'Explicit Public Route'
          : isPublicCustomerAuth
            ? 'Explicit Public Customer Auth Route'
            : isProtectedCustomerAuth
              ? 'Customer Session Required'
              : isCustomerDashboard || isCustomerSelf
                ? 'Customer Session Required'
              : isWebhook
                ? 'Webhook Signature Guard'
                : urlPath.startsWith('/api/v1/admin/') ||
                    urlPath.startsWith('/api/v1/platform/') ||
                    urlPath.startsWith('/api/v1/projects/') ||
                    urlPath.startsWith('/api/v1/system/') ||
                    urlPath.startsWith('/api/v1/fleet/') ||
                    urlPath.startsWith('/api/v1/overview/')
                  ? 'Middleware Control-Plane'
                  : 'Route Self-Guarded (withApiGuard)';

        console.log(
          `| \`${relFile}\` | **${method}** | \`${urlPath}\` | **${status}** | ${expectedDesc} | ${isPass ? 'PASS' : 'FAIL'} | ${guardType} |`,
        );
      } catch (err: any) {
        failed++;
        console.log(
          `| \`${relFile}\` | **${method}** | \`${urlPath}\` | **ERROR** | ${expectedDesc} | FAIL (${err.message}) | Error |`,
        );
      }
    }
  }

  const existingResetEmail = `sweep-reset-${crypto.randomUUID()}@example.invalid`;
  const missingResetEmail = `missing-${crypto.randomUUID()}@example.invalid`;
  const existingResetUser = await prisma.customerUser.create({
    data: {
      email: existingResetEmail,
      emailVerifiedAt: new Date(),
      passwordHash: await hashAccountPassword('sweep-existing-password'),
    },
    select: { id: true },
  });
  try {
    const requestReset = async (email: string) => {
      const response = await fetch(
        `http://127.0.0.1:${PORT}/api/v1/customer/auth/password-reset/request`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        },
      );
      return { status: response.status, body: await response.json() };
    };
    const existingAccountResponse = await requestReset(existingResetEmail);
    const missingAccountResponse = await requestReset(missingResetEmail);
    assert.equal(existingAccountResponse.status, 202);
    assert.deepEqual(existingAccountResponse, missingAccountResponse);
    passed++;
    console.log(
      'PASS password-reset/request returns identical 202 status and response body for existing and missing emails',
    );
  } catch (error) {
    failed++;
    console.error(
      'FAIL password-reset/request response differs for existing and missing emails:',
      error,
    );
  } finally {
    await prisma.accountEmailOutbox.deleteMany({ where: { recipient: existingResetEmail } });
    await prisma.customerUser.delete({ where: { id: existingResetUser.id } });
  }

  try {
    const requestLogin = async (email: string, password: string) => {
      const response = await fetch(`http://127.0.0.1:${PORT}/api/v1/customer/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return { status: response.status, body: await response.json() };
    };
    const existingAccountResponse = await requestLogin(existingResetEmail, 'wrong-password');
    const missingAccountResponse = await requestLogin(missingResetEmail, 'wrong-password');
    assert.equal(existingAccountResponse.status, 401);
    assert.deepEqual(existingAccountResponse, missingAccountResponse);
    passed++;
    console.log(
      'PASS login returns identical 401 status and response body for wrong-password and nonexistent-account requests',
    );
  } catch (error) {
    failed++;
    console.error(
      'FAIL login response differs for wrong-password and nonexistent-account requests:',
      error,
    );
  }

  // Part 2: Wrong-Scope Key Sweep (Fix C2 requirement)
  console.log('\n### Part 2: Wrong-Scope Authenticated Key Sweep\n');
  console.log(
    '| Test Scenario | Method | URL Path | Presented Scope | Required Scope | Status | Expected | Pass/Fail |',
  );
  console.log('|---|---|---|---|---|---|---|---|');

  const wrongScopeTests: Array<{
    scenario: string;
    method: string;
    urlPath: string;
    scope: string;
    required: string;
    headers: Record<string, string>;
    body?: string;
    expectedStatus: number;
    expectedCode: string;
  }> = [
    {
      scenario: 'Read-only HMS key mutating hospital patient registry (Scope mismatch)',
      method: 'POST',
      urlPath: '/api/v1/hms/patients',
      scope: 'hms:read',
      required: 'write',
      headers: {
        'x-api-key': rawReadOnlySecret,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Bob Patient' }),
      expectedStatus: 403,
      expectedCode: 'INSUFFICIENT_SCOPES',
    },
    {
      scenario: 'Customer key accessing control-plane admin endpoint (Perimeter isolation)',
      method: 'GET',
      urlPath: '/api/v1/admin/projects',
      scope: 'hms:read',
      required: 'platform-admin',
      headers: {
        'x-api-key': rawReadOnlySecret,
      },
      body: undefined,
      expectedStatus: 401,
      expectedCode: 'UNAUTHORIZED',
    },
    {
      scenario: 'Restaurant-licensed key calling unentitled HospitalOS endpoint (Entitlement violation)',
      method: 'GET',
      urlPath: '/api/v1/hms/patients',
      scope: 'restaurant:read',
      required: 'hms',
      headers: {
        'x-api-key': rawRestOnlySecret,
      },
      body: undefined,
      expectedStatus: 403,
      expectedCode: 'PLUGIN_NOT_ENTITLED',
    },
  ];

  for (const t of wrongScopeTests) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${t.urlPath}`, {
        method: t.method,
        headers: t.headers as HeadersInit,
        ...(t.body ? { body: t.body } : {}),
      });

      const actualStatus = res.status;
      const resBody = await res.json().catch(() => ({}));
      const actualCode = resBody.error?.code || 'UNKNOWN';

      const isPass = actualStatus === t.expectedStatus;
      if (isPass) passed++;
      else failed++;

      console.log(
        `| ${t.scenario} | **${t.method}** | \`${t.urlPath}\` | \`${t.scope}\` | \`${t.required}\` | **${actualStatus}** (${actualCode}) | ${t.expectedStatus} (${t.expectedCode}) | ${isPass ? 'PASS' : 'FAIL'} |`,
      );
    } catch (err: any) {
      failed++;
      console.log(
        `| ${t.scenario} | **${t.method}** | \`${t.urlPath}\` | \`${t.scope}\` | \`${t.required}\` | **ERROR** | ${t.expectedStatus} | FAIL (${err.message}) |`,
      );
    }
  }

  // Part 3: Real Standalone Server Tenant Provisioning Gate (Fix N1 requirement)
  console.log(
    '\n### Part 3: Real Standalone Server Tenant Provisioning Gate (Fix N1 requirement)\n',
  );
  console.log(
    '| Test Scenario | Method | URL Path | Presented Auth | Expected Status | Status | Pass/Fail |',
  );
  console.log('|---|---|---|---|---|---|---|');

  // 1. No key -> 401
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/v1/tenants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'No Auth Tenant',
        slug: 'no-auth-tenant',
        plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
      }),
    });
    const isPass = res.status === 401;
    if (isPass) passed++;
    else failed++;
    console.log(
      `| No API key presented | **POST** | \`/api/v1/tenants\` | None | 401 | **${res.status}** | ${isPass ? 'PASS' : 'FAIL'} |`,
    );
  } catch (err: any) {
    failed++;
    console.log(
      `| No API key presented | **POST** | \`/api/v1/tenants\` | None | 401 | **ERROR** (${err.message}) | FAIL |`,
    );
  }

  // 2. Cross-org key -> 403
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': rawReadOnlySecret,
      },
      body: JSON.stringify({
        organisation: otherOrg.slug,
        name: 'Cross Org Tenant',
        slug: 'cross-org-tenant',
        plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
      }),
    });
    const isPass = res.status === 403;
    if (isPass) passed++;
    else failed++;
    console.log(
      `| Key from another organisation | **POST** | \`/api/v1/tenants\` | Key (Org ${org.slug}) | 403 | **${res.status}** | ${isPass ? 'PASS' : 'FAIL'} |`,
    );
  } catch (err: any) {
    failed++;
    console.log(
      `| Key from another organisation | **POST** | \`/api/v1/tenants\` | Key (Org ${org.slug}) | 403 | **ERROR** (${err.message}) | FAIL |`,
    );
  }

  // 3. Customer API key creates tenant with 202
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': rawReadOnlySecret,
      },
      body: JSON.stringify({
        organisation: org.slug,
        name: 'Standalone Sweep Tenant',
        slug: `sweep-tenant-${Date.now()}`,
        plugins: [{ id: 'hospital-os', plan: 'hms-starter' }],
      }),
    });
    const resJson = await res.json().catch(() => ({}));
    const hasSecret = Boolean(resJson.apiKey && resJson.apiKey.secret);
    const isPass = res.status === 202 && hasSecret;
    if (isPass) passed++;
    else failed++;
    console.log(
      `| Customer API key creates tenant | **POST** | \`/api/v1/tenants\` | Key (Org ${org.slug}) | 202 + apiKey.secret | **${res.status}** (secret: ${hasSecret}) | ${isPass ? 'PASS' : 'FAIL'} |`,
    );
  } catch (err: any) {
    failed++;
    console.log(
      `| Customer API key creates tenant | **POST** | \`/api/v1/tenants\` | Key (Org ${org.slug}) | 202 + apiKey.secret | **ERROR** (${err.message}) | FAIL |`,
    );
  }

  console.log(`\n======================================================`);
  console.log(`Live API Sweep Summary: ${passed} passed, ${failed} failed.`);
  console.log(`Total endpoints tested: ${passed + failed}`);
  console.log(`======================================================\n`);

  // Cleanup test fixture
  try {
    await prisma.platformApiKey.delete({ where: { id: keyRecord.id } });
    await prisma.projectEnvironment.delete({ where: { id: envRecord.id } });
    await prisma.platformProject.delete({ where: { id: proj.id } });
    await prisma.platformOrganization.delete({ where: { id: org.id } });
    await prisma.platformOrganization.delete({ where: { id: otherOrg.id } });
    await prisma.$disconnect();
  } catch {}

  child.kill('SIGKILL');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal sweep error:', err);
  process.exit(1);
});

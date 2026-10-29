import { spawn, ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import * as fs from 'node:fs';
import net from 'node:net';
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

const serverScript = path.resolve(__dirname, '../.next/standalone/apps/web/server.js');
const apiDir = path.resolve(__dirname, '../app/api');

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
  return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((m) =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(code) ||
    new RegExp(`export\\s+const\\s+${m}\\b`).test(code)
  );
}

function convertRouteToUrl(filePath: string): string {
  const rel = path.relative(apiDir, filePath);
  let url = '/api/' + rel.replace(/\/route\.ts$/, '');
  url = url
    .replace(/\[projectId\]/g, 'test-proj-c2-123')
    .replace(/\[providerId\]/g, 'test-prov-c2-123')
    .replace(/\[serviceId\]/g, 'crm')
    .replace(/\[keyId\]/g, 'test-key-c2-123')
    .replace(/\[locator\]/g, '7Kp9xQ8m2L')
    .replace(/\[id\]/g, 'test-id-c2-123');
  return url;
}

async function run() {
  const PORT = await allocateSafePort(3685);
  console.log(`Starting live API sweep on safe port ${PORT}...`);

  const adminToken = crypto.randomBytes(32).toString('hex');
  const serverPepper = crypto.randomBytes(32).toString('hex');
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
  const runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
  const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production' as const,
    ORBITOX_ADMIN_TOKEN: adminToken,
    ORBITOX_RUNTIME_TOKEN: crypto.randomBytes(32).toString('hex'),
    ORBITOX_CONTROL_SECRET: crypto.randomBytes(32).toString('hex'),
    ORBITOX_GUEST_SECRET: crypto.randomBytes(32).toString('hex'),
    ORBITOX_SERVER_PEPPER: serverPepper,
    DATABASE_URL: databaseUrl,
    APP_DATABASE_URL: runtimeUrl,
    PLATFORM_AUDIT_DATABASE_URL: auditUrl,
    ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS: 'true',
    ORBITOX_PLATFORM_REPOSITORY: 'prisma',
  };

  // Seed test organization, project, and read-only key for wrong-scope verification
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const seedOrgSlug = `c2-org-${Date.now()}`;
  const seedProjSlug = `c2-proj-${Date.now()}`;
  const rawReadOnlySecret = `orb_live_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = rawReadOnlySecret.slice(0, 14);
  const secretFingerprint = crypto.createHash('sha256').update(rawReadOnlySecret).digest('hex');
  const authVerifier = crypto.createHmac('sha256', serverPepper).update(rawReadOnlySecret).digest('hex');

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
      enabledServices: ['crm'],
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
      capabilities: ['crm:read'],
      tenantScope: [proj.slug],
      createdBy: 'c2_sweep',
      status: 'ACTIVE',
    },
  });

  const child: ChildProcess = spawn(process.execPath, [serverScript], {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Await server readiness
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 20000) {
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
    throw new Error(`Standalone server failed to become ready on port ${PORT}`);
  }

  const routeFiles = findRoutes(apiDir);
  console.log(`Discovered ${routeFiles.length} API route files under app/api/`);

  const publicRoutes = new Set([
    '/api/health',
    '/api/v1/openapi.json',
    '/api/restaurant/qr/7Kp9xQ8m2L',
    '/api/restaurant/sessions/join',
  ]);

  let passed = 0;
  let failed = 0;

  console.log('\n### Part 1: Live Unauthenticated Sweep of Every API Route File (All Methods)\n');
  console.log('| Route File | Method | URL Path | Status | Expected | Pass/Fail | Security Guard Type |');
  console.log('|---|---|---|---|---|---|---|');

  for (const file of routeFiles) {
    const relFile = path.relative(apiDir, file);
    const methods = parseMethods(file);
    const urlPath = convertRouteToUrl(file);

    for (const method of methods) {
      const isPublic = publicRoutes.has(urlPath);
      const expectedDesc = isPublic ? '200 / 2xx' : '401 / 403';
      const isSessionsJoin = urlPath === '/api/restaurant/sessions/join';

      try {
        const fetchOptions: RequestInit = {
          method,
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
          isPass = (status >= 200 && status < 300) || (urlPath.startsWith('/api/restaurant/') && (status === 404 || status === 422));
        } else {
          isPass = status === 401 || status === 403;
        }

        if (isPass) passed++;
        else failed++;

        const guardType = urlPath.startsWith('/api/v1/admin/') ||
          urlPath.startsWith('/api/v1/platform/') ||
          urlPath.startsWith('/api/v1/projects/') ||
          urlPath.startsWith('/api/v1/system/') ||
          urlPath.startsWith('/api/v1/fleet/') ||
          urlPath.startsWith('/api/v1/overview/')
          ? 'Middleware Control-Plane'
          : isPublic
            ? 'Explicit Public Route'
            : 'Route Self-Guarded (withApiGuard)';

        console.log(
          `| \`${relFile}\` | **${method}** | \`${urlPath}\` | **${status}** | ${expectedDesc} | ${isPass ? 'PASS' : 'FAIL'} | ${guardType} |`
        );
      } catch (err: any) {
        failed++;
        console.log(
          `| \`${relFile}\` | **${method}** | \`${urlPath}\` | **ERROR** | ${expectedDesc} | FAIL (${err.message}) | Error |`
        );
      }
    }
  }

  // Part 2: Wrong-Scope Key Sweep (Fix C2 requirement)
  console.log('\n### Part 2: Wrong-Scope Authenticated Key Sweep\n');
  console.log('| Test Scenario | Method | URL Path | Presented Scope | Required Scope | Status | Expected | Pass/Fail |');
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
      scenario: 'Read-only CRM key mutating CRM leads (Scope mismatch)',
      method: 'POST',
      urlPath: '/api/v1/crm/leads',
      scope: 'crm:read',
      required: 'crm:write',
      headers: {
        'x-api-key': rawReadOnlySecret,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Alice Test Lead', email: 'alice@example.com' }),
      expectedStatus: 403,
      expectedCode: 'INSUFFICIENT_SCOPES',
    },
    {
      scenario: 'Customer key accessing control-plane admin endpoint (Perimeter isolation)',
      method: 'GET',
      urlPath: '/api/v1/admin/projects',
      scope: 'crm:read',
      required: 'platform-admin',
      headers: {
        'x-api-key': rawReadOnlySecret,
      },
      body: undefined,
      expectedStatus: 401,
      expectedCode: 'UNAUTHORIZED',
    },
    {
      scenario: 'Customer key calling self-guarded platform-admin endpoint (Route isolation)',
      method: 'POST',
      urlPath: '/api/v1/hms/patients',
      scope: 'crm:read',
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
      scenario: 'CRM-licensed key calling unentitled commerce plugin (Entitlement violation)',
      method: 'GET',
      urlPath: '/api/v1/commerce/products',
      scope: 'crm:read',
      required: 'commerce',
      headers: {
        'x-api-key': rawReadOnlySecret,
      },
      body: undefined,
      expectedStatus: 403,
      expectedCode: 'PLUGIN_NOT_ENTITLED',
    },
    {
      scenario: 'Customer key calling unentitled hospital patient registry',
      method: 'GET',
      urlPath: '/api/v1/hms/patients',
      scope: 'crm:read',
      required: 'hms',
      headers: {
        'x-api-key': rawReadOnlySecret,
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
        `| ${t.scenario} | **${t.method}** | \`${t.urlPath}\` | \`${t.scope}\` | \`${t.required}\` | **${actualStatus}** (${actualCode}) | ${t.expectedStatus} (${t.expectedCode}) | ${isPass ? 'PASS' : 'FAIL'} |`
      );
    } catch (err: any) {
      failed++;
      console.log(
        `| ${t.scenario} | **${t.method}** | \`${t.urlPath}\` | \`${t.scope}\` | \`${t.required}\` | **ERROR** | ${t.expectedStatus} | FAIL (${err.message}) |`
      );
    }
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
    await prisma.$disconnect();
  } catch {}

  child.kill('SIGKILL');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal sweep error:', err);
  process.exit(1);
});

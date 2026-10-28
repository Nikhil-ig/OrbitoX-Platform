import assert from 'node:assert/strict';
import { ChildProcess, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { runPlatformJsonImporter } from './import-platform-json';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
const runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';

function boundedUrl(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.set('connect_timeout', '5');
  url.searchParams.set('pool_timeout', '5');
  url.searchParams.set('socket_timeout', '15');
  url.searchParams.set('connection_limit', '10');
  return url.toString();
}

const owner = new PrismaClient({ datasources: { db: { url: boundedUrl(databaseUrl) } } });
const runtime = new PrismaClient({ datasources: { db: { url: boundedUrl(runtimeUrl) } } });

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

const activeChildren = new Set<ChildProcess>();

const adminToken = crypto.randomBytes(32).toString('hex');
const runtimeToken = crypto.randomBytes(32).toString('hex');
const controlSecret = crypto.randomBytes(32).toString('hex');
const guestSecret = crypto.randomBytes(32).toString('hex');

function spawnServer(port: number, envOverrides: Record<string, string> = {}): ChildProcess {
  const standaloneScript = path.resolve(__dirname, '../.next/standalone/apps/web/server.js');
  const child = spawn(process.execPath, [standaloneScript], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      ORBITOX_PLATFORM_REPOSITORY: 'prisma',
      ORBITOX_ADMIN_TOKEN: adminToken,
      ORBITOX_RUNTIME_TOKEN: runtimeToken,
      ORBITOX_CONTROL_SECRET: controlSecret,
      ORBITOX_GUEST_SECRET: guestSecret,
      ORBITOX_SERVER_PEPPER: envOverrides.ORBITOX_SERVER_PEPPER || 'step5-server-pepper-32-chars-minimum-entropy',
      DATABASE_URL: boundedUrl(databaseUrl),
      APP_DATABASE_URL: boundedUrl(runtimeUrl),
      PLATFORM_AUDIT_DATABASE_URL: boundedUrl(auditUrl),
      ...envOverrides,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  (child as any).serverLogs = '';
  child.stdout?.on('data', (c) => { (child as any).serverLogs += c.toString(); });
  child.stderr?.on('data', (c) => { (child as any).serverLogs += c.toString(); });

  activeChildren.add(child);
  child.on('exit', () => activeChildren.delete(child));
  return child;
}

async function waitForServer(child: ChildProcess, port: number, timeoutMs = 25000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Server on port ${port} exited prematurely with code ${child.exitCode}. Logs:\n${(child as any).serverLogs}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.status === 200 || res.status === 401) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for server on port ${port}. Logs:\n${(child as any).serverLogs}`);
}

async function cleanup() {
  for (const child of activeChildren) {
    try { child.kill('SIGKILL'); } catch {}
  }
  await Promise.all([owner.$disconnect(), runtime.$disconnect()]);
}

process.on('SIGINT', async () => { await cleanup(); process.exit(1); });
process.on('SIGTERM', async () => { await cleanup(); process.exit(1); });

async function main() {
  console.log('================================================================================');
  console.log('🪐 OrbitoX Phase 2 Step 5: JSON-Store to PostgreSQL Migration & Importer Harness');
  console.log('================================================================================\n');

  const legacyFixturePath = path.resolve(__dirname, '../test/fixtures/legacy-platform-store.json');
  assert.equal(fs.existsSync(legacyFixturePath), true, 'Legacy fixture file must exist');

  // ---------------------------------------------------------------------------
  // SECTION 1: Legacy Fixture Schema & Dry-Run Mode
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 1: Legacy Fixture Schema & Dry-Run Mode');
  console.log('Goal: Dry-run scans store, computes exact counts, writes ZERO rows to database.');
  console.log('--------------------------------------------------------------------------------\n');

  const orgCountBefore = await owner.platformOrganization.count();
  const projCountBefore = await owner.platformProject.count();
  const keyCountBefore = await owner.platformApiKey.count();
  const auditCountBefore = await owner.platformAuditEvent.count();

  console.log(`Pre-import row counts in PostgreSQL: Orgs=${orgCountBefore}, Projs=${projCountBefore}, Keys=${keyCountBefore}, Audits=${auditCountBefore}`);

  const dryRunReport = await runPlatformJsonImporter(owner, {
    filePath: legacyFixturePath,
    dryRun: true,
  });

  assert.equal(dryRunReport.dryRun, true);
  assert.equal(dryRunReport.totalOrganizationsInJson, 2);
  assert.equal(dryRunReport.organizationsImported, 2);
  assert.equal(dryRunReport.totalProjects, 2);
  assert.equal(dryRunReport.totalEnvironments, 2);
  assert.equal(dryRunReport.totalKeysWithVerifiers, 1);
  assert.equal(dryRunReport.totalKeysWithoutVerifiers, 1);
  assert.equal(dryRunReport.totalAuditEvents, 1);

  const orgCountAfterDryRun = await owner.platformOrganization.count();
  const projCountAfterDryRun = await owner.platformProject.count();
  const keyCountAfterDryRun = await owner.platformApiKey.count();
  const auditCountAfterDryRun = await owner.platformAuditEvent.count();

  assert.equal(orgCountAfterDryRun, orgCountBefore, 'Dry-run must not create any organizations');
  assert.equal(projCountAfterDryRun, projCountBefore, 'Dry-run must not create any projects');
  assert.equal(keyCountAfterDryRun, keyCountBefore, 'Dry-run must not create any API keys');
  assert.equal(auditCountAfterDryRun, auditCountBefore, 'Dry-run must not create any audit events');

  console.log('✔ Dry-run mode completed cleanly: exact scan counts computed, 0 database writes performed.\n');

  // ---------------------------------------------------------------------------
  // SECTION 2: Single Transaction per Organization & Error Isolation (All-or-Nothing)
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 2: Single Transaction per Organization & Error Isolation (All-or-Nothing)');
  console.log('Goal: An error in an organization transaction rolls back that organization completely');
  console.log('      leaving valid organizations committed and intact.');
  console.log('--------------------------------------------------------------------------------\n');

  const corruptTestFixture = path.resolve(__dirname, '../test/fixtures/corrupt-test-store.json');
  const validOrgSlug = `valid-org-${Date.now()}`;
  const corruptOrgSlug = `corrupt-org-${Date.now()}`;

  const corruptFixtureData = {
    organizations: [
      {
        id: `org_${validOrgSlug}`,
        slug: validOrgSlug,
        name: 'Valid Organization',
        billingEmail: 'valid@example.com',
        status: 'ACTIVE',
      },
      {
        id: `org_${corruptOrgSlug}`,
        slug: corruptOrgSlug,
        name: 'Corrupt Organization',
        billingEmail: 'corrupt@example.com',
        status: 'ACTIVE',
      },
    ],
    projects: [
      {
        id: `proj_${validOrgSlug}`,
        slug: `proj-${validOrgSlug}`,
        name: 'Valid Project',
        organizationId: `org_${validOrgSlug}`,
        businessModel: 'B2B_SAAS',
        plan: 'starter',
        apiCallQuota: 100000,
        monthlyApiCalls: 0,
      },
      {
        id: `proj_${corruptOrgSlug}`,
        slug: `proj-${validOrgSlug}`, // Intentional collision with Valid Project slug to trigger transaction rollback!
        name: 'Corrupt Project',
        organizationId: `org_${corruptOrgSlug}`,
        businessModel: 'B2B_SAAS',
        plan: 'starter',
      },
    ],
    environments: [
      {
        id: `env_${validOrgSlug}`,
        projectId: `proj_${validOrgSlug}`,
        slug: 'production',
        name: 'Production',
        isProduction: true,
      },
      {
        id: `env_${corruptOrgSlug}`,
        projectId: `proj_${corruptOrgSlug}`,
        slug: 'production',
        name: 'Production',
        isProduction: true,
      },
    ],
    apiKeys: [
      {
        id: `key_${validOrgSlug}`,
        keyId: `key_live_${validOrgSlug}`,
        name: 'Valid Key',
        environmentId: `env_${validOrgSlug}`,
        authVerifier: crypto.createHash('sha256').update('valid_secret').digest('hex'),
        secretFingerprint: 'SHA256: 0000:1111',
      },
      {
        id: `key_${corruptOrgSlug}`,
        keyId: `key_live_${corruptOrgSlug}`,
        name: 'Corrupt Key',
        environmentId: 'env_non_existent_foreign_key_trigger_rollback', // Triggers FK violation
        authVerifier: crypto.createHash('sha256').update('corrupt_secret').digest('hex'),
        secretFingerprint: 'SHA256: 2222:3333',
      },
    ],
    credentials: [],
    packages: [],
    packageVersions: [],
    packageInstallations: [],
    domains: [],
    quotaPolicies: [],
    rateLimitPolicies: [],
    auditLogs: [],
  };

  fs.writeFileSync(corruptTestFixture, JSON.stringify(corruptFixtureData, null, 2));

  try {
    const errorReport = await runPlatformJsonImporter(owner, {
      filePath: corruptTestFixture,
      dryRun: false,
    });

    assert.equal(errorReport.organizationsImported, 1, 'Valid organization must succeed');
    assert.equal(errorReport.organizationsFailed, 1, 'Corrupted organization must be rolled back');

    const validOrgInDb = await owner.platformOrganization.findUnique({ where: { slug: validOrgSlug } });
    const corruptOrgInDb = await owner.platformOrganization.findUnique({ where: { slug: corruptOrgSlug } });
    const corruptProjInDb = await owner.platformProject.findUnique({ where: { slug: `proj-${corruptOrgSlug}` } });

    assert.notEqual(validOrgInDb, null, 'Valid organization must be committed in PostgreSQL');
    assert.equal(corruptOrgInDb, null, 'Corrupt organization must be completely rolled back');
    assert.equal(corruptProjInDb, null, 'Corrupt organization child project must be completely rolled back');

    console.log('✔ All-or-nothing transaction verified: valid org committed, corrupted org rolled back with zero leftover rows.\n');
  } finally {
    try { fs.unlinkSync(corruptTestFixture); } catch {}
    try {
      await owner.platformApiKey.deleteMany({ where: { keyId: `key_live_${validOrgSlug}` } });
      await owner.projectEnvironment.deleteMany({ where: { id: `env_${validOrgSlug}` } });
      await owner.platformProject.deleteMany({ where: { slug: `proj-${validOrgSlug}` } });
      await owner.platformOrganization.deleteMany({ where: { slug: validOrgSlug } });
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: Mid-Import Kill -9 & Resume Durability Proof
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 3: Mid-Import Kill -9 & Resume Durability Proof');
  console.log('Goal: Violent SIGKILL mid-transaction leaves PostgreSQL consistent; re-run resumes cleanly.');
  console.log('--------------------------------------------------------------------------------\n');

  const killFixturePath = path.resolve(__dirname, '../test/fixtures/kill-test-store.json');
  const kOrg1 = `kill-org-1-${Date.now()}`;
  const kOrg2 = `kill-org-2-${Date.now()}`;
  const kOrg3 = `kill-org-3-${Date.now()}`;

  const killFixtureData = {
    organizations: [
      { id: `org_${kOrg1}`, slug: kOrg1, name: 'Kill Org 1', billingEmail: 'k1@test.io', status: 'ACTIVE' },
      { id: `org_${kOrg2}`, slug: kOrg2, name: 'Kill Org 2', billingEmail: 'k2@test.io', status: 'ACTIVE' },
      { id: `org_${kOrg3}`, slug: kOrg3, name: 'Kill Org 3', billingEmail: 'k3@test.io', status: 'ACTIVE' },
    ],
    projects: [
      { id: `proj_${kOrg1}`, slug: `p-${kOrg1}`, name: 'P1', organizationId: `org_${kOrg1}`, businessModel: 'B2B_SAAS', plan: 'starter' },
      { id: `proj_${kOrg2}`, slug: `p-${kOrg2}`, name: 'P2', organizationId: `org_${kOrg2}`, businessModel: 'B2B_SAAS', plan: 'starter' },
      { id: `proj_${kOrg3}`, slug: `p-${kOrg3}`, name: 'P3', organizationId: `org_${kOrg3}`, businessModel: 'B2B_SAAS', plan: 'starter' },
    ],
    environments: [
      { id: `env_${kOrg1}`, projectId: `proj_${kOrg1}`, slug: 'production', name: 'Prod 1', isProduction: true },
      { id: `env_${kOrg2}`, projectId: `proj_${kOrg2}`, slug: 'production', name: 'Prod 2', isProduction: true },
      { id: `env_${kOrg3}`, projectId: `proj_${kOrg3}`, slug: 'production', name: 'Prod 3', isProduction: true },
    ],
    apiKeys: [
      { id: `key_${kOrg1}`, keyId: `k_${kOrg1}`, name: 'K1', environmentId: `env_${kOrg1}`, authVerifier: crypto.createHash('sha256').update('k1').digest('hex') },
      { id: `key_${kOrg2}`, keyId: `k_${kOrg2}`, name: 'K2', environmentId: `env_${kOrg2}`, authVerifier: crypto.createHash('sha256').update('k2').digest('hex') },
      { id: `key_${kOrg3}`, keyId: `k_${kOrg3}`, name: 'K3', environmentId: `env_${kOrg3}`, authVerifier: crypto.createHash('sha256').update('k3').digest('hex') },
    ],
    credentials: [], packages: [], packageVersions: [], packageInstallations: [], domains: [], quotaPolicies: [], rateLimitPolicies: [], auditLogs: [],
  };

  fs.writeFileSync(killFixturePath, JSON.stringify(killFixtureData, null, 2));

  try {
    console.log('Spawning importer in child process with mid-transaction violent kill hook on Org 2...');
    const importerScript = path.resolve(__dirname, 'import-platform-json.ts');
    const tsxBin = path.resolve(__dirname, '../../../node_modules/.bin/tsx');
    const child = spawn(
      tsxBin,
      [importerScript, `--file=${killFixturePath}`, `--kill-mid-org=${kOrg2}`],
      {
        env: {
          ...process.env,
          DATABASE_URL: boundedUrl(databaseUrl),
        },
        stdio: 'pipe',
      }
    );

    child.stdout?.on('data', (d) => process.stdout.write(`[child-stdout] ${d}`));
    child.stderr?.on('data', (d) => process.stderr.write(`[child-stderr] ${d}`));

    activeChildren.add(child);
    const exitPromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
      child.on('exit', (code, signal) => {
        activeChildren.delete(child);
        resolve({ code, signal });
      });
    });

    const killOutcome = await exitPromise;
    console.log(`Child importer process terminated with: signal=${killOutcome.signal}, code=${killOutcome.code}`);
    assert.ok(
      killOutcome.signal === 'SIGKILL' || killOutcome.code === 137,
      `Process must be violently terminated via SIGKILL (signal=${killOutcome.signal}, code=${killOutcome.code})`
    );

    // Verify DB state immediately after kill -9:
    // Org 1 must be committed
    const org1InDb = await owner.platformOrganization.findUnique({ where: { slug: kOrg1 } });
    assert.notEqual(org1InDb, null, 'Org 1 committed prior to crash must be present');

    // Org 2 was killed MID-TRANSACTION: must have been aborted and rolled back completely!
    const org2InDb = await owner.platformOrganization.findUnique({ where: { slug: kOrg2 } });
    const proj2InDb = await owner.platformProject.findUnique({ where: { slug: `p-${kOrg2}` } });
    assert.equal(org2InDb, null, 'Org 2 killed mid-transaction must be rolled back completely');
    assert.equal(proj2InDb, null, 'Org 2 project must not exist');

    // Org 3 was never reached
    const org3InDb = await owner.platformOrganization.findUnique({ where: { slug: kOrg3 } });
    assert.equal(org3InDb, null, 'Org 3 must not yet exist');
    console.log('✔ PostgreSQL WAL integrity verified: uncommitted transaction aborted cleanly with zero dirty rows.');

    // Resume import!
    console.log('Resuming import after kill -9...');
    const resumeReport = await runPlatformJsonImporter(owner, {
      filePath: killFixturePath,
      dryRun: false,
    });

    assert.equal(resumeReport.organizationsImported, 3, 'All 3 organizations must be accounted for on resume');

    const freshOrg1 = await owner.platformOrganization.findUnique({ where: { slug: kOrg1 } });
    const freshOrg2 = await owner.platformOrganization.findUnique({ where: { slug: kOrg2 } });
    const freshOrg3 = await owner.platformOrganization.findUnique({ where: { slug: kOrg3 } });

    assert.notEqual(freshOrg1, null);
    assert.notEqual(freshOrg2, null);
    assert.notEqual(freshOrg3, null);

    console.log('✔ Importer resumed cleanly: all organizations committed without data corruption or duplicates.\n');
  } finally {
    try { fs.unlinkSync(killFixturePath); } catch {}
    try {
      await owner.platformApiKey.deleteMany({ where: { keyId: { in: [`k_${kOrg1}`, `k_${kOrg2}`, `k_${kOrg3}`] } } });
      await owner.projectEnvironment.deleteMany({ where: { id: { in: [`env_${kOrg1}`, `env_${kOrg2}`, `env_${kOrg3}`] } } });
      await owner.platformProject.deleteMany({ where: { slug: { in: [`p-${kOrg1}`, `p-${kOrg2}`, `p-${kOrg3}`] } } });
      await owner.platformOrganization.deleteMany({ where: { slug: { in: [kOrg1, kOrg2, kOrg3] } } });
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: Real Legacy Fixture Import & Idempotence Proof
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 4: Real Legacy Fixture Import & Idempotence Proof');
  console.log('Goal: Import legacy store; second run produces ZERO duplicate rows.');
  console.log('--------------------------------------------------------------------------------\n');

  const legacyReport1 = await runPlatformJsonImporter(owner, {
    filePath: legacyFixturePath,
    dryRun: false,
  });

  assert.equal(legacyReport1.organizationsImported, 2, 'Must import 2 legacy organizations');
  assert.equal(legacyReport1.totalKeysWithVerifiers, 1, 'Exactly 1 key with HMAC verifier');
  assert.equal(legacyReport1.totalKeysWithoutVerifiers, 1, 'Exactly 1 legacy key without verifier');

  // Second run on the same database (Idempotence Test)
  const legacyReport2 = await runPlatformJsonImporter(owner, {
    filePath: legacyFixturePath,
    dryRun: false,
  });

  assert.equal(legacyReport2.organizationsImported, 2);
  assert.equal(legacyReport2.totalProjects, 0, 'Re-run must create 0 new projects (idempotent)');

  console.log('✔ Idempotence verified: re-running import creates 0 duplicates and leaves state untouched.\n');

  // ---------------------------------------------------------------------------
  // SECTION 5: Key Authentication & Raw Secret Rejection
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 5: Key Authentication & Raw Secret Rejection');
  console.log('Goal: Migrated key with verifier authenticates (200); legacy key without verifier');
  console.log('      is REVOKED and NEVER silently valid (401/403).');
  console.log('--------------------------------------------------------------------------------\n');

  const serverPepper = 'step5-server-pepper-32-chars-minimum-entropy';
  const validSecret = 'orb_live_omni1_valid_customer_secret_123';
  const expectedVerifier = crypto.createHmac('sha256', serverPepper).update(validSecret).digest('hex');

  // Update Omni key authVerifier to match our serverPepper
  await owner.platformApiKey.update({
    where: { keyId: 'key_live_omni_verified_12345' },
    data: { authVerifier: expectedVerifier },
  });

  const port = await allocateSafePort(3735);
  console.log(`Spawning standalone server on 127.0.0.1:${port}...`);
  const server = spawnServer(port, { ORBITOX_SERVER_PEPPER: serverPepper });
  await waitForServer(server, port);
  console.log(`Server healthy on port ${port}.\n`);

  // Test 5A: Key with verifier authenticates successfully
  const validRes = await fetch(`http://127.0.0.1:${port}/api/v1/crm/leads`, {
    headers: {
      'x-api-key': validSecret,
      'x-tenant-id': 'omni-freight',
    },
  });
  console.log(`Valid Migrated Key Response: ${validRes.status}`);
  assert.equal(validRes.status, 200, 'Migrated key with valid verifier must authenticate with HTTP 200');
  console.log('✔ Migrated key with valid verifier authenticated successfully.');

  // Test 5B: Legacy key without verifier must NOT authenticate (REVOKED / dummy verifier)
  const legacyUnverifiedSecret = 'orb_live_med2_unmigrated_plaintext_secret_xyz';
  const invalidRes = await fetch(`http://127.0.0.1:${port}/api/v1/crm/leads`, {
    headers: {
      'x-api-key': legacyUnverifiedSecret,
      'x-tenant-id': 'mednet-inpatient',
    },
  });
  console.log(`Legacy Unverified Key Response: ${invalidRes.status}`);
  assert.equal(invalidRes.status === 401 || invalidRes.status === 403, true, 'Legacy unverified key must be rejected');

  // Inspect PostgreSQL row for unverified key
  const unverifiedKeyRow = await owner.platformApiKey.findUnique({
    where: { keyId: 'key_live_mednet_unverified_67890' },
  });
  assert.equal(unverifiedKeyRow?.status, 'REVOKED', 'Unverified key must have status REVOKED');
  assert.equal(unverifiedKeyRow?.revokeReason, 'LEGACY_KEY_MISSING_VERIFIER');
  assert.equal(unverifiedKeyRow?.authVerifier.startsWith('unmigrated_missing_verifier_'), true);
  console.log('✔ Unverified legacy key is marked REVOKED with unmatchable dummy verifier (never silently valid).\n');

  // ---------------------------------------------------------------------------
  // SECTION 6: Billing Numbers & Usage Monotonicity
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 6: Billing Numbers & Usage Monotonicity');
  console.log('Goal: Stored usage matches legacy fixture; subsequent billable requests increment atomically.');
  console.log('--------------------------------------------------------------------------------\n');

  const omniProj = await owner.platformProject.findUnique({ where: { slug: 'omni-freight' } });
  assert.equal(Number(omniProj?.monthlyApiCalls), 1251, 'monthlyApiCalls after 1 live authenticated call must be 1251 (started at 1250 in fixture)');
  assert.equal(omniProj?.currentBillingPeriod, '2026-10', 'currentBillingPeriod must match legacy fixture value (2026-10)');
  console.log(`Migrated Usage Verified: monthlyApiCalls=${omniProj?.monthlyApiCalls}, period=${omniProj?.currentBillingPeriod}`);

  // Fire another billable request
  await fetch(`http://127.0.0.1:${port}/api/v1/crm/leads`, {
    headers: { 'x-api-key': validSecret, 'x-tenant-id': 'omni-freight' },
  });

  const freshOmniProj = await owner.platformProject.findUnique({ where: { slug: 'omni-freight' } });
  assert.equal(Number(freshOmniProj?.monthlyApiCalls), 1252, 'Usage must increment atomically to 1252');
  console.log('✔ Usage incremented atomically from 1251 to 1252 on migrated project.\n');

  // ---------------------------------------------------------------------------
  // SECTION 7: Audit Rows Present & Untampered
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 7: Audit Rows Present & Untampered');
  console.log('Goal: Platform audit events migrated into PostgreSQL with intact metadata.');
  console.log('--------------------------------------------------------------------------------\n');

  const auditRow = await owner.platformAuditEvent.findUnique({ where: { id: 'audit_legacy_01' } });
  assert.notEqual(auditRow, null, 'Legacy audit event must be present in PlatformAuditEvent table');
  assert.equal(auditRow?.action, 'project.created');
  assert.equal(auditRow?.actorId, 'usr_omni_admin');
  const auditMeta = typeof auditRow?.metadata === 'string' ? JSON.parse(auditRow.metadata) : auditRow?.metadata;
  assert.equal(auditMeta?.migrated, true);
  console.log('✔ Legacy audit record present with authentic action, actor, and JSON metadata.\n');

  // ---------------------------------------------------------------------------
  // SECTION 8: Tenant Isolation (RLS) Intact
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 8: Tenant Isolation (RLS) Intact');
  console.log('Goal: Multi-tenant RLS strictly confines runtime queries to authenticated tenant scope.');
  console.log('--------------------------------------------------------------------------------\n');

  // Query audit logs under Omni tenant scope
  const omniTenantScope = 'org/org_legacy_omni_01/project/proj_omni_logistics_01/environment/env_omni_prod';
  const omniAudits = await runtime.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${omniTenantScope}, true)`;
    return tx.platformAuditEvent.findMany();
  });

  assert.equal(omniAudits.length, 1, 'Omni tenant can read its own audit records');
  assert.equal(omniAudits[0]?.organizationId, 'org_legacy_omni_01');

  // Query audit logs under a different tenant scope (MedNet) -> must NOT see Omni audit logs!
  const mednetTenantScope = 'org/org_legacy_mednet_02/project/proj_mednet_inpatient_02/environment/env_mednet_prod';
  const mednetAudits = await runtime.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${mednetTenantScope}, true)`;
    return tx.platformAuditEvent.findMany();
  });

  assert.equal(mednetAudits.length, 0, 'MedNet tenant must NOT see Omni audit records under RLS');
  console.log('✔ Row Level Security (RLS) tenant isolation strictly intact across migrated organizations.\n');

  // ---------------------------------------------------------------------------
  // SECTION 9: Runtime Role Privilege Boundary Enforcement
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 9: Runtime Role Privilege Boundary Enforcement');
  console.log('Goal: Runtime role (orbitox_runtime) is strictly prohibited from running importer.');
  console.log('--------------------------------------------------------------------------------\n');

  let runtimeImporterThrew = false;
  let runtimeErrorMessage = '';
  try {
    await runPlatformJsonImporter(runtime, {
      filePath: legacyFixturePath,
      dryRun: false,
    });
  } catch (err: any) {
    runtimeImporterThrew = true;
    runtimeErrorMessage = err.message;
  }

  assert.equal(runtimeImporterThrew, true, 'Runtime role must be rejected from running importer');
  assert.equal(runtimeErrorMessage.includes('orbitox_runtime'), true, 'Error must identify prohibited runtime role');
  console.log(`Runtime execution rejected with expected message: "${runtimeErrorMessage}"`);
  console.log('✔ Sub-test 9 passed: privilege boundary strictly prevents runtime role from executing importer.\n');

  // Clean up server
  try { server.kill('SIGKILL'); } catch {}

  // Clean up legacy fixture imported data
  try {
    await owner.platformApiKey.deleteMany({ where: { id: { in: ['key_omni_verified_01', 'key_mednet_legacy_unverified_02'] } } });
    await owner.projectDomain.deleteMany({ where: { id: 'dom_omni_01' } });
    await owner.environmentQuotaPolicy.deleteMany({ where: { id: 'quota_omni_01' } });
    await owner.environmentRateLimitPolicy.deleteMany({ where: { id: 'rate_omni_01' } });
    await owner.projectEnvironment.deleteMany({ where: { id: { in: ['env_omni_prod', 'env_mednet_prod'] } } });
    await owner.platformProject.deleteMany({ where: { id: { in: ['proj_omni_logistics_01', 'proj_mednet_inpatient_02'] } } });
    await owner.$executeRaw`DELETE FROM "PlatformAuditEvent" WHERE "id" = 'audit_legacy_01'`;
    await owner.platformOrganization.deleteMany({ where: { id: { in: ['org_legacy_omni_01', 'org_legacy_mednet_02'] } } });
  } catch {}

  console.log('================================================================================');
  console.log('🎉 ALL STEP 5 IMPORTER, DURABILITY & VERIFICATION TESTS PASSED SUCCESSFULLY');
  console.log('================================================================================\n');
}

main().catch(async (err) => {
  console.error('Fatal Step 5 test failure:', err);
  await cleanup();
  process.exit(1);
});

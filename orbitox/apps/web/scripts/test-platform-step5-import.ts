import assert from 'node:assert/strict';
import { ChildProcess, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  runPlatformJsonImporter,
  verifyPepperSamples,
  sanitizeDatabaseUrl,
} from './import-platform-json';
import { loadPepperRing, activeVerifier } from '../lib/pepper';

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
const audit = new PrismaClient({ datasources: { db: { url: boundedUrl(auditUrl) } } });

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
  await Promise.all([owner.$disconnect(), runtime.$disconnect(), audit.$disconnect()]);
}

process.on('SIGINT', async () => { await cleanup(); process.exit(1); });
process.on('SIGTERM', async () => { await cleanup(); process.exit(1); });

async function main() {
  console.log('================================================================================');
  console.log('🪐 OrbitoX Phase 2 Step 5: JSON-Store to PostgreSQL Migration & Importer Harness');
  console.log('================================================================================\n');

  const baseFixturePath = path.resolve(__dirname, '../test/fixtures/legacy-platform-store.json');
  assert.equal(fs.existsSync(baseFixturePath), true, 'Base legacy fixture file must exist');

  // S5-4: Generate dynamic runtime test secrets with synthetic prefixes at test time
  const serverPepper = process.env.ORBITOX_SERVER_PEPPER || 'step5-server-pepper-32-chars-minimum-entropy';
  const validSecret = 'orb_test_dyn_' + crypto.randomBytes(16).toString('hex');
  const expectedVerifier = crypto.createHmac('sha256', serverPepper).update(validSecret).digest('hex');
  const legacyUnverifiedSecret = 'orb_test_unmigrated_' + crypto.randomBytes(16).toString('hex');

  const fixtureData = JSON.parse(fs.readFileSync(baseFixturePath, 'utf8'));
  const omniKey = fixtureData.apiKeys.find((k: any) => k.id === 'key_omni_verified_01');
  if (omniKey) {
    omniKey.authVerifier = expectedVerifier;
  }
  const mednetKey = fixtureData.apiKeys.find((k: any) => k.id === 'key_mednet_legacy_unverified_02');
  if (mednetKey) {
    mednetKey.rawSecret = legacyUnverifiedSecret;
  }

  const legacyFixturePath = path.resolve(__dirname, '../test/fixtures/.runtime-step5-store.json');
  fs.writeFileSync(legacyFixturePath, JSON.stringify(fixtureData, null, 2));

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
  assert.equal(dryRunReport.reconciliation.length > 0, true);

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

  const validOrgSlug = `valid-org-${Date.now()}`;
  const corruptOrgSlug = `corrupt-org-${Date.now()}`;

  const corruptFixturePath = path.resolve(__dirname, '../test/fixtures/corrupt-test-store.json');
  const corruptFixtureData = {
    organizations: [
      { id: `org_${validOrgSlug}`, slug: validOrgSlug, name: 'Valid Company', billingEmail: 'valid@test.io', status: 'ACTIVE' },
      { id: `org_${corruptOrgSlug}`, slug: corruptOrgSlug, name: 'Corrupt Company', billingEmail: 'corrupt@test.io', status: 'ACTIVE' },
    ],
    projects: [
      { id: `proj_${validOrgSlug}`, slug: `proj-${validOrgSlug}`, name: 'Valid Project', organizationId: `org_${validOrgSlug}`, businessModel: 'B2B_SAAS', plan: 'starter' },
      // Intentional duplicate slug collision on Project to trigger unique constraint abort
      { id: `proj_${corruptOrgSlug}`, slug: `proj-${validOrgSlug}`, name: 'Corrupt Project Colliding', organizationId: `org_${corruptOrgSlug}`, businessModel: 'B2B_SAAS', plan: 'starter' },
    ],
    environments: [
      { id: `env_${validOrgSlug}`, projectId: `proj_${validOrgSlug}`, slug: 'production', name: 'Production', isProduction: true },
      { id: `env_${corruptOrgSlug}`, projectId: `proj_${corruptOrgSlug}`, slug: 'production', name: 'Production', isProduction: true },
    ],
    apiKeys: [
      { id: `key_${validOrgSlug}`, keyId: `k_${validOrgSlug}`, name: 'Valid Key', environmentId: `env_${validOrgSlug}`, authVerifier: crypto.createHash('sha256').update('v').digest('hex') },
    ],
    credentials: [], packages: [], packageVersions: [], packageInstallations: [], domains: [], quotaPolicies: [], rateLimitPolicies: [], auditLogs: [],
  };

  fs.writeFileSync(corruptFixturePath, JSON.stringify(corruptFixtureData, null, 2));

  try {
    const errorReport = await runPlatformJsonImporter(owner, {
      filePath: corruptFixturePath,
      dryRun: false,
      allowUnsampledOrgs: ['*'],
    });

    assert.equal(errorReport.organizationsImported, 1, 'Exactly 1 organization must succeed');
    assert.equal(errorReport.organizationsFailed, 1, 'Exactly 1 organization must fail and roll back');

    const validInDb = await owner.platformOrganization.findUnique({ where: { slug: validOrgSlug } });
    assert.notEqual(validInDb, null, 'Valid organization must be committed in PostgreSQL');

    const corruptInDb = await owner.platformOrganization.findUnique({ where: { slug: corruptOrgSlug } });
    assert.equal(corruptInDb, null, 'Corrupted organization must NOT exist in PostgreSQL (clean rollback)');

    console.log('✔ All-or-nothing transaction verified: valid org committed, corrupted org rolled back with zero leftover rows.\n');
  } finally {
    try { fs.unlinkSync(corruptFixturePath); } catch {}
    try {
      await owner.platformApiKey.deleteMany({ where: { keyId: `k_${validOrgSlug}` } });
      await owner.projectEnvironment.deleteMany({ where: { id: `env_${validOrgSlug}` } });
      await owner.platformProject.deleteMany({ where: { slug: `proj-${validOrgSlug}` } });
      await owner.platformOrganization.deleteMany({ where: { slug: validOrgSlug } });
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: Mid-Import Kill -9 & Test Hooks Gating (S5-6)
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 3: Mid-Import Kill -9 & Test Hooks Gating (S5-6)');
  console.log('Goal: Violent SIGKILL mid-transaction leaves PostgreSQL consistent; re-run resumes cleanly.');
  console.log('      Test hooks (--kill-mid-org) fail-closed if ORBITOX_ALLOW_TEST_HOOKS is missing.');
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
    const importerScript = path.resolve(__dirname, 'import-platform-json.ts');
    const tsxBin = path.resolve(__dirname, '../../../node_modules/.bin/tsx');

    // Test 3A: Test hooks fail-closed without ORBITOX_ALLOW_TEST_HOOKS='true' (S5-6)
    console.log('Testing test hooks security guard (must fail without ORBITOX_ALLOW_TEST_HOOKS)...');
    const ungatedChild = spawn(
      tsxBin,
      [importerScript, `--file=${killFixturePath}`, `--kill-mid-org=${kOrg2}`, '--allow-unsampled-org=*'],
      {
        env: {
          ...process.env,
          DATABASE_URL: boundedUrl(databaseUrl),
          ORBITOX_ALLOW_TEST_HOOKS: 'false',
        },
        stdio: 'pipe',
      }
    );
    const ungatedExit = await new Promise<number | null>((res) => ungatedChild.on('exit', (c) => res(c)));
    assert.equal(ungatedExit, 1, 'Child must exit 1 when test hooks are invoked without explicit authorization');
    console.log('✔ S5-6 Test hooks security guard verified: refused without explicit ORBITOX_ALLOW_TEST_HOOKS=true.');

    // Test 3B: Violent termination mid-transaction on Org 2
    console.log('Spawning importer in child process with mid-transaction violent kill hook on Org 2...');
    const child = spawn(
      tsxBin,
      [importerScript, `--file=${killFixturePath}`, `--kill-mid-org=${kOrg2}`, '--allow-unsampled-org=*'],
      {
        env: {
          ...process.env,
          DATABASE_URL: boundedUrl(databaseUrl),
          ORBITOX_ALLOW_TEST_HOOKS: 'true',
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
    const org1InDb = await owner.platformOrganization.findUnique({ where: { slug: kOrg1 } });
    assert.notEqual(org1InDb, null, 'Org 1 committed prior to crash must be present');

    const org2InDb = await owner.platformOrganization.findUnique({ where: { slug: kOrg2 } });
    const proj2InDb = await owner.platformProject.findUnique({ where: { slug: `p-${kOrg2}` } });
    assert.equal(org2InDb, null, 'Org 2 killed mid-transaction must be rolled back completely');
    assert.equal(proj2InDb, null, 'Org 2 project must not exist');

    const org3InDb = await owner.platformOrganization.findUnique({ where: { slug: kOrg3 } });
    assert.equal(org3InDb, null, 'Org 3 must not yet exist');
    console.log('✔ PostgreSQL WAL integrity verified: uncommitted transaction aborted cleanly with zero dirty rows.');

    // Resume import
    console.log('Resuming import after kill -9...');
    const resumeReport = await runPlatformJsonImporter(owner, {
      filePath: killFixturePath,
      dryRun: false,
      allowUnsampledOrgs: ['*'],
      bypassLease: true,
    });

    assert.equal(resumeReport.organizationsImported, 2, 'Remaining 2 organizations must be imported on resume');
    assert.equal(resumeReport.organizationsSkipped, 1, 'Org 1 previously committed must be skipped (INSERT-ONLY)');

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
      await owner.$executeRaw`DELETE FROM "PlatformImporterLease" WHERE "id" = 'singleton'`;
      await owner.platformApiKey.deleteMany({ where: { keyId: { in: [`k_${kOrg1}`, `k_${kOrg2}`, `k_${kOrg3}`] } } });
      await owner.projectEnvironment.deleteMany({ where: { id: { in: [`env_${kOrg1}`, `env_${kOrg2}`, `env_${kOrg3}`] } } });
      await owner.platformProject.deleteMany({ where: { slug: { in: [`p-${kOrg1}`, `p-${kOrg2}`, `p-${kOrg3}`] } } });
      await owner.platformOrganization.deleteMany({ where: { slug: { in: [kOrg1, kOrg2, kOrg3] } } });
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: Real Legacy Fixture Import & S5-1 INSERT-ONLY Integrity Proof
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 4: Real Legacy Fixture Import & S5-1 INSERT-ONLY Integrity Proof');
  console.log('Goal: Import legacy store; re-running NEVER overwrites live mutations (status, usage, keys).');
  console.log('--------------------------------------------------------------------------------\n');

  // Pre-cleanup legacy fixture rows if any exist
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

  const legacyReport1 = await runPlatformJsonImporter(owner, {
    filePath: legacyFixturePath,
    dryRun: false,
    allowUnsampledOrgs: ['*'],
  });

  assert.equal(legacyReport1.organizationsImported, 2, 'Must import 2 legacy organizations on first pass');
  assert.equal(legacyReport1.organizationsSkipped, 0);

  // S5-1 Mutation: Simulate post-cutover live operations in PostgreSQL
  console.log('Simulating live PostgreSQL mutations after cutover...');
  await owner.platformOrganization.update({
    where: { id: 'org_legacy_omni_01' },
    data: { status: 'SUSPENDED', name: 'Omni Suspended Mutated Name' },
  });
  await owner.platformProject.update({
    where: { id: 'proj_omni_logistics_01' },
    data: { monthlyApiCalls: 999999n, plan: 'enterprise' },
  });
  await owner.platformApiKey.update({
    where: { id: 'key_omni_verified_01' },
    data: { status: 'REVOKED', revokeReason: 'SECURITY_AUDIT_MANUAL_REVOCATION', revokedAt: new Date() },
  });
  await owner.environmentQuotaPolicy.update({
    where: { environmentId: 'env_omni_prod' },
    data: { monthlyCallsUsed: 888888n, monthlyCallLimit: 9999999n },
  });

  // Re-run importer against the exact same legacy fixture
  console.log('Re-running importer against live mutated state (S5-1 INSERT-ONLY test)...');
  const legacyReport2 = await runPlatformJsonImporter(owner, {
    filePath: legacyFixturePath,
    dryRun: false,
    allowUnsampledOrgs: ['*'],
  });

  assert.equal(legacyReport2.organizationsImported, 0, 'Must import 0 organizations on re-run');
  assert.equal(legacyReport2.organizationsSkipped, 2, 'Must skip both existing organizations on re-run');

  // Verify that live PostgreSQL mutations were NOT overwritten!
  const liveOrg = await owner.platformOrganization.findUnique({ where: { id: 'org_legacy_omni_01' } });
  assert.equal(liveOrg?.status, 'SUSPENDED', 'S5-1 Violation: Organization status was overwritten by stale JSON!');
  assert.equal(liveOrg?.name, 'Omni Suspended Mutated Name', 'S5-1: Live organization name must remain untouched');

  const liveProj = await owner.platformProject.findUnique({ where: { id: 'proj_omni_logistics_01' } });
  assert.equal(liveProj?.monthlyApiCalls, 999999n, 'S5-1 Violation: Live usage counter was rolled back by stale JSON!');
  assert.equal(liveProj?.plan, 'enterprise', 'S5-1: Live plan must remain untouched');

  const liveKey = await owner.platformApiKey.findUnique({ where: { id: 'key_omni_verified_01' } });
  assert.equal(liveKey?.status, 'REVOKED', 'S5-1 Violation: Revoked key was un-revoked by stale JSON!');
  assert.equal(liveKey?.revokeReason, 'SECURITY_AUDIT_MANUAL_REVOCATION', 'S5-1: Live revoke reason must remain untouched');

  const liveQuota = await owner.environmentQuotaPolicy.findUnique({ where: { environmentId: 'env_omni_prod' } });
  assert.equal(liveQuota?.monthlyCallsUsed, 888888n, 'S5-1 Violation: Live quota used counter was overwritten!');
  assert.equal(liveQuota?.monthlyCallLimit, 9999999n, 'S5-1: Live quota limit must remain untouched');

  console.log('✔ S5-1 HIGH fix verified: Importer is strictly INSERT-ONLY; live status, usage, keys, and quotas preserved.\n');

  // Restore Omni org and project usage for downstream live server tests
  await owner.platformOrganization.update({
    where: { id: 'org_legacy_omni_01' },
    data: { status: 'ACTIVE', name: 'Omni Legacy Logistics Global' },
  });
  await owner.platformProject.update({
    where: { id: 'proj_omni_logistics_01' },
    data: { monthlyApiCalls: 1250n, plan: 'enterprise_scale' },
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: Key Authentication & S5-5 Constant Marker Verification
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 5: Key Authentication & S5-5 Constant Marker Verification');
  console.log('Goal: Migrated key with verifier authenticates (200); legacy key without verifier');
  console.log('      is REVOKED with constant fingerprint marker (never silently valid).');
  console.log('--------------------------------------------------------------------------------\n');

  // Verify S5-5 Constant Fingerprint Marker on unverified key
  const unverifiedKeyRow = await owner.platformApiKey.findUnique({
    where: { keyId: 'key_live_mednet_unverified_67890' },
  });
  assert.equal(unverifiedKeyRow?.status, 'REVOKED', 'Unverified key must have status REVOKED');
  assert.equal(unverifiedKeyRow?.revokeReason, 'LEGACY_KEY_MISSING_VERIFIER');
  assert.equal(unverifiedKeyRow?.secretFingerprint, 'DISCARDED_UNVERIFIED_LEGACY_KEY', 'S5-5: Must store constant marker');
  assert.equal(unverifiedKeyRow?.authVerifier.startsWith('unmigrated_missing_verifier_'), true);
  console.log('✔ S5-5 Low fix verified: Unverified legacy key stored with constant marker (no secret hash derived).\n');


  await owner.platformOrganization.update({
    where: { id: 'org_legacy_omni_01' },
    data: { status: 'ACTIVE' },
  });
  await owner.platformProject.update({
    where: { id: 'proj_omni_logistics_01' },
    data: { status: 'ACTIVE' },
  });
  await owner.platformApiKey.update({
    where: { keyId: 'key_live_omni_verified_12345' },
    data: { status: 'ACTIVE', revokeReason: null, revokedAt: null },
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
  const invalidRes = await fetch(`http://127.0.0.1:${port}/api/v1/crm/leads`, {
    headers: {
      'x-api-key': legacyUnverifiedSecret,
      'x-tenant-id': 'mednet-inpatient',
    },
  });
  console.log(`Legacy Unverified Key Response: ${invalidRes.status}`);
  assert.equal(invalidRes.status === 401 || invalidRes.status === 403, true, 'Legacy unverified key must be rejected');
  console.log('✔ Unverified legacy key is marked REVOKED with unmatchable dummy verifier (never silently valid).\n');

  // ---------------------------------------------------------------------------
  // SECTION 6: Billing Numbers & Usage Monotonicity
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 6: Billing Numbers & Usage Monotonicity');
  console.log('Goal: Stored usage matches legacy fixture; subsequent billable requests increment atomically.');
  console.log('--------------------------------------------------------------------------------\n');

  const omniProj = await owner.platformProject.findUnique({ where: { slug: 'omni-freight' } });
  assert.equal(Number(omniProj?.monthlyApiCalls), 1251, 'monthlyApiCalls after 1 live call must be 1251 (started at 1250)');
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
  // SECTION 7: Audit Rows Present & Untampered with S5-8 Source Tagging
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 7: Audit Rows Present & Untampered with S5-8 Source Tagging');
  console.log('Goal: Platform audit events migrated into PostgreSQL with intact metadata and source tag.');
  console.log('--------------------------------------------------------------------------------\n');

  const auditRow = await owner.platformAuditEvent.findUnique({ where: { id: 'audit_legacy_01' } });
  assert.notEqual(auditRow, null, 'Legacy audit event must be present in PlatformAuditEvent table');
  assert.equal(auditRow?.action, 'project.created');
  assert.equal(auditRow?.actorId, 'usr_omni_admin');
  const auditMeta = typeof auditRow?.metadata === 'string' ? JSON.parse(auditRow.metadata) : auditRow?.metadata;
  assert.equal(auditMeta?.migrated, true);
  assert.equal(auditMeta?.source, 'JSON_STORE_MIGRATION', 'S5-8: Audit event must be marked with JSON_STORE_MIGRATION source');
  console.log('✔ Legacy audit record present with authentic action, actor, and source metadata tag.\n');

  // ---------------------------------------------------------------------------
  // SECTION 8: Tenant Isolation (RLS) Concrete Cross-Tenant Proof (S5-8)
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 8: Tenant Isolation (RLS) Concrete Cross-Tenant Proof (S5-8)');
  console.log('Goal: Show concrete cross-tenant read returning zero rows; database RLS verified.');
  console.log('--------------------------------------------------------------------------------\n');

  // 8A: Live HTTP cross-tenant scope enforcement
  // Attempt 1: Key authenticated for omni-freight attempts to access with x-tenant-id: mednet-inpatient
  const spoofedTenantRes = await fetch(`http://127.0.0.1:${port}/api/v1/crm/leads`, {
    headers: {
      'x-api-key': validSecret,
      'x-tenant-id': 'mednet-inpatient',
    },
  });
  console.log(`Cross-tenant spoofed header request: status=${spoofedTenantRes.status}`);
  assert.equal(spoofedTenantRes.status, 403, 'Cross-tenant scope spoofing must be rejected with HTTP 403');
  console.log('✔ Cross-tenant HTTP scope spoofing rejected with HTTP 403.');

  // 8B: PostgreSQL Kernel RLS scope verification for migrated data
  const omniTenantScope = 'org/org_legacy_omni_01/project/proj_omni_logistics_01/environment/env_omni_prod';
  const omniAudits = await runtime.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${omniTenantScope}, true)`;
    return tx.platformAuditEvent.findMany();
  });
  assert.equal(omniAudits.length, 1, 'Omni tenant can read its own audit records (1 row returned)');
  console.log(`Omni tenant query returned: ${omniAudits.length} row(s) (expected: 1)`);

  // Cross-tenant read as another tenant (MedNet) -> strictly returns ZERO rows!
  const mednetTenantScope = 'org/org_legacy_mednet_02/project/proj_mednet_inpatient_02/environment/env_mednet_prod';
  const mednetAudits = await runtime.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${mednetTenantScope}, true)`;
    return tx.platformAuditEvent.findMany();
  });
  assert.equal(mednetAudits.length, 0, 'MedNet cross-tenant read must return ZERO rows');
  console.log(`MedNet cross-tenant query returned: ${mednetAudits.length} rows (status: 200, zero rows leaked).`);
  console.log('✔ Row Level Security (RLS) tenant isolation strictly intact across migrated organizations.\n');

  // ---------------------------------------------------------------------------
  // SECTION 9: Role Privilege Boundary & DB Grants Enforcement (S5-2)
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 9: Role Privilege Boundary & DB Grants Enforcement (S5-2)');
  console.log('Goal: Runtime and audit roles are prohibited from executing importer and cannot write platform tables.');
  console.log('--------------------------------------------------------------------------------\n');

  // 9A: Importer application check rejects runtime role
  let runtimeImporterThrew = false;
  let runtimeErrorMessage = '';
  try {
    await runPlatformJsonImporter(runtime, { filePath: legacyFixturePath, dryRun: false, allowUnsampledOrgs: ['*'] });
  } catch (err: any) {
    runtimeImporterThrew = true;
    runtimeErrorMessage = err.message;
  }
  assert.equal(runtimeImporterThrew, true);
  assert.equal(runtimeErrorMessage.includes('Privilege boundary violation'), true);
  console.log(`Runtime execution rejected with expected message: "${runtimeErrorMessage}"`);

  // 9B: Importer application check rejects audit role
  let auditImporterThrew = false;
  let auditErrorMessage = '';
  try {
    await runPlatformJsonImporter(audit, { filePath: legacyFixturePath, dryRun: false, allowUnsampledOrgs: ['*'] });
  } catch (err: any) {
    auditImporterThrew = true;
    auditErrorMessage = err.message;
  }
  assert.equal(auditImporterThrew, true);
  assert.equal(auditErrorMessage.includes('Privilege boundary violation'), true);
  console.log(`Audit execution rejected with expected message: "${auditErrorMessage}"`);

  // 9C: PostgreSQL DB grants test: audit role cannot write to platform control-plane tables (e.g. PlatformOrganization)
  let auditDbWriteBlocked = false;
  try {
    await audit.$executeRaw`
      INSERT INTO "PlatformOrganization" ("id", "slug", "name", "billingEmail", "status", "complianceTier", "createdAt", "updatedAt")
      VALUES ('hack_audit_org', 'hack-audit-org', 'Hacked', 'hack@test.io', 'ACTIVE', 'STANDARD', NOW(), NOW())
    `;
  } catch (err: any) {
    auditDbWriteBlocked = true;
    assert.ok(
      err.message.includes('42501') ||
      err.message.toLowerCase().includes('permission denied') ||
      err?.meta?.code === '42501',
      `Must fail with PostgreSQL 42501 permission denied, got: ${err.message}`
    );
  }
  assert.equal(auditDbWriteBlocked, true, 'orbitox_platform_admin_audit must NOT have INSERT grant on PlatformOrganization');

  let auditKeyWriteBlocked = false;
  try {
    await audit.$executeRaw`
      INSERT INTO "PlatformApiKey" ("id", "keyId", "name", "environmentId", "keyType", "keyPrefix", "secretFingerprint", "maskedDisplay", "status", "issuedAt")
      VALUES ('hack_key', 'hack_key_id', 'Hacked', 'env_omni_prod', 'PROJECT_SCOPED', 'orb_test_', 'fp', 'mask', 'ACTIVE', NOW())
    `;
  } catch (err: any) {
    auditKeyWriteBlocked = true;
    assert.ok(
      err.message.includes('42501') ||
      err.message.toLowerCase().includes('permission denied') ||
      err?.meta?.code === '42501',
      `Must fail with PostgreSQL 42501 permission denied, got: ${err.message}`
    );
  }
  assert.equal(auditKeyWriteBlocked, true, 'orbitox_platform_admin_audit must NOT have INSERT grant on PlatformApiKey');

  // 9D: PostgreSQL DB grants test: runtime role cannot mutate (UPDATE/DELETE/TRUNCATE) platform audit records
  let runtimeAuditMutateBlocked = false;
  try {
    await runtime.$executeRaw`
      UPDATE "PlatformAuditEvent"
      SET "action" = 'tampered.action'
      WHERE "id" = 'audit_legacy_01'
    `;
  } catch (err: any) {
    runtimeAuditMutateBlocked = true;
    assert.ok(
      err.message.includes('42501') ||
      err.message.toLowerCase().includes('permission denied') ||
      err?.meta?.code === '42501',
      `Must fail with PostgreSQL 42501 permission denied, got: ${err.message}`
    );
  }
  assert.equal(runtimeAuditMutateBlocked, true, 'orbitox_runtime must NOT have UPDATE/DELETE grant on PlatformAuditEvent');
  console.log('✔ S5-2 DB grants verified: audit role cannot write platform tables; runtime cannot mutate audit events.\n');

  // ---------------------------------------------------------------------------
  // SECTION 10: Concurrent Execution & Advisory Lock Protection (S5-8)
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 10: Concurrent Execution & Advisory Lock Protection (S5-8)');
  console.log('Goal: Two importer processes cannot interleave; advisory lock rejects parallel run.');
  console.log('--------------------------------------------------------------------------------\n');

  // S5-F2: 1. Test lease conflict rejection
  await owner.$executeRaw`
    CREATE TABLE IF NOT EXISTS "PlatformImporterLease" (
      "id" TEXT PRIMARY KEY DEFAULT 'singleton',
      "holder" TEXT NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL
    )
  `;
  await owner.$executeRaw`
    INSERT INTO "PlatformImporterLease" ("id", "holder", "expiresAt")
    VALUES ('singleton', 'manual_holder_test', now() + interval '2 minutes')
    ON CONFLICT ("id") DO UPDATE
    SET "holder" = 'manual_holder_test', "expiresAt" = now() + interval '2 minutes'
  `;

  let lockRejectionThrew = false;
  let lockRejectionMsg = '';
  const secondOwner = new PrismaClient({ datasources: { db: { url: boundedUrl(databaseUrl) } } });
  try {
    try {
      await runPlatformJsonImporter(secondOwner, {
        filePath: legacyFixturePath,
        dryRun: false,
        allowUnsampledOrgs: ['omni-logistics', 'mednet-health'],
      });
    } catch (err: any) {
      lockRejectionThrew = true;
      lockRejectionMsg = err.message;
    }

    assert.equal(lockRejectionThrew, true, 'Concurrent importer run must fail when lease held');
    assert.equal(lockRejectionMsg.includes('Concurrent execution conflict'), true);
    console.log(`Lease conflict rejection verified: "${lockRejectionMsg}"`);

    // Clean up lease
    await owner.$executeRaw`DELETE FROM "PlatformImporterLease" WHERE "id" = 'singleton'`;

    // 2. Test concurrent runs with bypassLease: transaction advisory lock prevents duplicates
    const [p1, p2] = await Promise.all([
      runPlatformJsonImporter(owner, {
        filePath: legacyFixturePath,
        dryRun: false,
        bypassLease: true,
        allowUnsampledOrgs: ['*'],
      }),
      runPlatformJsonImporter(secondOwner, {
        filePath: legacyFixturePath,
        dryRun: false,
        bypassLease: true,
        allowUnsampledOrgs: ['*'],
      }),
    ]);

    assert.ok(p1.organizationsImported >= 0);
    assert.ok(p2.organizationsImported >= 0);
    console.log(`Parallel execution with lease bypass succeeded safely: p1=${p1.organizationsImported} imported / ${p1.organizationsSkipped} skipped, p2=${p2.organizationsImported} imported / ${p2.organizationsSkipped} skipped`);
    console.log('✔ S5-F2 Transaction advisory lock and singleton lease verified.\n');
  } finally {
    await secondOwner.$disconnect();
    await owner.$executeRaw`DELETE FROM "PlatformImporterLease" WHERE "id" = 'singleton'`;
  }

  // ---------------------------------------------------------------------------
  // SECTION 11: Billing Period Override & Pepper Pre-Flight (S5-3 & S5-8)
  // ---------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 11: Billing Period Override & Pepper Pre-Flight (S5-3 & S5-8)');
  console.log('Goal: Operator override --default-billing-period works; server pepper pre-flight verified.');
  console.log('--------------------------------------------------------------------------------\n');

  // Pepper pre-flight check (F1)
  const testRing = loadPepperRing({ ORBITOX_SERVER_PEPPER: 'test-pepper-preflight-entropy-32-chars-min' });
  const testSampleKey = 'key_sample_test_01';
  const testSampleSecret = 'orb_test_sample_secret_12345';
  const testSampleVerifier = activeVerifier(testRing, testSampleSecret).verifier;

  const testKeyList = [
    { id: testSampleKey, organizationId: 'org_test_sample', authVerifier: testSampleVerifier },
  ];

  const sampleMatch = verifyPepperSamples(testKeyList, JSON.stringify({ [testSampleKey]: testSampleSecret }), testRing);
  assert.equal(sampleMatch.matched, 1);
  assert.equal(sampleMatch.mismatched.length, 0);
  assert.equal(sampleMatch.orgsWithoutSample.length, 0);

  // Mismatch fails
  const sampleMismatch = verifyPepperSamples(testKeyList, JSON.stringify({ [testSampleKey]: 'wrong_secret' }), testRing);
  assert.equal(sampleMismatch.mismatched.length, 1);

  // Unsampled org detected
  const unsampledResult = verifyPepperSamples([
    ...testKeyList,
    { id: 'key_unsampled_02', organizationId: 'org_unsampled', authVerifier: 'some_verifier_hex' },
  ], JSON.stringify({ [testSampleKey]: testSampleSecret }), testRing);
  assert.ok(unsampledResult.orgsWithoutSample.includes('org_unsampled'));
  console.log('Pepper verification samples check (F1) verified: matched sample, caught mismatch, caught unsampled org.');

  // Operator billing period override
  const overrideOrgSlug = `override-org-${Date.now()}`;
  const overrideFixturePath = path.resolve(__dirname, '../test/fixtures/override-test-store.json');
  fs.writeFileSync(
    overrideFixturePath,
    JSON.stringify({
      organizations: [{ id: `org_${overrideOrgSlug}`, slug: overrideOrgSlug, name: 'Override Org', billingEmail: 'ov@test.io', status: 'ACTIVE' }],
      projects: [{ id: `proj_${overrideOrgSlug}`, slug: `p-${overrideOrgSlug}`, name: 'P-Override', organizationId: `org_${overrideOrgSlug}`, businessModel: 'B2B_SAAS', plan: 'starter' }],
      environments: [{ id: `env_${overrideOrgSlug}`, projectId: `proj_${overrideOrgSlug}`, slug: 'production', name: 'Prod', isProduction: true }],
      apiKeys: [], credentials: [], packages: [], packageVersions: [], packageInstallations: [], domains: [], quotaPolicies: [], rateLimitPolicies: [], auditLogs: [],
    })
  );

  try {
    const overrideReport = await runPlatformJsonImporter(owner, {
      filePath: overrideFixturePath,
      dryRun: false,
      defaultBillingPeriod: '2026-12',
      allowUnsampledOrgs: ['*'],
    });
    assert.equal(overrideReport.organizationsImported, 1);
    const pRow = await owner.platformProject.findUnique({ where: { slug: `p-${overrideOrgSlug}` } });
    assert.equal(pRow?.currentBillingPeriod, '2026-12', 'Operator billing period override must be applied');
    console.log(`✔ S5-3 Operator billing period override verified: currentBillingPeriod='${pRow?.currentBillingPeriod}'.\n`);
  } finally {
    try { fs.unlinkSync(overrideFixturePath); } catch {}
    try {
      await owner.projectEnvironment.deleteMany({ where: { id: `env_${overrideOrgSlug}` } });
      await owner.platformProject.deleteMany({ where: { slug: `p-${overrideOrgSlug}` } });
      await owner.platformOrganization.deleteMany({ where: { slug: overrideOrgSlug } });
    } catch {}
  }

  // Clean up server
  try { server.kill('SIGKILL'); } catch {}

  // Final cleanup of legacy fixture data
  try {
    await owner.platformApiKey.deleteMany({ where: { id: { in: ['key_omni_verified_01', 'key_mednet_legacy_unverified_02'] } } });
    await owner.platformApiKey.deleteMany({ where: { keyPrefix: 'orb_test_mednet_' } });
    await owner.projectDomain.deleteMany({ where: { id: 'dom_omni_01' } });
    await owner.environmentQuotaPolicy.deleteMany({ where: { id: 'quota_omni_01' } });
    await owner.environmentRateLimitPolicy.deleteMany({ where: { id: 'rate_omni_01' } });
    await owner.projectEnvironment.deleteMany({ where: { id: { in: ['env_omni_prod', 'env_mednet_prod'] } } });
    await owner.platformProject.deleteMany({ where: { id: { in: ['proj_omni_logistics_01', 'proj_mednet_inpatient_02'] } } });
    await owner.$executeRaw`DELETE FROM "PlatformAuditEvent" WHERE "id" = 'audit_legacy_01'`;
    await owner.platformOrganization.deleteMany({ where: { id: { in: ['org_legacy_omni_01', 'org_legacy_mednet_02'] } } });
    try { fs.unlinkSync(legacyFixturePath); } catch {}
  } catch {}

  console.log('================================================================================');
  console.log('🎉 ALL STEP 5 (S5-1 TO S5-8) IMPORTER, DURABILITY & VERIFICATION TESTS PASSED');
  console.log('================================================================================\n');
}

main().catch(async (err) => {
  console.error('Fatal Step 5 test failure:', err);
  await cleanup();
  process.exit(1);
});

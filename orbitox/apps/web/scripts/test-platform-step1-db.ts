import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createHealthHandler } from '../lib/health-route-handler';
import {
  assertPlatformDatabaseReady,
  REQUIRED_PLATFORM_MIGRATIONS,
} from '../lib/platform-database-readiness';
import { buildPlatformTenantScope } from '../lib/platform-tenant-scope';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const appDatabaseUrl = process.env.APP_DATABASE_URL;
if (!databaseUrl || !appDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL (or DATABASE_URL) and APP_DATABASE_URL are required.');
}

function boundedConnectionUrl(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.set('connect_timeout', '3');
  url.searchParams.set('pool_timeout', '5');
  url.searchParams.set('socket_timeout', '10');
  return url.toString();
}

const owner = new PrismaClient({
  datasources: { db: { url: boundedConnectionUrl(databaseUrl) } },
});
const runtime = new PrismaClient({
  datasources: { db: { url: boundedConnectionUrl(appDatabaseUrl) } },
});
const fixtureId = `phase2-step1-${randomUUID()}`;
const fixtureOrganizationId = `organization-${randomUUID()}`;
const fixtureProjectId = `project-${randomUUID()}`;
const developmentEnvironmentId = `development-${randomUUID()}`;
const productionEnvironmentId = `production-${randomUUID()}`;
const developmentScope = buildPlatformTenantScope({
  organizationId: fixtureOrganizationId,
  projectId: fixtureProjectId,
  environmentId: developmentEnvironmentId,
});
const productionScope = buildPlatformTenantScope({
  organizationId: fixtureOrganizationId,
  projectId: fixtureProjectId,
  environmentId: productionEnvironmentId,
});
const auditId = `audit-${randomUUID()}`;
const passed: string[] = [];

const globalTableAllowlist = new Set([
  '_prisma_migrations',
  'CelebrationOccasionCategory',
  'CelebrationOccasion',
  'CelebrationTheme',
  'CelebrationSectionDefinition',
  'CelebrationFeatureDefinition',
  'CelebrationPricingPlan',
  'PlatformIdempotencyRecord',
  'PlatformOutboxMessage',
  'PlatformOrganization',
  'PlatformProject',
  'ProjectEnvironment',
  'PlatformApiKey',
  'PlatformCredential',
  'PlatformPackage',
  'PackageVersion',
  'PackageInstallation',
  'PluginInstallation',
  'ProjectDomain',
  'EnvironmentQuotaPolicy',
  'EnvironmentRateLimitPolicy',
  'PlatformRateLimitBucket',
  'BridgeNonce',
  'PlatformImporterLease',
  'Plugin',
  'Plan',
  'PlanFeature',
  'PlanQuota',
]);

const testTimeout = setTimeout(() => {
  console.error('FAIL Step 1 database checks exceeded the 90-second deadline.');
  process.exit(1);
}, 90_000);

function pass(name: string): void {
  passed.push(name);
  console.log(`PASS ${name}`);
}

async function main(): Promise<void> {
  const roles = await runtime.$queryRaw<
    Array<{
      role_name: string;
      is_superuser: boolean;
      bypass_rls: boolean;
      can_login: boolean;
    }>
  >`
    SELECT rolname AS role_name, rolsuper AS is_superuser, rolbypassrls AS bypass_rls, rolcanlogin AS can_login
    FROM pg_roles WHERE rolname = current_user
  `;
  assert.equal(roles[0]?.role_name, 'orbitox_runtime');
  assert.equal(roles[0]?.is_superuser, false);
  assert.equal(roles[0]?.bypass_rls, false);
  assert.equal(roles[0]?.can_login, true);

  const tableInventory = await runtime.$queryRaw<
    Array<{
      table_name: string;
      root_table_name: string;
      row_security: boolean;
      force_row_security: boolean;
      table_owner: string;
    }>
  >`
    SELECT c.relname AS table_name,
           COALESCE(parent.relname, c.relname) AS root_table_name,
           c.relrowsecurity AS row_security,
           c.relforcerowsecurity AS force_row_security,
           pg_get_userbyid(c.relowner) AS table_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_inherits inheritance ON inheritance.inhrelid = c.oid
    LEFT JOIN pg_class parent ON parent.oid = inheritance.inhparent
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  `;
  const unclassifiedTables = tableInventory.filter(
    (table) =>
      !(table.row_security && table.force_row_security) &&
      !globalTableAllowlist.has(table.root_table_name),
  );
  assert.deepEqual(
    unclassifiedTables.map((table) => table.table_name),
    [],
    'every public table must have forced RLS or be explicitly allowlisted',
  );
  const rlsTables = tableInventory.filter(
    (table) => table.row_security && table.force_row_security,
  );
  assert.ok(rlsTables.length >= 40, `expected >= 40 forced-RLS tables, found ${rlsTables.length}`);
  assert.ok(tableInventory.every((table) => table.table_owner !== 'orbitox_runtime'));
  pass(
    `orbitox_runtime is restricted; ${tableInventory.length} tables are classified, with forced RLS on ${rlsTables.length}`,
  );

  await owner.$executeRaw`
    INSERT INTO "RestaurantLocation" ("id", "tenantId", "companyId", "name", "slug", "createdAt", "updatedAt")
    VALUES (${fixtureId}, ${developmentScope}, 'company-step1', 'Step 1 fixture', ${fixtureId}, NOW(), NOW())
  `;

  const unsetRows = await runtime.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "RestaurantLocation" WHERE "id" = ${fixtureId}
  `;
  assert.equal(unsetRows.length, 0, 'query without tenant context must return no rows');
  await runtime.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', '', true)`;
    const emptyScopeRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "RestaurantLocation" WHERE "id" = ${fixtureId}
    `;
    assert.equal(
      emptyScopeRows.length,
      0,
      'query with an empty tenant context must return no rows',
    );
  });

  await runtime.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${developmentScope}, true)`;
    const scopedRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "RestaurantLocation" WHERE "id" = ${fixtureId}
    `;
    assert.deepEqual(
      scopedRows.map((row) => row.id),
      [fixtureId],
    );
  });

  await runtime.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${productionScope}, true)`;
    const crossEnvironmentRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "RestaurantLocation" WHERE "id" = ${fixtureId}
    `;
    assert.equal(crossEnvironmentRows.length, 0);
  });
  pass('RLS denies unset/empty scope and development-to-production reads within one project');

  const [utcSession] = await runtime.$queryRaw<Array<{ timezone: string; runway_days: number }>>`
    SELECT current_setting('TimeZone') AS timezone,
           public.platform_rate_limit_partition_runway_days() AS runway_days
  `;
  assert.ok(utcSession, 'expected a UTC/timezone result row');
  assert.equal(utcSession.timezone, 'UTC');
  const missedMaintenanceRun = await owner.$transaction(async (transaction) => {
    await transaction.$executeRaw`SAVEPOINT missing_partition_probe`;
    await transaction.$executeRaw`
      DO $$
      DECLARE furthest_partition TEXT;
      BEGIN
        furthest_partition := 'PlatformRateLimitBucket_' || to_char(current_date + 14, 'YYYYMMDD');
        EXECUTE format('DROP TABLE IF EXISTS public.%I', furthest_partition);
      END
      $$
    `;
    const result = await transaction.$queryRaw<Array<{ ready: boolean; runway_days: number }>>`
      SELECT public.platform_rate_limit_partitions_ready(3) AS ready,
             public.platform_rate_limit_partition_runway_days() AS runway_days
    `;
    await transaction.$executeRaw`ROLLBACK TO SAVEPOINT missing_partition_probe`;
    return result;
  });
  assert.equal(missedMaintenanceRun[0]?.ready, true);
  assert.equal(missedMaintenanceRun[0]?.runway_days, 13);
  pass('one missed maintenance run preserves readiness with 13 future UTC days');

  const [utcReadiness] = await runtime.$queryRaw<Array<{ ready: boolean }>>`
    SELECT public.platform_rate_limit_partitions_ready(3) AS ready
  `;
  assert.ok(utcReadiness, 'expected a readiness result row');
  assert.equal(utcReadiness.ready, true);
  const shiftedTimezone = await runtime.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('TimeZone', 'Pacific/Honolulu', true)`;
    return transaction.$queryRaw<Array<{ runway_days: number; ready: boolean }>>`
      SELECT public.platform_rate_limit_partition_runway_days() AS runway_days,
             public.platform_rate_limit_partitions_ready(3) AS ready
    `;
  });
  assert.equal(shiftedTimezone[0]?.runway_days, utcSession.runway_days);
  assert.equal(shiftedTimezone[0]?.ready, true);
  const maintenanceRunway = await owner.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('TimeZone', 'Pacific/Honolulu', true)`;
    await transaction.$queryRaw`SELECT public.maintain_platform_rate_limit_partitions(3, 14)::TEXT AS result`;
    return transaction.$queryRaw<Array<{ runway_days: number }>>`
      SELECT public.platform_rate_limit_partition_runway_days() AS runway_days
    `;
  });
  assert.ok((maintenanceRunway[0]?.runway_days ?? 0) >= 14);
  pass('partition maintenance/readiness use UTC day boundaries independent of session timezone');

  await owner.$executeRaw`
    INSERT INTO "PlatformAuditEvent" ("id", "action", "entityType", "entityId", "organizationId", "projectId", "environmentId", "metadata", "occurredAt")
    VALUES (${auditId}, 'step1.test', 'Step1', ${auditId}, ${fixtureOrganizationId}, ${fixtureProjectId}, ${developmentEnvironmentId}, '{}'::jsonb, NOW())
  `;
  await runtime.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${developmentScope}, true)`;
    const scopedAudit = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "PlatformAuditEvent" WHERE "id" = ${auditId}
    `;
    assert.deepEqual(
      scopedAudit.map((row) => row.id),
      [auditId],
    );
  });
  await runtime.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${productionScope}, true)`;
    const unscopedAudit = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "PlatformAuditEvent" WHERE "id" = ${auditId}
    `;
    assert.equal(unscopedAudit.length, 0);
  });
  await assert.rejects(
    () => runtime.$executeRaw`
    UPDATE "PlatformAuditEvent" SET "action" = 'tampered' WHERE "id" = ${auditId}
  `,
  );
  await assert.rejects(
    () => runtime.$executeRaw`
    DELETE FROM "PlatformAuditEvent" WHERE "id" = ${auditId}
  `,
  );
  await assert.rejects(() => runtime.$executeRaw`TRUNCATE TABLE "PlatformAuditEvent"`);
  pass('audit reads are environment-scoped and runtime cannot update, delete, or truncate events');

  await assert.rejects(
    () => runtime.$executeRaw`DELETE FROM "PluginInstallation" WHERE "id" = 'test_revoke_check'`,
    /permission denied for table PluginInstallation/i,
  );
  pass('DELETE on PluginInstallation is strictly revoked from orbitox_runtime');

  const healthy = await createHealthHandler(() => assertPlatformDatabaseReady(runtime))();
  assert.equal(healthy.status, 200);
  pass('readiness is healthy at the required migration version');

  const mismatchedVersion = await createHealthHandler(() =>
    assertPlatformDatabaseReady(runtime, ['missing_test_migration']),
  )();
  assert.equal(mismatchedVersion.status, 503);
  pass('readiness returns 503 on migration-version mismatch');

  let midRequestQuery = 0;
  const failingMidRequestClient = {
    async $queryRaw(): Promise<unknown> {
      midRequestQuery += 1;
      if (midRequestQuery === 1) return [{ '?column?': 1 }];
      if (midRequestQuery === 2) {
        return REQUIRED_PLATFORM_MIGRATIONS.map((migration_name) => ({ migration_name }));
      }
      throw new Error('Simulated database loss during the readiness request.');
    },
  } as unknown as PrismaClient;
  const midRequestFailure = await createHealthHandler(() =>
    assertPlatformDatabaseReady(failingMidRequestClient),
  )();
  assert.equal(midRequestFailure.status, 503);
  assert.equal(midRequestQuery, 3);
  pass('readiness returns 503 when the database fails after the initial ping');

  console.log(
    `Step 1 database checks: ${passed.length} passed, 0 failed; role=orbitox_runtime; PostgreSQL 16`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await owner.$executeRaw`DELETE FROM "RestaurantLocation" WHERE "id" = ${fixtureId}`.catch(
      () => undefined,
    );
    await owner.$executeRaw`DELETE FROM "PlatformAuditEvent" WHERE "id" = ${auditId}`.catch(
      () => undefined,
    );
    await Promise.all([owner.$disconnect(), runtime.$disconnect()]);
    clearTimeout(testTimeout);
  });

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createHealthHandler } from '../lib/health-route-handler';
import { assertPlatformDatabaseReady } from '../lib/platform-database-readiness';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const appDatabaseUrl = process.env.APP_DATABASE_URL;
if (!databaseUrl || !appDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL (or DATABASE_URL) and APP_DATABASE_URL are required.');
}

const owner = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const runtime = new PrismaClient({ datasources: { db: { url: appDatabaseUrl } } });
const fixtureId = `phase2-step1-${randomUUID()}`;
const tenantId = `tenant-${randomUUID()}`;
const auditId = `audit-${randomUUID()}`;
const passed: string[] = [];

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

  const rlsTables = await runtime.$queryRaw<
    Array<{
      table_name: string;
      row_security: boolean;
      force_row_security: boolean;
      table_owner: string;
    }>
  >`
    SELECT c.relname AS table_name,
           c.relrowsecurity AS row_security,
           c.relforcerowsecurity AS force_row_security,
           pg_get_userbyid(c.relowner) AS table_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND (
        EXISTS (
          SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = 'public'
            AND col.table_name = c.relname
            AND col.column_name IN ('tenantId', 'contextId')
        )
        OR c.relname IN (
          'StoreTheme', 'StorePage', 'StoreDiscount', 'Cart', 'PaymentTransaction',
          'StoreReview', 'ProductVariant', 'CelebrationExperienceSection',
          'StudioPage', 'StudioSection', 'StudioAsset', 'StudioSnapshot', 'RestaurantOrderItem'
        )
      )
  `;
  assert.ok(rlsTables.length >= 40, `expected >= 40 tenant tables, found ${rlsTables.length}`);
  assert.ok(rlsTables.every((table) => table.row_security && table.force_row_security));
  assert.ok(rlsTables.every((table) => table.table_owner !== 'orbitox_runtime'));
  pass(
    `orbitox_runtime is restricted; forced RLS covers ${rlsTables.length} non-owned tenant tables`,
  );

  await owner.$executeRaw`
    INSERT INTO "RestaurantLocation" ("id", "tenantId", "companyId", "name", "slug", "createdAt", "updatedAt")
    VALUES (${fixtureId}, ${tenantId}, 'company-step1', 'Step 1 fixture', ${fixtureId}, NOW(), NOW())
  `;

  const unsetRows = await runtime.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "RestaurantLocation" WHERE "id" = ${fixtureId}
  `;
  assert.equal(unsetRows.length, 0, 'query without tenant context must return no rows');

  await runtime.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    const scopedRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "RestaurantLocation" WHERE "id" = ${fixtureId}
    `;
    assert.deepEqual(
      scopedRows.map((row) => row.id),
      [fixtureId],
    );
  });

  await runtime.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', 'other-tenant', true)`;
    const crossTenantRows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "RestaurantLocation" WHERE "id" = ${fixtureId}
    `;
    assert.equal(crossTenantRows.length, 0);
  });
  pass('RLS denies unset/cross-tenant reads and permits the scoped tenant');

  await owner.$executeRaw`
    INSERT INTO "PlatformAuditEvent" ("id", "action", "entityType", "entityId", "metadata", "occurredAt")
    VALUES (${auditId}, 'step1.test', 'Step1', ${auditId}, '{}'::jsonb, NOW())
  `;
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
  pass('runtime role cannot update or delete audit events');

  const healthy = await createHealthHandler(() => assertPlatformDatabaseReady(runtime))();
  assert.equal(healthy.status, 200);
  pass('readiness is healthy at the required migration version');

  const mismatchedVersion = await createHealthHandler(() =>
    assertPlatformDatabaseReady(runtime, ['missing_test_migration']),
  )();
  assert.equal(mismatchedVersion.status, 503);
  pass('readiness returns 503 on migration-version mismatch');

  const unavailableUrl = new URL(databaseUrl!);
  unavailableUrl.port = String(Number(unavailableUrl.port || 5432) + 1);
  unavailableUrl.searchParams.set('connect_timeout', '2');
  const unavailable = new PrismaClient({ datasources: { db: { url: unavailableUrl.toString() } } });
  try {
    const databaseStopped = await createHealthHandler(() =>
      assertPlatformDatabaseReady(unavailable),
    )();
    assert.equal(databaseStopped.status, 503);
  } finally {
    await unavailable.$disconnect();
  }
  pass('readiness returns 503 when PostgreSQL is unavailable');

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
  });

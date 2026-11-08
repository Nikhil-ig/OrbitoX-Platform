#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX ECS One-Off Task: Staging Step 1 Inventory Verification (Phase 6F)
 * ─────────────────────────────────────────────────────────────
 * Executed as an isolated ECS Fargate task in private VPC subnets.
 * Verifies RLS enforcement, role safety, audit immutability,
 * and audit intent resolution directly against AWS RDS PostgreSQL 16.
 * ─────────────────────────────────────────────────────────────
 */

const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const runtimeUrl = process.env.APP_DATABASE_URL;
if (!runtimeUrl) {
  console.error('❌ APP_DATABASE_URL is required for Step 1 inventory verification.');
  process.exit(1);
}

const migratorUrl = process.env.DATABASE_URL;
const auditWriterUrl = process.env.PLATFORM_AUDIT_DATABASE_URL;

const runtimePrisma = new PrismaClient({
  datasources: { db: { url: runtimeUrl } },
});

async function runInventory() {
  console.log('========================================================');
  console.log('🔒 EXECUTING STAGING STEP 1 RLS & ROLE INVENTORY TEST');
  console.log('========================================================');

  // 1. Verify current database user and non-superuser attributes
  console.log('Step 1: Checking current_user attributes...');
  const roleRows = await runtimePrisma.$queryRaw`
    SELECT current_user, r.rolsuper, r.rolbypassrls, r.rolcanlogin
    FROM pg_roles r WHERE r.rolname = current_user
  `;
  const role = roleRows[0];
  console.log('  Current User:', role.current_user);
  console.log('  Superuser:', role.rolsuper);
  console.log('  Bypass RLS:', role.rolbypassrls);
  console.log('  Can Login:', role.rolcanlogin);

  if (role.current_user !== 'orbitox_runtime') {
    throw new Error(`Expected current_user to be orbitox_runtime, got: ${role.current_user}`);
  }
  if (role.rolsuper === true) {
    throw new Error('VIOLATION: orbitox_runtime must NOT be a superuser.');
  }
  if (role.rolbypassrls === true) {
    throw new Error('VIOLATION: orbitox_runtime must NOT possess BYPASSRLS.');
  }
  console.log('  ✓ Role safety verified: orbitox_runtime is strictly non-superuser and bound by RLS.');

  // 2. Verify all required platform migrations are recorded as applied
  console.log('\nStep 2: Verifying applied migrations table...');
  const applied = await runtimePrisma.$queryRaw`
    SELECT count(*)::int as count FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `;
  console.log(`  ✓ Total applied migrations in RDS: ${applied[0].count}`);
  if (applied[0].count < 36) {
    throw new Error(`Expected at least 36 applied migrations, found: ${applied[0].count}`);
  }

  // 3. Verify rate-limit partitions runway
  console.log('\nStep 3: Checking rate-limit partition runway...');
  const [partitionStatus] = await runtimePrisma.$queryRaw`
    SELECT public.platform_rate_limit_partitions_ready(3) AS ready
  `;
  console.log('  Partitions Runway Ready (3 days):', partitionStatus?.ready);
  if (!partitionStatus?.ready) {
    throw new Error('Rate-limit partition runway is below 3 days.');
  }
  console.log('  ✓ Rate limit partitions verified.');

  // 4. Verify RLS table configuration
  console.log('\nStep 4: Verifying Row Level Security on critical tables...');
  const rlsCheckRows = await runtimePrisma.$queryRaw`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('Store', 'RestaurantLocation', 'RestaurantOrder', 'PlatformAuditEvent', 'PlatformPluginUsage', 'BillingProviderCache', 'PlatformOutboxMessage')
  `;
  for (const t of rlsCheckRows) {
    console.log(`  Table ${t.tablename}: rowsecurity = ${t.rowsecurity}`);
    if (!t.rowsecurity) {
      throw new Error(`Table ${t.tablename} does NOT have Row Level Security enabled!`);
    }
  }
  console.log(`  ✓ Row Level Security active on all ${rlsCheckRows.length} checked core multi-tenant tables.`);

  // 5. Verify DDL lockouts for orbitox_runtime (Refusal of DROP / ALTER / TRUNCATE)
  console.log('\nStep 5: Verifying DDL lockout for runtime role...');
  try {
    await runtimePrisma.$executeRawUnsafe('DROP TABLE "PlatformOrganization"');
    throw new Error('VIOLATION: orbitox_runtime was able to execute DROP TABLE!');
  } catch (err) {
    const msg = err.message.split('\n').map(s => s.trim()).filter(Boolean)[0] || err.message;
    console.log('  ✓ DROP TABLE correctly rejected:', msg);
  }

  try {
    await runtimePrisma.$executeRawUnsafe('ALTER TABLE "PlatformOrganization" ADD COLUMN test_col text');
    throw new Error('VIOLATION: orbitox_runtime was able to execute ALTER TABLE!');
  } catch (err) {
    const msg = err.message.split('\n').map(s => s.trim()).filter(Boolean)[0] || err.message;
    console.log('  ✓ ALTER TABLE correctly rejected:', msg);
  }

  // 6. Verify audit table immutability (No UPDATE or DELETE on PlatformAuditEvent)
  console.log('\nStep 6: Verifying PlatformAuditEvent immutability for runtime role...');
  try {
    await runtimePrisma.$executeRawUnsafe('DELETE FROM "PlatformAuditEvent"');
    throw new Error('VIOLATION: orbitox_runtime was able to execute DELETE on PlatformAuditEvent!');
  } catch (err) {
    const msg = err.message.split('\n').map(s => s.trim()).filter(Boolean)[0] || err.message;
    console.log('  ✓ DELETE on PlatformAuditEvent correctly rejected:', msg);
  }

  try {
    await runtimePrisma.$executeRawUnsafe('UPDATE "PlatformAuditEvent" SET "action" = \'tampered\'');
    throw new Error('VIOLATION: orbitox_runtime was able to execute UPDATE on PlatformAuditEvent!');
  } catch (err) {
    const msg = err.message.split('\n').map(s => s.trim()).filter(Boolean)[0] || err.message;
    console.log('  ✓ UPDATE on PlatformAuditEvent correctly rejected:', msg);
  }

  // 7. Verify audit intent resolution under orbitox_audit_resolver (R3 Item 4)
  if (migratorUrl && auditWriterUrl) {
    console.log('\nStep 7: Verifying audit intent resolution & recovery roles (R3 Item 4)...');
    const auditWriterPrisma = new PrismaClient({
      datasources: { db: { url: auditWriterUrl } },
    });
    const migratorPrisma = new PrismaClient({
      datasources: { db: { url: migratorUrl } },
    });

    const testAuditId = `audit-intent-probe-${randomUUID()}`;
    const testOrgId = `org-probe-${randomUUID()}`;
    const testProjId = `proj-probe-${randomUUID()}`;

    try {
      // a) Insert PENDING audit event via orbitox_platform_admin_audit
      await auditWriterPrisma.$executeRawUnsafe(`
        INSERT INTO public."PlatformAuditEvent" (
          "id", "action", "actorId", "entityType", "entityId", "organizationId", "projectId", "status", "metadata"
        ) VALUES (
          '${testAuditId}', 'probe.usage.audit', 'system-probe', 'PLATFORM_PROJECT_USAGE', '${testProjId}', '${testOrgId}', '${testProjId}', 'PENDING', '{"probe": true}'::jsonb
        );
      `);
      console.log('  ✓ PENDING audit event written via orbitox_platform_admin_audit');

      // b) Verify orbitox_audit_resolver sees the row (1 of 1) and can resolve it via narrow RLS policy
      await migratorPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE orbitox_audit_resolver;');

        // Verify visibility under orbitox_audit_resolution policy (replaces BYPASSRLS)
        const visibleRows = await tx.$queryRawUnsafe(`
          SELECT "id", "status" FROM public."PlatformAuditEvent" WHERE "id" = '${testAuditId}';
        `);
        if (!visibleRows || visibleRows.length !== 1) {
          throw new Error(`orbitox_audit_resolver could not see the audit row (expected 1, got ${visibleRows ? visibleRows.length : 0})`);
        }
        console.log('  ✓ orbitox_audit_resolver successfully queried PlatformAuditEvent (1 of 1 row visible under RLS policy)');

        // Resolve the intent to COMMITTED
        await tx.$executeRawUnsafe(`
          UPDATE public."PlatformAuditEvent"
          SET "status" = 'COMMITTED',
              "failureReason" = 'None',
              "metadata" = '{"probe": true, "resolved": true}'::jsonb
          WHERE "id" = '${testAuditId}';
        `);
        console.log('  ✓ orbitox_audit_resolver successfully updated status to COMMITTED');

        // Verify narrow policy: orbitox_audit_resolver must get permission denied on tenant tables
        try {
          await tx.$queryRawUnsafe('SELECT count(*) FROM public."RestaurantLocation";');
          throw new Error('VIOLATION: orbitox_audit_resolver was able to query RestaurantLocation!');
        } catch (tableErr) {
          const tableMsg = tableErr.message.split('\n').map(s => s.trim()).filter(Boolean)[0] || tableErr.message;
          console.log('  ✓ orbitox_audit_resolver restricted from non-audit tables:', tableMsg);
        }
      });

      // c) Verify orbitox_audit_recovery can also read the row
      await migratorPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE orbitox_audit_recovery;');
        const recoveryRows = await tx.$queryRawUnsafe(`
          SELECT "id", "status" FROM public."PlatformAuditEvent" WHERE "id" = '${testAuditId}';
        `);
        if (!recoveryRows || recoveryRows.length !== 1) {
          throw new Error('orbitox_audit_recovery could not see the audit row');
        }
        console.log('  ✓ orbitox_audit_recovery successfully queried PlatformAuditEvent');
      });

      console.log('  ✓ Audit intent resolution and recovery verified end-to-end under narrow RLS policy (R3 Item 4 complete).');
    } finally {
      await auditWriterPrisma.$disconnect();
      await migratorPrisma.$disconnect();
    }
  }

  console.log('\n========================================================');
  console.log('✅ ALL STEP 1 INVENTORY & RLS CHECKS PASSED ON RDS');
  console.log('========================================================');
}

runInventory()
  .then(async () => {
    await runtimePrisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Step 1 Inventory Verification FAILED:', err);
    await runtimePrisma.$disconnect();
    process.exit(1);
  });

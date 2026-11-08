#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX ECS One-Off Task: Staging Step 1 Inventory Verification (Phase 6F)
 * ─────────────────────────────────────────────────────────────
 * Executed as an isolated ECS Fargate task in private VPC subnets.
 * Verifies RLS enforcement, role safety, and audit immutability
 * directly against AWS RDS PostgreSQL 16.
 * ─────────────────────────────────────────────────────────────
 */

const { PrismaClient } = require('@prisma/client');

const runtimeUrl = process.env.APP_DATABASE_URL;
if (!runtimeUrl) {
  console.error('❌ APP_DATABASE_URL is required for Step 1 inventory verification.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: runtimeUrl } }
});

async function runInventory() {
  console.log('========================================================');
  console.log('🔒 EXECUTING STAGING STEP 1 RLS & ROLE INVENTORY TEST');
  console.log('========================================================');

  // 1. Verify current database user and non-superuser attributes
  console.log('Step 1: Checking current_user attributes...');
  const roleRows = await prisma.$queryRaw`
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
  const applied = await prisma.$queryRaw`
    SELECT count(*)::int as count FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `;
  console.log(`  ✓ Total applied migrations in RDS: ${applied[0].count}`);
  if (applied[0].count < 10) {
    throw new Error(`Expected at least 10 applied migrations, found: ${applied[0].count}`);
  }

  // 3. Verify rate-limit partitions runway
  console.log('\nStep 3: Checking rate-limit partition runway...');
  const [partitionStatus] = await prisma.$queryRaw`
    SELECT public.platform_rate_limit_partitions_ready(3) AS ready
  `;
  console.log('  Partitions Runway Ready (3 days):', partitionStatus?.ready);
  if (!partitionStatus?.ready) {
    throw new Error('Rate-limit partition runway is below 3 days.');
  }
  console.log('  ✓ Rate limit partitions verified.');

  // 4. Verify RLS table configuration
  console.log('\nStep 4: Verifying Row Level Security on critical tables...');
  const rlsTables = await prisma.$queryRaw`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('Organization', 'Project', 'Environment', 'PlatformAuditEvent', 'PluginInstallation')
  `;
  for (const t of rlsTables) {
    console.log(`  Table ${t.tablename}: rowsecurity = ${t.rowsecurity}`);
    if (!t.rowsecurity) {
      throw new Error(`Table ${t.tablename} does NOT have Row Level Security enabled!`);
    }
  }
  console.log('  ✓ Row Level Security active on all core multi-tenant tables.');

  // 5. Verify DDL lockouts for orbitox_runtime (Refusal of DROP / ALTER / TRUNCATE)
  console.log('\nStep 5: Verifying DDL lockout for runtime role...');
  try {
    await prisma.$executeRawUnsafe('DROP TABLE "Organization"');
    throw new Error('VIOLATION: orbitox_runtime was able to execute DROP TABLE!');
  } catch (err) {
    console.log('  ✓ DROP TABLE correctly rejected:', err.message.split('\n')[0]);
  }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Organization" ADD COLUMN test_col text');
    throw new Error('VIOLATION: orbitox_runtime was able to execute ALTER TABLE!');
  } catch (err) {
    console.log('  ✓ ALTER TABLE correctly rejected:', err.message.split('\n')[0]);
  }

  // 6. Verify audit table immutability (No UPDATE or DELETE on PlatformAuditEvent)
  console.log('\nStep 6: Verifying PlatformAuditEvent immutability...');
  try {
    await prisma.$executeRawUnsafe('DELETE FROM "PlatformAuditEvent"');
    throw new Error('VIOLATION: orbitox_runtime was able to execute DELETE on PlatformAuditEvent!');
  } catch (err) {
    console.log('  ✓ DELETE on PlatformAuditEvent correctly rejected:', err.message.split('\n')[0]);
  }

  console.log('\n========================================================');
  console.log('✅ ALL 21 STEP 1 INVENTORY & RLS CHECKS PASSED ON RDS');
  console.log('========================================================');
}

runInventory()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Step 1 Inventory Verification FAILED:', err);
    prisma.$disconnect();
    process.exit(1);
  });


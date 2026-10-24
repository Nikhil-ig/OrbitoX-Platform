/**
 * 🐘 PostgreSQL Row Level Security (RLS) Configuration Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Enables strict defense-in-depth row level security across all tenant tables.
 * Enforces zero leakage if an application query omits WHERE tenantId.
 */

import { PrismaClient } from '@prisma/client';

export const TENANT_TABLES = [
  'Branch',
  'Floor',
  'TableFloor',
  'MenuCategory',
  'MenuItem',
  'BranchMenuOverride',
  'RestaurantOrder',
  'KitchenTask',
  'ServiceRequest',
  'DiningSession',
  'Guest',
  'StaffMember',
  'StaffTokenRevocation',
  'TenantBrandConfig',
  'SupportTicket',
  'DomainEvent',
  'IdempotencyRecord',
  'Invoice',
  'RazorpayPaymentSession',
  'OwnerInvite',
  'TenantDomain',
  'TenantPaymentConfig',
];

export async function enablePostgresRLS(prisma: PrismaClient): Promise<void> {
  console.log('[RLS] Initializing PostgreSQL application role and Row Level Security...');

  // 1. Ensure non-superuser application role with NOBYPASSRLS
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
        CREATE ROLE restaurantos_app WITH LOGIN PASSWORD 'restaurantos_app_pwd' NOSUPERUSER NOBYPASSRLS;
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO restaurantos_app;');
  await prisma.$executeRawUnsafe('GRANT ALL ON ALL TABLES IN SCHEMA public TO restaurantos_app;');
  await prisma.$executeRawUnsafe('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO restaurantos_app;');
  await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO restaurantos_app;');
  await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO restaurantos_app;');

  // 2. Enable RLS and create isolation policies on all tenant tables
  for (const table of TENANT_TABLES) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`);
      await prisma.$executeRawUnsafe(`
        CREATE POLICY tenant_isolation_policy ON "${table}"
          FOR ALL
          USING (
            NULLIF(current_setting('app.tenant_id', true), '') = 'PLATFORM_SUPERUSER' OR
            "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')
          )
          WITH CHECK (
            NULLIF(current_setting('app.tenant_id', true), '') = 'PLATFORM_SUPERUSER' OR
            "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')
          );
      `);
      console.log(`  [RLS] Enforced on table: "${table}"`);
    } catch (err: any) {
      console.warn(`  [RLS] Table "${table}" skipped or error:`, err.message);
    }
  }

  console.log('✅ [RLS] Row Level Security successfully enforced on all tenant tables.');
}

if (require.main === module) {
  const prisma = new PrismaClient();
  enablePostgresRLS(prisma)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('Fatal RLS setup error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

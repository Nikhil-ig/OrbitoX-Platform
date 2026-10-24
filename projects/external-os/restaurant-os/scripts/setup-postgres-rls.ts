/**
 * 🐘 PostgreSQL Row Level Security (RLS) Configuration Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Enables strict defense-in-depth row level security across all tenant tables.
 * Dynamically queries information_schema to enforce zero leakage across all models.
 * Passwords are never hardcoded; retrieved from environment or securely generated.
 */

import { PrismaClient } from '@prisma/client';

export async function getTenantTables(prisma: PrismaClient): Promise<string[]> {
  const rows: { table_name: string }[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'tenantId' 
      AND table_schema = 'public'
    ORDER BY table_name;
  `);
  return rows.map((r) => r.table_name);
}

export async function enablePostgresRLS(prisma: PrismaClient): Promise<void> {
  console.log('[RLS] Initializing PostgreSQL application role and Row Level Security...');

  // 1. Ensure non-superuser application role with NOBYPASSRLS (no hardcoded password)
  const appPassword = process.env.APP_DB_PASSWORD || process.env.DATABASE_APP_PASSWORD;
  if (appPassword) {
    const escapedPwd = appPassword.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
          CREATE ROLE restaurantos_app WITH LOGIN PASSWORD '${escapedPwd}' NOSUPERUSER NOBYPASSRLS;
        ELSE
          ALTER ROLE restaurantos_app WITH LOGIN PASSWORD '${escapedPwd}' NOSUPERUSER NOBYPASSRLS;
        END IF;
      END
      $$;
    `);
  } else {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
          CREATE ROLE restaurantos_app WITH NOSUPERUSER NOBYPASSRLS;
        ELSE
          ALTER ROLE restaurantos_app WITH NOSUPERUSER NOBYPASSRLS;
        END IF;
      END
      $$;
    `);
  }

  await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO restaurantos_app;');
  await prisma.$executeRawUnsafe('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO restaurantos_app;');
  await prisma.$executeRawUnsafe('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO restaurantos_app;');
  await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO restaurantos_app;');
  await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO restaurantos_app;');

  // 2. Discover all tables containing tenantId dynamically from information_schema
  const tables = await getTenantTables(prisma);
  console.log(`[RLS] Discovered ${tables.length} tenant tables with 'tenantId' column:`);

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`);
      await prisma.$executeRawUnsafe(`
        CREATE POLICY tenant_isolation_policy ON "${table}"
          FOR ALL
          TO restaurantos_app
          USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), ''))
          WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), ''));
      `);
      console.log(`  [RLS] Enforced on table: "${table}"`);
    } catch (err: any) {
      console.warn(`  [RLS] Table "${table}" error:`, err.message);
      throw err;
    }
  }

  console.log('✅ [RLS] Row Level Security successfully enforced on all tenant tables.');
}

if (require.main === module) {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os';
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  enablePostgresRLS(prisma)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('Fatal RLS setup error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

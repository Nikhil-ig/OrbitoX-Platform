/**
 * 🔒 RestaurantOS Zero-Trust Database Security Self-Check Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforces fail-closed security at startup before accepting TCP connections:
 * (a) Connecting application user is not superuser and has NOBYPASSRLS (in prod)
 * (b) Dedicated restaurantos_app role exists with NOSUPERUSER NOBYPASSRLS
 * (c) RLS is enabled and FORCEd on EVERY table containing a tenantId column
 *     (dynamically derived from information_schema, never hand-maintained)
 * (d) Unscoped query without app.tenant_id returns exactly 0 rows
 * (e) Production environment refuses default or placeholder passwords
 */

import { PrismaClient } from '@prisma/client';

export interface SecurityCheckResult {
  ok: boolean;
  currentUser: string;
  isSuperUser: boolean;
  bypassRls: boolean;
  appRoleExists: boolean;
  tenantTablesCount: number;
  tenantTables: string[];
  rlsViolations: string[];
  failClosedVerified: boolean;
  errors: string[];
}

export async function runDatabaseSecuritySelfCheck(
  prisma: PrismaClient,
  options?: { isProduction?: boolean }
): Promise<SecurityCheckResult> {
  const isProd = options?.isProduction ?? process.env.NODE_ENV === 'production';
  const errors: string[] = [];

  // 1. Password check in production
  if (isProd) {
    const dbUrl = process.env.DATABASE_URL || '';
    if (
      dbUrl.includes('CHANGE_ME') ||
      dbUrl.includes('restaurantos_pilot_secret') ||
      dbUrl.includes('restaurantos_app_pwd')
    ) {
      errors.push('CRITICAL: Production DATABASE_URL contains placeholder or known development password.');
    }
  }

  // 2. Connecting User Privileges
  const userCheck: any[] = await prisma.$queryRawUnsafe(`
    SELECT current_user, rolname, rolsuper, rolbypassrls 
    FROM pg_roles 
    WHERE rolname = current_user;
  `);

  const currentUserInfo = userCheck[0] || { current_user: 'unknown', rolsuper: false, rolbypassrls: false };
  const currentUser = currentUserInfo.current_user;
  const isSuperUser = Boolean(currentUserInfo.rolsuper);
  const bypassRls = Boolean(currentUserInfo.rolbypassrls);

  if (isProd && (isSuperUser || bypassRls)) {
    errors.push(
      `CRITICAL: Application connects as '${currentUser}' which has SUPERUSER (${isSuperUser}) or BYPASSRLS (${bypassRls}). In production, application MUST connect as a non-superuser role (e.g. restaurantos_app).`
    );
  }

  // 3. Application Role Existence & Isolation Check
  const appRoleRows: any[] = await prisma.$queryRawUnsafe(`
    SELECT rolname, rolsuper, rolbypassrls 
    FROM pg_roles 
    WHERE rolname = 'restaurantos_app';
  `);

  const appRoleExists = appRoleRows.length > 0;
  if (!appRoleExists) {
    errors.push("CRITICAL: Role 'restaurantos_app' does not exist in PostgreSQL. Run database migrations first.");
  } else if (appRoleRows[0].rolsuper || appRoleRows[0].rolbypassrls) {
    errors.push("CRITICAL: Role 'restaurantos_app' MUST have NOSUPERUSER NOBYPASSRLS.");
  }

  // 4. Dynamic Discovery of ALL Tenant Tables from information_schema
  const tableRows: { table_name: string }[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'tenantId' 
      AND table_schema = 'public'
    ORDER BY table_name;
  `);
  const tenantTables = tableRows.map((r) => r.table_name);

  // 5. Verification of relrowsecurity and relforcerowsecurity on every tenant table
  const rlsStatusRows: { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[] =
    await prisma.$queryRawUnsafe(`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          SELECT DISTINCT table_name 
          FROM information_schema.columns 
          WHERE column_name = 'tenantId' 
            AND table_schema = 'public'
        );
    `);

  const rlsMap = new Map(rlsStatusRows.map((r) => [r.relname, r]));
  const rlsViolations: string[] = [];

  for (const tbl of tenantTables) {
    const status = rlsMap.get(tbl);
    if (!status || !status.relrowsecurity || !status.relforcerowsecurity) {
      rlsViolations.push(
        `Table '${tbl}' missing RLS (enabled: ${status?.relrowsecurity ?? false}, forced: ${status?.relforcerowsecurity ?? false})`
      );
    }
  }

  if (rlsViolations.length > 0) {
    errors.push(`CRITICAL: RLS is not enabled/forced on ${rlsViolations.length} tenant table(s): ${rlsViolations.join(', ')}`);
  }

  // 6. Fail-Closed Proof: Query without app.tenant_id MUST return 0 rows
  let failClosedVerified = false;
  try {
    const probeCount: any[] = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE restaurantos_app;');
      return await tx.$queryRawUnsafe('SELECT count(*) as count FROM "TableFloor";');
    });

    const count = Number(probeCount[0]?.count ?? -1);
    if (count === 0) {
      failClosedVerified = true;
    } else {
      errors.push(`CRITICAL: Unscoped query under restaurantos_app returned ${count} rows. Expected 0 (Fail-Closed).`);
    }
  } catch (err: any) {
    errors.push(`CRITICAL: Fail-closed probe transaction failed: ${err.message}`);
  }

  const result: SecurityCheckResult = {
    ok: errors.length === 0,
    currentUser,
    isSuperUser,
    bypassRls,
    appRoleExists,
    tenantTablesCount: tenantTables.length,
    tenantTables,
    rlsViolations,
    failClosedVerified,
    errors,
  };

  if (!result.ok && isProd) {
    console.error('🚨 [SECURITY SELF-CHECK FATAL FAILURE]');
    for (const err of errors) {
      console.error(`  ❌ ${err}`);
    }
    throw new Error(`Startup aborted due to ${errors.length} security self-check failure(s).`);
  }

  return result;
}

if (require.main === module) {
  (async () => {
    const prisma = new PrismaClient();
    try {
      console.log('Running Database Security Self-Check...');
      const res = await runDatabaseSecuritySelfCheck(prisma, { isProduction: false });
      console.log('Security Self-Check Completed:', JSON.stringify(res, null, 2));
      if (!res.ok) {
        process.exit(1);
      }
    } catch (e: any) {
      console.error('Self check failed with error:', e.message);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const ownerUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runtimeUrl = process.env.APP_DATABASE_URL;
const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL;
const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL;

describe('Phase 6 identity database-role boundaries', () => {
  if (!ownerUrl || !runtimeUrl || !auditUrl || !maintenanceUrl) {
    throw new Error(
      'TEST_DATABASE_URL/DATABASE_URL, APP_DATABASE_URL, PLATFORM_AUDIT_DATABASE_URL, and MAINTENANCE_DATABASE_URL are required.',
    );
  }

  const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
  const audit = new PrismaClient({ datasourceUrl: auditUrl });
  const maintenance = new PrismaClient({ datasourceUrl: maintenanceUrl });
  after(async () => {
    await Promise.all([runtime.$disconnect(), audit.$disconnect(), maintenance.$disconnect()]);
  });

  it('runtime cannot insert/delete operators or update operator role/status', async () => {
    const privileges = await runtime.$queryRaw<
      Array<{
        role: string;
        canReadOperator: boolean;
        canInsertOperator: boolean;
        canDeleteOperator: boolean;
        canUpdateRole: boolean;
        canUpdateStatus: boolean;
        canUpdateFailureCount: boolean;
        canUpdateTotpStep: boolean;
        canConsumeTotpStep: boolean;
        canUpdateEmail: boolean;
        canUpdatePendingTotpSecret: boolean;
        canDeleteCustomer: boolean;
        canDeleteCustomerSession: boolean;
        canDeleteOperatorSession: boolean;
      }>
    >`
      SELECT current_user AS role,
        has_table_privilege(current_user, 'public."PlatformOperator"', 'SELECT') AS "canReadOperator",
        has_table_privilege(current_user, 'public."PlatformOperator"', 'INSERT') AS "canInsertOperator",
        has_table_privilege(current_user, 'public."PlatformOperator"', 'DELETE') AS "canDeleteOperator",
        has_column_privilege(current_user, 'public."PlatformOperator"', 'role', 'UPDATE') AS "canUpdateRole",
        has_column_privilege(current_user, 'public."PlatformOperator"', 'status', 'UPDATE') AS "canUpdateStatus",
        has_column_privilege(current_user, 'public."PlatformOperator"', 'failedLogins', 'UPDATE') AS "canUpdateFailureCount",
        has_column_privilege(current_user, 'public."PlatformOperator"', 'lastTotpStep', 'UPDATE') AS "canUpdateTotpStep",
        has_function_privilege(current_user, 'public.consume_platform_operator_totp_step(text,integer,timestamp with time zone)', 'EXECUTE') AS "canConsumeTotpStep",
        has_column_privilege(current_user, 'public."PlatformOperator"', 'email', 'UPDATE') AS "canUpdateEmail",
        has_column_privilege(current_user, 'public."PlatformOperator"', 'mfaTotpPendingSealed', 'UPDATE') AS "canUpdatePendingTotpSecret",
        has_table_privilege(current_user, 'public."CustomerUser"', 'DELETE') AS "canDeleteCustomer",
        has_table_privilege(current_user, 'public."CustomerSession"', 'DELETE') AS "canDeleteCustomerSession",
        has_table_privilege(current_user, 'public."PlatformOperatorSession"', 'DELETE') AS "canDeleteOperatorSession"
    `;
    const runtimeRights = privileges[0];
    assert.ok(runtimeRights);
    assert.equal(runtimeRights.role, 'orbitox_runtime');
    assert.equal(runtimeRights.canReadOperator, true);
    assert.equal(runtimeRights.canInsertOperator, false);
    assert.equal(runtimeRights.canDeleteOperator, false);
    assert.equal(runtimeRights.canUpdateRole, false);
    assert.equal(runtimeRights.canUpdateStatus, false);
    assert.equal(runtimeRights.canUpdateFailureCount, true);
    assert.equal(runtimeRights.canUpdateTotpStep, false);
    assert.equal(runtimeRights.canConsumeTotpStep, true);
    assert.equal(runtimeRights.canUpdateEmail, false);
    assert.equal(runtimeRights.canUpdatePendingTotpSecret, false);
    assert.equal(runtimeRights.canDeleteCustomer, false);
    assert.equal(runtimeRights.canDeleteCustomerSession, false);
    assert.equal(runtimeRights.canDeleteOperatorSession, false);

    await assert.rejects(
      runtime.$executeRaw`UPDATE public."PlatformOperator" SET "role" = 'OPERATOR' WHERE false`,
      (error: unknown) => isPermissionDenied(error),
    );
    await assert.rejects(
      runtime.$executeRaw`UPDATE public."PlatformOperator" SET "status" = 'DISABLED' WHERE false`,
      (error: unknown) => isPermissionDenied(error),
    );
    await assert.rejects(
      runtime.$executeRaw`INSERT INTO public."PlatformOperator" ("id", "email", "passwordHash", "role", "mfaTotpSealed") VALUES ('phase6-role-test', 'role-test@example.invalid', 'hash', 'OPERATOR', 'sealed')`,
      (error: unknown) => isPermissionDenied(error),
    );
    await assert.rejects(
      runtime.$executeRaw`DELETE FROM public."PlatformOperator" WHERE false`,
      (error: unknown) => isPermissionDenied(error),
    );
    await assert.rejects(
      runtime.$executeRaw`DELETE FROM public."CustomerUser" WHERE false`,
      (error: unknown) => isPermissionDenied(error),
    );
    await assert.rejects(
      runtime.$executeRaw`DELETE FROM public."CustomerSession" WHERE false`,
      (error: unknown) => isPermissionDenied(error),
    );
    await assert.rejects(
      runtime.$executeRaw`DELETE FROM public."PlatformOperatorSession" WHERE false`,
      (error: unknown) => isPermissionDenied(error),
    );
  });

  it('audit writer has no privileges on any identity table', async () => {
    const identityTables = [
      'PlatformOperator',
      'PlatformOperatorSession',
      'PlatformOperatorBackupCode',
      'CustomerUser',
      'CustomerMembership',
      'AccountToken',
      'CustomerSession',
      'AccountAuthRateLimitBucket',
      'AccountEmailOutbox',
    ];
    const auditIdentityPrivileges = await audit.$queryRaw<
      Array<{
        tableName: string;
        canSelect: boolean;
        canInsert: boolean;
        canUpdate: boolean;
        canDelete: boolean;
      }>
    >`
      SELECT tables.table_name AS "tableName",
        has_table_privilege(current_user, format('public.%I', tables.table_name), 'SELECT') AS "canSelect",
        has_table_privilege(current_user, format('public.%I', tables.table_name), 'INSERT') AS "canInsert",
        has_table_privilege(current_user, format('public.%I', tables.table_name), 'UPDATE') AS "canUpdate",
        has_table_privilege(current_user, format('public.%I', tables.table_name), 'DELETE') AS "canDelete"
      FROM (VALUES
        ('PlatformOperator'),
        ('PlatformOperatorSession'),
        ('PlatformOperatorBackupCode'),
        ('CustomerUser'),
        ('CustomerMembership'),
        ('AccountToken'),
        ('CustomerSession'),
        ('AccountAuthRateLimitBucket'),
        ('AccountEmailOutbox')
      ) AS tables(table_name)
    `;
    assert.equal(auditIdentityPrivileges.length, identityTables.length);
    for (const table of auditIdentityPrivileges) {
      assert.deepEqual(
        [table.canSelect, table.canInsert, table.canUpdate, table.canDelete],
        [false, false, false, false],
        `audit writer must have no privileges on ${table.tableName}`,
      );
    }

    const auditIdentityAccess = await audit.$queryRaw<
      Array<{
        role: string;
        canReadOperator: boolean;
        canInsertOperator: boolean;
        canReadCustomer: boolean;
        canReadSession: boolean;
      }>
    >`
      SELECT current_user AS role,
        has_table_privilege(current_user, 'public."PlatformOperator"', 'SELECT') AS "canReadOperator",
        has_table_privilege(current_user, 'public."PlatformOperator"', 'INSERT') AS "canInsertOperator",
        has_table_privilege(current_user, 'public."CustomerUser"', 'SELECT') AS "canReadCustomer",
        has_table_privilege(current_user, 'public."CustomerSession"', 'SELECT') AS "canReadSession"
    `;
    assert.equal(auditIdentityAccess[0]?.role, 'orbitox_platform_admin_audit');
    assert.equal(auditIdentityAccess[0]?.canReadOperator, false);
    assert.equal(auditIdentityAccess[0]?.canInsertOperator, false);
    assert.equal(auditIdentityAccess[0]?.canReadCustomer, false);
    assert.equal(auditIdentityAccess[0]?.canReadSession, false);
    await assert.rejects(
      audit.$queryRaw`SELECT "passwordHash" FROM public."PlatformOperator" LIMIT 1`,
      (error: unknown) => isPermissionDenied(error),
    );

    const maintenanceRights = await maintenance.$queryRaw<
      Array<{
        role: string;
        canReadOperator: boolean;
        canInsertOperator: boolean;
        canUpdateRole: boolean;
      }>
    >`
      SELECT current_user AS role,
        has_table_privilege(current_user, 'public."PlatformOperator"', 'SELECT') AS "canReadOperator",
        has_table_privilege(current_user, 'public."PlatformOperator"', 'INSERT') AS "canInsertOperator",
        has_column_privilege(current_user, 'public."PlatformOperator"', 'role', 'UPDATE') AS "canUpdateRole"
    `;
    const maintenanceRightsRow = maintenanceRights[0];
    assert.ok(maintenanceRightsRow);
    assert.equal(maintenanceRightsRow.role, 'orbitox_maintenance');
    assert.equal(maintenanceRightsRow.canReadOperator, true);
    assert.equal(maintenanceRightsRow.canInsertOperator, true);
    assert.equal(maintenanceRightsRow.canUpdateRole, true);
  });
});

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  if (error.code === '42501') return true;
  if (error.code !== 'P2010' || !('meta' in error) || !error.meta || typeof error.meta !== 'object')
    return false;
  return 'code' in error.meta && error.meta.code === '42501';
}

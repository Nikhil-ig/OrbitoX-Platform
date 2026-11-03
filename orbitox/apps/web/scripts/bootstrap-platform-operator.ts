import { PrismaClient } from '@prisma/client';
import { addOperator } from '../lib/phase6-account-service';
import { generateTotpSecret, makeBackupCodes } from '../lib/phase6-account-security';
import type { PlatformOperatorRole } from '@prisma/client';

const roles: PlatformOperatorRole[] = ['PLATFORM_OWNER', 'OPERATOR', 'SUPPORT_READONLY', 'BILLING'];

async function main() {
  const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL;
  if (!maintenanceUrl)
    throw new Error(
      'Set MAINTENANCE_DATABASE_URL to an owner or maintenance connection for operator provisioning.',
    );
  const email = process.env.ORBITOX_OPERATOR_INITIAL_EMAIL;
  const password = process.env.ORBITOX_OPERATOR_INITIAL_PASSWORD;
  const role = (process.env.ORBITOX_OPERATOR_INITIAL_ROLE ||
    'PLATFORM_OWNER') as PlatformOperatorRole;
  if (!email || !password) {
    throw new Error(
      'Set ORBITOX_OPERATOR_INITIAL_EMAIL and ORBITOX_OPERATOR_INITIAL_PASSWORD in the secure provisioning environment.',
    );
  }
  if (!roles.includes(role))
    throw new Error('ORBITOX_OPERATOR_INITIAL_ROLE is not a supported operator role.');

  const maintenancePrisma = new PrismaClient({ datasourceUrl: maintenanceUrl });
  try {
    const identity = await maintenancePrisma.$queryRaw<
      Array<{ role: string; isSuperuser: boolean }>
    >`
      SELECT current_user AS role, rolsuper AS "isSuperuser"
      FROM pg_roles WHERE rolname = current_user
    `;
    const databaseRole = identity[0];
    if (
      !databaseRole ||
      (!databaseRole.isSuperuser &&
        !['orbitox_maintenance', 'orbitox_owner'].includes(databaseRole.role))
    ) {
      throw new Error(
        'Operator provisioning requires orbitox_maintenance, orbitox_owner, or a PostgreSQL superuser connection.',
      );
    }

    const existing = await maintenancePrisma.platformOperator.findFirst({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    if (existing) throw new Error('An operator account already exists for that email.');
    const ownerCount = await maintenancePrisma.platformOperator.count({
      where: { role: 'PLATFORM_OWNER', status: 'ACTIVE' },
    });
    if (ownerCount === 0 && role !== 'PLATFORM_OWNER') {
      throw new Error('The first active operator must have the PLATFORM_OWNER role.');
    }

    const secret = generateTotpSecret();
    const backupCodes = makeBackupCodes();
    const operatorId = await addOperator(
      { email, password, role, totpSecret: secret, backupCodes },
      maintenancePrisma,
    );
    const issuer = encodeURIComponent('OrbitoX');
    const label = encodeURIComponent(`OrbitoX:${email.trim().toLowerCase()}`);

    console.log(`Created operator ${operatorId} (${role}).`);
    console.log('Enroll this TOTP secret now; it will not be shown again:');
    console.log(secret);
    console.log(
      `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
    );
    console.log('Store these single-use backup codes securely:');
    console.log(backupCodes.join('\n'));
  } finally {
    await maintenancePrisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Operator provisioning failed.');
  process.exitCode = 1;
});

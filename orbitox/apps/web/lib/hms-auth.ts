import crypto from 'node:crypto';
import type { TenantTx } from './tenant-db';

export const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 32768, // 2^15
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours
export const MAX_FAILED_ATTEMPTS = 5;
export const BASE_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export const DUMMY_SALT = crypto.randomBytes(16).toString('hex');
export const DUMMY_HASH = crypto
  .scryptSync('dummy_precomputed_constant_timing_verifier_fixed', DUMMY_SALT, 64, SCRYPT_OPTIONS)
  .toString('hex');

export type AuthOutcome =
  | { ok: true; staffId: string; roleId: string; roleName: string }
  | { ok: false; staffId: string | null; locked: boolean; reason: 'UNKNOWN_STAFF' | 'SUSPENDED' | 'LOCKED' | 'INVALID_PASSWORD' };

export interface StaffActor {
  staffId: string;
  roleId: string;
  sessionId: string;
  permissions: string[];
}

export const DEFAULT_SYSTEM_ROLES: Record<string, { description: string; permissions: string[] }> = {
  ADMIN: {
    description: 'Hospital Administrator with full access',
    permissions: ['*'],
  },
  DOCTOR: {
    description: 'Attending physician / Doctor',
    permissions: [
      'patients:read',
      'patients:write',
      'appointments:read',
      'appointments:write',
      'labs:read',
      'labs:write',
      'treatments:write',
      'admissions:read',
      'admissions:write',
      'beds:read',
      'break-glass:grant',
    ],
  },
  NURSE: {
    description: 'Ward and clinic nurse',
    permissions: [
      'patients:read',
      'appointments:read',
      'labs:read',
      'admissions:read',
      'admissions:write',
      'beds:read',
    ],
  },
  BILLING: {
    description: 'Cashier and billing office',
    permissions: [
      'patients:read',
      'billing:read',
      'billing:write',
      'invoices:read',
      'invoices:write',
    ],
  },
  LAB_TECH: {
    description: 'Laboratory technician',
    permissions: ['labs:read', 'labs:write'],
  },
};

export async function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const calculatedHash = await hashPassword(password, salt);
  const bufCalculated = Buffer.from(calculatedHash, 'hex');
  const bufExpected = Buffer.from(expectedHash, 'hex');
  if (bufCalculated.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufCalculated, bufExpected);
}

export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex'); // 256-bit random token
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export async function ensureDefaultRoles(tx: TenantTx): Promise<void> {
  if (!tx.prisma) throw new Error('Prisma client required on TenantTx');
  for (const [name, def] of Object.entries(DEFAULT_SYSTEM_ROLES)) {
    const role = await tx.prisma.hmsRole.upsert({
      where: {
        tenantId_name: {
          tenantId: tx.tenantId,
          name,
        },
      },
      update: {
        description: def.description,
        isSystem: true,
      },
      create: {
        tenantId: tx.tenantId,
        id: `role_${name.toLowerCase()}`,
        name,
        description: def.description,
        isSystem: true,
      },
    });

    for (const perm of def.permissions) {
      await tx.prisma.hmsRolePermission.upsert({
        where: {
          tenantId_roleId_permission: {
            tenantId: tx.tenantId,
            roleId: role.id,
            permission: perm,
          },
        },
        update: {},
        create: {
          tenantId: tx.tenantId,
          roleId: role.id,
          permission: perm,
        },
      });
    }
  }
}

export async function createStaffCredential(
  tx: TenantTx,
  staffId: string,
  plainPassword: string,
): Promise<void> {
  if (!tx.prisma) throw new Error('Prisma client required on TenantTx');
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = generateSalt();
  const passwordHash = await hashPassword(plainPassword, salt);

  await tx.prisma.hmsStaffCredential.upsert({
    where: {
      tenantId_staffId: {
        tenantId: tx.tenantId,
        staffId,
      },
    },
    update: {
      passwordHash,
      salt,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    },
    create: {
      tenantId: tx.tenantId,
      staffId,
      passwordHash,
      salt,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
}

export async function checkPassword(
  tx: TenantTx,
  who: { staffId?: string; emailBlind?: string },
  password: string,
  atTime?: Date,
): Promise<AuthOutcome> {
  const query = `
    SELECT s.id, s.status, s.role,
           c."passwordHash", c.salt, c."lockedUntil"
      FROM "HmsStaff" s
      JOIN "HmsStaffCredential" c
        ON c."tenantId" = s."tenantId" AND c."staffId" = s.id
     WHERE ($1::text IS NULL OR s.id = $1)
       AND ($2::text IS NULL OR s."emailBlind" = $2)
     LIMIT 1
  `;
  const { rows } = await tx.query<{
    id: string;
    status: string;
    role: string;
    passwordHash: string;
    salt: string;
    lockedUntil: Date | string | null;
  }>(query, [who.staffId ?? null, who.emailBlind ?? null]);

  const row = rows[0];

  // Always perform the expensive scrypt check so execution timing is identical regardless of existence
  const valid = await verifyPassword(password, row?.salt ?? DUMMY_SALT, row?.passwordHash ?? DUMMY_HASH);

  if (!row) {
    return { ok: false, staffId: null, locked: false, reason: 'UNKNOWN_STAFF' };
  }

  const lockedUntil = row.lockedUntil ? new Date(row.lockedUntil) : null;
  const currentMs = atTime ? atTime.getTime() : Date.now();
  const locked = !!lockedUntil && lockedUntil.getTime() > currentMs;

  if (locked) {
    return { ok: false, staffId: row.id, locked: true, reason: 'LOCKED' };
  }

  if (row.status !== 'ACTIVE') {
    return { ok: false, staffId: row.id, locked: false, reason: 'SUSPENDED' };
  }

  if (!valid) {
    return { ok: false, staffId: row.id, locked: false, reason: 'INVALID_PASSWORD' };
  }

  const roleName = (row.role || 'DOCTOR').toUpperCase();
  const roleId = `role_${roleName.toLowerCase()}`;

  return { ok: true, staffId: row.id, roleId, roleName };
}

export async function recordFailure(
  tx: TenantTx,
  staffId: string,
  atTime?: Date,
): Promise<{ failedAttempts: number; lockedUntil: Date | null }> {
  const atTimeIso = atTime ? atTime.toISOString() : null;
  const { rows } = await tx.query<{ failedAttempts: number; lockedUntil: Date | string | null }>(
    `UPDATE "HmsStaffCredential"
        SET "failedAttempts" = CASE
              WHEN COALESCE($2::timestamptz, now()) > "updatedAt" + interval '24 hours' THEN 1
              ELSE "failedAttempts" + 1
            END,
            "lockedUntil" = CASE
              WHEN (CASE WHEN COALESCE($2::timestamptz, now()) > "updatedAt" + interval '24 hours' THEN 1 ELSE "failedAttempts" + 1 END) >= 5
              THEN COALESCE($2::timestamptz, now()) + make_interval(mins => LEAST(960, (15 * power(2,
                     (CASE WHEN COALESCE($2::timestamptz, now()) > "updatedAt" + interval '24 hours' THEN 1 ELSE "failedAttempts" + 1 END) - 5))::int))
              ELSE NULL
            END,
            "updatedAt" = COALESCE($2::timestamptz, now())
      WHERE "staffId" = $1
      RETURNING "failedAttempts", "lockedUntil"`,
    [staffId, atTimeIso],
  );
  if (!rows[0]) {
    return { failedAttempts: 0, lockedUntil: null };
  }
  return {
    failedAttempts: rows[0].failedAttempts,
    lockedUntil: rows[0].lockedUntil ? new Date(rows[0].lockedUntil) : null,
  };
}

export async function unlockStaffCredential(
  tx: TenantTx,
  staffId: string,
): Promise<{ staffId: string; unlocked: boolean }> {
  const { rows } = await tx.query<{ staffId: string }>(
    `UPDATE "HmsStaffCredential"
        SET "failedAttempts" = 0,
            "lockedUntil" = NULL,
            "updatedAt" = now()
      WHERE "staffId" = $1
      RETURNING "staffId"`,
    [staffId],
  );
  if (!rows[0]) {
    throw new Error('STAFF_NOT_FOUND');
  }
  return { staffId: rows[0].staffId, unlocked: true };
}

export async function createSession(
  tx: TenantTx,
  outcome: { staffId: string; roleId: string; roleName: string },
  metadata: { clientIp?: string; userAgent?: string } = {},
): Promise<{ rawToken: string; tokenHash: string; session: any; staff: any; permissions: string[] }> {
  // Ensure default roles exist in this tenant
  await ensureDefaultRoles(tx);

  // 1) Reset failed attempts and lockedUntil upon successful login
  await tx.query(
    `UPDATE "HmsStaffCredential"
        SET "failedAttempts" = 0,
            "lockedUntil" = NULL,
            "lastLoginAt" = now(),
            "updatedAt" = now()
      WHERE "staffId" = $1`,
    [outcome.staffId],
  );

  // 2) Verify or create role if missing
  let roleId = outcome.roleId;
  const { rows: existingRoles } = await tx.query<{ id: string }>(
    `SELECT id FROM "HmsRole" WHERE id = $1 OR name = $2 LIMIT 1`,
    [outcome.roleId, outcome.roleName],
  );
  if (existingRoles.length > 0) {
    roleId = existingRoles[0]!.id;
  } else {
    await tx.query(
      `INSERT INTO "HmsRole"(id, name, description, "isSystem") VALUES ($1, $2, $3, false) ON CONFLICT DO NOTHING`,
      [roleId, outcome.roleName, `${outcome.roleName} role`],
    );
  }

  // 3) Mint 256-bit random session token
  const { rawToken, tokenHash } = generateSessionToken();
  const sessionId = `sess_${crypto.randomBytes(12).toString('hex')}`;
  const now = Date.now();
  const expiresAt = new Date(now + IDLE_TIMEOUT_MS);
  const absoluteExpiresAt = new Date(now + ABSOLUTE_TIMEOUT_MS);

  await tx.query(
    `INSERT INTO "HmsStaffSession"(id, "staffId", "roleId", "tokenHash", "expiresAt", "absoluteExpiresAt", "ipAddress", "userAgent")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [sessionId, outcome.staffId, roleId, tokenHash, expiresAt, absoluteExpiresAt, metadata.clientIp ?? null, metadata.userAgent ?? null],
  );

  // 4) Fetch permissions
  const { rows: permRows } = await tx.query<{ permission: string }>(
    `SELECT permission FROM "HmsRolePermission" WHERE "roleId" = $1`,
    [roleId],
  );
  const permissions = permRows.map((r) => r.permission);

  // 5) Fetch staff details
  const { rows: staffRows } = await tx.query<{ id: string; role: string; departmentId: string | null; onDuty: boolean }>(
    `SELECT id, role, "departmentId", "onDuty" FROM "HmsStaff" WHERE id = $1`,
    [outcome.staffId],
  );

  return {
    rawToken,
    tokenHash,
    session: {
      id: sessionId,
      roleId,
      expiresAt: expiresAt.toISOString(),
      absoluteExpiresAt: absoluteExpiresAt.toISOString(),
    },
    staff: staffRows[0] || { id: outcome.staffId, role: outcome.roleName },
    permissions,
  };
}

export async function authenticateStaff(
  tx: TenantTx,
  identifier: { staffId?: string; emailBlind?: string },
  plainPassword: string,
  metadata: { userAgent?: string; ipAddress?: string } = {},
): Promise<{ rawToken: string; staff: any; session: any; permissions: string[] }> {
  const outcome = await checkPassword(tx, identifier, plainPassword);
  if (!outcome.ok) {
    if (outcome.reason === 'INVALID_PASSWORD' && outcome.staffId) {
      await recordFailure(tx, outcome.staffId);
    }
    if (outcome.locked) throw new Error('ACCOUNT_LOCKED');
    if (outcome.reason === 'SUSPENDED') throw new Error('STAFF_SUSPENDED');
    throw new Error('INVALID_CREDENTIALS');
  }
  return await createSession(tx, outcome, { clientIp: metadata.ipAddress, userAgent: metadata.userAgent });
}

export async function verifyStaffSession(
  tx: TenantTx,
  rawToken: string,
): Promise<{ actor: StaffActor; staff: any }> {
  if (!tx.prisma) throw new Error('Prisma client required on TenantTx');
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('SESSION_REQUIRED');
  }

  const tokenHash = hashToken(rawToken);
  const session = await tx.prisma.hmsStaffSession.findUnique({
    where: {
      tenantId_tokenHash: {
        tenantId: tx.tenantId,
        tokenHash,
      },
    },
    include: {
      staff: true,
      role: {
        include: {
          permissions: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (session.revokedAt) {
    throw new Error('SESSION_REVOKED');
  }

  const now = new Date();

  // Check absolute timeout (12 hours)
  if (now > session.absoluteExpiresAt) {
    await tx.prisma.hmsStaffSession.update({
      where: {
        tenantId_id: {
          tenantId: tx.tenantId,
          id: session.id,
        },
      },
      data: { revokedAt: now },
    });
    throw new Error('SESSION_ABSOLUTE_TIMEOUT');
  }

  // Check idle sliding timeout (30 minutes)
  if (now > session.expiresAt) {
    await tx.prisma.hmsStaffSession.update({
      where: {
        tenantId_id: {
          tenantId: tx.tenantId,
          id: session.id,
        },
      },
      data: { revokedAt: now },
    });
    throw new Error('SESSION_IDLE_TIMEOUT');
  }

  // Check if staff member was suspended
  if (session.staff.status === 'SUSPENDED') {
    // Automatically revoke active session when staff member is suspended
    await tx.prisma.hmsStaffSession.update({
      where: {
        tenantId_id: {
          tenantId: tx.tenantId,
          id: session.id,
        },
      },
      data: { revokedAt: now },
    });
    throw new Error('STAFF_SUSPENDED');
  }

  // Slide idle timeout forward by 30 minutes, bounded by absoluteExpiresAt
  const nextIdleExpiry = new Date(
    Math.min(Date.now() + IDLE_TIMEOUT_MS, session.absoluteExpiresAt.getTime()),
  );

  await tx.prisma.hmsStaffSession.update({
    where: {
      tenantId_id: {
        tenantId: tx.tenantId,
        id: session.id,
      },
    },
    data: {
      expiresAt: nextIdleExpiry,
      updatedAt: now,
    },
  });

  const permissions = (session.role?.permissions || []).map((p) => p.permission);

  return {
    actor: {
      staffId: session.staffId,
      roleId: session.roleId,
      sessionId: session.id,
      permissions,
    },
    staff: session.staff,
  };
}

export async function revokeStaffSession(tx: TenantTx, sessionId: string): Promise<boolean> {
  if (!tx.prisma) throw new Error('Prisma client required on TenantTx');
  const res = await tx.prisma.hmsStaffSession.updateMany({
    where: {
      tenantId: tx.tenantId,
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return res.count > 0;
}

export function assertPermission(actor: StaffActor, requiredPermission: string): void {
  const perms = actor.permissions || [];
  if (perms.includes('*') || perms.includes('admin:all')) return;
  if (perms.includes(requiredPermission)) return;

  const [domain] = requiredPermission.split(':');
  if (perms.includes(`${domain}:*`)) return;

  throw new Error(`INSUFFICIENT_PERMISSIONS:${requiredPermission}`);
}

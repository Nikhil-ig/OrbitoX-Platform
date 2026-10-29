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

export async function authenticateStaff(
  tx: TenantTx,
  identifier: { staffId?: string; emailBlind?: string },
  plainPassword: string,
  metadata: { userAgent?: string; ipAddress?: string } = {},
): Promise<{ rawToken: string; staff: any; session: any; permissions: string[] }> {
  if (!tx.prisma) throw new Error('Prisma client required on TenantTx');
  await ensureDefaultRoles(tx);

  const staff = await tx.prisma.hmsStaff.findFirst({
    where: {
      tenantId: tx.tenantId,
      ...(identifier.staffId ? { id: identifier.staffId } : {}),
      ...(identifier.emailBlind ? { emailBlind: identifier.emailBlind } : {}),
    },
    include: {
      credential: true,
    },
  });

  if (!staff || !staff.credential) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (staff.status === 'SUSPENDED') {
    throw new Error('STAFF_SUSPENDED');
  }

  const cred = staff.credential;
  const now = new Date();

  // Check if account is currently locked
  if (cred.lockedUntil && cred.lockedUntil > now) {
    const remainingMs = cred.lockedUntil.getTime() - now.getTime();
    throw new Error(`ACCOUNT_LOCKED:${Math.ceil(remainingMs / 1000)}`);
  }

  const isValid = await verifyPassword(plainPassword, cred.salt, cred.passwordHash);

  if (!isValid) {
    const failedAttempts = cred.failedAttempts + 1;
    let lockedUntil: Date | null = null;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      // Exponential backoff: 15 min * 2^(failedAttempts - 5)
      const multiplier = Math.pow(2, failedAttempts - MAX_FAILED_ATTEMPTS);
      const lockoutDurationMs = BASE_LOCKOUT_MS * multiplier;
      lockedUntil = new Date(Date.now() + lockoutDurationMs);
    }

    await tx.prisma.hmsStaffCredential.update({
      where: {
        tenantId_staffId: {
          tenantId: tx.tenantId,
          staffId: staff.id,
        },
      },
      data: {
        failedAttempts,
        lockedUntil,
        updatedAt: new Date(),
      },
    });

    if (lockedUntil) {
      throw new Error(`ACCOUNT_LOCKED:${Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)}`);
    }
    throw new Error('INVALID_CREDENTIALS');
  }

  // Password is valid - reset lock and failures, update lastLoginAt
  await tx.prisma.hmsStaffCredential.update({
    where: {
      tenantId_staffId: {
        tenantId: tx.tenantId,
        staffId: staff.id,
      },
    },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    },
  });

  // Resolve staff role
  const roleName = (staff.role || 'DOCTOR').toUpperCase();
  let role = await tx.prisma.hmsRole.findFirst({
    where: {
      tenantId: tx.tenantId,
      name: roleName,
    },
    include: {
      permissions: true,
    },
  });

  if (!role) {
    role = await tx.prisma.hmsRole.create({
      data: {
        tenantId: tx.tenantId,
        id: `role_${roleName.toLowerCase()}_${crypto.randomBytes(4).toString('hex')}`,
        name: roleName,
        description: `${roleName} role`,
        isSystem: false,
      },
      include: {
        permissions: true,
      },
    });
  }

  const permissions = role.permissions.map((p) => p.permission);

  // Mint new session: 256-bit random token
  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + IDLE_TIMEOUT_MS);
  const absoluteExpiresAt = new Date(Date.now() + ABSOLUTE_TIMEOUT_MS);

  const session = await tx.prisma.hmsStaffSession.create({
    data: {
      tenantId: tx.tenantId,
      id: `sess_${crypto.randomBytes(12).toString('hex')}`,
      staffId: staff.id,
      roleId: role.id,
      tokenHash,
      expiresAt,
      absoluteExpiresAt,
      userAgent: metadata.userAgent || null,
      ipAddress: metadata.ipAddress || null,
    },
  });

  return {
    rawToken,
    staff: {
      id: staff.id,
      role: role.name,
      departmentId: staff.departmentId,
      onDuty: staff.onDuty,
    },
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
    },
    permissions,
  };
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

import crypto from 'node:crypto';
import type {
  Prisma,
  PrismaClient,
  PlatformOperatorRole,
  CustomerMembershipRole,
  AccountTokenPurpose,
} from '@prisma/client';
import { prisma } from './prisma';
import {
  ACCOUNT_SESSION_ABSOLUTE_MS,
  ACCOUNT_SESSION_IDLE_MS,
  assertPasswordNotBreached,
  assertValidEmail,
  assertValidPassword,
  buildAccountLink,
  encryptAccountEmailPayload,
  generateTotpSecret,
  getTotpStep,
  hashAccountPassword,
  hashAccountToken,
  hashBackupCode,
  newAccountToken,
  newSessionTokens,
  sealTotpSecret,
  unsealTotpSecret,
  uniformAccountResponse,
  verifyAccountPassword,
} from './phase6-account-security';

type Tx = Prisma.TransactionClient;

const dummyPasswordHash = hashAccountPassword('not-a-valid-user-password');
const allowedInviteRoles = ['ADMIN', 'MEMBER', 'BILLING'] as const;
export const CUSTOMER_SESSION_COOKIE = 'orbitox_customer_session';
export const CUSTOMER_CSRF_COOKIE = 'orbitox_customer_csrf';
export const OPERATOR_SESSION_COOKIE = 'orbitox_operator_session';
export const OPERATOR_CSRF_COOKIE = 'orbitox_operator_csrf';

export interface CustomerSessionContext {
  id: string;
  userId: string;
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaSetupRequired: boolean;
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    role: CustomerMembershipRole;
  }>;
  csrfTokenHash: string;
  reauthenticatedAt: Date | null;
}

export interface OperatorSessionContext {
  id: string;
  operatorId: string;
  email: string;
  role: PlatformOperatorRole;
  csrfTokenHash: string;
  reauthenticatedAt: Date | null;
}

export function accountPublicBaseUrl(requestOrigin: string): string {
  const configured = process.env.ORBITOX_PUBLIC_BASE_URL || process.env.APP_BASE_URL;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('ORBITOX_PUBLIC_BASE_URL is required in production.');
  }
  return configured || requestOrigin;
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  organizationName: string;
  baseUrl: string;
}): Promise<ReturnType<typeof uniformAccountResponse>> {
  const email = assertValidEmail(input.email);
  assertValidPassword(input.password);
  if (
    [...input.organizationName.trim()].length < 2 ||
    [...input.organizationName.trim()].length > 120
  ) {
    throw new Error('Organization name must contain 2 to 120 characters.');
  }
  await assertPasswordNotBreached(input.password);
  const passwordHash = await hashAccountPassword(input.password);
  const token = newAccountToken('VERIFY_EMAIL');
  const link = buildAccountLink(input.baseUrl, '/account/verify-email', token.token);
  const encryptedPayload = encryptAccountEmailPayload({ link });

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.customerUser.findFirst({
        where: { email, status: { not: 'DELETED' } },
        select: { id: true },
      });
      if (existing) return;

      const user = await tx.customerUser.create({ data: { email, passwordHash } });
      const organization = await tx.platformOrganization.create({
        data: {
          slug: `customer-${crypto.randomBytes(10).toString('hex')}`,
          name: input.organizationName.trim(),
          billingEmail: email,
        },
      });
      await tx.customerMembership.create({
        data: { organizationId: organization.id, userId: user.id, role: 'OWNER' },
      });
      await tx.accountToken.create({
        data: {
          tokenHash: token.tokenHash,
          purpose: token.purpose,
          userId: user.id,
          organizationId: organization.id,
          email,
          expiresAt: token.expiresAt,
        },
      });
      await tx.accountEmailOutbox.create({
        data: { recipient: email, template: 'VERIFY_EMAIL', encryptedPayload },
      });
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
  return uniformAccountResponse();
}

export async function verifyCustomerEmail(rawToken: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const token = await consumeAccountToken(tx, rawToken, 'VERIFY_EMAIL');
    if (!token?.userId) return false;
    await tx.customerUser.updateMany({
      where: { id: token.userId, status: 'ACTIVE' },
      data: { emailVerifiedAt: new Date() },
    });
    return true;
  });
}

export async function requestCustomerPasswordReset(
  emailInput: string,
  baseUrl: string,
): Promise<void> {
  const email = assertValidEmail(emailInput);
  const user = await prisma.customerUser.findFirst({
    where: {
      email,
      status: { not: 'DELETED' },
      emailVerifiedAt: { not: null },
      passwordHash: { not: null },
    },
    select: { id: true },
  });
  if (!user) return;

  const token = newAccountToken('RESET_PASSWORD');
  const encryptedPayload = encryptAccountEmailPayload({
    link: buildAccountLink(baseUrl, '/account/reset-password', token.token),
  });
  await prisma.$transaction(async (tx) => {
    await tx.accountToken.updateMany({
      where: { userId: user.id, purpose: 'RESET_PASSWORD', usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.accountToken.create({
      data: {
        tokenHash: token.tokenHash,
        purpose: token.purpose,
        userId: user.id,
        email,
        expiresAt: token.expiresAt,
      },
    });
    await tx.accountEmailOutbox.create({
      data: { recipient: email, template: 'RESET_PASSWORD', encryptedPayload },
    });
  });
}

export async function resetCustomerPassword(rawToken: string, password: string): Promise<boolean> {
  assertValidPassword(password);
  await assertPasswordNotBreached(password);
  const passwordHash = await hashAccountPassword(password);
  return prisma.$transaction(async (tx) => {
    const token = await consumeAccountToken(tx, rawToken, 'RESET_PASSWORD');
    if (!token?.userId) return false;
    const updated = await tx.customerUser.updateMany({
      where: { id: token.userId, status: 'ACTIVE' },
      data: { passwordHash, failedLogins: 0, failureWindowStartedAt: null, lockedUntil: null },
    });
    if (!updated.count) return false;
    await tx.customerSession.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  });
}

export async function inviteCustomerMember(input: {
  organizationId: string;
  actorUserId: string;
  email: string;
  role: string;
  baseUrl: string;
}): Promise<void> {
  const email = assertValidEmail(input.email);
  if (!allowedInviteRoles.includes(input.role as (typeof allowedInviteRoles)[number])) {
    throw new Error('Invites may grant ADMIN, MEMBER, or BILLING only.');
  }
  const organization = await prisma.platformOrganization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, name: true },
  });
  if (!organization) throw new Error('Organization not found.');
  const actorMembership = await prisma.customerMembership.findUnique({
    where: {
      organizationId_userId: { organizationId: organization.id, userId: input.actorUserId },
    },
    select: { role: true },
  });
  if (!actorMembership || !['OWNER', 'ADMIN'].includes(actorMembership.role)) {
    throw new Error('Only organization owners and admins can invite members.');
  }

  const token = newAccountToken('INVITE');
  const encryptedPayload = encryptAccountEmailPayload({
    link: buildAccountLink(input.baseUrl, '/account/accept-invite', token.token),
    organizationName: organization.name,
  });
  await prisma.$transaction(async (tx) => {
    let user = await tx.customerUser.findFirst({
      where: { email, status: { not: 'DELETED' } },
      select: { id: true },
    });
    if (!user) {
      user = await tx.customerUser.create({ data: { email }, select: { id: true } });
    }
    const membership = await tx.customerMembership.findUnique({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      select: { userId: true },
    });
    if (membership) throw new Error('This user is already a member of the organization.');
    await tx.accountToken.updateMany({
      where: { organizationId: organization.id, email, purpose: 'INVITE', usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.accountToken.create({
      data: {
        tokenHash: token.tokenHash,
        purpose: token.purpose,
        userId: user.id,
        organizationId: organization.id,
        email,
        role: input.role as (typeof allowedInviteRoles)[number],
        expiresAt: token.expiresAt,
      },
    });
    await tx.accountEmailOutbox.create({
      data: { recipient: email, template: 'INVITE', encryptedPayload },
    });
  });
}

export async function acceptCustomerInvite(input: {
  rawToken: string;
  actorUserId?: string;
  password?: string;
}): Promise<{ userId: string; organizationId: string } | null> {
  if (input.password) {
    assertValidPassword(input.password);
    await assertPasswordNotBreached(input.password);
  }
  const passwordHash = input.password ? await hashAccountPassword(input.password) : null;
  return prisma.$transaction(async (tx) => {
    const token = await consumeAccountToken(tx, input.rawToken, 'INVITE');
    if (!token?.userId || !token.organizationId || !token.role || token.role === 'OWNER')
      return null;
    const user = await tx.customerUser.findUnique({
      where: { id: token.userId },
      select: { id: true, email: true, passwordHash: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE' || user.email !== token.email) return null;
    if (user.passwordHash && input.actorUserId !== user.id) return null;
    if (!user.passwordHash && (!passwordHash || input.actorUserId)) return null;
    await tx.customerMembership.create({
      data: { organizationId: token.organizationId, userId: user.id, role: token.role },
    });
    if (passwordHash) {
      await tx.customerUser.update({
        where: { id: user.id },
        data: { passwordHash, emailVerifiedAt: new Date() },
      });
    }
    return { userId: user.id, organizationId: token.organizationId };
  });
}

export async function loginCustomer(input: {
  email: string;
  password: string;
  totpCode?: string;
  ipAddress: string;
  userAgent?: string;
}) {
  const email = assertValidEmail(input.email);
  const user = await prisma.customerUser.findFirst({
    where: { email, status: { not: 'DELETED' } },
    select: { id: true, passwordHash: true, status: true, lockedUntil: true },
  });
  const candidateHash = user?.passwordHash ?? (await dummyPasswordHash);
  const passwordValid = await verifyAccountPassword(input.password, candidateHash);
  const now = new Date();
  if (!user || (user.lockedUntil && user.lockedUntil > now)) {
    return { ok: false as const, reason: 'INVALID_CREDENTIALS' as const };
  }
  if (!passwordValid || user.status !== 'ACTIVE') {
    if (!passwordValid && user.status === 'ACTIVE') {
      await prisma.$transaction((tx) => recordCustomerLoginFailure(tx, user.id, now));
    }
    return { ok: false as const, reason: 'INVALID_CREDENTIALS' as const };
  }

  return prisma.$transaction(async (tx) => {
    const account = await tx.customerUser.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        mfaTotpSealed: true,
        status: true,
        lockedUntil: true,
      },
    });
    if (
      !account ||
      account.status !== 'ACTIVE' ||
      (account.lockedUntil && account.lockedUntil > now)
    ) {
      return { ok: false as const, reason: 'INVALID_CREDENTIALS' as const };
    }
    if (!account.emailVerifiedAt)
      return { ok: false as const, reason: 'EMAIL_NOT_VERIFIED' as const };

    const memberships = await tx.customerMembership.findMany({
      where: { userId: account.id },
      select: { role: true },
    });
    const mfaRequired = memberships.some((membership) =>
      ['OWNER', 'ADMIN'].includes(membership.role),
    );
    if (account.mfaTotpSealed) {
      const step = getTotpStep(unsealTotpSecret(account.mfaTotpSealed), input.totpCode || '');
      const validTotp = step !== null && (await consumeCustomerTotpStep(tx, account.id, step, now));
      if (!validTotp) {
        await recordCustomerLoginFailure(tx, account.id, now);
        return { ok: false as const, reason: 'INVALID_CREDENTIALS' as const };
      }
    }
    const session = await createCustomerSession(tx, account.id, input);
    await tx.customerUser.update({
      where: { id: account.id },
      data: { failedLogins: 0, failureWindowStartedAt: null, lockedUntil: null },
    });
    return {
      ok: true as const,
      userId: account.id,
      email: account.email,
      mfaSetupRequired: mfaRequired && !account.mfaTotpSealed,
      ...session,
    };
  });
}

export async function setupCustomerMfa(
  userId: string,
): Promise<{ secret: string; otpauthUrl: string }> {
  const user = await prisma.customerUser.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new Error('Customer account not found.');
  const secret = generateTotpSecret();
  await prisma.customerUser.update({
    where: { id: userId },
    data: { mfaTotpPendingSealed: sealTotpSecret(secret) },
  });
  const issuer = encodeURIComponent('OrbitoX');
  return {
    secret,
    otpauthUrl: `otpauth://totp/${issuer}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
  };
}

export async function confirmCustomerMfa(userId: string, code: string): Promise<boolean> {
  const user = await prisma.customerUser.findUnique({
    where: { id: userId },
    select: { mfaTotpPendingSealed: true },
  });
  if (!user?.mfaTotpPendingSealed) return false;
  const step = getTotpStep(unsealTotpSecret(user.mfaTotpPendingSealed), code);
  if (step === null) return false;
  const now = new Date();
  const updated = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "CustomerUser"
    SET "mfaTotpSealed" = "mfaTotpPendingSealed",
        "mfaTotpPendingSealed" = NULL,
        "lastTotpStep" = ${step},
        "updatedAt" = ${now}
    WHERE "id" = ${userId}
      AND "mfaTotpPendingSealed" = ${user.mfaTotpPendingSealed}
      AND COALESCE("lastTotpStep", -1) < ${step}
    RETURNING "id"
  `;
  return updated.length === 1;
}

export async function reauthenticateCustomer(
  session: CustomerSessionContext,
  password: string,
  totpCode?: string,
): Promise<boolean> {
  const user = await prisma.customerUser.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true, mfaTotpSealed: true, status: true },
  });
  if (
    !user ||
    user.status !== 'ACTIVE' ||
    !user.passwordHash ||
    !(await verifyAccountPassword(password, user.passwordHash))
  ) {
    return false;
  }
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    if (user.mfaTotpSealed) {
      const step = getTotpStep(unsealTotpSecret(user.mfaTotpSealed), totpCode || '');
      if (step === null || !(await consumeCustomerTotpStep(tx, session.userId, step, now)))
        return false;
    }
    const updated = await tx.customerSession.updateMany({
      where: { id: session.id, userId: session.userId, revokedAt: null },
      data: { reauthenticatedAt: now },
    });
    return updated.count === 1;
  });
}

export async function transferCustomerOwnership(input: {
  organizationId: string;
  currentOwnerId: string;
  newOwnerId: string;
}): Promise<void> {
  if (input.currentOwnerId === input.newOwnerId)
    throw new Error('Choose a different organization member.');
  await prisma.$transaction(async (tx) => {
    const [current, next] = await Promise.all([
      tx.customerMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.currentOwnerId,
          },
        },
        select: { role: true },
      }),
      tx.customerMembership.findUnique({
        where: {
          organizationId_userId: { organizationId: input.organizationId, userId: input.newOwnerId },
        },
        select: { role: true },
      }),
    ]);
    if (current?.role !== 'OWNER')
      throw new Error('Only the current organization owner can transfer ownership.');
    if (!next) throw new Error('The new owner must already be an organization member.');
    await tx.customerMembership.update({
      where: {
        organizationId_userId: { organizationId: input.organizationId, userId: input.newOwnerId },
      },
      data: { role: 'OWNER' },
    });
    await tx.customerMembership.update({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.currentOwnerId,
        },
      },
      data: { role: 'ADMIN' },
    });
  });
}

export async function createCustomerSession(
  tx: Tx,
  userId: string,
  metadata: { ipAddress: string; userAgent?: string },
) {
  const tokens = newSessionTokens();
  const now = Date.now();
  const expiresAt = new Date(now + ACCOUNT_SESSION_IDLE_MS);
  const absoluteExpiresAt = new Date(now + ACCOUNT_SESSION_ABSOLUTE_MS);
  await tx.customerSession.create({
    data: {
      userId,
      tokenHash: tokens.sessionTokenHash,
      csrfTokenHash: tokens.csrfTokenHash,
      idleExpiresAt: expiresAt,
      absoluteExpiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });
  return { ...tokens, expiresAt, absoluteExpiresAt };
}

export async function createCustomerSessionForUser(
  userId: string,
  metadata: { ipAddress: string; userAgent?: string },
) {
  return prisma.$transaction((tx) => createCustomerSession(tx, userId, metadata));
}

export async function getCustomerSession(
  rawToken: string | undefined,
): Promise<CustomerSessionContext | null> {
  if (!rawToken || !/^[A-Za-z0-9_-]{43}$/.test(rawToken)) return null;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: { include: { organization: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  const now = new Date();
  if (
    !session ||
    session.revokedAt ||
    session.user.status !== 'ACTIVE' ||
    session.idleExpiresAt <= now ||
    session.absoluteExpiresAt <= now
  ) {
    return null;
  }
  await prisma.customerSession.updateMany({
    where: { id: session.id, revokedAt: null },
    data: {
      lastSeenAt: now,
      idleExpiresAt: new Date(
        Math.min(now.getTime() + ACCOUNT_SESSION_IDLE_MS, session.absoluteExpiresAt.getTime()),
      ),
    },
  });
  const isOwnerOrAdmin = session.user.memberships.some((membership) =>
    ['OWNER', 'ADMIN'].includes(membership.role),
  );
  return {
    id: session.id,
    userId: session.userId,
    email: session.user.email,
    emailVerified: Boolean(session.user.emailVerifiedAt),
    mfaEnabled: Boolean(session.user.mfaTotpSealed),
    mfaSetupRequired: isOwnerOrAdmin && !session.user.mfaTotpSealed,
    csrfTokenHash: session.csrfTokenHash,
    reauthenticatedAt: session.reauthenticatedAt,
    memberships: session.user.memberships.map((membership) => ({
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role,
    })),
  };
}

export async function getOperatorSession(
  rawToken: string | undefined,
): Promise<OperatorSessionContext | null> {
  if (!rawToken || !/^[A-Za-z0-9_-]{43}$/.test(rawToken)) return null;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const session = await prisma.platformOperatorSession.findUnique({
    where: { tokenHash },
    include: { operator: { select: { id: true, email: true, role: true, status: true } } },
  });
  const now = new Date();
  if (
    !session ||
    session.revokedAt ||
    session.operator.status !== 'ACTIVE' ||
    session.idleExpiresAt <= now ||
    session.absoluteExpiresAt <= now
  )
    return null;
  if (now.getTime() - session.lastSeenAt.getTime() > 60_000) {
    await prisma.platformOperatorSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: {
        lastSeenAt: now,
        idleExpiresAt: new Date(
          Math.min(now.getTime() + ACCOUNT_SESSION_IDLE_MS, session.absoluteExpiresAt.getTime()),
        ),
      },
    });
  }
  return {
    id: session.id,
    operatorId: session.operator.id,
    email: session.operator.email,
    role: session.operator.role,
    csrfTokenHash: session.csrfTokenHash,
    reauthenticatedAt: session.reauthenticatedAt,
  };
}

export async function loginOperator(input: {
  email: string;
  password: string;
  totpCode: string;
  ipAddress: string;
  userAgent?: string;
}) {
  const email = assertValidEmail(input.email);
  const operator = await prisma.platformOperator.findFirst({
    where: { email, status: 'ACTIVE' },
    select: { id: true, passwordHash: true, lockedUntil: true },
  });
  const passwordHash = operator?.passwordHash ?? (await dummyPasswordHash);
  const passwordValid = await verifyAccountPassword(input.password, passwordHash);
  const now = new Date();
  if (!operator || (operator.lockedUntil && operator.lockedUntil > now))
    return { ok: false as const };
  if (!passwordValid) {
    await prisma.$transaction((tx) => recordOperatorLoginFailure(tx, operator.id, now));
    return { ok: false as const };
  }
  return prisma.$transaction(async (tx) => {
    const account = await tx.platformOperator.findUnique({
      where: { id: operator.id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        mfaTotpSealed: true,
        role: true,
        status: true,
        lockedUntil: true,
      },
    });
    if (
      !account ||
      account.status !== 'ACTIVE' ||
      (account.lockedUntil && account.lockedUntil > now)
    ) {
      return { ok: false as const };
    }
    const secret = unsealTotpSecret(account.mfaTotpSealed);
    const step = getTotpStep(secret, input.totpCode);
    let validMfa = step !== null && (await consumeOperatorTotpStep(tx, account.id, step, now));
    if (!validMfa) {
      validMfa = await consumeOperatorBackupCode(tx, account.id, input.totpCode);
    }
    if (!validMfa) {
      await recordOperatorLoginFailure(tx, account.id, now);
      return { ok: false as const };
    }
    const tokens = newSessionTokens();
    const absoluteExpiresAt = new Date(now.getTime() + ACCOUNT_SESSION_ABSOLUTE_MS);
    await tx.platformOperatorSession.create({
      data: {
        operatorId: account.id,
        tokenHash: tokens.sessionTokenHash,
        csrfTokenHash: tokens.csrfTokenHash,
        idleExpiresAt: new Date(now.getTime() + ACCOUNT_SESSION_IDLE_MS),
        absoluteExpiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    await tx.platformOperator.update({
      where: { id: account.id },
      data: { failedLogins: 0, failureWindowStartedAt: null, lockedUntil: null },
    });
    return {
      ok: true as const,
      operatorId: account.id,
      email: account.email,
      role: account.role,
      absoluteExpiresAt,
      ...tokens,
    };
  });
}

export async function reauthenticateOperator(
  session: OperatorSessionContext,
  password: string,
  totpCode: string,
): Promise<boolean> {
  const operator = await prisma.platformOperator.findUnique({
    where: { id: session.operatorId },
    select: { passwordHash: true, mfaTotpSealed: true, status: true },
  });
  if (
    !operator ||
    operator.status !== 'ACTIVE' ||
    !(await verifyAccountPassword(password, operator.passwordHash))
  )
    return false;
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const step = getTotpStep(unsealTotpSecret(operator.mfaTotpSealed), totpCode);
    let validMfa =
      step !== null && (await consumeOperatorTotpStep(tx, session.operatorId, step, now));
    if (!validMfa) validMfa = await consumeOperatorBackupCode(tx, session.operatorId, totpCode);
    if (!validMfa) return false;
    const updated = await tx.platformOperatorSession.updateMany({
      where: { id: session.id, operatorId: session.operatorId, revokedAt: null },
      data: { reauthenticatedAt: now },
    });
    return updated.count === 1;
  });
}

export async function revokeCustomerSession(sessionId: string): Promise<void> {
  await prisma.customerSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeOperatorSession(sessionId: string): Promise<void> {
  await prisma.platformOperatorSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function consumeAuthRateLimit(input: {
  ipAddress: string;
  email?: string;
  action: 'signup' | 'login' | 'reset' | 'invite' | 'operator-login';
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const emailScope = input.email ? hashRateLimitEmail(input.email) : undefined;
  const scopes = [
    { type: 'ip', id: input.ipAddress, limit: input.action === 'login' ? 30 : 10 },
    ...(emailScope
      ? [{ type: 'email', id: emailScope, limit: input.action === 'login' ? 10 : 5 }]
      : []),
  ];
  const now = new Date();
  const start = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const blocked = await prisma.$transaction(async (tx) => {
    let denied = false;
    for (const scope of scopes) {
      const row = await tx.accountAuthRateLimitBucket.upsert({
        where: {
          scopeType_scopeId_windowStart: {
            scopeType: scope.type,
            scopeId: scope.id,
            windowStart: start,
          },
        },
        create: {
          scopeType: scope.type,
          scopeId: scope.id,
          windowStart: start,
          expiresAt: new Date(start.getTime() + 2 * 60_000),
          requestCount: 1,
        },
        update: { requestCount: { increment: 1 } },
        select: { requestCount: true },
      });
      if (row.requestCount > scope.limit) denied = true;
    }
    return denied;
  });
  return {
    allowed: !blocked,
    retryAfterSeconds: Math.max(1, Math.ceil((start.getTime() + 60_000 - now.getTime()) / 1000)),
  };
}

export async function addOperator(
  input: {
    email: string;
    password: string;
    role: PlatformOperatorRole;
    totpSecret: string;
    backupCodes: string[];
  },
  database: Pick<PrismaClient, '$transaction'> = prisma,
) {
  const email = assertValidEmail(input.email);
  assertValidPassword(input.password);
  await assertPasswordNotBreached(input.password);
  const passwordHash = await hashAccountPassword(input.password);
  return database.$transaction(async (tx) => {
    const operator = await tx.platformOperator.create({
      data: {
        email,
        passwordHash,
        role: input.role,
        mfaTotpSealed: sealTotpSecret(input.totpSecret),
      },
    });
    await tx.platformOperatorBackupCode.createMany({
      data: input.backupCodes.map((code) => ({
        operatorId: operator.id,
        codeHash: hashBackupCode(operator.id, code),
      })),
    });
    return operator.id;
  });
}

export async function isCustomerMembership(
  userId: string,
  organizationId: string,
  roles?: CustomerMembershipRole[],
): Promise<boolean> {
  const membership = await prisma.customerMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });
  return Boolean(membership && (!roles || roles.includes(membership.role)));
}

async function consumeAccountToken(tx: Tx, rawToken: string, purpose: AccountTokenPurpose) {
  let tokenHash: string;
  try {
    tokenHash = hashAccountToken(rawToken);
  } catch {
    return null;
  }
  const now = new Date();
  const changed = await tx.accountToken.updateMany({
    where: { tokenHash, purpose, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (changed.count !== 1) return null;
  return tx.accountToken.findUnique({ where: { tokenHash } });
}

async function recordCustomerLoginFailure(tx: Tx, userId: string, now: Date) {
  await incrementAccountLoginFailure(tx, 'CustomerUser', userId, now);
}

async function recordOperatorLoginFailure(tx: Tx, operatorId: string, now: Date) {
  await incrementAccountLoginFailure(tx, 'PlatformOperator', operatorId, now);
}

async function incrementAccountLoginFailure(
  tx: Tx,
  table: 'CustomerUser' | 'PlatformOperator',
  id: string,
  now: Date,
): Promise<void> {
  const expired = `"failureWindowStartedAt" IS NULL OR "failureWindowStartedAt" <= $2 - INTERVAL '24 hours'`;
  const nextCount = `CASE WHEN ${expired} THEN 1 ELSE "failedLogins" + 1 END`;
  await tx.$executeRawUnsafe(
    `
    UPDATE "${table}"
    SET "failedLogins" = ${nextCount},
        "failureWindowStartedAt" = CASE WHEN ${expired} THEN $2 ELSE "failureWindowStartedAt" END,
        "lockedUntil" = CASE
          WHEN (${nextCount}) < 5 THEN NULL
          ELSE $2 + LEAST(
            INTERVAL '16 hours',
            INTERVAL '15 minutes' * POWER(
              2::double precision,
              GREATEST(0, LEAST(6, (${nextCount}) - 5))
            )
          )
        END,
        "updatedAt" = $2
    WHERE "id" = $1
  `,
    id,
    now,
  );
}

async function consumeCustomerTotpStep(
  tx: Tx,
  userId: string,
  step: number,
  now: Date,
): Promise<boolean> {
  const updated = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE "CustomerUser"
    SET "lastTotpStep" = ${step}, "updatedAt" = ${now}
    WHERE "id" = ${userId} AND COALESCE("lastTotpStep", -1) < ${step}
    RETURNING "id"
  `;
  return updated.length === 1;
}

async function consumeOperatorTotpStep(
  tx: Tx,
  operatorId: string,
  step: number,
  now: Date,
): Promise<boolean> {
  const updated = await tx.$queryRaw<Array<{ consumed: boolean }>>`
    SELECT public.consume_platform_operator_totp_step(
      ${operatorId},
      ${step},
      ${now}
    ) AS consumed
  `;
  return updated[0]?.consumed === true;
}

async function consumeOperatorBackupCode(
  tx: Tx,
  operatorId: string,
  rawCode: string,
): Promise<boolean> {
  let codeHash: string;
  try {
    codeHash = hashBackupCode(operatorId, rawCode);
  } catch {
    return false;
  }
  const result = await tx.platformOperatorBackupCode.updateMany({
    where: { operatorId, codeHash, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count === 1;
}

function hashRateLimitEmail(email: string): string {
  const key = process.env.ORBITOX_SERVER_PEPPER || process.env.ORBITOX_CONTROL_SECRET;
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error(
      'ORBITOX_SERVER_PEPPER or ORBITOX_CONTROL_SECRET is required for account rate limits.',
    );
  }
  return crypto
    .createHmac('sha256', key || 'local-account-rate-limit-only')
    .update(email.trim().toLowerCase())
    .digest('hex');
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

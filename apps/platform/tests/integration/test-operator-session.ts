import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  getOperatorSession,
  loginOperator,
  OPERATOR_CSRF_COOKIE,
  OPERATOR_SESSION_COOKIE,
  reauthenticateOperator,
} from '@/lib/phase6-account-service';
import {
  generateTotpSecret,
  hashAccountPassword,
  sealTotpSecret,
} from '@/lib/phase6-account-security';

export interface TestOperatorSession {
  operatorId: string;
  cookie: string;
}

export async function createTestOperatorSession(owner: PrismaClient): Promise<TestOperatorSession> {
  process.env.ORBITOX_MFA_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');

  const email = `ci-operator-${crypto.randomUUID()}@example.invalid`;
  const password = crypto.randomBytes(32).toString('base64url');
  const secret = generateTotpSecret();
  const operator = await owner.platformOperator.create({
    data: {
      email,
      passwordHash: await hashAccountPassword(password),
      role: 'PLATFORM_OWNER',
      mfaTotpSealed: sealTotpSecret(secret),
    },
    select: { id: true },
  });

  try {
    const login = await loginOperator({
      email,
      password,
      totpCode: totpCode(secret),
      ipAddress: '127.0.0.1',
    });
    if (!login.ok) throw new Error('Test operator login failed.');

    const session = await getOperatorSession(login.sessionToken);
    if (!session) throw new Error('Test operator session was not persisted.');
    const reauthenticated = await reauthenticateOperator(
      session,
      password,
      totpCode(secret, Date.now() + 30_000),
    );
    if (!reauthenticated) throw new Error('Test operator reauthentication failed.');

    return {
      operatorId: operator.id,
      cookie: `${OPERATOR_SESSION_COOKIE}=${login.sessionToken}; ${OPERATOR_CSRF_COOKIE}=${login.csrfToken}`,
    };
  } catch (error) {
    await owner.platformOperatorSession.deleteMany({ where: { operatorId: operator.id } });
    await owner.platformOperator.delete({ where: { id: operator.id } });
    throw error;
  }
}

export function testOperatorHeaders(
  session: TestOperatorSession,
  origin: string,
  headers: Record<string, string> = {},
): Record<string, string> {
  return { ...headers, cookie: session.cookie, origin };
}

export async function deleteTestOperatorSession(
  owner: PrismaClient,
  operatorId: string,
): Promise<void> {
  await owner.platformOperatorSession.deleteMany({ where: { operatorId } });
  await owner.platformOperator.delete({ where: { id: operatorId } });
}

function totpCode(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

function decodeBase32(value: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of value.replace(/=+$/, '')) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid base32 TOTP secret.');
    bits += digit.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

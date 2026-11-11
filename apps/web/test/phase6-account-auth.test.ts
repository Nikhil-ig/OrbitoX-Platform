import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { loginCustomer, loginOperator } from '../lib/phase6-account-service';
import {
  generateTotpSecret,
  getTotpStep,
  hashAccountPassword,
  hashBackupCode,
  makeBackupCodes,
  sealTotpSecret,
} from '../lib/phase6-account-security';

const ownerUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runtimeUrl = process.env.APP_DATABASE_URL;

describe('Phase 6 account authentication under PostgreSQL runtime privileges', () => {
  if (!ownerUrl || !runtimeUrl) {
    throw new Error('TEST_DATABASE_URL/DATABASE_URL and APP_DATABASE_URL are required.');
  }

  process.env.ORBITOX_MFA_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');
  process.env.ORBITOX_BREACHED_PASSWORD_API = 'off';

  const owner = new PrismaClient({ datasourceUrl: ownerUrl });
  const customers = new Set<string>();
  const operators = new Set<string>();
  const password = 'phase6-auth-test-Password-9482';
  const ipAddress = '192.0.2.44';

  after(async () => {
    await owner.customerUser.deleteMany({ where: { id: { in: [...customers] } } });
    await owner.platformOperator.deleteMany({ where: { id: { in: [...operators] } } });
    await Promise.all([owner.$disconnect(), prisma.$disconnect()]);
  });

  it('20 parallel wrong passwords persist failedLogins = 20', async () => {
    const user = await createCustomer();
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        loginCustomer({
          email: user.email,
          password: 'a-different-wrong-password-8484',
          ipAddress,
        }),
      ),
    );
    assert.ok(results.every((result) => !result.ok));
    const persisted = await owner.customerUser.findUniqueOrThrow({
      where: { id: user.id },
      select: { failedLogins: true, lockedUntil: true },
    });
    assert.equal(persisted.failedLogins, 20);
    assert.ok(persisted.lockedUntil && persisted.lockedUntil > new Date());
  });

  it('six wrong customer TOTP codes lock the account', async () => {
    const secret = generateTotpSecret();
    const user = await createCustomer({ secret });
    const code = invalidTotpCode(secret);
    const attempts = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      attempts.push(
        await loginCustomer({
          email: user.email,
          password,
          totpCode: code,
          ipAddress,
        }),
      );
    }
    assert.ok(attempts.every((result) => !result.ok));
    const persisted = await owner.customerUser.findUniqueOrThrow({
      where: { id: user.id },
      select: { failedLogins: true, lockedUntil: true },
    });
    assert.ok(persisted.failedLogins >= 5);
    assert.ok(persisted.lockedUntil && persisted.lockedUntil > new Date());
  });

  it('accepts a customer TOTP code once and refuses reuse', async () => {
    const secret = generateTotpSecret();
    const user = await createCustomer({ secret });
    const code = totpCode(secret);
    assert.notEqual(getTotpStep(secret, code), null);
    const first = await loginCustomer({ email: user.email, password, totpCode: code, ipAddress });
    const replay = await loginCustomer({ email: user.email, password, totpCode: code, ipAddress });
    assert.equal(first.ok, true);
    assert.equal(replay.ok, false);
    const persisted = await owner.customerUser.findUniqueOrThrow({
      where: { id: user.id },
      select: { failedLogins: true, lastTotpStep: true },
    });
    assert.equal(persisted.failedLogins, 1);
    assert.ok(persisted.lastTotpStep !== null);
  });

  it('six wrong operator TOTP codes lock the account', async () => {
    const { operator, secret } = await createOperator();
    const code = invalidTotpCode(secret);
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () =>
        loginOperator({
          email: operator.email,
          password,
          totpCode: code,
          ipAddress,
        }),
      ),
    );
    assert.ok(attempts.every((result) => !result.ok));
    const persisted = await owner.platformOperator.findUniqueOrThrow({
      where: { id: operator.id },
      select: { failedLogins: true, lockedUntil: true },
    });
    assert.ok(persisted.failedLogins >= 5);
    assert.ok(persisted.lockedUntil && persisted.lockedUntil > new Date());
  });

  it('operator login accepts a valid TOTP once and refuses reuse through Prisma', async () => {
    const totpOperator = await createOperator();
    const code = totpCode(totpOperator.secret);
    const firstTotp = await loginOperator({
      email: totpOperator.operator.email,
      password,
      totpCode: code,
      ipAddress,
    });
    const replayedTotp = await loginOperator({
      email: totpOperator.operator.email,
      password,
      totpCode: code,
      ipAddress,
    });
    assert.equal(firstTotp.ok, true);
    assert.equal(replayedTotp.ok, false);
    const persistedOperator = await owner.platformOperator.findUniqueOrThrow({
      where: { id: totpOperator.operator.id },
      select: { failedLogins: true, lastTotpStep: true },
    });
    assert.ok(persistedOperator.lastTotpStep !== null);
    assert.equal(persistedOperator.failedLogins, 1);
  });

  it('refuses reused and parallel backup codes', async () => {
    const reusedBackup = await createOperator();
    const firstBackup = await loginOperator({
      email: reusedBackup.operator.email,
      password,
      totpCode: reusedBackup.backupCode,
      ipAddress,
    });
    const replayedBackup = await loginOperator({
      email: reusedBackup.operator.email,
      password,
      totpCode: reusedBackup.backupCode,
      ipAddress,
    });
    assert.equal(firstBackup.ok, true);
    assert.equal(replayedBackup.ok, false);

    const parallelBackup = await createOperator();
    const parallelResults = await Promise.all(
      Array.from({ length: 2 }, () =>
        loginOperator({
          email: parallelBackup.operator.email,
          password,
          totpCode: parallelBackup.backupCode,
          ipAddress,
        }),
      ),
    );
    assert.equal(parallelResults.filter((result) => result.ok).length, 1);
  });

  async function createCustomer(options: { secret?: string } = {}) {
    const email = `phase6-${crypto.randomUUID()}@example.invalid`;
    const user = await owner.customerUser.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        passwordHash: await hashAccountPassword(password),
        mfaTotpSealed: options.secret ? sealTotpSecret(options.secret) : null,
      },
      select: { id: true, email: true },
    });
    customers.add(user.id);
    return user;
  }

  async function createOperator() {
    const email = `phase6-${crypto.randomUUID()}@example.invalid`;
    const secret = generateTotpSecret();
    const backupCode = makeBackupCodes(1)[0]!;
    const operator = await owner.platformOperator.create({
      data: {
        email,
        passwordHash: await hashAccountPassword(password),
        role: 'OPERATOR',
        mfaTotpSealed: sealTotpSecret(secret),
      },
      select: { id: true, email: true },
    });
    operators.add(operator.id);
    await owner.platformOperatorBackupCode.create({
      data: { operatorId: operator.id, codeHash: hashBackupCode(operator.id, backupCode) },
    });
    return { operator, secret, backupCode };
  }

  function invalidTotpCode(secret: string): string {
    for (let candidate = 0; candidate < 1_000_000; candidate++) {
      const code = String(candidate).padStart(6, '0');
      if (getTotpStep(secret, code) === null) return code;
    }
    throw new Error('Unable to generate an invalid TOTP test code.');
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
    for (const character of value) {
      bits += alphabet.indexOf(character).toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let index = 0; index + 8 <= bits.length; index += 8) {
      bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
    }
    return Buffer.from(bytes);
  }
});

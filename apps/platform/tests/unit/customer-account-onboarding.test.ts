import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '@/server/db/prisma';
import {
  registerCustomerAccount,
  verifyCustomerEmailCode,
  resendCustomerVerificationCode,
} from '@/server/accounts/account-service';
import {
  generateVerificationCode,
  hashVerificationCode,
  maskEmail,
  assertValidGstin,
} from '@/server/auth/account-security';

describe('Stage 1: Customer Account Onboarding & Verification Primitives', () => {
  process.env.ORBITOX_BREACHED_PASSWORD_API = 'off';
  process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');
  process.env.DATABASE_URL ||= process.env.TEST_DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';

  it('generates a valid 6-digit verification code and secure hash', () => {
    const code = generateVerificationCode();
    assert.match(code, /^\d{6}$/);

    const email = 'priya@shahgroup.in';
    const hash1 = hashVerificationCode(email, code);
    const hash2 = hashVerificationCode('PRIYA@SHAHGROUP.IN ', code);
    assert.equal(hash1, hash2, 'Code hash must normalize email');
    assert.equal(hash1.length, 64, 'SHA-256 hash must be 64 hex characters');

    assert.throws(
      () => hashVerificationCode(email, '12345'),
      /Verification code must be exactly 6 digits/,
    );
    assert.throws(
      () => hashVerificationCode(email, '1234567'),
      /Verification code must be exactly 6 digits/,
    );
    assert.throws(
      () => hashVerificationCode(email, 'abcdef'),
      /Verification code must be exactly 6 digits/,
    );
  });

  it('correctly masks email for privacy display', () => {
    assert.equal(maskEmail('priya@shahgroup.in'), 'pr***@shahgroup.in');
    assert.equal(maskEmail('a@test.com'), 'a***@test.com');
    assert.equal(maskEmail('rahul.verma@example.org'), 'ra***@example.org');
  });

  it('validates Indian GSTIN format and state codes', () => {
    // Valid Karnataka GSTIN
    const validResult = assertValidGstin('29ABCDE1234F1Z5');
    assert.equal(validResult.valid, true);
    assert.equal(validResult.stateCode, '29');
    assert.equal(validResult.stateName, 'Karnataka');

    // Valid Delhi GSTIN
    const delhiResult = assertValidGstin('07AAAAA0000A1Z5');
    assert.equal(delhiResult.valid, true);
    assert.equal(delhiResult.stateName, 'Delhi');

    // Invalid format
    const invalidFormat = assertValidGstin('12345');
    assert.equal(invalidFormat.valid, false);
    assert.match(invalidFormat.error || '', /15 characters/);

    // Invalid state code
    const invalidState = assertValidGstin('99ABCDE1234F1Z5');
    assert.equal(invalidState.valid, false);
    assert.match(invalidState.error || '', /Invalid GST state code/);
  });

  it('registers a customer account with profile fields and dispatches 6-digit code', async () => {
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const email = `priya_${randomSuffix}@shahgroup.in`;
    const password = 'SuperSecurePassword2026!';
    const name = 'Priya Shah';
    const phone = '+91 98450 12345';

    const result = await registerCustomerAccount({
      name,
      email,
      phone,
      password,
      baseUrl: 'https://orbitox.io',
    });

    assert.equal(result.status, 202);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.email, maskEmail(email));

    // Verify user record
    const user = await prisma.customerUser.findFirst({
      where: { email },
    });
    assert.ok(user, 'Customer user must be persisted in database');
    assert.equal(user.name, name);
    assert.equal(user.phone, phone);
    assert.equal(user.status, 'ACTIVE');
    assert.equal(user.emailVerifiedAt, null, 'Must start with emailVerifiedAt = null');

    // Verify NO organization was created during F1
    const memberships = await prisma.customerMembership.findMany({
      where: { userId: user.id },
    });
    assert.equal(memberships.length, 0, 'No organization or membership should exist after F1');

    // Verify AccountToken exists with purpose VERIFY_EMAIL
    const token = await prisma.accountToken.findFirst({
      where: { userId: user.id, purpose: 'VERIFY_EMAIL' },
    });
    assert.ok(token, 'Verification token must exist');
    assert.equal(token.usedAt, null);

    // Verify outbox entry
    const outbox = await prisma.accountEmailOutbox.findFirst({
      where: { recipient: email, template: 'VERIFY_EMAIL' },
    });
    assert.ok(outbox, 'Verification email must be enqueued in outbox');
  });

  it('verifies account with valid 6-digit code and creates active customer session', async () => {
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const email = `priya_verify_${randomSuffix}@shahgroup.in`;
    const password = 'SuperSecurePassword2026!';
    const code = '789123';
    const tokenHash = hashVerificationCode(email, code);

    // Seed unverified user directly with deterministic code
    const user = await prisma.customerUser.create({
      data: {
        name: 'Priya Verify',
        email,
        phone: '+91 98450 99999',
        passwordHash: 'dummy_hash',
        status: 'ACTIVE',
      },
    });

    await prisma.accountToken.create({
      data: {
        tokenHash,
        purpose: 'VERIFY_EMAIL',
        userId: user.id,
        email,
        expiresAt: new Date(Date.now() + 600 * 1000),
      },
    });

    // 1. Wrong code fails
    const wrongAttempt = await verifyCustomerEmailCode({
      email,
      code: '000000',
      ipAddress: '127.0.0.1',
    });
    assert.equal(wrongAttempt.ok, false);

    // 2. Correct code succeeds
    const correctAttempt = await verifyCustomerEmailCode({
      email,
      code,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 TestAgent',
    });
    assert.equal(correctAttempt.ok, true);
    if (correctAttempt.ok) {
      assert.equal(correctAttempt.user.email, email);
      assert.equal(correctAttempt.user.name, 'Priya Verify');
      assert.equal(correctAttempt.user.emailVerified, true);
      assert.ok(correctAttempt.sessionToken, 'Must issue session token');
      assert.ok(correctAttempt.csrfToken, 'Must issue CSRF token');
    }

    // Check DB state
    const updatedUser = await prisma.customerUser.findUnique({
      where: { id: user.id },
    });
    assert.ok(updatedUser?.emailVerifiedAt, 'User emailVerifiedAt must be set');

    // 3. Security invariant: Replay of consumed code MUST FAIL and issue ZERO sessions
    const replayAttempt = await verifyCustomerEmailCode({
      email,
      code,
      ipAddress: '127.0.0.1',
    });
    assert.equal(replayAttempt.ok, false);
    assert.equal((replayAttempt as any).code, 'ACCOUNT_ALREADY_VERIFIED');
    assert.equal((replayAttempt as any).sessionToken, undefined);

    // 4. Security invariant: Arbitrary code against already verified account MUST FAIL
    const arbitraryAttempt = await verifyCustomerEmailCode({
      email,
      code: '999999',
      ipAddress: '127.0.0.1',
    });
    assert.equal(arbitraryAttempt.ok, false);
    assert.equal((arbitraryAttempt as any).code, 'ACCOUNT_ALREADY_VERIFIED');
    assert.equal((arbitraryAttempt as any).sessionToken, undefined);

    // 5. Security invariant: Code belonging to another email MUST FAIL
    const wrongEmailAttempt = await verifyCustomerEmailCode({
      email: 'attacker@evil.corp',
      code,
      ipAddress: '127.0.0.1',
    });
    assert.equal(wrongEmailAttempt.ok, false);
    assert.equal((wrongEmailAttempt as any).sessionToken, undefined);
  });

  it('handles expired verification codes and resend flow', async () => {
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const email = `priya_expired_${randomSuffix}@shahgroup.in`;
    const code = '112233';
    const tokenHash = hashVerificationCode(email, code);

    // Create user with already-expired code
    const user = await prisma.customerUser.create({
      data: {
        name: 'Priya Expired',
        email,
        phone: '+91 98450 88888',
        passwordHash: 'dummy_hash',
        status: 'ACTIVE',
      },
    });

    await prisma.accountToken.create({
      data: {
        tokenHash,
        purpose: 'VERIFY_EMAIL',
        userId: user.id,
        email,
        createdAt: new Date(Date.now() - 120 * 1000),
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago, but after createdAt
      },
    });

    // Verification fails due to expiration
    const expiredAttempt = await verifyCustomerEmailCode({
      email,
      code,
      ipAddress: '127.0.0.1',
    });
    assert.equal(expiredAttempt.ok, false);
    assert.equal(expiredAttempt.code, 'INVALID_OR_EXPIRED_CODE');

    // Trigger resend
    const resendResult = await resendCustomerVerificationCode({
      email,
      baseUrl: 'https://orbitox.io',
    });
    assert.equal(resendResult.ok, true);

    // Verify fresh token exists in DB
    const freshToken = await prisma.accountToken.findFirst({
      where: { userId: user.id, purpose: 'VERIFY_EMAIL', usedAt: null },
    });
    assert.ok(freshToken, 'Fresh verification token must be created');
    assert.notEqual(freshToken.tokenHash, tokenHash, 'Must have a new token hash');
    assert.ok(freshToken.expiresAt > new Date(), 'New token must have future expiry');
  });

  it('prevents concurrent double-consumption of a single verification code', async () => {
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const email = `priya_race_${randomSuffix}@shahgroup.in`;
    const code = '654321';
    const tokenHash = hashVerificationCode(email, code);

    const user = await prisma.customerUser.create({
      data: {
        name: 'Priya Race',
        email,
        phone: '+91 98450 77777',
        passwordHash: 'dummy_hash',
        status: 'ACTIVE',
      },
    });

    await prisma.accountToken.create({
      data: {
        tokenHash,
        purpose: 'VERIFY_EMAIL',
        userId: user.id,
        email,
        expiresAt: new Date(Date.now() + 600 * 1000),
      },
    });

    // Fire 5 concurrent requests with the same code
    const results = await Promise.all([
      verifyCustomerEmailCode({ email, code, ipAddress: '127.0.0.1' }),
      verifyCustomerEmailCode({ email, code, ipAddress: '127.0.0.1' }),
      verifyCustomerEmailCode({ email, code, ipAddress: '127.0.0.1' }),
      verifyCustomerEmailCode({ email, code, ipAddress: '127.0.0.1' }),
      verifyCustomerEmailCode({ email, code, ipAddress: '127.0.0.1' }),
    ]);

    const successes = results.filter((r) => r.ok === true);
    const failures = results.filter((r) => r.ok === false);

    assert.equal(successes.length, 1, 'Exactly one concurrent request must succeed');
    assert.equal(failures.length, 4, 'All other concurrent requests must fail');
  });
});

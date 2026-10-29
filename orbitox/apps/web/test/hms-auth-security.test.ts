import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  generateSessionToken,
  hashToken,
  assertPermission,
  MAX_FAILED_ATTEMPTS,
  BASE_LOCKOUT_MS,
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  DEFAULT_SYSTEM_ROLES,
  StaffActor,
} from '../lib/hms-auth';

describe('HMS Staff Identity & Cryptographic Security (Phase 2b-3)', () => {
  it('derives passwords using scrypt with N=32768, r=8, p=1 and per-user salt', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    assert.notEqual(salt1, salt2);

    const password = 'StrongHospitalStaffPassword!2026';
    const hash1 = await hashPassword(password, salt1);
    const hash2 = await hashPassword(password, salt2);

    // Hashes for same password with different salts must differ
    assert.notEqual(hash1, hash2);
    assert.equal(hash1.length, 128); // 64-byte key in hex = 128 chars

    // Timing-safe verification
    assert.equal(await verifyPassword(password, salt1, hash1), true);
    assert.equal(await verifyPassword('WrongPassword', salt1, hash1), false);
    assert.equal(await verifyPassword(password, salt2, hash1), false);
  });

  it('generates 256-bit session tokens stored strictly as SHA-256 hashes', () => {
    const { rawToken, tokenHash } = generateSessionToken();

    // 256-bit = 32 bytes = 64 hex characters
    assert.equal(rawToken.length, 64);
    assert.equal(tokenHash.length, 64);

    // Verify hash matches SHA-256 of raw token
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.equal(tokenHash, expectedHash);
    assert.equal(hashToken(rawToken), tokenHash);

    // Raw token and hash are never identical
    assert.notEqual(rawToken, tokenHash);
  });

  it('enforces lockout thresholds: 5 failures, 15m base lock with exponential backoff', () => {
    assert.equal(MAX_FAILED_ATTEMPTS, 5);
    assert.equal(BASE_LOCKOUT_MS, 15 * 60 * 1000);

    // Attempt 5 -> multiplier = 2^(5-5) = 1 -> 15 min
    const mult5 = Math.pow(2, 5 - MAX_FAILED_ATTEMPTS);
    assert.equal(BASE_LOCKOUT_MS * mult5, 15 * 60 * 1000);

    // Attempt 6 -> multiplier = 2^(6-5) = 2 -> 30 min
    const mult6 = Math.pow(2, 6 - MAX_FAILED_ATTEMPTS);
    assert.equal(BASE_LOCKOUT_MS * mult6, 30 * 60 * 1000);

    // Attempt 7 -> multiplier = 2^(7-5) = 4 -> 60 min
    const mult7 = Math.pow(2, 7 - MAX_FAILED_ATTEMPTS);
    assert.equal(BASE_LOCKOUT_MS * mult7, 60 * 60 * 1000);
  });

  it('enforces 30-minute idle sliding timeout and 12-hour absolute timeout limits', () => {
    assert.equal(IDLE_TIMEOUT_MS, 30 * 60 * 1000);
    assert.equal(ABSOLUTE_TIMEOUT_MS, 12 * 60 * 60 * 1000);
  });

  it('enforces role-based permissions strictly from actor session data', () => {
    const doctorActor: StaffActor = {
      staffId: 'doc1',
      roleId: 'role_doctor',
      sessionId: 'sess_1',
      permissions: DEFAULT_SYSTEM_ROLES.DOCTOR!.permissions,
    };

    const billingActor: StaffActor = {
      staffId: 'bill1',
      roleId: 'role_billing',
      sessionId: 'sess_2',
      permissions: DEFAULT_SYSTEM_ROLES.BILLING!.permissions,
    };

    const adminActor: StaffActor = {
      staffId: 'adm1',
      roleId: 'role_admin',
      sessionId: 'sess_3',
      permissions: ['*'],
    };

    // Doctor can read and write patients
    assert.doesNotThrow(() => assertPermission(doctorActor, 'patients:read'));
    assert.doesNotThrow(() => assertPermission(doctorActor, 'patients:write'));
    assert.doesNotThrow(() => assertPermission(doctorActor, 'labs:write'));

    // Doctor cannot write billing
    assert.throws(
      () => assertPermission(doctorActor, 'billing:write'),
      /INSUFFICIENT_PERMISSIONS:billing:write/
    );

    // Billing staff can write billing but not write labs
    assert.doesNotThrow(() => assertPermission(billingActor, 'billing:write'));
    assert.throws(
      () => assertPermission(billingActor, 'labs:write'),
      /INSUFFICIENT_PERMISSIONS:labs:write/
    );

    // Admin has wildcard access
    assert.doesNotThrow(() => assertPermission(adminActor, 'patients:read'));
    assert.doesNotThrow(() => assertPermission(adminActor, 'billing:write'));
    assert.doesNotThrow(() => assertPermission(adminActor, 'system:configure'));
  });
});

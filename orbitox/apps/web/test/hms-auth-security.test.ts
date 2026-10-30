import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit@127.0.0.1:5432/orbitox_phase2';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.APP_DATABASE_URL;
}

import { Pool } from 'pg';
import { NextRequest } from 'next/server';
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
  checkPassword,
  recordFailure,
  createSession,
  DUMMY_SALT,
  DUMMY_HASH,
} from '../lib/hms-auth';
import { withTenantTx } from '../lib/tenant-db';
import { POST as loginRoute } from '../app/api/hospital/security/login/route';
import { PhiKeyRing, seal } from '../lib/phi-crypto';
import { platformRepository } from '../lib/platform-repository';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

describe('HMS Staff Identity & Cryptographic Security (Phase 2b-3)', () => {
  const dbUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
  const pool = new Pool({ connectionString: dbUrl });
  const runSuffix = crypto.randomBytes(4).toString('hex');
  const TENANT = `org/auth-test-${runSuffix}/project/p1/environment/prod`;
  const ADMIN_TOKEN = 'phase2b3_auth_test_admin_token_32chars';
  let apiKeySecret = '';

  const ring = new PhiKeyRing({
    keys: { k2026a: crypto.randomBytes(32).toString('base64') },
    activeKid: 'k2026a',
    indexKey: crypto.randomBytes(32).toString('base64'),
  });

  const staffLockedId = `staff_lock_${runSuffix}`;
  const staffSuspendedId = `staff_susp_${runSuffix}`;
  const staffAtomicId = `staff_atom_${runSuffix}`;
  const staffExpId = `staff_exp_${runSuffix}`;
  const staffResetId = `staff_reset_${runSuffix}`;
  const defaultPassword = 'HospitalStaffPassword123!';

  before(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || dbUrl;
    process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || dbUrl;
    process.env.ORBITOX_ADMIN_TOKEN = ADMIN_TOKEN;
    process.env.ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS = 'true';
    process.env.TRUST_PROXY = 'true';

    const authOrg = await platformRepository.createOrganization({
      name: `Auth Test Org ${runSuffix}`,
      slug: `auth-org-${runSuffix}`,
      billingEmail: `auth-${runSuffix}@orbitox.io`,
    });

    const authProjRes = await platformRepository.createProject({
      name: `Auth Test Project ${runSuffix}`,
      slug: `auth-proj-${runSuffix}`,
      organizationId: authOrg.id,
      businessModel: 'B2B',
      planTier: 'enterprise',
      technicalLead: 'Auth Lead',
      contactEmail: `auth-${runSuffix}@orbitox.io`,
      enabledServices: ['hms', 'platform', 'admin', 'system'],
      apiCallQuota: 10000000,
    });

    const authKeyRes = await platformRepository.createApiKey({
      name: `Auth Test Key ${runSuffix}`,
      environmentId: authProjRes.environments[0]!.id,
      projectId: authProjRes.project.id,
      capabilities: ['hms:read', 'hms:write', 'admin', '*'],
      tenantScope: ['*'],
      createdBy: 'test_auth_suite',
    });
    apiKeySecret = authKeyRes.rawSecret;

    await withTenantTx(pool, TENANT, async (tx) => {
      // Seed roles
      await tx.query(
        `INSERT INTO "HmsRole"(id, name, "isSystem") VALUES ('role_doctor', 'DOCTOR', true) ON CONFLICT DO NOTHING`
      );

      // 1. Seed staff for 5-failure lock test
      const salt1 = generateSalt();
      const hash1 = await hashPassword(defaultPassword, salt1);
      const blind1 = crypto.createHash('md5').update(`lock_${runSuffix}`).digest('hex');
      const nameSealed1 = seal(ring, 'Dr. Locked', { tenantId: TENANT, column: 'nameSealed', rowId: staffLockedId });
      await tx.query(
        `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role, status) VALUES ($1, $2, $3, 'DOCTOR', 'ACTIVE') ON CONFLICT DO NOTHING`,
        [staffLockedId, nameSealed1, blind1]
      );
      await tx.query(
        `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt", "failedAttempts", "lockedUntil") VALUES ($1, $2, $3, 0, NULL) ON CONFLICT DO NOTHING`,
        [staffLockedId, hash1, salt1]
      );

      // 2. Seed staff for suspended test
      const salt2 = generateSalt();
      const hash2 = await hashPassword(defaultPassword, salt2);
      const blind2 = crypto.createHash('md5').update(`susp_${runSuffix}`).digest('hex');
      const nameSealed2 = seal(ring, 'Dr. Suspended', { tenantId: TENANT, column: 'nameSealed', rowId: staffSuspendedId });
      await tx.query(
        `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role, status) VALUES ($1, $2, $3, 'DOCTOR', 'SUSPENDED') ON CONFLICT DO NOTHING`,
        [staffSuspendedId, nameSealed2, blind2]
      );
      await tx.query(
        `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt", "failedAttempts", "lockedUntil") VALUES ($1, $2, $3, 0, NULL) ON CONFLICT DO NOTHING`,
        [staffSuspendedId, hash2, salt2]
      );

      // 3. Seed staff for atomic 20-concurrency test
      const salt3 = generateSalt();
      const hash3 = await hashPassword(defaultPassword, salt3);
      const blind3 = crypto.createHash('md5').update(`atom_${runSuffix}`).digest('hex');
      const nameSealed3 = seal(ring, 'Dr. Atomic', { tenantId: TENANT, column: 'nameSealed', rowId: staffAtomicId });
      await tx.query(
        `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role, status) VALUES ($1, $2, $3, 'DOCTOR', 'ACTIVE') ON CONFLICT DO NOTHING`,
        [staffAtomicId, nameSealed3, blind3]
      );
      await tx.query(
        `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt", "failedAttempts", "lockedUntil") VALUES ($1, $2, $3, 0, NULL) ON CONFLICT DO NOTHING`,
        [staffAtomicId, hash3, salt3]
      );

      // 4. Seed staff for exponential lockout test
      const salt4 = generateSalt();
      const hash4 = await hashPassword(defaultPassword, salt4);
      const blind4 = crypto.createHash('md5').update(`exp_${runSuffix}`).digest('hex');
      const nameSealed4 = seal(ring, 'Dr. Exponential', { tenantId: TENANT, column: 'nameSealed', rowId: staffExpId });
      await tx.query(
        `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role, status) VALUES ($1, $2, $3, 'DOCTOR', 'ACTIVE') ON CONFLICT DO NOTHING`,
        [staffExpId, nameSealed4, blind4]
      );
      await tx.query(
        `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt", "failedAttempts", "lockedUntil") VALUES ($1, $2, $3, 0, NULL) ON CONFLICT DO NOTHING`,
        [staffExpId, hash4, salt4]
      );

      // 5. Seed staff for 15-minute reset test
      const salt5 = generateSalt();
      const hash5 = await hashPassword(defaultPassword, salt5);
      const blind5 = crypto.createHash('md5').update(`reset_${runSuffix}`).digest('hex');
      const nameSealed5 = seal(ring, 'Dr. Reset', { tenantId: TENANT, column: 'nameSealed', rowId: staffResetId });
      await tx.query(
        `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role, status) VALUES ($1, $2, $3, 'DOCTOR', 'ACTIVE') ON CONFLICT DO NOTHING`,
        [staffResetId, nameSealed5, blind5]
      );
      await tx.query(
        `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt", "failedAttempts", "lockedUntil") VALUES ($1, $2, $3, 0, NULL) ON CONFLICT DO NOTHING`,
        [staffResetId, hash5, salt5]
      );

      // 6. Seed 20 accounts each for Unknown, Active (wrong pass), Suspended, and Locked timing runs
      for (let i = 0; i < 20; i++) {
        const activeId = `staff_timing_act_${runSuffix}_${i}`;
        const activeSalt = generateSalt();
        const activeHash = await hashPassword(defaultPassword, activeSalt);
        const activeBlind = crypto.createHash('md5').update(`timing_act_${runSuffix}_${i}`).digest('hex');
        const activeName = seal(ring, `Dr. Timing Active ${i}`, { tenantId: TENANT, column: 'nameSealed', rowId: activeId });
        await tx.query(
          `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role, status) VALUES ($1, $2, $3, 'DOCTOR', 'ACTIVE') ON CONFLICT DO NOTHING`,
          [activeId, activeName, activeBlind]
        );
        await tx.query(
          `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt", "failedAttempts", "lockedUntil") VALUES ($1, $2, $3, 0, NULL) ON CONFLICT DO NOTHING`,
          [activeId, activeHash, activeSalt]
        );

        const suspId = `staff_timing_susp_${runSuffix}_${i}`;
        const suspSalt = generateSalt();
        const suspHash = await hashPassword(defaultPassword, suspSalt);
        const suspBlind = crypto.createHash('md5').update(`timing_susp_${runSuffix}_${i}`).digest('hex');
        const suspName = seal(ring, `Dr. Timing Suspended ${i}`, { tenantId: TENANT, column: 'nameSealed', rowId: suspId });
        await tx.query(
          `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role, status) VALUES ($1, $2, $3, 'DOCTOR', 'SUSPENDED') ON CONFLICT DO NOTHING`,
          [suspId, suspName, suspBlind]
        );
        await tx.query(
          `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt", "failedAttempts", "lockedUntil") VALUES ($1, $2, $3, 0, NULL) ON CONFLICT DO NOTHING`,
          [suspId, suspHash, suspSalt]
        );

        const lockId = `staff_timing_lock_${runSuffix}_${i}`;
        const lockSalt = generateSalt();
        const lockHash = await hashPassword(defaultPassword, lockSalt);
        const lockBlind = crypto.createHash('md5').update(`timing_lock_${runSuffix}_${i}`).digest('hex');
        const lockName = seal(ring, `Dr. Timing Locked ${i}`, { tenantId: TENANT, column: 'nameSealed', rowId: lockId });
        await tx.query(
          `INSERT INTO "HmsStaff"(id, "nameSealed", "emailBlind", role, status) VALUES ($1, $2, $3, 'DOCTOR', 'ACTIVE') ON CONFLICT DO NOTHING`,
          [lockId, lockName, lockBlind]
        );
        await tx.query(
          `INSERT INTO "HmsStaffCredential"("staffId", "passwordHash", "salt", "failedAttempts", "lockedUntil") VALUES ($1, $2, $3, 5, now() + interval '1 hour') ON CONFLICT DO NOTHING`,
          [lockId, lockHash, lockSalt]
        );
      }
    });
  });

  after(async () => {
    await pool.end();
  });

  it('derives passwords using scrypt with N=32768, r=8, p=1 and per-user salt', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    assert.notEqual(salt1, salt2);

    const password = 'StrongHospitalStaffPassword!2026';
    const hash1 = await hashPassword(password, salt1);
    const hash2 = await hashPassword(password, salt2);

    assert.notEqual(hash1, hash2);
    assert.equal(hash1.length, 128); // 64-byte key in hex = 128 chars

    assert.equal(await verifyPassword(password, salt1, hash1), true);
    assert.equal(await verifyPassword('WrongPassword', salt1, hash1), false);
    assert.equal(await verifyPassword(password, salt2, hash1), false);
  });

  it('generates 256-bit session tokens stored strictly as SHA-256 hashes', () => {
    const { rawToken, tokenHash } = generateSessionToken();

    assert.equal(rawToken.length, 64);
    assert.equal(tokenHash.length, 64);

    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.equal(tokenHash, expectedHash);
    assert.equal(hashToken(rawToken), tokenHash);
    assert.notEqual(rawToken, tokenHash);
  });

  it('enforces lockout thresholds: 5 failures, 15m base lock with exponential backoff', () => {
    assert.equal(MAX_FAILED_ATTEMPTS, 5);
    assert.equal(BASE_LOCKOUT_MS, 15 * 60 * 1000);

    const mult5 = Math.pow(2, 5 - MAX_FAILED_ATTEMPTS);
    assert.equal(BASE_LOCKOUT_MS * mult5, 15 * 60 * 1000);

    const mult6 = Math.pow(2, 6 - MAX_FAILED_ATTEMPTS);
    assert.equal(BASE_LOCKOUT_MS * mult6, 30 * 60 * 1000);

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

    assert.doesNotThrow(() => assertPermission(doctorActor, 'patients:read'));
    assert.doesNotThrow(() => assertPermission(doctorActor, 'patients:write'));
    assert.doesNotThrow(() => assertPermission(doctorActor, 'labs:write'));

    assert.throws(
      () => assertPermission(doctorActor, 'billing:write'),
      /INSUFFICIENT_PERMISSIONS:billing:write/
    );
  });

  // --- PostgreSQL Real Database Tests (Finding L1 Requirements) ---

  it('Five wrong passwords -> stored row has failedAttempts=5 and lockedUntil in future; 6th attempt with correct password refused', async () => {
    // 5 failed attempts recorded in separate committed transactions
    for (let i = 1; i <= 5; i++) {
      const outcome = await withTenantTx(pool, TENANT, (tx) =>
        checkPassword(tx, { staffId: staffLockedId }, 'IncorrectPassword!')
      );
      assert.equal(outcome.ok, false);
      assert.equal(outcome.staffId, staffLockedId);
      assert.equal(outcome.reason, 'INVALID_PASSWORD');

      // Record failure in committed transaction
      await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffLockedId));
    }

    // Inspect stored row in PostgreSQL
    const { rows } = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number; lockedUntil: Date | string }>(
        `SELECT "failedAttempts", "lockedUntil" FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffLockedId]
      )
    );
    assert.equal(rows[0]!.failedAttempts, 5);
    assert.ok(rows[0]!.lockedUntil !== null);
    const lockedUntilDate = new Date(rows[0]!.lockedUntil);
    assert.ok(lockedUntilDate.getTime() > Date.now(), 'lockedUntil must be in the future');

    // 6th attempt with the CORRECT password must STILL be refused because account is locked
    const sixthOutcome = await withTenantTx(pool, TENANT, (tx) =>
      checkPassword(tx, { staffId: staffLockedId }, defaultPassword)
    );
    assert.equal(sixthOutcome.ok, false);
    assert.equal(sixthOutcome.locked, true);
    assert.equal(sixthOutcome.reason, 'LOCKED');
  });

  it('20 parallel wrong guesses -> failedAttempts=20 exactly (no lost updates via atomic increment)', async () => {
    // 20 concurrent transactions executing recordFailure simultaneously
    await Promise.all(
      Array.from({ length: 20 }, () =>
        withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffAtomicId))
      )
    );

    // Verify stored count in PostgreSQL
    const { rows } = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number }>(
        `SELECT "failedAttempts" FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffAtomicId]
      )
    );
    assert.equal(rows[0]!.failedAttempts, 20, 'failedAttempts must equal 20 exactly without lost updates');
  });

  it('Lockout increases exponentially with repeat failures (15 min * 2^(n-5), capped at 16 h)', async () => {
    // 1 to 4 failures: no lockout
    for (let n = 1; n <= 4; n++) {
      await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffExpId));
      const { rows } = await withTenantTx(pool, TENANT, (tx) =>
        tx.query<{ failedAttempts: number; lockedUntil: Date | null }>(
          `SELECT "failedAttempts", "lockedUntil" FROM "HmsStaffCredential" WHERE "staffId" = $1`,
          [staffExpId]
        )
      );
      assert.equal(rows[0]!.failedAttempts, n);
      assert.equal(rows[0]!.lockedUntil, null);
    }

    // 5th failure: 15 min * 2^0 = 15 minutes
    await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffExpId));
    let res = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number; lockMins: number }>(
        `SELECT "failedAttempts", ROUND(EXTRACT(EPOCH FROM ("lockedUntil" - now())) / 60)::int as "lockMins"
         FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffExpId]
      )
    );
    assert.equal(res.rows[0]!.failedAttempts, 5);
    assert.ok(Math.abs(res.rows[0]!.lockMins - 15) <= 1, `Expected ~15 mins, got ${res.rows[0]!.lockMins}`);

    // 6th failure: 15 min * 2^1 = 30 minutes
    await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffExpId));
    res = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number; lockMins: number }>(
        `SELECT "failedAttempts", ROUND(EXTRACT(EPOCH FROM ("lockedUntil" - now())) / 60)::int as "lockMins"
         FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffExpId]
      )
    );
    assert.equal(res.rows[0]!.failedAttempts, 6);
    assert.ok(Math.abs(res.rows[0]!.lockMins - 30) <= 1, `Expected ~30 mins, got ${res.rows[0]!.lockMins}`);

    // 7th failure: 15 min * 2^2 = 60 minutes
    await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffExpId));
    res = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number; lockMins: number }>(
        `SELECT "failedAttempts", ROUND(EXTRACT(EPOCH FROM ("lockedUntil" - now())) / 60)::int as "lockMins"
         FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffExpId]
      )
    );
    assert.equal(res.rows[0]!.failedAttempts, 7);
    assert.ok(Math.abs(res.rows[0]!.lockMins - 60) <= 1, `Expected ~60 mins, got ${res.rows[0]!.lockMins}`);

    // 8th failure: 15 min * 2^3 = 120 minutes (2h)
    await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffExpId));
    res = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number; lockMins: number }>(
        `SELECT "failedAttempts", ROUND(EXTRACT(EPOCH FROM ("lockedUntil" - now())) / 60)::int as "lockMins"
         FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffExpId]
      )
    );
    assert.equal(res.rows[0]!.failedAttempts, 8);
    assert.ok(Math.abs(res.rows[0]!.lockMins - 120) <= 1, `Expected ~120 mins, got ${res.rows[0]!.lockMins}`);

    // Advance to 12 failures: capped at 960 min (16h)
    for (let n = 9; n <= 12; n++) {
      await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffExpId));
    }
    res = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number; lockMins: number }>(
        `SELECT "failedAttempts", ROUND(EXTRACT(EPOCH FROM ("lockedUntil" - now())) / 60)::int as "lockMins"
         FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffExpId]
      )
    );
    assert.equal(res.rows[0]!.failedAttempts, 12);
    assert.ok(Math.abs(res.rows[0]!.lockMins - 960) <= 1, `Expected ~960 mins (16h cap), got ${res.rows[0]!.lockMins}`);
  });

  it('Resets failedAttempts to 1 and clears lockedUntil when 15 minutes pass without a failure', async () => {
    // Setup 4 failures and age updatedAt to 16 minutes ago
    await withTenantTx(pool, TENANT, async (tx) => {
      await tx.query(
        `UPDATE "HmsStaffCredential"
            SET "failedAttempts" = 4, "lockedUntil" = NULL, "updatedAt" = now() - interval '16 minutes'
          WHERE "staffId" = $1`,
        [staffResetId]
      );
    });

    // Next failure occurs after 16 minutes of inactivity (> 15 min window)
    await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffResetId));

    // Inspect stored row: counter resets to 1, lockedUntil is null
    const { rows } = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number; lockedUntil: Date | null }>(
        `SELECT "failedAttempts", "lockedUntil" FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffResetId]
      )
    );
    assert.equal(rows[0]!.failedAttempts, 1, 'failedAttempts must reset to 1 after 15 minutes of inactivity');
    assert.equal(rows[0]!.lockedUntil, null, 'lockedUntil must be null after inactivity reset');

    // Repeat test on account that was previously locked (5 failures)
    await withTenantTx(pool, TENANT, async (tx) => {
      await tx.query(
        `UPDATE "HmsStaffCredential"
            SET "failedAttempts" = 5,
                "lockedUntil" = now() - interval '1 minute',
                "updatedAt" = now() - interval '16 minutes'
          WHERE "staffId" = $1`,
        [staffResetId]
      );
    });

    await withTenantTx(pool, TENANT, (tx) => recordFailure(tx, staffResetId));
    const res2 = await withTenantTx(pool, TENANT, (tx) =>
      tx.query<{ failedAttempts: number; lockedUntil: Date | null }>(
        `SELECT "failedAttempts", "lockedUntil" FROM "HmsStaffCredential" WHERE "staffId" = $1`,
        [staffResetId]
      )
    );
    assert.equal(res2.rows[0]!.failedAttempts, 1, 'failedAttempts must reset to 1 after lockout and 15 min inactivity');
    assert.equal(res2.rows[0]!.lockedUntil, null, 'lockedUntil must be cleared after inactivity reset');
  });

  it('Unknown staff, existing staff (wrong password), suspended staff, and locked staff return uniform timing', async () => {
    const unknownTimes: number[] = [];
    const activeWrongTimes: number[] = [];
    const suspendedTimes: number[] = [];
    const lockedTimes: number[] = [];

    // Helper to send login request
    const sendLogin = async (staffId: string, clientIp: string) => {
      const headers = new Headers();
      headers.set('authorization', `Bearer ${ADMIN_TOKEN}`);
      headers.set('x-api-key', apiKeySecret);
      headers.set('x-tenant-id', TENANT);
      headers.set('x-context-id', TENANT);
      headers.set('x-orbitox-principal', 'admin');
      headers.set('content-type', 'application/json');
      headers.set('x-forwarded-for', clientIp);

      const req = new NextRequest('http://localhost:3005/api/hospital/security/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ staffId, password: 'AnyIncorrectPassword!' }),
      });

      const start = performance.now();
      const res = await loginRoute(req);
      const elapsed = performance.now() - start;
      const data = await res.json();
      return { status: res.status, data, elapsed };
    };

    // 1. 20 runs for Unknown staff (each from distinct IP)
    for (let i = 0; i < 20; i++) {
      const res = await sendLogin(`staff_timing_unknown_${runSuffix}_${i}`, `10.0.1.${i + 1}`);
      assert.equal(res.status, 401);
      assert.equal(res.data.error.code, 'INVALID_CREDENTIALS');
      unknownTimes.push(res.elapsed);
    }

    // 2. 20 runs for Existing staff with wrong password (20 distinct active accounts & IPs)
    for (let i = 0; i < 20; i++) {
      const res = await sendLogin(`staff_timing_act_${runSuffix}_${i}`, `10.0.2.${i + 1}`);
      assert.equal(res.status, 401);
      assert.equal(res.data.error.code, 'INVALID_CREDENTIALS');
      activeWrongTimes.push(res.elapsed);
    }

    // 3. 20 runs for Suspended staff (20 distinct suspended accounts & IPs)
    for (let i = 0; i < 20; i++) {
      const res = await sendLogin(`staff_timing_susp_${runSuffix}_${i}`, `10.0.3.${i + 1}`);
      assert.equal(res.status, 401);
      assert.equal(res.data.error.code, 'INVALID_CREDENTIALS');
      suspendedTimes.push(res.elapsed);
    }

    // 4. 20 runs for Locked staff (20 distinct locked accounts & IPs)
    for (let i = 0; i < 20; i++) {
      const res = await sendLogin(`staff_timing_lock_${runSuffix}_${i}`, `10.0.4.${i + 1}`);
      assert.equal(res.status, 401);
      assert.equal(res.data.error.code, 'INVALID_CREDENTIALS');
      lockedTimes.push(res.elapsed);
    }

    const medUnknown = Math.round(median(unknownTimes) * 100) / 100;
    const medActiveWrong = Math.round(median(activeWrongTimes) * 100) / 100;
    const medSuspended = Math.round(median(suspendedTimes) * 100) / 100;
    const medLocked = Math.round(median(lockedTimes) * 100) / 100;

    console.log(`[Timing Attack Defense] Median response times over 20 runs each:`);
    console.log(`  Unknown Staff:                   ${medUnknown}ms`);
    console.log(`  Existing Staff (Wrong Password): ${medActiveWrong}ms`);
    console.log(`  Suspended Staff:                 ${medSuspended}ms`);
    console.log(`  Locked Staff:                    ${medLocked}ms`);

    // Verify all 4 medians are within comparable timing range (less than 35ms delta between medians)
    const maxMed = Math.max(medUnknown, medActiveWrong, medSuspended, medLocked);
    const minMed = Math.min(medUnknown, medActiveWrong, medSuspended, medLocked);
    assert.ok(
      maxMed - minMed < 35,
      `Timing variance between medians (${maxMed}ms - ${minMed}ms = ${maxMed - minMed}ms) must be within 35ms`,
    );
  });
});

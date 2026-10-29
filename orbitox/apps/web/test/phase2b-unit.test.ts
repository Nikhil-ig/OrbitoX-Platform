import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PhiKeyRing, seal, open, needsReseal, reseal, blindIndex, PhiCryptoError } from '../lib/phi-crypto';
import { loadPepperRing, activeVerifier, candidateVerifiers, whichPepper } from '../lib/pepper';
import { signBridgeRequest, verifyBridgeRequest, MemoryNonceStore } from '../lib/bridge-signature';
import { demoSeedAllowed, assertDemoSeedAllowed, newTableToken, tableTokenMatches } from '../lib/seed-gate';
import { canonicalJson } from '../lib/idempotency';
import { mapDbError, CONSTRAINT_ERRORS, extractSqlStateAndConstraint } from '../lib/db-errors';

const k = () => crypto.randomBytes(32).toString('base64');
const A = 'org/a/project/p1/environment/prod';
const B = 'org/b/project/p1/environment/prod';
const SEALED_SQL_RE = /^v1\.[A-Za-z0-9_-]{1,32}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/;

describe('phi-crypto', () => {
  const k1 = k(),
    k2 = k(),
    idx = k();
  const ring1 = new PhiKeyRing({ keys: { k1 }, activeKid: 'k1', indexKey: idx });
  const ring2 = new PhiKeyRing({ keys: { k1, k2 }, activeKid: 'k2', indexKey: idx });
  const ref = { tenantId: A, column: 'name', rowId: 'pat1' };

  it('round-trips and matches the SQL ciphertext guard', () => {
    const s = seal(ring1, 'Ravi Kumar', ref);
    assert.match(s, SEALED_SQL_RE);
    assert.equal(open(ring1, s, ref), 'Ravi Kumar');
    assert.notEqual(seal(ring1, 'Ravi Kumar', ref), s, 'random IV: same plaintext, different ciphertext');
  });

  it('binds ciphertext to tenant, column and row (AAD)', () => {
    const s = seal(ring1, 'secret', ref);
    for (const bad of [
      { ...ref, tenantId: B },
      { ...ref, column: 'phone' },
      { ...ref, rowId: 'pat2' },
    ]) {
      assert.throws(() => open(ring1, s, bad), (e: any) => e.code === 'PHI_DECRYPT_FAILED');
    }
  });

  it('detects tampering', () => {
    const s = seal(ring1, 'secret', ref);
    const parts = s.split('.');
    const ct = Buffer.from(parts[4]!, 'base64url');
    ct[0]! ^= 1;
    parts[4] = ct.toString('base64url');
    assert.throws(() => open(ring1, parts.join('.'), ref), (e: any) => e.code === 'PHI_DECRYPT_FAILED');
  });

  it('rotation: old kid still opens, needsReseal, reseal moves to active kid', () => {
    const old = seal(ring1, 'x', ref);
    assert.equal(open(ring2, old, ref), 'x');
    assert.equal(needsReseal(ring2, old), true);
    const fresh = reseal(ring2, old, ref);
    assert.equal(fresh.split('.')[1], 'k2');
    assert.equal(needsReseal(ring2, fresh), false);
    assert.equal(open(ring2, fresh, ref), 'x');
  });

  it('removed key fails closed', () => {
    const s = seal(ring2, 'x', ref);
    assert.throws(() => open(ring1, s, ref), (e: any) => e.code === 'PHI_KEY_UNAVAILABLE');
  });

  it('rejects bad config', () => {
    assert.throws(() => new PhiKeyRing({ keys: { k1: 'c2hvcnQ=' }, activeKid: 'k1', indexKey: idx }), PhiCryptoError);
    assert.throws(() => new PhiKeyRing({ keys: { k1 }, activeKid: 'nope', indexKey: idx }), PhiCryptoError);
    assert.throws(() => new PhiKeyRing({ keys: { k1 }, activeKid: 'k1', indexKey: k1 }), /must differ/);
  });

  it('blind index: normalised, tenant-salted, column-salted, 32 chars', () => {
    const a1 = blindIndex(ring1, '+91 98765-43210', 'phone', A, 'phone');
    assert.equal(a1.length, 32);
    assert.equal(blindIndex(ring1, '09876543210', 'phone', A, 'phone'), a1);
    assert.equal(blindIndex(ring1, '9876543210', 'phone', A, 'phone'), a1);
    assert.notEqual(blindIndex(ring1, '9876543210', 'phone', B, 'phone'), a1, 'no cross-tenant correlation');
    assert.notEqual(blindIndex(ring1, '9876543210', 'phone', A, 'emergencyPhone'), a1);
    assert.equal(blindIndex(ring1, '  Ravi   KUMAR ', 'name', A, 'name'), blindIndex(ring1, 'ravi kumar', 'name', A, 'name'));
  });
});

describe('pepper rotation (N1)', () => {
  const pA = crypto.randomBytes(24).toString('hex'),
    pB = crypto.randomBytes(24).toString('hex');
  const ringA = loadPepperRing({ ORBITOX_SERVER_PEPPERS: JSON.stringify({ pA }), ORBITOX_SERVER_PEPPER_ACTIVE: 'pA' });
  const ringAB = loadPepperRing({
    ORBITOX_SERVER_PEPPERS: JSON.stringify({ pA, pB }),
    ORBITOX_SERVER_PEPPER_ACTIVE: 'pB',
  });
  const ringB = loadPepperRing({ ORBITOX_SERVER_PEPPERS: JSON.stringify({ pB }), ORBITOX_SERVER_PEPPER_ACTIVE: 'pB' });
  const secret = 'orb_test_' + crypto.randomBytes(24).toString('base64url');
  const stored = activeVerifier(ringA, secret).verifier;

  it('key made under A still matches after B becomes active (A kept)', () => {
    assert.ok(candidateVerifiers(ringAB, secret).some((c) => c.verifier === stored));
    assert.equal(whichPepper(ringAB, secret, stored), 'pA');
  });

  it('fails after A is removed', () => {
    assert.equal(candidateVerifiers(ringB, secret).some((c) => c.verifier === stored), false);
    assert.equal(whichPepper(ringB, secret, stored), null);
  });

  it('wrong secret never matches', () => {
    assert.equal(whichPepper(ringAB, secret + 'x', stored), null);
  });

  it('active pepper is tried first; config is validated', () => {
    assert.equal(candidateVerifiers(ringAB, secret)[0]!.pepperId, 'pB');
    assert.throws(
      () => loadPepperRing({ ORBITOX_SERVER_PEPPERS: JSON.stringify({ a: 'short' }), ORBITOX_SERVER_PEPPER_ACTIVE: 'a' })
    );
    assert.throws(() => loadPepperRing({ ORBITOX_SERVER_PEPPERS: JSON.stringify({ pA }), ORBITOX_SERVER_PEPPER_ACTIVE: 'zz' }));
    assert.throws(
      () =>
        loadPepperRing({
          ORBITOX_SERVER_PEPPERS: JSON.stringify({ pA, pB: pA }),
          ORBITOX_SERVER_PEPPER_ACTIVE: 'pA',
        }),
      /duplicate/
    );
  });

  it('legacy fallback treats ORBITOX_SERVER_PEPPER as {"legacy": value}', () => {
    const legacy = crypto.randomBytes(24).toString('hex');
    const ringLegacy = loadPepperRing({ ORBITOX_SERVER_PEPPER: legacy });
    assert.equal(ringLegacy.active, 'legacy');
    assert.equal(activeVerifier(ringLegacy, secret).pepperId, 'legacy');
  });
});

describe('bridge signature', () => {
  const keys = { activeKeyId: 'b1', keys: { b1: crypto.randomBytes(32).toString('hex') } };
  const input = {
    method: 'POST',
    pathWithQuery: '/api/restaurant/orders?x=1',
    tenantId: A,
    principal: { sub: 'guest_123', scopes: ['orders:write', 'menu:read'] },
    body: '{"a":1}',
  };
  const toReq = (
    headers: Record<string, string>,
    over: Partial<{ method: string; pathWithQuery: string; rawBody: string }> = {}
  ) => ({
    method: over.method ?? input.method,
    pathWithQuery: over.pathWithQuery ?? input.pathWithQuery,
    headers,
    rawBody: over.rawBody ?? input.body,
  });

  it('accepts a valid request exactly once', async () => {
    const store = new MemoryNonceStore();
    const h = signBridgeRequest(keys, input);
    const r1 = await verifyBridgeRequest(keys, store, toReq(h));
    assert.equal(r1.ok, true);
    if (r1.ok) {
      assert.equal(r1.tenantId, A);
      assert.deepEqual(r1.principal.scopes, ['menu:read', 'orders:write']);
    }
    assert.deepEqual(await verifyBridgeRequest(keys, store, toReq(h)), { ok: false, reason: 'REPLAY' });
  });

  it('rejects any tampering', async () => {
    const h = signBridgeRequest(keys, input);
    const cases: Array<[string, any]> = [
      ['tenant swap', toReq({ ...h, 'x-orbitox-tenant': B })],
      ['scope escalation', toReq({ ...h, 'x-orbitox-principal': JSON.stringify({ sub: 'guest_123', scopes: ['admin'] }) })],
      ['body change', toReq(h, { rawBody: '{"a":2}' })],
      ['path change', toReq(h, { pathWithQuery: '/api/restaurant/orders?x=2' })],
      ['method change', toReq(h, { method: 'DELETE' })],
    ];
    for (const [name, req] of cases) {
      const r = await verifyBridgeRequest(keys, new MemoryNonceStore(), req);
      assert.deepEqual(r, { ok: false, reason: 'BAD_SIGNATURE' }, name);
    }
  });

  it('rejects stale, unknown key, missing headers; bad signature does not burn the nonce', async () => {
    const store = new MemoryNonceStore();
    const old = signBridgeRequest(keys, input, Date.now() - 120_000);
    assert.deepEqual(await verifyBridgeRequest(keys, store, toReq(old)), { ok: false, reason: 'STALE' });
    const h = signBridgeRequest(keys, input);
    assert.deepEqual(await verifyBridgeRequest(keys, store, toReq({ ...h, 'x-orbitox-key-id': 'nope' })), {
      ok: false,
      reason: 'UNKNOWN_KEY',
    });
    const { ['x-orbitox-nonce']: _drop, ...noNonce } = h;
    assert.deepEqual(await verifyBridgeRequest(keys, store, toReq(noNonce)), { ok: false, reason: 'MISSING_HEADER' });
    assert.deepEqual(
      await verifyBridgeRequest(keys, store, toReq({ ...h, 'x-orbitox-signature': 'v1=' + '0'.repeat(64) })),
      { ok: false, reason: 'BAD_SIGNATURE' }
    );
    assert.equal((await verifyBridgeRequest(keys, store, toReq(h))).ok, true, 'original still valid after forged attempt');
  });

  it('key rotation: old key id still verifies while configured', async () => {
    const rotated = { activeKeyId: 'b2', keys: { ...keys.keys, b2: crypto.randomBytes(32).toString('hex') } };
    const h = signBridgeRequest(keys, input); // signed with b1
    assert.equal((await verifyBridgeRequest(rotated, new MemoryNonceStore(), toReq(h))).ok, true);
  });
});

describe('seed gate and table tokens (A5)', () => {
  it('only development + explicit flag', () => {
    assert.equal(demoSeedAllowed({ NODE_ENV: 'development', ORBITOX_ENABLE_DEMO_SEED: 'true' }), true);
    for (const env of [
      { NODE_ENV: 'production', ORBITOX_ENABLE_DEMO_SEED: 'true' },
      { NODE_ENV: 'development' },
      { ORBITOX_ENABLE_DEMO_SEED: 'true' },
      { NODE_ENV: 'test', ORBITOX_ENABLE_DEMO_SEED: 'true' },
    ]) {
      assert.equal(demoSeedAllowed(env as any), false);
      assert.throws(() => assertDemoSeedAllowed(env as any));
    }
  });

  it('tokens are random, 256-bit, hash-only, constant-time verified', () => {
    const t1 = newTableToken(),
      t2 = newTableToken();
    assert.notEqual(t1.token, t2.token);
    assert.equal(Buffer.from(t1.token, 'base64url').length, 32);
    assert.equal(tableTokenMatches(t1.token, t1.tokenHash), true);
    assert.equal(tableTokenMatches(t2.token, t1.tokenHash), false);
  });
});

describe('canonicalJson + error mapping', () => {
  it('key order does not change the hash input; non-finite rejected', () => {
    assert.equal(
      canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } }),
      canonicalJson({ a: { c: [3, { e: 0, f: 1 }], d: 2 }, b: 1 })
    );
    assert.equal(canonicalJson({ a: undefined, b: 1n }), '{"b":"1"}');
    assert.throws(() => canonicalJson({ a: NaN }));
  });

  it('maps by constraint name and SQLSTATE; never leaks detail', () => {
    assert.deepEqual(mapDbError({ code: '23505', constraint: 'HmsAdmission_one_open_per_bed' }), {
      status: 409,
      code: 'BED_OCCUPIED',
      retryable: false,
    });
    assert.deepEqual(mapDbError({ code: '23503', constraint: 'whatever' }), {
      status: 404,
      code: 'REFERENCE_NOT_FOUND',
      retryable: false,
    });
    assert.deepEqual(mapDbError({ code: '42501' }), { status: 500, code: 'INTERNAL_TENANT_GUARD', retryable: false });
    assert.equal(mapDbError({ code: '40001' }).retryable, true);
    assert.deepEqual(mapDbError(new Error('boom')), { status: 500, code: 'INTERNAL_ERROR', retryable: false });
  });

  it('extracts SQLSTATE and constraint from Prisma-wrapped errors (P2002, P2003, P2010 meta)', () => {
    // Prisma P2002 with target
    const p2002 = { code: 'P2002', meta: { target: ['HmsAdmission_one_open_per_bed'] } };
    assert.deepEqual(mapDbError(p2002), { status: 409, code: 'BED_OCCUPIED', retryable: false });

    // Prisma P2010 raw query error with postgres meta
    const p2010 = {
      code: 'P2010',
      meta: { code: '23514', constraint: 'HmsLabOrder_check1', message: 'check constraint violation' },
    };
    assert.deepEqual(mapDbError(p2010), { status: 422, code: 'LAB_VERIFIER_MUST_DIFFER', retryable: false });

    // Prisma P2003 FK violation
    const p2003 = { code: 'P2003', meta: { field_name: 'patientId' } };
    assert.deepEqual(mapDbError(p2003), { status: 404, code: 'REFERENCE_NOT_FOUND', retryable: false });
  });

  // Requirement: Add a test per constraint name in CONSTRAINT_ERRORS
  describe('CONSTRAINT_ERRORS exhaustive coverage (19 named constraints)', () => {
    for (const [constraintName, expected] of Object.entries(CONSTRAINT_ERRORS)) {
      it(`maps constraint "${constraintName}" to status ${expected.status} code ${expected.code}`, () => {
        // Direct postgres error with constraint property
        const directErr = { code: '23505', constraint: constraintName };
        const res = mapDbError(directErr);
        assert.equal(res.status, expected.status);
        assert.equal(res.code, expected.code);
        assert.equal(res.retryable, false);

        // Prisma wrapped error with meta.constraint
        const prismaMetaErr = { code: 'P2010', meta: { constraint: constraintName } };
        const res2 = mapDbError(prismaMetaErr);
        assert.equal(res2.status, expected.status);
        assert.equal(res2.code, expected.code);

        // Prisma P2002 with target array
        const prismaTargetErr = { code: 'P2002', meta: { target: [constraintName] } };
        const res3 = mapDbError(prismaTargetErr);
        assert.equal(res3.status, expected.status);
        assert.equal(res3.code, expected.code);
      });
    }
  });
});

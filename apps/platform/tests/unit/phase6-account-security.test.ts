import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PlatformRepository } from '@orbitox-io/plugin-engine';
import {
  ACCOUNT_TOKEN_TTL_SECONDS,
  assertPasswordNotBreached,
  assertValidPassword,
  buildAccountLink,
  decryptAccountEmailPayload,
  encryptAccountEmailPayload,
  generateTotpSecret,
  getTotpStep,
  hashAccountPassword,
  hashAccountToken,
  hashBackupCode,
  makeBackupCodes,
  newAccountToken,
  sealTotpSecret,
  unsealTotpSecret,
  verifyAccountPassword,
  verifyTotp,
} from '@/lib/phase6-account-security';
import { adminTokenAllowsRequest } from '@/app/api/v1/_lib/auth-pipeline';
import { currentOperatorActor, withOperatorActor } from '@/lib/operator-actor-context';
import { platformRepository } from '@/lib/platform-repository';
import {
  operatorRoleAllows,
  requiredOperatorRole,
  requiresRecentReauthentication,
} from '@/lib/operator-route-policy';

describe('Phase 6 account security primitives', () => {
  it('creates 256-bit purpose-bound tokens with the specified lifetimes and hash-only identifiers', () => {
    const now = 1_800_000_000_000;
    for (const [purpose, ttl] of Object.entries(ACCOUNT_TOKEN_TTL_SECONDS)) {
      const token = newAccountToken(purpose as keyof typeof ACCOUNT_TOKEN_TTL_SECONDS, now);
      assert.equal(Buffer.from(token.token, 'base64url').length, 32);
      assert.equal(token.tokenHash, hashAccountToken(token.token));
      assert.equal(token.expiresAt.getTime(), now + ttl * 1000);
    }
    assert.throws(() => hashAccountToken('short'));
  });

  it('places account tokens in HTTPS URL fragments only', () => {
    const link = buildAccountLink('https://console.orbitox.io', '/reset', 'A'.repeat(43));
    assert.match(link, /^https:\/\/console\.orbitox\.io\/reset#token=A{43}$/);
    assert.throws(() => buildAccountLink('http://example.test', '/reset', 'A'.repeat(43)));
    assert.doesNotThrow(() => buildAccountLink('http://localhost:3000', '/reset', 'A'.repeat(43)));
  });

  it('enforces password length and verifies scrypt hashes without storing plaintext', async () => {
    assert.throws(() => assertValidPassword('too-short'));
    const password = 'correct-horse-battery-41';
    assert.doesNotThrow(() => assertValidPassword(password));
    const encoded = await hashAccountPassword(password);
    assert.match(encoded, /^scrypt\$32768\$8\$1\$/);
    assert.equal(encoded.includes(password), false);
    assert.equal(await verifyAccountPassword(password, encoded), true);
    assert.equal(await verifyAccountPassword('wrong-password', encoded), false);
    assert.equal(await verifyAccountPassword(password, 'malformed'), false);
  });

  it('blocks bundled common passwords and uses the local list when the breach API is disabled or unavailable', async () => {
    const previousMode = process.env.ORBITOX_BREACHED_PASSWORD_API;
    const previousFetch = globalThis.fetch;
    const previousError = console.error;
    let fetchCalled = false;
    let alert: unknown;
    try {
      process.env.ORBITOX_BREACHED_PASSWORD_API = 'off';
      globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error('The local check should avoid the external service.');
      };
      await assert.rejects(assertPasswordNotBreached('123456'), /Choose a password/);
      assert.equal(fetchCalled, false);

      process.env.ORBITOX_BREACHED_PASSWORD_API = 'on';
      globalThis.fetch = async () => {
        throw new TypeError('network unavailable');
      };
      console.error = (message?: unknown) => {
        alert = JSON.parse(String(message));
      };
      await assert.doesNotReject(
        assertPasswordNotBreached('phase6 fallback-only password phrase 9482'),
      );
      assert.equal(
        (alert as { event?: string }).event,
        'account_security.breached_password_api_fallback',
      );
      assert.equal((alert as { reason?: string }).reason, 'unavailable');
      assert.equal((alert as { severity?: string }).severity, 'HIGH');
    } finally {
      restoreEnv('ORBITOX_BREACHED_PASSWORD_API', previousMode);
      globalThis.fetch = previousFetch;
      console.error = previousError;
    }
  });

  it('still blocks k-anonymity matches when the breach API is reachable', async () => {
    const previousMode = process.env.ORBITOX_BREACHED_PASSWORD_API;
    const previousFetch = globalThis.fetch;
    const password = 'phase6-hibp-confirmed-test-password-9321';
    try {
      process.env.ORBITOX_BREACHED_PASSWORD_API = 'on';
      const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);
      globalThis.fetch = async (input) => {
        assert.equal(String(input), `https://api.pwnedpasswords.com/range/${prefix}`);
        return new Response(`${suffix}:1\r\n`);
      };
      await assert.rejects(assertPasswordNotBreached(password), /Choose a password/);
    } finally {
      restoreEnv('ORBITOX_BREACHED_PASSWORD_API', previousMode);
      globalThis.fetch = previousFetch;
    }
  });

  it('round-trips encrypted TOTP and email payloads; TOTP secrets are never persisted as plaintext', () => {
    const previousMfa = process.env.ORBITOX_MFA_ENCRYPTION_KEY;
    const previousEmail = process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY;
    process.env.ORBITOX_MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    try {
      const secret = generateTotpSecret();
      const sealed = sealTotpSecret(secret);
      assert.equal(sealed.includes(secret), false);
      assert.equal(unsealTotpSecret(sealed), secret);
      const payload = { link: 'https://console.orbitox.io/verify#token=redacted' };
      const encrypted = encryptAccountEmailPayload(payload);
      assert.equal(encrypted.includes(payload.link), false);
      assert.deepEqual(decryptAccountEmailPayload(encrypted), payload);
    } finally {
      restoreEnv('ORBITOX_MFA_ENCRYPTION_KEY', previousMfa);
      restoreEnv('ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY', previousEmail);
    }
  });

  it('verifies RFC 6238 TOTP codes and issues single-use backup code material', () => {
    const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    assert.equal(verifyTotp(rfcSecret, '287082', 59_000), true);
    assert.equal(getTotpStep(rfcSecret, '287082', 59_000), 1);
    assert.equal(verifyTotp(rfcSecret, '287083', 59_000), false);
    const codes = makeBackupCodes();
    assert.equal(codes.length, 10);
    assert.equal(new Set(codes).size, 10);
    assert.equal(
      hashBackupCode('operator-1', codes[0]!),
      hashBackupCode('operator-1', codes[0]!.replace(/-/g, '')),
    );
    assert.notEqual(
      hashBackupCode('operator-1', codes[0]!),
      hashBackupCode('operator-2', codes[0]!),
    );
  });

  it('restricts automation tokens to configured HTTP method and path scopes', () => {
    const previous = process.env.ORBITOX_ADMIN_TOKEN_SCOPES;
    process.env.ORBITOX_ADMIN_TOKEN_SCOPES = 'GET:/api/v1/overview,POST:/api/v1/admin/telemetry';
    try {
      assert.equal(adminTokenAllowsRequest('/api/v1/overview', 'GET'), true);
      assert.equal(adminTokenAllowsRequest('/api/v1/overview', 'POST'), false);
      assert.equal(adminTokenAllowsRequest('/api/v1/admin/telemetry', 'POST'), true);
      assert.equal(adminTokenAllowsRequest('/api/v1/admin/projects', 'POST'), false);
    } finally {
      restoreEnv('ORBITOX_ADMIN_TOKEN_SCOPES', previous);
    }
  });

  it('maps all platform role tiers and detects dangerous actions for re-authentication', () => {
    assert.equal(requiredOperatorRole('/api/v1/overview', 'GET'), 'SUPPORT_READONLY');
    assert.equal(requiredOperatorRole('/api/v1/admin/projects', 'POST'), 'OPERATOR');
    assert.equal(
      requiredOperatorRole('/api/v1/admin/projects/1/suspend', 'POST'),
      'PLATFORM_OWNER',
    );
    assert.equal(requiredOperatorRole('/api/v1/admin/billing/invoices', 'GET'), 'BILLING');
    assert.equal(operatorRoleAllows('OPERATOR', 'SUPPORT_READONLY'), true);
    assert.equal(operatorRoleAllows('SUPPORT_READONLY', 'OPERATOR'), false);
    assert.equal(requiresRecentReauthentication('/api/v1/admin/api-keys/1/rotate', 'POST'), true);
    assert.equal(requiresRecentReauthentication('/api/v1/overview', 'GET'), false);
  });

  it('propagates the authenticated operator through asynchronous audit work only within the request', async () => {
    assert.equal(currentOperatorActor(), undefined);
    await withOperatorActor('operator-123', async () => {
      assert.equal(currentOperatorActor(), 'operator-123');
      await Promise.resolve();
      assert.equal(currentOperatorActor(), 'operator-123');
    });
    assert.equal(currentOperatorActor(), undefined);

    const previousRepository = process.env.ORBITOX_PLATFORM_REPOSITORY;
    process.env.ORBITOX_PLATFORM_REPOSITORY = 'json';
    PlatformRepository.setPersistenceEnabled(false);
    const auditMarker = `phase6-actor-${Date.now()}`;
    try {
      await withOperatorActor('operator-123', () =>
        platformRepository.recordPlatformAdminAudit({
          action: 'phase6.test.operator_audit',
          entityType: 'test',
          entityId: auditMarker,
        }),
      );
      const event = PlatformRepository.listAuditEvents().find(
        (audit) => audit.entityId === auditMarker,
      );
      assert.equal(event?.actorId, 'operator-123');
      assert.equal(event?.operatorId, 'operator-123');
    } finally {
      restoreEnv('ORBITOX_PLATFORM_REPOSITORY', previousRepository);
    }
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

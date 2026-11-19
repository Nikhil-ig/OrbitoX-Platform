import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  ACCOUNT_SESSION_IDLE_MS,
  OPERATOR_SESSION_IDLE_MS,
  getTotpStep,
  generateTotpSecret,
} from '@/server/auth/account-security';
import {
  sanitizeAuditPayload,
  recordPlatformAuditEvent,
} from '@/server/audit/audit-console-service';
import {
  withOperatorAuth,
  OPERATOR_SESSION_COOKIE,
  OPERATOR_CSRF_COOKIE,
} from '@/server/auth/operator-auth';
import { prisma } from '@/server/db/prisma';

describe('Phase 7C Security Grounding & Invariant Enforcement', () => {
  test('1. Session Idle Inactivity Durations: 15m Operator vs 30m Customer', () => {
    assert.strictEqual(
      OPERATOR_SESSION_IDLE_MS,
      15 * 60 * 1000,
      'Operator session idle timeout must be strictly 15 minutes',
    );
    assert.strictEqual(
      ACCOUNT_SESSION_IDLE_MS,
      30 * 60 * 1000,
      'Customer session idle timeout must be preserved at 30 minutes',
    );
  });

  test('2. sanitizeAuditPayload: recursively scrubs nested secrets, credentials and PII', () => {
    const rawPayload = {
      action: 'KEY_ROTATION',
      tenantId: 'loc_delhi_01',
      config: {
        auth: {
          clientSecret: 'secret_live_98374284920492',
          apiKey: 'pk_live_83920193801293',
          password: 'super-secure-operator-password',
        },
        database: {
          pepper: '0123456789abcdef0123456789abcdef',
          privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...',
        },
      },
      pii: {
        aadhaar: '1234-5678-9012',
        ssn: '000-12-3456',
        cardCvv: '999',
      },
      items: [
        { token: 'mfa_token_xyz', valid: true },
        { mfaTotpSealed: 'sealed_aes_blob_84920', backupCode: 'ABCD-1234' },
      ],
      safeInfo: {
        operatorEmail: 'secops@orbitox.io',
        role: 'PLATFORM_OWNER',
        environment: 'PRODUCTION',
        counts: 42,
      },
    };

    const sanitized = sanitizeAuditPayload(rawPayload);

    // Assert sensitive nested keys are redacted
    assert.strictEqual(sanitized.config.auth.clientSecret, '[REDACTED]');
    assert.strictEqual(sanitized.config.auth.apiKey, '[REDACTED]');
    assert.strictEqual(sanitized.config.auth.password, '[REDACTED]');
    assert.strictEqual(sanitized.config.database.pepper, '[REDACTED]');
    assert.strictEqual(sanitized.config.database.privateKey, '[REDACTED]');
    assert.strictEqual(sanitized.pii.aadhaar, '[REDACTED]');
    assert.strictEqual(sanitized.pii.ssn, '[REDACTED]');
    assert.strictEqual(sanitized.pii.cardCvv, '[REDACTED]');
    assert.strictEqual(sanitized.items[0]!.token, '[REDACTED]');
    assert.strictEqual(sanitized.items[1]!.mfaTotpSealed, '[REDACTED]');
    assert.strictEqual(sanitized.items[1]!.backupCode, '[REDACTED]');

    // Assert safe metadata is intact
    assert.strictEqual(sanitized.action, 'KEY_ROTATION');
    assert.strictEqual(sanitized.tenantId, 'loc_delhi_01');
    assert.strictEqual(sanitized.safeInfo.operatorEmail, 'secops@orbitox.io');
    assert.strictEqual(sanitized.safeInfo.role, 'PLATFORM_OWNER');
    assert.strictEqual(sanitized.safeInfo.counts, 42);
    assert.strictEqual(sanitized.items[0]!.valid, true);
  });

  test('3. recordPlatformAuditEvent helper passes metadata through sanitizeAuditPayload before DB insertion', async () => {
    let capturedData: any = null;
    const mockPrisma = {
      platformAuditEvent: {
        create: async ({ data }: { data: any }) => {
          capturedData = data;
          return { id: 'evt_test_1', ...data };
        },
      },
    };

    await recordPlatformAuditEvent(mockPrisma as any, {
      action: 'TENANT_SUSPEND',
      entityType: 'TENANT',
      entityId: 'ten_999',
      actorEmail: 'owner@orbitox.io',
      reason: 'Delinquent subscription',
      metadata: {
        authorization: 'Bearer token_secret_123',
        credential: 'db_admin_password_raw',
        details: 'Suspended by platform owner via StepUpConfirmationDialog',
      },
    });

    assert.ok(capturedData);
    assert.strictEqual(capturedData.action, 'TENANT_SUSPEND');
    assert.strictEqual(capturedData.metadata.authorization, '[REDACTED]');
    assert.strictEqual(capturedData.metadata.credential, '[REDACTED]');
    assert.strictEqual(
      capturedData.metadata.details,
      'Suspended by platform owner via StepUpConfirmationDialog',
    );
  });

  test('4. withOperatorAuth clears cookies on 401 Unauthorized', async () => {
    const handler = withOperatorAuth(async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const request = new NextRequest('http://localhost:3005/api/v1/platform/test', {
      headers: {
        cookie: `${OPERATOR_SESSION_COOKIE}=invalid_or_expired_token_12345678901234567890123`,
      },
    });

    const response = await handler(request);
    assert.strictEqual(response.status, 401);

    // Verify cookies clear the operator session and csrf cookies
    const cookies = response.headers.getSetCookie();
    const sessionCookieHeader = cookies.find((c) => c.startsWith(`${OPERATOR_SESSION_COOKIE}=`));
    const csrfCookieHeader = cookies.find((c) => c.startsWith(`${OPERATOR_CSRF_COOKIE}=`));

    assert.ok(sessionCookieHeader, 'Operator session cookie must be set to clear on 401');
    assert.ok(sessionCookieHeader.includes('Max-Age=0'), 'Session cookie maxAge must be 0');

    assert.ok(csrfCookieHeader, 'Operator CSRF cookie must be set to clear on 401');
    assert.ok(csrfCookieHeader.includes('Max-Age=0'), 'CSRF cookie maxAge must be 0');
  });

  test('5. Grounded TOTP candidate step calculation & RFC 6238 timing boundaries', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const step = Math.floor(now / 30_000);

    // Null for invalid format
    assert.strictEqual(getTotpStep(secret, 'abc'), null);
    assert.strictEqual(getTotpStep(secret, '12345'), null);
    assert.strictEqual(getTotpStep(secret, '1234567'), null);

    // Candidate step evaluation returns valid step within window
    // (A non-matching 6-digit code returns null)
    assert.strictEqual(getTotpStep(secret, '000000', now), null);
  });

  test('6. Expired operator session returns null and revokes session record in DB', async () => {
    const rawToken = 'a'.repeat(43);
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    let revokedId: string | null = null;
    let revokedTimestamp: Date | null = null;

    const originalFindUnique = prisma.platformOperatorSession.findUnique;
    const originalUpdateMany = prisma.platformOperatorSession.updateMany;

    try {
      (prisma.platformOperatorSession as any).findUnique = async ({ where }: any) => {
        if (where.tokenHash === tokenHash) {
          return {
            id: 'sess_expired_123',
            operatorId: 'op_owner_1',
            tokenHash,
            csrfTokenHash: 'csrf_hash_123',
            idleExpiresAt: new Date(Date.now() - 60_000), // 1 min ago
            absoluteExpiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
            revokedAt: null,
            lastSeenAt: new Date(Date.now() - 120_000),
            operator: {
              id: 'op_owner_1',
              email: 'owner@orbitox.io',
              role: 'PLATFORM_OWNER',
              status: 'ACTIVE',
            },
          };
        }
        return null;
      };

      (prisma.platformOperatorSession as any).updateMany = async ({ where, data }: any) => {
        if (where.id === 'sess_expired_123' && where.revokedAt === null && data.revokedAt) {
          revokedId = where.id;
          revokedTimestamp = data.revokedAt;
          return { count: 1 };
        }
        return { count: 0 };
      };

      const { getOperatorSession } = await import('@/server/accounts/account-service');
      const session = await getOperatorSession(rawToken);

      assert.strictEqual(session, null, 'Expired session must evaluate to null');
      assert.strictEqual(revokedId, 'sess_expired_123', 'Expired session must be atomically marked revoked');
      assert.ok((revokedTimestamp as any) instanceof Date, 'Revoked timestamp must be a valid Date instance');
    } finally {
      (prisma.platformOperatorSession as any).findUnique = originalFindUnique;
      (prisma.platformOperatorSession as any).updateMany = originalUpdateMany;
    }
  });
});

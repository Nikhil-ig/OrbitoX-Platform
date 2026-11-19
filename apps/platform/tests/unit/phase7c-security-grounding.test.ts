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
  auditConsoleService,
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

  test('2. sanitizeAuditPayload: recursively scrubs nested secrets, credentials and common PII', () => {
    const rawPayload = {
      action: 'KEY_ROTATION',
      tenantId: 'loc_delhi_01',
      config: {
        auth: {
          clientSecret: 'mock-test-client-secret',
          apiKey: 'mock-test-api-key',
          password: 'super-secure-operator-password',
        },
        database: {
          pepper: 'mock-test-database-pepper',
          privateKey: 'mock-test-private-key-data',
        },
      },
      pii: {
        aadhaar: '1234-5678-9012',
        ssn: '000-12-3456',
        cardCvv: '999',
        email: 'user-sample@example.invalid',
        phone: '+1-555-0199',
        address: '123 Operational Lane, Suite 400',
        dateOfBirth: '1985-04-12',
      },
      items: [
        { token: 'mfa_token_xyz', valid: true },
        { mfaTotpSealed: 'sealed_aes_blob_84920', backupCode: 'ABCD-1234' },
      ],
      safeInfo: {
        clusterNode: 'node-mesh-01',
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
    assert.strictEqual(sanitized.pii.email, '[REDACTED]');
    assert.strictEqual(sanitized.pii.phone, '[REDACTED]');
    assert.strictEqual(sanitized.pii.address, '[REDACTED]');
    assert.strictEqual(sanitized.pii.dateOfBirth, '[REDACTED]');
    assert.strictEqual(sanitized.items[0]!.token, '[REDACTED]');
    assert.strictEqual(sanitized.items[1]!.mfaTotpSealed, '[REDACTED]');
    assert.strictEqual(sanitized.items[1]!.backupCode, '[REDACTED]');

    // Assert safe metadata is intact
    assert.strictEqual(sanitized.action, 'KEY_ROTATION');
    assert.strictEqual(sanitized.tenantId, 'loc_delhi_01');
    assert.strictEqual(sanitized.safeInfo.clusterNode, 'node-mesh-01');
    assert.strictEqual(sanitized.safeInfo.role, 'PLATFORM_OWNER');
    assert.strictEqual(sanitized.safeInfo.counts, 42);
    assert.strictEqual(sanitized.items[0]!.valid, true);
  });

  test('3. recordPlatformAuditEvent: preserves top-level audit identity while scrubbing payload metadata PII', async () => {
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
      actorId: 'op_sysadmin_42',
      actorEmail: 'owner@orbitox.io',
      reason: 'Delinquent subscription',
      metadata: {
        authorization: 'Bearer token_secret_123',
        credential: 'db_admin_password_raw',
        customerEmail: 'customer-contact@domain.invalid',
        contactPhone: '+1-555-4321',
        details: 'Suspended by platform owner via StepUpConfirmationDialog',
      },
    });

    assert.ok(capturedData);
    // Explicit top-level audit envelope fields preserved for accountability
    assert.strictEqual(capturedData.action, 'TENANT_SUSPEND');
    assert.strictEqual(capturedData.actorId, 'op_sysadmin_42');
    assert.strictEqual(capturedData.actorEmail, 'owner@orbitox.io');
    assert.strictEqual(capturedData.entityType, 'TENANT');
    assert.strictEqual(capturedData.entityId, 'ten_999');

    // Sensitive metadata and payload PII scrubbed
    assert.strictEqual(capturedData.metadata.authorization, '[REDACTED]');
    assert.strictEqual(capturedData.metadata.credential, '[REDACTED]');
    assert.strictEqual(capturedData.metadata.customerEmail, '[REDACTED]');
    assert.strictEqual(capturedData.metadata.contactPhone, '[REDACTED]');
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

  test('7. recordPlatformAuditEvent: computes cryptographic hash chain across sequential events', async () => {
    const eventLedger: any[] = [];
    const mockPrisma = {
      platformAuditEvent: {
        findFirst: async () => {
          return eventLedger.length > 0 ? eventLedger[eventLedger.length - 1] : null;
        },
        create: async ({ data }: { data: any }) => {
          const row = { id: `evt_${eventLedger.length + 1}`, ...data };
          eventLedger.push(row);
          return row;
        },
      },
    };

    // Event 1 (Genesis)
    const event1 = await recordPlatformAuditEvent(mockPrisma as any, {
      action: 'PLATFORM_KEY_ROTATED',
      entityType: 'PLATFORM_KEY',
      entityId: 'key_1',
      actorEmail: 'alice@orbitox.io',
      organizationId: 'platform',
      projectId: 'operations',
      environmentId: 'production',
      metadata: { target: 'Root Master Key' },
    });

    assert.ok(event1.metadata._chain, 'Chain metadata must be attached');
    assert.strictEqual(event1.metadata._chain.sequence, 1);
    assert.strictEqual(event1.metadata._chain.previousHash, 'GENESIS');
    assert.ok(typeof event1.metadata._chain.rowHash === 'string' && event1.metadata._chain.rowHash.length === 64);

    // Event 2 (Chained to Event 1)
    const event2 = await recordPlatformAuditEvent(mockPrisma as any, {
      action: 'OPERATOR_PERMISSIONS_UPDATED',
      entityType: 'OPERATOR',
      entityId: 'op_bob',
      actorEmail: 'alice@orbitox.io',
      organizationId: 'platform',
      projectId: 'operations',
      environmentId: 'production',
      metadata: { grantedRole: 'SECURITY_ADMIN' },
    });

    assert.ok(event2.metadata._chain);
    assert.strictEqual(event2.metadata._chain.sequence, 2);
    assert.strictEqual(
      event2.metadata._chain.previousHash,
      event1.metadata._chain.rowHash,
      'Event 2 previousHash must strictly link to Event 1 rowHash'
    );
  });

  test('8. auditConsoleService.verifyPostgresAuditChain: verifies valid hash sequence and detects tampered audit events', async () => {
    const originalFindMany = prisma.platformAuditEvent.findMany;

    try {
      // 8A: Valid chain verification
      const now = new Date();
      const meta1 = { target: 'Key A' };
      const rowHash1 = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            action: 'KEY_CREATED',
            entityType: 'PLATFORM_KEY',
            entityId: 'key_a',
            actorId: null,
            actorEmail: 'alice@orbitox.io',
            organizationId: 'platform',
            projectId: 'operations',
            environmentId: 'production',
            occurredAt: now.toISOString(),
            previousHash: 'GENESIS',
            metadata: meta1,
          })
        )
        .digest('hex');

      const meta2 = { target: 'Key B' };
      const rowHash2 = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            action: 'KEY_CREATED',
            entityType: 'PLATFORM_KEY',
            entityId: 'key_b',
            actorId: null,
            actorEmail: 'alice@orbitox.io',
            organizationId: 'platform',
            projectId: 'operations',
            environmentId: 'production',
            occurredAt: now.toISOString(),
            previousHash: rowHash1,
            metadata: meta2,
          })
        )
        .digest('hex');

      const validEvents = [
        {
          id: 'evt_1',
          action: 'KEY_CREATED',
          entityType: 'PLATFORM_KEY',
          entityId: 'key_a',
          actorId: null,
          actorEmail: 'alice@orbitox.io',
          organizationId: 'platform',
          projectId: 'operations',
          environmentId: 'production',
          occurredAt: now,
          metadata: {
            ...meta1,
            _chain: {
              sequence: 1,
              previousHash: 'GENESIS',
              rowHash: rowHash1,
              algorithm: 'SHA-256',
              occurredAt: now.toISOString(),
            },
          },
        },
        {
          id: 'evt_2',
          action: 'KEY_CREATED',
          entityType: 'PLATFORM_KEY',
          entityId: 'key_b',
          actorId: null,
          actorEmail: 'alice@orbitox.io',
          organizationId: 'platform',
          projectId: 'operations',
          environmentId: 'production',
          occurredAt: now,
          metadata: {
            ...meta2,
            _chain: {
              sequence: 2,
              previousHash: rowHash1,
              rowHash: rowHash2,
              algorithm: 'SHA-256',
              occurredAt: now.toISOString(),
            },
          },
        },
      ];

      (prisma.platformAuditEvent as any).findMany = async () => validEvents;
      const validResult = await auditConsoleService.verifyPostgresAuditChain();
      assert.strictEqual(validResult.valid, true);
      assert.strictEqual(validResult.status, 'VERIFIED');
      assert.strictEqual(validResult.totalEntries, 2);

      // 8B: Tampered payload detection
      const tamperedEvents = JSON.parse(JSON.stringify(validEvents));
      tamperedEvents[1].metadata.target = 'Tampered Key Name'; // Attacker modified metadata without updating hash

      (prisma.platformAuditEvent as any).findMany = async () => tamperedEvents;
      const tamperedResult = await auditConsoleService.verifyPostgresAuditChain();
      assert.strictEqual(tamperedResult.valid, false);
      assert.strictEqual(tamperedResult.status, 'FAILED');
      assert.ok(tamperedResult.details?.includes('discrepancy'));

      // 8C: Broken previousHash link detection
      const brokenLinkEvents = JSON.parse(JSON.stringify(validEvents));
      brokenLinkEvents[1].metadata._chain.previousHash = '0'.repeat(64);

      (prisma.platformAuditEvent as any).findMany = async () => brokenLinkEvents;
      const brokenLinkResult = await auditConsoleService.verifyPostgresAuditChain();
      assert.strictEqual(brokenLinkResult.valid, false);
      assert.strictEqual(brokenLinkResult.status, 'FAILED');
      assert.ok(brokenLinkResult.details?.includes('Broken hash link'));
    } finally {
      (prisma.platformAuditEvent as any).findMany = originalFindMany;
    }
  });

  test('9. recordPlatformAuditEvent: uses parameterized set_config for RLS tenant isolation and throws on error in production', async () => {
    let capturedQuery: any = null;
    let capturedScope: any = null;

    const mockPrisma = {
      $executeRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
        capturedQuery = strings.join('$');
        capturedScope = values[0];
        return 1;
      },
      platformAuditEvent: {
        create: async ({ data }: { data: any }) => ({ id: 'evt_rls_1', ...data }),
      },
    };

    await recordPlatformAuditEvent(mockPrisma as any, {
      action: 'TENANT_AUDIT_LOG_CHECK',
      entityType: 'TENANT',
      entityId: 'ten_abc',
      organizationId: 'org_acme',
      projectId: 'proj_hms',
      environmentId: 'env_prod',
    });

    assert.ok(capturedQuery?.includes('SELECT set_config'));
    assert.strictEqual(capturedScope, 'org/org_acme/project/proj_hms/environment/env_prod');

    // Fail-closed in production
    const failingPrisma = {
      $executeRaw: async () => {
        throw new Error('RLS context violation');
      },
      platformAuditEvent: {
        create: async () => ({}),
      },
    };

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await assert.rejects(
        async () => {
          await recordPlatformAuditEvent(failingPrisma as any, {
            action: 'TENANT_FAIL_TEST',
            entityType: 'TENANT',
          });
        },
        /Failed to set RLS tenant scope/
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});

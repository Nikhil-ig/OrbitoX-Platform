import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { approvalEngine, auditService } from '@/app/api/v1/_lib/platform-governance';
import { GET, POST } from '@/app/api/v1/platform/approvals/route';
import { OPERATOR_SESSION_COOKIE } from '@/server/accounts/account-service';
import { prisma } from '@/server/db/prisma';
import { generateTotpSecret, sealTotpSecret } from '@/server/auth/account-security';

describe('Phase 7C: Production Approvals Workflow & Four-Eyes Security Gate', () => {
  process.env.ORBITOX_MFA_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');

  const policyId = 'policy_test_four_eyes';
  const testContextId = 'ctx_test_audit_01';

  interface MockOperator {
    id: string;
    email: string;
    role: string;
    status: string;
    mfaTotpSealed: string;
    lastTotpStep: number | null;
    totpSecret: string;
  }

  interface MockSession {
    id: string;
    operatorId: string;
    tokenHash: string;
    csrfTokenHash: string;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
    revokedAt: Date | null;
    lastSeenAt: Date;
    reauthenticatedAt: Date | null;
  }

  const mockOperators = new Map<string, MockOperator>();
  const mockSessions = new Map<string, MockSession>();

  let originalFindUniqueSession: any;
  let originalUpdateManySession: any;
  let originalFindUniqueOperator: any;
  let originalUpdateManyOperator: any;

  function createMockOperatorSession(input: {
    id: string;
    email: string;
    role: string;
    lastTotpStep?: number | null;
    reauthenticated?: boolean;
  }): { token: string; operator: MockOperator } {
    const rawToken = crypto.randomBytes(32).toString('base64url'); // 43 characters
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const secret = generateTotpSecret();
    const sealed = sealTotpSecret(secret);

    const operator: MockOperator = {
      id: input.id,
      email: input.email,
      role: input.role,
      status: 'ACTIVE',
      mfaTotpSealed: sealed,
      lastTotpStep: input.lastTotpStep ?? null,
      totpSecret: secret,
    };
    mockOperators.set(operator.id, operator);

    const session: MockSession = {
      id: `sess_${input.id}`,
      operatorId: operator.id,
      tokenHash,
      csrfTokenHash: 'csrf_test',
      idleExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      absoluteExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      revokedAt: null,
      lastSeenAt: new Date(),
      reauthenticatedAt: input.reauthenticated ? new Date() : null,
    };
    mockSessions.set(tokenHash, session);

    return { token: rawToken, operator };
  }

  function generateValidTotp(secret: string, offsetMs = 0): string {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor((Date.now() + offsetMs) / 30_000)));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of secret.replace(/=+$/, '')) {
      const digit = alphabet.indexOf(char);
      if (digit < 0) throw new Error('Invalid base32 TOTP secret.');
      bits += digit.toString(2).padStart(5, '0');
    }
    const keyBytes: number[] = [];
    for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
      keyBytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
    }
    const digest = crypto.createHmac('sha1', Buffer.from(keyBytes)).update(counter).digest();
    const offset = digest[digest.length - 1]! & 0x0f;
    const binary = digest.readUInt32BE(offset) & 0x7fffffff;
    return String(binary % 1_000_000).padStart(6, '0');
  }

  function makeAuthorizedRequest(
    url: string,
    token: string,
    options: { method?: string; body?: any } = {}
  ): NextRequest {
    const headers: Record<string, string> = {
      cookie: `${OPERATOR_SESSION_COOKIE}=${token}`,
    };
    if (options.body) {
      headers['content-type'] = 'application/json';
    }
    return new NextRequest(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  before(() => {
    originalFindUniqueSession = (prisma as any).platformOperatorSession?.findUnique;
    originalUpdateManySession = (prisma as any).platformOperatorSession?.updateMany;
    originalFindUniqueOperator = (prisma as any).platformOperator?.findUnique;
    originalUpdateManyOperator = (prisma as any).platformOperator?.updateMany;

    (prisma.platformOperatorSession as any).findUnique = async ({ where }: any) => {
      const sess = mockSessions.get(where.tokenHash);
      if (!sess) return null;
      const op = mockOperators.get(sess.operatorId);
      if (!op) return null;
      return {
        ...sess,
        operator: {
          id: op.id,
          email: op.email,
          role: op.role,
          status: op.status,
        },
      };
    };

    (prisma.platformOperatorSession as any).updateMany = async () => ({ count: 1 });

    (prisma.platformOperator as any).findUnique = async ({ where }: any) => {
      const op = mockOperators.get(where.id);
      if (!op) return null;
      return {
        id: op.id,
        mfaTotpSealed: op.mfaTotpSealed,
        lastTotpStep: op.lastTotpStep,
      };
    };

    (prisma.platformOperator as any).updateMany = async ({ where, data }: any) => {
      const op = mockOperators.get(where.id);
      if (!op) return { count: 0 };
      if (Array.isArray(where.OR)) {
        const step = data.lastTotpStep;
        if (op.lastTotpStep !== null && op.lastTotpStep >= step) {
          return { count: 0 };
        }
      }
      op.lastTotpStep = data.lastTotpStep;
      return { count: 1 };
    };

    // Register a two-stage governance policy requiring distinct roles
    approvalEngine.registerPolicy({
      id: policyId,
      name: 'High-Risk Production Signing Key Revocation',
      entityType: 'PLATFORM_KEY',
      stages: [
        { requiredRoles: ['SECURITY_ADMIN', 'PLATFORM_SUPERADMIN'] },
        { requiredRoles: ['PLATFORM_SUPERADMIN'] },
      ],
    });
  });

  after(() => {
    (prisma.platformOperatorSession as any).findUnique = originalFindUniqueSession;
    (prisma.platformOperatorSession as any).updateMany = originalUpdateManySession;
    (prisma.platformOperator as any).findUnique = originalFindUniqueOperator;
    (prisma.platformOperator as any).updateMany = originalUpdateManyOperator;
  });

  it('1. Rejects self-approval attempt (Requester cannot approve their own stage)', async () => {
    const req = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519',
      policyId,
      'secops-alice@orbitox.io',
      { targetName: 'Primary Signing Key', reason: 'Emergency key breach response' }
    );

    // Operator Alice attempts to approve her own request
    await assert.rejects(
      async () => {
        await approvalEngine.approveStage(
          req.id,
          'stage_1',
          'secops-alice@orbitox.io',
          ['SECURITY_ADMIN', 'PLATFORM_SUPERADMIN'],
          'Self-approving my own request'
        );
      },
      (err: any) => {
        assert.ok(
          err.message.includes('SELF_APPROVAL_FORBIDDEN'),
          `Expected SELF_APPROVAL_FORBIDDEN, got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('2. Enforces RBAC against stage requiredRoles (Insufficient roles rejected)', async () => {
    const req = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519_2',
      policyId,
      'secops-alice@orbitox.io'
    );

    // Operator Bob with role SUPPORT_READONLY attempts to approve stage requiring SECURITY_ADMIN
    await assert.rejects(
      async () => {
        await approvalEngine.approveStage(
          req.id,
          'stage_1',
          'support-bob@orbitox.io',
          ['SUPPORT_READONLY'],
          'Attempting approval with readonly role'
        );
      },
      (err: any) => {
        assert.ok(
          err.message.includes('INSUFFICIENT_ROLES'),
          `Expected INSUFFICIENT_ROLES, got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('3. Enforces sequential stage progression (Stage 2 cannot be approved before Stage 1)', async () => {
    const req = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519_3',
      policyId,
      'secops-alice@orbitox.io'
    );

    // Operator Carol attempts to approve stage 2 while stage 1 is still pending
    await assert.rejects(
      async () => {
        await approvalEngine.approveStage(
          req.id,
          'stage_2',
          'carol@orbitox.io',
          ['PLATFORM_SUPERADMIN'],
          'Skipping stage 1'
        );
      },
      (err: any) => {
        assert.ok(
          err.message.includes('Prior stage stage_1 is still pending'),
          `Expected prior stage pending error, got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('4. Successfully executes multi-operator four-eyes approval workflow', async () => {
    const req = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519_4',
      policyId,
      'secops-alice@orbitox.io'
    );

    assert.strictEqual(req.status, 'PENDING');
    assert.strictEqual(req.stages[0]!.status, 'PENDING');
    assert.strictEqual(req.stages[1]!.status, 'PENDING');

    // Stage 1 approved by Bob (different from requester Alice)
    const afterStage1 = await approvalEngine.approveStage(
      req.id,
      'stage_1',
      'secops-bob@orbitox.io',
      ['SECURITY_ADMIN'],
      'Security review verified and signed'
    );

    assert.strictEqual(afterStage1.stages[0]!.status, 'APPROVED');
    assert.strictEqual(afterStage1.stages[0]!.approvedBy, 'secops-bob@orbitox.io');
    assert.strictEqual(afterStage1.status, 'PENDING'); // Overall still pending stage 2

    // Stage 2 approved by Superadmin Carol
    const afterStage2 = await approvalEngine.approveStage(
      req.id,
      'stage_2',
      'superadmin-carol@orbitox.io',
      ['PLATFORM_SUPERADMIN'],
      'Executive authorization granted'
    );

    assert.strictEqual(afterStage2.stages[1]!.status, 'APPROVED');
    assert.strictEqual(afterStage2.stages[1]!.approvedBy, 'superadmin-carol@orbitox.io');
    assert.strictEqual(afterStage2.status, 'APPROVED'); // Fully approved
  });

  it('5. Successfully executes rejection workflow and marks request as REJECTED', async () => {
    const req = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519_5',
      policyId,
      'secops-alice@orbitox.io'
    );

    const rejected = await approvalEngine.rejectRequest(
      req.id,
      'stage_1',
      'secops-bob@orbitox.io',
      ['SECURITY_ADMIN'],
      'Risk assessment failed; operation denied'
    );

    assert.strictEqual(rejected.status, 'REJECTED');
    assert.strictEqual(rejected.stages[0]!.status, 'REJECTED');
  });

  it('6. Approvals API: Unauthenticated GET/POST requests and fabricated API keys return 401', async () => {
    // Missing credentials
    const getReq = new NextRequest('http://localhost:3000/api/v1/platform/approvals', {
      method: 'GET',
    });
    const getRes = await GET(getReq);
    assert.strictEqual(getRes.status, 401);

    // Fabricated header bypass attempt (formerly accepted orb_live_ or admin prefix/keyword)
    const bypassReq = new NextRequest('http://localhost:3000/api/v1/platform/approvals', {
      method: 'GET',
      headers: {
        'x-api-key': 'orb_live_admin_secret_superkey',
        authorization: 'Bearer fake_string_token',
      },
    });
    const bypassRes = await GET(bypassReq);
    assert.strictEqual(bypassRes.status, 401);
  });

  it('7. Approvals API: Step-Up TOTP validation (wrong code rejected, valid code approved, replay rejected)', async () => {
    const { token, operator } = createMockOperatorSession({
      id: 'op_owner_totp_test',
      email: 'owner-totp@orbitox.io',
      role: 'PLATFORM_OWNER',
    });

    const req = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_totp_test',
      policyId,
      'requester-dave@orbitox.io'
    );

    // 7A: Invalid 6-digit TOTP code (non-matching HMAC)
    const invalidTotpReq = makeAuthorizedRequest(
      'http://localhost:3000/api/v1/platform/approvals',
      token,
      {
        method: 'POST',
        body: {
          requestId: req.id,
          stageId: 'stage_1',
          action: 'APPROVE',
          totpCode: '000000',
        },
      }
    );
    const invalidTotpRes = await POST(invalidTotpReq);
    assert.strictEqual(invalidTotpRes.status, 403);
    const invalidTotpJson = await invalidTotpRes.json();
    assert.strictEqual(invalidTotpJson.error.code, 'INVALID_TOTP');

    // 7B: Valid 6-digit TOTP code -> Success
    const validTotp = generateValidTotp(operator.totpSecret);
    const validTotpReq = makeAuthorizedRequest(
      'http://localhost:3000/api/v1/platform/approvals',
      token,
      {
        method: 'POST',
        body: {
          requestId: req.id,
          stageId: 'stage_1',
          action: 'APPROVE',
          totpCode: validTotp,
        },
      }
    );
    const validTotpRes = await POST(validTotpReq);
    assert.strictEqual(validTotpRes.status, 200);
    const validTotpJson = await validTotpRes.json();
    assert.strictEqual(validTotpJson.success, true);
    assert.strictEqual(validTotpJson.data.stages[0].status, 'APPROVED');

    // 7C: Replay attack with same TOTP step -> Rejected with 403 TOTP_REPLAY_DETECTED
    const req2 = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_totp_test_2',
      policyId,
      'requester-dave@orbitox.io'
    );

    const replayReq = makeAuthorizedRequest(
      'http://localhost:3000/api/v1/platform/approvals',
      token,
      {
        method: 'POST',
        body: {
          requestId: req2.id,
          stageId: 'stage_1',
          action: 'APPROVE',
          totpCode: validTotp, // Replaying the same code/step
        },
      }
    );
    const replayRes = await POST(replayReq);
    assert.strictEqual(replayRes.status, 403);
    const replayJson = await replayRes.json();
    assert.strictEqual(replayJson.error.code, 'TOTP_REPLAY_DETECTED');
  });

  it('8. Approvals API: Self-approval via API returns 403 SELF_APPROVAL_FORBIDDEN', async () => {
    const { token, operator } = createMockOperatorSession({
      id: 'op_self_approver',
      email: 'self-approver@orbitox.io',
      role: 'PLATFORM_OWNER',
    });

    const req = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_self_approval_api',
      policyId,
      'self-approver@orbitox.io' // Requester is the caller
    );

    const validTotp = generateValidTotp(operator.totpSecret, 30_000);
    const postReq = makeAuthorizedRequest(
      'http://localhost:3000/api/v1/platform/approvals',
      token,
      {
        method: 'POST',
        body: {
          requestId: req.id,
          stageId: 'stage_1',
          action: 'APPROVE',
          totpCode: validTotp,
        },
      }
    );

    const postRes = await POST(postReq);
    assert.strictEqual(postRes.status, 403);
    const data = await postRes.json();
    assert.strictEqual(data.error.code, 'SELF_APPROVAL_FORBIDDEN');
  });

  it('9. Approvals API: Role enforcement on approval and rejection (SUPPORT_READONLY denied)', async () => {
    const { token: readonlyToken } = createMockOperatorSession({
      id: 'op_readonly_support',
      email: 'support-agent@orbitox.io',
      role: 'SUPPORT_READONLY',
    });

    const req = await approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_role_test',
      policyId,
      'secops-alice@orbitox.io'
    );

    // Readonly operator attempts APPROVE
    const approveReq = makeAuthorizedRequest(
      'http://localhost:3000/api/v1/platform/approvals',
      readonlyToken,
      {
        method: 'POST',
        body: {
          requestId: req.id,
          stageId: 'stage_1',
          action: 'APPROVE',
          totpCode: '123456',
        },
      }
    );
    const approveRes = await POST(approveReq);
    assert.strictEqual(approveRes.status, 403);

    // Readonly operator attempts REJECT
    const rejectReq = makeAuthorizedRequest(
      'http://localhost:3000/api/v1/platform/approvals',
      readonlyToken,
      {
        method: 'POST',
        body: {
          requestId: req.id,
          stageId: 'stage_1',
          action: 'REJECT',
          comments: 'Readonly attempting unauthorized rejection',
        },
      }
    );
    const rejectRes = await POST(rejectReq);
    assert.strictEqual(rejectRes.status, 403);
    const rejectJson = await rejectRes.json();
    assert.strictEqual(rejectJson.error.code, 'INSUFFICIENT_ROLES');

    // Authorized operator (PLATFORM_OWNER) REJECT succeeds
    const { token: ownerToken } = createMockOperatorSession({
      id: 'op_owner_rejecter',
      email: 'owner-rejecter@orbitox.io',
      role: 'PLATFORM_OWNER',
    });

    const authorizedRejectReq = makeAuthorizedRequest(
      'http://localhost:3000/api/v1/platform/approvals',
      ownerToken,
      {
        method: 'POST',
        body: {
          requestId: req.id,
          stageId: 'stage_1',
          action: 'REJECT',
          comments: 'Security concern identified; rejection approved.',
        },
      }
    );
    const authorizedRejectRes = await POST(authorizedRejectReq);
    assert.strictEqual(authorizedRejectRes.status, 200);
    const authorizedRejectJson = await authorizedRejectRes.json();
    assert.strictEqual(authorizedRejectJson.success, true);
    assert.strictEqual(authorizedRejectJson.data.status, 'REJECTED');
  });

  it('10. Approvals API: GET returns truthful non-fabricated counts and normalized fields', async () => {
    const { token } = createMockOperatorSession({
      id: 'op_viewer',
      email: 'viewer@orbitox.io',
      role: 'OPERATOR',
    });

    const getReq = makeAuthorizedRequest(
      'http://localhost:3000/api/v1/platform/approvals',
      token
    );

    const getRes = await GET(getReq);
    assert.strictEqual(getRes.status, 200);
    const data = await getRes.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data.requests));
    assert.strictEqual(
      data.data.pendingCount,
      data.data.requests.filter((r: any) => r.status === 'PENDING').length
    );
    assert.strictEqual(
      data.data.approvedCount,
      data.data.requests.filter((r: any) => r.status === 'APPROVED').length
    );
    assert.strictEqual(
      data.data.rejectedCount,
      data.data.requests.filter((r: any) => r.status === 'REJECTED').length
    );

    // Verify dual schema normalization exists on every record
    for (const item of data.data.requests) {
      assert.ok(item.type, 'type must be defined');
      assert.ok(item.entityType, 'entityType must be defined');
      assert.ok(item.targetId, 'targetId must be defined');
      assert.ok(item.entityId, 'entityId must be defined');
      assert.ok(item.requestedAt, 'requestedAt must be defined');
      assert.ok(item.createdAt, 'createdAt must be defined');
    }
  });
});

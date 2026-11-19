import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { approvalEngine, auditService } from '@/app/api/v1/_lib/platform-governance';
import { GET, POST } from '@/app/api/v1/platform/approvals/route';
import { OPERATOR_SESSION_COOKIE } from '@/server/accounts/account-service';
import { sanitizeAuditPayload } from '@/server/audit/audit-console-service';

describe('Phase 7C: Production Approvals Workflow & Four-Eyes Security Gate', () => {
  const policyId = 'policy_test_four_eyes';
  const testContextId = 'ctx_test_audit_01';

  before(() => {
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

  it('1. Rejects self-approval attempt (Requester cannot approve their own stage)', async () => {
    const req = approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519',
      policyId,
      'secops-alice@orbitox.io',
      { targetName: 'Primary Signing Key', reason: 'Emergency key breach response' }
    );

    // Operator Alice attempts to approve her own request
    assert.throws(
      () => {
        approvalEngine.approveStage(
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
    const req = approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519_2',
      policyId,
      'secops-alice@orbitox.io'
    );

    // Operator Bob with role SUPPORT_READONLY attempts to approve stage requiring SECURITY_ADMIN
    assert.throws(
      () => {
        approvalEngine.approveStage(
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
    const req = approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519_3',
      policyId,
      'secops-alice@orbitox.io'
    );

    // Operator Carol attempts to approve stage 2 while stage 1 is still pending
    assert.throws(
      () => {
        approvalEngine.approveStage(
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
    const req = approvalEngine.requestApproval(
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
    const afterStage1 = approvalEngine.approveStage(
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
    const afterStage2 = approvalEngine.approveStage(
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
    const req = approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_master_ed25519_5',
      policyId,
      'secops-alice@orbitox.io'
    );

    const rejected = approvalEngine.rejectRequest(
      req.id,
      'secops-bob@orbitox.io',
      'Risk assessment failed; operation denied'
    );

    assert.strictEqual(rejected.status, 'REJECTED');
    assert.strictEqual(rejected.stages[0]!.status, 'REJECTED');
    assert.strictEqual(rejected.stages[1]!.status, 'REJECTED');
  });

  it('6. Approvals API: Unauthenticated GET/POST requests return 401 Unauthorized', async () => {
    const getReq = new NextRequest('http://localhost:3000/api/v1/platform/approvals', {
      method: 'GET',
    });
    const getRes = await GET(getReq);
    assert.strictEqual(getRes.status, 401);

    const postReq = new NextRequest('http://localhost:3000/api/v1/platform/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'app_req_test', action: 'APPROVE' }),
    });
    const postRes = await POST(postReq);
    assert.strictEqual(postRes.status, 401);
  });

  it('7. Approvals API: UI-to-API contract with stageId, requestId, action, totpCode', async () => {
    const req = approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_live_rotation_contract',
      policyId,
      'developer@orbitox.io'
    );

    // Call POST with valid API credential header
    const postReq = new NextRequest('http://localhost:3000/api/v1/platform/approvals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'orb_live_master_control_key',
      },
      body: JSON.stringify({
        requestId: req.id,
        stageId: 'stage_1',
        action: 'APPROVE',
        totpCode: '123456',
        comments: 'Step-up authorized APPROVE action from console UI.',
      }),
    });

    const postRes = await POST(postReq);
    assert.strictEqual(postRes.status, 200);

    const data = await postRes.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.id, req.id);
    assert.strictEqual(data.data.stages[0].status, 'APPROVED');
  });

  it('8. Approvals API: Self-approval via API returns 403 SELF_APPROVAL_FORBIDDEN', async () => {
    const req = approvalEngine.requestApproval(
      testContextId,
      'PLATFORM_KEY',
      'key_live_rotation_self',
      policyId,
      'machine_api@orbitox.io' // Same as API key caller
    );

    const postReq = new NextRequest('http://localhost:3000/api/v1/platform/approvals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'orb_live_master_control_key',
      },
      body: JSON.stringify({
        requestId: req.id,
        stageId: 'stage_1',
        action: 'APPROVE',
        totpCode: '123456',
        comments: 'Attempting self-approval via API',
      }),
    });

    const postRes = await POST(postReq);
    assert.strictEqual(postRes.status, 403);
    const data = await postRes.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.code, 'SELF_APPROVAL_FORBIDDEN');
  });

  it('9. Approvals API: GET returns truthful non-fabricated counts matching actual state', async () => {
    const getReq = new NextRequest('http://localhost:3000/api/v1/platform/approvals', {
      method: 'GET',
      headers: {
        'x-api-key': 'orb_live_master_control_key',
      },
    });

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
  });
});

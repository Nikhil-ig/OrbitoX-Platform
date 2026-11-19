import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ApprovalEngine, isDatabasePersistenceEnabled } from '@/app/api/v1/_lib/platform-governance';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.APP_DATABASE_URL ||
  'postgresql://postgres@127.0.0.1:5432/orbitox_phase2';

process.env.DATABASE_URL = databaseUrl;
process.env.APP_DATABASE_URL = databaseUrl;
process.env.ORBITOX_PLATFORM_REPOSITORY = 'prisma';
process.env.ORBITOX_MFA_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('base64');

async function main() {
  console.log('===============================================================');
  console.log(' 🪐 Phase 7C: PostgreSQL Approvals Concurrency & Persistence');
  console.log(' Target Database:', databaseUrl.replace(/:[^:@]+@/, ':***@'));
  console.log('===============================================================\n');

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await prisma.$connect();
    console.log('PASS  Connected to PostgreSQL successfully.');

    // 1. Setup governance policy
    const engine = new ApprovalEngine();
    const policyId = `policy_pg_test_${crypto.randomUUID().slice(0, 8)}`;
    engine.registerPolicy({
      id: policyId,
      name: 'PostgreSQL High-Risk Infrastructure Key Rotation',
      entityType: 'PLATFORM_KEY',
      stages: [
        { requiredRoles: ['SECURITY_ADMIN', 'PLATFORM_SUPERADMIN'] },
        { requiredRoles: ['PLATFORM_SUPERADMIN'] },
      ],
    });

    const contextId = `org_test_${crypto.randomUUID().slice(0, 8)}`;
    const requesterEmail = 'alice-secops@orbitox.io';

    // 2. Test Creation and Recovery after Process Restart
    console.log('\n--- 1. Testing Creation and Recovery after Process Restart ---');
    const created = await engine.requestApproval(
      contextId,
      'PLATFORM_KEY',
      'key_master_ed25519_pg',
      policyId,
      requesterEmail,
      { targetName: 'Production Root Signing Key', reason: 'Durable persistence test' }
    );

    assert.ok(created.id, 'Created approval request must have an ID');
    assert.strictEqual(created.status, 'PENDING');
    assert.strictEqual(created.stages.length, 2);

    // Verify row directly in PostgreSQL PlatformOperation
    const pgRow = await prisma.platformOperation.findUnique({
      where: { id: created.id },
    });
    assert.ok(pgRow, 'Approval request row must exist in PostgreSQL PlatformOperation table');
    assert.strictEqual(pgRow.status, 'PENDING');
    assert.strictEqual(pgRow.type, 'APPROVAL_REQUEST');
    console.log('PASS  Approval request written to PostgreSQL PlatformOperation table.');

    // Simulate complete process restart with fresh ApprovalEngine instance
    const restartedEngine = new ApprovalEngine();
    restartedEngine.registerPolicy({
      id: policyId,
      name: 'PostgreSQL High-Risk Infrastructure Key Rotation',
      entityType: 'PLATFORM_KEY',
      stages: [
        { requiredRoles: ['SECURITY_ADMIN', 'PLATFORM_SUPERADMIN'] },
        { requiredRoles: ['PLATFORM_SUPERADMIN'] },
      ],
    });

    const recovered = await restartedEngine.getRequest(created.id);
    assert.ok(recovered, 'Fresh engine must recover request from PostgreSQL after restart');
    assert.strictEqual(recovered.id, created.id);
    assert.strictEqual(recovered.status, 'PENDING');
    assert.strictEqual(recovered.requestedBy, requesterEmail);
    assert.strictEqual(recovered.stages[0]?.status, 'PENDING');
    assert.strictEqual(recovered.stages[1]?.status, 'PENDING');
    console.log('PASS  Process restart recovery confirmed from PostgreSQL database.');

    // 3. Test Concurrent Approvals of the Same Intermediate Stage
    console.log('\n--- 2. Testing Two Concurrent Approvals of Intermediate Stage 1 ---');
    const opBob = 'bob-security@orbitox.io';
    const opCharlie = 'charlie-security@orbitox.io';

    // Both attempt to approve stage_1 concurrently
    const [result1, result2] = await Promise.allSettled([
      restartedEngine.approveStage(created.id, 'stage_1', opBob, ['SECURITY_ADMIN'], 'Bob approves'),
      restartedEngine.approveStage(created.id, 'stage_1', opCharlie, ['SECURITY_ADMIN'], 'Charlie approves'),
    ]);

    const successes = [result1, result2].filter((r) => r.status === 'fulfilled');
    const failures = [result1, result2].filter((r) => r.status === 'rejected');

    assert.strictEqual(successes.length, 1, 'Exactly one concurrent approval must succeed');
    assert.strictEqual(failures.length, 1, 'Exactly one concurrent approval must be rejected');

    const rejectionReason = (failures[0] as PromiseRejectedResult).reason;
    assert.ok(
      rejectionReason.message.includes('CONCURRENCY_CONFLICT') ||
      rejectionReason.message.includes('already APPROVED'),
      `Expected concurrency conflict error, got: ${rejectionReason.message}`
    );
    console.log('PASS  Atomic CAS prevented duplicate approval; concurrency conflict detected.');

    // Verify PostgreSQL state reflects exactly one approval for stage_1
    const postStage1Row = await prisma.platformOperation.findUnique({
      where: { id: created.id },
    });
    const postStage1Req = (restartedEngine as any).operationRowToApprovalRequest
      ? (restartedEngine as any).operationRowToApprovalRequest(postStage1Row)
      : postStage1Row;

    const steps = (postStage1Row?.steps as any[]) || [];
    assert.strictEqual(steps[0]?.status, 'APPROVED', 'Stage 1 must be APPROVED in PostgreSQL');
    assert.strictEqual(steps[1]?.status, 'PENDING', 'Stage 2 must remain PENDING in PostgreSQL');
    assert.strictEqual(postStage1Row?.status, 'PENDING', 'Overall request must remain PENDING');
    console.log('PASS  PostgreSQL state preserved with intermediate stage 1 approved and stage 2 pending.');

    // 4. Verify Durable Audit Trail in PostgreSQL PlatformAuditEvent
    console.log('\n--- 3. Testing Durable Audit Trail in PostgreSQL ---');
    const auditEntries = await prisma.platformAuditEvent.findMany({
      where: { entityId: created.id },
      orderBy: { occurredAt: 'desc' },
    });

    assert.ok(auditEntries.length >= 1, 'Durable audit entry must be recorded in PlatformAuditEvent');
    const stageApprovedAudit = auditEntries.find(
      (a) => a.action === 'FOUR_EYES_APPROVAL_STAGE_APPROVED'
    );
    assert.ok(stageApprovedAudit, 'FOUR_EYES_APPROVAL_STAGE_APPROVED audit record must exist');
    assert.strictEqual(stageApprovedAudit.entityType, 'APPROVAL_REQUEST');
    console.log('PASS  Durable PostgreSQL audit entry verified in PlatformAuditEvent table.');

    // 5. Test Concurrent Approval and Rejection
    console.log('\n--- 4. Testing Concurrent Approval and Rejection on New Request ---');
    const created2 = await engine.requestApproval(
      contextId,
      'PLATFORM_KEY',
      'key_master_ed25519_pg_race',
      policyId,
      requesterEmail,
      { targetName: 'Racing Key', reason: 'Race condition test' }
    );

    const [raceApprove, raceReject] = await Promise.allSettled([
      restartedEngine.approveStage(created2.id, 'stage_1', opBob, ['SECURITY_ADMIN'], 'Concurrent approve'),
      restartedEngine.rejectRequest(created2.id, 'stage_1', opCharlie, ['SECURITY_ADMIN'], 'Concurrent reject'),
    ]);

    const raceSuccesses = [raceApprove, raceReject].filter((r) => r.status === 'fulfilled');
    const raceFailures = [raceApprove, raceReject].filter((r) => r.status === 'rejected');

    assert.strictEqual(raceSuccesses.length, 1, 'Exactly one transition must succeed in approval/rejection race');
    assert.strictEqual(raceFailures.length, 1, 'The losing transition must be rejected with conflict');
    console.log('PASS  Concurrent approval vs rejection race resolved atomically.');

    // 6. Test Multi-Stage Sequential Completion to Final State
    console.log('\n--- 5. Testing Multi-Stage Sequential Completion ---');
    const created3 = await engine.requestApproval(
      contextId,
      'PLATFORM_KEY',
      'key_master_ed25519_pg_complete',
      policyId,
      requesterEmail,
      { targetName: 'Sequential Key', reason: 'End-to-end completion test' }
    );

    // Stage 1 approval
    await restartedEngine.approveStage(created3.id, 'stage_1', opBob, ['SECURITY_ADMIN'], 'Stage 1 verified');

    // Stage 2 approval by Superadmin
    const opDiana = 'diana-superadmin@orbitox.io';
    const finalized = await restartedEngine.approveStage(
      created3.id,
      'stage_2',
      opDiana,
      ['PLATFORM_SUPERADMIN'],
      'Stage 2 finalized'
    );

    assert.strictEqual(finalized.status, 'APPROVED', 'Overall status must become APPROVED');
    assert.strictEqual(finalized.stages[0]?.status, 'APPROVED');
    assert.strictEqual(finalized.stages[1]?.status, 'APPROVED');

    // Verify completedAt timestamp in PostgreSQL
    const finalPgRow = await prisma.platformOperation.findUnique({
      where: { id: created3.id },
    });
    assert.strictEqual(finalPgRow?.status, 'APPROVED');
    assert.ok(finalPgRow?.completedAt instanceof Date, 'completedAt must be populated in DB');
    console.log('PASS  Multi-stage sequential completion verified in PostgreSQL.');

    // Clean up test rows
    await prisma.platformOperation.deleteMany({
      where: { id: { in: [created.id, created2.id, created3.id] } },
    });
    await prisma.platformAuditEvent.deleteMany({
      where: { entityId: { in: [created.id, created2.id, created3.id] } },
    });

    console.log('\n===============================================================');
    console.log(' ALL POSTGRESQL APPROVALS TESTS PASSED (6/6)');
    console.log('===============================================================');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n✖ PostgreSQL Approvals Concurrency Test Failed:\n', err);
  process.exit(1);
});

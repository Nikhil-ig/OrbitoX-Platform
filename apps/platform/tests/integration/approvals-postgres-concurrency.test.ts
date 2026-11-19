import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PrismaClient } from '@prisma/client';
import { ApprovalEngine, isDatabasePersistenceEnabled } from '@/app/api/v1/_lib/platform-governance';
import { recordPlatformAuditEvent, auditConsoleService } from '@/server/audit/audit-console-service';
import { platformRepository } from '@/server/db/platform-repository';
import { packageSignatureService } from '@/server/governance/package-signature-service';
import { CryptoSigner } from '@orbitox-io/plugin-engine';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.APP_DATABASE_URL ||
  'postgresql://postgres@127.0.0.1:5432/orbitox_phase2';

process.env.DATABASE_URL = databaseUrl;
process.env.APP_DATABASE_URL = databaseUrl;
process.env.PLATFORM_ADMIN_AUDIT_DATABASE_URL ||= process.env.PLATFORM_AUDIT_DATABASE_URL || databaseUrl;
process.env.PLATFORM_AUDIT_DATABASE_URL ||= databaseUrl;
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

    // Clean up test approval rows
    await prisma.platformOperation.deleteMany({
      where: { id: { in: [created.id, created2.id, created3.id] } },
    });
    await prisma.platformAuditEvent.deleteMany({
      where: { entityId: { in: [created.id, created2.id, created3.id] } },
    });

    // 6. Test Concurrent Audit Ledger Writers within the same tenant scope
    console.log('\n--- 6. Testing Concurrent Audit Ledger Writers within the same tenant scope ---');
    const testOrgId = `org_audit_${crypto.randomUUID().slice(0, 8)}`;
    const testProjId = `proj_${crypto.randomUUID().slice(0, 8)}`;
    const testEnvId = 'prod';
    const auditScope = `org/${testOrgId}/project/${testProjId}/environment/${testEnvId}`;

    const numConcurrent = 8;
    const writeResults = await Promise.all(
      Array.from({ length: numConcurrent }).map((_, i) =>
        recordPlatformAuditEvent(prisma as any, {
          action: `PLATFORM_SECURITY_EVENT_${i}`,
          entityType: 'SECURITY_AUDIT',
          entityId: `sec_ent_${i}`,
          organizationId: testOrgId,
          projectId: testProjId,
          environmentId: testEnvId,
          actorId: `operator_${i}@orbitox.io`,
          reason: `Concurrent write validation step ${i}`,
          metadata: { stepIndex: i, testRunId: testOrgId },
        })
      )
    );

    assert.strictEqual(writeResults.length, numConcurrent, 'All concurrent audit writes must succeed');

    // Retrieve all events directly from PostgreSQL
    const savedEvents = await prisma.platformAuditEvent.findMany({
      where: {
        organizationId: testOrgId,
        projectId: testProjId,
        environmentId: testEnvId,
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });

    assert.strictEqual(savedEvents.length, numConcurrent, `Must persist exactly ${numConcurrent} audit events`);

    const sequences = savedEvents.map((e) => (e.metadata as any)._chain?.sequence);
    assert.deepStrictEqual(
      sequences,
      Array.from({ length: numConcurrent }, (_, i) => i + 1),
      'Sequences must be perfectly continuous (1..n) without forks, gaps, or duplicates'
    );

    // Verify hash link chaining
    assert.strictEqual(
      (savedEvents[0]!.metadata as any)._chain.previousHash,
      'GENESIS',
      'Genesis event must have previousHash GENESIS'
    );
    for (let i = 1; i < savedEvents.length; i++) {
      const prevRowHash = (savedEvents[i - 1]!.metadata as any)._chain.rowHash;
      const currPrevHash = (savedEvents[i]!.metadata as any)._chain.previousHash;
      assert.strictEqual(
        currPrevHash,
        prevRowHash,
        `Event at sequence ${i + 1} must link to predecessor rowHash`
      );
    }

    // Verify chain cryptographically using auditConsoleService
    const verifyResult = await auditConsoleService.verifyPostgresAuditChain({ scope: auditScope, client: prisma });
    assert.strictEqual(verifyResult.valid, true, 'Audit chain must verify cryptographically');
    assert.strictEqual(verifyResult.status, 'VERIFIED');
    assert.strictEqual(verifyResult.verifiedChainEntries, numConcurrent);
    console.log(`PASS  ${numConcurrent} concurrent audit writes serialized with continuous hash chain.`);

    // 7. Test Independent Tenant Scopes have Independent Sequences
    console.log('\n--- 7. Testing Independent Tenant Scopes have Independent Sequences ---');
    const scopeAOrg = `org_a_${crypto.randomUUID().slice(0, 8)}`;
    const scopeBOrg = `org_b_${crypto.randomUUID().slice(0, 8)}`;
    const scopeA = `org/${scopeAOrg}/project/proj_alpha/environment/prod`;
    const scopeB = `org/${scopeBOrg}/project/proj_beta/environment/prod`;

    const [eventA, eventB] = await Promise.all([
      recordPlatformAuditEvent(prisma as any, {
        action: 'SCOPE_A_INIT',
        entityType: 'TENANT',
        organizationId: scopeAOrg,
        projectId: 'proj_alpha',
        environmentId: 'prod',
      }),
      recordPlatformAuditEvent(prisma as any, {
        action: 'SCOPE_B_INIT',
        entityType: 'TENANT',
        organizationId: scopeBOrg,
        projectId: 'proj_beta',
        environmentId: 'prod',
      }),
    ]);

    assert.strictEqual((eventA.metadata as any)._chain.sequence, 1, 'Scope A must start at sequence 1');
    assert.strictEqual((eventA.metadata as any)._chain.previousHash, 'GENESIS');
    assert.strictEqual((eventB.metadata as any)._chain.sequence, 1, 'Scope B must start at sequence 1');
    assert.strictEqual((eventB.metadata as any)._chain.previousHash, 'GENESIS');

    const verifyA = await auditConsoleService.verifyPostgresAuditChain({ scope: scopeA, client: prisma });
    assert.strictEqual(verifyA.valid, true);
    assert.strictEqual(verifyA.status, 'VERIFIED');

    const verifyB = await auditConsoleService.verifyPostgresAuditChain({ scope: scopeB, client: prisma });
    assert.strictEqual(verifyB.valid, true);
    assert.strictEqual(verifyB.status, 'VERIFIED');
    console.log('PASS  Independent tenant scopes maintain independent genesis states and sequences.');

    // 8. Test Tampering Detection in PostgreSQL
    console.log('\n--- 8. Testing Tampering Detection in PostgreSQL ---');
    const targetTamperId = savedEvents[3]!.id;
    await prisma.platformAuditEvent.update({
      where: { id: targetTamperId },
      data: { action: 'MALICIOUS_UNAUTHORIZED_MUTATION' },
    });

    const tamperCheck = await auditConsoleService.verifyPostgresAuditChain({ scope: auditScope, client: prisma });
    assert.strictEqual(tamperCheck.valid, false, 'Tampered ledger must fail verification');
    assert.strictEqual(tamperCheck.status, 'FAILED', 'Status must be FAILED on tampered record');
    assert.ok(
      tamperCheck.details?.includes('discrepancy') || tamperCheck.brokenAtIndex !== undefined,
      'Must report hash discrepancy or broken index'
    );
    console.log('PASS  PostgreSQL tampering detected and rejected with status FAILED.');

    // 9. Test Repository Audit Writes and Intent Resolution Consistency
    console.log('\n--- 9. Testing Repository Audit Writes & Intent Resolution Consistency ---');
    const intentOrgId = `org_intent_${crypto.randomUUID().slice(0, 8)}`;
    const intentProjId = `proj_intent_${crypto.randomUUID().slice(0, 8)}`;
    const intentScope = `org/${intentOrgId}/project/${intentProjId}/environment/platform-admin`;

    const intentId = await platformRepository.createPlatformAdminAuditIntent({
      action: 'PLATFORM_QUOTA_OVERRIDE_INTENT',
      entityType: 'QUOTA',
      entityId: 'quota_override_1',
      organizationId: intentOrgId,
      projectId: intentProjId,
      environmentId: 'platform-admin',
      reason: 'Testing atomic intent persistence',
      metadata: { targetLimit: 50000 },
    });

    assert.ok(intentId, 'Audit intent must be recorded with an ID');
    const pendingIntentRow = await prisma.platformAuditEvent.findUnique({ where: { id: intentId } });
    assert.ok(pendingIntentRow);
    assert.strictEqual(pendingIntentRow.status, 'PENDING');
    assert.ok((pendingIntentRow.metadata as any)?._chain?.rowHash, 'Intent row must contain _chain rowHash');

    // Verify intent in PENDING state
    const preResolveCheck = await auditConsoleService.verifyPostgresAuditChain({ scope: intentScope, client: prisma });
    assert.strictEqual(preResolveCheck.valid, true);
    assert.strictEqual(preResolveCheck.status, 'VERIFIED');

    // Simulate resolve_platform_audit_intent updating status to COMMITTED and adding previousValue
    await prisma.platformAuditEvent.update({
      where: { id: intentId },
      data: {
        status: 'COMMITTED',
        metadata: {
          ...(pendingIntentRow.metadata as any),
          previousValue: 1200,
        },
      },
    });

    // Verification must remain valid using initialStatus intent handling
    const postResolveCheck = await auditConsoleService.verifyPostgresAuditChain({ scope: intentScope, client: prisma });
    assert.strictEqual(postResolveCheck.valid, true, 'Resolved intent must verify with initialStatus');
    assert.strictEqual(postResolveCheck.status, 'VERIFIED');
    console.log('PASS  Platform repository audit intent creation and resolution verified.');

    // 10. Test Real PostgreSQL Package Release Persistence & Verification
    console.log('\n--- 10. Testing Real PostgreSQL Package Release Persistence & Verification ---');
    const keyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    const tempPkgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-pg-pkg-'));

    try {
      const manifest = {
        id: '@orbitox/postgres-suite',
        name: 'PostgreSQL Verification Suite',
        version: '1.2.0',
        displayName: 'PostgreSQL Platform Verification Suite',
        category: 'GOVERNANCE',
      };
      fs.writeFileSync(path.join(tempPkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      fs.mkdirSync(path.join(tempPkgDir, 'dist'));
      fs.writeFileSync(path.join(tempPkgDir, 'dist', 'index.js'), 'export const verified = true;');

      const authenticSignature = CryptoSigner.signPackageDirectory(
        tempPkgDir,
        keyPair.privateKey,
        'orbitox-pg-authority'
      );
      const signatureJson = JSON.stringify(authenticSignature);

      const pkgUniqueId = `pkg_pg_${crypto.randomUUID().slice(0, 8)}`;
      const verUniqueId = `ver_pg_${crypto.randomUUID().slice(0, 8)}`;

      // Insert directly into PostgreSQL database tables
      await prisma.platformPackage.create({
        data: {
          id: pkgUniqueId,
          packageId: '@orbitox/postgres-suite',
          name: 'PostgreSQL Verification Suite',
          category: 'GOVERNANCE',
          publisher: 'OrbitoX Core',
          currentStableVersion: '1.2.0',
          signingPublicKeyPem: keyPair.publicKey,
          isCore: true,
        },
      });

      await prisma.packageVersion.create({
        data: {
          id: verUniqueId,
          packageId: pkgUniqueId,
          version: '1.2.0',
          tarballSha256: 'mock_postgres_tarball_hash',
          manifestHash: authenticSignature.manifestHash,
          signerId: authenticSignature.signerId || 'orbitox-pg-authority',
          signature: signatureJson,
          minPlatformVersion: '1.0.0',
          releaseNotes: 'PostgreSQL real persistence integration test release',
        },
      });

      // Verify retrieval through platformRepository
      const packagesList = await platformRepository.listPackages();
      const persistedPkg = packagesList.find((p) => p.packageId === '@orbitox/postgres-suite');
      assert.ok(persistedPkg, 'Persisted package must be returned by platformRepository.listPackages()');
      assert.strictEqual(persistedPkg.currentStableVersion, '1.2.0');

      const versionsList = await platformRepository.listPackageVersions(pkgUniqueId);
      assert.strictEqual(versionsList.length, 1);
      assert.strictEqual(versionsList[0]!.version, '1.2.0');

      // Verify signature with packageSignatureService
      const verification = packageSignatureService.verifyPackageRelease(persistedPkg, versionsList);
      assert.strictEqual(verification.signatureVerified, true, 'Package signature must verify');
      assert.strictEqual(verification.integrityStatus, 'VERIFIED');
      assert.strictEqual(verification.verifiedAlgorithm, 'Ed25519');
      console.log('PASS  Real PostgreSQL package release persistence and Ed25519 verification confirmed.');

      // Clean up package rows
      await prisma.packageVersion.deleteMany({ where: { packageId: pkgUniqueId } });
      await prisma.platformPackage.deleteMany({ where: { id: pkgUniqueId } });
    } finally {
      fs.rmSync(tempPkgDir, { recursive: true, force: true });
    }

    // Clean up audit test rows
    await prisma.platformAuditEvent.deleteMany({
      where: {
        organizationId: { in: [testOrgId, scopeAOrg, scopeBOrg, intentOrgId] },
      },
    });

    console.log('\n===============================================================');
    console.log(' ALL POSTGRESQL APPROVALS, AUDIT CHAIN & PACKAGE TESTS PASSED (10/10)');
    console.log('===============================================================');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n✖ PostgreSQL Approvals Concurrency Test Failed:\n', err);
  process.exit(1);
});

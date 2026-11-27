import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { buildCanonicalMcpAuditEvent } from '@/server/ai/mcp-audit-events';

const execFileAsync = promisify(execFile);

const ownerUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://orbitox_migrator:orbitox_migrator_dev@127.0.0.1:5432/orbitox_phase2';
const runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:85dcad3a709ba6453e26f746aaa1c9634df8@127.0.0.1:5432/orbitox_phase2';
const outboxUrl = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:f90c0ae5840504a8950cb2f4c346936b086e@127.0.0.1:5432/orbitox_phase2';
const auditUrl = process.env.PLATFORM_ADMIN_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:b997c9c6a340c84ced364b379c42c9433d70@127.0.0.1:5432/orbitox_phase2';
const reconcilerUrl = process.env.MCP_RECONCILER_DATABASE_URL || 'postgresql://orbitox_mcp_reconciler:e8a93bf1647cb4e815d78a9c024d9f1a234e@127.0.0.1:5432/orbitox_phase2';
const cleanupUrl = process.env.CLEANUP_DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';

describe('Real Compiled MCP Governance Worker Verification', () => {
  const owner = new PrismaClient({ datasourceUrl: ownerUrl });
  const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
  const cleaner = new PrismaClient({ datasourceUrl: cleanupUrl });

  const runId = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const orgId = `org_wkr_${runId}`;
  const projId = `proj_wkr_${runId}`;
  const envId = `env_wkr_${runId}`;
  const tenantScope = `org/${orgId}/project/${projId}/environment/${envId}`;

  const invId = `inv_wkr_${runId}`;
  const appId = `app_wkr_${runId}`;
  const execId = `exec_wkr_${runId}`;
  const outboxId = `outbox_mcp_${runId}`;

  // Stale execution for reconciler test
  const staleAppId = `app_stale_${runId}`;
  const staleExecId = `exec_stale_${runId}`;

  let canonicalEnvelope: ReturnType<typeof buildCanonicalMcpAuditEvent>;

  before(async () => {
    // 1. Seed Org, Project, Environment
    await owner.platformOrganization.create({
      data: { id: orgId, slug: orgId, name: 'Worker Test Org', billingEmail: `wkr_${runId}@test.invalid` },
    });
    await owner.platformProject.create({
      data: {
        id: projId,
        organizationId: orgId,
        slug: projId,
        name: 'Worker Project',
        businessModel: 'B2B_SAAS',
        planTier: 'starter',
        technicalLead: 'lead@test.invalid',
        contactEmail: 'contact@test.invalid',
      },
    });
    await owner.projectEnvironment.create({
      data: { id: envId, projectId: projId, slug: 'prod', name: 'Prod', type: 'PRODUCTION' },
    });

    // 2. Build Canonical MCP Outbox Event
    canonicalEnvelope = buildCanonicalMcpAuditEvent({
      eventType: 'mcp.audit.execution_intent',
      executionId: execId,
      approvalId: appId,
      toolName: 'system_health_check',
      serverId: 'srv_worker',
      approvalPolicy: 'ASK_FIRST',
      tenantScope,
      canonicalTenantId: tenantScope,
      actorId: `user_${runId}`,
      actorEmail: `user_${runId}@example.com`,
      idempotencyKey: `mcp_intent_${runId}`,
      sanitizedParams: { check: 'disk_space', verbosity: 'info' },
      reason: 'Automated health verification intent',
    });

    // 3. Seed Invocations, Approvals, Executions via runtime in transaction
    await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantScope}, true)`;

      // Fresh invocation + approval + execution
      await tx.mcpToolInvocation.create({
        data: {
          id: invId,
          tenantScope,
          toolName: 'system_health_check',
          serverId: 'srv_worker',
          approvalPolicy: 'ASK_FIRST',
          status: 'EXECUTION_INTENT',
          actorId: `user_${runId}`,
          authType: 'API_KEY',
          callerAgent: 'worker_agent',
          sanitizedParams: { check: 'disk_space' },
          latencyMs: 15,
        },
      });
      await tx.mcpToolApproval.create({
        data: {
          id: appId,
          invocationId: invId,
          tenantScope,
          toolName: 'system_health_check',
          serverId: 'srv_worker',
          approvalPolicy: 'ASK_FIRST',
          status: 'PROPOSED',
          paramsHash: 'h_wkr',
          sanitizedParams: {},
          previewSummary: 'Worker test proposal',
          requestedById: `user_${runId}`,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      await tx.mcpToolExecution.create({
        data: {
          id: execId,
          approvalId: appId,
          invocationId: invId,
          tenantScope,
          toolName: 'system_health_check',
          idempotencyKey: `exec_key_${runId}`,
          status: 'EXECUTION_INTENT',
        },
      });

      // Stale execution for reconciler (expired lease, no reconciliation)
      await tx.mcpToolApproval.create({
        data: {
          id: staleAppId,
          invocationId: invId,
          tenantScope,
          toolName: 'system_health_check',
          serverId: 'srv_worker',
          approvalPolicy: 'ASK_FIRST',
          status: 'EXECUTING',
          paramsHash: 'h_stale',
          sanitizedParams: {},
          previewSummary: 'Stale test proposal',
          requestedById: `user_${runId}`,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      await tx.mcpToolExecution.create({
        data: {
          id: staleExecId,
          approvalId: staleAppId,
          invocationId: invId,
          tenantScope,
          toolName: 'system_health_check',
          idempotencyKey: `exec_stale_${runId}`,
          status: 'EXECUTION_INTENT',
          leaseOwner: 'crashed_worker',
          leaseExpiresAt: new Date(Date.now() - 300000), // Expired 5 mins ago
          reconciliationStatus: null,
          attemptNumber: 1,
        },
      });

      // 4. Seed Canonical MCP Outbox Row in PlatformOutboxMessage via runtime
      await tx.platformOutboxMessage.create({
        data: {
          id: outboxId,
          eventType: canonicalEnvelope.outboxEventType,
          aggregateType: canonicalEnvelope.aggregateType,
          aggregateId: canonicalEnvelope.aggregateId,
          deduplicationKey: canonicalEnvelope.deduplicationKey,
          tenantId: canonicalEnvelope.canonicalTenantId,
          status: 'PENDING',
          payload: canonicalEnvelope.outboxPayload,
        },
      });
    });
  });

  after(async () => {
    // Cleanup fixtures
    await cleaner.platformOutboxMessage.deleteMany({ where: { id: outboxId } }).catch(() => {});
    await cleaner.mcpToolExecution.deleteMany({ where: { id: { in: [execId, staleExecId] } } }).catch(() => {});
    await cleaner.mcpToolApproval.deleteMany({ where: { id: { in: [appId, staleAppId] } } }).catch(() => {});
    await cleaner.mcpToolInvocation.deleteMany({ where: { id: invId } }).catch(() => {});
    await cleaner.platformAuditEvent.deleteMany({ where: { entityId: { in: [execId, staleExecId, appId] } } }).catch(() => {});
    await cleaner.projectEnvironment.deleteMany({ where: { id: envId } }).catch(() => {});
    await cleaner.platformProject.deleteMany({ where: { id: projId } }).catch(() => {});
    await cleaner.platformOrganization.deleteMany({ where: { id: orgId } }).catch(() => {});

    await Promise.all([owner.$disconnect(), runtime.$disconnect(), cleaner.$disconnect()]);
  });

  it('executes compiled worker with least-privilege roles, successfully dispatching outbox and reconciling stale execution', async () => {
    // Execute the real compiled worker script
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      APP_DATABASE_URL: runtimeUrl,
      OUTBOX_RELAY_DATABASE_URL: outboxUrl,
      PLATFORM_ADMIN_AUDIT_DATABASE_URL: auditUrl,
      MCP_RECONCILER_DATABASE_URL: reconcilerUrl,
      ORBITOX_PLATFORM_REPOSITORY: 'prisma',
      NODE_ENV: 'production' as const,
    };

    const { stdout, stderr } = await execFileAsync('node', ['scripts/mcp-governance-worker.js'], {
      cwd: process.cwd(),
      env,
    });

    console.log('Worker stdout:', stdout);
    if (stderr) console.error('Worker stderr:', stderr);

    // Parse the worker complete JSON summary
    const logMatch = stdout.split('\n').find((line) => line.includes('mcp.governance_worker_complete'));
    assert.ok(logMatch, 'Worker must emit mcp.governance_worker_complete event');

    const summary = JSON.parse(logMatch);
    console.log('Parsed worker summary:', summary);

    // 1. Verify Outbox metrics: claimed > 0 and dispatched > 0
    assert.ok(summary.outbox.claimed > 0, `Expected claimed > 0, got ${summary.outbox.claimed}`);
    assert.ok(summary.outbox.dispatched > 0, `Expected dispatched > 0, got ${summary.outbox.dispatched}`);

    // Verify retried is 0 on permanent conflicts (never spinning indefinitely)
    assert.equal(summary.outbox.retried, 0, 'Permanent errors must never spin in retry loop');

    // 2. Verify Reconciler metrics: reconciled >= 1
    assert.ok(summary.reconciler.reconciled >= 1, `Expected reconciled >= 1, got ${summary.reconciler.reconciled}`);

    // 3. Verify Database state:
    // A. Outbox message status transitioned to DISPATCHED
    const updatedOutbox = await cleaner.platformOutboxMessage.findUnique({
      where: { id: outboxId },
    });
    assert.ok(updatedOutbox);
    assert.equal(updatedOutbox.status, 'DISPATCHED');
    assert.ok(updatedOutbox.dispatchedAt);

    // B. PlatformAuditEvent persisted with deterministic ID and scope parity
    const auditEvent = await cleaner.platformAuditEvent.findUnique({
      where: { id: canonicalEnvelope.auditInput.deterministicId },
    });
    assert.ok(auditEvent, 'Deterministic PlatformAuditEvent must exist in DB');
    assert.equal(auditEvent.action, canonicalEnvelope.auditInput.action);
    assert.equal(auditEvent.entityId, execId);
    assert.equal(auditEvent.organizationId, orgId);
    assert.equal(auditEvent.projectId, projId);
    assert.equal(auditEvent.environmentId, envId);
    assert.equal(auditEvent.requestId, execId);

    // C. Stale execution marked as RECONCILED (RECONCILED_NOT_STARTED for intent)
    const updatedStaleExec = await cleaner.mcpToolExecution.findUnique({
      where: { id: staleExecId },
    });
    assert.ok(updatedStaleExec);
    assert.equal(updatedStaleExec.reconciliationStatus, 'RECONCILED_NOT_STARTED');
  });
});

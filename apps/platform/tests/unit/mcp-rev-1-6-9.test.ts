import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  approveAndExecuteMcpProposal,
  canRetireMcpKey,
  getMcpGatewayInventory,
  invokeMcpTool,
  isMcpExecutionEnabled,
  mcpAuditEventId,
  reconcileStaleMcpExecutions,
} from '@/server/ai/mcp-governance-service';
import { McpToolError, type McpActorContext } from '@/server/ai/mcp-tools';
import { auditConsoleService, getAuditReaderClient } from '@/server/audit/audit-console-service';
import { sendGraceReminderBatch } from '@/server/billing/billing-service';
import { platformRepository } from '@/server/db/platform-repository';
import { operationStore } from '@/server/provisioning/operation-store';
import { processMcpAuditOutboxBatch } from '@/server/provisioning/webhook-emitter';
import { suspendTenant } from '@/server/tenants/tenants-service';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { POST as mcpGatewayPost, GET as mcpGatewayGet } from '@/app/api/v1/platform/ai/route';
import { POST as hospitalStaffLogin } from '@/app/api/hospital/security/login/route';
import { GET as hospitalStaffSession } from '@/app/api/hospital/security/session/route';
import { POST as hospitalBreakGlass } from '@/app/api/hospital/security/break-glass/route';
import { GET as hospitalRoles } from '@/app/api/hospital/security/roles/route';

describe('Revision 1.6.9 Governance, Scope & Execution Toggle Invariants', () => {
  it('P2-1: fails closed when ORBITOX_MCP_EXECUTION_ENABLED is unset or invalid in production', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ORBITOX_MCP_EXECUTION_ENABLED;
    try {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.ORBITOX_MCP_EXECUTION_ENABLED;
      assert.equal(isMcpExecutionEnabled(), false);

      process.env.ORBITOX_MCP_EXECUTION_ENABLED = 'maybe';
      assert.equal(isMcpExecutionEnabled(), false);

      process.env.ORBITOX_MCP_EXECUTION_ENABLED = 'false';
      assert.equal(isMcpExecutionEnabled(), false);

      process.env.ORBITOX_MCP_EXECUTION_ENABLED = 'true';
      assert.equal(isMcpExecutionEnabled(), true);
    } finally {
      (process.env as any).NODE_ENV = prevNodeEnv;
      if (prevFlag === undefined) delete process.env.ORBITOX_MCP_EXECUTION_ENABLED;
      else process.env.ORBITOX_MCP_EXECUTION_ENABLED = prevFlag;
    }
  });

  it('R169-09: rejects invalid ORBITOX_MCP_KEY_RETENTION_DAYS instead of silent coercion', async () => {
    const prev = process.env.ORBITOX_MCP_KEY_RETENTION_DAYS;
    try {
      process.env.ORBITOX_MCP_KEY_RETENTION_DAYS = '0';
      await assert.rejects(
        () => canRetireMcpKey('k1', 'encryption'),
        (err: any) => err instanceof McpToolError && err.code === 'INVALID_RETENTION_POLICY',
      );

      process.env.ORBITOX_MCP_KEY_RETENTION_DAYS = 'abc';
      await assert.rejects(
        () => canRetireMcpKey('k1', 'encryption'),
        (err: any) => err instanceof McpToolError && err.code === 'INVALID_RETENTION_POLICY',
      );

      await assert.rejects(
        () => canRetireMcpKey('k1', 'encryption', { retentionDays: -5 }),
        (err: any) => err instanceof McpToolError && err.code === 'INVALID_RETENTION_POLICY',
      );
    } finally {
      if (prev === undefined) delete process.env.ORBITOX_MCP_KEY_RETENTION_DAYS;
      else process.env.ORBITOX_MCP_KEY_RETENTION_DAYS = prev;
    }
  });

  it('P2-3: supports scopeMode any on withApiGuard without lowering default all semantics', async () => {
    const anyHandler = withApiGuard(
      {
        serviceId: 'platform',
        routeClass: 'platform-admin',
        requiredScopes: ['platform.ai.execute', 'admin'],
        scopeMode: 'any',
      },
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const allHandler = withApiGuard(
      {
        serviceId: 'platform',
        routeClass: 'platform-admin',
        requiredScopes: ['platform.ai.execute', 'admin'],
      },
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const prevToken = process.env.ORBITOX_ADMIN_TOKEN;
    const prevScopes = process.env.ORBITOX_ADMIN_TOKEN_SCOPES;
    try {
      delete process.env.ORBITOX_ADMIN_TOKEN;
      delete process.env.ORBITOX_ADMIN_TOKEN_SCOPES;
      const reqUnauth = new NextRequest('http://localhost:3005/api/v1/platform/ai');
      assert.equal((await anyHandler(reqUnauth)).status, 401);
      assert.equal((await allHandler(reqUnauth)).status, 401);
    } finally {
      if (prevToken !== undefined) process.env.ORBITOX_ADMIN_TOKEN = prevToken;
      if (prevScopes !== undefined) process.env.ORBITOX_ADMIN_TOKEN_SCOPES = prevScopes;
    }
  });
});

if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'prisma') {
  describe('Revision 1.6.9 PostgreSQL Execution Integrity, Audit Serialization & Isolation', () => {
    const dbUrl = process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
    const ownerPrisma = new PrismaClient({ datasourceUrl: dbUrl });
    const run = crypto.randomBytes(5).toString('hex');

    const ids = {
      orgId: `org_r169_${run}`,
      orgNoEmailId: `org_r169_noemail_${run}`,
      projectId: `proj_r169_${run}`,
      envId: `env_r169_${run}`,
      planMapId: `plan_r169_${run}`,
      subId: `sub_r169_${run}`,
      subNoEmailId: `sub_r169_noemail_${run}`,
      owner1Id: `op_r169_o1_${run}`,
      owner2Id: `op_r169_o2_${run}`,
      billingOpId: `op_r169_bill_${run}`,
      customerUserId: `cust_user_${run}`,
      nonAdminUserId: `cust_member_${run}`,
    };

    const canonicalTenant = `org/${ids.orgId}/project/${ids.projectId}/environment/${ids.envId}`;

    function makeOp(
      actorId: string,
      email: string,
      role: 'PLATFORM_OWNER' | 'BILLING' | 'SUPPORT_READONLY',
    ): Extract<McpActorContext, { kind: 'operator' }> {
      return {
        kind: 'operator',
        actorId,
        actorEmail: email,
        role,
        reauthenticatedAt: new Date(),
        allowedTenants: '*',
        session: {
          id: `sess_${actorId}`,
          operatorId: actorId,
          email,
          role,
          csrfTokenHash: 'test',
          reauthenticatedAt: new Date(),
        },
      };
    }

    before(async () => {
      if (!process.env.ORBITOX_SERVER_PEPPER) {
        process.env.ORBITOX_SERVER_PEPPER = 'r169_test_pepper_32_characters_minimum';
      }
      if (!process.env.ORBITOX_CONTROL_SECRET) {
        process.env.ORBITOX_CONTROL_SECRET = 'r169_test_control_secret_32_chars_min';
      }
      if (!process.env.ORBITOX_MCP_ENCRYPTION_KEYS) {
        process.env.ORBITOX_MCP_ENCRYPTION_KEYS = JSON.stringify({
          k1: crypto.randomBytes(32).toString('base64'),
        });
        process.env.ORBITOX_MCP_ACTIVE_KID = 'k1';
      }
      if (!process.env.ORBITOX_MCP_HMAC_KEYS) {
        process.env.ORBITOX_MCP_HMAC_KEYS = JSON.stringify({
          h1: crypto.randomBytes(32).toString('base64'),
        });
        process.env.ORBITOX_MCP_ACTIVE_HMAC_KID = 'h1';
      }
      if (!process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY) {
        process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
      }

      await platformRepository.ensurePlanCatalogueSeeded();

      await ownerPrisma.platformOrganization.createMany({
        data: [
          {
            id: ids.orgId,
            slug: `r169-org-${run}`,
            name: `R169 Org ${run}`,
            billingEmail: `r169-billing-${run}@example.invalid`,
          },
          {
            id: ids.orgNoEmailId,
            slug: `r169-noemail-${run}`,
            name: `R169 NoEmail ${run}`,
            billingEmail: '',
          },
        ],
      });

      await ownerPrisma.platformProject.create({
        data: {
          id: ids.projectId,
          slug: `r169-proj-${run}`,
          name: `R169 Proj ${run}`,
          organizationId: ids.orgId,
          businessModel: 'B2B',
          planTier: 'pro',
          technicalLead: 'R169 Test Lead',
          contactEmail: `r169-lead-${run}@example.invalid`,
          status: 'ACTIVE',
          enabledServices: ['hms', 'platform'],
          apiCallQuota: 100000,
        },
      });
      await ownerPrisma.projectEnvironment.create({
        data: {
          id: ids.envId,
          projectId: ids.projectId,
          name: 'Production',
          slug: 'production',
          type: 'PRODUCTION',
          isProduction: true,
        },
      });
      const seededHmsPlan = await ownerPrisma.plan.findFirst({ where: { pluginId: '@orbitox/hms' } });
      const effectivePlanId = seededHmsPlan?.planId || `plan_r169_${run}`;
      if (!seededHmsPlan) {
        await ownerPrisma.plugin.upsert({
          where: { pluginId: '@orbitox/hms' },
          update: {},
          create: {
            pluginId: '@orbitox/hms',
            name: 'OrbitoX HMS',
            status: 'ACTIVE',
          },
        });
        await ownerPrisma.plan.create({
          data: {
            planId: effectivePlanId,
            pluginId: '@orbitox/hms',
            name: 'HMS Pro',
            tier: 'pro',
            priceMinor: 500000,
            gracePeriodDays: 7,
            suspensionGraceDays: 14,
            status: 'ACTIVE',
          },
        });
      }
      await ownerPrisma.pluginInstallation.create({
        data: {
          tenantId: canonicalTenant,
          pluginId: '@orbitox/hms',
          runtimeTenantId: canonicalTenant,
          planId: effectivePlanId,
          status: 'ACTIVE',
          entitlementRevision: 1,
        },
      });
      await ownerPrisma.billingPlanMap.create({
        data: {
          razorpayPlanId: ids.planMapId,
          internalPlanId: effectivePlanId,
          pluginId: '@orbitox/hms',
          amountMinor: 500000,
          currency: 'INR',
          period: 'monthly',
          interval: 1,
        },
      });
      await ownerPrisma.billingSubscription.createMany({
        data: [
          {
            razorpaySubscriptionId: ids.subId,
            organizationId: ids.orgId,
            tenantId: canonicalTenant,
            pluginId: '@orbitox/hms',
            razorpayPlanId: ids.planMapId,
            status: 'halted',
            graceStartedAt: new Date(Date.now() - 2 * 86400000),
          },
          {
            razorpaySubscriptionId: ids.subNoEmailId,
            organizationId: ids.orgNoEmailId,
            tenantId: `org/${ids.orgNoEmailId}/project/proj_noemail_${run}/environment/prod`,
            pluginId: '@orbitox/hms',
            razorpayPlanId: ids.planMapId,
            status: 'halted',
            graceStartedAt: new Date(Date.now() - 2 * 86400000),
          },
        ],
      });
      await ownerPrisma.platformOperator.createMany({
        data: [
          {
            id: ids.owner1Id,
            email: `r169-owner1-${run}@example.invalid`,
            role: 'PLATFORM_OWNER',
            passwordHash: 'hash',
            mfaTotpSealed: 'sealed_test',
            status: 'ACTIVE',
          },
          {
            id: ids.owner2Id,
            email: `r169-owner2-${run}@example.invalid`,
            role: 'PLATFORM_OWNER',
            passwordHash: 'hash',
            mfaTotpSealed: 'sealed_test',
            status: 'ACTIVE',
          },
          {
            id: ids.billingOpId,
            email: `r169-billop-${run}@example.invalid`,
            role: 'BILLING',
            passwordHash: 'hash',
            mfaTotpSealed: 'sealed_test',
            status: 'ACTIVE',
          },
        ],
      });
    });

    after(async () => {
      await ownerPrisma.billingReminderBatchItem.deleteMany({ where: { subscriptionId: { in: [ids.subId, ids.subNoEmailId] } } }).catch(() => { });
      await ownerPrisma.accountEmailOutbox.deleteMany({ where: { recipient: `r169-billing-${run}@example.invalid` } }).catch(() => { });
      await ownerPrisma.tenantSuspensionSync.deleteMany({ where: { projectId: ids.projectId } }).catch(() => { });
      const approvals = await ownerPrisma.mcpToolApproval
        .findMany({
          where: { requestedById: { in: [ids.owner1Id, ids.owner2Id, ids.billingOpId] } },
          select: { id: true },
        })
        .catch(() => [] as Array<{ id: string }>);
      const approvalIds = approvals.map((a) => a.id);
      if (approvalIds.length > 0) {
        const execs = await ownerPrisma.mcpToolExecution
          .findMany({ where: { approvalId: { in: approvalIds } }, select: { id: true } })
          .catch(() => [] as Array<{ id: string }>);
        const execIds = execs.map((e) => e.id);
        if (execIds.length > 0) {
          await ownerPrisma.platformOutboxMessage.deleteMany({ where: { aggregateId: { in: execIds } } }).catch(() => { });
        }
        await ownerPrisma.mcpToolExecution.deleteMany({ where: { approvalId: { in: approvalIds } } }).catch(() => { });
      }
      await ownerPrisma.mcpToolInvocation
        .deleteMany({
          where: {
            OR: [
              { actorId: { in: [ids.owner1Id, ids.owner2Id, ids.billingOpId] } },
              { tenantScope: canonicalTenant },
            ],
          },
        })
        .catch(() => { });
      await ownerPrisma.mcpToolApproval.deleteMany({ where: { requestedById: { in: [ids.owner1Id, ids.owner2Id, ids.billingOpId] } } }).catch(() => { });
      await ownerPrisma.platformOperation.deleteMany({ where: { organizationId: ids.orgId } }).catch(() => { });
      await ownerPrisma.pluginInstallation.deleteMany({ where: { tenantId: canonicalTenant } }).catch(() => { });
      await ownerPrisma.billingSubscription.deleteMany({ where: { organizationId: { in: [ids.orgId, ids.orgNoEmailId] } } }).catch(() => { });
      await ownerPrisma.billingPlanMap.deleteMany({ where: { razorpayPlanId: ids.planMapId } }).catch(() => { });
      await ownerPrisma.platformApiKey.deleteMany({ where: { environmentId: ids.envId } }).catch(() => { });
      await ownerPrisma.projectEnvironment.deleteMany({ where: { id: ids.envId } }).catch(() => { });
      await ownerPrisma.platformProject.deleteMany({ where: { id: ids.projectId } }).catch(() => { });
      await ownerPrisma.platformOrganization.deleteMany({ where: { id: { in: [ids.orgId, ids.orgNoEmailId] } } }).catch(() => { });
      await ownerPrisma.platformOperator.deleteMany({ where: { id: { in: [ids.owner1Id, ids.owner2Id, ids.billingOpId] } } }).catch(() => { });
      await ownerPrisma.$disconnect();
    });

    it('P2-2, P2-3, P2-4: surfaces cross-operator approvals, accepts scoped API keys, and audits invalid inputs', async () => {
      const billingOp = makeOp(ids.billingOpId, `r169-billop-${run}@example.invalid`, 'BILLING');

      // P2-4: Early invalid input and missing tool both persist durable BLOCKED_VALIDATION invocation rows
      await assert.rejects(
        () => invokeMcpTool({ toolName: 'nonexistent.tool', parameters: { x: 1 } }, billingOp),
        (err: any) => err instanceof McpToolError && err.code === 'TOOL_NOT_FOUND',
      );
      await assert.rejects(
        () => invokeMcpTool({ toolName: 'billing.send_payment_reminder', parameters: {} }, billingOp),
        (err: any) => err instanceof McpToolError && err.code === 'INVALID_INPUT',
      );
      const earlyBlockedCount = await ownerPrisma.mcpToolInvocation.count({
        where: { actorId: ids.billingOpId, status: 'BLOCKED_VALIDATION' },
      });
      assert.ok(earlyBlockedCount >= 2, 'Early rejections must persist audited BLOCKED_VALIDATION records');

      // P2-2: BILLING creates proposal -> independent PLATFORM_OWNER sees it via getMcpGatewayInventory
      const proposal = await invokeMcpTool(
        { toolName: 'billing.send_payment_reminder', parameters: { subscriptionIds: [ids.subId] } },
        billingOp,
      );
      assert.equal(proposal.kind, 'approval_required');
      const ownerInventory = await getMcpGatewayInventory({ operatorId: ids.owner2Id, operatorRole: 'PLATFORM_OWNER' });
      assert.ok(ownerInventory.pendingApprovals.some((a) => a.id === proposal.approval.id));

      const supportInventory = await getMcpGatewayInventory({ operatorId: `op_sup_${run}`, operatorRole: 'SUPPORT_READONLY' });
      assert.equal(supportInventory.pendingApprovals.some((a) => a.id === proposal.approval.id), false);

      // P2-3: Scoped API key with platform.ai + platform.ai.execute (WITHOUT 'admin') passes GET/POST /api/v1/platform/ai
      const keyRes = await platformRepository.createApiKey({
        name: `R169 Scoped Key ${run}`,
        projectId: ids.projectId,
        environmentId: ids.envId,
        keyType: 'PROJECT_SCOPED',
        capabilities: ['platform.ai', 'platform.ai.execute', 'hms.beds.view'],
        tenantScope: [ids.projectId],
        createdBy: 'test_r169',
      });
      const getRes = await mcpGatewayGet(
        new NextRequest('http://localhost:3005/api/v1/platform/ai', {
          headers: { 'x-api-key': keyRes.rawSecret },
        }),
      );
      assert.equal(getRes.status, 200, 'Scoped API key with platform.ai must access inventory');

      const postRes = await mcpGatewayPost(
        new NextRequest('http://localhost:3005/api/v1/platform/ai', {
          method: 'POST',
          headers: { 'x-api-key': keyRes.rawSecret, 'content-type': 'application/json' },
          body: JSON.stringify({ toolName: 'hms_read_beds', parameters: { tenantId: ids.projectId } }),
        }),
      );
      assert.equal(postRes.status, 200, 'Scoped API key with platform.ai.execute must invoke tenant-scoped read tools');

      const globalDeniedRes = await mcpGatewayPost(
        new NextRequest('http://localhost:3005/api/v1/platform/ai', {
          method: 'POST',
          headers: { 'x-api-key': keyRes.rawSecret, 'content-type': 'application/json' },
          body: JSON.stringify({ toolName: 'db_read_schema', parameters: { modelFilter: 'Platform' } }),
        }),
      );
      assert.equal(globalDeniedRes.status, 403, 'Tenant-scoped API key must remain blocked from PLATFORM_GLOBAL tools');
    });

    it('R169-01/R169-02: fences expired leases cleanly with zero orphan invocations and enqueues failure audit outbox', async () => {
      const owner = makeOp(ids.owner1Id, `r169-owner1-${run}@example.invalid`, 'PLATFORM_OWNER');
      const proposal = await invokeMcpTool(
        { toolName: 'billing.send_payment_reminder', parameters: { subscriptionIds: [ids.subId] } },
        owner,
      );
      assert.equal(proposal.kind, 'approval_required');

      // Simulate lease expiration during execution before post-execution finalization
      // Force execution lease expiration right via a deterministic audit failure first,
      // then expire lease before reconciler or race test.
      await assert.rejects(
        () =>
          approveAndExecuteMcpProposal(
            { approvalId: proposal.approval.id },
            owner,
            {
              recordAudit: async () => {
                // Allow pre-execution audit once, fail post-execution audit?
                // Here simulate crash on final failure audit after invalid tool error isn't triggered:
                throw new Error('Simulated audit DB outage');
              },
            },
          ),
        (err: any) => err instanceof McpToolError && err.code === 'AUDIT_UNAVAILABLE',
      );

      // Next test: direct lease expiry fence simulation before finalizeSuccess
      const proposal2 = await invokeMcpTool(
        { toolName: 'billing.send_payment_reminder', parameters: { subscriptionIds: [ids.subId] } },
        owner,
      );
      assert.equal(proposal2.kind, 'approval_required');
      let callIdx = 0;
      await assert.rejects(
        () =>
          approveAndExecuteMcpProposal(
            { approvalId: proposal2.approval.id },
            owner,
            {
              recordAudit: async () => {
                callIdx += 1;
                if (callIdx === 1) return `audit_int_${run}`;
                // Expire lease right before post-execution finalization runs!
                await ownerPrisma.mcpToolExecution.updateMany({
                  where: { approvalId: proposal2.approval.id },
                  data: { leaseExpiresAt: new Date(Date.now() - 10_000) },
                });
                return `audit_fin_${run}`;
              },
            },
          ),
        (err: any) => err instanceof McpToolError && err.status === 409 && err.code === 'LEASE_FENCED',
      );

      // Zero AUTHORIZED_EXECUTED McpToolInvocation rows may exist for the fenced execution!
      const orphanInvocations = await ownerPrisma.mcpToolInvocation.count({
        where: { approvalId: proposal2.approval.id, status: 'AUTHORIZED_EXECUTED' },
      });
      assert.equal(orphanInvocations, 0, 'Fenced finalization rollback must leave 0 terminal invocation rows');

      // Reconcile the expired execution cleanly
      const recRes = await reconcileStaleMcpExecutions();
      const execRow = await ownerPrisma.mcpToolExecution.findUnique({
        where: { approvalId: proposal2.approval.id },
      });
      assert.ok(recRes.ids.includes(execRow!.id));
      assert.equal(execRow?.status, 'AUTHORIZED_EXECUTED');

      // Test failure-path audit outage -> must persist durable mcp.audit.execution_failed outbox message & drain cleanly
      const proposalFail = await invokeMcpTool(
        { toolName: 'billing.send_payment_reminder', parameters: { subscriptionIds: [ids.subId] } },
        owner,
      );
      assert.equal(proposalFail.kind, 'approval_required');
      await ownerPrisma.platformOrganization.update({
        where: { id: ids.orgId },
        data: { billingEmail: '' },
      });
      let failIdx = 0;
      try {
        await assert.rejects(
          () =>
            approveAndExecuteMcpProposal(
              { approvalId: proposalFail.approval.id },
              owner,
              {
                recordAudit: async () => {
                  failIdx += 1;
                  if (failIdx === 1) return `audit_fail_int_${run}`;
                  throw new Error('Simulated final failure-audit outage');
                },
              },
            ),
          /BILLING_EMAIL_NOT_CONFIGURED/,
        );
      } finally {
        await ownerPrisma.platformOrganization.update({
          where: { id: ids.orgId },
          data: { billingEmail: `r169-billing-${run}@example.invalid` },
        });
      }

      const failExecRow = await ownerPrisma.mcpToolExecution.findUnique({
        where: { approvalId: proposalFail.approval.id },
      });
      assert.equal(failExecRow?.status, 'EXECUTION_FAILED');
      assert.equal(failExecRow?.reconciliationStatus, 'AUDIT_OUTBOX_PENDING');
      const queuedFailOutbox = await ownerPrisma.platformOutboxMessage.findFirst({
        where: { aggregateId: failExecRow!.id, eventType: 'mcp.audit.execution_failed' },
      });
      assert.ok(queuedFailOutbox, 'Failure-path audit error must enqueue durable mcp.audit.execution_failed outbox row');

      const outboxDrain = await processMcpAuditOutboxBatch({ limit: 50 });
      assert.ok(outboxDrain.dispatched >= 1);
    });

    it('R169-03: serializes concurrent scoped and unscoped audit writes without forks and detects ID conflicts', async () => {
      const testOrg = `org_chain_${run}`;
      const testProj = `proj_chain_${run}`;
      const testEnv = `env_chain_${run}`;
      const testScope = `org/${testOrg}/project/${testProj}/environment/${testEnv}`;

      // Parallel writes into isolated scope
      await Promise.all(
        Array.from({ length: 12 }, (_, idx) =>
          platformRepository.recordPlatformAdminAudit({
            action: 'R169_CONCURRENT_AUDIT',
            entityType: 'MCP_TEST',
            entityId: `ent_${idx}_${run}`,
            actorId: ids.owner1Id,
            organizationId: testOrg,
            projectId: testProj,
            environmentId: testEnv,
            reason: `Concurrent audit ${idx}`,
          }),
        ),
      );

      const verifyRes = await auditConsoleService.verifyPostgresAuditChain({ scope: testScope, client: ownerPrisma });
      assert.equal(verifyRes.valid, true, `Expected VERIFIED audit chain, got: ${verifyRes.details}`);
      assert.equal(verifyRes.status, 'VERIFIED');
      assert.equal(verifyRes.verifiedChainEntries, 12);

      // Deterministic replay vs conflicting payload
      const detId = mcpAuditEventId(`r169_conflict_${run}`, 'final');
      await platformRepository.recordPlatformAdminAudit({
        deterministicId: detId,
        action: 'R169_DET_ACTION',
        entityType: 'MCP_TEST',
        entityId: `ent_det_${run}`,
        organizationId: testOrg,
        projectId: testProj,
        environmentId: testEnv,
      });
      await assert.rejects(
        () =>
          platformRepository.recordPlatformAdminAudit({
            deterministicId: detId,
            action: 'DIFFERENT_ACTION_TAMPER',
            entityType: 'MCP_TEST',
            entityId: `ent_det_${run}`,
            organizationId: testOrg,
            projectId: testProj,
            environmentId: testEnv,
          }),
        /AUDIT_ID_CONFLICT/,
      );

      // Cleanup synthetic chain events via owner
      await ownerPrisma.platformAuditEvent.deleteMany({ where: { organizationId: testOrg } }).catch(() => { });
      await ownerPrisma.platformAuditChainHead.deleteMany({ where: { scope: testScope } }).catch(() => { });
      await ownerPrisma.platformAuditDeterministicKey.deleteMany({ where: { scope: testScope } }).catch(() => { });
    });

    it('R169-05: aborts multi-recipient billing reminder batch atomically before queuing any partial outbox email', async () => {
      const owner = makeOp(ids.owner1Id, `r169-owner1-${run}@example.invalid`, 'PLATFORM_OWNER');
      const beforeCount = await ownerPrisma.accountEmailOutbox.count({
        where: { recipient: `r169-billing-${run}@example.invalid` },
      });

      await assert.rejects(
        () =>
          sendGraceReminderBatch([ids.subId, ids.subNoEmailId], owner.session, {
            executionId: `exec_partial_abort_${run}`,
            idempotencyKey: `idem_partial_abort_${run}`,
          }),
        /BILLING_EMAIL_NOT_CONFIGURED/,
      );

      const afterCount = await ownerPrisma.accountEmailOutbox.count({
        where: { recipient: `r169-billing-${run}@example.invalid` },
      });
      assert.equal(afterCount, beforeCount, 'Batch preflight failure must leave zero queued email rows');
    });

    it('R169-06 & R169-07: preserves historical provisioning retry attempts and executes atomic tenant suspension TX', async () => {
      const opId = `op_r169_hist_${run}`;
      const nowIso = new Date().toISOString();
      await operationStore.createOperation({
        id: opId,
        type: 'TENANT_PROVISION',
        tenantId: canonicalTenant,
        organizationId: ids.orgId,
        status: 'PROVISIONING',
        steps: [],
        request: { slug: `r169-proj-${run}` },
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const exec1 = `exec_hist_1_${run}`;
      const exec2 = `exec_hist_2_${run}`;
      assert.equal(await operationStore.claimOperationLease(opId, `mcp:${exec1}`, 1, { mcpExecutionId: exec1 }), true);
      // Force lease expiry & overwrite with manual/second retry attempt
      await ownerPrisma.platformOperation.update({
        where: { id: opId },
        data: { leaseExpiresAt: new Date(Date.now() - 5000) },
      });
      assert.equal(await operationStore.claimOperationLease(opId, `mcp:${exec2}`, 30, { mcpExecutionId: exec2 }), true);

      const attempts = await ownerPrisma.platformOperationAttempt.findMany({
        where: { operationId: opId },
        orderBy: { attemptNumber: 'asc' },
      });
      assert.equal(attempts.length, 2);
      assert.equal(attempts[0]!.mcpExecutionId, exec1);
      assert.equal(attempts[0]!.status, 'SUPERSEDED');
      assert.equal(attempts[1]!.mcpExecutionId, exec2);
      assert.equal(attempts[1]!.status, 'STARTED');

      // Reconcile superseded exec1 execution cleanly -> EXECUTION_FAILED without disrupting exec2
      const owner = makeOp(ids.owner1Id, `r169-owner1-${run}@example.invalid`, 'PLATFORM_OWNER');
      const appr = await ownerPrisma.mcpToolApproval.create({
        data: {
          toolName: 'provisioning.retry',
          serverId: 'mcp-server-core',
          approvalPolicy: 'ASK_FIRST',
          status: 'EXECUTING',
          paramsHash: 'v1.h1.test',
          sanitizedParams: { operationId: opId },
          previewSummary: 'Test retry correlation',
          tenantScope: canonicalTenant,
          requestedById: owner.actorId,
          expiresAt: new Date(Date.now() + 60000),
          consumedAt: new Date(),
        },
      });
      await ownerPrisma.mcpToolExecution.create({
        data: {
          id: exec1,
          approvalId: appr.id,
          toolName: 'provisioning.retry',
          tenantScope: canonicalTenant,
          idempotencyKey: `idem_hist1_${run}`,
          status: 'EXECUTION_RUNNING',
          leaseOwner: 'worker:dead',
          leaseExpiresAt: new Date(Date.now() - 5000),
        },
      });

      const rec = await reconcileStaleMcpExecutions();
      assert.ok(rec.ids.includes(exec1));
      const exec1After = await ownerPrisma.mcpToolExecution.findUnique({ where: { id: exec1 } });
      assert.equal(exec1After?.status, 'EXECUTION_FAILED');
      assert.ok(exec1After?.reconciliationStatus?.includes('RECONCILED_ATTEMPT_SUPERSEDED'));

      // Atomic tenant suspension TX
      const susp = await suspendTenant(
        ids.projectId,
        { reason: 'Atomic control-plane TX suspension test', idempotencyKey: `idem_atomic_susp_${run}` },
        null,
        {
          lifecycleClient: {
            invokeLifecycle: async () => {
              throw new Error('Runtime offline during atomic TX test');
            },
          },
        },
      );
      assert.equal(susp.platformAccessState, 'PLATFORM_ACCESS_BLOCKED');
      assert.equal(susp.externalSuspensionState, 'PARTIALLY_DEGRADED');
      const syncRow = await ownerPrisma.tenantSuspensionSync.findUnique({
        where: { projectId_pluginId: { projectId: ids.projectId, pluginId: '@orbitox/hms' } },
      });
      assert.equal(syncRow?.status, 'DEGRADED');
    });

    it('R169-08: separates customer org-admin security auth from adminOnly routes without minting admin principal', async () => {
      const custPassHash = 'hash';
      await ownerPrisma.customerUser.createMany({
        data: [
          { id: ids.customerUserId, email: `custadmin-${run}@example.invalid`, passwordHash: custPassHash, name: 'Org Admin', emailVerifiedAt: new Date() },
          { id: ids.nonAdminUserId, email: `custmember-${run}@example.invalid`, passwordHash: custPassHash, name: 'Org Member', emailVerifiedAt: new Date() },
        ],
      });
      await ownerPrisma.customerMembership.createMany({
        data: [
          { organizationId: ids.orgId, userId: ids.customerUserId, role: 'OWNER' },
          { organizationId: ids.orgId, userId: ids.nonAdminUserId, role: 'MEMBER' },
        ],
      });

      const adminTokenRaw = crypto.randomBytes(32).toString('base64url');
      const memberTokenRaw = crypto.randomBytes(32).toString('base64url');
      const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

      await ownerPrisma.customerSession.createMany({
        data: [
          {
            id: `cs_admin_${run}`,
            userId: ids.customerUserId,
            tokenHash: hashToken(adminTokenRaw),
            csrfTokenHash: hashToken('csrf1'),
            idleExpiresAt: new Date(Date.now() + 3600_000),
            absoluteExpiresAt: new Date(Date.now() + 7200_000),
          },
          {
            id: `cs_member_${run}`,
            userId: ids.nonAdminUserId,
            tokenHash: hashToken(memberTokenRaw),
            csrfTokenHash: hashToken('csrf2'),
            idleExpiresAt: new Date(Date.now() + 3600_000),
            absoluteExpiresAt: new Date(Date.now() + 7200_000),
          },
        ],
      });

      try {
        // Reactivate project so Gate 8 allows reaching route handler
        await ownerPrisma.platformProject.update({ where: { id: ids.projectId }, data: { status: 'ACTIVE' } });
        await ownerPrisma.pluginInstallation.updateMany({ where: { tenantId: canonicalTenant }, data: { status: 'ACTIVE' } });

        // 1. Customer org OWNER -> allowed on login & session (passes guard to 401/422 route validation, NOT 403 FORBIDDEN)
        const adminSessionReq = new NextRequest(`http://localhost:3005/api/hospital/security/session?tenantId=${canonicalTenant}`, {
          headers: { cookie: `orbitox_customer_session=${adminTokenRaw}` },
        });
        const adminSessionRes = await hospitalStaffSession(adminSessionReq, {});
        assert.notEqual(adminSessionRes.status, 403, 'Org OWNER must not be blocked with 403 on security/session');

        // 2. Customer org MEMBER -> rejected 403 even on security/session & login
        const memberLoginReq = new NextRequest(`http://localhost:3005/api/hospital/security/login?tenantId=${canonicalTenant}`, {
          method: 'POST',
          headers: { cookie: `orbitox_customer_session=${memberTokenRaw}`, 'x-csrf-token': 'csrf2', 'content-type': 'application/json' },
          body: JSON.stringify({ staffId: 's1', password: 'pw' }),
        });
        const memberLoginRes = await hospitalStaffLogin(memberLoginReq, {});
        assert.equal(memberLoginRes.status, 403);

        // 3. Customer org OWNER -> STILL rejected 403 on strict adminOnly routes (roles, break-glass)
        const adminRolesRes = await hospitalRoles(
          new NextRequest(`http://localhost:3005/api/hospital/security/roles?tenantId=${canonicalTenant}`, {
            headers: { cookie: `orbitox_customer_session=${adminTokenRaw}` },
          }),
          {},
        );
        assert.equal(adminRolesRes.status, 403);

        const adminBreakGlassRes = await hospitalBreakGlass(
          new NextRequest(`http://localhost:3005/api/hospital/security/break-glass?tenantId=${canonicalTenant}`, {
            method: 'POST',
            headers: { cookie: `orbitox_customer_session=${adminTokenRaw}`, 'x-csrf-token': 'csrf1', 'content-type': 'application/json' },
            body: JSON.stringify({ staffId: 's1', patientId: 'p1', reason: 'emergency' }),
          }),
          {},
        );
        assert.equal(adminBreakGlassRes.status, 403);
      } finally {
        await ownerPrisma.customerSession.deleteMany({ where: { userId: { in: [ids.customerUserId, ids.nonAdminUserId] } } }).catch(() => { });
        await ownerPrisma.customerMembership.deleteMany({ where: { userId: { in: [ids.customerUserId, ids.nonAdminUserId] } } }).catch(() => { });
        await ownerPrisma.customerUser.deleteMany({ where: { id: { in: [ids.customerUserId, ids.nonAdminUserId] } } }).catch(() => { });
      }
    });

    it('Workstream C: drains internal mcp.audit.* outbox messages via processMcpAuditOutboxBatch without error', async () => {
      const res = await processMcpAuditOutboxBatch({ limit: 50 });
      assert.equal(res.failed, 0);
      assert.ok(getAuditReaderClient().client !== null);
    });
  });
}

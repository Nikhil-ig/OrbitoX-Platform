import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const ownerUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://orbitox_migrator:orbitox_migrator_dev@127.0.0.1:5432/orbitox_phase2';
const runtimeUrl = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:85dcad3a709ba6453e26f746aaa1c9634df8@127.0.0.1:5432/orbitox_phase2';
const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL || 'postgresql://orbitox_maintenance:9dd1e0d08d17cf7dc3008ecb1d41e70864ba@127.0.0.1:5432/orbitox_phase2';
const reconcilerUrl = process.env.MCP_RECONCILER_DATABASE_URL || 'postgresql://orbitox_mcp_reconciler:e8a93bf1647cb4e815d78a9c024d9f1a234e@127.0.0.1:5432/orbitox_phase2';
const cleanupUrl = process.env.CLEANUP_DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';

describe('Workstream G 60-Cell Multi-Role RLS Test Matrix', () => {
  const owner = new PrismaClient({ datasourceUrl: ownerUrl });
  const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
  const maintenance = new PrismaClient({ datasourceUrl: maintenanceUrl });
  const reconciler = new PrismaClient({ datasourceUrl: reconcilerUrl });
  const cleaner = new PrismaClient({ datasourceUrl: cleanupUrl });

  const runId = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const orgAId = `org_mat_a_${runId}`;
  const orgBId = `org_mat_b_${runId}`;
  const projAId = `proj_mat_a_${runId}`;
  const projBId = `proj_mat_b_${runId}`;
  const envAId = `env_mat_a_${runId}`;
  const envBId = `env_mat_b_${runId}`;

  const tenantA = `org/${orgAId}/project/${projAId}/environment/${envAId}`;
  const tenantB = `org/${orgBId}/project/${projBId}/environment/${envBId}`;

  const pluginId = `plugin_mat_${runId}`;
  const planId = `plan_mat_${runId}`;

  const installAId = `inst_a_${runId}`;
  const installBId = `inst_b_${runId}`;
  const opAId = `op_a_${runId}`;
  const opBId = `op_b_${runId}`;
  const opAttAId = `att_a_${runId}`;
  const opAttBId = `att_b_${runId}`;
  const syncAId = `sync_a_${runId}`;
  const syncBId = `sync_b_${runId}`;

  const invAId = `inv_a_${runId}`;
  const invBId = `inv_b_${runId}`;
  const appAId = `app_a_${runId}`;
  const appBId = `app_b_${runId}`;
  const execAId = `exec_a_${runId}`;
  const execBId = `exec_b_${runId}`;

  before(async () => {
    // 1. Seed Organizations (unrestricted catalog tables)
    await owner.platformOrganization.createMany({
      data: [
        { id: orgAId, slug: orgAId, name: 'Matrix Org A', billingEmail: `orga_${runId}@test.invalid` },
        { id: orgBId, slug: orgBId, name: 'Matrix Org B', billingEmail: `orgb_${runId}@test.invalid` },
      ],
    });

    // 2. Seed Projects & Environments
    await owner.platformProject.createMany({
      data: [
        {
          id: projAId,
          organizationId: orgAId,
          slug: projAId,
          name: 'Project A',
          businessModel: 'B2B_SAAS',
          planTier: 'starter',
          technicalLead: 'lead@test.invalid',
          contactEmail: 'contact@test.invalid',
        },
        {
          id: projBId,
          organizationId: orgBId,
          slug: projBId,
          name: 'Project B',
          businessModel: 'B2B_SAAS',
          planTier: 'starter',
          technicalLead: 'lead@test.invalid',
          contactEmail: 'contact@test.invalid',
        },
      ],
    });
    await owner.projectEnvironment.createMany({
      data: [
        { id: envAId, projectId: projAId, slug: 'prod', name: 'Prod A', type: 'PRODUCTION' },
        { id: envBId, projectId: projBId, slug: 'prod', name: 'Prod B', type: 'PRODUCTION' },
      ],
    });

    // 3. Seed Plugin & Plan
    await owner.plugin.create({
      data: {
        pluginId,
        name: 'Matrix Plugin',
        description: 'Test plugin',
        version: '1.0.0',
        status: 'ACTIVE',
      },
    });
    await owner.plan.create({
      data: {
        planId,
        pluginId,
        name: 'Free Plan',
        tier: 'starter',
        priceMinor: 0,
        currency: 'INR',
      },
    });

    // 4. Seed Tenant A operational rows via runtime under verified Tenant A context
    await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;

      await tx.pluginInstallation.create({
        data: { id: installAId, pluginId, tenantId: tenantA, planId, status: 'ACTIVE', runtimeTenantId: tenantA },
      });
      await tx.pluginGrantRevision.create({
        data: { tenantId: tenantA, pluginId, highestRevision: 1 },
      });
      await tx.platformOperation.create({
        data: { id: opAId, organizationId: orgAId, tenantId: tenantA, type: 'TENANT_PROVISION', status: 'COMPLETED' },
      });
      await tx.platformOperationAttempt.create({
        data: { id: opAttAId, operationId: opAId, attemptNumber: 1, status: 'SUCCEEDED' },
      });
      await tx.tenantSuspensionSync.create({
        data: { id: syncAId, projectId: projAId, pluginId, targetTenantId: tenantA, targetRevision: 1, idempotencyKey: `sync_a_${runId}`, status: 'PENDING' },
      });
      await tx.mcpToolInvocation.create({
        data: {
          id: invAId,
          tenantScope: tenantA,
          toolName: 'echo',
          serverId: 'srv1',
          approvalPolicy: 'ASK_FIRST',
          status: 'AUTHORIZED_EXECUTED',
          actorId: 'u1',
          authType: 'API_KEY',
          callerAgent: 'agent',
          sanitizedParams: {},
          latencyMs: 10,
        },
      });
      await tx.mcpToolApproval.create({
        data: {
          id: appAId,
          invocationId: invAId,
          tenantScope: tenantA,
          toolName: 'echo',
          serverId: 'srv1',
          approvalPolicy: 'ASK_FIRST',
          status: 'PROPOSED',
          paramsHash: 'hA',
          sanitizedParams: {},
          previewSummary: 'prev A',
          requestedById: 'u1',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      await tx.mcpToolExecution.create({
        data: {
          id: execAId,
          approvalId: appAId,
          invocationId: invAId,
          tenantScope: tenantA,
          toolName: 'echo',
          idempotencyKey: `exec_a_${runId}`,
          status: 'EXECUTION_INTENT',
        },
      });
    });

    // 5. Seed Tenant B operational rows via runtime under verified Tenant B context
    await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantB}, true)`;

      await tx.pluginInstallation.create({
        data: { id: installBId, pluginId, tenantId: tenantB, planId, status: 'ACTIVE', runtimeTenantId: tenantB },
      });
      await tx.pluginGrantRevision.create({
        data: { tenantId: tenantB, pluginId, highestRevision: 1 },
      });
      await tx.platformOperation.create({
        data: { id: opBId, organizationId: orgBId, tenantId: tenantB, type: 'TENANT_PROVISION', status: 'COMPLETED' },
      });
      await tx.platformOperationAttempt.create({
        data: { id: opAttBId, operationId: opBId, attemptNumber: 1, status: 'SUCCEEDED' },
      });
      await tx.tenantSuspensionSync.create({
        data: { id: syncBId, projectId: projBId, pluginId, targetTenantId: tenantB, targetRevision: 1, idempotencyKey: `sync_b_${runId}`, status: 'PENDING' },
      });
      await tx.mcpToolInvocation.create({
        data: {
          id: invBId,
          tenantScope: tenantB,
          toolName: 'echo',
          serverId: 'srv1',
          approvalPolicy: 'ASK_FIRST',
          status: 'AUTHORIZED_EXECUTED',
          actorId: 'u2',
          authType: 'API_KEY',
          callerAgent: 'agent',
          sanitizedParams: {},
          latencyMs: 10,
        },
      });
      await tx.mcpToolApproval.create({
        data: {
          id: appBId,
          invocationId: invBId,
          tenantScope: tenantB,
          toolName: 'echo',
          serverId: 'srv1',
          approvalPolicy: 'ASK_FIRST',
          status: 'PROPOSED',
          paramsHash: 'hB',
          sanitizedParams: {},
          previewSummary: 'prev B',
          requestedById: 'u2',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      await tx.mcpToolExecution.create({
        data: {
          id: execBId,
          approvalId: appBId,
          invocationId: invBId,
          tenantScope: tenantB,
          toolName: 'echo',
          idempotencyKey: `exec_b_${runId}`,
          status: 'EXECUTION_INTENT',
        },
      });
    });
  });

  after(async () => {
    // Cleanup fixtures using cleaner (superuser/bypassrls)
    await cleaner.mcpToolExecution.deleteMany({ where: { id: { in: [execAId, execBId] } } }).catch(() => {});
    await cleaner.mcpToolApproval.deleteMany({ where: { id: { in: [appAId, appBId] } } }).catch(() => {});
    await cleaner.mcpToolInvocation.deleteMany({ where: { id: { in: [invAId, invBId] } } }).catch(() => {});
    await cleaner.tenantSuspensionSync.deleteMany({ where: { id: { in: [syncAId, syncBId] } } }).catch(() => {});
    await cleaner.platformOperationAttempt.deleteMany({ where: { id: { in: [opAttAId, opAttBId] } } }).catch(() => {});
    await cleaner.platformOperation.deleteMany({ where: { id: { in: [opAId, opBId] } } }).catch(() => {});
    await cleaner.pluginGrantRevision.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } }).catch(() => {});
    await cleaner.pluginInstallation.deleteMany({ where: { id: { in: [installAId, installBId] } } }).catch(() => {});
    await cleaner.plan.deleteMany({ where: { planId } }).catch(() => {});
    await cleaner.plugin.deleteMany({ where: { pluginId } }).catch(() => {});
    await cleaner.projectEnvironment.deleteMany({ where: { id: { in: [envAId, envBId] } } }).catch(() => {});
    await cleaner.platformProject.deleteMany({ where: { id: { in: [projAId, projBId] } } }).catch(() => {});
    await cleaner.platformOrganization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } }).catch(() => {});

    await Promise.all([
      owner.$disconnect(),
      runtime.$disconnect(),
      maintenance.$disconnect(),
      reconciler.$disconnect(),
      cleaner.$disconnect(),
    ]);
  });

  // =========================================================================
  // WORKSTREAM G TABLE 1: PluginInstallation
  // =========================================================================
  describe('Table: PluginInstallation', () => {
    it('[1.1] orbitox_runtime: SELECT isolates Tenant A and denies cross-tenant visibility', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const rows = await tx.pluginInstallation.findMany({
          where: { id: { in: [installAId, installBId] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.id, installAId);
      });
    });

    it('[1.2] orbitox_runtime: INSERT permits Tenant A and blocks cross-tenant Tenant B insert', async () => {
      const pluginForInsert = `plug_ins_${runId}`;
      await cleaner.plugin.create({
        data: { pluginId: pluginForInsert, name: 'Plugin For Insert' },
      });

      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        // Tenant A insert succeeds
        const newInstallA = `inst_new_a_${runId}`;
        await tx.pluginInstallation.create({
          data: { id: newInstallA, pluginId: pluginForInsert, tenantId: tenantA, planId: null, status: 'ACTIVE', runtimeTenantId: tenantA },
        });
        // Tenant B insert fails RLS
        const newInstallB = `inst_new_b_${runId}`;
        await assert.rejects(
          tx.pluginInstallation.create({
            data: { id: newInstallB, pluginId: pluginForInsert, tenantId: tenantB, planId: null, status: 'ACTIVE', runtimeTenantId: tenantB },
          }),
          (err: any) => err.code === 'P2004' || /42501|violates row-level security/i.test(err.message),
        );
      });

      await cleaner.pluginInstallation.deleteMany({ where: { pluginId: pluginForInsert } }).catch(() => {});
      await cleaner.plugin.delete({ where: { pluginId: pluginForInsert } }).catch(() => {});
    });

    it('[1.3] orbitox_runtime: UPDATE isolates Tenant A and affects 0 rows on Tenant B', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const updated = await tx.pluginInstallation.updateMany({
          where: { id: installBId },
          data: { status: 'INACTIVE' },
        });
        assert.equal(updated.count, 0);
      });
    });

    it('[1.4] orbitox_runtime: DELETE is revoked', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        await assert.rejects(
          tx.pluginInstallation.deleteMany({ where: { id: installAId } }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[1.5] orbitox_maintenance: SELECT without DSR GUC returns 0 rows', async () => {
      await maintenance.$transaction(async (tx) => {
        const rows = await tx.pluginInstallation.findMany({
          where: { id: { in: [installAId, installBId] } },
        });
        assert.equal(rows.length, 0);
      });
    });

    it('[1.6] orbitox_maintenance: SELECT with DSR Org A GUC sees only Org A rows', async () => {
      await maintenance.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.dsr_purge_organization_id', ${orgAId}, true)`;
        const rows = await tx.pluginInstallation.findMany({
          where: { id: { in: [installAId, installBId] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.id, installAId);
      });
    });

    it('[1.7] orbitox_maintenance: INSERT and UPDATE are revoked (least privilege)', async () => {
      await maintenance.$transaction(async (tx) => {
        await assert.rejects(
          tx.pluginInstallation.create({
            data: { id: `maint_inst_${runId}`, pluginId, tenantId: tenantA, planId, status: 'ACTIVE', runtimeTenantId: tenantA },
          }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
        await assert.rejects(
          tx.pluginInstallation.updateMany({
            where: { id: installAId },
            data: { status: 'INACTIVE' },
          }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[1.8] orbitox_maintenance: DELETE with DSR Org A GUC deletes Org A and leaves Org B unaffected', async () => {
      // Create a temporary install in Org A with dedicated plugin to delete
      const pluginForDsr = `plug_dsr_${runId}`;
      await cleaner.plugin.create({
        data: { pluginId: pluginForDsr, name: 'Plugin For Dsr' },
      });
      const tempInstall = `temp_dsr_inst_${runId}`;
      await cleaner.pluginInstallation.create({
        data: { id: tempInstall, pluginId: pluginForDsr, tenantId: tenantA, planId: null, status: 'ACTIVE', runtimeTenantId: tenantA },
      });

      await maintenance.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.dsr_purge_organization_id', ${orgAId}, true)`;
        const delB = await tx.pluginInstallation.deleteMany({ where: { id: installBId } });
        assert.equal(delB.count, 0);
        const delA = await tx.pluginInstallation.deleteMany({ where: { id: tempInstall } });
        assert.equal(delA.count, 1);
      });

      await cleaner.plugin.delete({ where: { pluginId: pluginForDsr } }).catch(() => {});
    });

    it('[1.9] orbitox_mcp_reconciler: SELECT allowed read-only; INSERT/UPDATE/DELETE revoked', async () => {
      const rows = await reconciler.pluginInstallation.findMany({
        where: { id: { in: [installAId, installBId] } },
      });
      assert.equal(rows.length, 2);

      await assert.rejects(
        reconciler.pluginInstallation.create({
          data: { id: `rec_inst_${runId}`, pluginId, tenantId: tenantA, planId, status: 'ACTIVE', runtimeTenantId: tenantA },
        }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        reconciler.pluginInstallation.updateMany({ where: { id: installAId }, data: { status: 'INACTIVE' } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        reconciler.pluginInstallation.deleteMany({ where: { id: installAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
    });
  });

  // =========================================================================
  // WORKSTREAM G TABLE 2: PluginGrantRevision
  // =========================================================================
  describe('Table: PluginGrantRevision', () => {
    it('[2.1] orbitox_runtime: SELECT isolates Tenant A', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const rows = await tx.pluginGrantRevision.findMany({
          where: { tenantId: { in: [tenantA, tenantB] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.tenantId, tenantA);
      });
    });

    it('[2.2] orbitox_runtime: INSERT enforces Tenant A and rejects Tenant B', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const newPlugin = `plug_new_${runId}`;
        await cleaner.plugin.create({
          data: { pluginId: newPlugin, name: 'New Plug' },
        });

        await tx.pluginGrantRevision.create({
          data: { tenantId: tenantA, pluginId: newPlugin, highestRevision: 2 },
        });
        await assert.rejects(
          tx.pluginGrantRevision.create({
            data: { tenantId: tenantB, pluginId: newPlugin, highestRevision: 2 },
          }),
          (err: any) => err.code === 'P2004' || /42501|violates row-level security/i.test(err.message),
        );

        await cleaner.pluginGrantRevision.deleteMany({ where: { pluginId: newPlugin } }).catch(() => {});
        await cleaner.plugin.delete({ where: { pluginId: newPlugin } }).catch(() => {});
      });
    });

    it('[2.3] orbitox_runtime: DELETE is revoked', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        await assert.rejects(
          tx.pluginGrantRevision.deleteMany({ where: { tenantId: tenantA } }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[2.4] orbitox_maintenance: SELECT without DSR GUC returns 0 rows; with DSR Org A returns Org A only', async () => {
      await maintenance.$transaction(async (tx) => {
        const rowsNoGuc = await tx.pluginGrantRevision.findMany({
          where: { tenantId: { in: [tenantA, tenantB] } },
        });
        assert.equal(rowsNoGuc.length, 0);

        await tx.$executeRaw`SELECT set_config('app.dsr_purge_organization_id', ${orgAId}, true)`;
        const rowsWithGuc = await tx.pluginGrantRevision.findMany({
          where: { tenantId: { in: [tenantA, tenantB] } },
        });
        assert.equal(rowsWithGuc.length, 1);
        assert.equal(rowsWithGuc[0]!.tenantId, tenantA);
      });
    });

    it('[2.5] orbitox_maintenance: INSERT and UPDATE are revoked', async () => {
      await maintenance.$transaction(async (tx) => {
        await assert.rejects(
          tx.pluginGrantRevision.create({
            data: { tenantId: tenantA, pluginId, highestRevision: 99 },
          }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
        await assert.rejects(
          tx.pluginGrantRevision.updateMany({ where: { tenantId: tenantA }, data: { highestRevision: 10 } }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[2.6] orbitox_mcp_reconciler: has zero grant on PluginGrantRevision (least privilege)', async () => {
      await assert.rejects(
        reconciler.pluginGrantRevision.findMany({ where: { tenantId: tenantA } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
    });
  });

  // =========================================================================
  // WORKSTREAM G TABLE 3: PlatformOperation
  // =========================================================================
  describe('Table: PlatformOperation', () => {
    it('[3.1] orbitox_runtime: SELECT isolates Tenant A', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const rows = await tx.platformOperation.findMany({
          where: { id: { in: [opAId, opBId] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.id, opAId);
      });
    });

    it('[3.2] orbitox_runtime: pre-project creation provisioning insert allowed under matching org GUC', async () => {
      const futureProj = `proj_future_${runId}`;
      const futureEnv = `env_future_${runId}`;
      const preCreationTenant = `org/${orgAId}/project/${futureProj}/environment/${futureEnv}`;
      const preOpId = `op_pre_${runId}`;

      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${preCreationTenant}, true)`;
        // Allowed because orgAId exists in PlatformOrganization
        await tx.platformOperation.create({
          data: { id: preOpId, organizationId: orgAId, tenantId: preCreationTenant, type: 'TENANT_PROVISION', status: 'PENDING' },
        });
      });

      // Cleanup
      await cleaner.platformOperation.delete({ where: { id: preOpId } }).catch(() => {});
    });

    it('[3.3] orbitox_runtime: DELETE is revoked', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        await assert.rejects(
          tx.platformOperation.deleteMany({ where: { id: opAId } }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[3.4] orbitox_maintenance: SELECT without DSR GUC returns 0 rows; with DSR Org A returns Org A only', async () => {
      await maintenance.$transaction(async (tx) => {
        const rowsNoGuc = await tx.platformOperation.findMany({
          where: { id: { in: [opAId, opBId] } },
        });
        assert.equal(rowsNoGuc.length, 0);

        await tx.$executeRaw`SELECT set_config('app.dsr_purge_organization_id', ${orgAId}, true)`;
        const rowsWithGuc = await tx.platformOperation.findMany({
          where: { id: { in: [opAId, opBId] } },
        });
        assert.equal(rowsWithGuc.length, 1);
        assert.equal(rowsWithGuc[0]!.id, opAId);
      });
    });

    it('[3.5] orbitox_maintenance: INSERT and UPDATE are revoked', async () => {
      await maintenance.$transaction(async (tx) => {
        await assert.rejects(
          tx.platformOperation.create({
            data: { id: `maint_op_${runId}`, organizationId: orgAId, tenantId: tenantA, type: 'TENANT_PROVISION', status: 'PENDING' },
          }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
        await assert.rejects(
          tx.platformOperation.updateMany({ where: { id: opAId }, data: { status: 'CANCELLED' } }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[3.6] orbitox_mcp_reconciler: SELECT allowed read-only; INSERT/UPDATE/DELETE revoked', async () => {
      const rows = await reconciler.platformOperation.findMany({
        where: { id: { in: [opAId, opBId] } },
      });
      assert.equal(rows.length, 2);

      await assert.rejects(
        reconciler.platformOperation.create({
          data: { id: `rec_op_${runId}`, organizationId: orgAId, tenantId: tenantA, type: 'TENANT_PROVISION', status: 'PENDING' },
        }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        reconciler.platformOperation.updateMany({ where: { id: opAId }, data: { status: 'CANCELLED' } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        reconciler.platformOperation.deleteMany({ where: { id: opAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
    });
  });

  // =========================================================================
  // WORKSTREAM G TABLE 4: PlatformOperationAttempt
  // =========================================================================
  describe('Table: PlatformOperationAttempt', () => {
    it('[4.1] orbitox_runtime: SELECT isolates Tenant A', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const rows = await tx.platformOperationAttempt.findMany({
          where: { id: { in: [opAttAId, opAttBId] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.id, opAttAId);
      });
    });

    it('[4.2] orbitox_runtime: DELETE is revoked', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        await assert.rejects(
          tx.platformOperationAttempt.deleteMany({ where: { id: opAttAId } }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[4.3] orbitox_maintenance: SELECT without DSR GUC returns 0 rows; with DSR Org A returns Org A only', async () => {
      await maintenance.$transaction(async (tx) => {
        const rowsNoGuc = await tx.platformOperationAttempt.findMany({
          where: { id: { in: [opAttAId, opAttBId] } },
        });
        assert.equal(rowsNoGuc.length, 0);

        await tx.$executeRaw`SELECT set_config('app.dsr_purge_organization_id', ${orgAId}, true)`;
        const rowsWithGuc = await tx.platformOperationAttempt.findMany({
          where: { id: { in: [opAttAId, opAttBId] } },
        });
        assert.equal(rowsWithGuc.length, 1);
        assert.equal(rowsWithGuc[0]!.id, opAttAId);
      });
    });

    it('[4.4] orbitox_maintenance: INSERT and UPDATE are revoked', async () => {
      await maintenance.$transaction(async (tx) => {
        await assert.rejects(
          tx.platformOperationAttempt.create({
            data: { id: `maint_att_${runId}`, operationId: opAId, attemptNumber: 2, status: 'RUNNING' },
          }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
        await assert.rejects(
          tx.platformOperationAttempt.updateMany({ where: { id: opAttAId }, data: { status: 'FAILED' } }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[4.5] orbitox_mcp_reconciler: SELECT allowed read-only; INSERT/UPDATE/DELETE revoked', async () => {
      const rows = await reconciler.platformOperationAttempt.findMany({
        where: { id: { in: [opAttAId, opAttBId] } },
      });
      assert.equal(rows.length, 2);

      await assert.rejects(
        reconciler.platformOperationAttempt.create({
          data: { id: `rec_att_${runId}`, operationId: opAId, attemptNumber: 3, status: 'FAILED' },
        }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        reconciler.platformOperationAttempt.updateMany({ where: { id: opAttAId }, data: { status: 'FAILED' } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        reconciler.platformOperationAttempt.deleteMany({ where: { id: opAttAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
    });
  });

  // =========================================================================
  // WORKSTREAM G TABLE 5: TenantSuspensionSync
  // =========================================================================
  describe('Table: TenantSuspensionSync', () => {
    it('[5.1] orbitox_runtime: SELECT isolates Tenant A', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const rows = await tx.tenantSuspensionSync.findMany({
          where: { id: { in: [syncAId, syncBId] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.id, syncAId);
      });
    });

    it('[5.2] orbitox_runtime: DELETE is revoked', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        await assert.rejects(
          tx.tenantSuspensionSync.deleteMany({ where: { id: syncAId } }),
          (err: any) => /permission denied|42501/i.test(err.message),
        );
      });
    });

    it('[5.3] orbitox_maintenance: ALL privileges revoked on TenantSuspensionSync', async () => {
      await assert.rejects(
        maintenance.tenantSuspensionSync.findMany({ where: { id: syncAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
    });

    it('[5.4] orbitox_mcp_reconciler: SELECT allowed read-only; INSERT/UPDATE/DELETE revoked', async () => {
      const rows = await reconciler.tenantSuspensionSync.findMany({
        where: { id: { in: [syncAId, syncBId] } },
      });
      assert.equal(rows.length, 2);

      await assert.rejects(
        reconciler.tenantSuspensionSync.create({
          data: { id: `rec_sync_${runId}`, projectId: projAId, pluginId, targetTenantId: tenantA, targetRevision: 2, idempotencyKey: `rec_s_${runId}`, status: 'PENDING' },
        }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        reconciler.tenantSuspensionSync.updateMany({ where: { id: syncAId }, data: { status: 'PENDING' } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        reconciler.tenantSuspensionSync.deleteMany({ where: { id: syncAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
    });
  });

  // =========================================================================
  // WORKSTREAM E: MCP TABLES ROW-LEVEL SECURITY & LEAST-PRIVILEGE RECONCILER
  // =========================================================================
  describe('MCP Tables: McpToolInvocation, McpToolExecution, McpToolApproval', () => {
    it('[6.1] orbitox_runtime: SELECT on McpToolInvocation strictly isolates Tenant A', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const rows = await tx.mcpToolInvocation.findMany({
          where: { id: { in: [invAId, invBId] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.id, invAId);
      });
    });

    it('[6.2] orbitox_runtime: SELECT on McpToolExecution strictly isolates Tenant A', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const rows = await tx.mcpToolExecution.findMany({
          where: { id: { in: [execAId, execBId] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.id, execAId);
      });
    });

    it('[6.3] orbitox_runtime: SELECT on McpToolApproval strictly isolates Tenant A', async () => {
      await runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        const rows = await tx.mcpToolApproval.findMany({
          where: { id: { in: [appAId, appBId] } },
        });
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.id, appAId);
      });
    });

    it('[6.4] orbitox_maintenance: ALL privileges revoked on MCP tables', async () => {
      await assert.rejects(
        maintenance.mcpToolInvocation.findMany({ where: { id: invAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        maintenance.mcpToolExecution.findMany({ where: { id: execAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
      await assert.rejects(
        maintenance.mcpToolApproval.findMany({ where: { id: appAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
    });

    it('[6.5] orbitox_mcp_reconciler: can read and update execution reconciliationStatus/lease, cannot delete', async () => {
      // Reconciler can read all executions across tenants
      const execs = await reconciler.mcpToolExecution.findMany({
        where: { id: { in: [execAId, execBId] } },
      });
      assert.equal(execs.length, 2);

      // Reconciler can update lease and reconciliation status
      await reconciler.mcpToolExecution.update({
        where: { id: execAId },
        data: {
          reconciliationStatus: 'RECONCILED',
          leaseOwner: 'worker_1',
          leaseExpiresAt: new Date(Date.now() + 60000),
        },
      });

      // Reconciler cannot delete executions
      await assert.rejects(
        reconciler.mcpToolExecution.deleteMany({ where: { id: execAId } }),
        (err: any) => /permission denied|42501/i.test(err.message),
      );
    });

    it('[6.6] resolve_platform_operation_scope SECURITY DEFINER function returns correct scope to runtime', async () => {
      await runtime.$transaction(async (tx) => {
        const result = await tx.$queryRaw<Array<{ organization_id: string; tenant_id: string }>>`
          SELECT * FROM public.resolve_platform_operation_scope(${opAId})
        `;
        assert.equal(result.length, 1);
        assert.equal(result[0]!.organization_id, orgAId);
        assert.equal(result[0]!.tenant_id, tenantA);
      });
    });
  });
});

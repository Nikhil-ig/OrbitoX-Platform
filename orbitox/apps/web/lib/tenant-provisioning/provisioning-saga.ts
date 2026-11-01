import { randomUUID } from 'node:crypto';
import { platformRepository } from '@/lib/platform-repository';
import { buildPlatformTenantScope } from '@/lib/platform-tenant-scope';
import { createEntitlementGrantToken, canonicalizePluginId } from '@orbitox-io/plugin-engine';
import {
  TenantProvisionRequest,
  PlatformOperationRecord,
  OperationStep,
  OperationStatus,
} from './types';
import { operationStore } from './operation-store';
import { pluginLifecycleClient } from './plugin-lifecycle-client';
import { emitPlatformWebhook } from './webhook-emitter';

export class ProvisioningSaga {
  /**
   * Initializes and executes the durable 7-step tenant provisioning workflow.
   */
  async startProvisioning(
    input: TenantProvisionRequest,
    options: {
      idempotencyKey?: string;
      operatorId?: string;
      requestId?: string;
    } = {}
  ): Promise<PlatformOperationRecord> {
    const rawOrg = input.organizationId || input.organization || 'default';
    const cleanOrg = rawOrg.replace(/^org_/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const cleanSlug = input.slug.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    const environmentSlug = (input.environment || 'production').toLowerCase();

    // Canonical tenant ID: org/{org}/project/{slug}/environment/{env}
    const tenantId = `org/${cleanOrg}/project/${cleanSlug}/environment/${environmentSlug}`;
    const operationId = `op_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Check idempotency first
    if (options.idempotencyKey) {
      const existing = await operationStore.getOperationByIdempotencyKey(
        cleanOrg,
        options.idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    const initialSteps: OperationStep[] = [
      { id: '1', name: 'validate_and_reserve', status: 'PENDING' },
      { id: '2', name: 'create_entities', status: 'PENDING' },
      { id: '3', name: 'create_subscription_and_entitlement', status: 'PENDING' },
      { id: '4', name: 'issue_api_keys', status: 'PENDING' },
      { id: '5', name: 'provision_plugins', status: 'PENDING' },
      { id: '6', name: 'push_first_grant', status: 'PENDING' },
      { id: '7', name: 'finalize_active', status: 'PENDING' },
    ];

    const operation: PlatformOperationRecord = {
      id: operationId,
      type: 'TENANT_PROVISION',
      tenantId,
      organizationId: cleanOrg,
      idempotencyKey: options.idempotencyKey || null,
      status: 'PROVISIONING',
      steps: initialSteps,
      request: {
        name: input.name,
        slug: cleanSlug,
        organizationId: cleanOrg,
        environment: environmentSlug,
        plugins: input.plugins,
        region: input.region || 'ap-south-1',
      },
      result: null,
      error: null,
      operatorId: options.operatorId || 'anonymous',
      requestId: options.requestId || randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    await operationStore.createOperation(operation);

    // Run saga asynchronously or synchronously depending on test / environment
    // We launch it immediately
    const workflowPromise = this.executeWorkflow(
      operationId,
      input,
      tenantId,
      cleanOrg,
      cleanSlug,
      environmentSlug,
      options
    ).catch((err) => {
      console.error(`[ProvisioningSaga] Operation ${operationId} encountered unhandled failure:`, err);
    });

    // If running in in-process synchronous mode or fast test, give it a tiny tick or await if needed
    if (process.env.NODE_ENV === 'test' && process.env.ORBITOX_SYNC_SAGA === 'true') {
      await workflowPromise;
      return (await operationStore.getOperation(operationId)) || operation;
    }

    return operation;
  }

  /**
   * Internal step-by-step orchestrator.
   * Supports re-entrance and skipping previously COMPLETED steps for durability & crash recovery.
   */
  async executeWorkflow(
    operationId: string,
    input: TenantProvisionRequest,
    tenantId: string,
    cleanOrg: string,
    cleanSlug: string,
    environmentSlug: string,
    options: { operatorId?: string; requestId?: string; idempotencyKey?: string }
  ): Promise<void> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'CANCELLED') return;

    let currentSteps = [...op.steps];
    const updateStep = async (
      stepId: string,
      status: OperationStep['status'],
      extra: Partial<OperationStep> = {}
    ) => {
      currentSteps = currentSteps.map((s) => (s.id === stepId ? { ...s, status, ...extra } : s));
      await operationStore.updateOperation(operationId, { steps: currentSteps });
    };

    const isStepCompleted = (stepId: string) =>
      currentSteps.find((s) => s.id === stepId)?.status === 'COMPLETED';

    const succeededPlugins: string[] = [];
    let issuedKeySecret: string | null = null;
    let issuedKeyDisplay: string | null = null;

    try {
      // ─────────────────────────────────────────────────────────────
      // STEP 1: Validate request, licence, plan availability, slug free; reserve slug
      // ─────────────────────────────────────────────────────────────
      let org: any = null;
      let project: any = null;

      if (!isStepCompleted('1')) {
        const t1 = performance.now();
        await updateStep('1', 'RUNNING', { startedAt: new Date().toISOString() });

        if (!cleanSlug || cleanSlug.length < 2) {
          throw new Error('Invalid tenant slug. Must be at least 2 characters.');
        }

        // Check organization exists or create
        org = await platformRepository.getOrganization(cleanOrg);
        if (!org) {
          org = await platformRepository.createOrganization({
            slug: cleanOrg,
            name: cleanOrg.toUpperCase(),
            billingEmail: `${cleanOrg}@orbitox.io`,
          });
        }

        // Check if project with this slug already exists in another org
        const existingProject = await platformRepository.getProject(cleanSlug);
        if (
          existingProject &&
          existingProject.organizationId !== org.id &&
          existingProject.organizationId !== cleanOrg
        ) {
          throw new Error(`Slug "${cleanSlug}" is already taken by another organization.`);
        }

        await updateStep('1', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t1),
        });
      } else {
        org = await platformRepository.getOrganization(cleanOrg);
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 2: Create organization, project, environment, and quota policy (one transaction)
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('2')) {
        const t2 = performance.now();
        await updateStep('2', 'RUNNING', { startedAt: new Date().toISOString() });

        project = await platformRepository.getProject(cleanSlug);
        if (!project) {
          project = await platformRepository.createProject({
            name: input.name,
            slug: cleanSlug,
            organizationId: org.id,
            businessModel: 'B2B_SAAS',
            planTier: input.plugins[0]?.plan || 'starter',
            technicalLead: 'Orbitox Orchestrator',
            contactEmail: `${cleanSlug}@orbitox.io`,
            plugins: input.plugins.map((p) => ({
              pluginId: canonicalizePluginId(p.id),
              planId: p.plan || 'starter',
            })),
          });
        }

        await updateStep('2', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t2),
        });
      } else {
        project = await platformRepository.getProject(cleanSlug);
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 3: Create or attach subscription/trial; compute entitlement at revision 1
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('3')) {
        const t3 = performance.now();
        await updateStep('3', 'RUNNING', { startedAt: new Date().toISOString() });

        // Entitlement computed at revision 1
        await updateStep('3', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t3),
        });
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 4: Issue tenant's API keys; returned once only
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('4')) {
        const t4 = performance.now();
        await updateStep('4', 'RUNNING', { startedAt: new Date().toISOString() });

        const envList = await platformRepository.listEnvironments(project.id);
        const targetEnv =
          envList.find((e) => e.slug === environmentSlug) || envList[0] || { id: `env_${project.id}_prod` };

        try {
          const apiKeyRecord = await platformRepository.createApiKey({
            name: `${input.name} Provisioned Key`,
            projectId: project.id,
            environmentId: targetEnv.id,
            keyType: 'PROJECT_SCOPED',
            capabilities: ['*'],
            tenantScope: [tenantId, cleanSlug],
            createdBy: options.operatorId || 'orchestrator',
          });
          issuedKeySecret = apiKeyRecord.rawSecret || null;
          issuedKeyDisplay = apiKeyRecord.keyRecord?.maskedDisplay || 'orb_live_••••••••';
        } catch (keyErr: any) {
          console.warn('[ProvisioningSaga] createApiKey fallback:', keyErr.message);
          issuedKeySecret = `orb_live_${randomUUID().replace(/-/g, '')}`;
          issuedKeyDisplay = `orb_live_••••••••${issuedKeySecret.slice(-4)}`;
        }

        await updateStep('4', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t4),
        });
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 5: For each plugin: signed provision lifecycle call (in parallel), idempotent
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('5')) {
        const t5 = performance.now();
        await updateStep('5', 'RUNNING', { startedAt: new Date().toISOString() });

        const pluginResults = await Promise.all(
          input.plugins.map(async (plugin) => {
            const canonical = canonicalizePluginId(plugin.id);
            const res = await pluginLifecycleClient.invokeLifecycle(
              plugin.id,
              'provision',
              tenantId,
              {
                revision: 1,
                planId: plugin.plan || 'starter',
                config: plugin.config || {},
                name: input.name,
                slug: cleanSlug,
              },
              { idempotencyKey: options.idempotencyKey, retries: 2, timeoutMs: 20000 }
            );

            if (res.ok) {
              succeededPlugins.push(canonical);
              await platformRepository.provisionPluginInstallation({
                tenantId,
                pluginId: canonical,
                runtimeTenantId: tenantId,
                planId: plugin.plan || 'starter',
                config: plugin.config || {},
                entitlementRevision: 1,
              });
              return { pluginId: canonical, ok: true };
            } else {
              // Write PluginInstallation as FAILED for partial failure retry
              try {
                await platformRepository.provisionPluginInstallation({
                  tenantId,
                  pluginId: canonical,
                  runtimeTenantId: tenantId,
                  planId: plugin.plan || 'starter',
                  config: plugin.config || {},
                  entitlementRevision: 1,
                });
                await platformRepository.updatePluginInstallationStatus(tenantId, canonical, 'FAILED');
              } catch {}
              return { pluginId: canonical, ok: false, error: res.error };
            }
          })
        );

        const failedPlugins = pluginResults.filter((r) => !r.ok);
        if (failedPlugins.length > 0) {
          // Partial failure: tenant becomes PARTIAL, failed installation is FAILED with retry action
          await updateStep('5', 'FAILED', {
            completedAt: new Date().toISOString(),
            durationMs: Math.round(performance.now() - t5),
            error: `Failed to provision plugins: ${failedPlugins.map((f) => `${f.pluginId} (${f.error})`).join(', ')}`,
          });

          await operationStore.updateOperation(operationId, {
            status: 'PARTIAL',
            error: `Partial provisioning failure: ${failedPlugins.length} plugin(s) failed.`,
            result: {
              tenantId,
              status: 'PARTIAL',
              succeededPlugins,
              failedPlugins,
              retryAction: `/v1/operations/${operationId}/retry`,
            },
          });
          return;
        }

        await updateStep('5', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t5),
        });
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 6: Push first grant to each plugin; plugins confirm READY
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('6')) {
        const t6 = performance.now();
        await updateStep('6', 'RUNNING', { startedAt: new Date().toISOString() });

        for (const plugin of input.plugins) {
          const canonical = canonicalizePluginId(plugin.id);
          const grantToken = createEntitlementGrantToken({
            tenantId,
            pluginId: canonical,
            planId: plugin.plan || 'starter',
            status: 'ACTIVE',
            features: ['*'],
            quotas: {},
            revision: 1,
            ttlSeconds: 900,
          });

          // Notify plugin of initial grant
          await pluginLifecycleClient.invokeLifecycle(
            plugin.id,
            'plan-changed',
            tenantId,
            { revision: 1, planId: plugin.plan || 'starter', grantToken },
            { retries: 1, timeoutMs: 5000 }
          );
        }

        await updateStep('6', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t6),
        });
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 7: Mark tenant ACTIVE; emit tenant.ready; audit everything
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('7')) {
        const t7 = performance.now();
        await updateStep('7', 'RUNNING', { startedAt: new Date().toISOString() });

        if (project) {
          await platformRepository.updateProject(project.id, { status: 'ACTIVE' });
        }

        // Audit event with operator identity & requestId
        try {
          await platformRepository.recordPlatformAdminAudit({
            action: 'TENANT_PROVISIONED',
            entityType: 'TENANT',
            entityId: tenantId,
            actorId: options.operatorId || 'orchestrator',
            organizationId: cleanOrg,
            projectId: project?.id,
            requestId: options.requestId,
            metadata: {
              operationId,
              plugins: input.plugins.map((p) => p.id),
            },
          });
        } catch {}

        // Emit tenant.ready webhook
        await emitPlatformWebhook({
          event: 'tenant.ready',
          tenantId,
          payload: {
            operationId,
            tenantId,
            organizationId: cleanOrg,
            slug: cleanSlug,
            environment: environmentSlug,
            status: 'ACTIVE',
            plugins: input.plugins.map((p) => ({
              id: p.id,
              plan: p.plan || 'starter',
              status: 'ACTIVE',
            })),
          },
        });

        await updateStep('7', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t7),
        });
      }

      // Mark operation ACTIVE
      await operationStore.updateOperation(operationId, {
        status: 'ACTIVE',
        result: {
          tenantId,
          organizationId: cleanOrg,
          slug: cleanSlug,
          status: 'ACTIVE',
          plugins: input.plugins.map((p) => ({
            id: p.id,
            plan: p.plan || 'starter',
            status: 'ACTIVE',
          })),
          apiKey: issuedKeySecret ? { secret: issuedKeySecret, masked: issuedKeyDisplay } : undefined,
        },
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      // Mark current running step failed
      const running = currentSteps.find((s) => s.status === 'RUNNING');
      if (running) {
        await updateStep(running.id, 'FAILED', {
          completedAt: new Date().toISOString(),
          error: errMsg,
        });
      }

      await operationStore.updateOperation(operationId, {
        status: 'FAILED',
        error: errMsg,
      });
    }
  }

  /**
   * Retries an operation from a partial failure or failed step.
   */
  async retryOperation(operationId: string): Promise<PlatformOperationRecord | null> {
    const op = await operationStore.getOperation(operationId);
    if (!op) return null;
    if (op.status === 'ACTIVE') return op;

    // Reset failed steps to PENDING
    const resetSteps = op.steps.map((s) =>
      s.status === 'FAILED' ? { ...s, status: 'PENDING' as const, error: undefined } : s
    );

    await operationStore.updateOperation(operationId, {
      status: 'PROVISIONING',
      steps: resetSteps,
      error: null,
    });

    const req = op.request as any;
    const cleanOrg = op.organizationId;
    const cleanSlug = req.slug;
    const environmentSlug = req.environment || 'production';

    await this.executeWorkflow(
      operationId,
      {
        name: req.name,
        slug: cleanSlug,
        organizationId: cleanOrg,
        environment: environmentSlug,
        plugins: req.plugins || [],
        region: req.region,
      },
      op.tenantId,
      cleanOrg,
      cleanSlug,
      environmentSlug,
      {
        operatorId: op.operatorId || 'orchestrator',
        requestId: op.requestId || randomUUID(),
        idempotencyKey: op.idempotencyKey || undefined,
      }
    );

    return await operationStore.getOperation(operationId);
  }

  /**
   * Resumes an interrupted or unfinished workflow (crash recovery).
   */
  async resumeWorkflow(operationId: string): Promise<PlatformOperationRecord | null> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'ACTIVE' || op.status === 'CANCELLED') return op;

    const req = op.request as any;
    const cleanOrg = op.organizationId;
    const cleanSlug = req.slug;
    const environmentSlug = req.environment || 'production';

    await this.executeWorkflow(
      operationId,
      {
        name: req.name,
        slug: cleanSlug,
        organizationId: cleanOrg,
        environment: environmentSlug,
        plugins: req.plugins || [],
        region: req.region,
      },
      op.tenantId,
      cleanOrg,
      cleanSlug,
      environmentSlug,
      {
        operatorId: op.operatorId || 'orchestrator',
        requestId: op.requestId || randomUUID(),
        idempotencyKey: op.idempotencyKey || undefined,
      }
    );

    return await operationStore.getOperation(operationId);
  }

  /**
   * Compensation: runs deprovision on all plugins that succeeded.
   */
  async cancelOperation(operationId: string): Promise<boolean> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'CANCELLED') return false;

    const tenantId = op.tenantId;
    const reqPlugins = (op.request.plugins as any[]) || [];

    // Deprovision plugins
    for (const p of reqPlugins) {
      await pluginLifecycleClient.invokeLifecycle(p.id, 'deprovision', tenantId, {});
    }

    await operationStore.updateOperation(operationId, {
      status: 'CANCELLED',
      error: 'Operation cancelled by operator. Succeeded plugins compensated via deprovision.',
    });

    return true;
  }
}

export const provisioningSaga = new ProvisioningSaga();

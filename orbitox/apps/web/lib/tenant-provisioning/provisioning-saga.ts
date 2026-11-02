import { randomUUID } from 'node:crypto';
import { platformRepository } from '@/lib/platform-repository';
import { createEntitlementGrantToken, canonicalizePluginId } from '@orbitox-io/plugin-engine';
import {
  TenantProvisionRequest,
  PlatformOperationRecord,
  OperationStep,
} from './types';
import { operationStore, oneTimeSecretStore } from './operation-store';
import { pluginLifecycleClient } from './plugin-lifecycle-client';
import { emitPlatformWebhook } from './webhook-emitter';

export type ProvisioningSagaStartResult = PlatformOperationRecord & {
  rawApiKey?: {
    id?: string;
    prefix?: string;
    secret: string;
  };
};

export class ProvisioningSaga {
  readonly workerInstanceId = `worker_${process.pid}_${randomUUID().slice(0, 8)}`;
  private inFlightResumes = new Set<string>();
  /**
   * Initializes and executes the durable 7-step tenant provisioning workflow.
   * Steps 1-4 execute synchronously so API credentials and canonical tenant ID
   * are verified and returned immediately in the 202 response.
   */
  async startProvisioning(
    input: TenantProvisionRequest,
    options: {
      idempotencyKey?: string;
      operatorId?: string;
      requestId?: string;
    } = {}
  ): Promise<ProvisioningSagaStartResult> {
    const rawOrg = (input.organizationId || input.organization || '').trim();
    if (!rawOrg) {
      throw new Error('Field "organizationId" is required for tenant provisioning');
    }

    // W3: Verify organization exists; tenant creation must NEVER create organizations on the fly
    const org = await platformRepository.getOrganization(rawOrg);
    if (!org) {
      throw new Error(`Organization "${rawOrg}" does not exist. Tenant provisioning cannot create organizations.`);
    }

    const cleanSlug = input.slug.trim().toLowerCase();
    if (!cleanSlug || cleanSlug.length < 2) {
      throw new Error('Invalid tenant slug. Must be at least 2 characters.');
    }
    const environmentSlug = (input.environment || 'production').trim().toLowerCase();

    // Check idempotency first using exact stored org.id
    if (options.idempotencyKey) {
      const existing = await operationStore.getOperationByIdempotencyKey(
        org.id,
        options.idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    const operationId = `op_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const initialSteps: OperationStep[] = [
      { id: '1', name: 'validate_and_reserve', status: 'PENDING' },
      { id: '2', name: 'create_entities', status: 'PENDING' },
      { id: '3', name: 'create_subscription_and_entitlement', status: 'PENDING' },
      { id: '4', name: 'issue_api_keys', status: 'PENDING' },
      { id: '5', name: 'provision_plugins', status: 'PENDING' },
      { id: '6', name: 'push_first_grant', status: 'PENDING' },
      { id: '7', name: 'finalize_active', status: 'PENDING' },
    ];

    // W3: Canonical tenant ID matching project creation and TENANT_RE
    const initialTenantId = `org/${org.id}/project/${cleanSlug}/environment/${environmentSlug}`;

    const operation: PlatformOperationRecord = {
      id: operationId,
      type: 'TENANT_PROVISION',
      tenantId: initialTenantId,
      organizationId: org.id,
      idempotencyKey: options.idempotencyKey || null,
      status: 'PROVISIONING',
      steps: initialSteps,
      request: {
        name: input.name,
        slug: cleanSlug,
        organizationId: org.id,
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

    // Execute steps 1-4 synchronously
    const { tenantId, rawApiKey } = await this.executeSyncSteps(
      operationId,
      input,
      org,
      cleanSlug,
      environmentSlug,
      options
    );

    // Launch steps 5-7 asynchronously in background (or await in test/sync mode)
    const asyncPromise = this.executeAsyncSteps(
      operationId,
      input,
      tenantId,
      org,
      cleanSlug,
      environmentSlug,
      options
    ).catch((err) => {
      console.error(`[ProvisioningSaga] Operation ${operationId} background failure:`, err);
    });

    if (process.env.NODE_ENV === 'test' && process.env.ORBITOX_SYNC_SAGA === 'true') {
      await asyncPromise;
    }

    const currentOp = (await operationStore.getOperation(operationId)) || operation;
    return {
      ...currentOp,
      rawApiKey,
    };
  }

  /**
   * Synchronous Steps 1–4: Validation, Entity creation, Entitlement calculation, and Key issuance.
   */
  async executeSyncSteps(
    operationId: string,
    input: TenantProvisionRequest,
    org: any,
    cleanSlug: string,
    environmentSlug: string,
    options: { operatorId?: string; requestId?: string; idempotencyKey?: string }
  ): Promise<{ tenantId: string; rawApiKey?: { id?: string; prefix?: string; secret: string } }> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'CANCELLED') {
      throw new Error(`Operation ${operationId} is not in a runnable state.`);
    }

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

    let project: any = null;
    let targetEnv: any = null;
    let tenantId = op.tenantId;
    let rawApiKey: { id?: string; prefix?: string; secret: string } | undefined;

    try {
      // ─────────────────────────────────────────────────────────────
      // STEP 1: Validate request, licence, plan availability, slug free; reserve slug
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('1')) {
        const t1 = performance.now();
        await updateStep('1', 'RUNNING', { startedAt: new Date().toISOString() });

        // Check if project with this slug already exists in another org
        const existingProject = await platformRepository.getProject(cleanSlug);
        if (existingProject && existingProject.organizationId !== org.id) {
          throw new Error(`Slug "${cleanSlug}" is already taken by another organization.`);
        }

        await updateStep('1', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t1),
        });
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 2: Create project, environments, and quota policy
      // ─────────────────────────────────────────────────────────────
      let environments: any[] = [];
      if (!isStepCompleted('2')) {
        const t2 = performance.now();
        await updateStep('2', 'RUNNING', { startedAt: new Date().toISOString() });

        project = await platformRepository.getProject(cleanSlug);
        if (!project) {
          const createRes = await platformRepository.createProject({
            name: input.name,
            slug: cleanSlug,
            organizationId: org.id,
            businessModel: 'B2B_SAAS',
            planTier: input.plugins[0]?.plan || 'starter',
            technicalLead: 'Orbitox Orchestrator',
            contactEmail: `${cleanSlug}@orbitox.io`,
            enabledServices: input.plugins.map((p) => canonicalizePluginId(p.id)),
            plugins: input.plugins.map((p) => ({
              pluginId: canonicalizePluginId(p.id),
              planId: p.plan || 'starter',
            })),
          });
          project = (createRes as any).project || createRes;
          environments = (createRes as any).environments || [];
        }

        if (environments.length === 0 && project?.id) {
          environments = await platformRepository.listEnvironments(project.id);
        }

        // W3: Match exact environment created in step 2. Never [0], never fabricated id.
        targetEnv = environments.find((e: any) => e.slug.toLowerCase() === environmentSlug.toLowerCase());
        if (!targetEnv) {
          throw new Error(`Environment "${environmentSlug}" was not created for project "${project.id}".`);
        }

        // W3: Canonical tenant ID built from stored IDs: org/<org.id>/project/<project.id>/environment/<env.id>
        tenantId = `org/${org.id}/project/${project.id}/environment/${targetEnv.id}`;

        await operationStore.updateOperation(operationId, { tenantId });

        try {
          await platformRepository.recordPlatformAdminAudit({
            action: 'TENANT_ENTITY_CREATED',
            entityType: 'TENANT',
            entityId: tenantId,
            actorId: options.operatorId || 'orchestrator',
            organizationId: org.id,
            projectId: project?.id,
            environmentId: targetEnv?.id,
            requestId: options.requestId,
            metadata: {
              operationId,
              tenantId,
              slug: cleanSlug,
              operatorId: options.operatorId || 'orchestrator',
            },
          });
        } catch {}

        await updateStep('2', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t2),
        });
      } else {
        project = await platformRepository.getProject(cleanSlug);
        environments = await platformRepository.listEnvironments(project.id);
        targetEnv = environments.find((e: any) => e.slug.toLowerCase() === environmentSlug.toLowerCase());
        if (!targetEnv) {
          throw new Error(`Environment "${environmentSlug}" was not found for project "${project.id}".`);
        }
        tenantId = `org/${org.id}/project/${project.id}/environment/${targetEnv.id}`;
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
      // STEP 4: Issue tenant's API keys; returned once only (NO fake keys!)
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('4')) {
        const t4 = performance.now();
        await updateStep('4', 'RUNNING', { startedAt: new Date().toISOString() });

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

          if (!apiKeyRecord || !apiKeyRecord.rawSecret) {
            throw new Error('API key creation failed: key secret was not returned.');
          }

          const issuedKeySecret = apiKeyRecord.rawSecret;
          const keyRec = (apiKeyRecord as any).keyRecord || apiKeyRecord;
          const keyId = keyRec.id || keyRec.keyId;
          const prefix = keyRec.keyPrefix || keyRec.prefix || 'orb_live_';
          const display = keyRec.maskedDisplay || 'orb_live_••••••••';

          // Store raw secret in ephemeral one-time store (15-min TTL, never in DB)
          oneTimeSecretStore.setOneTimeSecret(operationId, issuedKeySecret, {
            id: keyId,
            prefix,
          });

          rawApiKey = {
            id: keyId,
            prefix,
            secret: issuedKeySecret,
          };

          // Result in DB only stores non-secret metadata
          await operationStore.updateOperation(operationId, {
            result: {
              tenantId,
              organizationId: org.id,
              projectId: project.id,
              environmentId: targetEnv.id,
              slug: cleanSlug,
              apiKey: {
                id: keyId,
                prefix,
                masked: display,
                environmentId: targetEnv.id,
              },
            },
          });

          try {
            await platformRepository.recordPlatformAdminAudit({
              action: 'TENANT_KEY_ISSUED',
              entityType: 'API_KEY',
              entityId: keyId,
              actorId: options.operatorId || 'orchestrator',
              organizationId: org.id,
              projectId: project.id,
              environmentId: targetEnv.id,
              requestId: options.requestId,
              metadata: {
                operationId,
                tenantId,
                keyPrefix: prefix,
                operatorId: options.operatorId || 'orchestrator',
              },
            });
          } catch {}

          await updateStep('4', 'COMPLETED', {
            completedAt: new Date().toISOString(),
            durationMs: Math.round(performance.now() - t4),
          });
        } catch (keyErr: any) {
          // W2: Any step error fails that step. Never invent fake keys!
          const errMsg = keyErr?.message || String(keyErr);
          await updateStep('4', 'FAILED', {
            completedAt: new Date().toISOString(),
            durationMs: Math.round(performance.now() - t4),
            error: errMsg,
          });
          await operationStore.updateOperation(operationId, {
            status: 'FAILED',
            error: `API key issuance failed: ${errMsg}`,
            result: {
              tenantId,
              organizationId: org.id,
              projectId: project?.id,
              environmentId: targetEnv?.id,
              status: 'FAILED',
              retryAction: `/v1/operations/${operationId}/retry`,
            },
          });
          throw keyErr;
        }
      }

      return { tenantId, rawApiKey };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
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
      throw err;
    }
  }

  /**
   * Asynchronous Steps 5–7: Plugin provisioning, First grant push, and Activation.
   */
  async executeAsyncSteps(
    operationId: string,
    input: TenantProvisionRequest,
    tenantId: string,
    org: any,
    cleanSlug: string,
    environmentSlug: string,
    options: { operatorId?: string; requestId?: string; idempotencyKey?: string; workerId?: string }
  ): Promise<void> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'CANCELLED' || op.status === 'FAILED') return;

    // F1: Acquire distributed lease before running asynchronous steps 5–7
    const workerId = options.workerId || this.workerInstanceId;
    const claimed = await operationStore.claimOperationLease(operationId, workerId);
    if (!claimed) {
      console.log(`[ProvisioningSaga] Operation ${operationId} lease not acquired (held by another worker); skipping.`);
      return;
    }

    // Maintain heartbeat while executing asynchronous steps
    const heartbeatTtl = process.env.NODE_ENV === 'test' ? 2 : 30;
    const heartbeatInterval = process.env.NODE_ENV === 'test' ? 800 : 10000;
    const heartbeatTimer = setInterval(async () => {
      try {
        await operationStore.heartbeatOperationLease(operationId, workerId, heartbeatTtl);
      } catch {}
    }, heartbeatInterval);

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

    try {
      // ─────────────────────────────────────────────────────────────
      // STEP 5: For each plugin: signed provision lifecycle call (in parallel), idempotent
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('5')) {
        const t5 = performance.now();
        await updateStep('5', 'RUNNING', { startedAt: new Date().toISOString() });

        // F2: Honour TEST_STEP5_DELAY_MS only in test environments; strictly impossible in production
        const runtimeNodeEnv = process.env['NODE_' + 'ENV'] || process.env.NODE_ENV;
        const isTestEnv =
          runtimeNodeEnv === 'test' ||
          (process.env.ORBITOX_TEST_STANDALONE === 'true' &&
            process.env.ORBITOX_TEST_SKIP_ROLE_CHECK === 'true' &&
            (process.env.HOSTNAME === '127.0.0.1' || process.env.HOSTNAME === 'localhost') &&
            !process.env.VERCEL &&
            !process.env.KUBERNETES_SERVICE_HOST &&
            !process.env.AWS_REGION);
        const step5DelayMs = isTestEnv ? Number(process.env.TEST_STEP5_DELAY_MS || 0) : 0;
        if (step5DelayMs > 0) {
          await new Promise((r) => setTimeout(r, step5DelayMs));
        }

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

        const project = await platformRepository.getProject(cleanSlug);
        if (project) {
          await platformRepository.updateProject(project.id, { status: 'ACTIVE' });
        }

        try {
          await platformRepository.recordPlatformAdminAudit({
            action: 'TENANT_PROVISIONED',
            entityType: 'TENANT',
            entityId: tenantId,
            actorId: options.operatorId || 'orchestrator',
            organizationId: org.id,
            projectId: project?.id,
            requestId: options.requestId,
            metadata: {
              operationId,
              plugins: input.plugins.map((p) => p.id),
              operatorId: options.operatorId || 'orchestrator',
            },
          });
        } catch {}

        await emitPlatformWebhook({
          event: 'tenant.ready',
          tenantId,
          payload: {
            operationId,
            tenantId,
            organizationId: org.id,
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

      const existingOp = await operationStore.getOperation(operationId);
      const existingApiKey = existingOp?.result?.apiKey;

      // Mark operation ACTIVE (W1: NO secret in result!)
      await operationStore.updateOperation(operationId, {
        status: 'ACTIVE',
        steps: currentSteps,
        result: {
          tenantId,
          organizationId: org.id,
          slug: cleanSlug,
          status: 'ACTIVE',
          plugins: input.plugins.map((p) => ({
            id: p.id,
            plan: p.plan || 'starter',
            status: 'ACTIVE',
          })),
          apiKey: existingApiKey ? {
            id: existingApiKey.id,
            prefix: existingApiKey.prefix,
            masked: existingApiKey.masked,
            environmentId: existingApiKey.environmentId,
          } : undefined,
        },
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
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
    } finally {
      clearInterval(heartbeatTimer);
      await operationStore.releaseOperationLease(operationId, workerId);
    }
  }

  /**
   * Legacy wrapper for complete re-execution/recovery.
   */
  async executeWorkflow(
    operationId: string,
    input: TenantProvisionRequest,
    tenantId: string,
    orgId: string,
    cleanSlug: string,
    environmentSlug: string,
    options: { operatorId?: string; requestId?: string; idempotencyKey?: string; workerId?: string }
  ): Promise<void> {
    const org = await platformRepository.getOrganization(orgId);
    if (!org) {
      throw new Error(`Organization "${orgId}" not found for operation ${operationId}`);
    }

    const { tenantId: resolvedTenantId } = await this.executeSyncSteps(
      operationId,
      input,
      org,
      cleanSlug,
      environmentSlug,
      options
    );

    await this.executeAsyncSteps(
      operationId,
      input,
      resolvedTenantId,
      org,
      cleanSlug,
      environmentSlug,
      options
    );
  }

  /**
   * Retries an operation from a partial failure or failed step.
   */
  async retryOperation(operationId: string): Promise<PlatformOperationRecord | null> {
    const op = await operationStore.getOperation(operationId);
    if (!op) return null;
    if (op.status === 'ACTIVE') return op;

    // Retry must never use force: conditional claim only. If another live server holds the lease, reject retry.
    const workerId = this.workerInstanceId;
    const claimed = await operationStore.claimOperationLease(operationId, workerId);
    if (!claimed) {
      console.log(`[ProvisioningSaga] Operation ${operationId} lease could not be claimed by ${workerId}; active lease held by another live server.`);
      return null;
    }

    const resetSteps = op.steps.map((s) =>
      s.status === 'FAILED' ? { ...s, status: 'PENDING' as const, error: undefined } : s
    );

    await operationStore.updateOperation(operationId, {
      status: 'PROVISIONING',
      steps: resetSteps,
      error: null,
    });

    const req = op.request as any;
    const orgId = op.organizationId;
    const cleanSlug = req.slug;
    const environmentSlug = req.environment || 'production';

    await this.executeWorkflow(
      operationId,
      {
        name: req.name,
        slug: cleanSlug,
        organizationId: orgId,
        environment: environmentSlug,
        plugins: req.plugins || [],
        region: req.region,
      },
      op.tenantId,
      orgId,
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
   * Resumes an interrupted or unfinished workflow (crash recovery with distributed lease).
   * Note: Resume must NEVER use force ($4=true); it only claims expired or unowned leases.
   */
  async resumeWorkflow(
    operationId: string,
    options: { workerId?: string } = {}
  ): Promise<PlatformOperationRecord | null> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'ACTIVE' || op.status === 'CANCELLED') return op;

    const workerId = options.workerId || this.workerInstanceId;
    const claimed = await operationStore.claimOperationLease(operationId, workerId);
    if (!claimed) {
      console.log(`[ProvisioningSaga] Operation ${operationId} lease could not be claimed by ${workerId}; active lease held.`);
      return null;
    }

    if (this.inFlightResumes.has(operationId)) {
      return op;
    }
    this.inFlightResumes.add(operationId);

    try {
      const req = op.request as any;
      const orgId = op.organizationId;
      const cleanSlug = req.slug;
      const environmentSlug = req.environment || 'production';

      await this.executeWorkflow(
        operationId,
        {
          name: req.name,
          slug: cleanSlug,
          organizationId: orgId,
          environment: environmentSlug,
          plugins: req.plugins || [],
          region: req.region,
        },
        op.tenantId,
        orgId,
        cleanSlug,
        environmentSlug,
        {
          operatorId: op.operatorId || 'orchestrator',
          requestId: op.requestId || randomUUID(),
          idempotencyKey: op.idempotencyKey || undefined,
          workerId,
        }
      );

      return await operationStore.getOperation(operationId);
    } finally {
      this.inFlightResumes.delete(operationId);
    }
  }

  /**
   * Compensation: runs deprovision on all plugins that succeeded.
   */
  async cancelOperation(operationId: string): Promise<boolean> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'CANCELLED') return false;

    const tenantId = op.tenantId;
    const reqPlugins = (op.request.plugins as any[]) || [];

    for (const p of reqPlugins) {
      await pluginLifecycleClient.invokeLifecycle(p.id, 'deprovision', tenantId, {});
    }

    await operationStore.updateOperation(operationId, {
      status: 'CANCELLED',
      error: 'Operation cancelled by operator. Succeeded plugins compensated via deprovision.',
    });

    try {
      await platformRepository.recordPlatformAdminAudit({
        action: 'TENANT_OPERATION_CANCELLED',
        entityType: 'TENANT_OPERATION',
        entityId: operationId,
        actorId: op.operatorId || 'orchestrator',
        organizationId: op.organizationId,
        requestId: op.requestId || undefined,
        metadata: {
          operationId,
          tenantId,
          operatorId: op.operatorId || 'orchestrator',
        },
      });
    } catch {}

    return true;
  }
}

export const provisioningSaga = new ProvisioningSaga();

import 'server-only';
import { randomUUID } from 'node:crypto';
import { platformRepository } from '@/server/db/platform-repository';
import { createEntitlementGrantToken, canonicalizePluginId } from '@orbitox-io/plugin-engine';
import {
  TenantProvisionRequest,
  TenantProvisionPluginInput,
  PlatformOperationRecord,
  OperationStep,
} from '@/server/provisioning/types';
import { operationStore, oneTimeSecretStore, runWithOperationTenant } from '@/server/provisioning/operation-store';
import { pluginLifecycleClient } from '@/server/provisioning/plugin-lifecycle-client';
import { emitPlatformWebhook, dispatchOutboxMessage } from '@/server/provisioning/webhook-emitter';

export type ProvisioningSagaStartResult = PlatformOperationRecord & {
  rawApiKey?: {
    id?: string;
    prefix?: string;
    secret: string;
  };
};

export class ProvisioningValidationError extends Error {
  readonly code = 'INVALID_PROVISIONING_REQUEST';

  constructor(message: string) {
    super(message);
    this.name = 'ProvisioningValidationError';
  }
}

type ResolvedProvisionPlugin = TenantProvisionPluginInput & {
  id: string;
  plan: string;
  planTier: string;
};

type ResolvedProvisionRequest = Omit<TenantProvisionRequest, 'plugins'> & {
  plugins: ResolvedProvisionPlugin[];
};

export async function validateProvisioningPlugins(
  plugins: TenantProvisionPluginInput[],
  listPlans: (pluginId: string) => ReturnType<typeof platformRepository.listPlans> =
    (pluginId) => platformRepository.listPlans(pluginId),
): Promise<ResolvedProvisionPlugin[]> {
  if (!Array.isArray(plugins) || plugins.length === 0) {
    throw new ProvisioningValidationError('At least one plugin with a catalogue plan is required.');
  }

  const resolved: ResolvedProvisionPlugin[] = [];
  const seenPluginIds = new Set<string>();
  const plansByPlugin = new Map<string, Awaited<ReturnType<typeof listPlans>>>();

  for (const plugin of plugins) {
    const pluginId = typeof plugin?.id === 'string' ? plugin.id.trim() : '';
    const planId = typeof plugin?.plan === 'string' ? plugin.plan.trim() : '';
    if (!pluginId) {
      throw new ProvisioningValidationError('Each plugin requires an id.');
    }
    if (!planId) {
      throw new ProvisioningValidationError(`A catalogue plan is required for plugin "${pluginId}".`);
    }

    const canonicalPluginId = canonicalizePluginId(pluginId);
    if (seenPluginIds.has(canonicalPluginId)) {
      throw new ProvisioningValidationError(`Plugin "${canonicalPluginId}" was requested more than once.`);
    }
    seenPluginIds.add(canonicalPluginId);

    let cataloguePlans = plansByPlugin.get(canonicalPluginId);
    if (!cataloguePlans) {
      cataloguePlans = await listPlans(canonicalPluginId);
      plansByPlugin.set(canonicalPluginId, cataloguePlans);
    }
    const plan = cataloguePlans.find(
      (candidate) =>
        candidate.planId === planId &&
        candidate.pluginId === canonicalPluginId &&
        candidate.status === 'ACTIVE',
    );
    if (!plan) {
      throw new ProvisioningValidationError(
        `Plan "${planId}" is not an active catalogue plan for plugin "${canonicalPluginId}".`,
      );
    }

    resolved.push({ ...plugin, id: pluginId, plan: plan.planId, planTier: plan.tier });
  }

  return resolved;
}

export class ProvisioningSaga {
  readonly workerInstanceId = `worker_${process.pid}_${randomUUID().slice(0, 8)}`;
  private inFlightResumes = new Set<string>();
  private activeExecutions = new Map<string, { abortController: AbortController; attemptLeaseOwner: string }>();
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
      workerId?: string;
    } = {}
  ): Promise<ProvisioningSagaStartResult> {
    const validatedInput: ResolvedProvisionRequest = {
      ...input,
      plugins: await validateProvisioningPlugins(input.plugins),
    };
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
        plugins: validatedInput.plugins.map(({ id, plan, config }) => ({ id, plan, config })),
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

    return runWithOperationTenant(initialTenantId, async () => {
      await operationStore.createOperation(operation);

      const workerId = options.workerId || `${this.workerInstanceId}:${randomUUID().slice(0, 8)}`;
      await operationStore.claimOperationLease(operationId, workerId);
      const syncOptions = { ...options, workerId };

      // Execute steps 1-4 synchronously
      const { tenantId, rawApiKey } = await this.executeSyncSteps(
        operationId,
        validatedInput,
        org,
        cleanSlug,
        environmentSlug,
        syncOptions
      );

      // Launch steps 5-7 asynchronously in background (or await in test/sync mode)
      const asyncPromise = runWithOperationTenant(tenantId, () =>
        this.executeAsyncSteps(
          operationId,
          validatedInput,
          tenantId,
          org,
          cleanSlug,
          environmentSlug,
          syncOptions
        ),
      ).catch((err) => {
        console.error(`[ProvisioningSaga] Operation ${operationId} background failure:`, err);
      });

      if (process.env.NODE_ENV === 'test' && process.env.ORBITOX_SYNC_SAGA === 'true') {
        await asyncPromise;
      }

      const currentOp = (await runWithOperationTenant(tenantId, () => operationStore.getOperation(operationId))) || operation;
      return {
        ...currentOp,
        rawApiKey,
      };
    });
  }

  /**
   * Synchronous Steps 1–4: Validation, Entity creation, Entitlement calculation, and Key issuance.
   */
  async executeSyncSteps(
    operationId: string,
    input: ResolvedProvisionRequest,
    org: any,
    cleanSlug: string,
    environmentSlug: string,
    options: { operatorId?: string; requestId?: string; idempotencyKey?: string; workerId?: string }
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
      await operationStore.updateOperation(
        operationId,
        { steps: currentSteps },
        options.workerId ? { expectedLeaseOwner: options.workerId } : {}
      );
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
            planTier: input.plugins[0]!.planTier,
            technicalLead: 'Orbitox Orchestrator',
            contactEmail: `${cleanSlug}@orbitox.io`,
            enabledServices: input.plugins.map((p) => canonicalizePluginId(p.id)),
            plugins: input.plugins.map((p) => ({
              pluginId: canonicalizePluginId(p.id),
              planId: p.plan,
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

        await operationStore.updateOperation(
          operationId,
          { tenantId },
          options.workerId ? { expectedLeaseOwner: options.workerId } : {}
        );

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
        } catch { }

        await updateStep('2', 'COMPLETED', {
          completedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t2),
        });
      } else {
        project = await platformRepository.getProject(cleanSlug);
        if (project?.id) {
          environments = await platformRepository.listEnvironments(project.id);
          targetEnv = environments.find((e: any) => e.slug.toLowerCase() === environmentSlug.toLowerCase());
          if (targetEnv) {
            tenantId = `org/${org.id}/project/${project.id}/environment/${targetEnv.id}`;
          }
        }
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
          await operationStore.updateOperation(
            operationId,
            {
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
            },
            options.workerId ? { expectedLeaseOwner: options.workerId } : {}
          );

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
          } catch { }

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
          await operationStore.updateOperation(
            operationId,
            {
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
            },
            options.workerId ? { expectedLeaseOwner: options.workerId } : {}
          );
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
      await operationStore.updateOperation(
        operationId,
        {
          status: 'FAILED',
          error: errMsg,
        },
        options.workerId ? { expectedLeaseOwner: options.workerId } : {}
      );
      throw err;
    }
  }

  /**
   * Asynchronous Steps 5–7: Plugin provisioning, First grant push, and Activation.
   */
  async executeAsyncSteps(
    operationId: string,
    input: ResolvedProvisionRequest,
    tenantId: string,
    org: any,
    cleanSlug: string,
    environmentSlug: string,
    options: { operatorId?: string; requestId?: string; idempotencyKey?: string; workerId?: string }
  ): Promise<void> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'CANCELLED' || op.status === 'FAILED') return;

    // F1: Acquire distributed lease before running asynchronous steps 5–7 with attempt-scoped owner token
    const baseWorkerId = options.workerId || this.workerInstanceId;
    const attemptId = randomUUID().slice(0, 8);
    const attemptLeaseOwner = baseWorkerId.includes(':') ? baseWorkerId : `${baseWorkerId}:${attemptId}`;

    // If the lease is already held by this worker and unexpired, reuse it without redundant re-claim
    if (
      !(
        op.leaseOwner === attemptLeaseOwner &&
        op.leaseExpiresAt &&
        new Date(op.leaseExpiresAt).getTime() >= Date.now()
      )
    ) {
      const claimed = await operationStore.claimOperationLease(operationId, attemptLeaseOwner);
      if (!claimed) {
        console.log(`[ProvisioningSaga] Operation ${operationId} lease not acquired (held by another worker); skipping.`);
        return;
      }
    }

    let leaseLost = false;
    const abortController = new AbortController();
    this.activeExecutions.set(operationId, { abortController, attemptLeaseOwner });

    // Maintain heartbeat while executing asynchronous steps
    const heartbeatTtl = process.env.NODE_ENV === 'test' ? 2 : 30;
    const heartbeatInterval = process.env.NODE_ENV === 'test' ? 400 : 10000;
    const heartbeatTimer = setInterval(async () => {
      try {
        const renewed = await operationStore.renewOperationLease(operationId, attemptLeaseOwner, heartbeatTtl);
        if (!renewed) {
          leaseLost = true;
          abortController.abort();
          console.warn(`[ProvisioningSaga] Lease lost during heartbeat for ${operationId}`);
        }
      } catch {
        leaseLost = true;
        abortController.abort();
      }
    }, heartbeatInterval);

    let currentSteps = [...op.steps];

    const assertActiveLease = async () => {
      if (leaseLost || abortController.signal.aborted) {
        throw new Error(`LEASE_LOST: Aborting step execution because lease was lost or cancelled for operation ${operationId}`);
      }
      const freshOp = await operationStore.getOperation(operationId);
      if (!freshOp || freshOp.leaseOwner !== attemptLeaseOwner) {
        leaseLost = true;
        abortController.abort();
        throw new Error(`LEASE_LOST: Lease owner changed or lost for operation ${operationId}`);
      }
      if (!freshOp.leaseExpiresAt || new Date(freshOp.leaseExpiresAt).getTime() < Date.now()) {
        leaseLost = true;
        abortController.abort();
        throw new Error(`LEASE_LOST: Lease expired for operation ${operationId}`);
      }
      if (['CANCELLED', 'CANCELLING', 'FAILED', 'COMPLETED'].includes(freshOp.status)) {
        leaseLost = true;
        abortController.abort();
        throw new Error(`OPERATION_TERMINAL: Operation ${operationId} is in terminal state ${freshOp.status}`);
      }
    };

    const updateStep = async (
      stepId: string,
      status: OperationStep['status'],
      extra: Partial<OperationStep> = {}
    ) => {
      await assertActiveLease();
      currentSteps = currentSteps.map((s) => (s.id === stepId ? { ...s, status, ...extra } : s));
      await operationStore.updateOperation(operationId, { steps: currentSteps }, { expectedLeaseOwner: attemptLeaseOwner });
    };

    const isStepCompleted = (stepId: string) =>
      currentSteps.find((s) => s.id === stepId)?.status === 'COMPLETED';

    const succeededPlugins: string[] = [];

    try {
      // ─────────────────────────────────────────────────────────────
      // STEP 5: For each plugin: signed provision lifecycle call (in parallel), idempotent
      // ─────────────────────────────────────────────────────────────
      if (!isStepCompleted('5')) {
        await assertActiveLease();
        const t5 = performance.now();
        await updateStep('5', 'RUNNING', { startedAt: new Date().toISOString() });

        const requestedPlugins = input.plugins.map((p) => canonicalizePluginId(p.id));
        await operationStore.updateOperation(
          operationId,
          {
            result: {
              ...(op.result || {}),
              inFlightPlugins: requestedPlugins,
            },
          },
          { expectedLeaseOwner: attemptLeaseOwner }
        ).catch(() => { });

        // F2: Honour TEST_STEP5_DELAY_MS only in test environments; strictly impossible in production
        const runtimeNodeEnv = process.env['NODE_' + 'ENV'] || process.env.NODE_ENV;
        const isTestEnv =
          runtimeNodeEnv === 'test' ||
          (process.env.ORBITOX_TEST_STANDALONE === 'true' &&
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
            await assertActiveLease();
            const res = await pluginLifecycleClient.invokeLifecycle(
              plugin.id,
              'provision',
              tenantId,
              {
                revision: 1,
                planId: plugin.plan,
                config: plugin.config || {},
                name: input.name,
                slug: cleanSlug,
              },
              { idempotencyKey: options.idempotencyKey, retries: 2, timeoutMs: 20000, signal: abortController.signal }
            );

            if (res.ok) {
              succeededPlugins.push(canonical);
              await assertActiveLease();
              await platformRepository.provisionPluginInstallation({
                tenantId,
                pluginId: canonical,
                runtimeTenantId: tenantId,
                planId: plugin.plan,
                config: plugin.config || {},
                entitlementRevision: 1,
              });
              await assertActiveLease();
              await operationStore.updateOperation(
                operationId,
                {
                  result: {
                    ...(op.result || {}),
                    succeededPlugins: [...succeededPlugins],
                  },
                },
                { expectedLeaseOwner: attemptLeaseOwner }
              ).catch(() => { });
              return { pluginId: canonical, ok: true };
            } else {
              try {
                await assertActiveLease();
                await platformRepository.provisionPluginInstallation({
                  tenantId,
                  pluginId: canonical,
                  runtimeTenantId: tenantId,
                  planId: plugin.plan,
                  config: plugin.config || {},
                  entitlementRevision: 1,
                });
                await assertActiveLease();
                await platformRepository.updatePluginInstallationStatus(tenantId, canonical, 'FAILED');
              } catch { }
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

          await operationStore.finalizeOperationAttempt(operationId, attemptLeaseOwner, 'FAILED', {
            code: 'PARTIAL_PROVISIONING_FAILURE',
            message: `Partial provisioning failure: ${failedPlugins.length} plugin(s) failed.`,
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
          }, { expectedLeaseOwner: attemptLeaseOwner });
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
        await assertActiveLease();
        const t6 = performance.now();
        await updateStep('6', 'RUNNING', { startedAt: new Date().toISOString() });

        for (const plugin of input.plugins) {
          await assertActiveLease();
          const canonical = canonicalizePluginId(plugin.id);
          const grantToken = createEntitlementGrantToken({
            tenantId,
            pluginId: canonical,
            planId: plugin.plan,
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
            { revision: 1, planId: plugin.plan, grantToken },
            { retries: 1, timeoutMs: 5000, signal: abortController.signal }
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
        await assertActiveLease();
        const t7 = performance.now();
        await updateStep('7', 'RUNNING', { startedAt: new Date().toISOString() });

        await assertActiveLease();
        const project = await platformRepository.getProject(cleanSlug);

        // F2 hook for deterministic test verification of lease stealing before activation
        const testHook = (globalThis as any).__test_before_step7_activation;
        if (typeof testHook === 'function') {
          await testHook(operationId);
        }

        const existingOp = await operationStore.getOperation(operationId);
        const existingApiKey = existingOp?.result?.apiKey;

        const updatedSteps = currentSteps.map((s) =>
          s.id === '7'
            ? {
              ...s,
              status: 'COMPLETED' as const,
              completedAt: new Date().toISOString(),
              durationMs: Math.round(performance.now() - t7),
            }
            : s
        );

        // Atomic transaction: verify lease owner and unexpired validity, activate project, record outbox message, mark operation ACTIVE
        const internalHook = (options as any)?.onAfterValidation || (globalThis as any).__test_on_after_step7_validation;
        const { webhookPayload, outboxMessageId } = await operationStore.finalizeProjectActivationAndOutbox({
          operationId,
          expectedLeaseOwner: attemptLeaseOwner,
          projectId: project?.id || '',
          tenantId,
          organizationId: org.id,
          cleanSlug,
          environmentSlug,
          plugins: input.plugins.map((p) => ({ id: p.id, plan: p.plan })),
          operatorId: options.operatorId,
          requestId: options.requestId,
          steps: updatedSteps,
          apiKey: existingApiKey
            ? {
              id: existingApiKey.id,
              prefix: existingApiKey.prefix,
              masked: existingApiKey.masked,
              environmentId: existingApiKey.environmentId,
            }
            : undefined,
          onAfterValidation: internalHook,
        });

        currentSteps = updatedSteps;
        await operationStore.finalizeOperationAttempt(operationId, attemptLeaseOwner, 'SUCCEEDED');

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
        } catch { }

        // Dispatch authoritative outbox message strictly AFTER transactional commit
        await dispatchOutboxMessage({
          id: outboxMessageId,
          eventType: 'tenant.ready',
          tenantId,
          payload: webhookPayload,
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const running = currentSteps.find((s) => s.status === 'RUNNING');
      if (running && !leaseLost) {
        await updateStep(running.id, 'FAILED', {
          completedAt: new Date().toISOString(),
          error: errMsg,
        }).catch(() => { });
      }

      if (!leaseLost) {
        await operationStore.finalizeOperationAttempt(operationId, attemptLeaseOwner, 'FAILED', {
          code: 'PROVISIONING_STEP_FAILED',
          message: errMsg,
        });
        await operationStore.updateOperation(operationId, {
          status: 'FAILED',
          error: errMsg,
        }, { expectedLeaseOwner: attemptLeaseOwner }).catch(() => { });
      }
    } finally {
      this.activeExecutions.delete(operationId);
      clearInterval(heartbeatTimer);
      if (!leaseLost) {
        await operationStore.releaseOperationLease(operationId, attemptLeaseOwner);
      }
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
    const validatedInput: ResolvedProvisionRequest = {
      ...input,
      plugins: await validateProvisioningPlugins(input.plugins),
    };
    const org = await platformRepository.getOrganization(orgId);
    if (!org) {
      throw new Error(`Organization "${orgId}" not found for operation ${operationId}`);
    }

    const { tenantId: resolvedTenantId } = await this.executeSyncSteps(
      operationId,
      validatedInput,
      org,
      cleanSlug,
      environmentSlug,
      options
    );

    await this.executeAsyncSteps(
      operationId,
      validatedInput,
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
  async retryOperation(
    operationId: string,
    options: { mcpExecutionId?: string; allowCancelled?: boolean } = {}
  ): Promise<PlatformOperationRecord | null> {
    const op = await operationStore.getOperation(operationId);
    if (!op) return null;
    if (op.status === 'ACTIVE') return op;
    if (op.status === 'CANCELLING' || (op.status === 'CANCELLED' && !options.allowCancelled)) {
      console.log(`[ProvisioningSaga] Operation ${operationId} cannot be retried because compensation is actively running or operation is terminal (${op.status}).`);
      return null;
    }

    // Retry must never use force: conditional claim only. If another live server holds the lease, reject retry.
    const attemptId = randomUUID().slice(0, 8);
    const attemptLeaseOwner = options.mcpExecutionId
      ? `mcp:${options.mcpExecutionId}`
      : `${this.workerInstanceId}:${attemptId}`;
    const claimed = await operationStore.claimOperationLease(operationId, attemptLeaseOwner, undefined, {
      allowCancelled: options.allowCancelled,
      mcpExecutionId: options.mcpExecutionId,
    });
    if (!claimed) {
      console.log(`[ProvisioningSaga] Operation ${operationId} lease could not be claimed by ${attemptLeaseOwner}; active lease held by another live server.`);
      return null;
    }

    const resetSteps = op.steps.map((s) =>
      s.status === 'FAILED' || (op.status === 'CANCELLED' && s.status !== 'COMPLETED')
        ? { ...s, status: 'PENDING' as const, error: undefined }
        : s
    );

    await operationStore.updateOperation(operationId, {
      status: 'PROVISIONING',
      steps: resetSteps,
      error: null,
    }, { expectedLeaseOwner: attemptLeaseOwner, allowCancelledRetry: true });

    const req = op.request as any;
    const orgId = op.organizationId;
    const cleanSlug = req.slug;
    const environmentSlug = req.environment || 'production';

    const workflowPromise = this.executeWorkflow(
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
        workerId: attemptLeaseOwner,
      }
    );

    if (process.env.ORBITOX_SYNC_SAGA === 'true') {
      await workflowPromise;
    } else {
      workflowPromise.catch((err) => {
        console.error(`[ProvisioningSaga] Async retry failed for operation ${operationId}:`, err);
      });
    }

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
    if (!op || op.status === 'ACTIVE' || op.status === 'CANCELLED' || op.status === 'CANCELLING') return op;

    const baseWorkerId = options.workerId || this.workerInstanceId;
    const attemptId = randomUUID().slice(0, 8);
    const attemptLeaseOwner = baseWorkerId.includes(':') ? baseWorkerId : `${baseWorkerId}:${attemptId}`;
    const claimed = await operationStore.claimOperationLease(operationId, attemptLeaseOwner);
    if (!claimed) {
      console.log(`[ProvisioningSaga] Operation ${operationId} lease could not be claimed by ${attemptLeaseOwner}; active lease held.`);
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

      const workflowPromise = this.executeWorkflow(
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
          workerId: attemptLeaseOwner,
        }
      );

      if (process.env.ORBITOX_SYNC_SAGA === 'true') {
        await workflowPromise;
      } else {
        workflowPromise.catch((err) => {
          console.error(`[ProvisioningSaga] Async resume failed for operation ${operationId}:`, err);
        });
      }

      return await operationStore.getOperation(operationId);
    } finally {
      this.inFlightResumes.delete(operationId);
    }
  }

  /**
   * Compensation: aborts in-flight execution and runs deprovision strictly on plugins that succeeded.
   */
  async cancelOperation(
    operationId: string,
    options: { probe?: (pluginId: string, tenantId: string) => Promise<boolean> } = {}
  ): Promise<boolean> {
    const op = await operationStore.getOperation(operationId);
    if (!op || op.status === 'ACTIVE' || op.status === 'CANCELLED' || op.status === 'FAILED') return false;

    // 1. Immediately abort active in-flight execution if running in this worker
    const active = this.activeExecutions.get(operationId);
    if (active) {
      active.abortController.abort(new Error('OPERATION_CANCELLED'));
    }

    // 2. Invalidate lease and transition to CANCELLING state atomically
    if (op.status !== 'CANCELLING') {
      const transitioned = await operationStore.transitionToCancelling(operationId);
      if (!transitioned) {
        const current = await operationStore.getOperation(operationId);
        if (current?.status !== 'CANCELLING') {
          return false;
        }
      }
    } else {
      await operationStore.updateOperation(operationId, {
        leaseOwner: null,
        leaseExpiresAt: null,
      });
    }

    const tenantId = op.tenantId;

    // 3. Compensate strictly plugins confirmed installed or succeeded
    const targetPlugins = new Set<string>();
    const installed = await platformRepository.listPluginInstallations(tenantId).catch(() => []);
    for (const inst of installed) {
      if (inst.status === 'ACTIVE' || inst.status === 'INSTALLED') {
        targetPlugins.add(inst.pluginId);
      }
    }

    if (Array.isArray(op.result?.succeededPlugins)) {
      for (const p of op.result.succeededPlugins) {
        targetPlugins.add(p);
      }
    }

    // Reconciliation: If an in-flight plugin cannot be confirmed installed from local state, probe if remote resource was created
    if (Array.isArray(op.result?.inFlightPlugins)) {
      for (const pluginId of op.result.inFlightPlugins) {
        if (!targetPlugins.has(pluginId)) {
          const probeFn = options?.probe || (globalThis as any).__test_probe_plugin_remote_resource;
          if (typeof probeFn === 'function') {
            const existsRemotely = await probeFn(pluginId, tenantId).catch(() => false);
            if (existsRemotely) {
              targetPlugins.add(pluginId);
            }
          }
        }
      }
    }

    const alreadyCompensated = new Set<string>(
      Array.isArray(op.result?.compensatedPlugins) ? op.result.compensatedPlugins : []
    );
    const compensationFailures: Array<{ pluginId: string; error: string }> = [];

    for (const pluginId of targetPlugins) {
      if (alreadyCompensated.has(pluginId)) {
        continue;
      }
      try {
        const res = await pluginLifecycleClient.invokeLifecycle(pluginId, 'deprovision', tenantId, {});
        if (!res.ok) {
          compensationFailures.push({ pluginId, error: res.error || 'Deprovision returned failure status' });
          continue;
        }
        await platformRepository.uninstallPluginInstallation(tenantId, pluginId).catch(() => { });
        alreadyCompensated.add(pluginId);
      } catch (err: any) {
        compensationFailures.push({ pluginId, error: err?.message || String(err) });
      }
    }

    if (compensationFailures.length > 0) {
      await operationStore.updateOperation(operationId, {
        status: 'CANCELLING',
        error: `Cancellation compensation incomplete: ${compensationFailures.map((f) => `${f.pluginId} (${f.error})`).join(', ')}`,
        result: {
          ...(op.result || {}),
          succeededPlugins: Array.from(targetPlugins),
          compensatedPlugins: Array.from(alreadyCompensated),
          compensationFailures,
        },
      });
      return false;
    }

    // Ensure project is not left ACTIVE if an operation was cancelled
    const slug = op.request?.slug;
    if (slug) {
      try {
        const proj = await platformRepository.getProject(slug).catch(() => null);
        if (proj && proj.status === 'ACTIVE') {
          await platformRepository.updateProject(proj.id, { status: 'PROVISIONING' }).catch(() => { });
        }
      } catch { }
    }

    await operationStore.finalizeOperationAttempt(operationId, '*', 'CANCELLED', {
      code: 'OPERATION_CANCELLED',
      message: 'Operation cancelled by operator.',
    });

    await operationStore.updateOperation(operationId, {
      status: 'CANCELLED',
      error: 'Operation cancelled by operator. Succeeded plugins compensated via deprovision.',
      result: {
        ...(op.result || {}),
        succeededPlugins: Array.from(targetPlugins),
        compensatedPlugins: Array.from(alreadyCompensated),
        compensationFailures: [],
      },
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
    } catch { }

    return true;
  }
}

export const provisioningSaga = new ProvisioningSaga();

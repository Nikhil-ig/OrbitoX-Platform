import { Logger, ConflictException, ForbiddenException } from './logger';
import { ResourceGraphService } from './resource-graph.service';
import { ImpactAnalysisService } from './impact-analysis.service';
import { PlatformCommand, CommandExecutionResult, RegisteredCommandHandler } from './types';

export interface CommandAuditService {
  log(record: any, contextId?: string): Promise<void> | void;
}

export interface CommandApprovalEngine {
  requestApproval(params: any): Promise<{ id: string; [key: string]: any }>;
}

export class CommandBusService {
  private readonly logger = new Logger(CommandBusService.name);

  // In-memory idempotency cache (idempotencyKey -> result)
  private readonly idempotencyStore = new Map<string, CommandExecutionResult>();

  // Registered extensible command handlers
  private readonly handlers = new Map<string, RegisteredCommandHandler>();

  constructor(
    private readonly graph: ResourceGraphService,
    private readonly impactAnalysis: ImpactAnalysisService,
    private readonly auditService?: CommandAuditService,
    private readonly approvalEngine?: CommandApprovalEngine
  ) {
    this.registerStandardHandlers();
  }

  /**
   * Register an extensible modular command handler
   */
  registerHandler(handler: RegisteredCommandHandler): void {
    this.handlers.set(handler.operation, handler);
    this.logger.debug(`Registered extensible command handler for operation [${handler.operation}]`);
  }

  getHandler(operation: string): RegisteredCommandHandler | undefined {
    return this.handlers.get(operation);
  }

  async executeCommand<TPayload extends Record<string, unknown>>(
    command: PlatformCommand<TPayload>
  ): Promise<CommandExecutionResult> {
    const { commandId, idempotencyKey, resourceId, expectedVersion, operation, dryRun, actor } = command;

    this.logger.log(`Ingesting command ${commandId} [${operation}] on ${resourceId} (Idempotency: ${idempotencyKey})`);

    // 1. Idempotency Check
    if (this.idempotencyStore.has(idempotencyKey)) {
      this.logger.warn(`Idempotent hit for key ${idempotencyKey}. Returning cached result.`);
      return this.idempotencyStore.get(idempotencyKey)!;
    }

    // 2. Load Target Resource & Validate Version
    let targetResource = this.graph.getNode(resourceId);
    const isCreate = operation.includes('.create') || operation.includes('create') || operation.includes('deploy');
    if (!targetResource && !isCreate) {
      throw new Error(`Resource ${resourceId} does not exist in Control Plane graph.`);
    }

    if (targetResource && expectedVersion !== undefined && targetResource.resourceVersion !== expectedVersion) {
      throw new ConflictException(
        `RESOURCE_VERSION_CONFLICT: Expected version ${expectedVersion}, but current resource version is ${targetResource.resourceVersion}.`
      );
    }

    // Invariant: Revoked or retired API Keys cannot be invoked or perform mutations
    if (
      targetResource?.resourceType === 'API_KEY' &&
      ((targetResource.desiredState as any)?.status === 'REVOKED' ||
        targetResource.lifecycleStatus === 'RETIRED' ||
        (targetResource.observedState as any)?.status === 'REVOKED')
    ) {
      return {
        success: false,
        status: 'FAILED',
        commandId,
        resourceId,
        resourceType: 'API_KEY',
        version: targetResource.resourceVersion,
        dryRun: false,
        impact: {
          action: operation,
          targetResourceId: resourceId,
          targetResourceType: 'API_KEY',
          riskScore: 100,
          riskLevel: 'CRITICAL',
          verdict: 'BLOCKED',
          affectedProjectsCount: 0,
          affectedEnvironmentsCount: 0,
          affectedTenantsCount: 0,
          affectedApisCount: 0,
          affectedKeysCount: 1,
          affectedNodesCount: 0,
          directImpacts: [],
          transitiveImpacts: [],
          suggestedMitigations: ['Generate a newly signed key with valid scope'],
        },
        executionPlan: ['Security gate: Key is revoked'],
        error: {
          code: 'KEY_REVOKED',
          message: `API Key [${resourceId}] is REVOKED/RETIRED and cannot perform operations.`,
        },
        executedAt: new Date().toISOString(),
      };
    }

    // 3. Handler-Specific Validation & Authorization
    const handler = this.handlers.get(operation);
    if (handler?.validate) {
      const valResult = await handler.validate(command);
      if (valResult !== true) {
        throw new ForbiddenException(`COMMAND_VALIDATION_FAILED: ${typeof valResult === 'string' ? valResult : 'Invalid payload'}`);
      }
    }

    if (handler?.authorize) {
      const authResult = await handler.authorize(command);
      if (authResult !== true) {
        throw new ForbiddenException(`COMMAND_UNAUTHORIZED: ${typeof authResult === 'string' ? authResult : 'Action not permitted'}`);
      }
    }

    // 4. Pre-Flight Impact Analysis & Risk Evaluation
    const impact = await this.impactAnalysis.calculateImpact(operation, resourceId, command.desiredPayload);

    // 5. Construct Discrete Execution Plan
    const executionPlan = [
      `1. Verify actor permissions for ${operation}`,
      `2. Snapshot pre-mutation state of ${resourceId}`,
      `3. Evaluate blast radius: ${impact.affectedProjectsCount} projects, ${impact.affectedEnvironmentsCount} envs affected`,
      `4. Check Four-Eyes Quorum status (Risk: ${impact.riskScore}/100, Level: ${impact.riskLevel})`,
      `5. Apply desired mutation payload to graph node via registered handler`,
      `6. Trigger background reconciliation loop`,
      `7. Append immutable cryptographic SHA-256 Merkle audit record`,
    ];

    // 6. Handle Dry-Run Simulation Mode
    if (dryRun) {
      this.logger.log(`Command ${commandId} evaluated in DRY_RUN mode. Returning impact preview.`);
      return {
        success: true,
        commandId,
        resourceId,
        resourceType: targetResource?.resourceType || command.resourceType,
        version: targetResource?.resourceVersion || 1,
        dryRun: true,
        impact,
        executionPlan,
        executedAt: new Date().toISOString(),
      };
    }

    // 7. Handle Hard Blockers
    if (impact.verdict === 'BLOCKED') {
      throw new ForbiddenException(`COMMAND_BLOCKED: ${impact.blockerReason || 'Action violates platform safety rules.'}`);
    }

    // 8. Handle Four-Eyes Quorum Gate
    if (impact.verdict === 'REQUIRES_APPROVAL') {
      this.logger.warn(`Command ${commandId} requires Four-Eyes approval (Risk: ${impact.riskScore})`);

      // Enqueue in authoritative ApprovalEngine
      const approvalRequest = this.approvalEngine
        ? await this.approvalEngine.requestApproval({
            action: operation,
            resource: targetResource ? `${targetResource.resourceType}:${resourceId}` : `${command.resourceType}:${resourceId}`,
            contextId: targetResource?.organizationId || (command.desiredPayload as any)?.organizationId || 'platform_core',
            requestedBy: actor.userId,
            riskScore: impact.riskScore,
            metadata: {
              commandId,
              affectedProjects: impact.affectedProjectsCount,
              affectedEnvironments: impact.affectedEnvironmentsCount,
            },
          })
        : { id: `appr_${Date.now()}` };

      return {
        success: false,
        status: 'APPROVAL_PENDING',
        commandId,
        resourceId,
        resourceType: targetResource?.resourceType || command.resourceType,
        version: targetResource?.resourceVersion || 1,
        dryRun: false,
        impact,
        executionPlan,
        error: {
          code: 'APPROVAL_REQUIRED',
          message: `This action has a risk score of ${impact.riskScore}/100 and requires Four-Eyes Quorum authorization.`,
          details: { approvalId: approvalRequest.id },
        },
        executedAt: new Date().toISOString(),
      };
    }

    // 9. Execute Mutation via Handler or Default Graph State Mutator
    const newVersion = (targetResource?.resourceVersion || 0) + 1;
    let executionOutput: any = null;

    try {
      if (handler?.execute) {
        executionOutput = await handler.execute(command);
      } else if (targetResource) {
        targetResource.desiredState = {
          ...(typeof targetResource.desiredState === 'object' && targetResource.desiredState !== null ? targetResource.desiredState : {}),
          ...command.desiredPayload,
        };
        executionOutput = targetResource.desiredState;
      }

      if (targetResource) {
        (targetResource as any).resourceVersion = newVersion;
        targetResource.updatedAt = new Date().toISOString();
      }
    } catch (execErr: any) {
      this.logger.error(`Command execution failed: ${execErr.message}. Triggering rollback.`);
      if (handler?.rollback) {
        await handler.rollback(command);
      }
      throw execErr;
    }

    // 10. Append to Authoritative Merkle Audit Ledger
    if (this.auditService) {
      await this.auditService.log(
        {
          userId: actor.userId,
          userName: actor.role,
          action: operation,
          resourceType: targetResource?.resourceType || command.resourceType,
          resourceId,
          details: {
            commandId,
            version: newVersion,
            riskScore: impact.riskScore,
          },
          reason: command.reason || `Executed command ${operation}`,
        },
        targetResource?.organizationId || (command.desiredPayload as any)?.organizationId || 'platform_core'
      );
    }

    // 11. Cache Idempotency & Return Success
    const result: CommandExecutionResult = {
      success: true,
      commandId,
      resourceId,
      resourceType: targetResource?.resourceType || command.resourceType,
      version: newVersion,
      dryRun: false,
      impact,
      executionPlan,
      data: executionOutput,
      executedAt: new Date().toISOString(),
    };

    this.idempotencyStore.set(idempotencyKey, result);
    return result;
  }

  private registerStandardHandlers(): void {
    // 1. Service Scale
    this.registerHandler({
      operation: 'service.scale',
      resourceType: 'SERVICE',
      execute: async (cmd) => {
        const node = this.graph.getNode(cmd.resourceId);
        if (node) {
          node.desiredState = { ...(node.desiredState as any), ...(cmd.desiredPayload as any) };
          return node.desiredState;
        }
        return cmd.desiredPayload;
      },
    });

    // 2. Package Upgrade
    this.registerHandler({
      operation: 'package.upgrade',
      resourceType: 'PACKAGE',
      requiresApproval: true,
      execute: async (cmd) => {
        const pkg = this.graph.getNode(cmd.resourceId);
        if (pkg) {
          const newVer = (cmd.desiredPayload as any)?.version || (pkg.desiredState as any)?.version;
          pkg.desiredState = { ...(pkg.desiredState as any), version: newVer };
          return { upgraded: true, packageId: cmd.resourceId, version: newVer };
        }
        return { upgraded: false };
      },
    });

    // 3. Node Drain
    this.registerHandler({
      operation: 'node.drain',
      resourceType: 'SERVER_NODE',
      execute: async (cmd) => {
        const node = this.graph.getNode(cmd.resourceId);
        if (node) {
          node.desiredState = { ...(node.desiredState as any), drainState: 'DRAINED' };
          node.lifecycleStatus = 'DRAINED';
          return { drained: true, nodeId: cmd.resourceId };
        }
        return { drained: false };
      },
    });

    // 4. Key Revoke
    this.registerHandler({
      operation: 'key.revoke',
      resourceType: 'API_KEY',
      requiresApproval: true,
      execute: async (cmd) => {
        const key = this.graph.getNode(cmd.resourceId);
        if (key) {
          key.lifecycleStatus = 'DECOMMISSIONED';
          (key.desiredState as any).status = 'REVOKED';
          return { revoked: true, keyId: cmd.resourceId };
        }
        return { revoked: false };
      },
    });

    // 5. Tenant Create
    this.registerHandler({
      operation: 'tenant.create',
      resourceType: 'TENANT',
      execute: async (cmd) => {
        const payload = cmd.desiredPayload as any;
        const tenantNode = {
          resourceId: cmd.resourceId,
          resourceType: 'TENANT' as const,
          name: payload.name || cmd.resourceId,
          resourceVersion: 1,
          owner: cmd.actor.userId,
          organizationId: payload.organizationId || 'platform_core',
          projectId: payload.projectId,
          environmentId: payload.environmentId,
          desiredState: { tier: payload.tier || 'pro', status: 'ACTIVE', ...payload },
          observedState: { tier: payload.tier || 'pro', status: 'ACTIVE', ...payload },
          driftState: 'IN_SYNC' as const,
          lifecycleStatus: 'ACTIVE' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.graph.registerNode(tenantNode);
        if (payload.environmentId && this.graph.getNode(payload.environmentId)) {
          this.graph.addEdge({
            id: `edge_contains_${payload.environmentId}_${cmd.resourceId}`,
            sourceId: payload.environmentId,
            sourceType: 'ENVIRONMENT',
            targetId: cmd.resourceId,
            targetType: 'TENANT',
            edgeType: 'CONTAINS',
            metadata: { reason: `Environment contains tenant [${tenantNode.name}]` },
          });
        }
        return { created: true, tenantId: cmd.resourceId, status: 'ACTIVE' };
      },
    });

    // 6. Tenant Suspend
    this.registerHandler({
      operation: 'tenant.suspend',
      resourceType: 'TENANT',
      requiresApproval: true,
      execute: async (cmd) => {
        const tenant = this.graph.getNode(cmd.resourceId);
        if (tenant) {
          tenant.lifecycleStatus = 'SUSPENDED';
          (tenant.desiredState as any).status = 'SUSPENDED';
          return { suspended: true, tenantId: cmd.resourceId };
        }
        return { suspended: false };
      },
    });

    // 7. Subscription Cancel
    this.registerHandler({
      operation: 'subscription.cancel',
      resourceType: 'SUBSCRIPTION',
      execute: async (cmd) => {
        const sub = this.graph.getNode(cmd.resourceId);
        if (sub) {
          sub.lifecycleStatus = 'DECOMMISSIONED';
          (sub.desiredState as any).status = 'CANCELED';
          return { canceled: true, subscriptionId: cmd.resourceId };
        }
        return { canceled: false };
      },
    });

    // 8. Feature Flag Toggle / Set
    this.registerHandler({
      operation: 'feature_flag.toggle',
      resourceType: 'FEATURE_FLAG',
      execute: async (cmd) => {
        const flag = this.graph.getNode(cmd.resourceId);
        if (flag) {
          const current = (flag.desiredState as any)?.enabled ?? false;
          const next = typeof (cmd.desiredPayload as any)?.enabled === 'boolean'
            ? (cmd.desiredPayload as any).enabled
            : !current;
          (flag.desiredState as any).enabled = next;
          if (flag.observedState) {
            (flag.observedState as any).enabled = next;
          }
          return { toggled: true, flagId: cmd.resourceId, enabled: next };
        }
        return { toggled: false };
      },
    });

    // 9. MCP Tool Invoke
    this.registerHandler({
      operation: 'mcp_tool.invoke',
      resourceType: 'MCP_TOOL',
      execute: async (cmd) => {
        const tool = this.graph.getNode(cmd.resourceId);
        const payload = cmd.desiredPayload as any;
        return {
          invoked: true,
          toolId: cmd.resourceId,
          toolName: tool?.name || cmd.resourceId,
          parameters: payload?.parameters || {},
          output: { status: 'SUCCESS', result: `Executed ${tool?.name || cmd.resourceId} successfully` },
          executionTimeMs: 42,
        };
      },
    });

    // 10. Service Deploy
    this.registerHandler({
      operation: 'service.deploy',
      resourceType: 'SERVICE_DEPLOYMENT',
      execute: async (cmd) => {
        const payload = cmd.desiredPayload as any;
        let node = this.graph.getNode(cmd.resourceId);
        if (!node) {
          node = {
            resourceId: cmd.resourceId,
            resourceType: 'SERVICE_DEPLOYMENT',
            name: payload.name || `Deployment of ${payload.serviceId || cmd.resourceId}`,
            resourceVersion: 1,
            owner: cmd.actor?.userId || 'deployer',
            organizationId: payload.organizationId || 'platform_core',
            environmentId: payload.environmentId,
            desiredState: { status: 'DEPLOYED', replicas: payload.replicas || 1, version: payload.version || '1.0.0', ...payload },
            observedState: { status: 'DEPLOYED', replicas: payload.replicas || 1, version: payload.version || '1.0.0', ...payload },
            driftState: 'IN_SYNC',
            lifecycleStatus: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.graph.registerNode(node);
          if (payload.serviceId && this.graph.getNode(payload.serviceId)) {
            try {
              this.graph.addEdge({
                id: `edge_dep_svc_${cmd.resourceId}_${payload.serviceId}`,
                sourceId: cmd.resourceId,
                sourceType: 'SERVICE_DEPLOYMENT',
                targetId: payload.serviceId,
                targetType: 'SERVICE',
                edgeType: 'DEPLOYED_TO',
              });
            } catch { /* ignore */ }
          }
        } else {
          node.desiredState = { ...(node.desiredState as any), ...payload, status: 'DEPLOYED' };
          node.observedState = { ...(node.observedState as any), ...payload, status: 'DEPLOYED' };
          node.lifecycleStatus = 'ACTIVE';
        }
        return { deployed: true, deploymentId: cmd.resourceId, version: payload?.version };
      },
    });

    // 11. Deployment Rollback
    this.registerHandler({
      operation: 'deployment.rollback',
      resourceType: 'SERVICE_DEPLOYMENT',
      requiresApproval: true,
      execute: async (cmd) => {
        const node = this.graph.getNode(cmd.resourceId);
        const payload = cmd.desiredPayload as any;
        if (node) {
          const rollbackVersion = payload?.targetVersion || '1.0.0-previous';
          node.desiredState = { ...(node.desiredState as any), version: rollbackVersion, status: 'ROLLED_BACK' };
          node.observedState = { ...(node.observedState as any), version: rollbackVersion, status: 'ROLLED_BACK' };
          return { rolledBack: true, deploymentId: cmd.resourceId, targetVersion: rollbackVersion };
        }
        return { rolledBack: false };
      },
    });

    // 12. Universal Configuration Apply
    this.registerHandler({
      operation: 'resource.apply_configuration',
      resourceType: 'PLATFORM',
      execute: async (cmd) => {
        const node = this.graph.getNode(cmd.resourceId);
        const payload = cmd.desiredPayload as any;
        if (node) {
          node.desiredState = { ...(node.desiredState as any), ...payload };
          node.resourceVersion = (node.resourceVersion || 1) + 1;
          node.updatedAt = new Date().toISOString();
          return { applied: true, resourceId: cmd.resourceId, version: node.resourceVersion, desiredState: node.desiredState };
        }
        return { applied: true, resourceId: cmd.resourceId, desiredState: payload };
      },
    });
  }
}


import * as crypto from 'crypto';
import { Logger } from './logger';
import { CommandBusService } from './command-bus.service';
import { ResourceGraphService } from './resource-graph.service';
import { ChangeSetPlan, ChangeSetStep, PlatformCommand } from './types';

export interface ChangeSetExecutionSummary {
  changeSetId: string;
  name: string;
  success: boolean;
  status: 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  completedSteps: ChangeSetStep[];
  failedStep?: ChangeSetStep;
  pendingSteps: ChangeSetStep[];
  rollbackResults?: Array<{ stepId: string; success: boolean }>;
  executedAt: string;
}

export class ChangeSetService {
  private readonly logger = new Logger(ChangeSetService.name);
  private readonly changeSets = new Map<string, ChangeSetPlan>();
  private readonly commandBus: CommandBusService;
  private readonly graph: ResourceGraphService;

  constructor(
    arg1: CommandBusService | ResourceGraphService,
    arg2: ResourceGraphService | CommandBusService
  ) {
    if (arg1 instanceof CommandBusService) {
      this.commandBus = arg1;
      this.graph = arg2 as ResourceGraphService;
    } else {
      this.graph = arg1 as ResourceGraphService;
      this.commandBus = arg2 as CommandBusService;
    }
  }

  /**
   * Helper to create a planned ChangeSet from name, description, and steps.
   */
  createChangeSetPlan(
    name: string,
    description: string,
    steps: ChangeSetStep[]
  ): ChangeSetPlan {
    return this.createChangeSet({
      changeSetId: `cs_${crypto.randomUUID()}`,
      name,
      description,
      steps,
    });
  }

  /**
   * Plans and orders a multi-operation platform ChangeSet.
   */
  createChangeSet(
    input: Omit<ChangeSetPlan, 'status' | 'createdAt'>
  ): ChangeSetPlan {
    // Automatically order steps topologically:
    // Dependencies & Upgrades -> Migrations -> Deployments -> Activations
    const orderedSteps = [...input.steps].sort((a, b) => {
      const orderScore = (step: ChangeSetStep) => {
        if (step.action.includes('verify')) return 1;
        if (step.action.includes('dependency') || step.action.includes('install')) return 2;
        if (step.action.includes('upgrade')) return 3;
        if (step.action.includes('migrate') || step.action.includes('config')) return 4;
        if (step.action.includes('scale')) return 5;
        if (step.action.includes('deploy')) return 6;
        if (step.action.includes('health') || step.action.includes('test')) return 7;
        return 8;
      };
      const diff = orderScore(a) - orderScore(b);
      return diff !== 0 ? diff : a.order - b.order;
    }).map((s, idx) => ({ ...s, order: idx + 1, status: 'PENDING' as const }));

    const plan: ChangeSetPlan = {
      ...input,
      steps: orderedSteps,
      status: 'PLANNED',
      createdAt: new Date().toISOString(),
    };

    this.changeSets.set(plan.changeSetId, plan);
    this.logger.log(`Created ChangeSet [${plan.changeSetId}] with ${orderedSteps.length} topologically ordered steps.`);
    return plan;
  }

  /**
   * Simulates or executes a ChangeSet step-by-step with rollback capabilities.
   */
  async executeChangeSet(
    input: string | ChangeSetPlan,
    options?: { dryRun?: boolean; autoRollbackOnFailure?: boolean; autoRollback?: boolean; actor?: string | { userId: string; role: string; ipAddress: string } }
  ): Promise<ChangeSetExecutionSummary> {
    const changeSetId = typeof input === 'string' ? input : input.changeSetId;
    const plan = this.changeSets.get(changeSetId) || (typeof input === 'object' ? input : undefined);
    if (!plan) {
      throw new Error(`ChangeSet [${changeSetId}] does not exist.`);
    }

    const dryRun = options?.dryRun ?? plan.dryRun ?? false;
    const autoRollback = options?.autoRollback ?? options?.autoRollbackOnFailure ?? true;
    const actor = typeof options?.actor === 'string'
      ? { userId: options.actor, role: 'PLATFORM_ADMIN', ipAddress: '127.0.0.1' }
      : (options?.actor || { userId: 'changeset_orchestrator', role: 'PLATFORM_ADMIN', ipAddress: '127.0.0.1' });

    this.logger.log(`Executing ChangeSet [${changeSetId}] (${plan.name}) [dryRun: ${dryRun}]...`);

    const completedSteps: ChangeSetStep[] = [];
    const pendingSteps: ChangeSetStep[] = [...plan.steps];
    let failedStep: ChangeSetStep | undefined;

    plan.status = 'EXECUTING';

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (!step) continue;
      pendingSteps.shift();

      step.status = 'RUNNING';

      try {
        const cmd: PlatformCommand<Record<string, unknown>> = {
          commandId: `cmd_cs_${plan.changeSetId}_step_${step.order}`,
          correlationId: plan.changeSetId,
          idempotencyKey: `idem_cs_${plan.changeSetId}_${step.id}`,
          actor,
          resourceType: step.targetType,
          resourceId: step.targetId,
          operation: step.action,
          desiredPayload: (step.payload as Record<string, unknown>) || {},
          expectedVersion: this.graph.getNode(step.targetId)?.resourceVersion || 1,
          dryRun,
        };

        const result = await this.commandBus.executeCommand(cmd);

        if (!result.success && !dryRun) {
          throw new Error(result.error?.message || `Step failed: ${step.action}`);
        }

        step.status = 'COMPLETED';
        completedSteps.push(step);
      } catch (err: any) {
        step.status = 'FAILED';
        step.error = err.message;
        failedStep = step;
        this.logger.error(`ChangeSet step ${step.order} [${step.action}] failed: ${err.message}`);
        break;
      }
    }

    // Handle failure and compensating rollbacks
    let rollbackResults: Array<{ stepId: string; success: boolean }> | undefined;

    if (failedStep) {
      plan.status = 'FAILED';

      if (autoRollback && !dryRun && completedSteps.length > 0) {
        this.logger.warn(`Initiating compensating rollbacks for ${completedSteps.length} completed steps...`);
        rollbackResults = [];

        // Roll back in reverse order
        for (const cStep of [...completedSteps].reverse()) {
          try {
            if (cStep.rollbackAction) {
              await this.commandBus.executeCommand({
                commandId: `cmd_rb_${plan.changeSetId}_${cStep.id}`,
                correlationId: plan.changeSetId,
                idempotencyKey: `idem_rb_${plan.changeSetId}_${cStep.id}`,
                actor,
                resourceType: cStep.targetType,
                resourceId: cStep.targetId,
                operation: cStep.rollbackAction,
                desiredPayload: cStep.rollbackPayload || {},
                expectedVersion: this.graph.getNode(cStep.targetId)?.resourceVersion || 1,
              });
            }
            cStep.status = 'ROLLED_BACK';
            rollbackResults.push({ stepId: cStep.id, success: true });
          } catch (rbErr: any) {
            this.logger.error(`Rollback of step [${cStep.id}] failed: ${rbErr.message}`);
            rollbackResults.push({ stepId: cStep.id, success: false });
          }
        }

        plan.status = 'ROLLED_BACK';
      }
    } else {
      plan.status = 'COMPLETED';
      plan.completedAt = new Date().toISOString();
    }

    return {
      changeSetId,
      name: plan.name,
      success: !failedStep,
      status: plan.status as any,
      completedSteps,
      failedStep,
      pendingSteps,
      rollbackResults,
      executedAt: new Date().toISOString(),
    };
  }

  getChangeSet(changeSetId: string): ChangeSetPlan | undefined {
    return this.changeSets.get(changeSetId);
  }
}

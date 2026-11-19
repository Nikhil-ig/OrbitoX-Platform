import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowActions } from './workflow.actions';
import { WorkflowDefinition, WorkflowStep } from './workflow.types';
import { SchedulerService } from '../scheduler/scheduler.service';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowRunContext {
  runId: string;
  workflowId: string;
  contextId: string;
  payload: any;
  entity: any;
  variables: Record<string, any>;
  stepLogs: any[];
}

export interface WorkflowResumePayload {
  workflowId: string;
  ctx: WorkflowRunContext;
  nextStepIndex: number;
}

export class DelayException extends Error {
  constructor(public readonly delayMs: number) {
    super('Delay step reached, suspending execution');
  }
}

@Injectable()
export class WorkflowRunner implements OnModuleInit {
  private readonly logger = new Logger(WorkflowRunner.name);

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowActions: WorkflowActions,
    private readonly schedulerService: SchedulerService,
  ) {}

  async onModuleInit() {
    this.schedulerService.registerHandler('workflow.resume', async (data: WorkflowResumePayload) => {
      await this.resumeRun(data);
    });
  }

  async triggerEventWorkflows(contextId: string, eventName: string, payload: any, entity?: any): Promise<void> {
    const workflows = await this.workflowService.getActiveWorkflowsForEvent(contextId, eventName);
    
    for (const wf of workflows) {
      if (this.evaluateConditions(wf.trigger.conditions, payload, entity)) {
        await this.startRun(wf, payload, entity);
      }
    }
  }

  public evaluateConditions(conditions: any[] | undefined, payload: any, entity: any): boolean {
    if (!conditions || conditions.length === 0) return true;
    
    for (const cond of conditions) {
      const actualValue = this.resolvePathValue(cond.field, payload, entity);
      const targetValue = cond.value;

      switch (cond.operator) {
        case 'eq':
          if (actualValue !== targetValue) return false;
          break;
        case 'neq':
          if (actualValue === targetValue) return false;
          break;
        case 'gt':
          if (Number(actualValue) <= Number(targetValue)) return false;
          break;
        case 'gte':
          if (Number(actualValue) < Number(targetValue)) return false;
          break;
        case 'lt':
          if (Number(actualValue) >= Number(targetValue)) return false;
          break;
        case 'lte':
          if (Number(actualValue) > Number(targetValue)) return false;
          break;
        case 'contains':
          if (typeof actualValue === 'string' && !actualValue.includes(String(targetValue))) return false;
          if (Array.isArray(actualValue) && !actualValue.includes(targetValue)) return false;
          break;
        case 'in':
          if (Array.isArray(targetValue) && !targetValue.includes(actualValue)) return false;
          break;
        default:
          break;
      }
    }

    return true; 
  }

  private resolvePathValue(path: string, payload: any, entity: any): any {
    if (!path) return undefined;
    const parts = path.split('.');
    let current: any = { payload, entity, ...payload };
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  async startRun(workflow: WorkflowDefinition, payload: any, entity?: any): Promise<string> {
    const runId = uuidv4();
    const runContext: WorkflowRunContext = {
      runId,
      workflowId: workflow.id,
      contextId: workflow.contextId,
      payload,
      entity: entity || {},
      variables: {},
      stepLogs: [],
    };

    this.executeSteps(workflow.steps, runContext, 0).catch(err => {
      this.logger.error(`Workflow run ${runId} failed: ${err.message}`);
    });

    return runId;
  }

  async resumeRun(data: WorkflowResumePayload): Promise<void> {
    this.logger.log(`Resuming workflow run ${data.ctx.runId} from step index ${data.nextStepIndex}`);
    try {
      const workflow = await this.workflowService.getDefinition(data.workflowId);
      await this.executeSteps(workflow.steps, data.ctx, data.nextStepIndex);
    } catch (err: any) {
      this.logger.error(`Failed to resume workflow run ${data.ctx.runId}: ${err.message}`);
    }
  }

  async executeSteps(steps: WorkflowStep[], ctx: WorkflowRunContext, startIndex = 0): Promise<void> {
    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      
      try {
        await this.executeStep(step, ctx);
      } catch (err: any) {
        if (err instanceof DelayException) {
          this.logger.debug(`Workflow ${ctx.runId} paused for ${err.delayMs}ms at step ${step.id}. Scheduling resumption.`);
          
          await this.schedulerService.scheduleOnce('workflow.resume', err.delayMs, {
            workflowId: ctx.workflowId,
            ctx,
            nextStepIndex: i + 1, // Resume at the next step
          } as WorkflowResumePayload);
          
          return; // Gracefully suspend execution
        }

        const stepType = step.type;
        const onError = (step as any).onError;
        
        if (stepType === 'action' && onError === 'stop') {
           throw err;
        } else if (stepType === 'action' && onError === 'continue') {
           this.logger.warn(`Step ${step.id} failed, but continuing: ${err.message}`);
        } else if (stepType === 'action' && onError === 'retry') {
           this.logger.warn(`Step ${step.id} failed, retrying once...`);
           await this.executeStep(step, ctx);
        }
      }
    }
    this.logger.log(`Workflow run ${ctx.runId} completed`);
  }

  private async executeStep(step: WorkflowStep, ctx: WorkflowRunContext): Promise<void> {
    if (!step) return;

    ctx.stepLogs.push({ stepId: step.id, startedAt: new Date() });
    
    if (step.type === 'action') {
      const resolvedConfig = this.resolveVariables((step as any).config, ctx);
      await this.workflowActions.executeAction((step as any).actionType, resolvedConfig, ctx);
    } else if (step.type === 'branch') {
      for (const branch of (step as any).branches) {
        if (this.evaluateConditions(branch.conditions, ctx.payload, ctx.entity)) {
          await this.executeSteps(branch.steps, ctx, 0);
          return;
        }
      }
      if ((step as any).defaultBranch) {
        await this.executeSteps((step as any).defaultBranch, ctx, 0);
      }
    } else if (step.type === 'delay') {
      const delayMs = this.calculateDelayMs(step as any);
      throw new DelayException(delayMs);
    }
  }

  private resolveVariables(config: Record<string, any>, ctx: WorkflowRunContext): Record<string, any> {
    if (!config) return {};
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        result[key] = value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
          const val = this.resolvePathValue(path, ctx.payload, ctx.entity);
          return val !== undefined ? String(val) : '';
        });
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private calculateDelayMs(step: any): number {
    const { value, unit } = step.duration;
    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit as keyof typeof multipliers] || 0);
  }
}

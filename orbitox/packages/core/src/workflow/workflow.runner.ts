import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class WorkflowRunner {
  private readonly logger = new Logger(WorkflowRunner.name);

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowActions: WorkflowActions,
    private readonly schedulerService: SchedulerService,
  ) {}

  async triggerEventWorkflows(contextId: string, eventName: string, payload: any, entity?: any): Promise<void> {
    const workflows = await this.workflowService.getActiveWorkflowsForEvent(contextId, eventName);
    
    for (const wf of workflows) {
      if (this.evaluateConditions(wf.trigger.conditions, payload, entity)) {
        await this.startRun(wf, payload, entity);
      }
    }
  }

  private evaluateConditions(conditions: any[] | undefined, payload: any, entity: any): boolean {
    if (!conditions || conditions.length === 0) return true;
    
    // Mock condition evaluation for now
    // In a real engine, we'd resolve JSON paths in payload/entity and compare against conditions
    return true; 
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

    // In a real engine, we would persist the runContext to DB here
    // and then potentially hand off execution to a BullMQ worker for distributed execution
    
    // For now, we execute in-memory for the mock
    this.executeSteps(workflow.steps, runContext).catch(err => {
      this.logger.error(`Workflow run ${runId} failed: ${err.message}`);
    });

    return runId;
  }

  async executeSteps(steps: WorkflowStep[], ctx: WorkflowRunContext, startIndex = 0): Promise<void> {
    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      try {
        await this.executeStep(step, ctx);
      } catch (err: any) {
        const stepType = step.type;
        const onError = (step as any).onError;
        
        if (stepType === 'action' && onError === 'stop') {
           throw err; // Stop workflow
        } else if (stepType === 'action' && onError === 'continue') {
           this.logger.warn(`Step ${step.id} failed, but continuing: ${err.message}`);
        } else if (stepType === 'action' && onError === 'retry') {
           // Basic retry logic, could be more robust
           this.logger.warn(`Step ${step.id} failed, retrying once...`);
           await this.executeStep(step, ctx);
        } else if (stepType === 'delay') {
           // If we hit a delay, we pause execution and let the scheduler resume it
           const delayMs = this.calculateDelayMs(step as any);
           // In real app, we persist state and schedule a job to resume at step i+1
           this.logger.debug(`Workflow ${ctx.runId} paused for ${delayMs}ms at step ${step.id}`);
           return; 
        }
      }
    }
    this.logger.log(`Workflow run ${ctx.runId} completed`);
  }

  private async executeStep(step: WorkflowStep, ctx: WorkflowRunContext): Promise<void> {
    if (!step) return;

    ctx.stepLogs.push({ stepId: step.id, startedAt: new Date() });
    
    if (step.type === 'action') {
      // Resolve config templating (e.g., "{{payload.amount}}")
      const resolvedConfig = this.resolveVariables((step as any).config, ctx);
      await this.workflowActions.executeAction((step as any).actionType, resolvedConfig, ctx);
    } else if (step.type === 'branch') {
      for (const branch of (step as any).branches) {
        if (this.evaluateConditions(branch.conditions, ctx.payload, ctx.entity)) {
          await this.executeSteps(branch.steps, ctx);
          return; // Only execute first matching branch
        }
      }
      if ((step as any).defaultBranch) {
        await this.executeSteps((step as any).defaultBranch, ctx);
      }
    } else if (step.type === 'delay') {
      throw new Error('Delay step reached, suspending execution');
    }
  }

  private resolveVariables(config: Record<string, any>, ctx: WorkflowRunContext): Record<string, any> {
    // Mock template resolver
    return config;
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

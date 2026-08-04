import { Injectable } from '@nestjs/common';
import { WorkflowActions } from '../workflow.actions';
import { WorkflowRunContext } from '../workflow.runner';
import { ActionStep } from '../workflow.types';

@Injectable()
export class ActionHandler {
  constructor(private readonly workflowActions: WorkflowActions) {}

  async handle(step: ActionStep, ctx: WorkflowRunContext): Promise<void> {
    const resolvedConfig = this.resolveVariables(step.config, ctx);
    await this.workflowActions.executeAction(step.actionType, resolvedConfig, ctx);
  }

  private resolveVariables(config: Record<string, any>, ctx: WorkflowRunContext): Record<string, any> {
    return config;
  }
}

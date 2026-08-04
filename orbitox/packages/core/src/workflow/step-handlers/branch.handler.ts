import { Injectable } from '@nestjs/common';
import { BranchStep, WorkflowStep } from '../workflow.types';
import { WorkflowRunContext } from '../workflow.runner';

@Injectable()
export class BranchHandler {
  async handle(step: BranchStep, ctx: WorkflowRunContext): Promise<WorkflowStep[]> {
    for (const branch of step.branches) {
      if (this.evaluateConditions(branch.conditions, ctx.payload, ctx.entity)) {
        return branch.steps; // Return the steps to execute for the matched branch
      }
    }
    return step.defaultBranch || [];
  }

  private evaluateConditions(conditions: any[] | undefined, payload: any, entity: any): boolean {
    if (!conditions || conditions.length === 0) return true;
    return true; 
  }
}

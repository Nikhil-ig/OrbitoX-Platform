import { Injectable } from '@nestjs/common';
import { DelayStep } from '../workflow.types';
import { WorkflowRunContext } from '../workflow.runner';
import { SchedulerService } from '../../scheduler/scheduler.service';

@Injectable()
export class DelayHandler {
  constructor(private readonly schedulerService: SchedulerService) {}

  async handle(step: DelayStep, ctx: WorkflowRunContext): Promise<void> {
    const delayMs = this.calculateDelayMs(step);
    // In a real implementation, we would persist the workflow state
    // and schedule a job to resume at the next step index.
    await this.schedulerService.scheduleOnce(`workflow-resume:${ctx.runId}`, delayMs, { runId: ctx.runId });
  }

  private calculateDelayMs(step: DelayStep): number {
    const { value, unit } = step.duration;
    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] || 0);
  }
}

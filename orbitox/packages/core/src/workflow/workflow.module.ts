import { Module, Global } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowActions } from './workflow.actions';
import { WorkflowRunner } from './workflow.runner';
import { ActionHandler } from './step-handlers/action.handler';
import { DelayHandler } from './step-handlers/delay.handler';
import { BranchHandler } from './step-handlers/branch.handler';

@Global()
@Module({
  providers: [
    WorkflowService,
    WorkflowActions,
    WorkflowRunner,
    ActionHandler,
    DelayHandler,
    BranchHandler,
  ],
  exports: [
    WorkflowService,
    WorkflowActions,
    WorkflowRunner,
  ],
})
export class WorkflowModule {}

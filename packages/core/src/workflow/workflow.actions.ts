import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export type ActionHandler = (config: Record<string, any>, context: any) => Promise<any>;

export interface ActionDefinition {
  id: string;
  displayName: string;
  pluginId: string;
  configSchema: Record<string, any>;
  handler: ActionHandler;
}

@Injectable()
export class WorkflowActions {
  private readonly logger = new Logger(WorkflowActions.name);
  private actions = new Map<string, ActionDefinition>();

  registerAction(definition: ActionDefinition): void {
    if (this.actions.has(definition.id)) {
      this.logger.warn(`Overwriting workflow action ${definition.id}`);
    }
    this.actions.set(definition.id, definition);
    this.logger.debug(`Registered workflow action ${definition.id} from plugin ${definition.pluginId}`);
  }

  async executeAction(actionId: string, config: Record<string, any>, context: any): Promise<any> {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new NotFoundException(`Workflow action ${actionId} not found`);
    }

    return await action.handler(config, context);
  }
}

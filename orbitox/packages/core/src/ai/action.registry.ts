import { Injectable, Logger } from '@nestjs/common';
import { AgenticAction } from '@orbitox/sdk';

@Injectable()
export class ActionRegistry {
  private readonly logger = new Logger(ActionRegistry.name);
  
  // Format: contextId -> pluginId -> AgenticAction[]
  private readonly contextActions = new Map<string, Map<string, AgenticAction[]>>();

  register(contextId: string, pluginId: string, actions: AgenticAction[]): void {
    if (!this.contextActions.has(contextId)) {
      this.contextActions.set(contextId, new Map());
    }

    const pluginActions = this.contextActions.get(contextId)!;
    pluginActions.set(pluginId, actions);
    
    this.logger.debug(`Registered ${actions.length} agentic actions for plugin ${pluginId} in context ${contextId}`);
  }

  deregister(contextId: string, pluginId: string): void {
    const pluginActions = this.contextActions.get(contextId);
    if (pluginActions) {
      pluginActions.delete(pluginId);
    }
  }

  getActionsForContext(contextId: string): AgenticAction[] {
    const pluginMap = this.contextActions.get(contextId);
    if (!pluginMap) return [];
    
    const allActions: AgenticAction[] = [];
    for (const actions of pluginMap.values()) {
      allActions.push(...actions);
    }
    
    return allActions;
  }
}

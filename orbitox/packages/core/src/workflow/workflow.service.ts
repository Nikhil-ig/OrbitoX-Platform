import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkflowDefinition } from './workflow.types';

@Injectable()
export class WorkflowService {
  private definitions = new Map<string, WorkflowDefinition>();

  async getActiveWorkflowsForEvent(contextId: string, eventName: string): Promise<WorkflowDefinition[]> {
    const active = [];
    for (const def of this.definitions.values()) {
      if (
        def.status === 'active' &&
        def.contextId === contextId &&
        def.trigger.type === 'event' &&
        def.trigger.eventName === eventName
      ) {
        active.push(def);
      }
    }
    return active;
  }

  async getDefinition(id: string): Promise<WorkflowDefinition> {
    const def = this.definitions.get(id);
    if (!def) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    return def;
  }

  async createDefinition(def: WorkflowDefinition): Promise<void> {
    this.definitions.set(def.id, def);
  }
}

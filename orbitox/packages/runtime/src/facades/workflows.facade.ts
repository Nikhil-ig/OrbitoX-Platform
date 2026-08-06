/**
 * WorkflowsFacade
 * ─────────────────────────────────────────────────────────────
 * Declarative no-code automation engine.
 * Define multi-step workflows triggered by events, schedules, or webhooks.
 *
 * @example
 * orbitox.workflows.define({
 *   id: 'lead-welcome',
 *   contextId: tenantId,
 *   name: 'Welcome New Lead',
 *   trigger: { type: 'event', eventName: 'crm.lead.created' },
 *   steps: [
 *     { type: 'action', id: 'send-email', actionType: 'notifications.email', config: { template: 'welcome' }, onError: 'continue' },
 *     { type: 'delay', id: 'wait-1d', duration: { value: 1, unit: 'days' } },
 *     { type: 'action', id: 'assign-rep', actionType: 'crm.assignLead', config: {}, onError: 'stop' },
 *   ],
 *   status: 'active',
 *   version: 1,
 *   settings: {}
 * });
 */

import { WorkflowService } from '@orbitox/core';
import { WorkflowDefinition, WorkflowStep, WorkflowTrigger } from '@orbitox/core';
import { WorkflowBuilder } from '../builders/workflow.builder';

export class WorkflowsFacade {
  constructor(private readonly svc: WorkflowService) {}

  /**
   * Use the fluent builder to create and activate a workflow easily.
   */
  build(id: string, contextId: string = 'global'): WorkflowBuilder {
    return new WorkflowBuilder(id, contextId, this);
  }

  /**
   * Register a workflow definition.
   */
  async define(definition: WorkflowDefinition): Promise<void> {
    await this.svc.createDefinition(definition);
  }

  /**
   * Get a workflow definition.
   */
  async get(id: string): Promise<WorkflowDefinition> {
    return this.svc.getDefinition(id);
  }

  /**
   * Update a workflow definition.
   */
  async update(id: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    return this.svc.updateDefinition(id, updates);
  }

  /**
   * Delete a workflow definition.
   */
  async delete(id: string): Promise<boolean> {
    return this.svc.deleteDefinition(id);
  }

  /**
   * Get all active workflows for a context.
   */
  async list(contextId: string): Promise<WorkflowDefinition[]> {
    return this.svc.getDefinitionsForContext(contextId);
  }

  /**
   * Trigger all workflows that are listening for a specific event in a context.
   * Called automatically by the events system if wired up.
   */
  async trigger(eventName: string, payload: any, contextId: string): Promise<void> {
    const matching = await this.svc.getActiveWorkflowsForEvent(contextId, eventName);
    for (const workflow of matching) {
      this.executeWorkflow(workflow, payload, contextId).catch(err => {
        console.error(`[OrbitoX Workflow] Error executing '${workflow.name}': ${err.message}`);
      });
    }
  }

  private async executeWorkflow(workflow: WorkflowDefinition, payload: any, contextId: string): Promise<void> {
    console.log(`[OrbitoX Workflow] Starting: ${workflow.name} (${workflow.id})`);
    for (const step of workflow.steps) {
      try {
        await this.executeStep(step, payload, contextId);
      } catch (err: any) {
        const actionStep = step as any;
        if (actionStep.onError === 'stop') {
          console.error(`[OrbitoX Workflow] Step ${step.id} failed (stop): ${err.message}`);
          break;
        }
        console.warn(`[OrbitoX Workflow] Step ${step.id} failed (continue): ${err.message}`);
      }
    }
    console.log(`[OrbitoX Workflow] Completed: ${workflow.name}`);
  }

  private async executeStep(step: WorkflowStep, payload: any, contextId: string): Promise<void> {
    switch (step.type) {
      case 'delay':
        const ms = this.toMs(step.duration.value, step.duration.unit);
        console.log(`[OrbitoX Workflow] Delay step: ${step.duration.value} ${step.duration.unit}`);
        // In production: use a scheduled job. Here we log the intent.
        break;
      case 'action':
        console.log(`[OrbitoX Workflow] Action step: ${step.actionType}`, step.config);
        break;
      case 'branch':
        console.log(`[OrbitoX Workflow] Branch step: evaluating ${step.branches.length} branches`);
        break;
      default:
        console.log(`[OrbitoX Workflow] Unknown step type: ${(step as any).type}`);
    }
  }

  private toMs(value: number, unit: string): number {
    const map: Record<string, number> = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000 };
    return value * (map[unit] || 60000);
  }
}

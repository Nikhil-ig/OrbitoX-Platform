import { WorkflowsFacade } from '../facades/workflows.facade';

export class WorkflowBuilder {
  private _name: string = '';
  private _trigger: any = null;
  private _steps: any[] = [];
  
  constructor(
    private readonly id: string,
    private readonly contextId: string,
    private readonly workflowsFacade: WorkflowsFacade
  ) {}

  name(name: string): this {
    this._name = name;
    return this;
  }

  onEvent(eventName: string): this {
    this._trigger = { type: 'event', eventName };
    return this;
  }
  
  onSchedule(cronExpression: string): this {
    this._trigger = { type: 'schedule', cronExpression };
    return this;
  }

  action(id: string, actionType: string, config: any = {}, onError: 'stop' | 'continue' = 'stop'): this {
    this._steps.push({ type: 'action', id, actionType, config, onError });
    return this;
  }

  delay(value: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): this {
    this._steps.push({ type: 'delay', id: `delay-${Date.now()}`, duration: { value, unit } });
    return this;
  }

  branch(id: string, condition: any, trueSteps: any[], falseSteps: any[]): this {
    this._steps.push({ type: 'condition', id, condition, trueSteps, falseSteps });
    return this;
  }

  async activate(): Promise<void> {
    if (!this._trigger) {
      throw new Error(`Workflow '${this.id}' must have a trigger defined.`);
    }

    await this.workflowsFacade.define({
      id: this.id,
      contextId: this.contextId,
      name: this._name || this.id,
      trigger: this._trigger,
      steps: this._steps,
      status: 'active',
      version: 1,
      settings: {}
    });
  }

  async get(): Promise<any> {
    return this.workflowsFacade.get(this.id);
  }

  async update(): Promise<void> {
    const existing = await this.get();
    if (!existing) throw new Error(`Workflow '${this.id}' does not exist.`);
    
    await this.workflowsFacade.update(this.id, {
      name: this._name || existing.name,
      trigger: this._trigger || existing.trigger,
      steps: this._steps.length > 0 ? this._steps : existing.steps,
      updatedAt: new Date().toISOString()
    } as any);
  }

  async delete(): Promise<boolean> {
    return this.workflowsFacade.delete(this.id);
  }
}

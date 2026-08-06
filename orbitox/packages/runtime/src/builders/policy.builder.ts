import { SecurityFacade } from '../facades/security.facade';

export class PolicyBuilder {
  private _resourceType: string = '*';
  private _action: string = '*';
  private _conditions: any[] = [];

  constructor(
    private readonly id: string,
    private readonly securityFacade: SecurityFacade
  ) {}

  resource(resourceType: string): this {
    this._resourceType = resourceType;
    return this;
  }

  action(action: string): this {
    this._action = action;
    return this;
  }

  requireUserAttribute(attribute: string, value: any): this {
    this._conditions.push({ "==": [{ "var": `user.attributes.${attribute}` }, value] });
    return this;
  }

  maxFieldValue(field: string, maxValue: number): this {
    this._conditions.push({ "<=": [{ "var": `request.${field}` }, maxValue] });
    return this;
  }
  
  requireOwnership(ownerField: string = 'ownerId'): this {
    this._conditions.push({ "==": [{ "var": `resource.${ownerField}` }, { "var": "user.userId" }] });
    return this;
  }

  customCondition(jsonLogicCondition: any): this {
    this._conditions.push(jsonLogicCondition);
    return this;
  }

  register(): void {
    let rule: any = true;
    
    if (this._conditions.length === 1) {
      rule = this._conditions[0];
    } else if (this._conditions.length > 1) {
      rule = { "and": this._conditions };
    }
    
    this.securityFacade.addAbacPolicy({
      id: this.id,
      resourceType: this._resourceType,
      action: this._action as any,
      rule: rule
    });
  }

  get(): any {
    return this.securityFacade.getAbacPolicy(this.id);
  }

  update(): void {
    const existing = this.get();
    if (!existing) throw new Error(`Policy '${this.id}' does not exist.`);

    let rule: any = true;
    if (this._conditions.length === 1) {
      rule = this._conditions[0];
    } else if (this._conditions.length > 1) {
      rule = { "and": this._conditions };
    } else {
      rule = existing.rule;
    }

    this.securityFacade.updateAbacPolicy(this.id, {
      resourceType: this._resourceType !== '*' ? this._resourceType : existing.resourceType,
      action: this._action !== '*' ? (this._action as any) : existing.action,
      rule: rule
    });
  }

  delete(): void {
    this.securityFacade.deleteAbacPolicy(this.id);
  }
}

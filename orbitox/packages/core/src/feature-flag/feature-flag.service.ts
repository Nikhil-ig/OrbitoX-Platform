import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlag, FlagCondition, FlagOverride } from './types';
import { ContextService } from '../context/context.service';

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly flags = new Map<string, FeatureFlag>();

  constructor(private readonly contextService: ContextService) {}

  registerFlag(flag: FeatureFlag): void {
    if (this.flags.has(flag.id)) {
      this.logger.warn(`Feature flag ${flag.id} is already registered. Overwriting.`);
    }
    this.flags.set(flag.id, flag);
    this.flags.set(flag.id, flag);
    this.logger.debug(`Registered feature flag: ${flag.id}`);
  }

  setOverride(flagId: string, contextId: string, effect: boolean): void {
    const flag = this.flags.get(flagId);
    if (!flag) return;

    // Remove existing exact override
    flag.overrides = (flag.overrides || []).filter(
      (o) => !(o.conditions && o.conditions.length === 1 && o.conditions[0]?.dimension === 'context_id' && o.conditions[0]?.value === contextId)
    );

    // Add new override
    flag.overrides.push({
      id: `override_${contextId}_${Date.now()}`,
      priority: 100,
      effect,
      conditions: [{ dimension: 'context_id', operator: 'eq', value: contextId }],
    });
  }

  async isEnabled(flagId: string, contextId: string): Promise<boolean> {
    const flag = this.flags.get(flagId);
    if (!flag) {
      this.logger.warn(`Unknown feature flag: ${flagId}`);
      return false;
    }

    const context = this.contextService.resolveContext(contextId);
    if (!context) {
      this.logger.warn(`Unknown context: ${contextId}`);
      return flag.defaultValue;
    }

    // Sort overrides by priority descending
    const sortedOverrides = [...flag.overrides].sort((a, b) => b.priority - a.priority);

    for (const override of sortedOverrides) {
      const match = this.evaluateConditions(override.conditions, contextId);
      if (match) {
        return override.effect;
      }
    }

    return flag.defaultValue;
  }

  private evaluateConditions(conditions: FlagCondition[], contextId: string): boolean {
    const context = this.contextService.resolveContext(contextId);
    if (!context) return false;

    // We must resolve hierarchy to get effective org/tenant IDs
    const hierarchy = this.contextService.getHierarchy(contextId);
    const org = hierarchy.find(c => c.type === 'organisation');
    const tenant = hierarchy.find(c => c.type === 'tenant');

    for (const condition of conditions) {
      let subjectValue: any;

      switch (condition.dimension) {
        case 'context_id':
          subjectValue = context.id;
          break;
        case 'organisation_id':
          subjectValue = org?.id;
          break;
        case 'tenant_id':
          subjectValue = tenant?.id;
          break;
        case 'plan_id':
          subjectValue = context.planId;
          break;
        case 'country':
          subjectValue = context.settings['country'];
          break;
        case 'environment':
          subjectValue = process.env.NODE_ENV || 'development';
          break;
        case 'percentage':
          // Hash the context ID to get a deterministic percentage
          const hash = this.hashString(context.id);
          subjectValue = hash % 100;
          break;
        case 'date_before':
        case 'date_after':
          subjectValue = new Date().toISOString();
          break;
        default:
          subjectValue = null;
      }

      if (!this.evaluateOperator(condition, subjectValue)) {
        return false; // If one condition fails, the whole override fails (AND logic)
      }
    }

    return true; // All conditions passed
  }

  private evaluateOperator(condition: FlagCondition, subjectValue: any): boolean {
    if (subjectValue === undefined || subjectValue === null) return false;

    switch (condition.operator) {
      case 'eq':
        return subjectValue === condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(subjectValue);
      case 'lte':
        if (condition.dimension === 'date_before') {
          return new Date(subjectValue) <= new Date(condition.value as string);
        }
        return Number(subjectValue) <= Number(condition.value);
      case 'gte':
        if (condition.dimension === 'date_after') {
          return new Date(subjectValue) >= new Date(condition.value as string);
        }
        return Number(subjectValue) >= Number(condition.value);
      case 'contains':
        return typeof subjectValue === 'string' && subjectValue.includes(String(condition.value));
      default:
        return false;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

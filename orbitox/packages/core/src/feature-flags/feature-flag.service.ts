import { Injectable, Logger } from '@nestjs/common';

export interface FeatureFlagRule {
  key: string;
  enabled: boolean;
  percentage?: number;
  allowedContextIds?: string[];
  allowedUserIds?: string[];
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly flags = new Map<string, FeatureFlagRule>();

  setFlag(rule: FeatureFlagRule): void {
    this.flags.set(rule.key, rule);
    this.logger.log(`Set feature flag '${rule.key}' to enabled=${rule.enabled}`);
  }

  isEnabled(key: string, contextId: string, userId?: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check context whitelist if defined
    if (flag.allowedContextIds && flag.allowedContextIds.length > 0) {
      if (!flag.allowedContextIds.includes(contextId)) return false;
    }

    // Check user whitelist if defined
    if (userId && flag.allowedUserIds && flag.allowedUserIds.length > 0) {
      if (!flag.allowedUserIds.includes(userId)) return false;
    }

    return true;
  }
}

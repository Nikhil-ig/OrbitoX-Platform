import {
  SectionLogicConfig,
  SectionLogicRule,
  LogicEvaluationContext,
  LogicConditionType,
  RuleValidationResult,
  LogicValidationResult,
  RuleEvaluationExplanation,
  LogicEvaluationExplanation,
} from '../../types/logic.types';
import { PageSection } from '../../types/component.types';

export interface LogicConditionPreset {
  id: string;
  name: string;
  category: 'audience' | 'cart' | 'timing' | 'device' | 'campaign' | 'custom';
  description: string;
  icon: string;
  createConfig: () => SectionLogicConfig;
}

export class SectionLogicEngine {
  /**
   * Evaluate whether a section should be rendered based on its logic configuration and runtime context.
   */
  evaluateSectionVisibility(
    logic: SectionLogicConfig | undefined,
    context: LogicEvaluationContext = {}
  ): boolean {
    if (!logic || !logic.enabled || !logic.rules || logic.rules.length === 0) {
      return true;
    }

    const activeRules = logic.rules.filter((r) => r.enabled);
    if (activeRules.length === 0) {
      return true;
    }

    if (logic.matchType === 'any') {
      return activeRules.some((rule) => this.evaluateRule(rule, context).passed);
    } else {
      // Default: 'all' (AND condition)
      return activeRules.every((rule) => this.evaluateRule(rule, context).passed);
    }
  }

  /**
   * Filter an entire list of page sections to only those that pass visibility evaluation.
   */
  filterVisibleSections(
    sections: PageSection[],
    context: LogicEvaluationContext = {}
  ): PageSection[] {
    return sections.filter((sec) => {
      if (!sec.enabled) return false;
      return this.evaluateSectionVisibility(sec.logic, context);
    });
  }

  /**
   * Validate a single logic rule for configuration errors or invalid syntax.
   */
  validateRule(rule: SectionLogicRule): RuleValidationResult {
    if (!rule.type) {
      return { isValid: false, error: 'Rule condition type is required.' };
    }

    switch (rule.type) {
      case 'custom_expression': {
        const expr = (rule.customExpression || rule.value || '').toString().trim();
        if (!expr) {
          return { isValid: false, error: 'Custom expression code cannot be empty.' };
        }
        try {
          // Test compile the function syntax
          new Function('context', `
            const {
              cartSubtotal = 0,
              cartItemCount = 0,
              customerSegment = 'all',
              isLoggedIn = false,
              customerTotalSpent = 0,
              deviceType = 'desktop',
              currency = 'USD',
              countryCode = 'US',
              utmCampaign = '',
              now = new Date(),
            } = context || {};
            return Boolean(${expr});
          `);
          return { isValid: true };
        } catch (err: any) {
          return {
            isValid: false,
            error: `Syntax error in expression: ${err.message}`,
          };
        }
      }

      case 'cart_subtotal': {
        const val = Number(rule.value);
        if (isNaN(val) || val < 0) {
          return { isValid: false, error: 'Subtotal threshold must be a valid positive number.' };
        }
        if (rule.operator === 'between') {
          const sec = Number(rule.valueSecondary);
          if (isNaN(sec) || sec < val) {
            return { isValid: false, error: 'Maximum subtotal must be greater than or equal to minimum.' };
          }
        }
        return { isValid: true };
      }

      case 'cart_item_count': {
        if (rule.value !== 'empty' && rule.value !== 'not_empty') {
          const val = Number(rule.value);
          if (isNaN(val) || val < 0) {
            return { isValid: false, error: 'Item count must be a non-negative number.' };
          }
        }
        return { isValid: true };
      }

      case 'schedule_time': {
        if (!rule.value) {
          return { isValid: false, error: 'Start date/time is required.' };
        }
        const start = new Date(rule.value).getTime();
        if (isNaN(start)) {
          return { isValid: false, error: 'Invalid start date format.' };
        }
        if (rule.valueSecondary) {
          const end = new Date(rule.valueSecondary).getTime();
          if (isNaN(end)) {
            return { isValid: false, error: 'Invalid end date format.' };
          }
          if (end <= start) {
            return { isValid: false, error: 'End time must be later than start time.' };
          }
        }
        return { isValid: true };
      }

      case 'ab_split': {
        const val = Number(rule.value);
        if (isNaN(val) || val < 0 || val > 100) {
          return { isValid: false, error: 'A/B traffic percentage must be between 0% and 100%.' };
        }
        return { isValid: true };
      }

      case 'currency': {
        const curr = String(rule.value || '').trim();
        if (!curr) {
          return { isValid: false, error: 'Currency code cannot be empty (e.g. USD).' };
        }
        return { isValid: true };
      }

      default:
        return { isValid: true };
    }
  }

  /**
   * Validate entire section logic configuration.
   */
  validateLogicConfig(config?: SectionLogicConfig): LogicValidationResult {
    if (!config || !config.enabled) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: Array<{ ruleId?: string; message: string }> = [];
    const warnings: string[] = [];

    if (!config.rules || config.rules.length === 0) {
      warnings.push('Logic is enabled but contains no rules. Section will be visible to all users.');
    } else {
      config.rules.forEach((rule) => {
        const res = this.validateRule(rule);
        if (!res.isValid && res.error) {
          errors.push({ ruleId: rule.id, message: res.error });
        }
        if (res.warning) {
          warnings.push(res.warning);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Evaluate a single logic rule and return detailed diagnostic reason.
   */
  evaluateRule(
    rule: SectionLogicRule,
    ctx: LogicEvaluationContext
  ): { passed: boolean; reason: string; evaluatedValue?: any; requiredValue?: any; error?: string } {
    try {
      switch (rule.type) {
        case 'always':
          return { passed: true, reason: 'Always visible condition is active.' };

        case 'custom_expression': {
          const expr = (rule.customExpression || rule.value || '').toString().trim();
          if (!expr) {
            return { passed: true, reason: 'Empty custom expression defaulted to true.' };
          }

          try {
            const evalFn = new Function('context', `
              const {
                cartSubtotal = 0,
                cartItemCount = 0,
                customerSegment = 'all',
                isLoggedIn = false,
                customerTotalSpent = 0,
                deviceType = 'desktop',
                currency = 'USD',
                countryCode = 'US',
                utmCampaign = '',
                now = new Date(),
                customParams = {}
              } = context || {};
              return Boolean(${expr});
            `);

            const result = Boolean(evalFn(ctx));
            return {
              passed: result,
              reason: result
                ? `Custom formula "${expr}" evaluated to TRUE.`
                : `Custom formula "${expr}" evaluated to FALSE.`,
              evaluatedValue: result,
              requiredValue: true,
            };
          } catch (execErr: any) {
            return {
              passed: false,
              reason: `Error executing custom formula: ${execErr.message}`,
              error: execErr.message,
            };
          }
        }

        case 'customer_segment': {
          const seg = ctx.customerSegment || 'all';
          const req = rule.value;

          if (req === 'all') return { passed: true, reason: 'Audience set to all visitors.', evaluatedValue: seg, requiredValue: req };
          if (req === 'logged_in') {
            const isLog = !!ctx.isLoggedIn;
            return {
              passed: isLog,
              reason: isLog ? 'User is logged in.' : 'User is not logged in.',
              evaluatedValue: isLog,
              requiredValue: true,
            };
          }
          if (req === 'guest') {
            const isGuest = !ctx.isLoggedIn;
            return {
              passed: isGuest,
              reason: isGuest ? 'User is a guest.' : 'User is logged in (not guest).',
              evaluatedValue: isGuest,
              requiredValue: true,
            };
          }
          if (req === 'vip') {
            const isVip = seg === 'vip' || (ctx.customerTotalSpent !== undefined && ctx.customerTotalSpent >= 500);
            return {
              passed: isVip,
              reason: isVip
                ? `Customer is VIP (Total spent $${ctx.customerTotalSpent || 0} ≥ $500).`
                : `Customer is not VIP (Total spent $${ctx.customerTotalSpent || 0} < $500).`,
              evaluatedValue: seg,
              requiredValue: 'vip',
            };
          }
          if (req === 'first_time') {
            const isFirst = seg === 'first_time';
            return {
              passed: isFirst,
              reason: isFirst ? 'Customer is a first-time visitor.' : 'Customer is not a first-time visitor.',
              evaluatedValue: seg,
              requiredValue: 'first_time',
            };
          }
          if (req === 'returning') {
            const isRet = seg === 'returning' || seg === 'vip';
            return {
              passed: isRet,
              reason: isRet ? 'Customer is a returning patron.' : 'Customer is not a returning patron.',
              evaluatedValue: seg,
              requiredValue: 'returning',
            };
          }

          const matched = seg === req;
          return {
            passed: matched,
            reason: matched ? `Audience segment matches "${req}".` : `Audience segment "${seg}" does not match "${req}".`,
            evaluatedValue: seg,
            requiredValue: req,
          };
        }

        case 'cart_subtotal': {
          const subtotal = ctx.cartSubtotal !== undefined ? ctx.cartSubtotal : 0;
          const targetVal = Number(rule.value) || 0;

          switch (rule.operator) {
            case 'greater_than_or_equal': {
              const pass = subtotal >= targetVal;
              return {
                passed: pass,
                reason: pass
                  ? `Cart subtotal ($${subtotal.toFixed(2)}) is ≥ required $${targetVal.toFixed(2)}.`
                  : `Cart subtotal ($${subtotal.toFixed(2)}) is below required $${targetVal.toFixed(2)}.`,
                evaluatedValue: subtotal,
                requiredValue: targetVal,
              };
            }
            case 'less_than_or_equal': {
              const pass = subtotal <= targetVal;
              return {
                passed: pass,
                reason: pass
                  ? `Cart subtotal ($${subtotal.toFixed(2)}) is ≤ required $${targetVal.toFixed(2)}.`
                  : `Cart subtotal ($${subtotal.toFixed(2)}) is above max $${targetVal.toFixed(2)}.`,
                evaluatedValue: subtotal,
                requiredValue: targetVal,
              };
            }
            case 'between': {
              const secondaryVal = Number(rule.valueSecondary) || Infinity;
              const pass = subtotal >= targetVal && subtotal <= secondaryVal;
              return {
                passed: pass,
                reason: pass
                  ? `Cart subtotal ($${subtotal.toFixed(2)}) is between $${targetVal} and $${secondaryVal}.`
                  : `Cart subtotal ($${subtotal.toFixed(2)}) is not in range [$${targetVal}, $${secondaryVal}].`,
                evaluatedValue: subtotal,
                requiredValue: `[$${targetVal} - $${secondaryVal}]`,
              };
            }
            case 'equals': {
              const pass = subtotal === targetVal;
              return {
                passed: pass,
                reason: pass
                  ? `Cart subtotal equals $${targetVal.toFixed(2)}.`
                  : `Cart subtotal ($${subtotal.toFixed(2)}) does not equal $${targetVal.toFixed(2)}.`,
                evaluatedValue: subtotal,
                requiredValue: targetVal,
              };
            }
            default: {
              const pass = subtotal >= targetVal;
              return {
                passed: pass,
                reason: pass ? `Subtotal $${subtotal} satisfies requirement.` : `Subtotal $${subtotal} < $${targetVal}.`,
                evaluatedValue: subtotal,
                requiredValue: targetVal,
              };
            }
          }
        }

        case 'cart_item_count': {
          const count = ctx.cartItemCount !== undefined ? ctx.cartItemCount : 0;
          const targetVal = Number(rule.value) || 0;

          if (rule.value === 'empty') {
            const pass = count === 0;
            return {
              passed: pass,
              reason: pass ? 'Cart is empty (0 items).' : `Cart has ${count} item(s) (expected empty).`,
              evaluatedValue: count,
              requiredValue: 0,
            };
          }
          if (rule.value === 'not_empty') {
            const pass = count > 0;
            return {
              passed: pass,
              reason: pass ? `Cart has ${count} item(s).` : 'Cart is currently empty.',
              evaluatedValue: count,
              requiredValue: '> 0',
            };
          }

          const pass = rule.operator === 'less_than_or_equal' ? count <= targetVal : count >= targetVal;
          return {
            passed: pass,
            reason: pass
              ? `Cart items count (${count}) satisfies condition (${rule.operator === 'less_than_or_equal' ? '≤' : '≥'} ${targetVal}).`
              : `Cart items count (${count}) does not satisfy condition (${rule.operator === 'less_than_or_equal' ? '≤' : '≥'} ${targetVal}).`,
            evaluatedValue: count,
            requiredValue: targetVal,
          };
        }

        case 'device_type': {
          const dev = ctx.deviceType || 'desktop';
          const req = rule.value;
          if (req === 'all') return { passed: true, reason: 'Device set to all devices.', evaluatedValue: dev, requiredValue: req };

          const pass = dev === req;
          return {
            passed: pass,
            reason: pass
              ? `Current device (${dev}) matches target (${req}).`
              : `Current device (${dev}) does not match required (${req}).`,
            evaluatedValue: dev,
            requiredValue: req,
          };
        }

        case 'schedule_time': {
          const now = ctx.currentTimestamp ? new Date(ctx.currentTimestamp).getTime() : Date.now();
          const start = rule.value ? new Date(rule.value).getTime() : 0;
          const end = rule.valueSecondary ? new Date(rule.valueSecondary).getTime() : Infinity;

          const pass = now >= start && now <= end;
          return {
            passed: pass,
            reason: pass
              ? 'Current time falls within the scheduled campaign window.'
              : now < start
              ? `Campaign has not started yet (Starts: ${new Date(start).toLocaleString()}).`
              : `Campaign has expired (Ended: ${new Date(end).toLocaleString()}).`,
            evaluatedValue: new Date(now).toLocaleString(),
            requiredValue: `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`,
          };
        }

        case 'currency': {
          const curr = (ctx.currency || 'USD').toUpperCase();
          const target = String(rule.value || 'USD').toUpperCase();
          if (target === 'ALL') return { passed: true, reason: 'Currency matches all.', evaluatedValue: curr, requiredValue: target };

          const pass = curr === target;
          return {
            passed: pass,
            reason: pass
              ? `Current currency (${curr}) matches target (${target}).`
              : `Current currency (${curr}) does not match target (${target}).`,
            evaluatedValue: curr,
            requiredValue: target,
          };
        }

        case 'utm_campaign': {
          const utm = (ctx.utmCampaign || '').toLowerCase();
          const target = String(rule.value || '').toLowerCase();
          if (!target) return { passed: true, reason: 'Empty UTM target matches all.', evaluatedValue: utm, requiredValue: target };

          const pass = rule.operator === 'contains' ? utm.includes(target) : utm === target;
          return {
            passed: pass,
            reason: pass
              ? `UTM Campaign "${utm}" matches filter "${target}".`
              : `UTM Campaign "${utm}" does not match target "${target}".`,
            evaluatedValue: utm,
            requiredValue: target,
          };
        }

        case 'country_region': {
          const country = (ctx.countryCode || 'US').toUpperCase();
          const target = String(rule.value || 'US').toUpperCase();
          if (target === 'ALL') return { passed: true, reason: 'Country matches all.', evaluatedValue: country, requiredValue: target };

          const pass = country === target;
          return {
            passed: pass,
            reason: pass
              ? `User region (${country}) matches target (${target}).`
              : `User region (${country}) does not match target (${target}).`,
            evaluatedValue: country,
            requiredValue: target,
          };
        }

        case 'ab_split': {
          const seed = ctx.randomSeed !== undefined ? ctx.randomSeed : 50;
          const weight = Number(rule.value) || 50;
          const pass = seed <= weight;
          return {
            passed: pass,
            reason: pass
              ? `A/B traffic seed (${seed.toFixed(1)}) falls within ${weight}% allocation.`
              : `A/B traffic seed (${seed.toFixed(1)}) fell outside ${weight}% allocation.`,
            evaluatedValue: seed,
            requiredValue: `≤ ${weight}%`,
          };
        }

        default:
          return { passed: true, reason: 'Unknown rule condition passed by default.' };
      }
    } catch (err: any) {
      return {
        passed: false,
        reason: `Evaluation exception: ${err.message}`,
        error: err.message,
      };
    }
  }

  /**
   * Run simulation test and generate detailed step-by-step diagnostic breakdown.
   */
  testEvaluateWithExplanation(
    logic: SectionLogicConfig | undefined,
    context: LogicEvaluationContext = {}
  ): LogicEvaluationExplanation {
    if (!logic || !logic.enabled || !logic.rules || logic.rules.length === 0) {
      return {
        isVisible: true,
        matchType: logic?.matchType || 'all',
        ruleExplanations: [],
        summary: 'Visible to everyone (no active logic constraints).',
        hasErrors: false,
      };
    }

    const activeRules = logic.rules.filter((r) => r.enabled);
    if (activeRules.length === 0) {
      return {
        isVisible: true,
        matchType: logic.matchType,
        ruleExplanations: [],
        summary: 'Visible to everyone (all rules disabled).',
        hasErrors: false,
      };
    }

    let hasErrors = false;
    const ruleExplanations: RuleEvaluationExplanation[] = activeRules.map((rule) => {
      const evalRes = this.evaluateRule(rule, context);
      if (evalRes.error) hasErrors = true;

      return {
        ruleId: rule.id,
        type: rule.type,
        passed: evalRes.passed,
        reason: evalRes.reason,
        evaluatedValue: evalRes.evaluatedValue,
        requiredValue: evalRes.requiredValue,
        error: evalRes.error,
      };
    });

    const isVisible =
      logic.matchType === 'any'
        ? ruleExplanations.some((r) => r.passed)
        : ruleExplanations.every((r) => r.passed);

    const summary = isVisible
      ? `✅ Section is VISIBLE (${ruleExplanations.filter((r) => r.passed).length} of ${ruleExplanations.length} rules satisfied)`
      : `❌ Section is HIDDEN (${ruleExplanations.filter((r) => !r.passed).length} of ${ruleExplanations.length} rules failed)`;

    return {
      isVisible,
      matchType: logic.matchType,
      ruleExplanations,
      summary,
      hasErrors,
    };
  }

  /**
   * Human-readable summary of the active logic rules for a section.
   */
  getLogicSummary(logic?: SectionLogicConfig): string {
    if (!logic || !logic.enabled || !logic.rules || logic.rules.length === 0) {
      return 'Visible to everyone';
    }

    const activeRules = logic.rules.filter((r) => r.enabled);
    if (activeRules.length === 0) return 'Visible to everyone';

    const descriptions = activeRules.map((rule) => {
      switch (rule.type) {
        case 'custom_expression':
          return `Formula: \`${rule.customExpression || rule.value}\``;
        case 'customer_segment':
          return `Audience: ${rule.value === 'vip' ? '👑 VIP Patrons' : rule.value === 'logged_in' ? '👤 Members Only' : rule.value === 'first_time' ? '✨ First-Time Visitors' : rule.value}`;
        case 'cart_subtotal':
          if (rule.operator === 'between') {
            return `Cart Subtotal: $${rule.value} - $${rule.valueSecondary}`;
          }
          return `Cart Subtotal ${rule.operator === 'greater_than_or_equal' ? '≥' : '≤'} $${rule.value}`;
        case 'cart_item_count':
          return `Cart Items: ${rule.value === 'empty' ? 'Empty (0 items)' : rule.value === 'not_empty' ? 'Cart has items' : `≥ ${rule.value}`}`;
        case 'device_type':
          return `Device: ${rule.value === 'mobile' ? '📲 Mobile Only' : rule.value === 'desktop' ? '🖥️ Desktop Only' : rule.value}`;
        case 'schedule_time':
          return `Scheduled: ${new Date(rule.value).toLocaleDateString()} - ${new Date(rule.valueSecondary).toLocaleDateString()}`;
        case 'currency':
          return `Currency: ${rule.value}`;
        case 'utm_campaign':
          return `UTM Campaign: "${rule.value}"`;
        case 'ab_split':
          return `A/B Split: ${rule.value}% Traffic`;
        default:
          return 'Custom Rule';
      }
    });

    const connector = logic.matchType === 'any' ? ' OR ' : ' AND ';
    return descriptions.join(connector);
  }

  /**
   * Create an initial blank logic configuration.
   */
  createDefaultLogicConfig(): SectionLogicConfig {
    return {
      enabled: false,
      matchType: 'all',
      rules: [],
      fallbackAction: 'hide',
      abTest: {
        enabled: false,
        variantName: 'Variant A',
        trafficWeight: 50,
      },
    };
  }

  /**
   * Library of pre-built, 1-click industry logic templates.
   */
  getAvailablePresets(): LogicConditionPreset[] {
    return [
      {
        id: 'free_shipping_unlock',
        name: '🛒 Free Shipping Cart Unlock Milestone',
        category: 'cart',
        description: 'Show banner only when customer has between $100 and $250 in cart to boost AOV.',
        icon: '🚚',
        createConfig: () => ({
          enabled: true,
          matchType: 'all',
          rules: [
            {
              id: `rule_${Date.now()}_1`,
              type: 'cart_subtotal',
              operator: 'between',
              value: 100,
              valueSecondary: 250,
              enabled: true,
              label: 'Cart between $100 - $250',
            },
          ],
        }),
      },
      {
        id: 'vip_patron_exclusive',
        name: '👑 VIP & High-Spender Exclusive Runway Drops',
        category: 'audience',
        description: 'Show private lookbook/collection only to VIP patrons who spent > $500.',
        icon: '💎',
        createConfig: () => ({
          enabled: true,
          matchType: 'all',
          rules: [
            {
              id: `rule_${Date.now()}_2`,
              type: 'customer_segment',
              operator: 'equals',
              value: 'vip',
              enabled: true,
              label: 'VIP Patrons (Spent > $500)',
            },
          ],
        }),
      },
      {
        id: 'custom_high_cart_vip',
        name: '⚡ Power Formula: High Cart & Mobile or VIP',
        category: 'custom',
        description: 'Advanced custom JavaScript expression combining cart total, device type, and VIP status.',
        icon: '💻',
        createConfig: () => ({
          enabled: true,
          matchType: 'all',
          rules: [
            {
              id: `rule_${Date.now()}_formula`,
              type: 'custom_expression',
              operator: 'equals',
              value: 'cartSubtotal > 200 || (deviceType === "mobile" && customerSegment === "vip")',
              customExpression: 'cartSubtotal > 200 || (deviceType === "mobile" && customerSegment === "vip")',
              enabled: true,
              label: 'Power Formula (High Cart / VIP)',
            },
          ],
        }),
      },
      {
        id: 'mobile_flash_sale',
        name: '📲 Mobile App & Smartphone Exclusive Banner',
        category: 'device',
        description: 'Show special instant checkout promotion only to smartphone visitors.',
        icon: '📱',
        createConfig: () => ({
          enabled: true,
          matchType: 'all',
          rules: [
            {
              id: `rule_${Date.now()}_3`,
              type: 'device_type',
              operator: 'equals',
              value: 'mobile',
              enabled: true,
              label: 'Mobile Viewport Only',
            },
          ],
        }),
      },
      {
        id: 'scheduled_drop',
        name: '⏰ Scheduled Midnight Drop / Flash Sale',
        category: 'timing',
        description: 'Automatically reveal section on release date and hide after campaign expires.',
        icon: '⏳',
        createConfig: () => {
          const now = new Date();
          const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
          return {
            enabled: true,
            matchType: 'all',
            rules: [
              {
                id: `rule_${Date.now()}_4`,
                type: 'schedule_time',
                operator: 'between',
                value: now.toISOString().slice(0, 16),
                valueSecondary: nextWeek.toISOString().slice(0, 16),
                enabled: true,
                label: 'Active within schedule',
              },
            ],
          };
        },
      },
      {
        id: 'first_time_welcome',
        name: '✨ First-Time Visitor Welcome Incentive',
        category: 'audience',
        description: 'Show 15% off first order discount banner only to brand new visitors.',
        icon: '🎁',
        createConfig: () => ({
          enabled: true,
          matchType: 'all',
          rules: [
            {
              id: `rule_${Date.now()}_5`,
              type: 'customer_segment',
              operator: 'equals',
              value: 'first_time',
              enabled: true,
              label: 'First-Time Visitors Only',
            },
          ],
        }),
      },
    ];
  }
}

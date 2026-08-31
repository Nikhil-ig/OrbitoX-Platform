export type LogicConditionType =
  | 'always'
  | 'customer_segment'
  | 'cart_subtotal'
  | 'cart_item_count'
  | 'device_type'
  | 'schedule_time'
  | 'currency'
  | 'utm_campaign'
  | 'country_region'
  | 'ab_split'
  | 'custom_expression';

export type LogicOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'contains'
  | 'starts_with'
  | 'matches_regex';

export interface SectionLogicRule {
  id: string;
  type: LogicConditionType;
  operator: LogicOperator;
  value: any;
  valueSecondary?: any; // For 'between'
  enabled: boolean;
  label?: string;
  customExpression?: string; // JavaScript / Formula expression for 'custom_expression'
}

export interface SectionLogicConfig {
  enabled: boolean;
  matchType: 'all' | 'any'; // AND vs OR
  rules: SectionLogicRule[];
  fallbackAction?: 'hide' | 'show_alternative' | 'blur';
  abTest?: {
    enabled: boolean;
    variantName?: string;
    trafficWeight?: number; // 0 - 100%
  };
}

export interface LogicEvaluationContext {
  customerSegment?: 'all' | 'guest' | 'first_time' | 'returning' | 'vip';
  customerTotalSpent?: number;
  isLoggedIn?: boolean;
  cartSubtotal?: number;
  cartItemCount?: number;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  currentTimestamp?: string;
  currency?: string;
  countryCode?: string;
  utmCampaign?: string;
  randomSeed?: number;
  customParams?: Record<string, any>;
}

export interface RuleValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface LogicValidationResult {
  isValid: boolean;
  errors: Array<{ ruleId?: string; message: string }>;
  warnings: string[];
}

export interface RuleEvaluationExplanation {
  ruleId: string;
  type: LogicConditionType;
  passed: boolean;
  reason: string;
  evaluatedValue?: any;
  requiredValue?: any;
  error?: string;
}

export interface LogicEvaluationExplanation {
  isVisible: boolean;
  matchType: 'all' | 'any';
  ruleExplanations: RuleEvaluationExplanation[];
  summary: string;
  hasErrors: boolean;
}

export interface WorkflowDefinition {
  id: string;
  contextId: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  version: number;

  trigger: WorkflowTrigger;
  steps: WorkflowStep[];

  settings: {
    maxRuns?: number;
    runOnce?: boolean;
    timeout?: number;
  };
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual' | 'webhook';
  eventName?: string;
  conditions?: WorkflowCondition[];
  cron?: string;
  entityQuery?: any;
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in' | 'notIn';
  value: any;
}

export type WorkflowStep =
  | ActionStep
  | DelayStep
  | BranchStep
  | LoopStep
  | SubWorkflowStep;

export interface ActionStep {
  type: 'action';
  id: string;
  actionType: string;
  config: Record<string, any>;
  onError: 'continue' | 'stop' | 'retry';
  retryCount?: number;
}

export interface DelayStep {
  type: 'delay';
  id: string;
  duration: {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks';
  };
  waitUntil?: {
    field: string;
  };
}

export interface BranchStep {
  type: 'branch';
  id: string;
  branches: Array<{
    id: string;
    label: string;
    conditions: WorkflowCondition[];
    steps: WorkflowStep[];
  }>;
  defaultBranch?: WorkflowStep[];
}

export interface LoopStep {
  type: 'loop';
  id: string;
  list: string; // variable containing array
  itemVariable: string;
  steps: WorkflowStep[];
}

export interface SubWorkflowStep {
  type: 'sub_workflow';
  id: string;
  workflowId: string;
  waitForCompletion: boolean;
}

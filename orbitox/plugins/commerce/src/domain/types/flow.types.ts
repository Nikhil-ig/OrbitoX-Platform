import { LogicEvaluationContext } from './logic.types';

export type FlowNodeType =
  // 🟢 Triggers (Entry points)
  | 'trigger:page-load'
  | 'trigger:scroll-depth'
  | 'trigger:cart-change'
  | 'trigger:exit-intent'
  | 'trigger:time-delay'
  | 'trigger:button-click'
  // 🔵 Conditions (Branching)
  | 'condition:if-else'
  | 'condition:customer-segment'
  | 'condition:cart-value'
  | 'condition:cart-items'
  | 'condition:device-type'
  | 'condition:time-of-day'
  | 'condition:geo-country'
  | 'condition:utm-campaign'
  | 'condition:ab-split'
  | 'condition:custom-expression'
  // 🟣 Actions (Outcomes)
  | 'action:show-section'
  | 'action:hide-section'
  | 'action:swap-content'
  | 'action:apply-discount'
  | 'action:show-toast'
  | 'action:trigger-confetti'
  | 'action:redirect'
  | 'action:add-to-cart'
  | 'action:open-drawer'
  // 🟠 Transforms (Data & Calculations)
  | 'transform:math'
  | 'transform:text-format'
  | 'transform:merge';

export interface FlowPort {
  id: string;
  label: string;
  dataType: 'flow' | 'boolean' | 'number' | 'string' | 'any';
  type: 'input' | 'output';
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  icon: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: FlowPort[];
  outputs: FlowPort[];
}

export interface FlowConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface FlowGraph {
  id: string;
  name: string;
  sectionId?: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  viewport: { x: number; y: number; zoom: number };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlowExecutionStep {
  nodeId: string;
  nodeType: FlowNodeType;
  status: 'passed' | 'failed' | 'executed' | 'skipped';
  message: string;
  outputData?: any;
  timestamp: string;
}

export interface FlowExecutionResult {
  isVisible: boolean;
  executedActions: Array<{
    type: string;
    payload: Record<string, any>;
  }>;
  executionPath: string[]; // Node IDs in sequence
  steps: FlowExecutionStep[];
  hasErrors: boolean;
}

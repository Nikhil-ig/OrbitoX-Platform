import {
  FlowGraph,
  FlowNode,
  FlowConnection,
  FlowExecutionResult,
  FlowExecutionStep,
  FlowNodeType,
} from '../../types/flow.types';
import {
  SectionLogicConfig,
  LogicEvaluationContext,
} from '../../types/logic.types';

export class FlowEngine {
  /**
   * Execute an n8n-style visual node-graph logic flow against a runtime context
   */
  executeFlow(
    graph: FlowGraph | undefined,
    context: LogicEvaluationContext = {}
  ): FlowExecutionResult {
    if (!graph || !graph.enabled || !graph.nodes || graph.nodes.length === 0) {
      return {
        isVisible: true,
        executedActions: [],
        executionPath: [],
        steps: [
          {
            nodeId: 'none',
            nodeType: 'trigger:page-load',
            status: 'passed',
            message: 'Flow is inactive; defaulting to visible.',
            timestamp: new Date().toISOString(),
          },
        ],
        hasErrors: false,
      };
    }

    const steps: FlowExecutionStep[] = [];
    const executionPath: string[] = [];
    const executedActions: Array<{ type: string; payload: Record<string, any> }> = [];
    let isVisible = true;

    // Find trigger nodes (entry points)
    const triggerNodes = graph.nodes.filter((n) => n.type.startsWith('trigger:'));
    const startNodes = triggerNodes.length > 0 ? triggerNodes : [graph.nodes[0]!];

    // Traverse the graph starting from trigger nodes
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; incomingData: any }> = startNodes.map((n) => ({
      nodeId: n.id,
      incomingData: { ...context },
    }));

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      const node = graph.nodes.find((n) => n.id === current.nodeId);
      if (!node) continue;

      executionPath.push(node.id);

      // Evaluate the node
      const evaluation = this.evaluateNode(node, current.incomingData);
      steps.push({
        nodeId: node.id,
        nodeType: node.type,
        status: evaluation.passed ? 'passed' : 'failed',
        message: evaluation.message,
        outputData: evaluation.outputData,
        timestamp: new Date().toISOString(),
      });

      if (node.type.startsWith('action:')) {
        executedActions.push({
          type: node.type,
          payload: { ...node.config, ...evaluation.outputData },
        });

        if (node.type === 'action:hide-section') {
          isVisible = false;
        } else if (node.type === 'action:show-section') {
          isVisible = true;
        }
      }

      // Find outbound connections
      const outboundConns = graph.connections.filter((c) => c.fromNodeId === node.id);

      for (const conn of outboundConns) {
        // If condition node, only branch along the port that matches evaluation
        if (node.type.startsWith('condition:')) {
          if (evaluation.passed && conn.fromPortId === 'out_true') {
            queue.push({ nodeId: conn.toNodeId, incomingData: evaluation.outputData });
          } else if (!evaluation.passed && conn.fromPortId === 'out_false') {
            queue.push({ nodeId: conn.toNodeId, incomingData: evaluation.outputData });
          } else if (!conn.fromPortId || conn.fromPortId === 'out_default') {
            queue.push({ nodeId: conn.toNodeId, incomingData: evaluation.outputData });
          }
        } else {
          // Triggers / Actions / Transforms forward down all connected ports
          queue.push({ nodeId: conn.toNodeId, incomingData: evaluation.outputData });
        }
      }
    }

    return {
      isVisible,
      executedActions,
      executionPath,
      steps,
      hasErrors: steps.some((s) => s.status === 'failed' && s.nodeType.startsWith('transform:')),
    };
  }

  private evaluateNode(
    node: FlowNode,
    context: LogicEvaluationContext
  ): { passed: boolean; message: string; outputData: any } {
    const config = node.config || {};

    switch (node.type) {
      // ─── TRIGGERS ─────────────────────────
      case 'trigger:page-load':
        return { passed: true, message: 'Page loaded successfully', outputData: context };

      case 'trigger:scroll-depth': {
        const targetDepth = Number(config.depth || 50);
        return { passed: true, message: `Scroll depth reached ${targetDepth}%`, outputData: context };
      }

      case 'trigger:cart-change':
        return {
          passed: (context.cartItemCount || 0) > 0,
          message: `Cart holds ${context.cartItemCount || 0} items ($${context.cartSubtotal || 0})`,
          outputData: context,
        };

      case 'trigger:exit-intent':
      case 'trigger:button-click':
      case 'trigger:time-delay':
        return { passed: true, message: `${node.label} triggered`, outputData: context };

      // ─── CONDITIONS ───────────────────────
      case 'condition:customer-segment': {
        const target = config.segment || 'vip';
        const current = context.customerSegment || 'all';
        const passed = target === 'all' || current === target;
        return {
          passed,
          message: passed
            ? `Customer matched segment: ${current}`
            : `Customer segment '${current}' does not match required '${target}'`,
          outputData: context,
        };
      }

      case 'condition:cart-value': {
        const threshold = Number(config.threshold || 100);
        const op = config.operator || 'greater_than_or_equal';
        const val = context.cartSubtotal || 0;
        let passed = false;

        if (op === 'greater_than_or_equal') passed = val >= threshold;
        else if (op === 'less_than_or_equal') passed = val <= threshold;
        else if (op === 'equals') passed = val === threshold;

        return {
          passed,
          message: passed
            ? `Cart subtotal $${val} satisfies ${op} $${threshold}`
            : `Cart subtotal $${val} failed ${op} $${threshold}`,
          outputData: context,
        };
      }

      case 'condition:device-type': {
        const reqDevice = config.device || 'mobile';
        const curDevice = context.deviceType || 'desktop';
        const passed = reqDevice === 'all' || curDevice === reqDevice;
        return {
          passed,
          message: passed ? `Device matched: ${curDevice}` : `Device '${curDevice}' did not match '${reqDevice}'`,
          outputData: context,
        };
      }

      case 'condition:time-of-day': {
        const now = new Date();
        const hour = now.getHours();
        const start = Number(config.startHour || 20); // 8 PM
        const end = Number(config.endHour || 4); // 4 AM
        const isNight = start > end ? hour >= start || hour < end : hour >= start && hour < end;
        return {
          passed: isNight,
          message: isNight ? `Current hour (${hour}:00) matches timeframe` : `Current hour (${hour}:00) is outside window`,
          outputData: context,
        };
      }

      case 'condition:geo-country': {
        const country = context.countryCode || 'US';
        const target = config.country || 'IN';
        const passed = country === target;
        return {
          passed,
          message: passed ? `Visitor located in ${country}` : `Visitor in ${country}, required ${target}`,
          outputData: context,
        };
      }

      case 'condition:ab-split': {
        const weight = Number(config.trafficWeight || 50);
        const seed = context.randomSeed || 42;
        const passed = seed % 100 < weight;
        return {
          passed,
          message: passed ? `Assigned to Variant A (${weight}% split)` : `Assigned to Variant B`,
          outputData: context,
        };
      }

      case 'condition:custom-expression': {
        const expr = config.expression || 'true';
        try {
          const fn = new Function(
            'context',
            `with(context || {}) { return Boolean(${expr}); }`
          );
          const passed = Boolean(fn(context));
          return {
            passed,
            message: passed ? `Expression (${expr}) evaluated to true` : `Expression (${expr}) evaluated to false`,
            outputData: context,
          };
        } catch (e: any) {
          return {
            passed: false,
            message: `Expression error: ${e.message}`,
            outputData: context,
          };
        }
      }

      // ─── ACTIONS ──────────────────────────
      case 'action:show-section':
        return { passed: true, message: 'Action: Display section to visitor', outputData: context };

      case 'action:hide-section':
        return { passed: true, message: 'Action: Hide section from visitor', outputData: context };

      case 'action:swap-content':
      case 'action:apply-discount':
      case 'action:show-toast':
      case 'action:trigger-confetti':
      case 'action:open-drawer':
        return { passed: true, message: `Action executed: ${node.label}`, outputData: { ...context, ...config } };

      default:
        return { passed: true, message: 'Node executed', outputData: context };
    }
  }

  /**
   * AI Flow Assistant: Generate a complete FlowGraph from natural language
   */
  generateFlowFromPrompt(prompt: string, sectionName: string = 'Section'): FlowGraph {
    const pLower = prompt.toLowerCase();
    const isCart = pLower.includes('cart') || pLower.includes('subtotal') || pLower.includes('spend');
    const isVip = pLower.includes('vip') || pLower.includes('member');
    const isMobile = pLower.includes('mobile') || pLower.includes('phone');
    const isDiscount = pLower.includes('discount') || pLower.includes('promo') || pLower.includes('off');

    const triggerId = 'node_trig_ai';
    const condId = 'node_cond_ai';
    const actTrueId = 'node_act_true_ai';
    const actFalseId = 'node_act_false_ai';

    return {
      id: `flow_ai_${Date.now()}`,
      name: `AI Flow: ${sectionName}`,
      enabled: true,
      viewport: { x: 0, y: 0, zoom: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: triggerId,
          type: 'trigger:page-load',
          label: '⚡ When Page Loads',
          icon: '⚡',
          position: { x: 60, y: 160 },
          config: {},
          inputs: [],
          outputs: [{ id: 'out_default', label: 'Flow', dataType: 'flow', type: 'output' }],
        },
        {
          id: condId,
          type: isCart ? 'condition:cart-value' : isMobile ? 'condition:device-type' : 'condition:customer-segment',
          label: isCart ? '🛒 Cart Subtotal ≥ $150' : isMobile ? '📱 Device is Mobile' : '👑 Customer is VIP Patron',
          icon: isCart ? '🛒' : isMobile ? '📱' : '👑',
          position: { x: 320, y: 160 },
          config: isCart ? { threshold: 150, operator: 'greater_than_or_equal' } : isMobile ? { device: 'mobile' } : { segment: 'vip' },
          inputs: [{ id: 'in_flow', label: 'In', dataType: 'flow', type: 'input' }],
          outputs: [
            { id: 'out_true', label: 'True (Match)', dataType: 'flow', type: 'output' },
            { id: 'out_false', label: 'False (No Match)', dataType: 'flow', type: 'output' },
          ],
        },
        {
          id: actTrueId,
          type: isDiscount ? 'action:apply-discount' : 'action:show-section',
          label: isDiscount ? '🏷️ Apply 20% Off Promo' : `✨ Show ${sectionName}`,
          icon: isDiscount ? '🏷️' : '👁️',
          position: { x: 620, y: 80 },
          config: isDiscount ? { code: 'ROYALVIP20', discount: 20 } : {},
          inputs: [{ id: 'in_flow', label: 'In', dataType: 'flow', type: 'input' }],
          outputs: [],
        },
        {
          id: actFalseId,
          type: 'action:hide-section',
          label: `🚫 Hide ${sectionName}`,
          icon: '🙈',
          position: { x: 620, y: 260 },
          config: {},
          inputs: [{ id: 'in_flow', label: 'In', dataType: 'flow', type: 'input' }],
          outputs: [],
        },
      ],
      connections: [
        { id: 'c1', fromNodeId: triggerId, fromPortId: 'out_default', toNodeId: condId, toPortId: 'in_flow' },
        { id: 'c2', fromNodeId: condId, fromPortId: 'out_true', toNodeId: actTrueId, toPortId: 'in_flow' },
        { id: 'c3', fromNodeId: condId, fromPortId: 'out_false', toNodeId: actFalseId, toPortId: 'in_flow' },
      ],
    };
  }

  /**
   * Convert legacy SectionLogicConfig into an n8n-style visual FlowGraph
   */
  convertRulesToFlow(config: SectionLogicConfig, sectionName: string = 'Section'): FlowGraph {
    const nodes: FlowNode[] = [];
    const connections: FlowConnection[] = [];

    const triggerId = 'node_trigger_1';
    nodes.push({
      id: triggerId,
      type: 'trigger:page-load',
      label: '⚡ When Page Loads',
      icon: '⚡',
      position: { x: 80, y: 160 },
      config: {},
      inputs: [],
      outputs: [{ id: 'out_default', label: 'Flow', dataType: 'flow', type: 'output' }],
    });

    let prevPortId = 'out_default';
    let currentX = 340;

    if (config.rules && config.rules.length > 0) {
      const firstRule = config.rules[0]!;
      const condId = 'node_cond_1';

      const isSubtotal = firstRule.type === 'cart_subtotal';
      const isSegment = firstRule.type === 'customer_segment';

      nodes.push({
        id: condId,
        type: isSubtotal
          ? 'condition:cart-value'
          : isSegment
          ? 'condition:customer-segment'
          : 'condition:if-else',
        label: isSubtotal
          ? `🛒 Cart Subtotal ≥ $${firstRule.value}`
          : isSegment
          ? `👑 Customer is ${String(firstRule.value).toUpperCase()}`
          : `🔍 Rule (${firstRule.type})`,
        icon: isSubtotal ? '🛒' : isSegment ? '👑' : '🔍',
        position: { x: currentX, y: 160 },
        config: {
          operator: firstRule.operator || 'greater_than_or_equal',
          threshold: firstRule.value || 100,
          segment: firstRule.value || 'vip',
        },
        inputs: [{ id: 'in_flow', label: 'In', dataType: 'flow', type: 'input' }],
        outputs: [
          { id: 'out_true', label: 'True (Match)', dataType: 'flow', type: 'output' },
          { id: 'out_false', label: 'False (No Match)', dataType: 'flow', type: 'output' },
        ],
      });

      connections.push({
        id: `conn_${triggerId}_${condId}`,
        fromNodeId: triggerId,
        fromPortId: prevPortId,
        toNodeId: condId,
        toPortId: 'in_flow',
      });

      const actionShowId = 'node_act_show';
      nodes.push({
        id: actionShowId,
        type: 'action:show-section',
        label: `✨ Show ${sectionName}`,
        icon: '👁️',
        position: { x: currentX + 300, y: 80 },
        config: {},
        inputs: [{ id: 'in_flow', label: 'In', dataType: 'flow', type: 'input' }],
        outputs: [],
      });

      connections.push({
        id: `conn_${condId}_${actionShowId}`,
        fromNodeId: condId,
        fromPortId: 'out_true',
        toNodeId: actionShowId,
        toPortId: 'in_flow',
      });

      const actionHideId = 'node_act_hide';
      nodes.push({
        id: actionHideId,
        type: 'action:hide-section',
        label: `🚫 Hide ${sectionName}`,
        icon: '🙈',
        position: { x: currentX + 300, y: 260 },
        config: {},
        inputs: [{ id: 'in_flow', label: 'In', dataType: 'flow', type: 'input' }],
        outputs: [],
      });

      connections.push({
        id: `conn_${condId}_${actionHideId}`,
        fromNodeId: condId,
        fromPortId: 'out_false',
        toNodeId: actionHideId,
        toPortId: 'in_flow',
      });
    } else {
      const actionShowId = 'node_act_show';
      nodes.push({
        id: actionShowId,
        type: 'action:show-section',
        label: `✨ Show ${sectionName}`,
        icon: '👁️',
        position: { x: currentX, y: 160 },
        config: {},
        inputs: [{ id: 'in_flow', label: 'In', dataType: 'flow', type: 'input' }],
        outputs: [],
      });

      connections.push({
        id: `conn_${triggerId}_${actionShowId}`,
        fromNodeId: triggerId,
        fromPortId: prevPortId,
        toNodeId: actionShowId,
        toPortId: 'in_flow',
      });
    }

    return {
      id: `flow_${Date.now()}`,
      name: `${sectionName} Logic Flow`,
      nodes,
      connections,
      viewport: { x: 0, y: 0, zoom: 1 },
      enabled: config.enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  createDefaultFlow(sectionName: string = 'Section'): FlowGraph {
    return this.convertRulesToFlow(
      {
        enabled: true,
        matchType: 'all',
        rules: [
          {
            id: 'rule_default',
            type: 'customer_segment',
            operator: 'equals',
            value: 'vip',
            enabled: true,
          },
        ],
      },
      sectionName
    );
  }
}

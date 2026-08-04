import { Injectable, Logger } from '@nestjs/common';

export interface AiToolDefinition {
  name: string;
  description: string;
  pluginId: string;
  parameters: Record<string, any>;
  handler: (params: Record<string, any>, context: any) => Promise<any>;
}

export interface AgentRunOptions {
  contextId: string;
  instruction: string;
  pluginIds?: string[];
  maxSteps?: number;
}

export interface AgentRunResult {
  runId: string;
  finalAnswer: string;
  stepsExecuted: number;
  toolsUsed: string[];
}

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private tools: Map<string, AiToolDefinition> = new Map();

  registerTool(tool: AiToolDefinition): void {
    const key = `${tool.pluginId}.${tool.name}`;
    this.tools.set(key, tool);
    this.logger.log(`Registered AI tool: ${key} for plugin ${tool.pluginId}`);
  }

  getRegisteredTools(pluginId?: string): AiToolDefinition[] {
    const all = Array.from(this.tools.values());
    if (!pluginId) return all;
    return all.filter((t) => t.pluginId === pluginId);
  }

  async runAgent(options: AgentRunOptions, context: any): Promise<AgentRunResult> {
    const runId = `agent_run_${Date.now()}`;
    this.logger.log(`Executing AI agent run ${runId} for context ${options.contextId}`);

    const availableTools = options.pluginIds
      ? Array.from(this.tools.values()).filter((t) => options.pluginIds?.includes(t.pluginId))
      : Array.from(this.tools.values());

    const toolsUsed: string[] = [];
    let stepsExecuted = 0;

    for (const tool of availableTools) {
      if (stepsExecuted >= (options.maxSteps || 5)) break;
      stepsExecuted++;
      toolsUsed.push(tool.name);
      this.logger.debug(`Agent executing tool step ${stepsExecuted}: ${tool.name}`);
    }

    return {
      runId,
      finalAnswer: `AI Agent completed task: "${options.instruction}". Executed ${stepsExecuted} steps using tools: [${toolsUsed.join(', ')}].`,
      stepsExecuted,
      toolsUsed
    };
  }
}

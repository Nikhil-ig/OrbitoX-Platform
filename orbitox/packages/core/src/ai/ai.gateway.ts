import { Injectable, Logger } from '@nestjs/common';
import { AIGatewayRequest, AICapability } from './types';
import { CapabilityEngine } from '../capability/capability.engine';
import { AuditService } from '../audit/audit.service';
import { ActionRegistry } from './action.registry';
import { AgenticAction } from '@orbitox/sdk';

@Injectable()
export class AIGateway {
  private readonly logger = new Logger(AIGateway.name);

  constructor(
    private readonly capabilityEngine: CapabilityEngine,
    private readonly auditService: AuditService,
    private readonly actionRegistry: ActionRegistry,
  ) {}

  async processRequest(request: AIGatewayRequest): Promise<any> {
    // 1. PII Masking (Stubbed for now, would replace names/emails/phones)
    const sanitizedRequest = this.maskPII(request);

    // 2. Resolve the AI Capability for this specific context
    const aiProvider = await this.capabilityEngine.resolve<AICapability>('ai', request.contextId);

    // 3. Rate limiting and Cost Tracking checks would go here
    this.logger.debug(`Routing AI request for plugin ${request.pluginId} via provider ${aiProvider.providerId}`);

    // 4. Log audit entry for tracking usage
    await this.auditService.log({
      action: `ai.request.${request.requestType}`,
      entityType: 'ai_request',
      entityId: `${request.pluginId}-${Date.now()}`,
      userId: request.userId,
      contextId: request.contextId,
      reason: `AI capability used by plugin ${request.pluginId}`,
      newValue: {
        provider: aiProvider.providerId,
        model: request.model,
        maxTokens: request.maxTokens,
      }
    });

    // 5. Route to appropriate method on adapter
    switch (request.requestType) {
      case 'completion':
        return aiProvider.complete(sanitizedRequest);
      case 'embedding':
        return aiProvider.embed(sanitizedRequest);
      default:
        return aiProvider.chat(sanitizedRequest);
    }
  }

  private maskPII(request: AIGatewayRequest): AIGatewayRequest {
    // Future implementation: regex or NLP based masking before sending to external LLMs
    return request;
  }

  async executeAgenticWorkflow(prompt: string, contextId: string, userId: string): Promise<any> {
    this.logger.log(`Executing federated agentic workflow for context: ${contextId}`);
    
    // 1. Get all available Agentic Actions across all installed plugins for this tenant
    const availableActions = this.actionRegistry.getActionsForContext(contextId);
    
    // 2. Resolve AI Provider
    const aiProvider = await this.capabilityEngine.resolve<AICapability>('ai', contextId);

    // 3. Audit Logging
    await this.auditService.log({
      action: `ai.agentic.execution`,
      entityType: 'ai_copilot',
      entityId: `workflow-${Date.now()}`,
      userId,
      contextId,
      reason: `Agentic Copilot invoked`,
      newValue: { toolsCount: availableActions.length }
    });

    // 4. In a real scenario, this would pass the tools (availableActions) to the LLM (e.g. OpenAI function calling format)
    // and route the resulting tool call back via the EventBus to the plugin's action handler.
    
    return {
      status: 'success',
      message: 'Agentic workflow completed',
      toolsDiscovered: availableActions.length,
      tools: availableActions.map(a => a.name)
    };
  }
}

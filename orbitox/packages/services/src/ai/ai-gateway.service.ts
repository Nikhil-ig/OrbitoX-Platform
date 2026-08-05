import { Injectable, Logger } from '@nestjs/common';
import { LlmRouterService, LlmProvider } from './llm-router.service';
import { PromptLibraryService } from './prompt-library.service';
import { TemplateService } from '../notifications/template.service';
import { PiiService, MeteringService } from '@orbitox/core';

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    private readonly llmRouter: LlmRouterService,
    private readonly promptLibrary: PromptLibraryService,
    private readonly templateService: TemplateService,
    private readonly piiService: PiiService,
    private readonly meteringService: MeteringService,
  ) {}

  async executePrompt(
    templateId: string, 
    variables: Record<string, any>, 
    contextId: string, 
    provider?: LlmProvider
  ): Promise<string> {
    this.logger.log(`Executing AI prompt ${templateId} for context ${contextId}`);
    
    // 1. Fetch template
    const template = await this.promptLibrary.getPromptTemplate(templateId, contextId);
    
    // 2. Security: Mask PII in variables before sending to LLM
    const safeVariables = this.piiService.sanitize(variables);

    // 3. Hydrate template with safe variables
    const hydratedPrompt = this.templateService.render(template, safeVariables);
    
    // 4. Route to LLM
    const response = await this.llmRouter.route(hydratedPrompt, provider);

    // 5. Meter usage (approximate tokens: 1 token ~= 4 chars)
    const promptTokens = Math.ceil(hydratedPrompt.length / 4);
    const responseTokens = Math.ceil(response.length / 4);
    const totalTokens = promptTokens + responseTokens;
    this.meteringService.recordUsage(contextId, 'ai_tokens', totalTokens);

    return response;
  }
}

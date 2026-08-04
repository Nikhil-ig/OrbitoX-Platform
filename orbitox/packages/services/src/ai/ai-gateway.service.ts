import { Injectable, Logger } from '@nestjs/common';
import { LlmRouterService, LlmProvider } from './llm-router.service';
import { PromptLibraryService } from './prompt-library.service';
import { TemplateService } from '../notifications/template.service';

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    private readonly llmRouter: LlmRouterService,
    private readonly promptLibrary: PromptLibraryService,
    private readonly templateService: TemplateService,
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
    
    // 2. Hydrate template
    const hydratedPrompt = this.templateService.render(template, variables);
    
    // 3. Route to LLM
    return this.llmRouter.route(hydratedPrompt, provider);
  }
}

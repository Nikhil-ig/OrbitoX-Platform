import { AiGatewayService } from './ai-gateway.service';
import { LlmRouterService } from './llm-router.service';
import { PromptLibraryService } from './prompt-library.service';
import { TemplateService } from '../notifications/template.service';

describe('AiGatewayService', () => {
  let service: AiGatewayService;
  let mockLlmRouter: jest.Mocked<LlmRouterService>;
  let mockPromptLibrary: jest.Mocked<PromptLibraryService>;
  let templateService: TemplateService;

  beforeEach(() => {
    mockLlmRouter = {
      route: jest.fn().mockResolvedValue('AI Generated Response'),
    } as any;

    mockPromptLibrary = {
      getPromptTemplate: jest.fn().mockResolvedValue('Summarize: {{text}}'),
    } as any;

    templateService = new TemplateService();
    service = new AiGatewayService(mockLlmRouter, mockPromptLibrary, templateService);
  });

  it('should fetch prompt template, hydrate it, and route to LLM provider', async () => {
    const result = await service.executePrompt(
      'summary-template',
      { text: 'Sample quarterly financial report' },
      'ctx-999',
      'openai',
    );

    expect(mockPromptLibrary.getPromptTemplate).toHaveBeenCalledWith('summary-template', 'ctx-999');
    expect(mockLlmRouter.route).toHaveBeenCalledWith('Summarize: Sample quarterly financial report', 'openai');
    expect(result).toBe('AI Generated Response');
  });
});

import { Module } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { LlmRouterService } from './llm-router.service';
import { PromptLibraryService } from './prompt-library.service';
import { OpenAiAdapter } from './providers/openai.adapter';
import { AnthropicAdapter } from './providers/anthropic.adapter';
import { NotificationsModule } from '../notifications/notifications.module'; // for TemplateService
import { AiAgentService } from './ai-agent.service';
import { AiRagEngineService } from './rag-engine.service';
import { AiMemoryService } from './memory.service';

@Module({
  imports: [NotificationsModule],
  providers: [
    AiGatewayService,
    LlmRouterService,
    PromptLibraryService,
    OpenAiAdapter,
    AnthropicAdapter,
    AiAgentService,
    AiRagEngineService,
    AiMemoryService,
  ],
  exports: [
    AiGatewayService, 
    AiAgentService, 
    AiRagEngineService, 
    AiMemoryService
  ],
})
export class AiModule {}

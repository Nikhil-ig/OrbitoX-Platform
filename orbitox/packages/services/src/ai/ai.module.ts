import { Module } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { LlmRouterService } from './llm-router.service';
import { PromptLibraryService } from './prompt-library.service';
import { OpenAiAdapter } from './providers/openai.adapter';
import { AnthropicAdapter } from './providers/anthropic.adapter';
import { NotificationsModule } from '../notifications/notifications.module'; // for TemplateService

@Module({
  imports: [NotificationsModule],
  providers: [
    AiGatewayService,
    LlmRouterService,
    PromptLibraryService,
    OpenAiAdapter,
    AnthropicAdapter,
  ],
  exports: [AiGatewayService],
})
export class AiModule {}

import { Injectable, Logger } from '@nestjs/common';
import { OpenAiAdapter } from './providers/openai.adapter';
import { AnthropicAdapter } from './providers/anthropic.adapter';

export type LlmProvider = 'openai' | 'anthropic';

@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);

  constructor(
    private readonly openai: OpenAiAdapter,
    private readonly anthropic: AnthropicAdapter,
  ) {}

  async route(prompt: string, preferredProvider: LlmProvider = 'openai'): Promise<string> {
    this.logger.log(`Routing prompt to ${preferredProvider}`);
    switch (preferredProvider) {
      case 'openai': return this.openai.complete(prompt);
      case 'anthropic': return this.anthropic.complete(prompt);
      default: return this.openai.complete(prompt);
    }
  }
}

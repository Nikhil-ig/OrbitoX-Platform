import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnthropicAdapter {
  private readonly logger = new Logger(AnthropicAdapter.name);

  async complete(prompt: string, model: string = 'claude-3-opus'): Promise<string> {
    this.logger.log(`[Anthropic] Completing prompt using ${model}`);
    // Mock implementation
    return `Anthropic Response to: ${prompt}`;
  }
}

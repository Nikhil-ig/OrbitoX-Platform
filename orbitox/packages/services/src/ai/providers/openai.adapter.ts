import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OpenAiAdapter {
  private readonly logger = new Logger(OpenAiAdapter.name);

  async complete(prompt: string, model: string = 'gpt-4'): Promise<string> {
    this.logger.log(`[OpenAI] Completing prompt using ${model}`);
    // Mock implementation
    return `OpenAI Response to: ${prompt}`;
  }
}

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromptLibraryService {
  private readonly logger = new Logger(PromptLibraryService.name);

  async getPromptTemplate(templateId: string, contextId: string): Promise<string> {
    this.logger.log(`Fetching prompt template ${templateId} for context ${contextId}`);
    return `You are a helpful assistant. User says: {{input}}`;
  }
}

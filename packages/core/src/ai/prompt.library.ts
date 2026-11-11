import { Injectable, Logger } from '@nestjs/common';
import { PromptDefinition } from './types';
import { ContextService } from '../context/context.service';

@Injectable()
export class PromptLibrary {
  private readonly logger = new Logger(PromptLibrary.name);
  
  // Base plugin prompts: Map<promptId, PromptDefinition>
  private readonly defaultPrompts = new Map<string, PromptDefinition>();
  
  // Context-specific overrides: Map<contextId, Map<promptId, PromptDefinition>>
  private readonly contextOverrides = new Map<string, Map<string, PromptDefinition>>();

  constructor(private readonly contextService: ContextService) {}

  registerDefaultPrompt(prompt: PromptDefinition): void {
    if (this.defaultPrompts.has(prompt.id)) {
      this.logger.warn(`Prompt ${prompt.id} already exists. Overwriting.`);
    }
    this.defaultPrompts.set(prompt.id, prompt);
  }

  setContextOverride(contextId: string, prompt: PromptDefinition): void {
    if (!this.contextOverrides.has(contextId)) {
      this.contextOverrides.set(contextId, new Map());
    }
    this.contextOverrides.get(contextId)!.set(prompt.id, prompt);
  }

  async render(promptId: string, options: { contextId: string; variables: Record<string, string> }): Promise<string> {
    const { contextId, variables } = options;
    
    // Resolve which prompt definition to use
    let definition = this.defaultPrompts.get(promptId);
    
    // Check for overrides in context hierarchy
    const hierarchy = this.contextService.getHierarchy(contextId);
    for (const context of hierarchy) {
      const overrides = this.contextOverrides.get(context.id);
      if (overrides && overrides.has(promptId)) {
        definition = overrides.get(promptId);
        break; // Closest override wins
      }
    }

    if (!definition) {
      throw new Error(`Prompt definition not found for ID: ${promptId}`);
    }

    // Basic templating replacement (e.g. {{leadName}})
    let rendered = definition.template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value);
    }

    return rendered;
  }
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateService {
  render(templateString: string, variables: Record<string, any>): string {
    // Basic template interpolation (e.g., {{name}} or {name})
    return templateString.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const value = variables[key.trim()];
      return value !== undefined ? String(value) : '';
    });
  }
}

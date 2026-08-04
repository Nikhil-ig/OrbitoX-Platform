import { Injectable, Logger } from '@nestjs/common';

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  required?: boolean;
  options?: string[];
  defaultValue?: any;
}

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);
  private readonly fieldDefinitions = new Map<string, Map<string, CustomFieldDefinition>>();

  registerCustomField(entityType: string, field: CustomFieldDefinition, contextId: string): void {
    const contextKey = `${contextId}:${entityType}`;
    if (!this.fieldDefinitions.has(contextKey)) {
      this.fieldDefinitions.set(contextKey, new Map());
    }
    this.fieldDefinitions.get(contextKey)!.set(field.key, field);
    this.logger.log(`Registered custom field ${field.key} for ${entityType} in context ${contextId}`);
  }

  getCustomFields(entityType: string, contextId: string): CustomFieldDefinition[] {
    const contextKey = `${contextId}:${entityType}`;
    const fieldsMap = this.fieldDefinitions.get(contextKey);
    return fieldsMap ? Array.from(fieldsMap.values()) : [];
  }

  validateCustomValues(entityType: string, values: Record<string, any>, contextId: string): void {
    const fields = this.getCustomFields(entityType, contextId);
    for (const field of fields) {
      if (field.required && (values[field.key] === undefined || values[field.key] === null)) {
        throw new Error(`Custom field '${field.label}' (${field.key}) is required for ${entityType}`);
      }
    }
  }
}

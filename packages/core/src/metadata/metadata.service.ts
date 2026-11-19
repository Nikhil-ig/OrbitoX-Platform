import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  required?: boolean;
  options?: string[];
  defaultValue?: any;
}

export interface ValidationErrorDetail {
  field: string;
  error: string;
}

export class MetadataValidationException extends BadRequestException {
  constructor(public readonly errors: ValidationErrorDetail[]) {
    super({
      message: 'Custom metadata validation failed',
      errors,
    });
  }
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
    
    // Validate select fields have options
    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      throw new Error(`Select field '${field.key}' must define at least one option.`);
    }

    this.fieldDefinitions.get(contextKey)!.set(field.key, field);
    this.logger.log(`Registered custom field ${field.key} for ${entityType} in context ${contextId}`);
  }

  getCustomFields(entityType: string, contextId: string): CustomFieldDefinition[] {
    const contextKey = `${contextId}:${entityType}`;
    const fieldsMap = this.fieldDefinitions.get(contextKey);
    return fieldsMap ? Array.from(fieldsMap.values()) : [];
  }

  /**
   * Validates custom field values against their registered definitions.
   * Throws MetadataValidationException if any field is invalid.
   * Also sanitizes the object by stripping undocumented fields.
   */
  validateAndSanitize(entityType: string, values: Record<string, any>, contextId: string): Record<string, any> {
    const fields = this.getCustomFields(entityType, contextId);
    if (!fields.length) return {}; // No custom fields registered

    const errors: ValidationErrorDetail[] = [];
    const sanitized: Record<string, any> = {};

    for (const field of fields) {
      const value = values[field.key];
      
      // 1. Required Check
      const isMissing = value === undefined || value === null || value === '';
      if (field.required && isMissing) {
        errors.push({ field: field.key, error: `Field '${field.label}' is required.` });
        continue;
      }

      // If missing but not required, we can use default or skip
      if (isMissing) {
        if (field.defaultValue !== undefined) {
          sanitized[field.key] = field.defaultValue;
        }
        continue;
      }

      // 2. Type Checking
      switch (field.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({ field: field.key, error: `Field '${field.label}' must be a string.` });
          } else {
            sanitized[field.key] = value;
          }
          break;

        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push({ field: field.key, error: `Field '${field.label}' must be a valid number.` });
          } else {
            sanitized[field.key] = numValue;
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            errors.push({ field: field.key, error: `Field '${field.label}' must be a boolean.` });
          } else {
            sanitized[field.key] = value === true || value === 'true';
          }
          break;

        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({ field: field.key, error: `Field '${field.label}' must be a valid ISO8601 date.` });
          } else {
            sanitized[field.key] = date.toISOString();
          }
          break;

        case 'select':
          if (!field.options?.includes(String(value))) {
            errors.push({ 
              field: field.key, 
              error: `Field '${field.label}' must be one of: [${field.options?.join(', ')}]` 
            });
          } else {
            sanitized[field.key] = String(value);
          }
          break;
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Metadata validation failed for ${entityType} in context ${contextId}`);
      throw new MetadataValidationException(errors);
    }

    return sanitized;
  }

  // Backwards compatibility for old method, now strictly throws
  validateCustomValues(entityType: string, values: Record<string, any>, contextId: string): void {
    this.validateAndSanitize(entityType, values, contextId);
  }
}

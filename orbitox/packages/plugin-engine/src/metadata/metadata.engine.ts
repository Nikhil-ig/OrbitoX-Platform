import { Injectable, Logger } from '@nestjs/common';
import { EntityMetadata, UiFormSchema, UiTableSchema, FieldMetadata } from './types';

@Injectable()
export class MetadataEngine {
  private readonly logger = new Logger(MetadataEngine.name);
  
  // Registry storing the base (plugin-defined) entities
  private readonly baseEntities = new Map<string, EntityMetadata>();

  // Store for context-specific dynamic fields (e.g. adding a custom field at runtime for a specific tenant)
  // Map<EntityId, Map<ContextId, FieldMetadata[]>>
  private readonly dynamicFields = new Map<string, Map<string, FieldMetadata[]>>();

  registerEntity(entity: EntityMetadata): void {
    if (this.baseEntities.has(entity.id)) {
      this.logger.warn(`Entity ${entity.id} is already registered. Overwriting.`);
    }
    this.baseEntities.set(entity.id, entity);
    this.logger.debug(`Registered entity metadata for: ${entity.id}`);
  }

  addCustomField(entityId: string, contextId: string, field: FieldMetadata): void {
    if (!this.baseEntities.has(entityId)) {
      throw new Error(`Cannot add custom field to unknown entity: ${entityId}`);
    }

    if (!this.dynamicFields.has(entityId)) {
      this.dynamicFields.set(entityId, new Map());
    }

    const contextMap = this.dynamicFields.get(entityId)!;
    if (!contextMap.has(contextId)) {
      contextMap.set(contextId, []);
    }

    contextMap.get(contextId)!.push(field);
    this.logger.debug(`Added custom field ${field.key} to entity ${entityId} for context ${contextId}`);
  }

  getResolvedEntity(entityId: string, contextId?: string): EntityMetadata {
    const base = this.baseEntities.get(entityId);
    if (!base) {
      throw new Error(`Entity metadata not found for: ${entityId}`);
    }

    // Clone base entity
    const resolved: EntityMetadata = { 
      ...base,
      fields: [...base.fields]
    };

    if (contextId && this.dynamicFields.has(entityId)) {
      const contextMap = this.dynamicFields.get(entityId)!;
      const customFields = contextMap.get(contextId) || [];
      resolved.fields.push(...customFields);
    }

    return resolved;
  }

  getFormSchema(entityId: string, contextId?: string, mode: 'create' | 'edit' = 'create'): UiFormSchema {
    const resolved = this.getResolvedEntity(entityId, contextId);
    
    return {
      entityId,
      fields: resolved.fields.filter(f => f.showInForm !== false)
    };
  }

  getTableSchema(entityId: string, contextId?: string): UiTableSchema {
    const resolved = this.getResolvedEntity(entityId, contextId);

    return {
      entityId,
      columns: resolved.fields.filter(f => f.showInList !== false),
      defaultSort: resolved.ui.defaultSort
    };
  }
}

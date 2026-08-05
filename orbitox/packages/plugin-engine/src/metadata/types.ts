export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'relation'
  | 'file'
  | 'image'
  | 'currency'
  | 'percentage'
  | 'rating'
  | 'color'
  | 'json'
  | 'rich_text';

export interface FieldMetadata {
  key: string;
  label: string;
  type: FieldType;

  // Validation
  required?: boolean;
  unique?: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
    custom?: string;
  };

  // UI
  placeholder?: string;
  helpText?: string;
  hidden?: boolean;
  readonly?: boolean;
  showInList?: boolean;
  showInForm?: boolean;
  showInExport?: boolean;

  // Search & Filter
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;

  // Options for select/multiselect
  options?: Array<{ value: string; label: string; color?: string }>;

  // Relation
  relatedEntity?: string;
  relatedField?: string;

  // Conditional
  showWhen?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: any;
  };

  defaultValue?: any;
}

export interface EntityMetadata {
  id: string;
  pluginId: string;
  contextId?: string; // null = global plugin schema

  displayName: string;
  displayNamePlural: string;
  icon?: string;
  description?: string;

  fields: FieldMetadata[];

  permissions: {
    create: string;
    read: string;
    update: string;
    delete: string;
    export?: string;
    import?: string;
  };

  ui: {
    defaultSort?: string;
    defaultView?: 'table' | 'kanban' | 'calendar';
    searchFields?: string[];
    displayField?: string;
  };

  hooks?: {
    beforeCreate?: string;
    afterCreate?: string[];
    afterUpdate?: string[];
    afterDelete?: string[];
  };
}

export interface UiFormSchema {
  entityId: string;
  fields: FieldMetadata[];
}

export interface UiTableSchema {
  entityId: string;
  columns: FieldMetadata[];
  defaultSort?: string;
}

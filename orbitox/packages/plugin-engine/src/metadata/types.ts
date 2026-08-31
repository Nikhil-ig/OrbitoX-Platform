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
  placeholder?: string;
  helpText?: string;
  hidden?: boolean;
  readonly?: boolean;
  showInList?: boolean;
  showInForm?: boolean;
  showInExport?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  options?: Array<{ value: string; label: string; color?: string }>;
  relatedEntity?: string;
  relatedField?: string;
  defaultValue?: any;
}

export interface EntityMetadata {
  id: string;
  pluginId: string;
  contextId?: string;
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

export interface PluginMenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  sortOrder?: number;
  permission?: string;
  children?: PluginMenuItem[];
}

export interface PluginPageItem {
  id: string;
  path: string;
  component: string;
  permission?: string;
}

export interface PluginWidgetItem {
  id: string;
  title: string;
  size: '1x1' | '2x1' | '2x2' | '4x2';
  component?: string;
  permission?: string;
}

export interface PluginEventsConfig {
  emits?: string[];
  subscribes?: string[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  displayName: string;
  description: string;
  icon?: string;
  category: string;
  author: string;
  minimumPlatformVersion?: string;
  requires?: string[];
  incompatibleWith?: string[];
  permissions?: string[];
  menus?: PluginMenuItem[];
  pages?: PluginPageItem[];
  widgets?: PluginWidgetItem[];
  events?: PluginEventsConfig;
  agenticActions?: any[];
  entities?: EntityMetadata[];
}


export interface HeadlessPlugin {
  isOrbitoXPlugin: boolean;
  manifest: PluginManifest;
  [key: string]: any;
}

export const ORBITOX_PLUGIN_METADATA_KEY = 'ORBITOX_PLUGIN_METADATA';

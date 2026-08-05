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

export interface PluginCronJobItem {
  id: string;
  schedule: string;
  handler: string;
  description?: string;
}

export interface AgenticActionParameter {
  type: string;
  description: string;
  required?: boolean;
}

export interface AgenticAction {
  id: string;
  name: string;
  description: string;
  handler: string;
  permission?: string;
  parameters?: Record<string, AgenticActionParameter>;
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
  cron?: PluginCronJobItem[];
  settings?: {
    schema?: Array<{
      key: string;
      label: string;
      type: 'string' | 'number' | 'boolean' | 'select' | 'relation';
      default?: any;
      options?: Array<{ label: string; value: any }>;
      relatedEntity?: string;
    }>;
  };
  agenticActions?: AgenticAction[];
}

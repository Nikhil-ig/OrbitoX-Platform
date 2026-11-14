// OrbitoX Design System (packages/ui) - Unified Component Library

// Core Components
export * from './components';

// Design Tokens & Theming
export * from './tokens';

// Indian Locale Formatting
export * from './format';

// Recharts Wrappers & Visualizations
export * from './charts';

// Internationalization (en-IN / hi-IN)
export * from './i18n';

// Utilities
export * from './utils/cn';

// Re-export non-conflicting legacy components for backward-compatibility (Stages 7B-7F)
export {
  GlassCard,
  type GlassCardProps,
} from './legacy/components/glass-card';

export {
  NeonBadge,
  type NeonBadgeProps,
} from './legacy/components/neon-badge';

export {
  StudioButton,
  type StudioButtonProps,
} from './legacy/components/studio-button';

export {
  StatMetricWidget,
  type StatMetricWidgetProps,
} from './legacy/components/stat-metric-widget';

export {
  ModernTabs,
  type ModernTabsProps,
  type TabItem,
} from './legacy/components/modern-tabs';

export {
  ThemeProvider,
  useTheme,
} from './legacy/components/theme-provider';

export {
  DynamicSidebar,
  type MenuItem,
} from './legacy/dynamic/dynamic-sidebar';

export {
  DynamicTable,
  type DynamicTableProps,
} from './legacy/dynamic/dynamic-table';

export {
  DynamicDashboard,
  type WidgetData,
  type DynamicDashboardProps,
} from './legacy/dynamic/dynamic-dashboard';

export {
  DynamicMarketplace,
  type MarketplaceItemUI,
  type DynamicMarketplaceProps,
} from './legacy/dynamic/dynamic-marketplace';

export {
  DynamicForm,
  type DynamicFormProps,
} from './legacy/dynamic/dynamic-form';

export {
  DynamicCopilot,
} from './legacy/dynamic/dynamic-copilot';

export {
  DynamicWorkflowBuilder,
  type WorkflowNode,
  type WorkflowEdge,
} from './legacy/dynamic/dynamic-workflow-builder';

// Also export legacy button/card/badge with aliases
export {
  Button as LegacyButton,
  type ButtonProps as LegacyButtonProps,
} from './legacy/components/button';

export {
  Card as LegacyCard,
  type CardProps as LegacyCardProps,
} from './legacy/components/card';

export {
  Badge as LegacyBadge,
  type BadgeProps as LegacyBadgeProps,
} from './legacy/components/badge';

export * as legacy from './legacy';

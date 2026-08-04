# Part 06 — Dynamic UI Engine
### *Menus, Forms, Tables, Dashboards, and Pages — Built from Metadata, Not Code*

---

## The Core Idea

The UI is not coded. It is **declared**.

Every visual element in OrbitoX — sidebar menus, data forms, list tables, dashboard widgets, navigation pages — is rendered by a generic engine from a metadata definition provided by the active plugins.

```
Plugin registers metadata
        ↓
Dynamic UI Engine reads metadata
        ↓
Generic renderer produces the UI
        ↓
User sees a fully functional interface
```

No hardcoded pages. No hardcoded menus. No hardcoded forms.

---

## 1. Dynamic Menu

### How It Works

The sidebar is not a static React component with hardcoded items. It is a **registry-driven renderer**.

```typescript
// ❌ OLD WAY — hardcoded sidebar
export function Sidebar() {
  return (
    <nav>
      <NavItem href="/dashboard" icon="home">Dashboard</NavItem>
      <NavItem href="/customers" icon="users">Customers</NavItem>
      <NavItem href="/leads" icon="user-plus">Leads</NavItem>
      <NavItem href="/reports" icon="chart">Reports</NavItem>
    </nav>
  );
}

// ✅ ORBITOX WAY — plugin-driven sidebar
export function Sidebar() {
  const { menuItems } = usePluginMenus(); // loaded from plugin registry

  return (
    <nav>
      {menuItems.map(item => (
        <NavItem key={item.id} href={item.path} icon={item.icon} badge={item.badge}>
          {item.label}
        </NavItem>
      ))}
    </nav>
  );
}
```

### Menu Item Definition

Each plugin registers menu items in its `manifest.json`:

```json
{
  "menus": [
    {
      "id": "crm-root",
      "label": "CRM",
      "icon": "briefcase",
      "sortOrder": 100,
      "children": [
        {
          "id": "crm-leads",
          "label": "Leads",
          "icon": "user-plus",
          "path": "/crm/leads",
          "permission": "crm.leads.read",
          "badge": { "source": "crm.leads.new_count" }
        },
        {
          "id": "crm-customers",
          "label": "Customers",
          "icon": "users",
          "path": "/crm/customers",
          "permission": "crm.customers.read"
        },
        {
          "id": "crm-pipeline",
          "label": "Pipeline",
          "icon": "git-merge",
          "path": "/crm/pipeline",
          "permission": "crm.pipeline.read"
        }
      ]
    }
  ]
}
```

### Permission-Filtered Rendering

Menu items the current user has no permission to see are **never rendered**:

```typescript
function usePluginMenus() {
  const { permissions } = useCurrentUser();

  return rawMenuItems
    .filter(item => !item.permission || permissions.includes(item.permission))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

---

## 2. Dynamic Forms

### Form Rendering Pipeline

```
EntityMetadata.fields
      ↓
Filter: showInForm = true
      ↓
Apply context overrides (custom fields)
      ↓
Apply conditional visibility rules
      ↓
Apply permission restrictions (readonly fields)
      ↓
DynamicForm renderer → React form
```

### DynamicForm Component

```tsx
// Generic — renders any entity's create/edit form
function DynamicForm({ entityId, contextId, recordId, onSuccess }) {
  const { schema, isLoading } = useDynamicFormSchema(entityId, { contextId });
  const { submit, isSubmitting } = useDynamicFormSubmit(entityId, { contextId, recordId });

  if (isLoading) return <FormSkeleton />;

  return (
    <form onSubmit={submit}>
      {schema.fields.map(field => (
        <DynamicField
          key={field.key}
          field={field}
          // Field type determines which input component renders
          // text → <TextInput>
          // select → <SelectInput>
          // relation → <RelationPicker>
          // file → <FileUploader>
          // rich_text → <RichTextEditor>
          // ...
        />
      ))}
      <Button type="submit" loading={isSubmitting}>
        {recordId ? 'Update' : 'Create'}
      </Button>
    </form>
  );
}
```

### Field Type Renderers

| Field Type | Rendered As |
|-----------|-------------|
| `text` | `<input type="text">` |
| `textarea` | `<textarea>` |
| `rich_text` | Tiptap / Quill editor |
| `email` | `<input type="email">` with format validation |
| `phone` | Phone input with country code picker |
| `number` | `<input type="number">` with min/max |
| `currency` | Number input + currency symbol from context |
| `date` | Date picker |
| `datetime` | Date + time picker |
| `boolean` | Toggle switch |
| `select` | Dropdown with colored options |
| `multiselect` | Multi-select with tags |
| `relation` | Searchable relation picker (loads from API) |
| `file` | Drag-and-drop file uploader |
| `image` | Image uploader with preview + crop |
| `color` | Color picker |
| `json` | Monaco editor (JSON mode) |
| `rating` | Star rating input |

---

## 3. Dynamic Tables

### Table Rendering Pipeline

```
EntityMetadata.fields
      ↓
Filter: showInList = true
      ↓
Apply context overrides (custom columns)
      ↓
Apply user column preferences
      ↓
DynamicTable renderer → React table with sort/filter/pagination
```

### DynamicTable Component

```tsx
function DynamicTable({ entityId, contextId }) {
  const { schema } = useDynamicTableSchema(entityId, { contextId });
  const { data, pagination, sort, filters } = useDynamicTableData(entityId, {
    contextId,
    defaultSort: schema.defaultSort,
  });

  return (
    <DataTable
      columns={schema.columns}
      data={data}
      pagination={pagination}
      sortable
      filterable
      exportable
      selectable
      actions={schema.actions}
    />
  );
}
```

### Column Action Definitions

```json
{
  "actions": [
    {
      "id": "view",
      "label": "View",
      "icon": "eye",
      "permission": "crm.leads.read",
      "action": "navigate:/crm/leads/{id}"
    },
    {
      "id": "edit",
      "label": "Edit",
      "icon": "pencil",
      "permission": "crm.leads.update",
      "action": "open-form:{id}"
    },
    {
      "id": "delete",
      "label": "Delete",
      "icon": "trash",
      "permission": "crm.leads.delete",
      "action": "delete:{id}",
      "confirm": "Are you sure you want to delete this lead?"
    }
  ]
}
```

---

## 4. Dynamic Dashboard

### How the Dashboard Works

```
Plugin registers widgets
        ↓
Dashboard Engine loads active plugins' widgets
        ↓
User selects which widgets to display
        ↓
Dashboard Engine fetches widget data
        ↓
Dashboard renders configured layout
```

### Widget Definition

```typescript
interface WidgetDefinition {
  id: string;                    // 'crm.leads.new-this-week'
  pluginId: string;              // 'crm'
  title: string;                 // 'New Leads This Week'
  description?: string;
  type: WidgetType;              // 'metric', 'chart', 'table', 'list', 'calendar', 'map'
  size: WidgetSize;              // '1x1', '2x1', '2x2', '4x2'
  dataSource: string;            // API endpoint
  refreshInterval?: number;      // seconds (null = manual only)
  permission?: string;           // required permission to see this widget
  configurable?: boolean;        // user can configure data range, filters etc.
}

// Registered by CRM plugin
const crmWidgets: WidgetDefinition[] = [
  {
    id: 'crm.leads.count',
    pluginId: 'crm',
    title: 'Total Leads',
    type: 'metric',
    size: '1x1',
    dataSource: '/api/crm/widgets/leads-count',
    refreshInterval: 60,
    permission: 'crm.leads.read',
  },
  {
    id: 'crm.pipeline.by-stage',
    pluginId: 'crm',
    title: 'Pipeline by Stage',
    type: 'chart',
    size: '2x2',
    dataSource: '/api/crm/widgets/pipeline-stages',
    permission: 'crm.pipeline.read',
  },
];
```

### Dashboard Layout Storage

```json
{
  "contextId": "tenant-123",
  "userId": "user-456",
  "layout": [
    { "widgetId": "crm.leads.count",       "position": { "x": 0, "y": 0, "w": 1, "h": 1 } },
    { "widgetId": "crm.pipeline.by-stage", "position": { "x": 1, "y": 0, "w": 2, "h": 2 } },
    { "widgetId": "ai.chat.quick-access",  "position": { "x": 0, "y": 1, "w": 1, "h": 1 } }
  ]
}
```

User drags, resizes, adds, and removes widgets. The layout is saved per user per context. No deployments.

---

## 5. Dynamic Pages

### Page Registration

Plugins register pages via `manifest.json`:

```json
{
  "pages": [
    {
      "id": "crm-leads-list",
      "path": "/crm/leads",
      "title": "Leads",
      "component": "EntityListPage",
      "props": { "entityId": "lead" },
      "permission": "crm.leads.read"
    },
    {
      "id": "crm-leads-detail",
      "path": "/crm/leads/:id",
      "title": "Lead Detail",
      "component": "EntityDetailPage",
      "props": { "entityId": "lead" },
      "permission": "crm.leads.read"
    },
    {
      "id": "crm-pipeline-kanban",
      "path": "/crm/pipeline",
      "title": "Pipeline",
      "component": "KanbanPage",
      "props": { "entityId": "lead", "groupBy": "status" },
      "permission": "crm.pipeline.read"
    }
  ]
}
```

The Next.js app router dynamically loads these pages at runtime.

---

## 6. Theme Engine

### Per-Context Theming

```typescript
interface ThemeConfig {
  // Brand
  primaryColor: string;         // '#5B21B6'
  secondaryColor: string;       // '#0EA5E9'
  accentColor: string;          // '#F59E0B'

  // Logo
  logoUrl: string;
  faviconUrl: string;

  // Typography
  fontFamily: string;           // 'Inter, sans-serif'
  headingFontFamily?: string;

  // Layout
  sidebarStyle: 'full' | 'compact' | 'icons-only' | 'top-nav';
  sidebarPosition: 'left' | 'right';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  density: 'compact' | 'comfortable' | 'spacious';

  // Dark mode
  defaultMode: 'light' | 'dark' | 'system';
  allowModeToggle: boolean;

  // Custom CSS
  customCss?: string;           // injected at runtime

  // Dashboard
  dashboardLayout: string;      // 'sales' | 'analytics' | 'operations' | 'custom'
}
```

### Theme Resolution

```typescript
// Resolved at runtime — no redeploy needed
const effectiveTheme = await themeEngine.resolve(contextId);
// Returns merged theme from: Platform → Org → Tenant → Context

// Applied via CSS custom properties
:root {
  --color-primary: v(effectiveTheme.primaryColor);
  --color-secondary: v(effectiveTheme.secondaryColor);
  --font-family: v(effectiveTheme.fontFamily);
  --border-radius: v(effectiveTheme.borderRadius);
}
```

---

## 7. Dynamic Navigation (Breadcrumbs & Tabs)

```typescript
interface NavigationState {
  breadcrumbs: Array<{ label: string; href?: string }>;
  tabs?: Array<{ label: string; href: string; permission?: string }>;
  actions?: Array<PageAction>;
}

// Every page provides its navigation state
// Page shell renders it automatically — no hardcoding
```

---

## Component Package: `@orbitox/ui`

All generic components live in the shared UI package:

```
packages/ui/src/
├── components/
│   ├── DynamicForm/
│   ├── DynamicTable/
│   ├── DynamicDashboard/
│   ├── DynamicWidget/
│   ├── DynamicMenu/
│   ├── DynamicPage/
│   ├── DynamicField/          # All field type renderers
│   └── DynamicFilter/
├── layouts/
│   ├── AppShell/              # Sidebar + header + content area
│   ├── AuthLayout/
│   └── AdminLayout/
└── tokens/
    ├── colors.ts
    ├── spacing.ts
    └── typography.ts
```

---

*Next: [Part 07 — Plugin Engine](./07_Plugin_Engine.md)*

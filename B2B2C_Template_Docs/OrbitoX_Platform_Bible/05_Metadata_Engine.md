# Part 05 — Metadata Engine
### *Generate APIs, Forms, Tables, and Search from Schema — Not Code*

---

## The Problem Metadata Solves

Every time a new SaaS is built, engineers write:

```typescript
// Lead entity
@Entity()
class Lead {
  @Column() name: string;
  @Column() email: string;
  @Column() phone: string;
  @Column() status: string;
}

// Lead DTO
class CreateLeadDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsPhoneNumber() phone: string;
}

// Lead controller
@Controller('leads')
class LeadController {
  @Get() findAll() {...}
  @Post() create(@Body() dto: CreateLeadDto) {...}
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {...}
}

// Lead form (React)
<form>
  <Input name="name" label="Name" required />
  <Input name="email" label="Email" type="email" />
  <Input name="phone" label="Phone" />
  <Select name="status" options={statusOptions} />
</form>

// Lead table (React)
<Table columns={[
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
]} />
```

Now the client says: **"Add a GST number field."**

The engineer:
1. Adds column to database (migration)
2. Adds property to entity
3. Adds field to DTO
4. Adds validation
5. Adds field to form
6. Adds column to table
7. Adds to search index
8. Adds to export columns
9. Adds to report builder
10. Deploys

**10 steps for one field.**

With the Metadata Engine: **1 step.**

```json
{
  "key": "gst_number",
  "label": "GST Number",
  "type": "text",
  "validation": { "pattern": "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" },
  "searchable": true,
  "exportable": true
}
```

The engine handles the rest.

---

## What the Metadata Engine Generates

From a single entity definition, the Metadata Engine automatically generates:

```
Entity Metadata Definition
         │
         ├──→ PostgreSQL table (via migration)
         ├──→ CRUD REST API (POST, GET, PATCH, DELETE)
         ├──→ OpenAPI/Swagger documentation
         ├──→ Create/Edit form (dynamic React form)
         ├──→ List/Table view (dynamic React table)
         ├──→ Search index configuration
         ├──→ Export columns (CSV, Excel, PDF)
         ├──→ Report builder fields
         ├──→ Filter/sort parameters
         ├──→ Permission keys (entity.create, entity.read, etc.)
         └──→ Audit log schema
```

---

## Entity Metadata Schema

```typescript
interface EntityMetadata {
  // Identity
  id: string;                          // 'lead', 'customer', 'product'
  pluginId: string;                    // which plugin owns this entity
  contextId?: string;                  // null = global to plugin, else context-specific

  // Display
  displayName: string;                 // 'Lead'
  displayNamePlural: string;           // 'Leads'
  icon?: string;                       // 'user-plus'
  description?: string;

  // Fields
  fields: FieldMetadata[];

  // Relations
  relations?: RelationMetadata[];

  // Permissions
  permissions: {
    create: string;                    // 'leads.create'
    read: string;                      // 'leads.read'
    update: string;                    // 'leads.update'
    delete: string;                    // 'leads.delete'
    export?: string;                   // 'leads.export'
    import?: string;                   // 'leads.import'
  };

  // UI Behaviour
  ui: {
    defaultSort?: string;              // 'created_at:desc'
    defaultView?: 'table' | 'kanban' | 'calendar';
    searchFields?: string[];           // fields to search by default
    displayField?: string;            // field to show as "title" of record
  };

  // Hooks
  hooks?: {
    beforeCreate?: string;             // workflow trigger ID
    afterCreate?: string[];            // event IDs to emit
    afterUpdate?: string[];
    afterDelete?: string[];
  };
}
```

---

## Field Metadata Schema

```typescript
interface FieldMetadata {
  key: string;                         // 'email', 'phone_number', 'status'
  label: string;                       // 'Email Address'
  type: FieldType;

  // Validation
  required?: boolean;
  unique?: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;                  // regex
    enum?: string[];                   // allowed values
    custom?: string;                   // validator function name
  };

  // UI
  placeholder?: string;
  helpText?: string;
  hidden?: boolean;
  readonly?: boolean;
  showInList?: boolean;                // show in table view
  showInForm?: boolean;                // show in create/edit form
  showInExport?: boolean;

  // Search
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;

  // Select/Enum fields
  options?: Array<{ value: string; label: string; color?: string }>;

  // Relation fields
  relatedEntity?: string;
  relatedField?: string;

  // Conditional visibility
  showWhen?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: any;
  };

  // Default value
  defaultValue?: any;
}

type FieldType =
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
```

---

## Complete Example: Lead Entity

```json
{
  "id": "lead",
  "pluginId": "crm",
  "displayName": "Lead",
  "displayNamePlural": "Leads",
  "icon": "user-plus",

  "fields": [
    {
      "key": "name",
      "label": "Full Name",
      "type": "text",
      "required": true,
      "searchable": true,
      "showInList": true,
      "showInForm": true
    },
    {
      "key": "email",
      "label": "Email Address",
      "type": "email",
      "validation": { "pattern": "^[^@]+@[^@]+\\.[^@]+$" },
      "searchable": true,
      "showInList": true,
      "showInForm": true
    },
    {
      "key": "phone",
      "label": "Phone Number",
      "type": "phone",
      "showInList": true,
      "showInForm": true
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "required": true,
      "defaultValue": "new",
      "options": [
        { "value": "new",         "label": "New",         "color": "#3B82F6" },
        { "value": "contacted",   "label": "Contacted",   "color": "#F59E0B" },
        { "value": "qualified",   "label": "Qualified",   "color": "#10B981" },
        { "value": "lost",        "label": "Lost",        "color": "#EF4444" },
        { "value": "won",         "label": "Won",         "color": "#8B5CF6" }
      ],
      "filterable": true,
      "showInList": true
    },
    {
      "key": "assigned_to",
      "label": "Assigned To",
      "type": "relation",
      "relatedEntity": "user",
      "relatedField": "name",
      "showInList": true,
      "showInForm": true
    },
    {
      "key": "source",
      "label": "Lead Source",
      "type": "select",
      "options": [
        { "value": "website",  "label": "Website" },
        { "value": "referral", "label": "Referral" },
        { "value": "ad",       "label": "Advertisement" },
        { "value": "cold",     "label": "Cold Outreach" }
      ],
      "filterable": true,
      "showInForm": true
    },
    {
      "key": "notes",
      "label": "Notes",
      "type": "rich_text",
      "showInForm": true,
      "showInList": false
    }
  ],

  "permissions": {
    "create": "crm.leads.create",
    "read":   "crm.leads.read",
    "update": "crm.leads.update",
    "delete": "crm.leads.delete",
    "export": "crm.leads.export"
  },

  "ui": {
    "defaultSort": "created_at:desc",
    "defaultView": "table",
    "searchFields": ["name", "email", "phone"],
    "displayField": "name"
  },

  "hooks": {
    "afterCreate": ["crm.lead.created"],
    "afterUpdate": ["crm.lead.updated"]
  }
}
```

---

## Dynamic Field Extension (No Code Changes)

Context administrators can add custom fields at runtime via the Admin UI:

```
Admin Panel → CRM → Lead → Fields → Add Field

Field name:  GST Number
Field type:  text
Validation:  regex pattern
Searchable:  yes
Show in list: no
Show in form: yes
```

The Metadata Engine:
1. Stores the field definition in `entity_fields` table
2. Runs a migration to add the column to `crm.leads`
3. Creates a GIN index if `searchable: true`
4. The API immediately accepts and returns the new field
5. The form immediately shows the new input
6. The export immediately includes the new column

**Zero deployments. Zero restarts.**

---

## Metadata Engine SDK

```typescript
import { MetadataEngine } from '@orbitox/plugin-engine';

// Register an entity from your plugin
export default class CrmPlugin extends Plugin {
  async onInstall() {
    await MetadataEngine.registerEntity({
      id: 'lead',
      pluginId: 'crm',
      // ... full entity definition
    });
  }
}

// Query using metadata
const leads = await MetadataEngine.query('lead', {
  contextId,
  filters: { status: 'new' },
  sort: 'created_at:desc',
  page: 1,
  limit: 20,
});

// Get auto-generated form schema
const formSchema = await MetadataEngine.getFormSchema('lead', {
  contextId,
  mode: 'create', // or 'edit'
});

// Get auto-generated table schema
const tableSchema = await MetadataEngine.getTableSchema('lead', {
  contextId,
});
```

---

## Metadata Storage

```sql
-- Entity definitions
CREATE TABLE metadata.entities (
  id          VARCHAR(100) PRIMARY KEY,
  plugin_id   VARCHAR(100) NOT NULL,
  context_id  UUID,
  definition  JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Field definitions (including dynamic fields added at runtime)
CREATE TABLE metadata.entity_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   VARCHAR(100) NOT NULL REFERENCES metadata.entities(id),
  context_id  UUID,                         -- NULL = applies to all contexts
  definition  JSONB NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Views: cached resolved schemas per context
CREATE TABLE metadata.entity_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   VARCHAR(100) NOT NULL,
  context_id  UUID NOT NULL,
  view_type   VARCHAR(50) NOT NULL,         -- 'form', 'table', 'export'
  schema      JSONB NOT NULL,
  invalidated_at TIMESTAMPTZ
);
```

---

*Next: [Part 06 — Dynamic UI Engine](./06_Dynamic_UI_Engine.md)*

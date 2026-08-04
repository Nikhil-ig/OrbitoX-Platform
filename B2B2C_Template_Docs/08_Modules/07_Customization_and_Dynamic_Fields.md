# Customization & Dynamic Fields Module

---

## Executive Summary

Different Tenants and Companies require unique data fields (e.g. "Tax Exemption ID", "Delivery Window Preference", "Pet Name"). To avoid schema migrations for every client, the platform provides a **Dynamic Schema Builder** and **Form Rendering Engine**.

---

## 1. Dynamic Field Metadata Registry

Tenants and Companies define dynamic custom fields using a JSON Schema format stored in the database.

### Field Definition Schema

```json
{
  "entity_type": "Customer",
  "tenant_id": "tenant-005",
  "company_id": "comp-123",
  "fields": [
    {
      "key": "tax_id",
      "label": "VAT / Tax Identification Number",
      "type": "string",
      "required": true,
      "validation_regex": "^[A-Z]{2}[0-9]{9}$",
      "ui_widget": "text_input",
      "visibility": "PUBLIC"
    },
    {
      "key": "preferred_language",
      "label": "Communication Language",
      "type": "select",
      "options": ["EN", "ES", "FR", "DE"],
      "default_value": "EN",
      "ui_widget": "dropdown",
      "visibility": "PUBLIC"
    }
  ]
}
```

---

## 2. Dynamic Form Engine Rendering

The frontend UI components (React / Next.js) consume this JSON Schema directly to dynamically generate input forms with client-side and server-side validation.

```tsx
// Example Conceptual Form Component usage
<DynamicFormRenderer 
   schema={fieldMetadata.fields} 
   onSubmit={async (values) => {
       await api.post('/customers', { ...standardData, custom_fields: values });
   }} 
/>
```

---

## 3. Storage & Searching Strategy

Dynamic fields are stored in the PostgreSQL `custom_fields` `JSONB` column on the target table.

```sql
-- Querying a dynamic JSONB field efficiently
SELECT * FROM customers 
WHERE tenant_id = 'tenant-005' 
  AND custom_fields->>'tax_id' = 'GB123456789';
```

# 🪐 ORBITOX CONTROL CENTER v4.2
## Universal Editor Schema Contract

**Specification Reference**: `docs/control-plane/32_EDITOR_SCHEMA_CONTRACT.md`  
**Milestone**: v4.2 — Universal Resource Editor + Full Control  

---

## 1. Schema Contract Definition

The Universal Resource Editor renders dynamic forms, controls, and workflows based on a strict declarative contract returned by `GET /api/v1/platform/resources/:id/schema`.

```typescript
export interface ResourceEditorSchema {
  resourceType: string;
  resourceId: string;
  displayName: string;
  category: 'INFRASTRUCTURE' | 'COMPUTE' | 'IDENTITY' | 'SECURITY' | 'COMMERCIAL' | 'NETWORKING' | 'GOVERNANCE';
  version: number;
  isEditable: boolean;
  sections: EditorSection[];
  actions: ResourceActionDefinition[];
  immutableFields: string[];
  observedFields: string[];
}

export interface EditorSection {
  id: string;
  title: string;
  description?: string;
  fields: EditorFieldDefinition[];
}

export interface EditorFieldDefinition {
  key: string;
  label: string;
  description?: string;
  type: 
    | 'text'
    | 'textarea'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'enum'
    | 'multi-select'
    | 'resource-reference'
    | 'json'
    | 'code'
    | 'cron'
    | 'duration'
    | 'secret-reference';
  required?: boolean;
  defaultValue?: any;
  currentValue?: any;
  inheritedValue?: any;
  inheritedFrom?: string;
  editable: boolean;
  sensitive?: boolean;
  secret?: boolean;
  readonly?: boolean;
  options?: { label: string; value: any }[];
  targetResourceType?: string;
  dependencies?: { field: string; equals: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ResourceActionDefinition {
  id: string;
  label: string;
  description?: string;
  safetyClass: 'SAFE' | 'CONTROLLED' | 'APPROVAL_REQUIRED' | 'MANUAL_ONLY';
  requiresApproval: boolean;
  supportsDryRun: boolean;
  supportsRollback: boolean;
  allowed: boolean;
  disabledReason?: string;
  riskRating: number; // 0 to 100
}
```

---

## 2. API Contract Endpoints

### 1. `GET /api/v1/platform/resources/:id/schema`
Returns the `ResourceEditorSchema` for the target resource.

### 2. `GET /api/v1/platform/resources/:id/configuration`
Returns:
```json
{
  "resourceId": "env_omni_prod",
  "version": 4,
  "desiredState": {
    "rateLimitRpm": 3000,
    "quotaMonthly": 1500000,
    "mTLS": true
  },
  "observedState": {
    "rateLimitRpm": 3000,
    "quotaMonthly": 1500000,
    "mTLS": true,
    "status": "HEALTHY"
  },
  "inheritedState": {
    "rateLimitRpm": 5000,
    "inheritedFrom": "plan_enterprise"
  },
  "overrides": ["rateLimitRpm"]
}
```

### 3. `POST /api/v1/platform/resources/:id/preview`
Payload:
```json
{
  "changes": {
    "rateLimitRpm": 4000
  },
  "expectedVersion": 4
}
```
Response:
```json
{
  "diff": [
    { "field": "rateLimitRpm", "before": 3000, "after": 4000 }
  ],
  "impact": {
    "affectedResources": ["key_svc_01", "key_svc_02"],
    "blastRadius": 2,
    "riskRating": 40
  },
  "requiresApproval": false,
  "executionPlan": [
    { "step": 1, "description": "Update environment desired rate limit in repo" },
    { "step": 2, "description": "Trigger gateway configuration reconciliation" }
  ],
  "supportsRollback": true
}
```

### 4. `POST /api/v1/platform/resources/:id/apply`
Payload:
```json
{
  "changes": {
    "rateLimitRpm": 4000
  },
  "expectedVersion": 4,
  "reason": "Traffic surge preparation",
  "actor": "admin_jdoe"
}
```
Response:
```json
{
  "commandId": "cmd_apply_env_881",
  "status": "RECONCILING",
  "newVersion": 5,
  "reconciliation": {
    "status": "IN_PROGRESS",
    "target": "env_omni_prod"
  }
}
```

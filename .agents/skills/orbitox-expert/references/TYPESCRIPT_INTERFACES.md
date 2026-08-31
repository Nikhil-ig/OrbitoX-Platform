# 📚 OrbitoX Platform Canonical TypeScript Interfaces

> **Exact TypeScript interface definitions from the `@orbitox-io/plugin-engine` (v1.4.0) and `@orbitox-io/crm` (v1.0.1) source code.**

---

## 1. Client & Bootstrapper Interfaces (`client.ts`)

```typescript
export interface OrbitoXPluginDefinition {
  id?: string;
  name?: string;
  version?: string;
  manifest?: any;
  service?: any;
  [key: string]: any;
}

export interface CreateOrbitoXOptions {
  license?: string;
  publicKey?: string;
  domain?: string;
  activeTenantsCount?: number;
  plugins?: OrbitoXPluginDefinition[];
  strictSecurity?: boolean;
  contextId?: string;
}

export interface SecurityContext {
  isVerified: boolean;
  license?: LicensePayload;
  allowedFeatures: string[];
  tenantId?: string;
}
```

---

## 2. Multi-Tenancy & Custom Domains (`tenant-engine.ts`)

```typescript
export type DomainStatus = 'ACTIVE' | 'PENDING_DNS' | 'SUSPENDED' | 'EXPIRED';
export type TenantTier = 'starter' | 'growth' | 'pro' | 'enterprise';

export interface TenantConfig {
  tenantId: string;
  name?: string;
  domain?: string;
  subdomain?: string;
  tier?: TenantTier;
  status?: DomainStatus;
  license?: string;
  features?: string[];
  metadata?: Record<string, any>;
  customPlugins?: OrbitoXPluginDefinition[];
}

export interface MultiTenantEngineOptions {
  domains?: Record<string, TenantConfig>;
  wildcardRootDomain?: string;
  resolveTenant?: (host: string) => Promise<TenantConfig | null | undefined> | TenantConfig | null | undefined;
  plugins?: OrbitoXPluginDefinition[];
  publicKey?: string;
  strictSecurity?: boolean;
  cacheTtlMs?: number;
  defaultTenant?: TenantConfig;
}

export interface ActiveTenantSession {
  tenant: TenantConfig;
  app: OrbitoXApp;
  domain: string;
  hasFeature: (featureName: string) => boolean;
  isTier: (targetTier: TenantTier) => boolean;
  scopeData: <T extends Record<string, any>>(data: T) => T & { tenantId: string };
}
```

---

## 3. Cryptographic Security Interfaces (`security/*.ts`)

```typescript
export interface KeyPairResult {
  publicKey: string;
  privateKey: string;
}

export interface PackageFileHash {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface PackageSignature {
  algorithm: 'sha256WithRSAEncryption' | 'ed25519';
  signature: string;
  signedAt: string;
  signerId?: string;
  manifestHash: string;
  files: PackageFileHash[];
}

export interface IntegrityCheckResult {
  valid: boolean;
  signerId?: string;
  signedAt?: string;
  errors: string[];
  warnings: string[];
  verifiedFilesCount: number;
}

export interface LicensePayload {
  licenseId: string;
  issuedTo: string;
  allowedDomain?: string;
  allowedTenants?: number;
  features?: string[];
  issuedAt: string;
  expiresAt?: string;
  tier?: 'starter' | 'growth' | 'enterprise';
}

export interface SignedLicenseToken {
  payload: LicensePayload;
  signature: string;
}

export interface LicenseValidationOptions {
  currentDomain?: string;
  activeTenantsCount?: number;
  requiredFeature?: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  license?: LicensePayload;
  errors: string[];
}
```

---

## 4. Metadata & Dynamic Entity Engine (`metadata/types.ts`)

```typescript
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
```

---

## 5. CRM Domain Types (`crm/types.ts`)

```typescript
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';

export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status: LeadStatus;
  estimatedValue: number;
  score: number;
  assignedTo?: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadPayload {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  estimatedValue?: number;
  assignedTo?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadPayload {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  estimatedValue?: number;
  assignedTo?: string;
  customFields?: Record<string, unknown>;
}

export interface LeadFilter {
  status?: LeadStatus;
  search?: string;
  assignedTo?: string;
  minScore?: number;
}
```

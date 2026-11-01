export interface TenantProvisionPluginInput {
  id: string; // e.g. "hospital-os", "@orbitox/hms", "restaurant-os", "@orbitox/restaurant"
  plan?: string;
  config?: Record<string, any>;
}

export interface TenantProvisionRequest {
  organizationId?: string;
  organization?: string;
  name: string;
  slug: string;
  environment?: string; // defaults to "production"
  plugins: TenantProvisionPluginInput[];
  region?: string;
}

export type OperationStatus =
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type OperationStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export interface OperationStep {
  id: string; // '1'..'7'
  name: string;
  status: OperationStepStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  retryCount?: number;
}

export interface PlatformOperationRecord {
  id: string; // op_...
  type: string;
  tenantId: string;
  organizationId: string;
  idempotencyKey?: string | null;
  status: OperationStatus;
  steps: OperationStep[];
  request: Record<string, any>;
  result?: Record<string, any> | null;
  error?: string | null;
  operatorId?: string | null;
  requestId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

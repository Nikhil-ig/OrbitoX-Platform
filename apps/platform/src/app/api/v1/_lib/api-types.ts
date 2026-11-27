export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  meta?: {
    tenantId?: string;
    serviceId?: string;
    latencyMs: number;
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export type RouteClass = 'platform-admin' | 'customer' | 'public';

export interface ApiGuardOptions {
  serviceId?: string;
  serviceName?: string;
  requiredScopes?: string[];
  scopeMode?: 'all' | 'any';
  routeClass?: RouteClass;
  requireAuth?: boolean;
  rateLimitPerMin?: number;
  allowPublic?: boolean;
}

export interface ApiRequestContext {
  tenantId: string;
  tenantName?: string;
  categorySlug?: string;
  serviceId: string;
  sub?: string;
  keyId?: string;
  maskedKeyDisplay?: string;
  actorLabel?: string;
  authMethod?: 'api_key' | 'admin_token' | 'operator_session' | 'public';
  operatorId?: string;
  keyPrefix?: string;
  environment?: 'production' | 'staging' | 'sandbox' | string;
  scopes: string[];
  capabilities?: string[];
  projectId?: string;
  environmentId?: string;
  grant?: any;
  clientIp: string;
  userAgent: string;
  requestId: string;
  startTime: number;
}

import { NextRequest, NextResponse } from 'next/server';

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
  requestId: string;
}

export interface StandardApiResponse<T = any> {
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

export interface ApiGuardOptions {
  /**
   * If true, route allows unauthenticated access.
   * Public callers receive scopes: [], NEVER ['*'].
   * Default: false (DEFAULT DENY).
   */
  public?: boolean;
  /**
   * @deprecated Deprecated alias for `public`.
   */
  allowPublic?: boolean;
  /**
   * @deprecated Retained for backwards compatibility. All routes require auth unless public: true.
   */
  requireAuth?: boolean;
  /**
   * Scopes required to invoke this endpoint (e.g. 'platform.credentials.read').
   */
  requiredScopes?: string[];
  serviceId?: string;
  serviceName?: string;
  rateLimitPerMin?: number;
  adminStepUp?: boolean;
}

export interface ApiRequestContext {
  tenantId: string;
  tenantName?: string;
  categorySlug?: string;
  serviceId: string;
  apiKeyId?: string;
  keyPrefix?: string;
  environment: 'production' | 'staging' | 'sandbox' | string;
  scopes: string[];
  capabilities: string[];
  isRoot: boolean;
  projectId?: string;
  environmentId?: string;
  clientIp: string;
  userAgent: string;
  requestId: string;
  startTime: number;
}

export interface HashedApiKeyRecord {
  id: string;
  name: string;
  keyId: string;
  authVerifier: string;
  keyPrefix: string;
  maskedKey: string;
  environment: 'production' | 'staging' | 'sandbox' | string;
  scopes: string[];
  capabilities: string[];
  isRoot: boolean;
  ipAllowlist?: string[];
  tenantScope?: string[];
  projectId?: string;
  environmentId?: string;
  status: 'active' | 'blocked' | 'revoked' | 'expired' | 'grace_period';
  expiresAt?: string | null;
  graceExpiresAt?: string | null;
  rotatedToKeyId?: string;
  createdAt: string;
  lastUsedAt: string;
  rateLimitPerMin: number;
}

export type RouteHandler = (
  req: NextRequest,
  context: ApiRequestContext
) => Promise<NextResponse | Response> | NextResponse | Response;

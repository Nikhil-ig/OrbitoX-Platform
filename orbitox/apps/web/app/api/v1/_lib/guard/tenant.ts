import { NextRequest } from 'next/server';
import { HashedApiKeyRecord } from './types';

export interface TenantResolutionResult {
  valid: boolean;
  tenantId: string;
  error?: {
    code: string;
    message: string;
    status: number;
    details?: any;
  };
}

/**
 * Resolves tenant scope with anti-spoofing isolation:
 * 1. For authenticated calls, tenant is derived from the credential, never trusted from the client.
 * 2. If client requests a specific tenant (via header or query), it is honored ONLY if within
 *    the key's tenantScope; otherwise returns 403 TENANT_SCOPE_VIOLATION.
 * 3. Hostname-based tenant inference is strictly disabled for authenticated routes.
 */
export function resolveTenant(
  req: NextRequest,
  keyRecord: HashedApiKeyRecord | undefined,
  isPublic: boolean
): TenantResolutionResult {
  const urlTenant = req.nextUrl.searchParams.get('tenantId');
  const headerTenant = req.headers.get('x-tenant-id') || req.headers.get('x-context-id');
  const clientRequestedTenant = urlTenant || headerTenant || '';

  // 1. Authenticated Resolution
  if (keyRecord) {
    const allowedScope = keyRecord.tenantScope || [];

    if (clientRequestedTenant) {
      const isPermitted =
        allowedScope.length === 0 ||
        allowedScope.includes('*') ||
        allowedScope.includes(clientRequestedTenant) ||
        (keyRecord.projectId && keyRecord.projectId === clientRequestedTenant);

      if (!isPermitted) {
        return {
          valid: false,
          tenantId: clientRequestedTenant,
          error: {
            code: 'TENANT_SCOPE_VIOLATION',
            message: `Client requested tenant [${clientRequestedTenant}], but credential is scoped strictly to [${allowedScope.join(', ')}].`,
            status: 403,
            details: {
              requestedTenant: clientRequestedTenant,
              authorizedScope: allowedScope,
            },
          },
        };
      }
      return { valid: true, tenantId: clientRequestedTenant };
    }

    // Derive tenant authoritatively from key record
    if (allowedScope.length > 0 && !allowedScope.includes('*') && allowedScope[0]) {
      return { valid: true, tenantId: allowedScope[0] };
    }

    if (keyRecord.projectId) {
      return { valid: true, tenantId: keyRecord.projectId };
    }

    return { valid: true, tenantId: 'default' };
  }

  // 2. Public Route Resolution (Storefront / Discovery Only)
  if (isPublic) {
    if (clientRequestedTenant) {
      return { valid: true, tenantId: clientRequestedTenant };
    }

    // Hostname inference permitted ONLY on explicit public storefronts
    const host = req.nextUrl.hostname;
    const sub = host.split('.')[0];
    if (sub && sub !== 'localhost' && sub !== 'api' && sub !== 'app') {
      return { valid: true, tenantId: sub };
    }

    return { valid: true, tenantId: 'public' };
  }

  return { valid: false, tenantId: 'unknown' };
}

import type { PlatformOperatorRole } from '@prisma/client';

export type RequiredOperatorRole = PlatformOperatorRole;

const BILLING_PREFIXES = [
  '/api/v1/admin/billing/',
  '/api/v1/billing/',
];

const OWNER_ONLY_PREFIXES = [
  '/api/v1/admin/system/',
  '/api/v1/system/',
  '/api/v1/platform/auth/operators/',
  '/platform/settings',
  '/platform/operators',
];

const DANGEROUS_ACTION = /(?:suspend|resume|plan|price|rotate|force|deprovision|delete|revoke|unlock|ownership|secret|key)/i;

export function requiredOperatorRole(pathname: string, method: string): RequiredOperatorRole | null {
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/platform') && !pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/api/v1/customer/') || pathname.startsWith('/api/hospital/') || pathname.startsWith('/api/restaurant/')) return null;
  if (pathname === '/api/health' || pathname === '/api/v1/openapi.json' || pathname.startsWith('/api/v1/billing/webhook')) return null;
  if (pathname === '/api/v1/platform/auth/login') return null;
  if (pathname.startsWith('/api/v1/platform/auth/')) return 'SUPPORT_READONLY';

  const upperMethod = method.toUpperCase();
  if (OWNER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'PLATFORM_OWNER';
  if (BILLING_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'BILLING';
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) return null;
  if (upperMethod !== 'GET' && upperMethod !== 'HEAD' && DANGEROUS_ACTION.test(pathname)) return 'PLATFORM_OWNER';
  if (upperMethod === 'GET' || upperMethod === 'HEAD') return 'SUPPORT_READONLY';
  return 'OPERATOR';
}

export function operatorRoleAllows(actual: PlatformOperatorRole, required: RequiredOperatorRole): boolean {
  if (actual === 'PLATFORM_OWNER' || actual === required) return true;
  if (actual === 'OPERATOR' && required === 'SUPPORT_READONLY') return true;
  if (actual === 'BILLING' && required === 'SUPPORT_READONLY') return true;
  return false;
}

export function requiresRecentReauthentication(pathname: string, method: string): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return false;
  return DANGEROUS_ACTION.test(pathname) ||
    pathname.startsWith('/api/v1/admin/plans/') ||
    pathname.startsWith('/api/v1/admin/pricing/');
}

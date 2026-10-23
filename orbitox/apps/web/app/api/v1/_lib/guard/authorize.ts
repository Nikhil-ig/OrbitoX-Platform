import { HashedApiKeyRecord, ApiGuardOptions } from './types';

/**
 * Checks if a client IP address satisfies an allowlist of IPs and CIDR ranges.
 */
export function isIpAllowed(clientIp: string, allowlist?: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return false;
  if (allowlist.includes('*') || allowlist.includes('0.0.0.0/0')) return true;

  const normClient = clientIp === '::1' ? '127.0.0.1' : clientIp;

  return allowlist.some((rule) => {
    const trimmed = rule.trim();
    if (trimmed === normClient || trimmed === clientIp) return true;

    if (trimmed.endsWith('/32')) {
      const single = trimmed.replace('/32', '');
      return single === normClient || single === clientIp;
    }

    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const subnet = parts[0];
        const mask = parseInt(parts[1], 10);
        const subParts = subnet.split('.').map(Number);
        const ipParts = normClient.split('.').map(Number);

        if (subParts.length === 4 && ipParts.length === 4 && !isNaN(mask)) {
          if (mask === 24) {
            return subParts[0] === ipParts[0] && subParts[1] === ipParts[1] && subParts[2] === ipParts[2];
          }
          if (mask === 16) {
            return subParts[0] === ipParts[0] && subParts[1] === ipParts[1];
          }
          if (mask === 8) {
            return subParts[0] === ipParts[0];
          }
        }
      }
    }
    return false;
  });
}

/**
 * Checks if granted scopes satisfy a required scope.
 * Wildcard '*' is honored ONLY for keys with isRoot === true.
 */
export function checkScope(
  grantedScopes: string[],
  requiredScope: string,
  isRoot: boolean
): boolean {
  if (isRoot && grantedScopes.includes('*')) {
    return true;
  }

  // Exact match
  if (grantedScopes.includes(requiredScope)) {
    return true;
  }

  // Hierarchical wildcard match (e.g. 'platform.credentials.*' matches 'platform.credentials.read')
  const reqParts = requiredScope.split('.');
  return grantedScopes.some((granted) => {
    const grantedParts = granted.split('.');
    if (grantedParts.length !== reqParts.length) return false;
    for (let i = 0; i < grantedParts.length; i++) {
      if (grantedParts[i] === '*') return true;
      if (grantedParts[i] !== reqParts[i]) return false;
    }
    return true;
  });
}

export interface AuthorizationResult {
  authorized: boolean;
  effectiveScopes: string[];
  error?: {
    code: string;
    message: string;
    status: number;
    details?: any;
  };
}

/**
 * Evaluates route authorization policy:
 * 1. Enforces Default-Deny: public routes must be explicitly declared.
 * 2. Scopes are mandatory when declared.
 * 3. Root keys require strict IP allowlist validation.
 * 4. Public callers get scopes: [], never ['*'].
 */
export function authorizeRequest(
  options: ApiGuardOptions,
  keyRecord: HashedApiKeyRecord | undefined,
  clientIp: string
): AuthorizationResult {
  const isPublic = Boolean(options.public ?? options.allowPublic ?? false);

  // If route is public
  if (isPublic) {
    return {
      authorized: true,
      // Invariant: public callers get empty scopes, never wildcard ['*']
      effectiveScopes: keyRecord ? keyRecord.scopes : [],
    };
  }

  // Route requires authentication
  if (!keyRecord) {
    return {
      authorized: false,
      effectiveScopes: [],
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. This route is not public.',
        status: 401,
      },
    };
  }

  // Root Key Guard: Wildcard '*' permitted only if isRoot: true, and root keys MUST pass IP allowlist
  if (keyRecord.isRoot) {
    if (!keyRecord.ipAllowlist || keyRecord.ipAllowlist.length === 0 || !isIpAllowed(clientIp, keyRecord.ipAllowlist)) {
      return {
        authorized: false,
        effectiveScopes: [],
        error: {
          code: 'IP_FORBIDDEN',
          message: `Root API key usage from IP [${clientIp}] is forbidden. IP address is not authorized in IP allowlist.`,
          status: 403,
          details: { clientIp, requiredAllowlist: keyRecord.ipAllowlist || [] },
        },
      };
    }
  }

  // Scopes are mandatory when declared
  if (options.requiredScopes && options.requiredScopes.length > 0) {
    const grantedScopes = keyRecord.scopes || [];
    const missingScopes = options.requiredScopes.filter(
      (reqScope) => !checkScope(grantedScopes, reqScope, keyRecord.isRoot)
    );

    if (missingScopes.length > 0) {
      return {
        authorized: false,
        effectiveScopes: grantedScopes,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: `Credential lacks required scopes: ${missingScopes.join(', ')}`,
          status: 403,
          details: {
            required: options.requiredScopes,
            missing: missingScopes,
            granted: grantedScopes,
          },
        },
      };
    }
  }

  return {
    authorized: true,
    effectiveScopes: keyRecord.scopes,
  };
}

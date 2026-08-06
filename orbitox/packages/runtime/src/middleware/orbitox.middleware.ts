import { ContextFacade } from '../facades/context.facade';
import { SecurityFacade } from '../facades/security.facade';
import { AuditFacade } from '../facades/audit.facade';

export interface MiddlewareOptions {
  enforceAuth?: boolean;
  strictDomainProtection?: boolean;
  requireContext?: boolean;
  baseDomain?: string;
  headerKeys?: string[];
}

export function createMiddleware(
  contextFacade: ContextFacade, 
  securityFacade: SecurityFacade,
  auditFacade: AuditFacade,
  options: MiddlewareOptions = {}
) {
  const headerKeys = options.headerKeys || ['x-tenant-id', 'x-org-id', 'x-context-id'];

  return async (req: any, res: any, next: (err?: any) => void) => {
    try {
      let resolvedIdentifier: string | undefined;

      // 1. Check Multi-Headers (x-tenant-id, x-org-id, x-context-id)
      for (const key of headerKeys) {
        const val = req.headers[key] || req.headers[key.toLowerCase()];
        if (val) {
          resolvedIdentifier = Array.isArray(val) ? val[0] : val;
          break;
        }
      }

      // 2. Fallback to Host / Subdomain extraction if header is absent
      if (!resolvedIdentifier) {
        const hostHeader = req.headers['x-forwarded-host'] || req.headers['host'] || '';
        const hostname = hostHeader.split(':')[0].trim();

        if (hostname) {
          if (options.baseDomain && hostname.endsWith(options.baseDomain)) {
            // Extract subdomain: e.g. "acme.orbitox.com" -> "acme"
            const sub = hostname.replace(`.${options.baseDomain}`, '').replace(options.baseDomain, '');
            if (sub && sub !== 'www' && sub !== 'api') {
              resolvedIdentifier = sub;
            }
          } else if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Direct custom domain lookup (e.g. "acme-store.com")
            resolvedIdentifier = hostname;
          }
        }
      }

      // Default fallback if open/unrestricted
      const targetId = resolvedIdentifier || 'global';
      const ctx = contextFacade.get(targetId);

      // 3. Mandatory Domain / Header Protection Gate
      if ((options.strictDomainProtection || options.requireContext) && !ctx) {
        return res.status(403).json({ 
          error: 'Forbidden: Invalid or unresolvable tenant context identifier',
          providedIdentifier: resolvedIdentifier || null
        });
      }

      // 4. Inactive / Suspended Tenant Protection Gate
      if (ctx && ctx.status && ctx.status !== 'active') {
        return res.status(403).json({
          error: 'Forbidden: Tenant account is suspended or inactive',
          status: ctx.status
        });
      }

      req.orbitoxContext = ctx || { id: targetId, type: 'unknown', status: 'active' };
      
      // 5. Auth Token Validation
      let userId = 'system';
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
         userId = authHeader.split(' ')[1];
      }
      
      if (options.enforceAuth && !authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
      }

      req.orbitoxUser = { id: userId };

      // 6. Automated Audit Trail Logging
      if (req.method !== 'GET') {
         await auditFacade.log({
           action: `API_${req.method}`,
           entityId: req.originalUrl || req.url,
           entityType: 'Endpoint',
           userId: userId,
           contextId: req.orbitoxContext.id,
           ipAddress: req.ip || req.connection?.remoteAddress,
         });
      }

      next();
    } catch (err: any) {
      console.error('[OrbitoX Middleware] Security Gate Error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

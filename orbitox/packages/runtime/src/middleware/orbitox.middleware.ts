import { ContextFacade } from '../facades/context.facade';
import { SecurityFacade } from '../facades/security.facade';
import { AuditFacade } from '../facades/audit.facade';

export interface MiddlewareOptions {
  enforceAuth?: boolean;
}

export function createMiddleware(
  contextFacade: ContextFacade, 
  securityFacade: SecurityFacade,
  auditFacade: AuditFacade,
  options: MiddlewareOptions = {}
) {
  return async (req: any, res: any, next: (err?: any) => void) => {
    try {
      // 1. Resolve Context
      const contextId = req.headers['x-tenant-id'] || req.headers['x-context-id'] || 'global';
      const ctx = contextFacade.get(contextId);
      
      req.orbitoxContext = ctx || { id: contextId, type: 'unknown' };
      
      // 2. Auth Validation (Mock extraction for now)
      let userId = 'system';
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
         // Naive mock token parsing for demonstration
         userId = authHeader.split(' ')[1];
      }
      
      if (options.enforceAuth && !authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
      }

      req.orbitoxUser = { id: userId };

      // 3. Log Audit Trail for API Request
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
      console.error('[OrbitoX Middleware] Error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

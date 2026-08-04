import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ContextResolver } from './context-resolver';
import { ContextRepository } from './context.repository';

/**
 * Intercepts incoming requests, resolves the context, 
 * validates it, and injects it into the request object.
 */
@Injectable()
export class ContextInterceptor implements NestInterceptor {
  constructor(
    private readonly resolver: ContextResolver,
    private readonly repository: ContextRepository,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    try {
      // 1. Resolve context ID
      const resolution = await this.resolver.resolve(request);
      
      // 2. Load context from DB/Cache
      const dbContext = await this.repository.findById(resolution.contextId);
      
      if (!dbContext) {
        throw new UnauthorizedException('Invalid Context');
      }

      if (dbContext.status !== 'active') {
        throw new UnauthorizedException(`Context is ${dbContext.status}`);
      }

      // 3. Build RequestContext and inject it
      request.context = {
        contextId: dbContext.id,
        contextType: dbContext.type,
        userId: request.user?.id || null, // from AuthGuard
        tenantId: this.extractTenantId(dbContext.path), 
        organisationId: this.extractOrgId(dbContext.path),
        permissions: request.user?.permissions || [],
        plugins: dbContext.plugins,
        locale: dbContext.locale,
        theme: dbContext.theme,
        subscription: { subscriptionId: dbContext.subscriptionId, planId: dbContext.planId },
        features: dbContext.features
      };

    } catch (error) {
       throw new UnauthorizedException(error instanceof Error ? error.message : 'Context resolution failed');
    }

    return next.handle();
  }

  private extractTenantId(path: string): string | null {
     // Simplified LTREE extraction (Mock)
     return null;
  }
  
  private extractOrgId(path: string): string | null {
      return null;
  }
}

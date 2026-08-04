import { Injectable, Scope } from '@nestjs/common';
import { RequestContext } from '@orbitox/types';

/**
 * Provides access to the current RequestContext.
 * Scoped to the current request (Scope.REQUEST).
 */
@Injectable({ scope: Scope.REQUEST })
export class ContextService {
  private requestContext: RequestContext | null = null;

  /**
   * Called by the ContextInterceptor to inject the resolved context
   */
  setContext(context: RequestContext): void {
    this.requestContext = context;
  }

  /**
   * Retrieves the current context. Throws if accessed outside of a valid request scope.
   */
  current(): RequestContext {
    if (!this.requestContext) {
      throw new Error(
        'Context not resolved. Ensure this is called within a request scope and after ContextInterceptor.',
      );
    }
    return this.requestContext;
  }
}

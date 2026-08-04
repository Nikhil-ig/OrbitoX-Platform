import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '@orbitox/types';

/**
 * Injects the current RequestContext into controller methods.
 * @example
 * @Get()
 * getLeads(@CurrentContext() ctx: RequestContext) { ... }
 */
export const CurrentContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.context) {
      throw new Error('RequestContext not found on request object');
    }
    return request.context as RequestContext;
  },
);

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { RbacService } from '../rbac.service';
import { Request } from 'express';
import { JwtPayload, PermissionCheck } from '@orbitox/types';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload;
    
    // In Orbitox, ContextInterceptor puts contextId on the request
    const contextId = (request as any).contextId;

    if (!user || !user.sub) {
      throw new ForbiddenException('User not authenticated');
    }
    
    if (!contextId) {
       throw new ForbiddenException('Context not resolved');
    }

    const check: PermissionCheck = {
      userId: user.sub,
      contextId: contextId,
      permission: requiredPermission,
      resourceId: request.params.id as string | undefined,
    };

    // Note: for deep ABAC checks involving request body (e.g., input data),
    // you might pass request.body as the `entity`.
    return await this.rbacService.authorize(check, request.body);
  }
}

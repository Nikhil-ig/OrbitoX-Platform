import { Module, Global } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RoleService } from './role.service';
import { PermissionRegistry } from './permission.registry';
import { PolicyEngine } from './policy.engine';
import { PermissionGuard } from './guards/permission.guard';

@Global()
@Module({
  providers: [
    RbacService,
    RoleService,
    PermissionRegistry,
    PolicyEngine,
    PermissionGuard,
  ],
  exports: [
    RbacService,
    RoleService,
    PermissionRegistry,
    PolicyEngine,
    PermissionGuard,
  ],
})
export class RbacModule {}

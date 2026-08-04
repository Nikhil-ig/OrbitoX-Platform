import { Injectable, Logger } from '@nestjs/common';
import { Permission } from '@orbitox/types';

@Injectable()
export class PermissionRegistry {
  private readonly logger = new Logger(PermissionRegistry.name);
  private readonly permissions = new Map<string, Permission>();
  private readonly pluginPermissions = new Map<string, Set<string>>();

  /**
   * Registers a list of permissions from a plugin
   */
  register(pluginId: string, permissions: Omit<Permission, 'pluginId'>[]): void {
    if (!this.pluginPermissions.has(pluginId)) {
      this.pluginPermissions.set(pluginId, new Set());
    }

    const pluginSet = this.pluginPermissions.get(pluginId)!;

    for (const perm of permissions) {
      const fullPerm: Permission = { ...perm, pluginId };
      
      if (this.permissions.has(fullPerm.key)) {
        this.logger.warn(`Permission key '${fullPerm.key}' is already registered and will be overwritten.`);
      }

      this.permissions.set(fullPerm.key, fullPerm);
      pluginSet.add(fullPerm.key);
    }

    this.logger.debug(`Registered ${permissions.length} permissions for plugin '${pluginId}'`);
  }

  /**
   * Gets a specific permission by key
   */
  get(key: string): Permission | undefined {
    return this.permissions.get(key);
  }

  /**
   * Gets all permissions for a plugin
   */
  getForPlugin(pluginId: string): Permission[] {
    const keys = this.pluginPermissions.get(pluginId);
    if (!keys) return [];
    
    return Array.from(keys)
      .map(key => this.permissions.get(key))
      .filter((p): p is Permission => p !== undefined);
  }

  /**
   * Gets all registered permissions
   */
  getAll(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Validates if a permission key exists
   */
  exists(key: string): boolean {
    return this.permissions.has(key);
  }
}

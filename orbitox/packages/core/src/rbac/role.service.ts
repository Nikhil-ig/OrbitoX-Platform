import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@orbitox/types';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions: string[];
  inheritsFrom?: string[];
}

@Injectable()
export class RoleService {
  // In-memory mock for core package development
  // A real implementation would inject a repository
  private roles = new Map<string, Role>();

  async createRole(contextId: string, data: CreateRoleDto): Promise<Role> {
    const roleId = uuidv4();
    const role: Role = {
      id: roleId,
      contextId,
      name: data.name,
      description: data.description || '',
      permissions: data.permissions,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // We would store inheritsFrom in a join table or array column
    (role as any).inheritsFrom = data.inheritsFrom || [];

    this.roles.set(roleId, role);
    return role;
  }

  async getRole(roleId: string): Promise<Role> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }
    return role;
  }

  /**
   * Gets all permissions for a role, resolving inheritance recursively
   */
  async getEffectivePermissions(roleId: string, resolvedRoles = new Set<string>()): Promise<string[]> {
    if (resolvedRoles.has(roleId)) {
      return []; // Prevent circular inheritance
    }
    resolvedRoles.add(roleId);

    const role = await this.getRole(roleId);
    let perms = new Set<string>(role.permissions);

    const inheritsFrom: string[] = (role as any).inheritsFrom || [];
    for (const parentId of inheritsFrom) {
      const parentPerms = await this.getEffectivePermissions(parentId, resolvedRoles);
      parentPerms.forEach(p => perms.add(p));
    }

    return Array.from(perms);
  }

  async getUserRoles(userId: string, contextId: string): Promise<string[]> {
    // Mock: return empty or a default role ID
    return [];
  }
}

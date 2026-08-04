import { Injectable, Logger } from '@nestjs/common';
import { PluginMenuItem } from '@orbitox/sdk';

@Injectable()
export class MenuRegistry {
  private readonly logger = new Logger(MenuRegistry.name);
  private readonly menusByContext = new Map<string, PluginMenuItem[]>();

  register(contextId: string, pluginId: string, items: PluginMenuItem[]): void {
    this.logger.log(`Registering ${items.length} menu items for plugin ${pluginId} in context ${contextId}`);
    const existing = this.menusByContext.get(contextId) || [];
    this.menusByContext.set(contextId, [...existing, ...items]);
  }

  getMenus(contextId: string): PluginMenuItem[] {
    return this.menusByContext.get(contextId) || [];
  }
}

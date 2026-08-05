import { Injectable, Logger } from '@nestjs/common';
import { PluginMenuItem } from '@orbitox/sdk';

@Injectable()
export class MenuRegistry {
  private readonly logger = new Logger(MenuRegistry.name);
  private readonly menusByContextPlugin = new Map<string, Map<string, PluginMenuItem[]>>();

  register(contextId: string, pluginId: string, items: PluginMenuItem[]): void {
    this.logger.log(`Registering ${items.length} menu items for plugin ${pluginId} in context ${contextId}`);
    if (!this.menusByContextPlugin.has(contextId)) {
      this.menusByContextPlugin.set(contextId, new Map());
    }
    this.menusByContextPlugin.get(contextId)!.set(pluginId, items);
  }

  getMenus(contextId: string): PluginMenuItem[] {
    const pluginMaps = this.menusByContextPlugin.get(contextId);
    if (!pluginMaps) return [];
    let all: PluginMenuItem[] = [];
    for (const items of pluginMaps.values()) {
      all = all.concat(items);
    }
    return all;
  }

  deregister(contextId: string, pluginId: string): void {
    const pluginMaps = this.menusByContextPlugin.get(contextId);
    if (pluginMaps) {
      pluginMaps.delete(pluginId);
      this.logger.log(`Deregistered menu items for plugin ${pluginId} in context ${contextId}`);
    }
  }
}

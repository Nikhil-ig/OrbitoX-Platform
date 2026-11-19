import { Injectable, Logger } from '@nestjs/common';
import { PluginPageItem } from '../metadata/types';

@Injectable()
export class PageRegistry {
  private readonly logger = new Logger(PageRegistry.name);
  private readonly pagesByContextPlugin = new Map<string, Map<string, PluginPageItem[]>>();

  register(contextId: string, pluginId: string, pages: PluginPageItem[]): void {
    this.logger.log(`Registering ${pages.length} pages for plugin ${pluginId} in context ${contextId}`);
    if (!this.pagesByContextPlugin.has(contextId)) {
      this.pagesByContextPlugin.set(contextId, new Map());
    }
    this.pagesByContextPlugin.get(contextId)!.set(pluginId, pages);
  }

  getPages(contextId: string): PluginPageItem[] {
    const pluginMaps = this.pagesByContextPlugin.get(contextId);
    if (!pluginMaps) return [];
    let all: PluginPageItem[] = [];
    for (const pages of pluginMaps.values()) {
      all = all.concat(pages);
    }
    return all;
  }

  deregister(contextId: string, pluginId: string): void {
    const pluginMaps = this.pagesByContextPlugin.get(contextId);
    if (pluginMaps) {
      pluginMaps.delete(pluginId);
      this.logger.log(`Deregistered pages for plugin ${pluginId} in context ${contextId}`);
    }
  }
}

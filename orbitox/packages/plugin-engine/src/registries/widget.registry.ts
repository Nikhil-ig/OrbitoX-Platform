import { Injectable, Logger } from '@nestjs/common';
import { PluginWidgetItem } from '@orbitox/sdk';

@Injectable()
export class WidgetRegistry {
  private readonly logger = new Logger(WidgetRegistry.name);
  private readonly widgetsByContextPlugin = new Map<string, Map<string, PluginWidgetItem[]>>();

  register(contextId: string, pluginId: string, widgets: PluginWidgetItem[]): void {
    this.logger.log(`Registering ${widgets.length} widgets for plugin ${pluginId} in context ${contextId}`);
    if (!this.widgetsByContextPlugin.has(contextId)) {
      this.widgetsByContextPlugin.set(contextId, new Map());
    }
    this.widgetsByContextPlugin.get(contextId)!.set(pluginId, widgets);
  }

  getWidgets(contextId: string): PluginWidgetItem[] {
    const pluginMaps = this.widgetsByContextPlugin.get(contextId);
    if (!pluginMaps) return [];
    let all: PluginWidgetItem[] = [];
    for (const widgets of pluginMaps.values()) {
      all = all.concat(widgets);
    }
    return all;
  }

  deregister(contextId: string, pluginId: string): void {
    const pluginMaps = this.widgetsByContextPlugin.get(contextId);
    if (pluginMaps) {
      pluginMaps.delete(pluginId);
      this.logger.log(`Deregistered widgets for plugin ${pluginId} in context ${contextId}`);
    }
  }
}

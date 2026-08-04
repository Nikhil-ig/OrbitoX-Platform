import { Injectable, Logger } from '@nestjs/common';
import { PluginWidgetItem } from '@orbitox/sdk';

@Injectable()
export class WidgetRegistry {
  private readonly logger = new Logger(WidgetRegistry.name);
  private readonly widgetsByContext = new Map<string, PluginWidgetItem[]>();

  register(contextId: string, pluginId: string, widgets: PluginWidgetItem[]): void {
    this.logger.log(`Registering ${widgets.length} widgets for plugin ${pluginId} in context ${contextId}`);
    const existing = this.widgetsByContext.get(contextId) || [];
    this.widgetsByContext.set(contextId, [...existing, ...widgets]);
  }

  getWidgets(contextId: string): PluginWidgetItem[] {
    return this.widgetsByContext.get(contextId) || [];
  }
}

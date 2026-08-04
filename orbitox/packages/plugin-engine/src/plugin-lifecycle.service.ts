import { Injectable, Logger } from '@nestjs/common';
import { PermissionRegistry, EventBusService } from '@orbitox/core';
import { PluginLoaderService } from './plugin-loader.service';
import { MenuRegistry } from './registries/menu.registry';
import { PageRegistry } from './registries/page.registry';
import { WidgetRegistry } from './registries/widget.registry';

@Injectable()
export class PluginLifecycleService {
  private readonly logger = new Logger(PluginLifecycleService.name);

  constructor(
    private readonly loader: PluginLoaderService,
    private readonly permissionRegistry: PermissionRegistry,
    private readonly menuRegistry: MenuRegistry,
    private readonly pageRegistry: PageRegistry,
    private readonly widgetRegistry: WidgetRegistry,
    private readonly eventBus: EventBusService,
  ) {}

  async installPlugin(pluginId: string, contextId: string): Promise<void> {
    const loaded = this.loader.getPlugin(pluginId);
    if (!loaded) {
      throw new Error(`Plugin ${pluginId} is not loaded in runtime`);
    }

    const { manifest } = loaded;
    this.logger.log(`Installing plugin ${manifest.name} for context ${contextId}`);

    // 1. Register permissions
    if (manifest.permissions && manifest.permissions.length > 0) {
      const formattedPermissions = manifest.permissions.map((permKey) => ({
        key: permKey,
        name: permKey,
        description: `Permission ${permKey} from plugin ${manifest.id}`,
      }));
      this.permissionRegistry.register(manifest.id, formattedPermissions);
    }

    // 2. Register UI components
    if (manifest.menus) {
      this.menuRegistry.register(contextId, manifest.id, manifest.menus);
    }
    if (manifest.pages) {
      this.pageRegistry.register(contextId, manifest.id, manifest.pages);
    }
    if (manifest.widgets) {
      this.widgetRegistry.register(contextId, manifest.id, manifest.widgets);
    }

    // 3. Emit platform event
    await this.eventBus.emit(
      'platform.plugin.installed',
      { pluginId: manifest.id, version: manifest.version },
      contextId,
      'PluginLifecycleService'
    );

    this.logger.log(`Successfully activated plugin ${manifest.id} for context ${contextId}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PermissionRegistry, EventBusService, ActionRegistry } from '@orbitox/core';
import { PluginLoaderService } from './plugin-loader.service';
import { MenuRegistry } from './registries/menu.registry';
import { PageRegistry } from './registries/page.registry';
import { WidgetRegistry } from './registries/widget.registry';
import { MetadataEngine } from './metadata/metadata.engine';

@Injectable()
export class PluginLifecycleService {
  private readonly logger = new Logger(PluginLifecycleService.name);

  constructor(
    private readonly loader: PluginLoaderService,
    private readonly permissionRegistry: PermissionRegistry,
    private readonly menuRegistry: MenuRegistry,
    private readonly pageRegistry: PageRegistry,
    private readonly widgetRegistry: WidgetRegistry,
    private readonly actionRegistry: ActionRegistry,
    private readonly metadataEngine: MetadataEngine,
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
    if (manifest.agenticActions) {
      this.actionRegistry.register(contextId, manifest.id, manifest.agenticActions);
    }
    if (manifest.entities) {
      manifest.entities.forEach(entity => {
        // Associate the entity with the current context before registering
        const contextEntity = { ...entity, contextId };
        this.metadataEngine.registerEntity(contextEntity);
      });
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

  async upgradePlugin(pluginId: string, targetVersion: string, contextId: string): Promise<void> {
    this.logger.log(`Upgrading plugin ${pluginId} to version ${targetVersion} for context ${contextId}`);
    
    // In a real system, we would fetch the new bundle. Here we simulate re-registering
    // with the latest loaded manifest.
    
    // First, deregister existing components
    this.permissionRegistry.deregister(pluginId);
    this.menuRegistry.deregister(contextId, pluginId);
    this.pageRegistry.deregister(contextId, pluginId);
    this.widgetRegistry.deregister(contextId, pluginId);
    this.actionRegistry.deregister(contextId, pluginId);

    // Re-install
    await this.installPlugin(pluginId, contextId);

    await this.eventBus.emit(
      'platform.plugin.upgraded',
      { pluginId, version: targetVersion },
      contextId,
      'PluginLifecycleService'
    );
  }

  async rollbackPlugin(pluginId: string, targetVersion: string, contextId: string): Promise<void> {
    this.logger.log(`Rolling back plugin ${pluginId} to version ${targetVersion} for context ${contextId}`);
    
    this.permissionRegistry.deregister(pluginId);
    this.menuRegistry.deregister(contextId, pluginId);
    this.pageRegistry.deregister(contextId, pluginId);
    this.widgetRegistry.deregister(contextId, pluginId);
    this.actionRegistry.deregister(contextId, pluginId);

    await this.installPlugin(pluginId, contextId);

    await this.eventBus.emit(
      'platform.plugin.rollbacked',
      { pluginId, version: targetVersion },
      contextId,
      'PluginLifecycleService'
    );
  }

  async uninstallPlugin(pluginId: string, contextId: string): Promise<void> {
    this.logger.log(`Uninstalling plugin ${pluginId} for context ${contextId}`);
    
    this.permissionRegistry.deregister(pluginId);
    this.menuRegistry.deregister(contextId, pluginId);
    this.pageRegistry.deregister(contextId, pluginId);
    this.widgetRegistry.deregister(contextId, pluginId);
    this.actionRegistry.deregister(contextId, pluginId);

    await this.eventBus.emit(
      'platform.plugin.uninstalled',
      { pluginId },
      contextId,
      'PluginLifecycleService'
    );

    this.logger.log(`Successfully uninstalled plugin ${pluginId} for context ${contextId}`);
  }
}

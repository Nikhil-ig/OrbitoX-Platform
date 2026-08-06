import { Injectable, Logger } from '@nestjs/common';
import { PluginManifest, ORBITOX_PLUGIN_METADATA_KEY, HeadlessPlugin } from '@orbitox/sdk';
import { ManifestValidator } from './manifest.validator';

export interface LoadedPlugin {
  manifest: PluginManifest;
  moduleClass: any;
}

@Injectable()
export class PluginLoaderService {
  private readonly logger = new Logger(PluginLoaderService.name);
  private readonly loadedPlugins = new Map<string, LoadedPlugin>();

  constructor(private readonly validator: ManifestValidator) {}

  registerPluginModule(moduleOrConfig: any): PluginManifest {
    let manifest: PluginManifest;
    let moduleClass: any = moduleOrConfig;

    if (moduleOrConfig && moduleOrConfig.isOrbitoXPlugin) {
      // It's a declarative definePlugin config
      manifest = (moduleOrConfig as HeadlessPlugin).manifest;
      moduleClass = null; // No NestJS module for declarative plugins
    } else {
      // It's a traditional NestJS module
      manifest = Reflect.getMetadata(ORBITOX_PLUGIN_METADATA_KEY, moduleOrConfig);
      if (!manifest) {
        throw new Error(`Module ${moduleOrConfig.name || 'Unknown'} is missing @OrbitoXPlugin decorator metadata`);
      }
    }

    this.validator.validate(manifest);
    this.loadedPlugins.set(manifest.id, { manifest, moduleClass });
    this.logger.log(`Loaded plugin: ${manifest.name} (v${manifest.version})`);
    return manifest;
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }
}

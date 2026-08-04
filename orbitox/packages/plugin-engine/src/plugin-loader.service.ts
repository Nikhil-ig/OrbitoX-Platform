import { Injectable, Logger } from '@nestjs/common';
import { PluginManifest, ORBITOX_PLUGIN_METADATA_KEY } from '@orbitox/sdk';
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

  registerPluginModule(moduleClass: any): PluginManifest {
    const manifest: PluginManifest = Reflect.getMetadata(ORBITOX_PLUGIN_METADATA_KEY, moduleClass);
    if (!manifest) {
      throw new Error(`Module ${moduleClass.name} is missing @OrbitoXPlugin decorator metadata`);
    }

    this.validator.validate(manifest);
    this.loadedPlugins.set(manifest.id, { manifest, moduleClass });
    this.logger.log(`Loaded plugin module: ${manifest.name} (v${manifest.version})`);
    return manifest;
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }
}

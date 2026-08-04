import { Module } from '@nestjs/common';
import { OrbitoXPlugin, BasePlugin, PluginManifest } from '@orbitox/sdk';
import { InventoryService } from './inventory.service';
import manifest from '../../manifest.json';

@OrbitoXPlugin(manifest as PluginManifest)
@Module({
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule extends BasePlugin {
  readonly manifest: PluginManifest = manifest as PluginManifest;
}

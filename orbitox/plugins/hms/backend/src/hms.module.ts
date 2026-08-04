import { Module } from '@nestjs/common';
import { OrbitoXPlugin, BasePlugin, PluginManifest } from '@orbitox/sdk';
import { HmsService } from './hms.service';
import manifest from '../../manifest.json';

@OrbitoXPlugin(manifest as PluginManifest)
@Module({
  providers: [HmsService],
  exports: [HmsService],
})
export class HmsModule extends BasePlugin {
  readonly manifest: PluginManifest = manifest as PluginManifest;
}

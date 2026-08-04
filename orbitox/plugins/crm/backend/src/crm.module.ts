import { Module } from '@nestjs/common';
import { OrbitoXPlugin, BasePlugin, PluginManifest } from '@orbitox/sdk';
import { CrmService } from './crm.service';
import manifest from '../../manifest.json';

@OrbitoXPlugin(manifest as PluginManifest)
@Module({
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule extends BasePlugin {
  readonly manifest: PluginManifest = manifest as PluginManifest;
}

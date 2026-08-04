import { Module } from '@nestjs/common';
import { OrbitoXPlugin, BasePlugin, PluginManifest } from '@orbitox/sdk';
import { HrmsService } from './hrms.service';
import manifest from '../../manifest.json';

@OrbitoXPlugin(manifest as PluginManifest)
@Module({
  providers: [HrmsService],
  exports: [HrmsService],
})
export class HrmsModule extends BasePlugin {
  readonly manifest: PluginManifest = manifest as PluginManifest;
}

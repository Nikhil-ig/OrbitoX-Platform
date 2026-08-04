import { SetMetadata } from '@nestjs/common';
import { PluginManifest } from './types';

export const ORBITOX_PLUGIN_METADATA_KEY = 'orbitox:plugin_manifest';

/**
 * Decorates a NestJS Module as an OrbitoX Plugin.
 */
export function OrbitoXPlugin(manifest: PluginManifest): ClassDecorator {
  return (target: any) => {
    SetMetadata(ORBITOX_PLUGIN_METADATA_KEY, manifest)(target);
  };
}

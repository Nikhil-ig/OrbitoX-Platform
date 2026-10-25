import 'reflect-metadata';
import { PluginManifest } from './types';

export const ORBITOX_PLUGIN_METADATA_KEY = 'orbitox:plugin_manifest';

/**
 * Decorates a NestJS Module or class as an OrbitoX Plugin.
 */
export function OrbitoXPlugin(manifest: PluginManifest): ClassDecorator {
  return (target: any) => {
    (Reflect as any).defineMetadata(ORBITOX_PLUGIN_METADATA_KEY, manifest, target);
  };
}



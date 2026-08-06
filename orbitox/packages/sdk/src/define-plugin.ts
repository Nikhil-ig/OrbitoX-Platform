import { PluginManifest } from './types';

export interface HeadlessPlugin {
  isOrbitoXPlugin: boolean;
  manifest: PluginManifest;
}

/**
 * Defines a Zero-Complexity OrbitoX Plugin.
 * The plugin is purely declarative, and the PluginEngine will dynamically
 * construct its backend routes, state machines, and frontend hooks.
 */
export function definePlugin(manifest: PluginManifest): HeadlessPlugin {
  return {
    isOrbitoXPlugin: true,
    manifest: Object.freeze({ ...manifest }) // Freeze to prevent runtime modifications
  };
}

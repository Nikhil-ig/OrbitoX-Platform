/**
 * @module @orbitox/types/plugin
 * Types for the Plugin Engine (Layer 3)
 */
export type PluginStatus = 'inactive' | 'installing' | 'active' | 'error' | 'upgrading';
/**
 * Validated representation of a plugin's manifest.json
 */
export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    dependencies: Record<string, string>;
    permissions: string[];
    events: {
        emits: string[];
        subscribes: string[];
    };
    capabilities: string[];
}
/**
 * Lifecycle hooks that a plugin can implement.
 */
export interface PluginLifecycle {
    onInstall?: () => Promise<void>;
    onActivate?: () => Promise<void>;
    onDeactivate?: () => Promise<void>;
    onUninstall?: () => Promise<void>;
    onUpgrade?: (fromVersion: string, toVersion: string) => Promise<void>;
}
export interface PluginCapability {
    id: string;
    type: string;
    provider: string;
    config: Record<string, unknown>;
}
//# sourceMappingURL=plugin.types.d.ts.map
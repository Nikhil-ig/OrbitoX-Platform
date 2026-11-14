/**
 * @module @orbitox/types/plugin
 * Types for the Plugin Engine (Layer 3)
 */

export type PluginStatus = 'inactive' | 'installing' | 'active' | 'error' | 'upgrading';

/**
 * Validated representation of a plugin's manifest.json
 */
export interface PluginManifest {
  id: string;                 // e.g., 'crm', 'inventory'
  name: string;               // e.g., 'CRM'
  version: string;            // e.g., '1.0.0'
  description: string;
  author: string;
  dependencies: Record<string, string>;
  permissions: string[];      // Permissions this plugin requires/registers
  events: {
    emits: string[];          // Events this plugin fires
    subscribes: string[];     // Events this plugin listens to
  };
  capabilities: string[];     // Capabilities this plugin requires
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

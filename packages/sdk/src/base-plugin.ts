import { PluginManifest } from './types';

export abstract class BasePlugin {
  abstract readonly manifest: PluginManifest;

  async onInstall?(contextId: string): Promise<void>;
  async onActivate?(contextId: string): Promise<void>;
  async onDeactivate?(contextId: string): Promise<void>;
  async onUpgrade?(contextId: string, fromVersion: string, toVersion: string): Promise<void>;
  async onUninstall?(contextId: string): Promise<void>;
}

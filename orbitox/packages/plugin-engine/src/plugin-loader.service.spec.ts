import { PluginLoaderService } from './plugin-loader.service';
import { ManifestValidator } from './manifest.validator';
import { OrbitoXPlugin, PluginManifest } from '@orbitox/sdk';

describe('PluginLoaderService', () => {
  let service: PluginLoaderService;

  beforeEach(() => {
    const validator = new ManifestValidator();
    service = new PluginLoaderService(validator);
  });

  it('should register and retrieve a plugin module', () => {
    const mockManifest: PluginManifest = {
      id: 'inventory',
      name: '@orbitox/inventory',
      version: '1.0.0',
      displayName: 'Inventory',
      description: 'Inventory Management',
      category: 'logistics',
      author: 'OrbitoX',
    };

    @OrbitoXPlugin(mockManifest)
    class InventoryModule {}

    service.registerPluginModule(InventoryModule);
    const loaded = service.getPlugin('inventory');

    expect(loaded).toBeDefined();
    expect(loaded?.manifest.name).toBe('@orbitox/inventory');
  });

  it('should throw error when registering module without decorator', () => {
    class PlainModule {}

    expect(() => service.registerPluginModule(PlainModule)).toThrow(
      'Module PlainModule is missing @OrbitoXPlugin decorator metadata',
    );
  });
});

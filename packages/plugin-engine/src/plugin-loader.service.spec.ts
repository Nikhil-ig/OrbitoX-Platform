import { PluginLoaderService } from './plugin-loader.service';
import { ManifestValidator } from './manifest.validator';
import { OrbitoXPlugin, PluginManifest } from './metadata/types';

describe('PluginLoaderService', () => {
  let service: PluginLoaderService;

  beforeEach(() => {
    const validator = new ManifestValidator();
    service = new PluginLoaderService(validator);
  });

  it('should register and retrieve a plugin module', () => {
    const mockManifest: PluginManifest = {
      id: 'hms',
      name: '@orbitox/hms',
      version: '1.0.0',
      displayName: 'HospitalOS',
      description: 'Hospital Management',
      category: 'healthcare',
      author: 'OrbitoX',
    };

    @OrbitoXPlugin(mockManifest)
    class HmsModule {}

    service.registerPluginModule(HmsModule);
    const loaded = service.getPlugin('hms');

    expect(loaded).toBeDefined();
    expect(loaded?.manifest.name).toBe('@orbitox/hms');
  });

  it('should throw error when registering module without decorator', () => {
    class PlainModule {}

    expect(() => service.registerPluginModule(PlainModule)).toThrow(
      'Module PlainModule is missing @OrbitoXPlugin decorator metadata',
    );
  });
});

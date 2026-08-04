import { OrbitoXPlugin, ORBITOX_PLUGIN_METADATA_KEY } from './plugin.decorator';
import { PluginManifest } from './types';

describe('OrbitoXPlugin Decorator', () => {
  it('should attach manifest metadata to target class', () => {
    const mockManifest: PluginManifest = {
      id: 'test-plugin',
      name: '@orbitox/test-plugin',
      version: '1.0.0',
      displayName: 'Test Plugin',
      description: 'Testing plugin decorator',
      category: 'testing',
      author: 'Test Author',
    };

    @OrbitoXPlugin(mockManifest)
    class TestModule {}

    const metadata = Reflect.getMetadata(ORBITOX_PLUGIN_METADATA_KEY, TestModule);
    expect(metadata).toEqual(mockManifest);
  });
});

import { ManifestValidator } from './manifest.validator';
import { PluginManifest } from '@orbitox/sdk';
import { BadRequestException } from '@nestjs/common';

describe('ManifestValidator', () => {
  let validator: ManifestValidator;

  beforeEach(() => {
    validator = new ManifestValidator();
  });

  it('should pass for a valid manifest', () => {
    const validManifest: PluginManifest = {
      id: 'crm',
      name: '@orbitox/crm',
      version: '1.0.0',
      displayName: 'CRM',
      description: 'CRM plugin',
      category: 'sales',
      author: 'OrbitoX',
    };

    expect(() => validator.validate(validManifest)).not.toThrow();
  });

  it('should throw BadRequestException if id is missing', () => {
    const invalidManifest = {
      name: '@orbitox/crm',
      version: '1.0.0',
    } as any;

    expect(() => validator.validate(invalidManifest)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException if displayName is missing', () => {
    const invalidManifest = {
      id: 'crm',
      name: '@orbitox/crm',
      version: '1.0.0',
    } as any;

    expect(() => validator.validate(invalidManifest)).toThrow(BadRequestException);
  });
});

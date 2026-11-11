import { Injectable, BadRequestException } from '@nestjs/common';
import { PluginManifest } from './metadata/types';

@Injectable()
export class ManifestValidator {
  validate(manifest: PluginManifest): void {
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new BadRequestException('Plugin manifest missing valid "id"');
    }
    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new BadRequestException(`Plugin ${manifest.id} manifest missing valid "name"`);
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new BadRequestException(`Plugin ${manifest.id} manifest missing valid "version"`);
    }
    if (!manifest.displayName) {
      throw new BadRequestException(`Plugin ${manifest.id} manifest missing "displayName"`);
    }
    if (!manifest.category) {
      throw new BadRequestException(`Plugin ${manifest.id} manifest missing "category"`);
    }
  }
}

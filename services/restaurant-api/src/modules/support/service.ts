import type { SupportRepository } from './repository';
import { validateAndSanitizeCustomCss } from '../../../packages/domain';

export class SupportService {
  constructor(private repo: SupportRepository) {}

  sanitizeCss(css: string) {
    return validateAndSanitizeCustomCss(css);
  }
}

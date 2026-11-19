import { Module, Global } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { EncryptionService } from './encryption.service';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { PiiService } from './pii.service';

/**
 * Global security module providing Secrets, Encryption, and PII masking.
 */
@Global()
@Module({
  providers: [PiiService, SecretsService, EncryptionService, RateLimitService, RateLimitGuard],
  exports: [PiiService, SecretsService, EncryptionService, RateLimitService, RateLimitGuard],
})
export class SecurityModule {}

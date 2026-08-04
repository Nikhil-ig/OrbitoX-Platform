import { Module, Global } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { EncryptionService } from './encryption.service';
import { PiiService } from './pii.service';

/**
 * Global security module providing Secrets, Encryption, and PII masking.
 */
@Global()
@Module({
  providers: [SecretsService, EncryptionService, PiiService],
  exports: [SecretsService, EncryptionService, PiiService],
})
export class SecurityModule {}

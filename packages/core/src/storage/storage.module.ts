import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { S3Adapter } from './providers/s3.adapter';

@Global()
@Module({
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useClass: S3Adapter,
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}

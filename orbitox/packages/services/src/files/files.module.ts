import { Module } from '@nestjs/common';
import { StorageModule } from '@orbitox/core';
import { FileService } from './file.service';

@Module({
  imports: [StorageModule],
  providers: [FileService],
  exports: [FileService],
})
export class FilesModule {}

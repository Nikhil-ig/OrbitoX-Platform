import { Module } from '@nestjs/common';
import { PlatformLoggerService } from './logger.service';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  providers: [PlatformLoggerService],
  exports: [PlatformLoggerService],
})
export class LoggerModule {}

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { PlatformLoggerService } from './logger.service';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    SecurityModule,
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      },
    })
  ],
  providers: [PlatformLoggerService],
  exports: [PlatformLoggerService],
})
export class LoggerModule {}

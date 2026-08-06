import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PiiService } from '../security/pii.service';

export interface LogContext {
  contextId?: string;
  userId?: string;
  requestId?: string;
  source?: string;
  [key: string]: any;
}

@Injectable()
export class PlatformLoggerService implements NestLoggerService {
  constructor(
    private readonly piiService: PiiService,
    private readonly logger: PinoLogger,
  ) {}

  private formatMessage(message: string, context?: LogContext): any {
    const safeContext = this.piiService.sanitize(context || {});
    return {
      msg: message,
      timestamp: new Date().toISOString(),
      ...safeContext,
    };
  }

  log(message: string, context?: LogContext) {
    this.logger.info(this.formatMessage(message, context));
  }

  info(message: string, context?: LogContext) {
    this.logger.info(this.formatMessage(message, context));
  }

  error(message: string, context?: LogContext & { error?: Error }) {
    this.logger.error(this.formatMessage(message, context));
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(this.formatMessage(message, context));
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(this.formatMessage(message, context));
  }

  verbose(message: string, context?: LogContext) {
    this.logger.trace(this.formatMessage(message, context));
  }
}

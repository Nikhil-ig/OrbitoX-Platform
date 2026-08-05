import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';
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
  private readonly pinoLogger: pino.Logger;

  constructor(private readonly piiService: PiiService) {
    this.pinoLogger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
    });
  }

  private formatMessage(message: string, context?: LogContext): any {
    const safeContext = this.piiService.sanitize(context || {});
    return {
      msg: message,
      timestamp: new Date().toISOString(),
      ...safeContext,
    };
  }

  log(message: string, context?: LogContext) {
    this.pinoLogger.info(this.formatMessage(message, context));
  }

  info(message: string, context?: LogContext) {
    this.pinoLogger.info(this.formatMessage(message, context));
  }

  error(message: string, context?: LogContext & { error?: Error }) {
    this.pinoLogger.error(this.formatMessage(message, context));
  }

  warn(message: string, context?: LogContext) {
    this.pinoLogger.warn(this.formatMessage(message, context));
  }

  debug(message: string, context?: LogContext) {
    this.pinoLogger.debug(this.formatMessage(message, context));
  }

  verbose(message: string, context?: LogContext) {
    this.pinoLogger.trace(this.formatMessage(message, context));
  }
}

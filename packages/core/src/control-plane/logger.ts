export function Injectable(): ClassDecorator {
  return () => {};
}

export class Logger {
  constructor(private readonly context: string) {}

  log(message: string, ...optionalParams: any[]) {
    console.log(`[${this.context}] ${message}`, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    console.warn(`[${this.context}] ⚠️ ${message}`, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    console.error(`[${this.context}] ❌ ${message}`, ...optionalParams);
  }

  debug(message: string, ...optionalParams: any[]) {
    if (process.env.DEBUG) {
      console.debug(`[${this.context}] 🔍 ${message}`, ...optionalParams);
    }
  }
}

export class ConflictException extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictException';
  }
}

export class ForbiddenException extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenException';
  }
}

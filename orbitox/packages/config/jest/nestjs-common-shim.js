require('reflect-metadata');

class HttpException extends Error {
  constructor(response, status) {
    super(typeof response === 'string' ? response : (response && response.message) || 'Http Exception');
    this.response = response;
    this.status = status;
  }
  getStatus() {
    return this.status;
  }
  getResponse() {
    return this.response;
  }
}

class BadRequestException extends HttpException {
  constructor(message = 'Bad Request', error) {
    super({ message, error, statusCode: 400 }, 400);
  }
}

class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized', error) {
    super({ message, error, statusCode: 401 }, 401);
  }
}

class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden', error) {
    super({ message, error, statusCode: 403 }, 403);
  }
}

class NotFoundException extends HttpException {
  constructor(message = 'Not Found', error) {
    super({ message, error, statusCode: 404 }, 404);
  }
}

class ConflictException extends HttpException {
  constructor(message = 'Conflict', error) {
    super({ message, error, statusCode: 409 }, 409);
  }
}

class InternalServerErrorException extends HttpException {
  constructor(message = 'Internal Server Error', error) {
    super({ message, error, statusCode: 500 }, 500);
  }
}

class Logger {
  constructor(context) {
    this.context = context;
  }
  log(...args) {}
  error(...args) {}
  warn(...args) {}
  debug(...args) {}
  verbose(...args) {}
  static log(...args) {}
  static error(...args) {}
  static warn(...args) {}
  static debug(...args) {}
  static verbose(...args) {}
}

const Injectable = () => (target) => target;
const Module = (metadata) => (target) => {
  Reflect.defineMetadata('imports', metadata.imports || [], target);
  Reflect.defineMetadata('providers', metadata.providers || [], target);
  Reflect.defineMetadata('controllers', metadata.controllers || [], target);
  Reflect.defineMetadata('exports', metadata.exports || [], target);
  return target;
};
const Global = () => (target) => target;
const Inject = (token) => (target, key, index) => {};
const Optional = () => (target, key, index) => {};
const SetMetadata = (metadataKey, metadataValue) => (target, key, descriptor) => {
  if (descriptor) {
    Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
    return descriptor;
  }
  Reflect.defineMetadata(metadataKey, metadataValue, target);
  return target;
};

const Scope = {
  DEFAULT: 0,
  TRANSIENT: 1,
  REQUEST: 2,
};

const HttpStatus = {
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  EARLYHINTS: 103,
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  AMBIGUOUS: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  REQUESTED_RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  I_AM_A_TEAPOT: 418,
  MISDIRECTED: 421,
  UNPROCESSABLE_ENTITY: 422,
  FAILED_DEPENDENCY: 424,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
};

module.exports = {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  Injectable,
  Module,
  Global,
  Inject,
  Optional,
  SetMetadata,
  Scope,
  HttpStatus,
};

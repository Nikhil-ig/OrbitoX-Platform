import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Default global limits (1000 requests per minute per IP)
    let limit = 1000;
    let windowSeconds = 60;
    
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    let key = `ip:${ip}`;

    // If tenant context is present, we could apply tenant-level limits (e.g., 5000/min)
    if (request.contextId) {
      key = `tenant:${request.contextId}`;
      limit = 5000;
    }

    // specific endpoint limits (e.g. login brute force protection)
    const url = request.url;
    if (url.includes('/auth/login')) {
      key = `login:${ip}`;
      limit = 10;
      windowSeconds = 60;
    } else if (url.includes('/api/v1/ai/')) {
      key = `ai:${request.contextId || ip}`;
      limit = 60;
      windowSeconds = 60;
    }

    const result = await this.rateLimitService.checkLimit(key, limit, windowSeconds);

    // Set headers
    if (response && typeof response.header === 'function') {
      response.header('X-RateLimit-Limit', limit.toString());
      response.header('X-RateLimit-Remaining', result.remaining.toString());
      response.header('X-RateLimit-Reset', result.resetAfter.toString());
    }

    if (!result.allowed) {
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded'
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}

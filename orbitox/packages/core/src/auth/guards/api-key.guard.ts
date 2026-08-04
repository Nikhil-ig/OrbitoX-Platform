import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKeyHeader = request.headers['x-api-key'] as string;

    if (!apiKeyHeader) {
      throw new UnauthorizedException('API key is missing');
    }

    // In a full implementation, you would:
    // 1. Extract prefix from the key
    // 2. Lookup the key record in DB by prefix or do a full scan (not recommended)
    // 3. Compare hash using this.apiKeyService.validateKey(apiKeyHeader, dbRecord.hash)
    // 4. Validate context, scopes, and IP using this.apiKeyService.validateAuthorization(...)
    
    // For now, we just ensure it exists
    (request as any)['apiKey'] = apiKeyHeader;
    
    return true;
  }
}

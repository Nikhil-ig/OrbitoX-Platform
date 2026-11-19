import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface GeneratedApiKey {
  plaintext: string;
  hash: string;
  prefix: string;
}

@Injectable()
export class ApiKeyService {
  private readonly SALT_ROUNDS = 10;

  /**
   * Generates a new API key with a specific prefix (e.g. oxk_live_)
   */
  async generateKey(prefix: string = 'oxk_live_'): Promise<GeneratedApiKey> {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const plaintext = `${prefix}${randomBytes}`;
    
    const hash = await bcrypt.hash(plaintext, this.SALT_ROUNDS);
    
    return {
      plaintext,
      hash,
      prefix,
    };
  }

  /**
   * Validates a plaintext key against a stored hash
   */
  async validateKey(plaintext: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plaintext, hash);
    } catch (e) {
      return false;
    }
  }

  /**
   * Validates if the key is authorized based on context, scopes and IP
   */
  validateAuthorization(
    keyContextId: string,
    requestContextId: string,
    keyScopes: string[],
    requiredScopes: string[],
    allowedIps: string[],
    clientIp: string
  ): void {
    if (keyContextId !== requestContextId) {
      throw new UnauthorizedException('API key is not valid for this context');
    }

    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      throw new UnauthorizedException('IP address not allowed for this API key');
    }

    if (requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every(scope => keyScopes.includes(scope));
      if (!hasAllScopes) {
        throw new UnauthorizedException('API key missing required scopes');
      }
    }
  }
}

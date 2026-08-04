import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtPayload } from '@orbitox/types';
import { SecretsService } from '../security/secrets.service';
import { v4 as uuidv4 } from 'uuid';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly secretsService: SecretsService,
  ) {}

  /**
   * Generates a new access and refresh token pair
   */
  async generateTokenPair(
    userId: string,
    contextId: string,
    tenantId: string,
    organisationId: string,
    scopes: string[] = [],
    mfaVerified: boolean = false,
    ipHash: string = '',
  ): Promise<TokenPair> {
    const jti = uuidv4();
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      jti,
      ctx: contextId,
      tid: tenantId,
      oid: organisationId,
      scp: scopes,
      mfa: mfaVerified,
      ips: ipHash,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.nestJwtService.signAsync(payload, { expiresIn: '15m' }),
      this.nestJwtService.signAsync(payload, { expiresIn: '7d' }), // Refresh tokens can share structure, though typically they might contain less data
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Verifies an access token and extracts the payload.
   * Throws UnauthorizedException if invalid or expired.
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.nestJwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Verifies a refresh token and extracts the payload.
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.nestJwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}

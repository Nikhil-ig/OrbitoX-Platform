import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@orbitox/types';
import { SecretsService } from '../security/secrets.service';
import { SessionService } from './session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly secretsService: SecretsService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request: any, rawJwtToken: any, done: any) => {
        try {
          const publicKey = await this.secretsService.get('auth/jwt/public_key');
          done(null, publicKey);
        } catch (err) {
          done(err, null);
        }
      },
    });
  }

  async validate(payload: JwtPayload) {
    // Check revocation
    const isRevoked = await this.sessionService.isTokenRevoked(payload.jti);
    if (isRevoked) {
      throw new UnauthorizedException('Token has been revoked');
    }
    
    // Passport adds the returned object to req.user
    return payload;
  }
}

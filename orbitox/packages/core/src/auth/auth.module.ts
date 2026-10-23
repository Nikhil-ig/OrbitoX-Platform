import { randomBytes } from 'crypto';
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from './jwt.service';
import { JwtStrategy } from './jwt.strategy';
import { SessionService } from './session.service';
import { MfaService } from './mfa.service';
import { ApiKeyService } from './api-key.service';
import { SecretsService } from '../security/secrets.service';

// Mock Redis Provider for core package
// In a real application, this would connect to an actual Redis instance
const redisProvider = {
  provide: 'REDIS_CLIENT',
  useValue: {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    multi: () => ({
      set: () => {},
      sadd: () => {},
      exec: async () => [],
    }),
    pipeline: () => ({
      del: () => ({ exec: async () => [] }),
      srem: () => ({ exec: async () => [] }),
      exec: async () => [],
    }),
    sadd: async () => 1,
    srem: async () => 1,
    smembers: async () => [],
    exists: async () => 0,
  },
};

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [SecretsService],
      useFactory: async (secretsService: SecretsService) => {
        const isProduction = process.env.NODE_ENV === 'production';
        let privateKey: string | undefined = process.env.JWT_PRIVATE_KEY;
        let publicKey: string | undefined = process.env.JWT_PUBLIC_KEY;

        try {
          privateKey = await secretsService.get('auth/jwt/private_key');
          publicKey = await secretsService.get('auth/jwt/public_key');
        } catch (e) {
          // Secrets provider unavailable: fall back to the environment variables above.
        }

        let algorithm: 'RS256' | 'HS256' = 'RS256';
        if (!privateKey || !publicKey) {
          if (isProduction) {
            throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production.');
          }
          // Development only: random per-process HMAC key, so tokens reset on restart.
          const devSecret = randomBytes(32).toString('hex');
          privateKey = devSecret;
          publicKey = devSecret;
          algorithm = 'HS256';
        }

        return {
          privateKey,
          publicKey,
          signOptions: { 
            algorithm,
          },
        };
      },
    }),
  ],
  providers: [
    JwtService,
    JwtStrategy,
    SessionService,
    MfaService,
    ApiKeyService,
    SecretsService,
    redisProvider,
  ],
  exports: [
    JwtService,
    SessionService,
    MfaService,
    ApiKeyService,
  ],
})
export class AuthModule {}

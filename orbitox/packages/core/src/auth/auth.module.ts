import { requireSecret } from '@orbitox/config';
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
        let privateKey: string;
        let publicKey: string;
        
        try {
          privateKey = await secretsService.get('auth/jwt/private_key');
          publicKey = await secretsService.get('auth/jwt/public_key');
        } catch (e) {
          privateKey = requireSecret('JWT_PRIVATE_KEY', { minBytes: 32 });
          publicKey = requireSecret('JWT_PUBLIC_KEY', { minBytes: 32 });
        }

        return {
          privateKey,
          publicKey,
          signOptions: { 
            algorithm: 'RS256',
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

import * as crypto from 'crypto';
import * as http from 'http';

/**
 * Validates platform service credentials for internal provisioning endpoints.
 * Enforces RESTAURANTOS_PLATFORM_TOKEN >= 32 chars, constant-time comparison, fail-closed in prod.
 */
export function verifyPlatformAuth(req: http.IncomingMessage): boolean {
  const envToken = process.env.RESTAURANTOS_PLATFORM_TOKEN;
  const isProd = process.env.NODE_ENV === 'production';

  if (!envToken || envToken.length < 32) {
    if (isProd) {
      console.error('🚨 [Security] RESTAURANTOS_PLATFORM_TOKEN missing or < 32 chars in production. Rejecting request.');
      return false;
    }
  }

  const expectedToken = envToken;
  if (!expectedToken) {
    return false;
  }

  const authHeader = req.headers['authorization'] || (req.headers['x-platform-token'] as string);
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }

  let token = authHeader.trim();
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expectedToken);
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}


import * as crypto from 'crypto';

/**
 * Generate a v4 UUID
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Hash a string using SHA-256
 */
export function hashSha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate HMAC SHA-256 for signing webhooks/headers
 */
export function generateHmac(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a cryptographically secure random token (e.g., for API keys or password reset)
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

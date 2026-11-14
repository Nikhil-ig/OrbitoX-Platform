/**
 * 🛰️ OrbitoX Platform -> RestaurantOS Bridge Request Signing & Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 * 1. Cryptographic HMAC-SHA256 request signing and verification via shared @orbitox-io/bridge.
 * 2. Strict replay protection using shared PostgreSQL BridgeNonce table.
 * 3. Constant-time signature comparison to eliminate timing channels.
 * 4. Zero trust: RestaurantOS takes tenantId and principal ONLY from verified headers,
 *    and unconditionally rejects spoofed x-tenant-id headers from clients.
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '../../generated/prisma';
import {
  BridgeKeys,
  NonceStore,
  MemoryNonceStore,
  SignInput,
  VerifyFailure,
  SKEW_SECONDS,
  TENANT_RE,
  stringToSign,
  signBridgeRequest,
  verifyBridgeRequest,
  getDefaultBridgeKeys,
} from '@orbitox-io/bridge';

export {
  BridgeKeys,
  NonceStore,
  MemoryNonceStore,
  SignInput,
  VerifyFailure,
  SKEW_SECONDS,
  TENANT_RE,
  stringToSign,
  signBridgeRequest,
  verifyBridgeRequest,
  getDefaultBridgeKeys,
};

export class PostgresNonceStore implements NonceStore {
  constructor(private readonly prisma: PrismaClient) {}

  async claim(nonce: string, ttlSeconds: number): Promise<boolean> {
    try {
      const res = await this.prisma.$executeRaw`
        INSERT INTO "BridgeNonce" ("nonce", "expiresAt")
        VALUES (${nonce}, now() + (${`${ttlSeconds} seconds`}::interval))
        ON CONFLICT DO NOTHING
      `;
      return res > 0;
    } catch {
      return false;
    }
  }

  async purgeExpired(): Promise<number> {
    return this.prisma.$executeRaw`DELETE FROM "BridgeNonce" WHERE "expiresAt" < now()`;
  }
}

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

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

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

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

import { PrismaClient } from '@prisma/client';
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

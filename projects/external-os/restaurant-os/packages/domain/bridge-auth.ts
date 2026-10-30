/**
 * 🛰️ OrbitoX Platform -> RestaurantOS Bridge Request Signing & Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 * 1. Cryptographic HMAC-SHA256 request signing and verification.
 * 2. Strict replay protection using shared PostgreSQL BridgeNonce table.
 * 3. Constant-time signature comparison to eliminate timing channels.
 * 4. Zero trust: RestaurantOS takes tenantId and principal ONLY from verified headers,
 *    and unconditionally rejects spoofed x-tenant-id headers from clients.
 */

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

export const SKEW_SECONDS = 60;
export const TENANT_RE = /^(org\/[^/]+\/project\/[^/]+\/environment\/[^/]+|[a-zA-Z0-9_\-\.:/]+)$/;

export interface BridgeKeys {
  activeKeyId: string;
  keys: Record<string, string>; // id -> secret (>= 32 chars)
}

export interface SignInput {
  method: string;
  pathWithQuery: string;
  tenantId: string;
  principal: { sub: string; scopes: string[] };
  body?: Buffer | string;
}

export interface NonceStore {
  claim(nonce: string, ttlSeconds: number): Promise<boolean>;
}

export class MemoryNonceStore implements NonceStore {
  private seen = new Map<string, number>();
  async claim(nonce: string, ttl: number): Promise<boolean> {
    const now = Date.now();
    for (const [n, exp] of this.seen) {
      if (exp < now) this.seen.delete(n);
    }
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, now + ttl * 1000);
    return true;
  }
}

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

const sha256hex = (b: Buffer | string = '') =>
  crypto.createHash('sha256').update(b).digest('hex');

function stringToSign(
  method: string,
  path: string,
  tenant: string,
  principal: string,
  ts: string,
  nonce: string,
  bodyHash: string,
): string {
  return ['v1', method.toUpperCase(), path, tenant, principal, ts, nonce, bodyHash].join('\n');
}

export function signBridgeRequest(
  keys: BridgeKeys,
  input: SignInput,
  now = Date.now(),
): Record<string, string> {
  if (!TENANT_RE.test(input.tenantId)) throw new Error('invalid tenant');
  const secret = keys.keys[keys.activeKeyId];
  if (!secret || secret.length < 32) throw new Error('bridge key missing or weak');
  const principal = JSON.stringify({
    sub: input.principal.sub,
    scopes: [...input.principal.scopes].sort(),
  });
  const ts = String(Math.floor(now / 1000));
  const nonce = crypto.randomBytes(16).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(stringToSign(input.method, input.pathWithQuery, input.tenantId, principal, ts, nonce, sha256hex(input.body)))
    .digest('hex');
  return {
    'bridge-signature': `v1=${sig}`,
    'bridge-key-id': keys.activeKeyId,
    'bridge-tenant': input.tenantId,
    'bridge-principal': principal,
    'bridge-timestamp': ts,
    'bridge-nonce': nonce,
    'x-orbitox-key-id': keys.activeKeyId,
    'x-orbitox-tenant': input.tenantId,
    'x-orbitox-principal': principal,
    'x-orbitox-ts': ts,
    'x-orbitox-nonce': nonce,
    'x-orbitox-signature': `v1=${sig}`,
  };
}

export type VerifyFailure =
  | 'MISSING_HEADER'
  | 'UNKNOWN_KEY'
  | 'BAD_TENANT'
  | 'STALE'
  | 'REPLAY'
  | 'BAD_SIGNATURE'
  | 'BAD_PRINCIPAL';

export async function verifyBridgeRequest(
  keys: BridgeKeys,
  nonces: NonceStore,
  req: {
    method: string;
    pathWithQuery: string;
    headers: Record<string, string | string[] | undefined>;
    rawBody?: Buffer | string;
  },
  now = Date.now(),
): Promise<
  | { ok: true; tenantId: string; principal: { sub: string; scopes: string[] } }
  | { ok: false; reason: VerifyFailure }
> {
  const getHeader = (name: string): string | undefined => {
    const val = req.headers[name] || req.headers[name.toLowerCase()];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const kid = getHeader('x-orbitox-key-id') || getHeader('bridge-key-id') || getHeader('x-bridge-key-id');
  const tenant = getHeader('x-orbitox-tenant') || getHeader('bridge-tenant') || getHeader('x-bridge-tenant');
  const principal = getHeader('x-orbitox-principal') || getHeader('bridge-principal') || getHeader('x-bridge-principal');
  const ts = getHeader('x-orbitox-ts') || getHeader('bridge-timestamp') || getHeader('bridge-ts') || getHeader('x-bridge-ts');
  const nonce = getHeader('x-orbitox-nonce') || getHeader('bridge-nonce') || getHeader('x-bridge-nonce');
  const sigHeader = getHeader('x-orbitox-signature') || getHeader('bridge-signature') || getHeader('x-bridge-signature');

  if (!kid || !tenant || !principal || !ts || !nonce || !sigHeader) {
    return { ok: false, reason: 'MISSING_HEADER' };
  }

  const secret = keys.keys[kid];
  if (!secret) return { ok: false, reason: 'UNKNOWN_KEY' };
  if (!TENANT_RE.test(tenant)) return { ok: false, reason: 'BAD_TENANT' };
  if (!/^\d{1,12}$/.test(ts) || Math.abs(Math.floor(now / 1000) - Number(ts)) > SKEW_SECONDS) {
    return { ok: false, reason: 'STALE' };
  }
  if (!/^[A-Za-z0-9_-]{22}$/.test(nonce)) return { ok: false, reason: 'MISSING_HEADER' };

  const m = /^(?:v1=)?([0-9a-f]{64})$/i.exec(sigHeader);
  if (!m || !m[1]) return { ok: false, reason: 'BAD_SIGNATURE' };

  const expected = crypto
    .createHmac('sha256', secret)
    .update(stringToSign(req.method, req.pathWithQuery, tenant, principal, ts, nonce, sha256hex(req.rawBody)))
    .digest();

  const given = Buffer.from(m[1], 'hex');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'BAD_SIGNATURE' };
  }

  // Claim nonce strictly AFTER cryptographic signature matches
  const claimed = await nonces.claim(nonce, SKEW_SECONDS * 2 + 10);
  if (!claimed) return { ok: false, reason: 'REPLAY' };

  let p: any;
  try {
    p = JSON.parse(principal);
  } catch {
    return { ok: false, reason: 'BAD_PRINCIPAL' };
  }

  if (typeof p?.sub !== 'string' || !Array.isArray(p?.scopes) || !p.scopes.every((s: unknown) => typeof s === 'string')) {
    return { ok: false, reason: 'BAD_PRINCIPAL' };
  }

  return { ok: true, tenantId: tenant, principal: { sub: p.sub, scopes: p.scopes } };
}

export function getDefaultBridgeKeys(): BridgeKeys {
  if (process.env.ORBITOX_BRIDGE_KEYS) {
    try {
      return JSON.parse(process.env.ORBITOX_BRIDGE_KEYS);
    } catch {}
  }
  const secret =
    process.env.ORBITOX_BRIDGE_SECRET ||
    process.env.RESTAURANTOS_PLATFORM_TOKEN ||
    'dev_platform_secret_token_restaurantos_secure_32ch';
  return {
    activeKeyId: 'k1',
    keys: { k1: secret },
  };
}

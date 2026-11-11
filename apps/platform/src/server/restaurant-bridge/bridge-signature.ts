/**
 * Platform -> RestaurantOS (and any runtime plugin) request signing.
 *
 * The platform has already authenticated the customer and resolved the tenant. It forwards the
 * call to the runtime plane with these headers; the runtime TRUSTS tenant identity only if the
 * signature verifies. Raw customer keys are never forwarded.
 *
 *   x-orbitox-key-id     which bridge secret signed it (rotation)
 *   x-orbitox-tenant     org/<id>/project/<id>/environment/<id>
 *   x-orbitox-principal  JSON {sub, scopes[]} (e.g. guest session / staff / api key id)
 *   x-orbitox-ts         unix seconds
 *   x-orbitox-nonce      128-bit random, base64url
 *   x-orbitox-signature  v1=<hex HMAC-SHA256>
 *
 * String to sign (newline-joined, fixed order):
 *   v1, METHOD, path?query (as sent), tenant, principal, ts, nonce, sha256(body) hex
 *
 * Verifier rules: known key id; |now - ts| <= 60 s; nonce never seen before (shared store across
 * runtime servers, TTL > 2 x window); constant-time compare; body hash recomputed from raw bytes.
 */
import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';

export const SKEW_SECONDS = 60;
const TENANT_RE = /^org\/[^/]+\/project\/[^/]+\/environment\/[^/]+$/;

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

const sha256hex = (b: Buffer | string = '') => crypto.createHash('sha256').update(b).digest('hex');

function stringToSign(
  method: string,
  path: string,
  tenant: string,
  principal: string,
  ts: string,
  nonce: string,
  bodyHash: string,
) {
  return ['v1', method.toUpperCase(), path, tenant, principal, ts, nonce, bodyHash].join('\n');
}

export function signBridgeRequest(keys: BridgeKeys, input: SignInput, now = Date.now()): Record<string, string> {
  if (!TENANT_RE.test(input.tenantId)) throw new Error('invalid tenant');
  const secret = keys.keys[keys.activeKeyId];
  if (!secret || secret.length < 32) throw new Error('bridge key missing or weak');
  const principal = JSON.stringify({ sub: input.principal.sub, scopes: [...input.principal.scopes].sort() });
  const ts = String(Math.floor(now / 1000));
  const nonce = crypto.randomBytes(16).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(stringToSign(input.method, input.pathWithQuery, input.tenantId, principal, ts, nonce, sha256hex(input.body)))
    .digest('hex');
  return {
    'x-orbitox-key-id': keys.activeKeyId,
    'x-orbitox-tenant': input.tenantId,
    'x-orbitox-principal': principal,
    'x-orbitox-ts': ts,
    'x-orbitox-nonce': nonce,
    'x-orbitox-signature': `v1=${sig}`,
  };
}

/** Shared across runtime servers in production: a table with PRIMARY KEY(nonce) + purge, or Redis SET NX EX. */
export interface NonceStore {
  claim(nonce: string, ttlSeconds: number): Promise<boolean>;
}

export class MemoryNonceStore implements NonceStore {
  // tests / single process only
  private seen = new Map<string, number>();
  async claim(nonce: string, ttl: number) {
    const now = Date.now();
    for (const [n, exp] of this.seen) if (exp < now) this.seen.delete(n);
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, now + ttl * 1000);
    return true;
  }
}

/** PostgreSQL backed NonceStore using BridgeNonce table */
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
    headers: Record<string, string | undefined>;
    rawBody?: Buffer | string;
  },
  now = Date.now(),
): Promise<
  | { ok: true; tenantId: string; principal: { sub: string; scopes: string[] } }
  | { ok: false; reason: VerifyFailure }
> {
  const h = (n: string) => req.headers[n];
  const kid = h('x-orbitox-key-id'),
    tenant = h('x-orbitox-tenant'),
    principal = h('x-orbitox-principal');
  const ts = h('x-orbitox-ts'),
    nonce = h('x-orbitox-nonce'),
    sigHeader = h('x-orbitox-signature');
  if (!kid || !tenant || !principal || !ts || !nonce || !sigHeader) return { ok: false, reason: 'MISSING_HEADER' };
  const secret = keys.keys[kid];
  if (!secret) return { ok: false, reason: 'UNKNOWN_KEY' };
  if (!TENANT_RE.test(tenant)) return { ok: false, reason: 'BAD_TENANT' };
  if (!/^\d{1,12}$/.test(ts) || Math.abs(Math.floor(now / 1000) - Number(ts)) > SKEW_SECONDS)
    return { ok: false, reason: 'STALE' };
  if (!/^[A-Za-z0-9_-]{22}$/.test(nonce)) return { ok: false, reason: 'MISSING_HEADER' };
  const m = /^v1=([0-9a-f]{64})$/.exec(sigHeader);
  if (!m || !m[1]) return { ok: false, reason: 'BAD_SIGNATURE' };
  const expected = crypto
    .createHmac('sha256', secret)
    .update(stringToSign(req.method, req.pathWithQuery, tenant, principal, ts, nonce, sha256hex(req.rawBody)))
    .digest();
  const given = Buffer.from(m[1], 'hex');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected))
    return { ok: false, reason: 'BAD_SIGNATURE' };
  // Claim the nonce only AFTER the signature verifies, so attackers cannot burn legitimate nonces.
  if (!(await nonces.claim(nonce, SKEW_SECONDS * 2 + 10))) return { ok: false, reason: 'REPLAY' };
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

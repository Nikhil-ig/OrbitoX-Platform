/**
 * 🛰️ @orbitox-io/bridge
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-trust cryptographic request signing and bridge verification protocol
 * for communication between OrbitoX Platform and external runtimes (RestaurantOS).
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const SKEW_SECONDS = 60;

/**
 * Canonical tenant identifier format: org/{orgId}/project/{projectId}/environment/{envId}
 */
export const TENANT_RE = /^org\/[a-zA-Z0-9_-]+\/project\/[a-zA-Z0-9_-]+\/environment\/[a-zA-Z0-9_-]+$/;

export interface BridgeKeys {
  activeKeyId: string;
  keys: Record<string, string>; // id -> secret (>= 32 bytes)
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

const sha256hex = (b: Buffer | string = ''): string =>
  crypto.createHash('sha256').update(b).digest('hex');

export function stringToSign(
  method: string,
  pathWithQuery: string,
  tenant: string,
  principal: string,
  ts: string,
  nonce: string,
  bodyHash: string,
): string {
  return ['v1', method.toUpperCase(), pathWithQuery, tenant, principal, ts, nonce, bodyHash].join('\n');
}

/**
 * Signs an outgoing platform-to-runtime bridge HTTP request.
 */
export function signBridgeRequest(
  keys: BridgeKeys,
  input: SignInput,
  now = Date.now(),
): Record<string, string> {
  if (!TENANT_RE.test(input.tenantId)) {
    throw new Error(`Invalid tenant ID format: "${input.tenantId}". Must match canonical org/.../project/.../environment/...`);
  }
  const secret = keys.keys[keys.activeKeyId];
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Bridge key is missing or does not meet 32-byte security requirement.');
  }

  const principal = JSON.stringify({
    sub: input.principal.sub,
    scopes: [...input.principal.scopes].sort(),
  });
  const ts = String(Math.floor(now / 1000));
  const nonce = crypto.randomBytes(16).toString('base64url');
  const bodyHash = sha256hex(input.body);

  const sig = crypto
    .createHmac('sha256', secret)
    .update(stringToSign(input.method, input.pathWithQuery, input.tenantId, principal, ts, nonce, bodyHash))
    .digest('hex');

  return {
    'bridge-signature': `v1=${sig}`,
    'bridge-key-id': keys.activeKeyId,
    'bridge-tenant': input.tenantId,
    'bridge-principal': principal,
    'bridge-timestamp': ts,
    'bridge-nonce': nonce,
    'x-orbitox-signature': `v1=${sig}`,
    'x-orbitox-key-id': keys.activeKeyId,
    'x-orbitox-tenant': input.tenantId,
    'x-orbitox-principal': principal,
    'x-orbitox-ts': ts,
    'x-orbitox-nonce': nonce,
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

/**
 * Verifies an incoming bridge HTTP request against active and historical keys.
 */
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

// Cached ephemeral development key per process
let ephemeralDevKeys: BridgeKeys | null = null;

/**
 * Resolves bridge cryptographic keys.
 * In production: strictly enforces ORBITOX_BRIDGE_KEYS presence, valid JSON, activeKeyId, and >=32 byte secrets.
 * In dev/test: uses ORBITOX_BRIDGE_KEYS if valid, or a gitignored file, or generates an ephemeral 32-byte key per process.
 * Zero hardcoded secret literals in any mode.
 */
export function getDefaultBridgeKeys(): BridgeKeys {
  const isProd = process.env.NODE_ENV === 'production';
  const rawEnv = process.env.ORBITOX_BRIDGE_KEYS;

  if (isProd) {
    if (!rawEnv || !rawEnv.trim()) {
      throw new Error('Production requires ORBITOX_BRIDGE_KEYS environment variable.');
    }
    let parsed: any;
    try {
      parsed = JSON.parse(rawEnv);
    } catch {
      throw new Error('Production ORBITOX_BRIDGE_KEYS contains malformed JSON.');
    }
    if (!parsed || typeof parsed !== 'object' || typeof parsed.activeKeyId !== 'string' || !parsed.activeKeyId) {
      throw new Error('Production ORBITOX_BRIDGE_KEYS must contain a valid activeKeyId string.');
    }
    if (!parsed.keys || typeof parsed.keys !== 'object') {
      throw new Error('Production ORBITOX_BRIDGE_KEYS must contain a keys map.');
    }
    const activeSecret = parsed.keys[parsed.activeKeyId];
    if (typeof activeSecret !== 'string' || Buffer.byteLength(activeSecret, 'utf8') < 32) {
      throw new Error(`Production active bridge key "${parsed.activeKeyId}" must be at least 32 bytes.`);
    }
    for (const [kid, sec] of Object.entries(parsed.keys)) {
      if (typeof sec !== 'string' || Buffer.byteLength(sec, 'utf8') < 32) {
        throw new Error(`Production bridge key "${kid}" must be at least 32 bytes.`);
      }
    }
    return {
      activeKeyId: parsed.activeKeyId,
      keys: { ...parsed.keys },
    };
  }

  // Non-production (development, test)
  if (rawEnv && rawEnv.trim()) {
    try {
      const parsed = JSON.parse(rawEnv);
      if (
        parsed &&
        typeof parsed.activeKeyId === 'string' &&
        parsed.keys &&
        typeof parsed.keys === 'object' &&
        parsed.keys[parsed.activeKeyId]
      ) {
        return {
          activeKeyId: parsed.activeKeyId,
          keys: { ...parsed.keys },
        };
      }
    } catch {}
  }

  // Optional gitignored file in dev/test
  const gitignoredKeysPath = path.resolve(process.cwd(), 'keys', 'bridge-keys.json');
  if (fs.existsSync(gitignoredKeysPath)) {
    try {
      const content = fs.readFileSync(gitignoredKeysPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed?.activeKeyId && parsed?.keys?.[parsed.activeKeyId]) {
        return {
          activeKeyId: parsed.activeKeyId,
          keys: { ...parsed.keys },
        };
      }
    } catch {}
  }

  // Generate ephemeral 32-byte key per process in non-prod
  if (!ephemeralDevKeys) {
    const keyId = 'dev_ephemeral_' + crypto.randomBytes(4).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');
    ephemeralDevKeys = {
      activeKeyId: keyId,
      keys: { [keyId]: secret },
    };
  }

  return ephemeralDevKeys;
}

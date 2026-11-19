/**
 * OrbitoX signed grants (Ed25519, compact JWS-like). Two token types, one verifier:
 *
 *  "orbitox-ent"  Entitlement token: platform -> plugin, per (tenant, plugin). Short-lived (<= 24 h,
 *                 normally 15 min). Says: is this tenant ACTIVE / READ_ONLY / SUSPENDED for this plugin,
 *                 which features, which quota limits, which plan. Plugins check it locally on every request.
 *  "orbitox-lic"  Licence file: platform -> customer's own deployment (embedded/self-hosted mode).
 *                 Longer-lived (<= 35 days) and refreshed by check-in. Says: which plugins, how many
 *                 tenants, until when.
 *
 * Why asymmetric: plugins and customer servers hold only PUBLIC keys, so a compromised plugin or a
 * customer cannot mint grants. Why short-lived + revision: revocation is fast (push + TTL cap) and
 * an old, more permissive token cannot be replayed after a downgrade.
 */
import crypto from 'node:crypto';

export type GrantType = 'orbitox-ent' | 'orbitox-lic';
export type ServiceStatus = 'ACTIVE' | 'READ_ONLY' | 'SUSPENDED';

export interface EntitlementClaims {
  typ: 'orbitox-ent';
  iss: 'orbitox';
  aud: string;                 // plugin id, e.g. "hospital-os"
  sub: string;                 // tenant id: org/<o>/project/<p>/environment/<e>
  plan: string;                // e.g. "hms-pro"
  status: ServiceStatus;
  features: string[];          // e.g. ["patients","labs","billing"]
  quotas: Record<string, { limit: number; window: 'day' | 'month' | 'none' }>;
  rev: number;                 // monotonic entitlement revision for this (tenant, plugin)
  iat: number; nbf: number; exp: number; jti: string;
}

export interface LicenceClaims {
  typ: 'orbitox-lic';
  iss: 'orbitox';
  aud: string;                 // deployment id the licence is bound to
  sub: string;                 // customer organisation id
  plugins: string[];
  maxTenants: number;
  rev: number;
  iat: number; nbf: number; exp: number; jti: string;
}

export type Claims = EntitlementClaims | LicenceClaims;

const MAX_LIFETIME: Record<GrantType, number> = { 'orbitox-ent': 24 * 3600, 'orbitox-lic': 35 * 86400 };
const SKEW = 60;
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const TENANT_RE = /^org\/[^/]+\/project\/[^/]+\/environment\/[^/]+$/;

export class GrantError extends Error {
  constructor(readonly reason:
    'MALFORMED' | 'BAD_ALG' | 'UNKNOWN_KID' | 'BAD_SIGNATURE' | 'WRONG_TYPE' | 'WRONG_AUDIENCE' | 'WRONG_SUBJECT'
    | 'NOT_YET_VALID' | 'EXPIRED' | 'LIFETIME_TOO_LONG' | 'ROLLBACK' | 'BAD_CLAIMS') { super(reason); }
}

/** Platform side only. privateKey: Ed25519 KeyObject loaded from a secret store. */
export function signGrant(claims: Omit<Claims, 'iss' | 'iat' | 'nbf' | 'jti'> & { exp: number }, privateKey: crypto.KeyObject, kid: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const full = { ...claims, iss: 'orbitox', iat, nbf: iat - 5, jti: crypto.randomUUID() } as Claims;
  if (full.exp - iat > MAX_LIFETIME[full.typ]) throw new GrantError('LIFETIME_TOO_LONG');
  const header = b64(JSON.stringify({ alg: 'EdDSA', kid, typ: full.typ }));
  const payload = b64(JSON.stringify(full));
  const sig = crypto.sign(null, Buffer.from(`${header}.${payload}`), privateKey);
  return `${header}.${payload}.${b64(sig)}`;
}

/** Remembers the highest revision seen per (aud, sub) so a stale grant cannot be replayed. Shared store in prod. */
export interface RevisionStore { highest(key: string): Promise<number>; raise(key: string, rev: number): Promise<void>; }
export class MemoryRevisionStore implements RevisionStore {
  private m = new Map<string, number>();
  async highest(k: string) { return this.m.get(k) ?? 0; }
  async raise(k: string, r: number) { if (r > (this.m.get(k) ?? 0)) this.m.set(k, r); }
}

export interface VerifyOptions {
  type: GrantType;
  audience: string;                          // this plugin's id / this deployment's id
  subject?: string;                          // tenant id of the current request (entitlement tokens)
  trustedKeys: Record<string, crypto.KeyObject>;   // kid -> PUBLIC key, pinned in code/config
  revisions?: RevisionStore;
  now?: number;
}

export async function verifyGrant<T extends Claims = Claims>(token: string, o: VerifyOptions): Promise<T> {
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 8192) throw new GrantError('MALFORMED');
  let header: any, claims: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { throw new GrantError('MALFORMED'); }
  if (header?.alg !== 'EdDSA') throw new GrantError('BAD_ALG');          // no alg negotiation, no "none"
  const key = Object.prototype.hasOwnProperty.call(o.trustedKeys, header?.kid) ? o.trustedKeys[header.kid] : undefined;
  if (!key) throw new GrantError('UNKNOWN_KID');
  const ok = crypto.verify(null, Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
  if (!ok) throw new GrantError('BAD_SIGNATURE');
  // Only trust claims after the signature verified.
  if (header.typ !== o.type || claims.typ !== o.type || claims.iss !== 'orbitox') throw new GrantError('WRONG_TYPE');
  if (claims.aud !== o.audience) throw new GrantError('WRONG_AUDIENCE');
  if (o.subject !== undefined && claims.sub !== o.subject) throw new GrantError('WRONG_SUBJECT');
  const now = Math.floor((o.now ?? Date.now()) / 1000);
  for (const f of ['iat', 'nbf', 'exp', 'rev'] as const) if (!Number.isInteger(claims[f])) throw new GrantError('BAD_CLAIMS');
  if (claims.nbf > now + SKEW || claims.iat > now + SKEW) throw new GrantError('NOT_YET_VALID');
  if (claims.exp <= now - SKEW) throw new GrantError('EXPIRED');
  if (claims.exp - claims.iat > MAX_LIFETIME[o.type as GrantType]) throw new GrantError('LIFETIME_TOO_LONG');
  if (o.type === 'orbitox-ent') {
    if (!TENANT_RE.test(claims.sub) || !Array.isArray(claims.features) || typeof claims.quotas !== 'object'
        || !['ACTIVE', 'READ_ONLY', 'SUSPENDED'].includes(claims.status)) throw new GrantError('BAD_CLAIMS');
  } else if (!Array.isArray(claims.plugins) || !Number.isInteger(claims.maxTenants)) throw new GrantError('BAD_CLAIMS');
  if (o.revisions) {
    const k = `${o.type}|${claims.aud}|${claims.sub}`;
    if (claims.rev < (await o.revisions.highest(k))) throw new GrantError('ROLLBACK');
    await o.revisions.raise(k, claims.rev);
  }
  return claims as T;
}

/** Request-time decision helpers for plugins. */
export function canUse(ent: EntitlementClaims, feature: string, write: boolean): 'ALLOW' | 'SUSPENDED' | 'READ_ONLY' | 'NOT_IN_PLAN' {
  if (ent.status === 'SUSPENDED') return 'SUSPENDED';
  if (!ent.features.includes(feature)) return 'NOT_IN_PLAN';
  if (write && ent.status === 'READ_ONLY') return 'READ_ONLY';
  return 'ALLOW';
}

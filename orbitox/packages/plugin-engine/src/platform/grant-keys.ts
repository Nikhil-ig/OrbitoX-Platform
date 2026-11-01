import * as crypto from 'crypto';
import {
  signGrant,
  verifyGrant,
  EntitlementClaims,
  ServiceStatus,
  GrantError,
} from './entitlement-token';

export interface GrantKeyInfo {
  kid: string;
  alg: 'EdDSA';
  crv: 'Ed25519';
  publicKeyPem: string;
}

export interface StoredGrantKeyPair {
  kid: string;
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  publicKeyPem: string;
}

// In-memory key ring (populated from environment or initialized with ephemeral dev key)
let activeKeyId: string = 'dev-key-1';
const keyRing: Map<string, StoredGrantKeyPair> = new Map();

/**
 * Initializes or loads Ed25519 key ring.
 * Priority:
 * 1. ORBITOX_GRANT_SIGNING_KEYS (JSON object or array: { "k1": { privateKey, publicKey } })
 * 2. ORBITOX_GRANT_PRIVATE_KEY + ORBITOX_GRANT_PUBLIC_KEY
 * 3. Fallback ephemeral in-memory Ed25519 key pair for tests/local dev
 */
export function initializeGrantKeys(): void {
  if (keyRing.size > 0) return;

  const rawKeysEnv = process.env.ORBITOX_GRANT_SIGNING_KEYS?.trim();
  if (rawKeysEnv) {
    try {
      const parsed = JSON.parse(rawKeysEnv);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.kid && item.privateKey && item.publicKey) {
            registerKeyPem(item.kid, item.privateKey, item.publicKey);
            activeKeyId = item.kid;
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        for (const [kid, val] of Object.entries<any>(parsed)) {
          if (val.privateKey && val.publicKey) {
            registerKeyPem(kid, val.privateKey, val.publicKey);
            activeKeyId = kid;
          }
        }
      }
    } catch (err) {
      console.error('[GrantKeys] Failed to parse ORBITOX_GRANT_SIGNING_KEYS:', err);
    }
  }

  const singlePriv = process.env.ORBITOX_GRANT_PRIVATE_KEY?.trim();
  const singlePub = process.env.ORBITOX_GRANT_PUBLIC_KEY?.trim();
  const singleKid = process.env.ORBITOX_GRANT_KEY_ID?.trim() || 'k1';
  if (singlePriv && singlePub) {
    registerKeyPem(singleKid, singlePriv, singlePub);
    activeKeyId = singleKid;
  }

  // Fallback if no keys in environment: generate an ephemeral key pair
  if (keyRing.size === 0) {
    const pair = crypto.generateKeyPairSync('ed25519');
    const pubPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    keyRing.set(activeKeyId, {
      kid: activeKeyId,
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      publicKeyPem: pubPem,
    });
  }
}

export function registerKeyPem(kid: string, privateKeyPem: string, publicKeyPem: string): void {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const publicKey = crypto.createPublicKey(publicKeyPem);
  keyRing.set(kid, {
    kid,
    privateKey,
    publicKey,
    publicKeyPem,
  });
}

export function setGrantKeysForTesting(
  keys: Record<string, { privateKey: crypto.KeyObject | string; publicKey: crypto.KeyObject | string }>,
  activeKid?: string
): void {
  keyRing.clear();
  for (const [kid, pair] of Object.entries(keys)) {
    const priv = typeof pair.privateKey === 'string' ? crypto.createPrivateKey(pair.privateKey) : pair.privateKey;
    const pub = typeof pair.publicKey === 'string' ? crypto.createPublicKey(pair.publicKey) : pair.publicKey;
    const pubPem = pub.export({ type: 'spki', format: 'pem' }).toString();
    keyRing.set(kid, {
      kid,
      privateKey: priv,
      publicKey: pub,
      publicKeyPem: pubPem,
    });
  }
  if (activeKid) {
    activeKeyId = activeKid;
  } else {
    activeKeyId = Object.keys(keys)[0] || 'dev-key-1';
  }
}

export function getActiveGrantSigner(): { kid: string; privateKey: crypto.KeyObject } {
  initializeGrantKeys();
  const active = keyRing.get(activeKeyId);
  if (!active) {
    const first = keyRing.values().next().value;
    if (first) {
      activeKeyId = first.kid;
      return { kid: first.kid, privateKey: first.privateKey };
    }
    throw new Error('No active grant signing key configured');
  }
  return { kid: active.kid, privateKey: active.privateKey };
}

export function getPublicGrantKeys(): Record<string, crypto.KeyObject> {
  initializeGrantKeys();
  const result: Record<string, crypto.KeyObject> = {};
  for (const [kid, entry] of keyRing.entries()) {
    result[kid] = entry.publicKey;
  }
  return result;
}

export function getPublicGrantKeyInfo(): GrantKeyInfo[] {
  initializeGrantKeys();
  const list: GrantKeyInfo[] = [];
  for (const [kid, entry] of keyRing.entries()) {
    list.push({
      kid,
      alg: 'EdDSA',
      crv: 'Ed25519',
      publicKeyPem: entry.publicKeyPem,
    });
  }
  return list;
}

export function rotateGrantSigningKey(newKid: string, privateKeyPem: string, publicKeyPem: string): void {
  registerKeyPem(newKid, privateKeyPem, publicKeyPem);
  activeKeyId = newKid;
}

/**
 * Creates and signs a 15-minute compact Ed25519 entitlement grant token.
 */
export function createEntitlementGrantToken(
  params: {
    tenantId: string;
    pluginId: string;
    planId: string;
    status: ServiceStatus;
    features: string[];
    quotas: Record<string, { limit: number; window: 'day' | 'month' | 'none' }>;
    revision: number;
    ttlSeconds?: number;
  },
  now = Date.now()
): string {
  const { kid, privateKey } = getActiveGrantSigner();
  const ttl = params.ttlSeconds || 15 * 60; // 15 minutes by default
  const sec = Math.floor(now / 1000);
  const claims: Omit<EntitlementClaims, 'iss' | 'iat' | 'nbf' | 'jti'> & { exp: number } = {
    typ: 'orbitox-ent',
    aud: params.pluginId,
    sub: params.tenantId,
    plan: params.planId,
    status: params.status,
    features: params.features,
    quotas: params.quotas,
    rev: params.revision,
    exp: sec + ttl,
  };

  return signGrant(claims, privateKey, kid, now);
}

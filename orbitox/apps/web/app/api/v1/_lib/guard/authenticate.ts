import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';
import { requireSecret } from '@orbitox/config';
import { HashedApiKeyRecord } from './types';
import { recordFailedAuth, resetFailedAuth } from './rate-limit';

// Global authoritative key store indexed strictly by keyId.
// Invariant: RAW SECRETS ARE NEVER STORED. Only HMAC-SHA256 verifiers.
const keyRegistry = new Map<string, HashedApiKeyRecord>();
let keystoreLoaded = false;

let serverPepper: string | null = null;
let dummyHash: Buffer | null = null;

function findRepoRoot(): string {
  let cur = process.cwd();
  while (cur && cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(cur, '.git'))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return process.cwd();
}

export function getKeystorePath(): string {
  if (process.env.ORBITOX_KEYSTORE_PATH) {
    return path.resolve(process.env.ORBITOX_KEYSTORE_PATH);
  }
  return path.join(findRepoRoot(), 'data', 'keystore.json');
}

export function loadKeystore(): void {
  try {
    const filePath = getKeystorePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed: HashedApiKeyRecord[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const record of parsed) {
          if (record && record.keyId && record.authVerifier) {
            keyRegistry.set(record.keyId, record);
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [KEYSTORE] Failed to load keystore:', err);
  }
}

export function persistKeystore(): void {
  try {
    const filePath = getKeystorePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const serialized = JSON.stringify(Array.from(keyRegistry.values()), null, 2);
    fs.writeFileSync(filePath, serialized, { encoding: 'utf8', mode: 0o600 });
  } catch (err) {
    console.warn('⚠️ [KEYSTORE] Failed to persist keystore:', err);
  }
}

export function clearKeystore(): void {
  keyRegistry.clear();
}

function ensureKeystoreLoaded(): void {
  if (!keystoreLoaded) {
    keystoreLoaded = true;
    loadKeystore();
  }
}

export function setServerPepper(pepper: string): void {
  serverPepper = pepper;
  dummyHash = crypto
    .createHmac('sha256', serverPepper)
    .update('dummy-secret-payload-for-constant-time-equalization')
    .digest();
}

export function getServerPepper(): string {
  if (!serverPepper) {
    serverPepper = requireSecret('ORBITOX_API_KEY_PEPPER', { minBytes: 16 });
    dummyHash = crypto
      .createHmac('sha256', serverPepper)
      .update('dummy-secret-payload-for-constant-time-equalization')
      .digest();
  }
  return serverPepper;
}

/**
 * Computes the HMAC-SHA256 verifier for a secret.
 */
export function computeVerifier(secret: string): string {
  const pepper = getServerPepper();
  return crypto.createHmac('sha256', pepper).update(secret).digest('hex');
}

/**
 * Registers a hashed API key record in the authoritative store.
 */
export function registerApiKey(key: HashedApiKeyRecord): void {
  ensureKeystoreLoaded();
  keyRegistry.set(key.keyId, key);
  persistKeystore();
}

/**
 * Removes or revokes a key. Revocation is immediately effective.
 */
export function revokeKey(keyId: string): boolean {
  ensureKeystoreLoaded();
  const key = keyRegistry.get(keyId);
  if (key) {
    key.status = 'revoked';
    persistKeystore();
    return true;
  }
  return false;
}

/**
 * Rotates an existing key with an optional grace period (default 24h).
 * Invariant: Generates secrets with crypto.randomBytes(32).toString('base64url').
 */
export function rotateKey(
  keyId: string,
  gracePeriodHours: number = 24
): { rawKey: string; record: HashedApiKeyRecord; oldRecord: HashedApiKeyRecord } | null {
  ensureKeystoreLoaded();
  const old = keyRegistry.get(keyId);
  if (!old || old.status === 'revoked') {
    return null;
  }

  const env = old.environment === 'production' ? 'live' : old.environment === 'staging' ? 'stage' : 'test';
  const newKeyId = `k${crypto.randomBytes(6).toString('hex')}`;
  const secretEntropy = crypto.randomBytes(32).toString('base64url');
  const rawKey = `orb_${env}_${newKeyId}_${secretEntropy}`;
  const verifier = computeVerifier(secretEntropy);
  const maskedKey = `orb_${env}_${newKeyId}_••••••••${secretEntropy.slice(-4)}`;
  const now = new Date().toISOString();

  const newRecord: HashedApiKeyRecord = {
    ...old,
    id: `key_${newKeyId}`,
    keyId: newKeyId,
    name: `${old.name} (Rotated)`,
    authVerifier: verifier,
    keyPrefix: `orb_${env}_${newKeyId}_`,
    maskedKey,
    status: 'active',
    createdAt: now,
    lastUsedAt: 'Never',
    graceExpiresAt: null,
  };

  // Mark old key in grace period
  old.status = 'grace_period';
  old.graceExpiresAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000).toISOString();
  old.rotatedToKeyId = newKeyId;

  keyRegistry.set(newKeyId, newRecord);
  persistKeystore();

  return { rawKey, record: newRecord, oldRecord: old };
}

/**
 * Returns all registered keys (sanitized without verifiers for admin listings).
 */
export function listApiKeys(): Omit<HashedApiKeyRecord, 'authVerifier'>[] {
  ensureKeystoreLoaded();
  return Array.from(keyRegistry.values()).map(({ authVerifier, ...safe }) => safe);
}

/**
 * Looks up key record by keyId.
 */
export function getApiKey(keyId: string): HashedApiKeyRecord | undefined {
  ensureKeystoreLoaded();
  return keyRegistry.get(keyId);
}

/**
 * Generates a brand-new cryptographically secure API key.
 * Emits the raw secret ONCE for the caller; stores only the verifier.
 */
export function createNewApiKey(params: {
  name: string;
  keyId?: string;
  environment?: 'production' | 'staging' | 'sandbox' | string;
  scopes: string[];
  capabilities?: string[];
  isRoot?: boolean;
  ipAllowlist?: string[];
  tenantScope?: string[];
  projectId?: string;
  environmentId?: string;
  rateLimitPerMin?: number;
  expiresInDays?: number;
}): { rawKey: string; record: HashedApiKeyRecord } {
  const env = params.environment === 'production' ? 'live' : params.environment === 'staging' ? 'stage' : 'test';
  const keyId = params.keyId ? params.keyId.replace(/[^a-zA-Z0-9-]/g, '') : `k${crypto.randomBytes(6).toString('hex')}`;
  const secretEntropy = crypto.randomBytes(32).toString('base64url');
  const rawKey = `orb_${env}_${keyId}_${secretEntropy}`;

  const verifier = computeVerifier(secretEntropy);
  const maskedKey = `orb_${env}_${keyId}_••••••••${secretEntropy.slice(-4)}`;

  const now = new Date().toISOString();
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const record: HashedApiKeyRecord = {
    id: `key_${keyId}`,
    keyId,
    name: params.name,
    authVerifier: verifier,
    keyPrefix: `orb_${env}_${keyId}_`,
    maskedKey,
    environment: params.environment || 'production',
    scopes: params.scopes,
    capabilities: params.capabilities || params.scopes,
    isRoot: Boolean(params.isRoot),
    ipAllowlist: params.ipAllowlist,
    tenantScope: params.tenantScope,
    projectId: params.projectId,
    environmentId: params.environmentId,
    status: 'active',
    expiresAt,
    createdAt: now,
    lastUsedAt: 'Never',
    rateLimitPerMin: params.rateLimitPerMin || 1000,
  };

  registerApiKey(record);
  return { rawKey, record };
}

/**
 * Extracts raw credential from request headers ONLY.
 * Invariant: Query parameter (?apiKey=) is strictly ignored and rejected.
 * Credentials are NEVER logged.
 */
export function extractCredential(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const xApiKey = req.headers.get('x-api-key');
  if (xApiKey && xApiKey.trim().length > 0) {
    return xApiKey.trim();
  }
  return null;
}

export interface AuthenticationResult {
  authenticated: boolean;
  keyRecord?: HashedApiKeyRecord;
  error?: {
    code: string;
    message: string;
    status: number;
  };
}

/**
 * Authenticates request using constant-time cryptographic verification.
 * Format: orb_<env>_<keyId>_<secret>
 *
 * Guarantees identical timing between unknown-key and wrong-secret to eliminate
 * timing side-channels.
 */
export async function authenticateCredential(
  req: NextRequest,
  clientIp: string
): Promise<AuthenticationResult> {
  ensureKeystoreLoaded();
  const pepper = getServerPepper();
  const rawKey = extractCredential(req);

  if (!rawKey) {
    return {
      authenticated: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Provide a valid credential via Authorization: Bearer or x-api-key header.',
        status: 401,
      },
    };
  }

  // Parse key format: orb_<env>_<keyId>_<secret>
  const parts = rawKey.split('_');
  if (parts.length < 4 || parts[0] !== 'orb') {
    // Constant-time dummy computation to equalize execution time
    const dummyCandidate = crypto
      .createHmac('sha256', pepper)
      .update(rawKey)
      .digest();
    crypto.timingSafeEqual(dummyHash!, dummyCandidate);

    await recordFailedAuth(clientIp);
    return {
      authenticated: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'The provided API key could not be verified against the platform keystore.',
        status: 401,
      },
    };
  }

  let keyId = parts[2] || '';
  let secret = parts.slice(3).join('_');

  // Handle keys that might have an underscore in keyId
  if (!keyRegistry.has(keyId) && parts.length >= 5 && parts[2] && parts[3]) {
    const candidateId = `${parts[2]}_${parts[3]}`;
    if (keyRegistry.has(candidateId)) {
      keyId = candidateId;
      secret = parts.slice(4).join('_');
    }
  }

  const keyRecord = keyRegistry.get(keyId);

  // Compute HMAC-SHA256 for candidate secret
  const candidateVerifierBuf = crypto
    .createHmac('sha256', pepper)
    .update(secret)
    .digest();

  if (!keyRecord) {
    // Constant-time execution with dummy hash
    crypto.timingSafeEqual(dummyHash!, candidateVerifierBuf);
    await recordFailedAuth(clientIp);
    return {
      authenticated: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'The provided API key could not be verified against the platform keystore.',
        status: 401,
      },
    };
  }

  // Key record found: compare against stored verifier
  const expectedVerifierBuf = Buffer.from(keyRecord.authVerifier, 'hex');
  const isMatch =
    expectedVerifierBuf.length === candidateVerifierBuf.length &&
    crypto.timingSafeEqual(expectedVerifierBuf, candidateVerifierBuf);

  if (!isMatch) {
    await recordFailedAuth(clientIp);
    return {
      authenticated: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'The provided API key could not be verified against the platform keystore.',
        status: 401,
      },
    };
  }

  // Check key status and expiration
  const now = Date.now();
  if (keyRecord.status === 'grace_period') {
    if (keyRecord.graceExpiresAt && new Date(keyRecord.graceExpiresAt).getTime() < now) {
      keyRecord.status = 'expired';
      persistKeystore();
      return {
        authenticated: false,
        error: {
          code: 'KEY_EXPIRED',
          message: 'The rotated API key grace period has expired. Please use the new active key.',
          status: 401,
        },
      };
    }
  } else if (keyRecord.status !== 'active') {
    return {
      authenticated: false,
      error: {
        code: keyRecord.status === 'revoked' ? 'KEY_REVOKED' : 'KEY_INACTIVE',
        message: `The provided API key is ${keyRecord.status.toUpperCase()}. Access denied.`,
        status: 401,
      },
    };
  }

  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt).getTime() < now) {
    keyRecord.status = 'expired';
    persistKeystore();
    return {
      authenticated: false,
      error: {
        code: 'KEY_EXPIRED',
        message: 'The provided API key has expired.',
        status: 401,
      },
    };
  }

  // Successful authentication: update lastUsedAt asynchronously & reset failed auth tracker
  resetFailedAuth(clientIp);
  keyRecord.lastUsedAt = new Date().toISOString();

  return {
    authenticated: true,
    keyRecord,
  };
}

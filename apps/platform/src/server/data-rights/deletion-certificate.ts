import 'server-only';
import crypto from 'node:crypto';

export const DELETION_CERTIFICATE_PURPOSE = 'orbitox.deletion_certificate.v1' as const;
export const DELETION_CERTIFICATE_VERSION = 'orbitox.deletion_certificate.v1' as const;
export const DEFAULT_BACKUP_RETENTION_DAYS = 35;

export interface DeletionCertKeyPair {
  privateKey?: string;
  publicKey: string;
}

export interface DeletionCertificatePluginEntry {
  pluginId: string;
  tenantId: string;
  rowsDeletedByTable: Record<string, number>;
}

export interface DeletionCertificatePayload {
  version: typeof DELETION_CERTIFICATE_VERSION;
  purpose: typeof DELETION_CERTIFICATE_PURPOSE;
  keyId: string;
  spkiFingerprint: string;
  organizationId: string;
  organizationSlug?: string;
  requestId: string;
  requestedAt: string;
  scheduledFor: string;
  completedAt: string;
  backupRetentionDays: number;
  backupPitrExpiryAt: string;
  backupNotice: string;
  plugins: DeletionCertificatePluginEntry[];
  platformRowsDeletedByTable: Record<string, number>;
  objectStoreObjectsDeleted: number;
  totalRowsDeleted: number;
}

export interface SignedDeletionCertificate {
  algorithm: 'Ed25519';
  keyId: string;
  spkiFingerprint: string;
  payload: DeletionCertificatePayload;
  signature: string;
}

/**
 * Produces deterministic UTF-8 canonical JSON by sorting object keys lexicographically.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

function spkiFingerprintHex(publicKeyPem: string): string {
  const der = crypto
    .createPublicKey(publicKeyPem)
    .export({ type: 'spki', format: 'der' });
  return crypto.createHash('sha256').update(der).digest('hex');
}

function extractForbiddenGrantFingerprints(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): Set<string> {
  const fingerprints = new Set<string>();

  const collectFromJson = (raw?: string) => {
    if (!raw?.trim()) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const value of Object.values(parsed)) {
        const pubPem =
          typeof value === 'string'
            ? value
            : (value as Record<string, unknown>)?.publicKey ||
              (value as Record<string, unknown>)?.publicKeyPem;
        if (typeof pubPem === 'string' && pubPem.includes('BEGIN PUBLIC KEY')) {
          fingerprints.add(spkiFingerprintHex(pubPem));
        }
      }
    } catch {
      // Malformed grant JSON should not mask deletion-cert validation.
    }
  };

  collectFromJson(env.ORBITOX_GRANT_SIGNING_KEYS);
  if (env.ORBITOX_GRANT_PUBLIC_KEY?.includes('BEGIN PUBLIC KEY')) {
    fingerprints.add(spkiFingerprintHex(env.ORBITOX_GRANT_PUBLIC_KEY));
  }
  if (env.ORBITOX_GRANT_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY')) {
    try {
      const pub = crypto.createPublicKey(
        crypto.createPrivateKey(env.ORBITOX_GRANT_PRIVATE_KEY),
      );
      const der = pub.export({ type: 'spki', format: 'der' });
      fingerprints.add(crypto.createHash('sha256').update(der).digest('hex'));
    } catch {
      // Ignore malformed legacy grant private key
    }
  }

  return fingerprints;
}

export function parseDeletionCertKeys(
  rawJson: string,
): { activeKeyId: string; keys: Record<string, DeletionCertKeyPair> } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('ORBITOX_DELETION_CERT_KEYS must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ORBITOX_DELETION_CERT_KEYS must be a JSON object.');
  }

  const obj = parsed as Record<string, unknown>;
  const rawMap =
    obj.keys && typeof obj.keys === 'object' && !Array.isArray(obj.keys)
      ? (obj.keys as Record<string, unknown>)
      : obj;

  const keys: Record<string, DeletionCertKeyPair> = {};
  for (const [kid, val] of Object.entries(rawMap)) {
    if (kid === 'activeKeyId') continue;
    if (typeof val === 'string') {
      if (!val.includes('BEGIN PUBLIC KEY')) {
        throw new Error(`Deletion certificate key "${kid}" must be a PEM public key or keypair object.`);
      }
      keys[kid] = { publicKey: val };
    } else if (val && typeof val === 'object') {
      const pair = val as Record<string, unknown>;
      const publicKey =
        typeof pair.publicKey === 'string' ? pair.publicKey : undefined;
      const privateKey =
        typeof pair.privateKey === 'string' ? pair.privateKey : undefined;
      if (!publicKey || !publicKey.includes('BEGIN PUBLIC KEY')) {
        throw new Error(`Deletion certificate key "${kid}" missing valid publicKey PEM.`);
      }
      if (privateKey && !privateKey.includes('BEGIN PRIVATE KEY')) {
        throw new Error(`Deletion certificate key "${kid}" has invalid privateKey PEM.`);
      }
      keys[kid] = { publicKey, ...(privateKey ? { privateKey } : {}) };
    } else {
      throw new Error(`Invalid entry for deletion certificate key "${kid}".`);
    }
  }

  const keyIds = Object.keys(keys);
  if (keyIds.length === 0) {
    throw new Error('ORBITOX_DELETION_CERT_KEYS must configure at least one key.');
  }

  const activeKeyId =
    typeof obj.activeKeyId === 'string' && keys[obj.activeKeyId]
      ? obj.activeKeyId
      : keyIds[keyIds.length - 1]!;

  return { activeKeyId, keys };
}

export function loadDeletionCertSigningKeysFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): {
  activeKeyId: string;
  keys: Record<string, { privateKey: string; publicKey: string }>;
  publicKeys: Record<string, { publicKey: string }>;
} {
  const raw = env.ORBITOX_DELETION_CERT_KEYS?.trim();
  if (!raw) {
    throw new Error('ORBITOX_DELETION_CERT_KEYS is not configured.');
  }

  const parsed = parseDeletionCertKeys(raw);
  const explicitActive = env.ORBITOX_DELETION_CERT_KEY_ACTIVE?.trim();
  if (!explicitActive && env.NODE_ENV === 'production') {
    throw new Error('ORBITOX_DELETION_CERT_KEY_ACTIVE is not configured.');
  }

  const activeKeyId = explicitActive || parsed.activeKeyId;
  if (!parsed.keys[activeKeyId]) {
    throw new Error(
      `ORBITOX_DELETION_CERT_KEY_ACTIVE "${activeKeyId}" not found in ORBITOX_DELETION_CERT_KEYS.`,
    );
  }

  const forbiddenGrantFps = extractForbiddenGrantFingerprints(env);
  const signingKeys: Record<string, { privateKey: string; publicKey: string }> = {};
  const publicKeys: Record<string, { publicKey: string }> = {};

  for (const [kid, pair] of Object.entries(parsed.keys)) {
    const pubObj = crypto.createPublicKey(pair.publicKey);
    if (pubObj.asymmetricKeyType !== 'ed25519') {
      throw new Error(`Deletion certificate key "${kid}" must use Ed25519.`);
    }
    const pubFp = spkiFingerprintHex(pair.publicKey);
    if (forbiddenGrantFps.has(pubFp)) {
      throw new Error(
        `Security violation: deletion certificate key "${kid}" reuses an entitlement grant key (forbidden).`,
      );
    }

    publicKeys[kid] = { publicKey: pair.publicKey };

    if (!pair.privateKey) {
      if (kid === activeKeyId) {
        throw new Error(`Active deletion certificate key "${kid}" is missing privateKey for signing.`);
      }
      // Retired public keys stay in the ring for verifying previously signed certificates
      continue;
    }

    const privObj = crypto.createPrivateKey(pair.privateKey);
    if (privObj.asymmetricKeyType !== 'ed25519') {
      throw new Error(`Deletion certificate key "${kid}" must use Ed25519.`);
    }
    const derivedPubHex = crypto
      .createHash('sha256')
      .update(crypto.createPublicKey(privObj).export({ type: 'spki', format: 'der' }))
      .digest('hex');
    if (derivedPubHex !== pubFp) {
      throw new Error(`Deletion certificate key "${kid}" privateKey/publicKey mismatch.`);
    }
    signingKeys[kid] = { privateKey: pair.privateKey, publicKey: pair.publicKey };
  }

  if (!signingKeys[activeKeyId]) {
    throw new Error(`Active deletion certificate key "${activeKeyId}" has no signing privateKey.`);
  }

  return { activeKeyId, keys: signingKeys, publicKeys };
}

export function extractDeletionCertPublicKeys(
  rawJson: string,
): Record<string, { publicKey: string }> {
  const parsed = parseDeletionCertKeys(rawJson);
  const result: Record<string, { publicKey: string }> = {};
  for (const [kid, pair] of Object.entries(parsed.keys)) {
    result[kid] = { publicKey: pair.publicKey };
  }
  return result;
}

export function getBackupRetentionDays(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): number {
  const raw = env.ORBITOX_BACKUP_RETENTION_DAYS?.trim();
  if (!raw) return DEFAULT_BACKUP_RETENTION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 3650) {
    throw new Error('ORBITOX_BACKUP_RETENTION_DAYS must be an integer between 1 and 3650.');
  }
  return parsed;
}

export function buildSignedDeletionCertificate(
  input: {
    organizationId: string;
    organizationSlug?: string;
    requestId: string;
    requestedAt: Date;
    scheduledFor: Date;
    completedAt: Date;
    plugins: DeletionCertificatePluginEntry[];
    platformRowsDeletedByTable: Record<string, number>;
    objectStoreObjectsDeleted: number;
    backupRetentionDays?: number;
  },
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): SignedDeletionCertificate {
  const { activeKeyId, keys } = loadDeletionCertSigningKeysFromEnv(env);
  const keyPair = keys[activeKeyId];
  if (!keyPair) {
    throw new Error(`Active deletion certificate key "${activeKeyId}" not found.`);
  }

  const retentionDays = input.backupRetentionDays ?? getBackupRetentionDays(env);
  const backupPitrExpiryAt = new Date(
    input.completedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const expiryDateOnly = backupPitrExpiryAt.slice(0, 10);

  let totalRowsDeleted = 0;
  const normalizedPlugins = [...input.plugins]
    .map((p) => {
      const sortedTables: Record<string, number> = {};
      for (const t of Object.keys(p.rowsDeletedByTable).sort()) {
        const count = p.rowsDeletedByTable[t] ?? 0;
        sortedTables[t] = count;
        totalRowsDeleted += count;
      }
      return {
        pluginId: p.pluginId,
        tenantId: p.tenantId,
        rowsDeletedByTable: sortedTables,
      };
    })
    .sort((a, b) => `${a.tenantId}:${a.pluginId}`.localeCompare(`${b.tenantId}:${b.pluginId}`));

  const sortedPlatformTables: Record<string, number> = {};
  for (const t of Object.keys(input.platformRowsDeletedByTable).sort()) {
    const count = input.platformRowsDeletedByTable[t] ?? 0;
    sortedPlatformTables[t] = count;
    totalRowsDeleted += count;
  }

  const pubSpkiFp = spkiFingerprintHex(keyPair.publicKey);

  const payload: DeletionCertificatePayload = {
    version: DELETION_CERTIFICATE_VERSION,
    purpose: DELETION_CERTIFICATE_PURPOSE,
    keyId: activeKeyId,
    spkiFingerprint: pubSpkiFp,
    organizationId: input.organizationId,
    ...(input.organizationSlug ? { organizationSlug: input.organizationSlug } : {}),
    requestId: input.requestId,
    requestedAt: input.requestedAt.toISOString(),
    scheduledFor: input.scheduledFor.toISOString(),
    completedAt: input.completedAt.toISOString(),
    backupRetentionDays: retentionDays,
    backupPitrExpiryAt,
    backupNotice: `data persists in encrypted backups until ${expiryDateOnly}, then is unrecoverable`,
    plugins: normalizedPlugins,
    platformRowsDeletedByTable: sortedPlatformTables,
    objectStoreObjectsDeleted: input.objectStoreObjectsDeleted,
    totalRowsDeleted,
  };

  const payloadBytes = Buffer.from(canonicalJson(payload), 'utf8');
  const signature = crypto
    .sign(null, payloadBytes, crypto.createPrivateKey(keyPair.privateKey))
    .toString('base64url');

  return {
    algorithm: 'Ed25519',
    keyId: activeKeyId,
    spkiFingerprint: pubSpkiFp,
    payload,
    signature,
  };
}

export function verifyDeletionCertificate(
  certificate: unknown,
  trustedKeysInput: string | Record<string, string | { publicKey: string }>,
): { valid: true; certificate: SignedDeletionCertificate } | { valid: false; reason: string } {
  if (!certificate || typeof certificate !== 'object' || Array.isArray(certificate)) {
    return { valid: false, reason: 'Certificate must be a JSON object.' };
  }

  const cert = certificate as Partial<SignedDeletionCertificate>;
  if (cert.algorithm !== 'Ed25519') {
    return { valid: false, reason: `Unsupported certificate algorithm: ${String(cert.algorithm)}` };
  }
  if (!cert.keyId || typeof cert.keyId !== 'string') {
    return { valid: false, reason: 'Missing keyId in certificate.' };
  }
  if (!cert.signature || typeof cert.signature !== 'string') {
    return { valid: false, reason: 'Missing signature in certificate.' };
  }
  if (!cert.payload || typeof cert.payload !== 'object' || Array.isArray(cert.payload)) {
    return { valid: false, reason: 'Missing certificate payload.' };
  }

  const payload = cert.payload as Partial<DeletionCertificatePayload>;
  if (payload.version !== DELETION_CERTIFICATE_VERSION) {
    return { valid: false, reason: `Unexpected certificate version: ${String(payload.version)}` };
  }
  if (payload.purpose !== DELETION_CERTIFICATE_PURPOSE) {
    return {
      valid: false,
      reason: `Certificate purpose mismatch: expected "${DELETION_CERTIFICATE_PURPOSE}", got "${String(payload.purpose)}"`,
    };
  }
  if (payload.keyId !== cert.keyId) {
    return { valid: false, reason: 'Envelope keyId does not match payload.keyId.' };
  }
  if (
    typeof payload.backupNotice !== 'string' ||
    !payload.backupNotice.includes('data persists in encrypted backups until') ||
    !payload.backupNotice.includes('unrecoverable')
  ) {
    return { valid: false, reason: 'Certificate missing required encrypted backup retention notice.' };
  }

  let publicKeyPem: string | undefined;
  if (typeof trustedKeysInput === 'string') {
    const trimmed = trustedKeysInput.trim();
    if (!trimmed.startsWith('{') && trimmed.includes('BEGIN PUBLIC KEY')) {
      publicKeyPem = trimmed;
    } else {
      const parsed = parseDeletionCertKeys(trimmed);
      publicKeyPem = parsed.keys[cert.keyId]?.publicKey;
    }
  } else {
    const entry = trustedKeysInput[cert.keyId];
    publicKeyPem = typeof entry === 'string' ? entry : entry?.publicKey;
  }

  if (!publicKeyPem) {
    return { valid: false, reason: `No trusted public key found for keyId "${cert.keyId}".` };
  }

  try {
    const expectedSpkiFp = spkiFingerprintHex(publicKeyPem);
    if (typeof payload.spkiFingerprint !== 'string' || payload.spkiFingerprint !== expectedSpkiFp) {
      return {
        valid: false,
        reason: `Certificate payload spkiFingerprint does not match trusted public key SPKI for keyId "${cert.keyId}".`,
      };
    }
    if (typeof cert.spkiFingerprint === 'string' && cert.spkiFingerprint !== expectedSpkiFp) {
      return {
        valid: false,
        reason: `Certificate envelope spkiFingerprint does not match trusted public key SPKI for keyId "${cert.keyId}".`,
      };
    }

    const payloadBytes = Buffer.from(canonicalJson(cert.payload), 'utf8');
    const sigBytes = Buffer.from(cert.signature, 'base64url');
    const verified = crypto.verify(
      null,
      payloadBytes,
      crypto.createPublicKey(publicKeyPem),
      sigBytes,
    );
    if (!verified) {
      return { valid: false, reason: 'Ed25519 signature verification failed.' };
    }
  } catch (err: any) {
    return {
      valid: false,
      reason: `Signature verification error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { valid: true, certificate: cert as SignedDeletionCertificate };
}

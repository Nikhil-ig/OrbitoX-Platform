/**
 * PHI field encryption (AES-256-GCM) with key rotation and tenant-salted blind indexes.
 *
 * Wire format (matches SQL guard hms_is_sealed):  v1.<kid>.<iv b64url 16>.<tag b64url 22>.<ciphertext b64url>
 *
 * Security properties:
 *  - Confidentiality + integrity per field (GCM).
 *  - AAD = tenantId|column|rowId: a ciphertext copied to another row, column or tenant FAILS to open.
 *  - Key rotation: seal() always uses the active kid; open() accepts any configured kid;
 *    needsReseal() tells a maintenance job which values to re-encrypt.
 *  - Blind index uses a SEPARATE key; it is tenant- and column-salted, so equal values
 *    in two tenants produce unrelated indexes (no cross-tenant correlation).
 *  - Fails closed at construction if keys are missing, wrong length, or active kid absent.
 */
import crypto from 'crypto';

const KID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const SEALED_RE = /^v1\.([A-Za-z0-9_-]{1,32})\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]+)$/;
const MAX_PLAINTEXT_BYTES = 64 * 1024;

export class PhiCryptoError extends Error {
  constructor(public readonly code: 'PHI_CONFIG_INVALID' | 'PHI_KEY_UNAVAILABLE' | 'PHI_DECRYPT_FAILED' | 'PHI_INPUT_INVALID', message: string) {
    super(message);
    this.name = 'PhiCryptoError';
  }
}

export interface PhiKeyConfig {
  keys: Record<string, string>;   // kid -> base64 32-byte key
  activeKid: string;
  indexKey: string;               // base64 32-byte key, used ONLY for blind indexes
}

export class PhiKeyRing {
  private readonly keys = new Map<string, Buffer>();
  private readonly indexKey: Buffer;
  readonly activeKid: string;

  constructor(cfg: PhiKeyConfig) {
    for (const [kid, b64] of Object.entries(cfg.keys)) {
      if (!KID_RE.test(kid)) throw new PhiCryptoError('PHI_CONFIG_INVALID', `invalid kid "${kid}"`);
      const key = Buffer.from(b64, 'base64');
      if (key.length !== 32) throw new PhiCryptoError('PHI_CONFIG_INVALID', `key ${kid} must be 32 bytes`);
      this.keys.set(kid, key);
    }
    if (!this.keys.has(cfg.activeKid)) throw new PhiCryptoError('PHI_CONFIG_INVALID', 'active kid not in key ring');
    const idx = Buffer.from(cfg.indexKey, 'base64');
    if (idx.length !== 32) throw new PhiCryptoError('PHI_CONFIG_INVALID', 'index key must be 32 bytes');
    for (const k of this.keys.values()) {
      if (crypto.timingSafeEqual(k, idx)) throw new PhiCryptoError('PHI_CONFIG_INVALID', 'index key must differ from encryption keys');
    }
    this.indexKey = idx;
    this.activeKid = cfg.activeKid;
  }

  /** ORBITOX_PHI_KEYS='{"k2026a":"<b64>"}' ORBITOX_PHI_ACTIVE_KID=k2026a ORBITOX_PHI_INDEX_KEY=<b64> */
  static fromEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): PhiKeyRing {
    let keys: Record<string, string>;
    try { keys = JSON.parse(env.ORBITOX_PHI_KEYS || ''); } catch { throw new PhiCryptoError('PHI_CONFIG_INVALID', 'ORBITOX_PHI_KEYS must be JSON'); }
    return new PhiKeyRing({ keys, activeKid: env.ORBITOX_PHI_ACTIVE_KID || '', indexKey: env.ORBITOX_PHI_INDEX_KEY || '' });
  }

  hasKid(kid: string): boolean { return this.keys.has(kid); }
  keyFor(kid: string): Buffer {
    const k = this.keys.get(kid);
    if (!k) throw new PhiCryptoError('PHI_KEY_UNAVAILABLE', `kid ${kid} not configured`);
    return k;
  }
  indexKeyBytes(): Buffer { return this.indexKey; }
}

export interface FieldRef { tenantId: string; column: string; rowId: string; }

function aad(ref: FieldRef): Buffer {
  if (!ref.tenantId || !ref.column || !ref.rowId || [ref.tenantId, ref.column, ref.rowId].some((s) => s.includes('|'))) {
    throw new PhiCryptoError('PHI_INPUT_INVALID', 'tenantId, column and rowId are required and must not contain "|"');
  }
  return Buffer.from(`${ref.tenantId}|${ref.column}|${ref.rowId}`, 'utf8');
}

export function seal(ring: PhiKeyRing, plaintext: string, ref: FieldRef): string {
  if (typeof plaintext !== 'string') throw new PhiCryptoError('PHI_INPUT_INVALID', 'plaintext must be a string');
  if (Buffer.byteLength(plaintext, 'utf8') > MAX_PLAINTEXT_BYTES) throw new PhiCryptoError('PHI_INPUT_INVALID', 'plaintext too large');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ring.keyFor(ring.activeKid), iv);
  cipher.setAAD(aad(ref));
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return ['v1', ring.activeKid, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.');
}

export function open(ring: PhiKeyRing, sealed: string, ref: FieldRef): string {
  const m = SEALED_RE.exec(sealed);
  if (!m || !m[1] || !m[2] || !m[3] || !m[4]) throw new PhiCryptoError('PHI_DECRYPT_FAILED', 'malformed ciphertext');
  const kid = m[1];
  const iv = m[2];
  const tag = m[3];
  const ct = m[4];
  const decipher = crypto.createDecipheriv('aes-256-gcm', ring.keyFor(kid), Buffer.from(iv, 'base64url'));
  decipher.setAAD(aad(ref));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  try {
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    // Never include ciphertext, key id details or plaintext fragments in errors.
    throw new PhiCryptoError('PHI_DECRYPT_FAILED', 'ciphertext failed authentication');
  }
}

/** true when a value was sealed with a non-active key and should be re-sealed by maintenance. */
export function needsReseal(ring: PhiKeyRing, sealed: string): boolean {
  const m = SEALED_RE.exec(sealed);
  return !!m && m[1] !== ring.activeKid;
}

export function reseal(ring: PhiKeyRing, sealed: string, ref: FieldRef): string {
  return needsReseal(ring, sealed) ? seal(ring, open(ring, sealed, ref), ref) : sealed;
}

export type BlindKind = 'phone' | 'email' | 'name' | 'exact';

/** Normalisation decides what counts as "the same value" for search. Keep it stable forever (or version it). */
export function normalizeForIndex(value: string, kind: BlindKind): string {
  const v = value.normalize('NFKC').trim();
  switch (kind) {
    case 'phone': {
      const digits = v.replace(/[^\d+]/g, '');
      // Indian numbers: accept 10-digit local, 0-prefixed, or +91; index on the 10-digit subscriber number
      const local = digits.replace(/^\+?91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
      if (!/^\+?\d{6,15}$/.test(local)) throw new PhiCryptoError('PHI_INPUT_INVALID', 'invalid phone');
      return local;
    }
    case 'email': return v.toLowerCase();
    case 'name':  return v.toLowerCase().replace(/\s+/g, ' ');
    case 'exact': return v;
  }
}

/** 32-char base64url (192 bits) — matches CHECK length("…Blind") = 32. */
export function blindIndex(ring: PhiKeyRing, value: string, kind: BlindKind, tenantId: string, column: string): string {
  return crypto.createHmac('sha256', ring.indexKeyBytes())
    .update(`v1|${tenantId}|${column}|${kind}|${normalizeForIndex(value, kind)}`)
    .digest('base64url')
    .slice(0, 32);
}

let defaultRing: PhiKeyRing | undefined;
export function getPhiKeyRing(): PhiKeyRing {
  if (defaultRing) return defaultRing;
  try {
    defaultRing = PhiKeyRing.fromEnv();
    return defaultRing;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err;
    const k1 = Buffer.alloc(32, 1).toString('base64');
    const idx = Buffer.alloc(32, 2).toString('base64');
    defaultRing = new PhiKeyRing({ keys: { kdev: k1 }, activeKid: 'kdev', indexKey: idx });
    return defaultRing;
  }
}

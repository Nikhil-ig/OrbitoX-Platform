import crypto from 'node:crypto';
import localBreachedPasswordHashes from './data/breached-password-hashes.json';

export type AccountTokenPurpose =
  | 'VERIFY_EMAIL'
  | 'RESET_PASSWORD'
  | 'INVITE'
  | 'EMAIL_CHANGE'
  | 'DATA_EXPORT_DOWNLOAD';

export const ACCOUNT_TOKEN_TTL_SECONDS: Record<AccountTokenPurpose, number> = {
  VERIFY_EMAIL: 24 * 60 * 60,
  RESET_PASSWORD: 30 * 60,
  INVITE: 7 * 24 * 60 * 60,
  EMAIL_CHANGE: 60 * 60,
  DATA_EXPORT_DOWNLOAD: 24 * 60 * 60,
};

export const PASSWORD_SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

export const MIN_PASSWORD_LENGTH = 12;
export const ACCOUNT_LOCKOUT_DECAY_MS = 24 * 60 * 60 * 1000;
export const ACCOUNT_LOCKOUT_THRESHOLD = 5;
export const ACCOUNT_LOCKOUT_BASE_MS = 15 * 60 * 1000;
export const ACCOUNT_SESSION_IDLE_MS = 30 * 60 * 1000;
export const ACCOUNT_SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertValidEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) {
    throw new Error('Enter a valid email address.');
  }
  return normalized;
}

export function assertValidPassword(password: string): void {
  if ([...password].length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

export async function assertPasswordNotBreached(password: string): Promise<void> {
  const sha1 = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  if (localBreachedPasswordHashes.includes(sha1)) {
    throw new Error('Choose a password that has not appeared in a data breach.');
  }
  const apiMode = (process.env.ORBITOX_BREACHED_PASSWORD_API || 'on').trim().toLowerCase();
  if (!['on', 'off'].includes(apiMode)) {
    throw new Error('ORBITOX_BREACHED_PASSWORD_API must be set to "on" or "off".');
  }
  if (apiMode === 'off') {
    reportBreachedPasswordApiFallback('disabled');
    return;
  }

  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 3000);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      cache: 'no-store',
      signal: abort.signal,
    });
    if (!response.ok) throw new Error(`Password breach check failed with HTTP ${response.status}.`);
    const records = (await response.text()).split(/\r?\n/);
    const breached = records.some((record) => {
      const [candidate, count] = record.trim().split(':');
      return candidate?.toUpperCase() === suffix && Number(count) > 0;
    });
    if (breached) throw new Error('Choose a password that has not appeared in a data breach.');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Choose a password that has not appeared in a data breach.'
    ) {
      throw error;
    }
    reportBreachedPasswordApiFallback('unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

function reportBreachedPasswordApiFallback(reason: 'disabled' | 'unavailable'): void {
  console.error(
    JSON.stringify({
      event: 'account_security.breached_password_api_fallback',
      severity: 'HIGH',
      reason,
      timestamp: new Date().toISOString(),
    }),
  );
}

export async function hashAccountPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt);
  return `scrypt$32768$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyAccountPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    parts[1] !== '32768' ||
    parts[2] !== '8' ||
    parts[3] !== '1' ||
    !parts[4] ||
    !parts[5]
  ) {
    return false;
  }
  try {
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = await scrypt(password, salt);
    return crypto.timingSafeEqual(actual, expected);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid account password hash.') return false;
    throw error;
  }
}

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, PASSWORD_SCRYPT_OPTIONS, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export function newAccountToken<P extends AccountTokenPurpose>(purpose: P, now = Date.now()) {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashAccountToken(token),
    purpose,
    expiresAt: new Date(now + ACCOUNT_TOKEN_TTL_SECONDS[purpose] * 1000),
  };
}

export function hashAccountToken(token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Malformed account token.');
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function uniformAccountResponse() {
  return {
    status: 202,
    body: { ok: true, message: 'If an account exists for this address, we have sent an email.' },
  } as const;
}

export function buildAccountLink(baseUrl: string, path: string, token: string): string {
  const url = new URL(path, baseUrl);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Account links must use HTTPS.');
  }
  url.hash = `token=${encodeURIComponent(token)}`;
  return url.toString();
}

export function generateTotpSecret(): string {
  return encodeBase32(crypto.randomBytes(20));
}

export function sealTotpSecret(secret: string): string {
  const key = getMfaEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function unsealTotpSecret(sealed: string): string {
  const [version, ivText, tagText, ciphertextText, ...extra] = sealed.split('.');
  if (version !== 'v1' || !ivText || !tagText || !ciphertextText || extra.length > 0) {
    throw new Error('Invalid encrypted TOTP secret.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getMfaEncryptionKey(),
    Buffer.from(ivText, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function getMfaEncryptionKey(): Buffer {
  const encoded = process.env.ORBITOX_MFA_ENCRYPTION_KEY;
  if (!encoded) throw new Error('ORBITOX_MFA_ENCRYPTION_KEY is required to manage MFA secrets.');
  const key = Buffer.from(encoded, 'base64');
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded) || key.length !== 32) {
    throw new Error('ORBITOX_MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  return getTotpStep(secret, code, now) !== null;
}

export function getTotpStep(secret: string, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const key = decodeBase32(secret);
  const step = Math.floor(now / 30_000);
  for (const candidateStep of [step, step - 1, step + 1]) {
    if (candidateStep < 0) continue;
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(candidateStep));
    const digest = crypto.createHmac('sha1', key).update(counter).digest();
    const index = digest[digest.length - 1]! & 0x0f;
    const binary = digest.readUInt32BE(index) & 0x7fffffff;
    const expected = String(binary % 1_000_000).padStart(6, '0');
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return candidateStep;
  }
  return null;
}

export function makeBackupCodes(count = 10): string[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: count }, () => {
    let value = '';
    while (value.length < 12) {
      for (const byte of crypto.randomBytes(16)) {
        if (byte < 252) value += alphabet[byte % alphabet.length];
        if (value.length === 12) break;
      }
    }
    return value.match(/.{1,4}/g)!.join('-');
  });
}

export function hashBackupCode(operatorId: string, code: string): string {
  const normalized = code.replace(/-/g, '').toUpperCase();
  if (!/^[A-Z0-9]{12}$/.test(normalized)) throw new Error('Malformed backup code.');
  return crypto.createHash('sha256').update(`${operatorId}:${normalized}`).digest('hex');
}

export function newSessionTokens() {
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const csrfToken = crypto.randomBytes(32).toString('base64url');
  return {
    sessionToken,
    sessionTokenHash: crypto.createHash('sha256').update(sessionToken).digest('hex'),
    csrfToken,
    csrfTokenHash: crypto.createHash('sha256').update(csrfToken).digest('hex'),
  };
}

export {
  getAccountTokenEncryptionKey,
  encryptAccountEmailPayload,
  decryptAccountEmailPayload,
} from './account-email-payload';

function encodeBase32(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/=+$/, '');
  if (!normalized || /[^A-Z2-7]/.test(normalized)) throw new Error('Invalid base32 TOTP secret.');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const character of normalized) {
    value = (value << 5) | BASE32.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

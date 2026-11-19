import 'server-only';
import crypto from 'node:crypto';

/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX Account Email Payload Encryption & Decryption
 * ─────────────────────────────────────────────────────────────
 * Dedicated, isolated helper for AES-256-GCM encrypted payload handling.
 * Kept separate from account-security.ts so that the outbox
 * email worker (worker_email) does not pull in MFA or breached password
 * dependencies into its runtime closure.
 * ─────────────────────────────────────────────────────────────
 */

export function getAccountTokenEncryptionKey(): Buffer {
  const encoded = process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error('ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY is required to queue account emails.');
  }
  const key = Buffer.from(encoded, 'base64');
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded) || key.length !== 32) {
    throw new Error('ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
}

export function encryptAccountEmailPayload(payload: unknown): string {
  const key = getAccountTokenEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptAccountEmailPayload<T>(sealed: string): T {
  const [version, ivText, tagText, ciphertextText, ...extra] = sealed.split('.');
  if (version !== 'v1' || !ivText || !tagText || !ciphertextText || extra.length > 0) {
    throw new Error('Invalid encrypted account email payload.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getAccountTokenEncryptionKey(),
    Buffer.from(ivText, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  const cleartext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(cleartext) as T;
}

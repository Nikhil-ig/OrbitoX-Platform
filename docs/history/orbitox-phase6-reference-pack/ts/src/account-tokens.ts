/**
 * Single-use account tokens (verify email, reset password, invite, email change).
 * - 256-bit random token in the link; only SHA-256(token) is stored (AccountToken.tokenHash).
 * - Purpose-bound and expiring; consumed with ONE conditional UPDATE (see consumeSql).
 * - Issuing a new token of the same purpose revokes older unused ones (revokeSql).
 * - Responses never reveal whether an email exists (see uniformResponse).
 */
import crypto from 'node:crypto';

export type Purpose = 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'INVITE' | 'EMAIL_CHANGE';
export const TTL_SECONDS: Record<Purpose, number> = {
  VERIFY_EMAIL: 24 * 3600, RESET_PASSWORD: 30 * 60, INVITE: 7 * 86400, EMAIL_CHANGE: 3600,
};

export function newToken(purpose: Purpose, now = Date.now()) {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token), purpose, expiresAt: new Date(now + TTL_SECONDS[purpose] * 1000) };
}

export function hashToken(token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('malformed token');
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Atomic consume: returns the row only for the first caller, before expiry, with the right purpose. */
export const consumeSql = `
  UPDATE "AccountToken" SET "usedAt" = now()
   WHERE "tokenHash" = $1 AND "purpose" = $2 AND "usedAt" IS NULL AND "expiresAt" > now()
  RETURNING "userId", "organizationId", "email", "role"`;

export const revokeSql = `
  UPDATE "AccountToken" SET "usedAt" = now()
   WHERE "userId" = $1 AND "purpose" = $2 AND "usedAt" IS NULL`;

/** Same body and status whether or not the account exists; send the email asynchronously. */
export function uniformResponse() {
  return { status: 202, body: { ok: true, message: 'If an account exists for this address, we have sent an email.' } };
}

/** Link builder: token goes in the URL fragment so it is not sent to analytics/proxies/referrers. */
export function buildLink(baseUrl: string, path: string, token: string): string {
  const u = new URL(path, baseUrl);
  if (u.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) throw new Error('links must use https');
  return `${u.toString()}#token=${token}`;
}

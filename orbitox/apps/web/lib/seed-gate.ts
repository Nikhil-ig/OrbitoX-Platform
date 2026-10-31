/**
 * Demo seed data and table tokens (fixes A5: predictable QR secrets in source).
 */
import crypto from 'crypto';
import { HttpError } from './db-errors';

export function demoSeedAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'development' && env.ORBITOX_ENABLE_DEMO_SEED === 'true';
}

/** Call at the top of every seeding path; throws in production, test and unset NODE_ENV. */
export function assertDemoSeedAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (!demoSeedAllowed(env)) throw new HttpError(403, 'DEMO_SEED_DISABLED', 'Demo seed disabled: requires NODE_ENV=development and ORBITOX_ENABLE_DEMO_SEED=true');
}

/** Random 256-bit table token for QR codes; only the hash is stored. Rotate per table on demand. */
export function newTableToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashTableToken(token) };
}

export function hashTableToken(token: string): string {
  return crypto.createHash('sha256').update(`orbitox-table-token:v1:${token}`).digest('hex');
}

export function tableTokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashTableToken(token), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

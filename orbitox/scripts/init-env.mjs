#!/usr/bin/env node
/**
 * Creates `.env` from `.env.example` with freshly generated random secrets.
 * Safe to re-run: existing values are never overwritten, and an existing .env is only
 * touched to fill in secrets that are still empty.
 *
 *   node scripts/init-env.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = join(root, '.env.example');
const envPath = join(root, '.env');

const SECRETS = [
  'ORBITOX_ADMIN_TOKEN',
  'ORBITOX_RUNTIME_TOKEN',
  'ORBITOX_CONTROL_SECRET',
  'ORBITOX_GUEST_SECRET',
  'ORBITOX_SERVER_PEPPER',
  'POSTGRES_PASSWORD',
];

const created = !existsSync(envPath);
let text = readFileSync(created ? examplePath : envPath, 'utf8');
const generated = [];

for (const key of SECRETS) {
  const pattern = new RegExp(`^${key}=\\s*$`, 'm');
  if (pattern.test(text)) {
    text = text.replace(pattern, `${key}=${randomBytes(32).toString('hex')}`);
    generated.push(key);
  }
}

writeFileSync(envPath, text, { mode: 0o600 });

console.log(created ? 'Created .env from .env.example.' : 'Updated existing .env.');
console.log(generated.length ? `Generated: ${generated.join(', ')}` : 'All secrets were already set; nothing to generate.');
const admin = /^ORBITOX_ADMIN_TOKEN=(.+)$/m.exec(text)?.[1];
if (admin) console.log(`\nAdmin login: any username, password = ${admin}\n(Keep .env private. It is git-ignored.)`);

#!/usr/bin/env node
/**
 * Production Environment Configuration Self-Check
 *
 * Verifies that all required production cryptographic secrets and tokens are configured
 * and satisfy minimum entropy requirements (>= 32 characters).
 *
 * Usage:
 *   node scripts/check-production-env.mjs
 *   pnpm check:env
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

// If running in development without loaded env, optionally load .env for testing
if (existsSync(envPath) && !process.env.ORBITOX_ADMIN_TOKEN) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match) {
      const key = match[1];
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const REQUIRED_SECRETS = [
  {
    name: 'ORBITOX_ADMIN_TOKEN',
    minLen: 32,
    purpose: 'Master credential for control plane, admin UI, and management APIs (Bearer or Basic auth)',
  },
  {
    name: 'ORBITOX_RUNTIME_TOKEN',
    minLen: 32,
    purpose: 'Internal inter-service runtime communication and mesh synchronization token',
  },
  {
    name: 'ORBITOX_CONTROL_SECRET',
    minLen: 32,
    purpose: 'Master HMAC signing secret for trusted internal principal propagation and control-plane commands',
  },
  {
    name: 'ORBITOX_GUEST_SECRET',
    minLen: 32,
    purpose: 'Cryptographic secret used to sign and verify ephemeral guest/anonymous session tokens',
  },
  {
    name: 'ORBITOX_SERVER_PEPPER',
    minLen: 32,
    purpose: 'Server-side cryptographic pepper combined with raw API keys prior to SHA-256 verifier derivation',
  },
];

const OPTIONAL_RECOMMENDED = [
  {
    name: 'JWT_PRIVATE_KEY',
    purpose: 'RS256 private key (PEM format) for signing user session JWTs',
  },
  {
    name: 'JWT_PUBLIC_KEY',
    purpose: 'RS256 public key (PEM format) for verifying user session JWTs',
  },
];

console.log('='.repeat(80));
console.log('🪐 OrbitoX Production Environment Configuration Check');
console.log('='.repeat(80));
console.log(`Node Environment (NODE_ENV) : ${process.env.NODE_ENV || '(empty -> defaults to production)'}`);

const nodeEnv = (process.env.NODE_ENV || '').trim();
const isProduction = nodeEnv === 'production' || !nodeEnv;
console.log(`Security Posture           : ${isProduction ? 'PRODUCTION (Strict Fail-Closed)' : 'DEVELOPMENT'}`);
console.log('-'.repeat(80));

const errors = [];
const successes = [];

for (const secret of REQUIRED_SECRETS) {
  const val = process.env[secret.name]?.trim();
  if (!val) {
    errors.push({
      name: secret.name,
      reason: 'NOT SET',
      purpose: secret.purpose,
      minLen: secret.minLen,
    });
  } else if (val.length < secret.minLen) {
    errors.push({
      name: secret.name,
      reason: `INSUFFICIENT ENTROPY (${val.length} chars, minimum required: ${secret.minLen})`,
      purpose: secret.purpose,
      minLen: secret.minLen,
    });
  } else {
    successes.push({
      name: secret.name,
      length: val.length,
      purpose: secret.purpose,
    });
  }
}

if (isProduction) {
  for (const name of ['APP_DATABASE_URL', 'PLATFORM_AUDIT_DATABASE_URL']) {
    if (!process.env[name]?.trim()) {
      errors.push({
        name,
        reason: 'NOT SET',
        purpose: name === 'APP_DATABASE_URL'
          ? 'Restricted non-owner runtime connection for control-plane persistence'
          : 'Insert-only connection for organization/project platform audit events',
      });
    }
  }
}

for (const s of successes) {
  console.log(`  ✅ [PASS] ${s.name.padEnd(25)} (${s.length} chars) — ${s.purpose}`);
}

for (const rec of OPTIONAL_RECOMMENDED) {
  const val = process.env[rec.name]?.trim();
  if (val) {
    console.log(`  ℹ️  [INFO] ${rec.name.padEnd(25)} (Configured) — ${rec.purpose}`);
  } else {
    console.log(`  ⚪ [OPTIONAL] ${rec.name.padEnd(21)} (Not Set) — ${rec.purpose}`);
  }
}

console.log('='.repeat(80));

if (errors.length > 0) {
  console.error('\n❌ FAIL: Production configuration self-check failed with the following errors:');
  for (const err of errors) {
    console.error(`  - ${err.name}: ${err.reason}`);
    console.error(`    Role: ${err.purpose}`);
  }
  console.error('\nRemediation:');
  console.error('  Generate secure 32-byte hex keys: openssl rand -hex 32');
  console.error('  Or initialize your local development environment: node scripts/init-env.mjs\n');
  process.exit(1);
} else {
  console.log('\n🎉 SUCCESS: All required production secrets are configured with sufficient entropy.\n');
  process.exit(0);
}

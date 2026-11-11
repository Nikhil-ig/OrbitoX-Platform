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

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
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
    purpose:
      'Master credential for control plane, admin UI, and management APIs (Bearer or Basic auth)',
  },
  {
    name: 'ORBITOX_RUNTIME_TOKEN',
    minLen: 32,
    purpose: 'Internal inter-service runtime communication and mesh synchronization token',
  },
  {
    name: 'ORBITOX_CONTROL_SECRET',
    minLen: 32,
    purpose:
      'Master HMAC signing secret for trusted internal principal propagation and control-plane commands',
  },
  {
    name: 'ORBITOX_GUEST_SECRET',
    minLen: 32,
    purpose:
      'Cryptographic secret used to sign and verify ephemeral guest/anonymous session tokens',
  },
  {
    name: 'ORBITOX_SERVER_PEPPER',
    minLen: 32,
    purpose:
      'Server-side cryptographic pepper combined with raw API keys prior to SHA-256 verifier derivation',
  },
  {
    name: 'ORBITOX_MFA_ENCRYPTION_KEY',
    minLen: 43,
    purpose: 'Base64-encoded 32-byte AES key protecting operator and customer TOTP secrets',
  },
  {
    name: 'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY',
    minLen: 43,
    purpose: 'Base64-encoded 32-byte AES key protecting queued single-use account links',
  },
  {
    name: 'ORBITOX_EMAIL_WEBHOOK_SECRET',
    minLen: 32,
    purpose: 'Resend whsec_ signing secret for Svix-verified bounce and complaint webhooks',
  },
  {
    name: 'RAZORPAY_WEBHOOK_SECRET',
    minLen: 32,
    purpose: 'HMAC SHA-256 secret for authenticating incoming billing webhook events from Razorpay',
  },
  {
    name: 'RAZORPAY_KEY_SECRET',
    minLen: 32,
    purpose: 'Secret key for authenticated Razorpay subscription API calls',
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

const errors = [];
const successes = [];

const emailProvider = process.env.ORBITOX_EMAIL_PROVIDER?.trim().toLowerCase();
if (emailProvider !== 'resend') {
  errors.push({
    name: 'ORBITOX_EMAIL_PROVIDER',
    reason: 'Production currently requires resend; log-only and other providers are unsupported',
    purpose: 'Transactional email delivery and signed suppression webhooks',
  });
} else {
  for (const name of ['ORBITOX_EMAIL_FROM', 'RESEND_API_KEY']) {
    if (!process.env[name]?.trim()) {
      errors.push({
        name,
        reason: 'NOT SET',
        purpose: `Required for the configured ${emailProvider} email provider`,
      });
    }
  }
  const secret = process.env.ORBITOX_EMAIL_WEBHOOK_SECRET?.trim() || '';
  const encodedKey = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : '';
  const signingKey = Buffer.from(encodedKey, 'base64');
  if (
    !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret) ||
    signingKey.length < 32 ||
    signingKey.toString('base64') !== encodedKey
  ) {
    errors.push({
      name: 'ORBITOX_EMAIL_WEBHOOK_SECRET',
      reason: 'Must be a valid Resend whsec_ signing secret containing at least 32 decoded bytes',
      purpose: 'Svix signature verification for Resend bounce and complaint webhooks',
    });
  }
}
if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(process.env.RAZORPAY_KEY_ID?.trim() || '')) {
  errors.push({
    name: 'RAZORPAY_KEY_ID',
    reason: 'Must be a valid Razorpay test or live key id',
    purpose: 'Public identifier for authenticated Razorpay billing API calls',
  });
}

console.log('='.repeat(80));
console.log('🪐 OrbitoX Production Environment Configuration Check');
console.log('='.repeat(80));
console.log(
  `Node Environment (NODE_ENV) : ${process.env.NODE_ENV || '(empty -> defaults to production)'}`,
);

const nodeEnv = (process.env.NODE_ENV || '').trim();
const isProduction = nodeEnv === 'production' || !nodeEnv;
console.log(
  `Security Posture           : ${isProduction ? 'PRODUCTION (Strict Fail-Closed)' : 'DEVELOPMENT'}`,
);
console.log('-'.repeat(80));

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

const tokenScopes =
  process.env.ORBITOX_ADMIN_TOKEN_SCOPES?.split(',')
    .map((scope) => scope.trim())
    .filter(Boolean) || [];
if (tokenScopes.length === 0) {
  errors.push({
    name: 'ORBITOX_ADMIN_TOKEN_SCOPES',
    reason: 'NOT SET (the automation token must be restricted to explicit method/path scopes)',
    purpose: 'Comma-separated METHOD:/path scopes; no wildcard method or global path is accepted',
  });
} else if (
  tokenScopes.some((scope) => {
    const separator = scope.indexOf(':');
    const method = scope.slice(0, separator);
    const pathname = scope.slice(separator + 1);
    return (
      separator < 0 ||
      !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
      !pathname.startsWith('/') ||
      pathname === '/*' ||
      (pathname.includes('*') && !pathname.endsWith('/*')) ||
      pathname.startsWith('//')
    );
  })
) {
  errors.push({
    name: 'ORBITOX_ADMIN_TOKEN_SCOPES',
    reason: 'Contains an invalid method/path scope',
    purpose: 'Use exact paths or a trailing /* under an explicit API prefix',
  });
}

const breachedPasswordApi = (process.env.ORBITOX_BREACHED_PASSWORD_API || 'on')
  .trim()
  .toLowerCase();
if (!['on', 'off'].includes(breachedPasswordApi)) {
  errors.push({
    name: 'ORBITOX_BREACHED_PASSWORD_API',
    reason: 'Must be set to "on" or "off"',
    purpose: 'Controls the optional k-anonymity breach-password range API',
  });
}

for (const name of ['ORBITOX_MFA_ENCRYPTION_KEY', 'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY']) {
  const value = process.env[name]?.trim();
  if (value && Buffer.from(value, 'base64').length !== 32) {
    errors.push({
      name,
      reason: 'Must decode to exactly 32 bytes',
      purpose: 'AES-256-GCM key for account security data',
    });
  }
}

const publicBaseUrl = process.env.ORBITOX_PUBLIC_BASE_URL?.trim();
try {
  if (!publicBaseUrl || new URL(publicBaseUrl).protocol !== 'https:') throw new Error();
} catch {
  errors.push({
    name: 'ORBITOX_PUBLIC_BASE_URL',
    reason: 'Must be configured as a canonical HTTPS URL',
    purpose: 'Origin for email verification, password reset, and invitation links',
  });
}

if (isProduction) {
  for (const name of ['APP_DATABASE_URL', 'PLATFORM_AUDIT_DATABASE_URL']) {
    if (!process.env[name]?.trim()) {
      errors.push({
        name,
        reason: 'NOT SET',
        purpose:
          name === 'APP_DATABASE_URL'
            ? 'Restricted non-owner runtime connection for control-plane persistence'
            : 'Insert-only connection for organization/project platform audit events',
      });
    }
  }

  const grantKeysJson = process.env.ORBITOX_GRANT_SIGNING_KEYS?.trim();
  const grantPrivKey = process.env.ORBITOX_GRANT_PRIVATE_KEY?.trim();
  if (!grantKeysJson && !grantPrivKey) {
    errors.push({
      name: 'ORBITOX_GRANT_SIGNING_KEYS / ORBITOX_GRANT_PRIVATE_KEY',
      reason: 'NOT SET',
      purpose: 'Configured Ed25519 signing keys for issuing platform grants',
    });
  }

  const objectStoreDriver = (process.env.ORBITOX_OBJECT_STORE_DRIVER || '').trim().toLowerCase();
  if (objectStoreDriver !== 's3') {
    errors.push({
      name: 'ORBITOX_OBJECT_STORE_DRIVER',
      reason:
        objectStoreDriver === 'local'
          ? 'ORBITOX_OBJECT_STORE_DRIVER=local is refused in production'
          : 'Must be explicitly set to "s3" in production',
      purpose: 'Zero-trust S3/S3-compatible ObjectStore backend for encrypted DSR export archives',
    });
  } else {
    const osRegion =
      process.env.ORBITOX_OBJECT_STORE_REGION?.trim() || process.env.AWS_REGION?.trim() || '';
    if (!osRegion) {
      errors.push({
        name: 'ORBITOX_OBJECT_STORE_REGION',
        reason: 'NOT SET (default us-east-1 fallback is prohibited)',
        purpose: 'Explicit data-residency region (e.g. ap-south-1) for ObjectStore',
      });
    }
    if (!process.env.S3_BUCKET_NAME?.trim()) {
      errors.push({
        name: 'S3_BUCKET_NAME',
        reason: 'NOT SET',
        purpose: 'Target bucket name for S3/S3-compatible ObjectStore archives',
      });
    }
    const encMode = (process.env.ORBITOX_OBJECT_STORE_ENCRYPTION || '').trim().toLowerCase();
    if (encMode !== 'kms' && encMode !== 'client') {
      errors.push({
        name: 'ORBITOX_OBJECT_STORE_ENCRYPTION',
        reason: 'Must be explicitly set to "kms" or "client"',
        purpose: 'Server-side AWS SSE-KMS vs client-side AES-256-GCM envelope encryption',
      });
    } else if (encMode === 'kms' && !process.env.ORBITOX_OBJECT_STORE_KMS_KEY_ID?.trim()) {
      errors.push({
        name: 'ORBITOX_OBJECT_STORE_KMS_KEY_ID',
        reason: 'NOT SET (required when ORBITOX_OBJECT_STORE_ENCRYPTION=kms)',
        purpose: 'AWS KMS CMK ARN/id for S3 SSE-KMS encryption',
      });
    } else if (encMode === 'client') {
      if (!process.env.ORBITOX_EXPORT_ENCRYPTION_KEYS?.trim()) {
        errors.push({
          name: 'ORBITOX_EXPORT_ENCRYPTION_KEYS',
          reason: 'NOT SET (required when ORBITOX_OBJECT_STORE_ENCRYPTION=client)',
          purpose: 'JSON key ring of 32-byte AES-256-GCM keys for client-side export encryption',
        });
      }
      if (!process.env.ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE?.trim()) {
        errors.push({
          name: 'ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE',
          reason: 'NOT SET (required when ORBITOX_OBJECT_STORE_ENCRYPTION=client)',
          purpose: 'Active key ID selector within ORBITOX_EXPORT_ENCRYPTION_KEYS',
        });
      }
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
  console.log(
    '\n🎉 SUCCESS: All required production secrets are configured with sufficient entropy.\n',
  );
  process.exit(0);
}

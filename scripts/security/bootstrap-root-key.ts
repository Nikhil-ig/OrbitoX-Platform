#!/usr/bin/env node
/**
 * OrbitoX Root Key Bootstrapper
 * 
 * Generates the authoritative primary root API key for platform operations.
 * Enforces zero-trust cryptographic guarantees:
 * - Secret entropy: 256-bit CSPRNG (crypto.randomBytes(32))
 * - Format: orb_live_<keyId>_<secret>
 * -Authoritative store: Persists ONLY HMAC-SHA256 verifier with server pepper
 * - Prints raw secret ONCE to terminal for the operator to copy into secrets vault
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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

const repoRoot = findRepoRoot();
const keystorePath = process.env.ORBITOX_KEYSTORE_PATH || path.join(repoRoot, 'data', 'keystore.json');

// Ensure pepper exists
let pepper = process.env.ORBITOX_API_KEY_PEPPER;
if (!pepper) {
  if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_SECRETS === '1') {
    pepper = 'orbitox-dev-pepper-secret-32-bytes-vector-ok!';
    console.warn('⚠️ [DEV WARNING] Using local development pepper for bootstrap.');
  } else {
    console.error('❌ FATAL: ORBITOX_API_KEY_PEPPER environment variable is required to bootstrap root key.');
    process.exit(1);
  }
}

// Load existing keystore
let keystore: any[] = [];
if (fs.existsSync(keystorePath)) {
  try {
    const raw = fs.readFileSync(keystorePath, 'utf8');
    keystore = JSON.parse(raw);
    if (!Array.isArray(keystore)) keystore = [];
  } catch (err) {
    console.warn('⚠️ Could not parse existing keystore, initializing fresh array.');
    keystore = [];
  }
}

// Check if root key already exists
const hasRootKey = keystore.some((k) => k.isRoot === true && k.status === 'active');
const force = process.argv.includes('--force');

if (hasRootKey && !force) {
  console.log('ℹ️ An active root API key already exists in keystore:');
  const existing = keystore.find((k) => k.isRoot === true && k.status === 'active');
  console.log(`   Key ID:     ${existing.keyId}`);
  console.log(`   Masked Key: ${existing.maskedKey}`);
  console.log(`   Created:    ${existing.createdAt}`);
  console.log('\nPass --force if you need to create an additional root key.');
  process.exit(0);
}

// Generate new root key
const keyId = `root_${crypto.randomBytes(6).toString('hex')}`;
const secretEntropy = crypto.randomBytes(32).toString('base64url');
const rawKey = `orb_live_${keyId}_${secretEntropy}`;

const verifier = crypto.createHmac('sha256', pepper).update(secretEntropy).digest('hex');
const maskedKey = `orb_live_${keyId}_••••••••${secretEntropy.slice(-4)}`;
const now = new Date().toISOString();

const ipAllowlist = [
  '127.0.0.1',
  '::1',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
];

const rootRecord = {
  id: `key_${keyId}`,
  keyId,
  name: 'Primary Infrastructure Root Orchestrator',
  authVerifier: verifier,
  keyPrefix: `orb_live_${keyId}_`,
  maskedKey,
  environment: 'production',
  scopes: ['*'],
  capabilities: ['*'],
  isRoot: true,
  ipAllowlist,
  tenantScope: ['*'],
  status: 'active',
  expiresAt: null,
  createdAt: now,
  lastUsedAt: 'Never',
  rateLimitPerMin: 10000,
};

keystore.push(rootRecord);

// Ensure data directory exists
const dir = path.dirname(keystorePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(keystorePath, JSON.stringify(keystore, null, 2), { encoding: 'utf8', mode: 0o600 });

console.log('\n' + '='.repeat(80));
console.log('🪐 ORBITOX PLATFORM ROOT CREDENTIAL CREATED');
console.log('='.repeat(80));
console.log(`Key ID:        ${keyId}`);
console.log(`Masked Key:    ${maskedKey}`);
console.log(`IP Allowlist:  ${ipAllowlist.join(', ')}`);
console.log('Scopes:        * (Root Master Operator)');
console.log(`Keystore:      ${keystorePath} (stored hash verifier only)`);
console.log('-'.repeat(80));
console.log('RAW ROOT KEY (COPY AND STORE IN SECRETS MANAGER NOW):');
console.log(`\n  ${rawKey}\n`);
console.log('-'.repeat(80));
console.log('IMPORTANT:');
console.log('1. Store this raw key immediately in your team secrets manager (e.g. AWS Secrets Manager).');
console.log('2. The server stores ONLY the HMAC-SHA256 verifier with server pepper.');
console.log('3. This raw key is NEVER logged, CANNOT be recovered, and will NOT be shown again.');
console.log('='.repeat(80) + '\n');

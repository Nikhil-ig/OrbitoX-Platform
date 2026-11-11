import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  PLATFORM_SERVICE_CONTRACTS,
  EXTERNAL_SECRETS,
  getGeneratedSecretNames,
} from '../../apps/platform/src/lib/platform-service-contracts';

/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX Staging Secret Generator (Phase 6F B0)
 * ─────────────────────────────────────────────────────────────
 * Generates every cryptographically random secret needed by staging
 * in AWS Secrets Manager using the owner's active AWS session.
 *
 * Security Invariants:
 * - NEVER prints secret values to stdout/stderr.
 * - NEVER persists secret values to local files.
 * - NEVER passes secret values in process argv (passed strictly via stdin).
 * - External provider keys (Razorpay, Resend) are NEVER generated.
 * - Idempotent by default: skips already-set secrets unless explicitly rotated.
 * - Blind --rotate of all secrets or stateful/keyed secrets is STRICTLY REFUSED.
 *   Stateless secrets may be rotated via --rotate=<NAME>.
 *   Keyed secrets rotate additively via --add-key=<NAME>.
 *   Database role passwords rotate only via --database --force-rotate-database.
 * ─────────────────────────────────────────────────────────────
 */

export const STATELESS_SECRETS = [
  'SESSION_SECRET',
  'ORBITOX_ADMIN_TOKEN',
  'ORBITOX_RUNTIME_TOKEN',
  'ORBITOX_CONTROL_SECRET',
  'ORBITOX_GUEST_SECRET',
  'ORBITOX_EMAIL_WEBHOOK_SECRET',
] as const;

export const STATEFUL_ENCRYPTION_SECRETS = [
  'ORBITOX_MFA_ENCRYPTION_KEY',
  'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY',
  'ORBITOX_PHI_INDEX_KEY',
  'STAFF_AUTH_SECRET',
] as const;

export const KEYED_ROTATABLE_SECRETS = [
  'ORBITOX_PHI_KEYS',
  'ORBITOX_GRANT_SIGNING_KEYS',
  'ORBITOX_DELETION_CERT_KEYS',
  'ORBITOX_EXPORT_ENCRYPTION_KEYS',
  'ORBITOX_BRIDGE_KEYS',
  'ORBITOX_SERVER_PEPPERS',
] as const;

export interface DatabaseRoleConfig {
  role: string;
  secretUrlName: string;
  structuredSecretName: string;
  dbType: 'platform' | 'restaurant_os';
  defaultDbName: string;
}

export const DATABASE_ROLES: DatabaseRoleConfig[] = [
  {
    role: 'orbitox_migrator',
    secretUrlName: 'MIGRATOR_DATABASE_URL',
    structuredSecretName: 'db/orbitox_migrator',
    dbType: 'platform',
    defaultDbName: 'orbitox_platform_staging',
  },
  {
    role: 'orbitox_runtime',
    secretUrlName: 'APP_DATABASE_URL',
    structuredSecretName: 'db/orbitox_runtime',
    dbType: 'platform',
    defaultDbName: 'orbitox_platform_staging',
  },
  {
    role: 'orbitox_maintenance',
    secretUrlName: 'MAINTENANCE_DATABASE_URL',
    structuredSecretName: 'db/orbitox_maintenance',
    dbType: 'platform',
    defaultDbName: 'orbitox_platform_staging',
  },
  {
    role: 'orbitox_outbox_relay',
    secretUrlName: 'OUTBOX_RELAY_DATABASE_URL',
    structuredSecretName: 'db/orbitox_outbox_relay',
    dbType: 'platform',
    defaultDbName: 'orbitox_platform_staging',
  },
  {
    role: 'orbitox_platform_admin_audit',
    secretUrlName: 'PLATFORM_ADMIN_AUDIT_DATABASE_URL',
    structuredSecretName: 'db/orbitox_platform_admin_audit',
    dbType: 'platform',
    defaultDbName: 'orbitox_platform_staging',
  },
  {
    role: 'hms_audit_reader',
    secretUrlName: 'HMS_AUDIT_DATABASE_URL',
    structuredSecretName: 'db/hms_audit_reader',
    dbType: 'platform',
    defaultDbName: 'orbitox_platform_staging',
  },
  {
    role: 'restaurantos_app',
    secretUrlName: 'RESTAURANT_OS_DATABASE_URL',
    structuredSecretName: 'db/restaurantos_app',
    dbType: 'restaurant_os',
    defaultDbName: 'restaurant_os_staging',
  },
];

export interface GeneratedSecretDef {
  name: string;
  generate: () => string;
}

export function generateEd25519GrantSigningKeys(): string {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  return JSON.stringify({
    k1: {
      privateKey,
      publicKey,
    },
  });
}

export function extractGrantPublicKeys(signingKeysJson: string): string {
  try {
    const parsed = JSON.parse(signingKeysJson);
    const pubKeys: Record<string, { publicKey: string }> = {};
    for (const [kid, keyPair] of Object.entries<any>(parsed)) {
      const pubPem = typeof keyPair === 'string' ? keyPair : (keyPair.publicKey || keyPair.publicKeyPem);
      if (pubPem) {
        pubKeys[kid] = { publicKey: pubPem };
      }
    }
    return JSON.stringify(pubKeys);
  } catch {
    return JSON.stringify({});
  }
}

export function generateGrantPublicKeys(signingKeysJson?: string): string {
  if (signingKeysJson) return extractGrantPublicKeys(signingKeysJson);
  const keys = JSON.parse(generateEd25519GrantSigningKeys());
  return JSON.stringify({
    k1: {
      publicKey: keys.k1.publicKey,
    },
  });
}

export function generatePhiKeys(): string {
  const key32 = crypto.randomBytes(32).toString('base64');
  return JSON.stringify({
    v1: key32,
  });
}

export function generateExportEncryptionKeys(): string {
  const key32 = crypto.randomBytes(32).toString('base64');
  return JSON.stringify({
    k1: key32,
  });
}

export function generatePepperRing(): string {
  return JSON.stringify({
    p1: crypto.randomBytes(32).toString('hex'),
  });
}

export function generateBridgeKeys(): string {
  const secret = crypto.randomBytes(32).toString('hex');
  return JSON.stringify({
    activeKeyId: 'k1',
    keys: {
      k1: secret,
    },
  });
}

export function generateRestaurantStationSecrets(): string {
  return JSON.stringify({
    [`stn_sec_${crypto.randomBytes(16).toString('hex')}`]: { station: 'TANDOOR', branchId: 'staging-main', isPrivileged: false },
    [`stn_sec_${crypto.randomBytes(16).toString('hex')}`]: { station: 'CURRY_LINE', branchId: 'staging-main', isPrivileged: false },
    [`stn_sec_${crypto.randomBytes(16).toString('hex')}`]: { station: 'EXPO', branchId: 'staging-main', isPrivileged: true },
    [`stn_sec_${crypto.randomBytes(16).toString('hex')}`]: { station: 'BEVERAGE', branchId: 'staging-main', isPrivileged: false },
  });
}

export const SECRET_GENERATORS: Record<string, () => string> = {
  SESSION_SECRET: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_ADMIN_TOKEN: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_RUNTIME_TOKEN: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_CONTROL_SECRET: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_GUEST_SECRET: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_SERVER_PEPPERS: generatePepperRing,
  ORBITOX_SERVER_PEPPER_ACTIVE: () => 'p1',
  ORBITOX_MFA_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString('base64'),
  ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString('base64'),
  ORBITOX_PHI_INDEX_KEY: () => crypto.randomBytes(32).toString('base64'),
  ORBITOX_PHI_KEYS: generatePhiKeys,
  ORBITOX_GRANT_SIGNING_KEYS: generateEd25519GrantSigningKeys,
  ORBITOX_GRANT_PUBLIC_KEYS: generateGrantPublicKeys,
  ORBITOX_DELETION_CERT_KEYS: generateEd25519GrantSigningKeys,
  ORBITOX_DELETION_CERT_KEY_ACTIVE: () => 'k1',
  ORBITOX_EXPORT_ENCRYPTION_KEYS: generateExportEncryptionKeys,
  ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: () => 'k1',
  ORBITOX_BRIDGE_KEYS: generateBridgeKeys,
  ORBITOX_BRIDGE_ACTIVE_KID: () => 'k1',
  ORBITOX_EMAIL_WEBHOOK_SECRET: () => 'whsec_' + crypto.randomBytes(32).toString('base64'),
  STAFF_AUTH_SECRET: () => crypto.randomBytes(32).toString('hex'),
  RESTAURANT_STATION_SECRETS: generateRestaurantStationSecrets,
};

export function getExpectedSecretNames(): string[] {
  return getGeneratedSecretNames();
}

export type AwsCliRunner = (args: string[], inputStdin?: string) => { stdout: string; status: number };

export function createDefaultRunner(): AwsCliRunner {
  return (args: string[], inputStdin?: string) => {
    try {
      const stdout = execFileSync('aws', args, {
        input: inputStdin,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, status: 0 };
    } catch (err: any) {
      return { stdout: err.stdout || '', status: err.status || 1 };
    }
  };
}

export function handleAdditiveKeyRotation(options: {
  secretName: string;
  activate?: boolean;
  environment?: string;
  region?: string;
  runner: AwsCliRunner;
}): { name: string; action: 'added-key' | 'error'; detail: string } {
  const env = options.environment || 'staging';
  const region = options.region || 'ap-south-1';
  const name = options.secretName;
  const runner = options.runner;
  const secretId = `orbitox/${env}/${name}`;

  if (!KEYED_ROTATABLE_SECRETS.includes(name as any)) {
    throw new Error(
      `--add-key is only supported for keyed rotatable secrets: ${KEYED_ROTATABLE_SECRETS.join(', ')}. Got: "${name}"`,
    );
  }

  // 1. Fetch current secret value
  const checkRes = runner([
    'secretsmanager',
    'get-secret-value',
    '--secret-id',
    secretId,
    '--region',
    region,
    '--output',
    'json',
  ]);

  let currentString = '';
  if (checkRes.status === 0) {
    try {
      currentString = JSON.parse(checkRes.stdout).SecretString || '';
    } catch {}
  }

  if (name === 'ORBITOX_PHI_KEYS') {
    let keysMap: Record<string, string> = {};
    if (currentString) {
      try {
        keysMap = JSON.parse(currentString);
      } catch {
        throw new Error('Existing ORBITOX_PHI_KEYS is not valid JSON.');
      }
    }
    const count = Object.keys(keysMap).length + 1;
    const hasVPrefix = Object.keys(keysMap).some((k) => k.startsWith('v'));
    const newKid = hasVPrefix || Object.keys(keysMap).length === 0 ? `v${count}` : `phi-key-2026-${count}`;
    const newKey = crypto.randomBytes(32).toString('base64');
    keysMap[newKid] = newKey;

    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        secretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      JSON.stringify(keysMap),
    );

    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${secretId} in Secrets Manager.`);
    }

    console.log(`${name}: added key ${newKid} (preserved ${Object.keys(keysMap).length - 1} existing keys)`);
    return { name, action: 'added-key', detail: `Added key ${newKid}` };
  }

  if (name === 'ORBITOX_GRANT_SIGNING_KEYS') {
    let keysMap: Record<string, { privateKey: string; publicKey: string }> = {};
    if (currentString) {
      try {
        keysMap = JSON.parse(currentString);
      } catch {
        throw new Error('Existing ORBITOX_GRANT_SIGNING_KEYS is not valid JSON.');
      }
    }
    const newKid = `k${Object.keys(keysMap).length + 1}`;
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    keysMap[newKid] = { privateKey, publicKey };

    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        secretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      JSON.stringify(keysMap),
    );

    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${secretId} in Secrets Manager.`);
    }

    // Also update grant public keys for services that verify grants (e.g. RestaurantOS)
    const pubKeysMap: Record<string, { publicKey: string }> = {};
    for (const [k, v] of Object.entries(keysMap)) {
      pubKeysMap[k] = { publicKey: v.publicKey };
    }
    const pubSecretId = `orbitox/${env}/ORBITOX_GRANT_PUBLIC_KEYS`;
    runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        pubSecretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      JSON.stringify(pubKeysMap),
    );

    console.log(`${name}: added key ${newKid} (preserved ${Object.keys(keysMap).length - 1} existing keys, synced ORBITOX_GRANT_PUBLIC_KEYS)`);
    return { name, action: 'added-key', detail: `Added key ${newKid}` };
  }

  if (name === 'ORBITOX_DELETION_CERT_KEYS') {
    let keysMap: Record<string, { privateKey?: string; publicKey: string }> = {};
    if (currentString) {
      try {
        keysMap = JSON.parse(currentString);
      } catch {
        throw new Error('Existing ORBITOX_DELETION_CERT_KEYS is not valid JSON.');
      }
    }
    const newKid = `k${Object.keys(keysMap).length + 1}`;
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    keysMap[newKid] = { privateKey, publicKey };

    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        secretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      JSON.stringify(keysMap),
    );

    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${secretId} in Secrets Manager.`);
    }

    if (options.activate) {
      const activeSecretId = `orbitox/${env}/ORBITOX_DELETION_CERT_KEY_ACTIVE`;
      runner(
        [
          'secretsmanager',
          'put-secret-value',
          '--secret-id',
          activeSecretId,
          '--secret-string',
          'file:///dev/stdin',
          '--region',
          region,
        ],
        newKid,
      );
      console.log(`${name}: added key ${newKid} and activated it (preserved ${Object.keys(keysMap).length - 1} existing keys)`);
      return { name, action: 'added-key', detail: `Added key ${newKid} and activated it` };
    }

    console.log(`${name}: added key ${newKid} (preserved ${Object.keys(keysMap).length - 1} existing keys, active key unchanged)`);
    return { name, action: 'added-key', detail: `Added key ${newKid}` };
  }

  if (name === 'ORBITOX_EXPORT_ENCRYPTION_KEYS') {
    let keysMap: Record<string, string> = {};
    if (currentString) {
      try {
        keysMap = JSON.parse(currentString);
      } catch {
        throw new Error('Existing ORBITOX_EXPORT_ENCRYPTION_KEYS is not valid JSON.');
      }
    }
    const newKid = `k${Object.keys(keysMap).length + 1}`;
    keysMap[newKid] = crypto.randomBytes(32).toString('base64');

    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        secretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      JSON.stringify(keysMap),
    );

    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${secretId} in Secrets Manager.`);
    }

    if (options.activate) {
      const activeSecretId = `orbitox/${env}/ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE`;
      runner(
        [
          'secretsmanager',
          'put-secret-value',
          '--secret-id',
          activeSecretId,
          '--secret-string',
          'file:///dev/stdin',
          '--region',
          region,
        ],
        newKid,
      );
      console.log(`${name}: added key ${newKid} and activated it (preserved ${Object.keys(keysMap).length - 1} existing keys)`);
      return { name, action: 'added-key', detail: `Added key ${newKid} and activated it` };
    }

    console.log(`${name}: added key ${newKid} (preserved ${Object.keys(keysMap).length - 1} existing keys, active key unchanged)`);
    return { name, action: 'added-key', detail: `Added key ${newKid}` };
  }

  if (name === 'ORBITOX_BRIDGE_KEYS') {
    let bridgeObj: { activeKeyId: string; keys: Record<string, string> } = {
      activeKeyId: 'k1',
      keys: {},
    };
    if (currentString) {
      try {
        const parsed = JSON.parse(currentString);
        bridgeObj = {
          activeKeyId: parsed.activeKeyId || 'k1',
          keys: parsed.keys || {},
        };
      } catch {
        throw new Error('Existing ORBITOX_BRIDGE_KEYS is not valid JSON.');
      }
    }
    const newKid = `k${Object.keys(bridgeObj.keys).length + 1}`;
    const newSecret = crypto.randomBytes(32).toString('hex');
    bridgeObj.keys[newKid] = newSecret;
    bridgeObj.activeKeyId = newKid;

    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        secretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      JSON.stringify(bridgeObj),
    );

    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${secretId} in Secrets Manager.`);
    }

    // Sync active kid secret
    const activeKidSecretId = `orbitox/${env}/ORBITOX_BRIDGE_ACTIVE_KID`;
    runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        activeKidSecretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      newKid,
    );

    console.log(`${name}: added key ${newKid} and set as active (preserved ${Object.keys(bridgeObj.keys).length - 1} existing keys)`);
    return { name, action: 'added-key', detail: `Added key ${newKid} as active` };
  }

  if (name === 'ORBITOX_SERVER_PEPPERS') {
    // Pepper-ring rotation
    let peppers: Record<string, string> = {};
    if (currentString) {
      try {
        peppers = JSON.parse(currentString);
      } catch {
        peppers = { p1: currentString };
      }
    }
    if (Object.keys(peppers).length >= 4) {
      throw new Error('Maximum 4 peppers reached in ring. Retire an old pepper before adding a new one.');
    }
    const newId = `p${Object.keys(peppers).length + 1}`;
    const newPepper = crypto.randomBytes(32).toString('hex');
    peppers[newId] = newPepper;

    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        secretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      JSON.stringify(peppers),
    );

    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${secretId} in Secrets Manager.`);
    }

    if (options.activate) {
      const activeSecretId = `orbitox/${env}/ORBITOX_SERVER_PEPPER_ACTIVE`;
      runner(
        [
          'secretsmanager',
          'put-secret-value',
          '--secret-id',
          activeSecretId,
          '--secret-string',
          'file:///dev/stdin',
          '--region',
          region,
        ],
        newId,
      );
      console.log(`${name}: added pepper ${newId} to ring and activated it`);
      return { name, action: 'added-key', detail: `Added pepper ${newId} and activated it` };
    }

    console.log(`${name}: added pepper ${newId} to ring (preserved ${Object.keys(peppers).length - 1} existing peppers, active pepper unchanged)`);
    return { name, action: 'added-key', detail: `Added pepper ${newId}` };
  }

  throw new Error(`Unsupported --add-key target: ${name}`);
}

export function handleActivateKey(options: {
  secretName: string;
  kid: string;
  environment?: string;
  region?: string;
  runner: AwsCliRunner;
}): { name: string; action: 'activated' | 'error'; detail: string } {
  const env = options.environment || 'staging';
  const region = options.region || 'ap-south-1';
  const name = options.secretName;
  const kid = options.kid;
  const runner = options.runner;

  if (name === 'ORBITOX_SERVER_PEPPERS') {
    const pepperSecretId = `orbitox/${env}/ORBITOX_SERVER_PEPPERS`;
    const checkRes = runner([
      'secretsmanager',
      'get-secret-value',
      '--secret-id',
      pepperSecretId,
      '--region',
      region,
      '--output',
      'json',
    ]);
    if (checkRes.status !== 0) {
      throw new Error(`Failed to read ${pepperSecretId} from Secrets Manager.`);
    }
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(JSON.parse(checkRes.stdout).SecretString);
    } catch {
      throw new Error(`Invalid JSON in ${pepperSecretId}`);
    }
    if (!parsed[kid]) {
      throw new Error(
        `Pepper ID "${kid}" does not exist in ${pepperSecretId}. Existing peppers: ${Object.keys(parsed).join(', ')}`,
      );
    }

    const activeSecretId = `orbitox/${env}/ORBITOX_SERVER_PEPPER_ACTIVE`;
    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        activeSecretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      kid,
    );
    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${activeSecretId} in Secrets Manager.`);
    }
    console.log(`ORBITOX_SERVER_PEPPER_ACTIVE: activated pepper ID ${kid}`);
    return { name: 'ORBITOX_SERVER_PEPPER_ACTIVE', action: 'activated', detail: `Activated pepper ID ${kid}` };
  }

  if (name === 'ORBITOX_DELETION_CERT_KEYS') {
    const certSecretId = `orbitox/${env}/ORBITOX_DELETION_CERT_KEYS`;
    const checkRes = runner([
      'secretsmanager',
      'get-secret-value',
      '--secret-id',
      certSecretId,
      '--region',
      region,
      '--output',
      'json',
    ]);
    if (checkRes.status !== 0) {
      throw new Error(`Failed to read ${certSecretId} from Secrets Manager.`);
    }
    let parsed: Record<string, { privateKey?: string; publicKey?: string }> = {};
    try {
      parsed = JSON.parse(JSON.parse(checkRes.stdout).SecretString);
    } catch {
      throw new Error(`Invalid JSON in ${certSecretId}`);
    }
    const targetEntry = parsed[kid];
    if (!targetEntry || !targetEntry.publicKey || !targetEntry.privateKey) {
      throw new Error(
        `Deletion cert key "${kid}" does not exist with a signing privateKey in ${certSecretId}. Existing keys: ${Object.keys(parsed).join(', ')}`,
      );
    }

    const activeSecretId = `orbitox/${env}/ORBITOX_DELETION_CERT_KEY_ACTIVE`;
    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        activeSecretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      kid,
    );
    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${activeSecretId} in Secrets Manager.`);
    }
    console.log(`ORBITOX_DELETION_CERT_KEY_ACTIVE: activated deletion cert key ID ${kid}`);
    return { name: 'ORBITOX_DELETION_CERT_KEY_ACTIVE', action: 'activated', detail: `Activated deletion cert key ID ${kid}` };
  }

  if (name === 'ORBITOX_EXPORT_ENCRYPTION_KEYS') {
    const exportSecretId = `orbitox/${env}/ORBITOX_EXPORT_ENCRYPTION_KEYS`;
    const checkRes = runner([
      'secretsmanager',
      'get-secret-value',
      '--secret-id',
      exportSecretId,
      '--region',
      region,
      '--output',
      'json',
    ]);
    if (checkRes.status !== 0) {
      throw new Error(`Failed to read ${exportSecretId} from Secrets Manager.`);
    }
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(JSON.parse(checkRes.stdout).SecretString);
    } catch {
      throw new Error(`Invalid JSON in ${exportSecretId}`);
    }
    if (!parsed[kid]) {
      throw new Error(
        `Export encryption key "${kid}" does not exist in ${exportSecretId}. Existing keys: ${Object.keys(parsed).join(', ')}`,
      );
    }

    const activeSecretId = `orbitox/${env}/ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE`;
    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        activeSecretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      kid,
    );
    if (putRes.status !== 0) {
      throw new Error(`Failed to update ${activeSecretId} in Secrets Manager.`);
    }
    console.log(`ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: activated export encryption key ID ${kid}`);
    return { name: 'ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE', action: 'activated', detail: `Activated export encryption key ID ${kid}` };
  }

  throw new Error(`Activation not supported for secret "${name}". Supported: ORBITOX_SERVER_PEPPERS, ORBITOX_DELETION_CERT_KEYS, ORBITOX_EXPORT_ENCRYPTION_KEYS`);
}

export function runDatabaseCredentialGenerator(options: {
  environment?: string;
  region?: string;
  dbHost?: string;
  restaurantDbHost?: string;
  dbPort?: number;
  dryRun?: boolean;
  forceRotateDatabase?: boolean;
  awsCliRunner?: AwsCliRunner;
}): { name: string; action: 'dry-run' | 'set' | 'skipped' | 'rotated' | 'error'; detail?: string }[] {
  const env = options.environment || 'staging';
  const region = options.region || 'ap-south-1';
  const port = options.dbPort || 5432;
  const runner = options.awsCliRunner || createDefaultRunner();
  const results: { name: string; action: 'dry-run' | 'set' | 'skipped' | 'rotated' | 'error'; detail?: string }[] = [];

  let platformHost = options.dbHost;
  let rosHost = options.restaurantDbHost || options.dbHost;

  if (!platformHost && !options.dryRun) {
    try {
      const tfOut = execFileSync('terraform', ['output', '-raw', 'rds_address'], {
        cwd: path.resolve(__dirname, '../../infra'),
        encoding: 'utf8',
      }).trim();
      if (tfOut && !tfOut.includes('No outputs found') && !tfOut.includes('Warning')) {
        platformHost = tfOut;
      }
    } catch {}
  }
  if (!platformHost) {
    platformHost = `orbitox-${env}-pg16.internal`;
  }
  if (!rosHost) {
    rosHost = platformHost;
  }

  for (const cfg of DATABASE_ROLES) {
    const host = cfg.dbType === 'restaurant_os' ? rosHost : platformHost;
    const dbname = cfg.defaultDbName.replace('_staging', `_${env}`);
    const structuredId = `orbitox/${env}/${cfg.structuredSecretName}`;
    const urlId = `orbitox/${env}/${cfg.secretUrlName}`;

    if (options.dryRun) {
      results.push({ name: cfg.structuredSecretName, action: 'dry-run', detail: `Structured role credentials for ${cfg.role}` });
      results.push({ name: cfg.secretUrlName, action: 'dry-run', detail: `Composed database URL for ${cfg.role}` });
      console.log(`[DRY-RUN] ${structuredId}: would generate password and structured JSON`);
      console.log(`[DRY-RUN] ${urlId}: would generate composed postgresql:// connection URL`);
      continue;
    }

    if (!options.forceRotateDatabase) {
      // Check if both secrets already exist
      const checkStructured = runner(['secretsmanager', 'get-secret-value', '--secret-id', structuredId, '--region', region, '--output', 'json']);
      const checkUrl = runner(['secretsmanager', 'get-secret-value', '--secret-id', urlId, '--region', region, '--output', 'json']);

      if (checkStructured.status === 0 && checkUrl.status === 0) {
        results.push({ name: cfg.structuredSecretName, action: 'skipped' });
        results.push({ name: cfg.secretUrlName, action: 'skipped' });
        console.log(`${cfg.role}: credentials already exist (skipped, use --force-rotate-database to replace)`);
        continue;
      }
    }

    // Generate fresh strong random password
    const password = crypto.randomBytes(24).toString('hex');

    const structuredPayload = JSON.stringify({
      username: cfg.role,
      password,
      host,
      port,
      dbname,
      sslmode: 'require',
    });

    const composedUrl = `postgresql://${cfg.role}:${password}@${host}:${port}/${dbname}?sslmode=require`;

    // Put structured secret via stdin
    const putStruct = runner(
      ['secretsmanager', 'put-secret-value', '--secret-id', structuredId, '--secret-string', 'file:///dev/stdin', '--region', region],
      structuredPayload,
    );

    // Put URL secret via stdin
    const putUrl = runner(
      ['secretsmanager', 'put-secret-value', '--secret-id', urlId, '--secret-string', 'file:///dev/stdin', '--region', region],
      composedUrl,
    );

    if (putStruct.status === 0 && putUrl.status === 0) {
      const act = options.forceRotateDatabase ? 'rotated' : 'set';
      results.push({ name: cfg.structuredSecretName, action: act });
      results.push({ name: cfg.secretUrlName, action: act });
      console.log(`${cfg.role}: ${act} credentials (${structuredId} + ${urlId})`);
    } else {
      results.push({ name: cfg.role, action: 'error', detail: 'Failed to write database secrets to Secrets Manager' });
      console.error(`${cfg.role}: error setting database secrets`);
    }
  }

  return results;
}

export function runSecretGenerator(options: {
  environment?: string;
  region?: string;
  dryRun?: boolean;
  rotate?: string | boolean;
  addKey?: string;
  activate?: string | boolean;
  kid?: string;
  database?: boolean;
  dbHost?: string;
  restaurantDbHost?: string;
  dbPort?: number;
  forceRotateDatabase?: boolean;
  awsCliRunner?: AwsCliRunner;
}): { name: string; action: 'dry-run' | 'set' | 'skipped' | 'rotated' | 'added-key' | 'activated' | 'error'; detail?: string }[] {
  const env = options.environment || 'staging';
  const region = options.region || 'ap-south-1';
  const secretNames = getExpectedSecretNames();
  const results: { name: string; action: 'dry-run' | 'set' | 'skipped' | 'rotated' | 'added-key' | 'activated' | 'error'; detail?: string }[] = [];
  const runner = options.awsCliRunner || createDefaultRunner();

  // If database mode is requested
  if (options.database) {
    return runDatabaseCredentialGenerator({
      environment: env,
      region,
      dbHost: options.dbHost,
      restaurantDbHost: options.restaurantDbHost,
      dbPort: options.dbPort,
      dryRun: options.dryRun,
      forceRotateDatabase: options.forceRotateDatabase,
      awsCliRunner: runner,
    });
  }

  // Handle explicit --activate=<SECRET> --kid=<KID> if provided
  if (typeof options.activate === 'string' && options.activate !== 'true' && options.kid) {
    const actResult = handleActivateKey({
      secretName: options.activate,
      kid: options.kid,
      environment: env,
      region,
      runner,
    });
    return [actResult];
  }

  // Handle --add-key option if provided
  if (options.addKey) {
    const addResult = handleAdditiveKeyRotation({
      secretName: options.addKey,
      activate: options.activate === true,
      environment: env,
      region,
      runner,
    });
    return [addResult];
  }

  // Validate --rotate option
  if (options.rotate !== undefined && options.rotate !== false) {
    if (options.rotate === true || typeof options.rotate !== 'string') {
      throw new Error(
        `Blind rotation of all secrets is strictly prohibited. To rotate a stateless secret, specify --rotate=<NAME> (allowed: ${STATELESS_SECRETS.join(
          ', ',
        )}). For keyed secrets, use --add-key=<NAME>.`,
      );
    }
    const target = options.rotate;
    if (!STATELESS_SECRETS.includes(target as any)) {
      if (target === 'STAFF_AUTH_SECRET') {
        throw new Error(
          `Secret "${target}" cannot be blind-rotated. Doing so would invalidate active staff sessions and diner payment signatures across all tenants.`,
        );
      }
      if (KEYED_ROTATABLE_SECRETS.includes(target as any)) {
        throw new Error(
          `Secret "${target}" cannot be blind-rotated. Keyed secrets must be rotated additively via --add-key=${target}.`,
        );
      }
      if (STATEFUL_ENCRYPTION_SECRETS.includes(target as any)) {
        throw new Error(
          `Secret "${target}" cannot be blind-rotated. Doing so would permanently break decryption of existing persistent data.`,
        );
      }
      if (target === 'ORBITOX_DELETION_CERT_KEY_ACTIVE') {
        throw new Error(
          `Secret "${target}" cannot be blind-rotated. Rotate deletion cert keys via --add-key=ORBITOX_DELETION_CERT_KEYS and promote via --activate=ORBITOX_DELETION_CERT_KEYS --kid=<ID>.`,
        );
      }
      if (target === 'ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE') {
        throw new Error(
          `Secret "${target}" cannot be blind-rotated. Rotate export encryption keys via --add-key=ORBITOX_EXPORT_ENCRYPTION_KEYS and promote via --activate=ORBITOX_EXPORT_ENCRYPTION_KEYS --kid=<ID>.`,
        );
      }
      throw new Error(`Secret "${target}" is not recognized or not eligible for rotation.`);
    }
  }

  if (options.dryRun) {
    for (const name of secretNames) {
      results.push({ name, action: 'dry-run' });
      console.log(`[DRY-RUN] orbitox/${env}/${name}: would generate and set`);
    }
    return results;
  }

  for (const name of secretNames) {
    const secretId = `orbitox/${env}/${name}`;
    const generator = SECRET_GENERATORS[name];
    if (!generator) {
      results.push({ name, action: 'error', detail: 'Missing generator function' });
      console.error(`${name}: error (no generator configured)`);
      continue;
    }

    // If --rotate=<NAME> was supplied, only rotate that specific secret; skip all others if already set
    const isTargetOfRotation = options.rotate === name;

    if (!isTargetOfRotation) {
      // Check if value is already set
      const checkRes = runner([
        'secretsmanager',
        'get-secret-value',
        '--secret-id',
        secretId,
        '--region',
        region,
        '--output',
        'json',
      ]);

      if (checkRes.status === 0) {
        try {
          const parsed = JSON.parse(checkRes.stdout);
          if (parsed.SecretString && parsed.SecretString.trim().length > 0) {
            results.push({ name, action: 'skipped' });
            console.log(`${name}: already set (skipped, use --rotate to replace)`);
            continue;
          }
        } catch {
          // parse failed, proceed to put
        }
      }
    }

    // Generate value in memory (NEVER logged or saved to file)
    const secretValue = generator();

    // Store in Secrets Manager via stdin to prevent leaking secret values in process argv/ps
    const putRes = runner(
      [
        'secretsmanager',
        'put-secret-value',
        '--secret-id',
        secretId,
        '--secret-string',
        'file:///dev/stdin',
        '--region',
        region,
      ],
      secretValue,
    );

    if (putRes.status === 0) {
      const action = isTargetOfRotation ? 'rotated' : 'set';
      results.push({ name, action });
      console.log(`${name}: ${action}`);
    } else {
      results.push({ name, action: 'error', detail: 'Failed to put secret in Secrets Manager' });
      console.error(`${name}: error putting secret value`);
    }
  }

  return results;
}

// CLI entry point
if (require.main === module || process.argv[1]?.endsWith('generate-secrets.ts')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const database = args.includes('--database');
  const forceRotateDatabase = args.includes('--force-rotate-database');

  let rotate: string | boolean | undefined;
  const rotateArg = args.find((a) => a === '--rotate' || a.startsWith('--rotate='));
  if (rotateArg) {
    if (rotateArg === '--rotate') {
      rotate = true;
    } else {
      rotate = rotateArg.split('=')[1];
    }
  }

  let addKey: string | undefined;
  const addKeyArg = args.find((a) => a.startsWith('--add-key='));
  if (addKeyArg) {
    addKey = addKeyArg.split('=')[1];
  }

  let activate: string | boolean | undefined;
  const activateArg = args.find((a) => a === '--activate' || a.startsWith('--activate='));
  if (activateArg) {
    if (activateArg === '--activate') {
      activate = true;
    } else {
      activate = activateArg.split('=')[1];
    }
  }

  let kid: string | undefined;
  const kidArg = args.find((a) => a.startsWith('--kid='));
  if (kidArg) {
    kid = kidArg.split('=')[1];
  }

  const envIndex = args.indexOf('--environment');
  const environment = envIndex !== -1 && args[envIndex + 1] ? args[envIndex + 1] : 'staging';
  const regionIndex = args.indexOf('--region');
  const region = regionIndex !== -1 && args[regionIndex + 1] ? args[regionIndex + 1] : 'ap-south-1';
  const hostIndex = args.indexOf('--db-host');
  const dbHost = hostIndex !== -1 && args[hostIndex + 1] ? args[hostIndex + 1] : undefined;
  const rosHostIndex = args.indexOf('--restaurant-db-host');
  const restaurantDbHost = rosHostIndex !== -1 && args[rosHostIndex + 1] ? args[rosHostIndex + 1] : undefined;

  try {
    runSecretGenerator({ dryRun, rotate, addKey, activate, kid, database, dbHost, restaurantDbHost, forceRotateDatabase, environment, region });
  } catch (err: any) {
    console.error('Fatal error in secret generation:', err.message);
    process.exit(1);
  }
}

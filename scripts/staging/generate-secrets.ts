import * as crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  PLATFORM_SERVICE_CONTRACTS,
  EXTERNAL_SECRETS,
  getGeneratedSecretNames,
} from '../../orbitox/apps/web/lib/platform-service-contracts';

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
] as const;

export const KEYED_ROTATABLE_SECRETS = [
  'ORBITOX_PHI_KEYS',
  'ORBITOX_GRANT_SIGNING_KEYS',
  'ORBITOX_BRIDGE_KEYS',
  'ORBITOX_SERVER_PEPPER',
] as const;

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
    'phi-key-2026-1': key32,
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

export const SECRET_GENERATORS: Record<string, () => string> = {
  SESSION_SECRET: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_ADMIN_TOKEN: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_RUNTIME_TOKEN: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_CONTROL_SECRET: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_GUEST_SECRET: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_SERVER_PEPPER: () => crypto.randomBytes(32).toString('hex'),
  ORBITOX_MFA_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString('base64'),
  ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString('base64'),
  ORBITOX_PHI_INDEX_KEY: () => crypto.randomBytes(32).toString('base64'),
  ORBITOX_PHI_KEYS: generatePhiKeys,
  ORBITOX_GRANT_SIGNING_KEYS: generateEd25519GrantSigningKeys,
  ORBITOX_GRANT_PUBLIC_KEYS: generateGrantPublicKeys,
  ORBITOX_BRIDGE_KEYS: generateBridgeKeys,
  ORBITOX_BRIDGE_ACTIVE_KID: () => 'k1',
  ORBITOX_EMAIL_WEBHOOK_SECRET: () => 'whsec_' + crypto.randomBytes(32).toString('base64'),
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
    const newKid = `phi-key-2026-${Object.keys(keysMap).length + 1}`;
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

  if (name === 'ORBITOX_SERVER_PEPPER') {
    // Pepper-ring rotation
    let peppers: Record<string, string> = {};
    if (currentString) {
      try {
        peppers = JSON.parse(currentString);
      } catch {
        // legacy raw string
        peppers = { legacy: currentString };
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

    console.log(`${name}: added pepper ${newId} to ring (preserved ${Object.keys(peppers).length - 1} existing peppers)`);
    return { name, action: 'added-key', detail: `Added pepper ${newId}` };
  }

  throw new Error(`Unsupported --add-key target: ${name}`);
}

export function runSecretGenerator(options: {
  environment?: string;
  region?: string;
  dryRun?: boolean;
  rotate?: string | boolean;
  addKey?: string;
  awsCliRunner?: AwsCliRunner;
}): { name: string; action: 'dry-run' | 'set' | 'skipped' | 'rotated' | 'added-key' | 'error'; detail?: string }[] {
  const env = options.environment || 'staging';
  const region = options.region || 'ap-south-1';
  const secretNames = getExpectedSecretNames();
  const results: { name: string; action: 'dry-run' | 'set' | 'skipped' | 'rotated' | 'added-key' | 'error'; detail?: string }[] = [];
  const runner = options.awsCliRunner || createDefaultRunner();

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
      throw new Error(`Secret "${target}" is not recognized or not eligible for rotation.`);
    }
  }

  // Handle --add-key option if provided
  if (options.addKey) {
    const addResult = handleAdditiveKeyRotation({
      secretName: options.addKey,
      environment: env,
      region,
      runner,
    });
    return [addResult];
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

  const envIndex = args.indexOf('--environment');
  const environment = envIndex !== -1 && args[envIndex + 1] ? args[envIndex + 1] : 'staging';
  const regionIndex = args.indexOf('--region');
  const region = regionIndex !== -1 && args[regionIndex + 1] ? args[regionIndex + 1] : 'ap-south-1';

  try {
    runSecretGenerator({ dryRun, rotate, addKey, environment, region });
  } catch (err: any) {
    console.error('Fatal error in secret generation:', err.message);
    process.exit(1);
  }
}

import * as crypto from 'node:crypto';
import { execFileSync, execSync } from 'node:child_process';
import { PLATFORM_SERVICE_CONTRACTS, EXTERNAL_SECRETS, getGeneratedSecretNames } from '../../orbitox/apps/web/lib/platform-service-contracts';

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
 * - External provider keys (Razorpay, Resend) are NEVER generated.
 * - Idempotent by default: skips already-set secrets unless --rotate is passed.
 * ─────────────────────────────────────────────────────────────
 */

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

export function generatePhiKeys(): string {
  const key32 = crypto.randomBytes(32).toString('base64');
  return JSON.stringify({
    'phi-key-2026-1': key32,
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
  ORBITOX_EMAIL_WEBHOOK_SECRET: () => 'whsec_' + crypto.randomBytes(32).toString('base64'),
};

export function getExpectedSecretNames(): string[] {
  return getGeneratedSecretNames();
}

export function runSecretGenerator(options: {
  environment?: string;
  region?: string;
  dryRun?: boolean;
  rotate?: boolean;
  awsCliRunner?: (args: string[], inputStdin?: string) => { stdout: string; status: number };
}): { name: string; action: 'dry-run' | 'set' | 'skipped' | 'rotated' | 'error'; detail?: string }[] {
  const env = options.environment || 'staging';
  const region = options.region || 'ap-south-1';
  const secretNames = getExpectedSecretNames();
  const results: { name: string; action: 'dry-run' | 'set' | 'skipped' | 'rotated' | 'error'; detail?: string }[] = [];

  if (options.dryRun) {
    for (const name of secretNames) {
      results.push({ name, action: 'dry-run' });
      console.log(`[DRY-RUN] orbitox/${env}/${name}: would generate and set`);
    }
    return results;
  }

  const defaultRunner = (args: string[], inputStdin?: string) => {
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

  const runner = options.awsCliRunner || defaultRunner;

  for (const name of secretNames) {
    const secretId = `orbitox/${env}/${name}`;
    const generator = SECRET_GENERATORS[name];
    if (!generator) {
      results.push({ name, action: 'error', detail: 'Missing generator function' });
      console.error(`${name}: error (no generator configured)`);
      continue;
    }

    if (!options.rotate) {
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
      const action = options.rotate ? 'rotated' : 'set';
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
  const rotate = args.includes('--rotate');
  const envIndex = args.indexOf('--environment');
  const environment = envIndex !== -1 && args[envIndex + 1] ? args[envIndex + 1] : 'staging';
  const regionIndex = args.indexOf('--region');
  const region = regionIndex !== -1 && args[regionIndex + 1] ? args[regionIndex + 1] : 'ap-south-1';

  try {
    runSecretGenerator({ dryRun, rotate, environment, region });
  } catch (err: any) {
    console.error('Fatal error in secret generation:', err.message);
    process.exit(1);
  }
}


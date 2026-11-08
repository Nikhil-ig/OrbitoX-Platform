import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORM_SERVICE_CONTRACTS,
  EXTERNAL_SECRETS,
  EXTERNAL_PROVIDER_SECRETS,
  DATABASE_URL_SECRETS,
  getGeneratedSecretNames,
} from '../lib/platform-service-contracts';
import {
  runSecretGenerator,
  getExpectedSecretNames,
  SECRET_GENERATORS,
} from '../../../../scripts/staging/generate-secrets';

describe('Phase 6F B0: Staging Secret Generator Verification', () => {
  it('dry-run mode lists the exact names it would set without writing secrets', () => {
    const results = runSecretGenerator({ dryRun: true, environment: 'staging' });
    const dryRunNames = results.map((r) => r.name).sort();
    const expectedNames = getExpectedSecretNames().sort();

    assert.deepEqual(
      dryRunNames,
      expectedNames,
      'Dry-run names must match getExpectedSecretNames()',
    );
    assert.ok(results.every((r) => r.action === 'dry-run'));
  });

  it('name list equals the secret names in platform-service-contracts.ts minus the external and db secrets', () => {
    // 1. Collect all unique secrets across all defined service contracts
    const allContractSecrets = new Set<string>();
    for (const service of Object.values(PLATFORM_SERVICE_CONTRACTS)) {
      for (const secret of service.secrets) {
        allContractSecrets.add(secret);
      }
    }

    // 2. Compute contract secrets minus excluded external secrets
    const excludedSet = new Set<string>(EXTERNAL_SECRETS);
    const expectedGenerated = Array.from(allContractSecrets)
      .filter((name) => !excludedSet.has(name))
      .sort();

    // 3. Compare with secret generator's configured list
    const generatorNames = getExpectedSecretNames().sort();
    assert.deepEqual(
      generatorNames,
      expectedGenerated,
      'The generated secret names must equal platform-service-contracts minus external/db secrets',
    );

    // 4. Ensure no external provider secrets are ever in the generator list
    for (const ext of EXTERNAL_PROVIDER_SECRETS) {
      assert.equal(
        generatorNames.includes(ext),
        false,
        `External secret "${ext}" must NOT be in the generator list`,
      );
    }
  });

  it('all secret generators produce valid values meeting length and format requirements', () => {
    for (const name of getExpectedSecretNames()) {
      const generator = SECRET_GENERATORS[name];
      assert.ok(generator, `Missing generator function for secret "${name}"`);
      const val = generator();
      assert.ok(typeof val === 'string' && val.length > 0, `Secret "${name}" produced invalid value`);

      // Specific validation checks matching instrumentation.node.ts
      if (name === 'ORBITOX_EMAIL_WEBHOOK_SECRET') {
        assert.match(val, /^whsec_[A-Za-z0-9+/]+={0,2}$/);
        const raw = Buffer.from(val.slice(6), 'base64');
        assert.ok(raw.length >= 32, 'Email webhook secret must be at least 32 bytes base64');
      } else if (name === 'ORBITOX_MFA_ENCRYPTION_KEY' || name === 'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY') {
        const raw = Buffer.from(val, 'base64');
        assert.equal(raw.length, 32, `${name} must decode to exactly 32 bytes`);
      } else if (name === 'ORBITOX_PHI_KEYS') {
        const parsed = JSON.parse(val);
        assert.ok(parsed['phi-key-2026-1'], 'Must contain phi-key-2026-1');
        const raw = Buffer.from(parsed['phi-key-2026-1'], 'base64');
        assert.equal(raw.length, 32, 'PHI key must decode to 32 bytes');
      } else if (name === 'ORBITOX_GRANT_SIGNING_KEYS') {
        const parsed = JSON.parse(val);
        assert.ok(parsed.k1.privateKey.includes('BEGIN PRIVATE KEY'));
        assert.ok(parsed.k1.publicKey.includes('BEGIN PUBLIC KEY'));
      } else if (name === 'ORBITOX_GRANT_PUBLIC_KEYS') {
        const parsed = JSON.parse(val);
        assert.ok(parsed.k1.publicKey.includes('BEGIN PUBLIC KEY'));
        assert.equal(parsed.k1.privateKey, undefined);
      } else if (name === 'ORBITOX_BRIDGE_KEYS') {
        const parsed = JSON.parse(val);
        assert.equal(parsed.activeKeyId, 'k1');
        assert.ok(typeof parsed.keys.k1 === 'string' && parsed.keys.k1.length >= 32);
      } else if (name === 'ORBITOX_BRIDGE_ACTIVE_KID') {
        assert.match(val, /^[a-zA-Z0-9_-]+$/);
      } else {
        assert.ok(val.length >= 32, `Secret "${name}" length must be at least 32 (got ${val.length})`);
      }
    }
  });

  it('B0-1 HIGH security: secret values are passed via stdin and NEVER in process argv', () => {
    const recordedInvocations: { args: string[]; stdin?: string }[] = [];

    const mockRunner = (args: string[], stdin?: string) => {
      recordedInvocations.push({ args: [...args], stdin });
      const subcmd = args[1];
      if (subcmd === 'get-secret-value') {
        return { stdout: '', status: 1 }; // not set
      }
      if (subcmd === 'put-secret-value') {
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }
      return { stdout: '', status: 0 };
    };

    const results = runSecretGenerator({
      dryRun: false,
      awsCliRunner: mockRunner,
    });

    assert.ok(results.length > 0);
    assert.ok(recordedInvocations.length > 0);

    const putCalls = recordedInvocations.filter((c) => c.args.includes('put-secret-value'));
    assert.ok(putCalls.length > 0, 'Must have executed put-secret-value calls');

    for (const call of putCalls) {
      // Must use file:///dev/stdin
      const strIdx = call.args.indexOf('--secret-string');
      assert.notEqual(strIdx, -1, 'Must specify --secret-string flag');
      assert.equal(
        call.args[strIdx + 1],
        'file:///dev/stdin',
        '--secret-string must be file:///dev/stdin to avoid leaking secrets in argv',
      );

      // stdin must contain the non-empty secret value
      assert.ok(call.stdin, 'Secret value must be supplied via stdin');
      assert.ok(typeof call.stdin === 'string' && call.stdin.length > 0);

      // argv must NEVER contain the secret value
      for (const arg of call.args) {
        assert.equal(
          arg.includes(call.stdin),
          false,
          `argv element "${arg}" must NEVER contain secret value "${call.stdin}"`,
        );
      }
    }
  });

  it('B0-2 HIGH security: bare --rotate or rotating stateful/keyed secrets is refused', () => {
    let writeAttempts = 0;
    const mockRunner = (args: string[]) => {
      if (args[1] === 'put-secret-value') {
        writeAttempts++;
      }
      return { stdout: '', status: 0 };
    };

    // 1. Bare --rotate (true) must be refused
    assert.throws(
      () => runSecretGenerator({ rotate: true, awsCliRunner: mockRunner }),
      /Blind rotation of all secrets is strictly prohibited/,
    );
    assert.equal(writeAttempts, 0);

    // 2. Rotating stateful encryption key must be refused
    assert.throws(
      () => runSecretGenerator({ rotate: 'ORBITOX_PHI_KEYS', awsCliRunner: mockRunner }),
      /Keyed secrets must be rotated additively via --add-key=ORBITOX_PHI_KEYS/,
    );
    assert.throws(
      () => runSecretGenerator({ rotate: 'ORBITOX_MFA_ENCRYPTION_KEY', awsCliRunner: mockRunner }),
      /Doing so would permanently break decryption/,
    );
    assert.throws(
      () => runSecretGenerator({ rotate: 'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY', awsCliRunner: mockRunner }),
      /Doing so would permanently break decryption/,
    );
    assert.throws(
      () => runSecretGenerator({ rotate: 'ORBITOX_PHI_INDEX_KEY', awsCliRunner: mockRunner }),
      /Doing so would permanently break decryption/,
    );
    assert.equal(writeAttempts, 0);
  });

  it('B0-2 HIGH security: explicit --rotate=NAME allows rotating only stateless secrets', () => {
    const mockStorage = new Map<string, string>();
    mockStorage.set('orbitox/staging/SESSION_SECRET', 'old_session_secret_32_characters_minimum');
    mockStorage.set('orbitox/staging/ORBITOX_ADMIN_TOKEN', 'old_admin_token_32_characters_minimum');

    const mockRunner = (args: string[], stdin?: string) => {
      const subcmd = args[1];
      const idIdx = args.indexOf('--secret-id');
      const secretId = idIdx !== -1 ? args[idIdx + 1] : undefined;
      if (!secretId) return { stdout: '', status: 1 };

      if (subcmd === 'get-secret-value') {
        if (mockStorage.has(secretId)) {
          return {
            stdout: JSON.stringify({ SecretString: mockStorage.get(secretId) }),
            status: 0,
          };
        }
        return { stdout: '', status: 1 };
      }

      if (subcmd === 'put-secret-value') {
        if (stdin) {
          mockStorage.set(secretId, stdin);
        }
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }

      return { stdout: '', status: 0 };
    };

    // Rotate ONLY SESSION_SECRET
    const results = runSecretGenerator({
      dryRun: false,
      rotate: 'SESSION_SECRET',
      awsCliRunner: mockRunner,
    });

    const sessionRes = results.find((r) => r.name === 'SESSION_SECRET');
    assert.equal(sessionRes?.action, 'rotated');

    // ORBITOX_ADMIN_TOKEN was already set and should be skipped
    const adminRes = results.find((r) => r.name === 'ORBITOX_ADMIN_TOKEN');
    assert.equal(adminRes?.action, 'skipped');
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_ADMIN_TOKEN'), 'old_admin_token_32_characters_minimum');
  });

  it('B0-2 HIGH security: --add-key additively rotates keyed secrets preserving all historical keys', () => {
    const mockStorage = new Map<string, string>();
    
    // Seed initial PHI keys
    const initialPhiKeys = JSON.stringify({ 'phi-key-2026-1': 'aW5pdGlhbF9waGlfa2V5XzMyX2J5dGVzX2xlbg==' });
    mockStorage.set('orbitox/staging/ORBITOX_PHI_KEYS', initialPhiKeys);

    // Seed initial grant keys
    const initialGrantKeys = JSON.stringify({
      k1: {
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----',
      },
    });
    mockStorage.set('orbitox/staging/ORBITOX_GRANT_SIGNING_KEYS', initialGrantKeys);

    // Seed initial bridge keys
    const initialBridgeKeys = JSON.stringify({
      activeKeyId: 'k1',
      keys: {
        k1: 'initial_bridge_key_hex_string_32_bytes_at_least_1234567890',
      },
    });
    mockStorage.set('orbitox/staging/ORBITOX_BRIDGE_KEYS', initialBridgeKeys);

    const mockRunner = (args: string[], stdin?: string) => {
      const subcmd = args[1];
      const idIdx = args.indexOf('--secret-id');
      const secretId = idIdx !== -1 ? args[idIdx + 1] : undefined;
      if (!secretId) return { stdout: '', status: 1 };

      if (subcmd === 'get-secret-value') {
        if (mockStorage.has(secretId)) {
          return {
            stdout: JSON.stringify({ SecretString: mockStorage.get(secretId) }),
            status: 0,
          };
        }
        return { stdout: '', status: 1 };
      }

      if (subcmd === 'put-secret-value') {
        if (stdin) {
          mockStorage.set(secretId, stdin);
        }
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }

      return { stdout: '', status: 0 };
    };

    // 1. Add key to ORBITOX_PHI_KEYS
    const phiResult = runSecretGenerator({
      addKey: 'ORBITOX_PHI_KEYS',
      awsCliRunner: mockRunner,
    });
    assert.equal(phiResult[0]?.action, 'added-key');
    const updatedPhi = JSON.parse(mockStorage.get('orbitox/staging/ORBITOX_PHI_KEYS')!);
    assert.ok(updatedPhi['phi-key-2026-1'], 'Must preserve original key phi-key-2026-1');
    assert.ok(updatedPhi['phi-key-2026-2'], 'Must add new key phi-key-2026-2');

    // 2. Add key to ORBITOX_GRANT_SIGNING_KEYS
    const grantResult = runSecretGenerator({
      addKey: 'ORBITOX_GRANT_SIGNING_KEYS',
      awsCliRunner: mockRunner,
    });
    assert.equal(grantResult[0]?.action, 'added-key');
    const updatedGrant = JSON.parse(mockStorage.get('orbitox/staging/ORBITOX_GRANT_SIGNING_KEYS')!);
    assert.ok(updatedGrant.k1, 'Must preserve original key k1');
    assert.ok(updatedGrant.k2, 'Must add new key k2');
    // Check public keys was synced
    const updatedPublic = JSON.parse(mockStorage.get('orbitox/staging/ORBITOX_GRANT_PUBLIC_KEYS')!);
    assert.ok(updatedPublic.k1?.publicKey, 'Must contain k1 public key');
    assert.ok(updatedPublic.k2?.publicKey, 'Must contain k2 public key');
    assert.equal(updatedPublic.k1?.privateKey, undefined, 'Must NEVER contain private keys in grant public keys');

    // 3. Add key to ORBITOX_BRIDGE_KEYS
    const bridgeResult = runSecretGenerator({
      addKey: 'ORBITOX_BRIDGE_KEYS',
      awsCliRunner: mockRunner,
    });
    assert.equal(bridgeResult[0]?.action, 'added-key');
    const updatedBridge = JSON.parse(mockStorage.get('orbitox/staging/ORBITOX_BRIDGE_KEYS')!);
    assert.ok(updatedBridge.keys.k1, 'Must preserve original bridge key k1');
    assert.ok(updatedBridge.keys.k2, 'Must add new bridge key k2');
    assert.equal(updatedBridge.activeKeyId, 'k2', 'Must update activeKeyId to k2');
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_BRIDGE_ACTIVE_KID'), 'k2');
  });
});

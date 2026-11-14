import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  PLATFORM_SERVICE_CONTRACTS,
  EXTERNAL_SECRETS,
  EXTERNAL_PROVIDER_SECRETS,
  DATABASE_URL_SECRETS,
  getGeneratedSecretNames,
} from '@/server/organizations/platform-service-contracts';
import {
  runSecretGenerator,
  getExpectedSecretNames,
  SECRET_GENERATORS,
} from '../../../../scripts/secrets/generate-secrets';
import { loadPepperRing, activeVerifier, whichPepper } from '@/server/auth/pepper';
import { PhiKeyRing, seal, open } from '@/server/hospital/phi-crypto';
import {
  createEntitlementGrantToken,
  initializeGrantKeys,
  getPublicGrantKeys,
  clearGrantKeysForTesting,
} from '../../../../packages/plugin-engine/src/platform/grant-keys';
import { verifyGrant } from '../../../../packages/plugin-engine/src/platform/entitlement-token';
import {
  getDefaultBridgeKeys,
  signBridgeRequest,
  verifyBridgeRequest,
  MemoryNonceStore,
} from '../../../../packages/bridge/src';
import {
  buildSignedDeletionCertificate,
  extractDeletionCertPublicKeys,
  verifyDeletionCertificate,
} from '@/server/data-rights/deletion-certificate';
import {
  createObjectStoreFromEnv,
  loadExportEncryptionKeyRingFromEnv,
  S3ObjectStore,
  type S3CommandExecutor,
} from '@/server/data-rights/object-store';
import { buildZipArchive, readZipArchive } from '@/server/data-rights/archive';

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
        const key = parsed.v1 || parsed['phi-key-2026-1'];
        assert.ok(key, 'Must contain v1 or phi-key-2026-1');
        const raw = Buffer.from(key, 'base64');
        assert.equal(raw.length, 32, 'PHI key must decode to 32 bytes');
      } else if (name === 'ORBITOX_SERVER_PEPPERS') {
        const parsed = JSON.parse(val);
        assert.ok(parsed.p1, 'Must contain pepper p1');
        assert.ok(typeof parsed.p1 === 'string' && parsed.p1.length >= 32);
      } else if (name === 'ORBITOX_SERVER_PEPPER_ACTIVE') {
        assert.equal(val, 'p1');
      } else if (name === 'STAFF_AUTH_SECRET') {
        assert.ok(val.length >= 32);
      } else if (name === 'RESTAURANT_STATION_SECRETS') {
        const parsed = JSON.parse(val);
        assert.ok(Object.keys(parsed).length > 0);
      } else if (name === 'ORBITOX_GRANT_SIGNING_KEYS' || name === 'ORBITOX_DELETION_CERT_KEYS') {
        const parsed = JSON.parse(val);
        assert.ok(parsed.k1.privateKey.includes('BEGIN PRIVATE KEY'));
        assert.ok(parsed.k1.publicKey.includes('BEGIN PUBLIC KEY'));
      } else if (name === 'ORBITOX_DELETION_CERT_KEY_ACTIVE' || name === 'ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE') {
        assert.equal(val, 'k1');
      } else if (name === 'ORBITOX_EXPORT_ENCRYPTION_KEYS') {
        const parsed = JSON.parse(val);
        assert.ok(parsed.k1, 'Must contain export encryption key k1');
        assert.equal(Buffer.from(parsed.k1, 'base64').length, 32, 'Export encryption key must decode to 32 bytes');
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
      () => runSecretGenerator({ rotate: 'ORBITOX_SERVER_PEPPERS', awsCliRunner: mockRunner }),
      /Keyed secrets must be rotated additively via --add-key=ORBITOX_SERVER_PEPPERS/,
    );
    assert.throws(
      () => runSecretGenerator({ rotate: 'ORBITOX_DELETION_CERT_KEYS', awsCliRunner: mockRunner }),
      /Keyed secrets must be rotated additively via --add-key=ORBITOX_DELETION_CERT_KEYS/,
    );
    assert.throws(
      () => runSecretGenerator({ rotate: 'ORBITOX_DELETION_CERT_KEY_ACTIVE', awsCliRunner: mockRunner }),
      /cannot be blind-rotated/,
    );
    assert.throws(
      () => runSecretGenerator({ rotate: 'ORBITOX_EXPORT_ENCRYPTION_KEYS', awsCliRunner: mockRunner }),
      /Keyed secrets must be rotated additively via --add-key=ORBITOX_EXPORT_ENCRYPTION_KEYS/,
    );
    assert.throws(
      () => runSecretGenerator({ rotate: 'ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE', awsCliRunner: mockRunner }),
      /cannot be blind-rotated/,
    );
    assert.throws(
      () => runSecretGenerator({ rotate: 'STAFF_AUTH_SECRET', awsCliRunner: mockRunner }),
      /cannot be blind-rotated/,
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
    
    // Seed initial PHI keys generated dynamically at runtime
    const initialPhiKeys = JSON.stringify({
      'phi-key-2026-1': crypto.randomBytes(32).toString('base64'),
    });
    mockStorage.set('orbitox/staging/ORBITOX_PHI_KEYS', initialPhiKeys);

    // Seed initial grant keys generated dynamically at runtime
    const seedKeyPair = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    const initialGrantKeys = JSON.stringify({
      k1: {
        privateKey: seedKeyPair.privateKey,
        publicKey: seedKeyPair.publicKey,
      },
    });
    mockStorage.set('orbitox/staging/ORBITOX_GRANT_SIGNING_KEYS', initialGrantKeys);

    // Seed initial deletion cert keys generated dynamically at runtime
    const certKeyPair = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    mockStorage.set(
      'orbitox/staging/ORBITOX_DELETION_CERT_KEYS',
      JSON.stringify({
        k1: {
          privateKey: certKeyPair.privateKey,
          publicKey: certKeyPair.publicKey,
        },
      }),
    );

    // Seed initial bridge keys generated dynamically at runtime
    const initialBridgeKeys = JSON.stringify({
      activeKeyId: 'k1',
      keys: {
        k1: crypto.randomBytes(32).toString('hex'),
      },
    });
    mockStorage.set(
      'orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEYS',
      JSON.stringify({ k1: crypto.randomBytes(32).toString('base64') }),
    );
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

    // 2b. Add key to ORBITOX_DELETION_CERT_KEYS (preserves active key k1 until explicit activation)
    mockStorage.set('orbitox/staging/ORBITOX_DELETION_CERT_KEY_ACTIVE', 'k1');
    const certResult = runSecretGenerator({
      addKey: 'ORBITOX_DELETION_CERT_KEYS',
      awsCliRunner: mockRunner,
    });
    assert.equal(certResult[0]?.action, 'added-key');
    const updatedCert = JSON.parse(mockStorage.get('orbitox/staging/ORBITOX_DELETION_CERT_KEYS')!);
    assert.ok(updatedCert.k1, 'Must preserve original deletion cert key k1');
    assert.ok(updatedCert.k2, 'Must add new deletion cert key k2');
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_DELETION_CERT_KEY_ACTIVE'), 'k1', 'Active cert key must remain k1 until explicit activation');
    const certActivateRes = runSecretGenerator({
      activate: 'ORBITOX_DELETION_CERT_KEYS',
      kid: 'k2',
      awsCliRunner: mockRunner,
    });
    assert.equal(certActivateRes[0]?.action, 'activated');
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_DELETION_CERT_KEY_ACTIVE'), 'k2');

    // 2c. Add key to ORBITOX_EXPORT_ENCRYPTION_KEYS and explicitly activate k2
    mockStorage.set('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE', 'k1');
    const expEncRes = runSecretGenerator({
      addKey: 'ORBITOX_EXPORT_ENCRYPTION_KEYS',
      awsCliRunner: mockRunner,
    });
    assert.equal(expEncRes[0]?.action, 'added-key');
    const updatedExpEnc = JSON.parse(mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEYS')!);
    assert.ok(updatedExpEnc.k1 && updatedExpEnc.k2, 'Must preserve k1 and add k2 for export encryption keys');
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE'), 'k1');
    const expActivateRes = runSecretGenerator({
      activate: 'ORBITOX_EXPORT_ENCRYPTION_KEYS',
      kid: 'k2',
      awsCliRunner: mockRunner,
    });
    assert.equal(expActivateRes[0]?.action, 'activated');
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE'), 'k2');

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

    // 4. Add key to ORBITOX_SERVER_PEPPERS (preserves active pepper p1 until explicit activation)
    mockStorage.set('orbitox/staging/ORBITOX_SERVER_PEPPERS', JSON.stringify({ p1: 'a'.repeat(64) }));
    mockStorage.set('orbitox/staging/ORBITOX_SERVER_PEPPER_ACTIVE', 'p1');

    const pepperResult = runSecretGenerator({
      addKey: 'ORBITOX_SERVER_PEPPERS',
      awsCliRunner: mockRunner,
    });
    assert.equal(pepperResult[0]?.action, 'added-key');
    const updatedPeppers = JSON.parse(mockStorage.get('orbitox/staging/ORBITOX_SERVER_PEPPERS')!);
    assert.ok(updatedPeppers.p1, 'Must preserve p1');
    assert.ok(updatedPeppers.p2, 'Must add p2');
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_SERVER_PEPPER_ACTIVE'), 'p1', 'Active pepper must remain p1 until explicit activation');

    // 5. Explicit --activate promotes p2 to active
    const activateResult = runSecretGenerator({
      activate: 'ORBITOX_SERVER_PEPPERS',
      kid: 'p2',
      awsCliRunner: mockRunner,
    });
    assert.equal(activateResult[0]?.action, 'activated');
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_SERVER_PEPPER_ACTIVE'), 'p2');
  });

  it('B0-4 MEDIUM: --database mode generates structured secrets and composed URLs for all 7 roles', () => {
    const mockStorage = new Map<string, string>();
    const recordedInvocations: { args: string[]; stdin?: string }[] = [];

    const mockRunner = (args: string[], stdin?: string) => {
      recordedInvocations.push({ args: [...args], stdin });
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

    // 1. Dry run
    const dryRunResults = runSecretGenerator({
      database: true,
      dryRun: true,
      dbHost: 'pg.orbitox.internal',
      awsCliRunner: mockRunner,
    });
    assert.equal(dryRunResults.length, 14); // 7 roles * 2 (structured + url)
    assert.ok(dryRunResults.every((r) => r.action === 'dry-run'));

    // 2. Real run generating database credentials
    const realResults = runSecretGenerator({
      database: true,
      dryRun: false,
      dbHost: 'staging-rds.orbitox.internal',
      restaurantDbHost: 'staging-ros-rds.orbitox.internal',
      awsCliRunner: mockRunner,
    });
    assert.equal(realResults.length, 14);
    assert.ok(realResults.every((r) => r.action === 'set'));

    // Verify structured secret format
    const runtimeStructRaw = mockStorage.get('orbitox/staging/db/orbitox_runtime');
    assert.ok(runtimeStructRaw, 'Must have written db/orbitox_runtime structured secret');
    const runtimeStruct = JSON.parse(runtimeStructRaw);
    assert.equal(runtimeStruct.username, 'orbitox_runtime');
    assert.equal(runtimeStruct.host, 'staging-rds.orbitox.internal');
    assert.equal(runtimeStruct.port, 5432);
    assert.equal(runtimeStruct.dbname, 'orbitox_platform_staging');
    assert.equal(runtimeStruct.sslmode, 'require');
    assert.ok(typeof runtimeStruct.password === 'string' && runtimeStruct.password.length >= 32);

    // Verify composed URL matches structured password exactly
    const runtimeUrlRaw = mockStorage.get('orbitox/staging/APP_DATABASE_URL');
    assert.ok(runtimeUrlRaw, 'Must have written APP_DATABASE_URL');
    assert.equal(
      runtimeUrlRaw,
      `postgresql://orbitox_runtime:${runtimeStruct.password}@staging-rds.orbitox.internal:5432/orbitox_platform_staging?sslmode=require`,
    );

    // Verify restaurantos_app uses restaurant host and database
    const rosStructRaw = mockStorage.get('orbitox/staging/db/restaurantos_app');
    assert.ok(rosStructRaw);
    const rosStruct = JSON.parse(rosStructRaw);
    assert.equal(rosStruct.host, 'staging-ros-rds.orbitox.internal');
    assert.equal(rosStruct.dbname, 'restaurant_os_staging');

    const rosUrlRaw = mockStorage.get('orbitox/staging/RESTAURANT_OS_DATABASE_URL');
    assert.ok(rosUrlRaw);
    assert.equal(
      rosUrlRaw,
      `postgresql://restaurantos_app:${rosStruct.password}@staging-ros-rds.orbitox.internal:5432/restaurant_os_staging?sslmode=require`,
    );

    // 3. Idempotency: Second run skips already populated database credentials
    const secondRun = runSecretGenerator({
      database: true,
      dryRun: false,
      dbHost: 'staging-rds.orbitox.internal',
      awsCliRunner: mockRunner,
    });
    assert.ok(secondRun.every((r) => r.action === 'skipped'));

    // 4. Force rotate updates passwords
    const rotateRun = runSecretGenerator({
      database: true,
      dryRun: false,
      forceRotateDatabase: true,
      dbHost: 'staging-rds.orbitox.internal',
      awsCliRunner: mockRunner,
    });
    assert.ok(rotateRun.every((r) => r.action === 'rotated'));
    const rotatedStruct = JSON.parse(mockStorage.get('orbitox/staging/db/orbitox_runtime')!);
    assert.notEqual(rotatedStruct.password, runtimeStruct.password);
  });

  it('B0-7: Real-loader round-trip through loadPepperRing asserts dual-verification and active key promotion', () => {
    const mockStorage = new Map<string, string>();
    const mockRunner = (args: string[], stdin?: string) => {
      const subcmd = args[1];
      const idIdx = args.indexOf('--secret-id');
      const secretId = idIdx !== -1 ? args[idIdx + 1] : undefined;
      if (!secretId) return { stdout: '', status: 1 };
      if (subcmd === 'get-secret-value') {
        if (mockStorage.has(secretId)) {
          return { stdout: JSON.stringify({ SecretString: mockStorage.get(secretId) }), status: 0 };
        }
        return { stdout: '', status: 1 };
      }
      if (subcmd === 'put-secret-value') {
        if (stdin) mockStorage.set(secretId, stdin);
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }
      return { stdout: '', status: 0 };
    };

    // 1. Initial generation of pepper ring and active kid
    runSecretGenerator({ dryRun: false, awsCliRunner: mockRunner });
    const initialRingJson = mockStorage.get('orbitox/staging/ORBITOX_SERVER_PEPPERS')!;
    const initialActiveKid = mockStorage.get('orbitox/staging/ORBITOX_SERVER_PEPPER_ACTIVE')!;
    assert.ok(initialRingJson, 'Must have generated ORBITOX_SERVER_PEPPERS');
    assert.equal(initialActiveKid, 'p1');

    // 2. Load ring via real loadPepperRing loader
    const env1 = {
      ORBITOX_SERVER_PEPPERS: initialRingJson,
      ORBITOX_SERVER_PEPPER_ACTIVE: initialActiveKid,
    };
    const ring1 = loadPepperRing(env1);
    assert.equal(ring1.active, 'p1');

    // 3. Derive verifier for an API key using the active pepper
    const rawApiKey = `ak_live_${crypto.randomBytes(24).toString('hex')}`;
    const { verifier: oldVerifier, pepperId: oldPepperId } = activeVerifier(ring1, rawApiKey);
    assert.equal(oldPepperId, 'p1');
    assert.equal(whichPepper(ring1, rawApiKey, oldVerifier), 'p1');

    // 4. Run --add-key=ORBITOX_SERVER_PEPPERS (without activate)
    runSecretGenerator({ addKey: 'ORBITOX_SERVER_PEPPERS', awsCliRunner: mockRunner });
    const updatedRingJson = mockStorage.get('orbitox/staging/ORBITOX_SERVER_PEPPERS')!;
    const updatedActiveKid = mockStorage.get('orbitox/staging/ORBITOX_SERVER_PEPPER_ACTIVE')!;
    assert.equal(updatedActiveKid, 'p1', 'Active pepper must remain p1 until explicit confirmation');

    // 5. Load ring again: old key still verifies with p1
    const env2 = {
      ORBITOX_SERVER_PEPPERS: updatedRingJson,
      ORBITOX_SERVER_PEPPER_ACTIVE: updatedActiveKid,
    };
    const ring2 = loadPepperRing(env2);
    assert.equal(ring2.active, 'p1');
    assert.equal(whichPepper(ring2, rawApiKey, oldVerifier), 'p1');

    // 6. Run explicit confirmation --activate=ORBITOX_SERVER_PEPPERS --kid=p2
    runSecretGenerator({ activate: 'ORBITOX_SERVER_PEPPERS', kid: 'p2', awsCliRunner: mockRunner });
    assert.equal(mockStorage.get('orbitox/staging/ORBITOX_SERVER_PEPPER_ACTIVE'), 'p2');

    // 7. Load ring again: active is now p2, old key STILL verifies with p1, new key verifies with p2
    const env3 = {
      ORBITOX_SERVER_PEPPERS: updatedRingJson,
      ORBITOX_SERVER_PEPPER_ACTIVE: 'p2',
    };
    const ring3 = loadPepperRing(env3);
    assert.equal(ring3.active, 'p2');
    // Old key still verifies!
    assert.equal(whichPepper(ring3, rawApiKey, oldVerifier), 'p1');

    // New key is hashed with active pepper p2
    const newApiKey = `ak_live_${crypto.randomBytes(24).toString('hex')}`;
    const { verifier: newVerifier, pepperId: newPepperId } = activeVerifier(ring3, newApiKey);
    assert.equal(newPepperId, 'p2');
    assert.equal(whichPepper(ring3, newApiKey, newVerifier), 'p2');
  });

  it('B0-7: Real-loader round-trip through PhiKeyRing.fromEnv asserts old ciphertext decrypts after --add-key', () => {
    const mockStorage = new Map<string, string>();
    const mockRunner = (args: string[], stdin?: string) => {
      const subcmd = args[1];
      const idIdx = args.indexOf('--secret-id');
      const secretId = idIdx !== -1 ? args[idIdx + 1] : undefined;
      if (!secretId) return { stdout: '', status: 1 };
      if (subcmd === 'get-secret-value') {
        if (mockStorage.has(secretId)) {
          return { stdout: JSON.stringify({ SecretString: mockStorage.get(secretId) }), status: 0 };
        }
        return { stdout: '', status: 1 };
      }
      if (subcmd === 'put-secret-value') {
        if (stdin) mockStorage.set(secretId, stdin);
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }
      return { stdout: '', status: 0 };
    };

    // 1. Initial generation
    runSecretGenerator({ dryRun: false, awsCliRunner: mockRunner });
    const initialPhiKeys = mockStorage.get('orbitox/staging/ORBITOX_PHI_KEYS')!;
    const initialIndexKey = mockStorage.get('orbitox/staging/ORBITOX_PHI_INDEX_KEY')!;

    // 2. Load initial ring through real loader
    const env1 = {
      ORBITOX_PHI_KEYS: initialPhiKeys,
      ORBITOX_PHI_ACTIVE_KID: 'v1',
      ORBITOX_PHI_INDEX_KEY: initialIndexKey,
    };
    const ring1 = PhiKeyRing.fromEnv(env1);

    // 3. Encrypt PHI field with ring1
    const fieldRef = { tenantId: 'org/demo/project/prod/environment/staging', table: 'Patient', column: 'name', rowId: 'row-1' };
    const cleartext = 'Patient Sensitive Medical PHI Record 42';
    const sealed1 = seal(ring1, cleartext, fieldRef);
    assert.equal(open(ring1, sealed1, fieldRef), cleartext);

    // 4. Run --add-key=ORBITOX_PHI_KEYS
    runSecretGenerator({ addKey: 'ORBITOX_PHI_KEYS', awsCliRunner: mockRunner });
    const updatedPhiKeys = mockStorage.get('orbitox/staging/ORBITOX_PHI_KEYS')!;
    const parsedUpdated = JSON.parse(updatedPhiKeys);
    assert.ok(parsedUpdated.v1, 'Must preserve v1');
    assert.ok(parsedUpdated.v2, 'Must add v2');

    // 5. Load updated ring through real loader with activeKid = 'v2'
    const env2 = {
      ORBITOX_PHI_KEYS: updatedPhiKeys,
      ORBITOX_PHI_ACTIVE_KID: 'v2',
      ORBITOX_PHI_INDEX_KEY: initialIndexKey,
    };
    const ring2 = PhiKeyRing.fromEnv(env2);

    // 6. Old ciphertext decrypts perfectly with ring2
    assert.equal(open(ring2, sealed1, fieldRef), cleartext);

    // 7. New ciphertext encrypts with v2 and decrypts with ring2
    const cleartext2 = 'New Patient Lab Result Record 99';
    const sealed2 = seal(ring2, cleartext2, fieldRef);
    assert.equal(open(ring2, sealed2, fieldRef), cleartext2);
  });

  it('B0-7: Real-loader round-trip through createEntitlementGrantToken and verifyGrant asserts historical grant verification after --add-key', async () => {
    const mockStorage = new Map<string, string>();
    const mockRunner = (args: string[], stdin?: string) => {
      const subcmd = args[1];
      const idIdx = args.indexOf('--secret-id');
      const secretId = idIdx !== -1 ? args[idIdx + 1] : undefined;
      if (!secretId) return { stdout: '', status: 1 };
      if (subcmd === 'get-secret-value') {
        if (mockStorage.has(secretId)) {
          return { stdout: JSON.stringify({ SecretString: mockStorage.get(secretId) }), status: 0 };
        }
        return { stdout: '', status: 1 };
      }
      if (subcmd === 'put-secret-value') {
        if (stdin) mockStorage.set(secretId, stdin);
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }
      return { stdout: '', status: 0 };
    };

    // 1. Initial generation
    runSecretGenerator({ dryRun: false, awsCliRunner: mockRunner });
    const initialSigningKeys = mockStorage.get('orbitox/staging/ORBITOX_GRANT_SIGNING_KEYS')!;
    const initialPublicKeys = mockStorage.get('orbitox/staging/ORBITOX_GRANT_PUBLIC_KEYS')!;

    const origEnv = { ...process.env };
    try {
      Reflect.set(process.env, 'NODE_ENV', 'production');
      process.env.ORBITOX_GRANT_SIGNING_KEYS = initialSigningKeys;
      process.env.ORBITOX_GRANT_PUBLIC_KEYS = initialPublicKeys;

      initializeGrantKeys(true);
      const publicKeys1 = getPublicGrantKeys();

      // 2. Sign grant with k1
      const grantToken1 = createEntitlementGrantToken({
        tenantId: 'org/demo/project/staging/environment/tenant-1',
        pluginId: '@orbitox/restaurant',
        planId: 'enterprise',
        status: 'ACTIVE',
        features: ['pos', 'kds', 'analytics'],
        quotas: { orders: { limit: 10000, window: 'month' } },
        revision: 1,
      });

      // 3. Verify grant with public keys
      const claims1 = await verifyGrant<any>(grantToken1, {
        type: 'orbitox-ent',
        audience: '@orbitox/restaurant',
        trustedKeys: publicKeys1,
      });
      assert.equal(claims1.plan, 'enterprise');
      assert.equal(claims1.sub, 'org/demo/project/staging/environment/tenant-1');

      // 4. Run --add-key=ORBITOX_GRANT_SIGNING_KEYS
      runSecretGenerator({ addKey: 'ORBITOX_GRANT_SIGNING_KEYS', awsCliRunner: mockRunner });
      const updatedSigningKeys = mockStorage.get('orbitox/staging/ORBITOX_GRANT_SIGNING_KEYS')!;
      const updatedPublicKeys = mockStorage.get('orbitox/staging/ORBITOX_GRANT_PUBLIC_KEYS')!;

      process.env.ORBITOX_GRANT_SIGNING_KEYS = updatedSigningKeys;
      process.env.ORBITOX_GRANT_PUBLIC_KEYS = updatedPublicKeys;

      initializeGrantKeys(true);
      const publicKeys2 = getPublicGrantKeys();
      assert.ok(publicKeys2.k1, 'Must retain k1 public key');
      assert.ok(publicKeys2.k2, 'Must have k2 public key');

      // 5. Old grant token signed with k1 still verifies with updated public keys
      const claimsOld = await verifyGrant<any>(grantToken1, {
        type: 'orbitox-ent',
        audience: '@orbitox/restaurant',
        trustedKeys: publicKeys2,
      });
      assert.equal(claimsOld.plan, 'enterprise');

      // 6. New grant token signed with k2 verifies with updated public keys
      const grantToken2 = createEntitlementGrantToken({
        tenantId: 'org/demo/project/staging/environment/tenant-2',
        pluginId: '@orbitox/restaurant',
        planId: 'growth',
        status: 'ACTIVE',
        features: ['pos'],
        quotas: {},
        revision: 2,
      });
      const claimsNew = await verifyGrant<any>(grantToken2, {
        type: 'orbitox-ent',
        audience: '@orbitox/restaurant',
        trustedKeys: publicKeys2,
      });
      assert.equal(claimsNew.plan, 'growth');
    } finally {
      process.env = origEnv;
      clearGrantKeysForTesting();
    }
  });

  it('B0-7: Real-loader round-trip through signBridgeRequest and verifyBridgeRequest asserts old signature verification after --add-key', async () => {
    const mockStorage = new Map<string, string>();
    const mockRunner = (args: string[], stdin?: string) => {
      const subcmd = args[1];
      const idIdx = args.indexOf('--secret-id');
      const secretId = idIdx !== -1 ? args[idIdx + 1] : undefined;
      if (!secretId) return { stdout: '', status: 1 };
      if (subcmd === 'get-secret-value') {
        if (mockStorage.has(secretId)) {
          return { stdout: JSON.stringify({ SecretString: mockStorage.get(secretId) }), status: 0 };
        }
        return { stdout: '', status: 1 };
      }
      if (subcmd === 'put-secret-value') {
        if (stdin) mockStorage.set(secretId, stdin);
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }
      return { stdout: '', status: 0 };
    };

    // 1. Initial generation
    runSecretGenerator({ dryRun: false, awsCliRunner: mockRunner });
    const initialBridgeKeys = mockStorage.get('orbitox/staging/ORBITOX_BRIDGE_KEYS')!;
    const initialActiveKid = mockStorage.get('orbitox/staging/ORBITOX_BRIDGE_ACTIVE_KID')!;
    assert.equal(initialActiveKid, 'k1');

    const origEnv = { ...process.env };
    try {
      Reflect.set(process.env, 'NODE_ENV', 'production');
      process.env.ORBITOX_BRIDGE_KEYS = initialBridgeKeys;
      process.env.ORBITOX_BRIDGE_ACTIVE_KID = initialActiveKid;

      // 2. Load bridge keys via getDefaultBridgeKeys real loader
      const bridgeKeys1 = getDefaultBridgeKeys();
      assert.equal(bridgeKeys1.activeKeyId, 'k1');

      // 3. Sign outgoing platform request
      const reqHeaders = signBridgeRequest(bridgeKeys1, {
        method: 'POST',
        pathWithQuery: '/orbitox/lifecycle/provision',
        tenantId: 'org/demo/project/staging/environment/tenant-1',
        principal: { sub: 'user_master_admin', scopes: ['tenant:admin'] },
        body: JSON.stringify({ slug: 'mumbai-flagship-diner' }),
      });
      assert.equal(reqHeaders['bridge-key-id'], 'k1');

      // 4. Verify request using verifyBridgeRequest real loader
      const v1 = await verifyBridgeRequest(bridgeKeys1, new MemoryNonceStore(), {
        method: 'POST',
        pathWithQuery: '/orbitox/lifecycle/provision',
        headers: reqHeaders,
        rawBody: JSON.stringify({ slug: 'mumbai-flagship-diner' }),
      });
      assert.equal(v1.ok, true);

      // 5. Run --add-key=ORBITOX_BRIDGE_KEYS
      runSecretGenerator({ addKey: 'ORBITOX_BRIDGE_KEYS', awsCliRunner: mockRunner });
      const updatedBridgeKeys = mockStorage.get('orbitox/staging/ORBITOX_BRIDGE_KEYS')!;
      const updatedActiveKid = mockStorage.get('orbitox/staging/ORBITOX_BRIDGE_ACTIVE_KID')!;
      assert.equal(updatedActiveKid, 'k2');

      process.env.ORBITOX_BRIDGE_KEYS = updatedBridgeKeys;
      process.env.ORBITOX_BRIDGE_ACTIVE_KID = updatedActiveKid;

      // 6. Load updated bridge keys via real loader
      const bridgeKeys2 = getDefaultBridgeKeys();
      assert.equal(bridgeKeys2.activeKeyId, 'k2');
      assert.ok(bridgeKeys2.keys.k1, 'Must retain k1');
      assert.ok(bridgeKeys2.keys.k2, 'Must have k2');

      // 7. Old request signed with k1 still verifies against bridgeKeys2
      const vOld = await verifyBridgeRequest(bridgeKeys2, new MemoryNonceStore(), {
        method: 'POST',
        pathWithQuery: '/orbitox/lifecycle/provision',
        headers: reqHeaders,
        rawBody: JSON.stringify({ slug: 'mumbai-flagship-diner' }),
      });
      assert.equal(vOld.ok, true);

      // 8. New request signed with k2 verifies against bridgeKeys2
      const reqHeaders2 = signBridgeRequest(bridgeKeys2, {
        method: 'PUT',
        pathWithQuery: '/orbitox/lifecycle/status',
        tenantId: 'org/demo/project/staging/environment/tenant-1',
        principal: { sub: 'user_master_admin', scopes: ['tenant:admin'] },
        body: JSON.stringify({ status: 'SUSPENDED' }),
      });
      assert.equal(reqHeaders2['bridge-key-id'], 'k2');

      const vNew = await verifyBridgeRequest(bridgeKeys2, new MemoryNonceStore(), {
        method: 'PUT',
        pathWithQuery: '/orbitox/lifecycle/status',
        headers: reqHeaders2,
        rawBody: JSON.stringify({ status: 'SUSPENDED' }),
      });
      assert.equal(vNew.ok, true);
    } finally {
      process.env = origEnv;
    }
  });

  it('B0-7: Real-loader round-trip through buildSignedDeletionCertificate and verifyDeletionCertificate asserts historical verification after --add-key and key retirement', () => {
    const mockStorage = new Map<string, string>();
    const mockRunner = (args: string[], stdin?: string) => {
      const subcmd = args[1];
      const idIdx = args.indexOf('--secret-id');
      const secretId = idIdx !== -1 ? args[idIdx + 1] : undefined;
      if (!secretId) return { stdout: '', status: 1 };
      if (subcmd === 'get-secret-value') {
        if (mockStorage.has(secretId)) {
          return { stdout: JSON.stringify({ SecretString: mockStorage.get(secretId) }), status: 0 };
        }
        return { stdout: '', status: 1 };
      }
      if (subcmd === 'put-secret-value') {
        if (stdin) mockStorage.set(secretId, stdin);
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }
      return { stdout: '', status: 0 };
    };

    // 1. Initial generation produces k1 + active = 'k1' and grant signing keys separate
    runSecretGenerator({ dryRun: false, awsCliRunner: mockRunner });
    const initialCertKeys = mockStorage.get('orbitox/staging/ORBITOX_DELETION_CERT_KEYS')!;
    const initialActiveKid = mockStorage.get('orbitox/staging/ORBITOX_DELETION_CERT_KEY_ACTIVE')!;
    const grantKeys = mockStorage.get('orbitox/staging/ORBITOX_GRANT_SIGNING_KEYS')!;
    assert.equal(initialActiveKid, 'k1');

    const origEnv = { ...process.env };
    try {
      Reflect.set(process.env, 'NODE_ENV', 'production');
      process.env.ORBITOX_DELETION_CERT_KEYS = initialCertKeys;
      process.env.ORBITOX_DELETION_CERT_KEY_ACTIVE = initialActiveKid;
      process.env.ORBITOX_GRANT_SIGNING_KEYS = grantKeys;

      // 2. Sign deletion certificate 1 with active key k1 through real loader
      const cert1 = buildSignedDeletionCertificate({
        organizationId: 'org_b07_cert_1',
        organizationSlug: 'b07-org-1',
        requestId: 'del_req_1',
        requestedAt: new Date('2026-10-01T00:00:00.000Z'),
        scheduledFor: new Date('2026-10-31T00:00:00.000Z'),
        completedAt: new Date('2026-10-31T00:05:00.000Z'),
        plugins: [{ pluginId: '@orbitox/restaurant', tenantId: 't1', rowsDeletedByTable: { Tenant: 1 } }],
        platformRowsDeletedByTable: { PlatformOrganization: 1 },
        objectStoreObjectsDeleted: 1,
      });
      assert.equal(cert1.keyId, 'k1');
      assert.equal(cert1.payload.purpose, 'orbitox.deletion_certificate.v1');

      // 3. Add key k2 via secret generator and activate k2
      runSecretGenerator({ addKey: 'ORBITOX_DELETION_CERT_KEYS', awsCliRunner: mockRunner });
      runSecretGenerator({ activate: 'ORBITOX_DELETION_CERT_KEYS', kid: 'k2', awsCliRunner: mockRunner });
      assert.equal(mockStorage.get('orbitox/staging/ORBITOX_DELETION_CERT_KEY_ACTIVE'), 'k2');

      // Retire privateKey on k1 while keeping its publicKey in ORBITOX_DELETION_CERT_KEYS
      const ringParsed = JSON.parse(mockStorage.get('orbitox/staging/ORBITOX_DELETION_CERT_KEYS')!) as Record<
        string,
        { privateKey?: string; publicKey: string }
      >;
      assert.ok(ringParsed.k1?.publicKey && ringParsed.k2?.privateKey && ringParsed.k2?.publicKey);
      ringParsed.k1 = { publicKey: ringParsed.k1.publicKey };

      process.env.ORBITOX_DELETION_CERT_KEYS = JSON.stringify(ringParsed);
      process.env.ORBITOX_DELETION_CERT_KEY_ACTIVE = 'k2';

      // 4. Sign certificate 2 with k2 while k1 has only retired publicKey in ring
      const cert2 = buildSignedDeletionCertificate({
        organizationId: 'org_b07_cert_2',
        organizationSlug: 'b07-org-2',
        requestId: 'del_req_2',
        requestedAt: new Date('2026-11-01T00:00:00.000Z'),
        scheduledFor: new Date('2026-12-01T00:00:00.000Z'),
        completedAt: new Date('2026-12-01T00:05:00.000Z'),
        plugins: [],
        platformRowsDeletedByTable: { PlatformOrganization: 1 },
        objectStoreObjectsDeleted: 0,
      });
      assert.equal(cert2.keyId, 'k2');
      assert.notEqual(cert2.spkiFingerprint, cert1.spkiFingerprint);

      // 5. Verify both historical k1 certificate and new k2 certificate through real key extractor & verifier
      const trustedPublicKeys = extractDeletionCertPublicKeys(process.env.ORBITOX_DELETION_CERT_KEYS);
      assert.equal(verifyDeletionCertificate(cert1, trustedPublicKeys).valid, true);
      assert.equal(verifyDeletionCertificate(cert2, trustedPublicKeys).valid, true);
    } finally {
      process.env = origEnv;
    }
  });

  it('B0-7: Real-loader round-trip through S3ObjectStore client encryption decrypts k1 export after --add-key + --activate k2', async () => {
    const mockStorage = new Map<string, string>();
    const s3Objects = new Map<string, Buffer>();
    const s3Meta = new Map<string, Record<string, string>>();
    const mockRunner = (args: string[], stdin?: string) => {
      const subcmd = args[1];
      const idIdx = args.indexOf('--secret-id');
      const secretId = idIdx !== -1 ? args[idIdx + 1] : undefined;
      if (!secretId) return { stdout: '', status: 1 };
      if (subcmd === 'get-secret-value') {
        if (mockStorage.has(secretId)) {
          return { stdout: JSON.stringify({ SecretString: mockStorage.get(secretId) }), status: 0 };
        }
        return { stdout: '', status: 1 };
      }
      if (subcmd === 'put-secret-value') {
        if (stdin) mockStorage.set(secretId, stdin);
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }
      return { stdout: '', status: 0 };
    };

    runSecretGenerator({ dryRun: false, awsCliRunner: mockRunner });
    const mockExecutor: S3CommandExecutor = {
      async putObject(input) {
        s3Objects.set(input.Key, input.Body);
        s3Meta.set(input.Key, input.Metadata || {});
      },
      async getObject(input) {
        return s3Objects.get(input.Key) ?? null;
      },
      async deleteObject(input) {
        s3Objects.delete(input.Key);
      },
      async listKeys(input) {
        return Array.from(s3Objects.keys()).filter((k) => k.startsWith(input.Prefix));
      },
      async getPresignedGetUrl(input) {
        return `https://spaces.example.invalid/${input.Bucket}/${input.Key}`;
      },
    };

    const sampleZip = buildZipArchive([{ path: 'hello.txt', content: Buffer.from('phi-safe-export', 'utf8') }]);

    // 1. Encrypt under initial k1 ring produced by generator
    const ring1 = loadExportEncryptionKeyRingFromEnv({
      ORBITOX_EXPORT_ENCRYPTION_KEYS: mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEYS'),
      ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE'),
    });
    const store1 = new S3ObjectStore({
      bucket: 'orbitox-vps-exports',
      region: 'ap-south-1',
      endpoint: 'https://blr1.digitaloceanspaces.com',
      encryption: 'client',
      exportKeys: ring1,
      executor: mockExecutor,
    });
    await store1.put('exports/org_1/old.zip', sampleZip);
    assert.equal(s3Meta.get('exports/org_1/old.zip')?.['orbitox-encryption-kid'], 'k1');

    // 2. Rotate via --add-key + --activate k2
    runSecretGenerator({ addKey: 'ORBITOX_EXPORT_ENCRYPTION_KEYS', awsCliRunner: mockRunner });
    runSecretGenerator({ activate: 'ORBITOX_EXPORT_ENCRYPTION_KEYS', kid: 'k2', awsCliRunner: mockRunner });

    const ring2 = loadExportEncryptionKeyRingFromEnv({
      ORBITOX_EXPORT_ENCRYPTION_KEYS: mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEYS'),
      ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE'),
    });
    const store2 = new S3ObjectStore({
      bucket: 'orbitox-vps-exports',
      region: 'ap-south-1',
      endpoint: 'https://blr1.digitaloceanspaces.com',
      encryption: 'client',
      exportKeys: ring2,
      executor: mockExecutor,
    });
    const restored = await store2.get('exports/org_1/old.zip');
    assert.ok(restored);
    assert.equal(readZipArchive(restored).get('hello.txt')?.toString('utf8'), 'phi-safe-export');

    // 3. Also verify createObjectStoreFromEnv production loader with generated secrets succeeds in client mode
    const loadedStore = createObjectStoreFromEnv({
      NODE_ENV: 'production',
      ORBITOX_OBJECT_STORE_DRIVER: 's3',
      ORBITOX_OBJECT_STORE_REGION: 'ap-south-1',
      S3_BUCKET_NAME: 'orbitox-vps-exports',
      ORBITOX_OBJECT_STORE_ENCRYPTION: 'client',
      ORBITOX_EXPORT_ENCRYPTION_KEYS: mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEYS'),
      ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE: mockStorage.get('orbitox/staging/ORBITOX_EXPORT_ENCRYPTION_KEY_ACTIVE'),
    } as unknown as NodeJS.ProcessEnv);
    assert.equal(loadedStore.driver, 's3');
  });
});

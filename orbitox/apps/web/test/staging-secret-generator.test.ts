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
      } else {
        assert.ok(val.length >= 32, `Secret "${name}" length must be at least 32 (got ${val.length})`);
      }
    }
  });

  it('idempotency: skips already-set secrets without --rotate, and updates with --rotate', () => {
    const mockStorage = new Map<string, string>();
    mockStorage.set('orbitox/staging/SESSION_SECRET', 'existing_value_32_characters_minimum');

    const mockRunner = (args: string[]) => {
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
        const strIdx = args.indexOf('--secret-string');
        const value = strIdx !== -1 ? args[strIdx + 1] : '';
        if (value) {
          mockStorage.set(secretId, value);
        }
        return { stdout: JSON.stringify({ VersionId: 'v1' }), status: 0 };
      }

      return { stdout: '', status: 0 };
    };

    // Run without rotate: SESSION_SECRET should be skipped
    const run1 = runSecretGenerator({
      dryRun: false,
      rotate: false,
      awsCliRunner: mockRunner,
    });

    const sessionRes1 = run1.find((r) => r.name === 'SESSION_SECRET');
    assert.equal(sessionRes1?.action, 'skipped');

    // Run with rotate: SESSION_SECRET should be rotated
    const run2 = runSecretGenerator({
      dryRun: false,
      rotate: true,
      awsCliRunner: mockRunner,
    });

    const sessionRes2 = run2.find((r) => r.name === 'SESSION_SECRET');
    assert.equal(sessionRes2?.action, 'rotated');
  });
});

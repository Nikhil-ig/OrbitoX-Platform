/**
 * 🪐 OrbitoX Phase 5: @orbitox-io/cli Test Suite
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { execSync } from 'child_process';
import * as path from 'path';
import { maskApiKey, resolveApiKey, resolveUrl } from '../src/lib/config';

const cliBin = path.resolve(__dirname, '../dist/bin.js');

describe('🪐 Phase 5: @orbitox-io/cli Suite', () => {
  it('1. CLI Help lists all lifecycle, tenant, and operation commands', () => {
    const output = execSync(`node "${cliBin}" --help`, { encoding: 'utf8' });

    assert.ok(output.includes('OrbitoX Platform CLI'), 'Must output CLI header');
    assert.ok(output.includes('login [options]'), 'Must document login command');
    assert.ok(output.includes('tenants create [options]'), 'Must document tenants create');
    assert.ok(output.includes('tenants suspend <id>'), 'Must document tenants suspend');
    assert.ok(output.includes('tenants resume <id>'), 'Must document tenants resume');
    assert.ok(output.includes('operations get <id>'), 'Must document operations get');
  });

  it('2. Secret Masking: ensures secrets are never printed back in full', () => {
    const rawKey = 'orb_live_abcdef0123456789abcdef01';
    const masked = maskApiKey(rawKey);

    assert.strictEqual(masked, 'orb_live••••••••ef01');
    assert.ok(!masked.includes('abcdef0123456789'), 'Raw key body must be masked');
    assert.ok(masked.includes('••••••••'), 'Mask characters must be present');
  });

  it('3. Catalogue enforcement: rejects un-installable plugins like crm', () => {
    assert.throws(
      () => {
        execSync(
          `node "${cliBin}" tenants create --plugin=crm --key=orb_live_test_key`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
      },
      (err: any) => {
        const stderr = err.stderr || err.stdout || '';
        assert.ok(
          stderr.includes('Plugin "crm" is not installable while disabled'),
          `Must refuse CRM installation with clear reason, got: ${stderr}`
        );
        return true;
      }
    );
  });

  it('4. Config resolution: prioritizes CLI flags over environment variables', () => {
    process.env.ORBITOX_API_KEY = 'orb_live_env_key_1111';
    process.env.ORBITOX_URL = 'http://127.0.0.1:9999';

    const explicitKey = resolveApiKey('orb_live_explicit_key_2222');
    assert.strictEqual(explicitKey, 'orb_live_explicit_key_2222');

    const envKey = resolveApiKey();
    assert.strictEqual(envKey, 'orb_live_env_key_1111');

    const explicitUrl = resolveUrl('http://127.0.0.1:4444');
    assert.strictEqual(explicitUrl, 'http://127.0.0.1:4444');

    const envUrl = resolveUrl();
    assert.strictEqual(envUrl, 'http://127.0.0.1:9999');

    delete process.env.ORBITOX_API_KEY;
    delete process.env.ORBITOX_URL;
  });
});

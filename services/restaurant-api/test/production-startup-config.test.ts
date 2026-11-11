import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertRestaurantOsProductionConfig } from '../packages/domain/production-config';
import {
  getStaffAuthSecret,
  resolveClientIp,
  resolveAllowedOrigin,
  getRegisteredStationSecrets,
  isIpInCidr,
} from '../packages/domain/security';
import { buildGSTInvoice } from '../packages/domain/invoicing';
import { CustomDomainService } from '../packages/domain/domains';
import { TenantProvisioningService } from '../packages/domain/provisioning';
import { resolveTenantFromHost } from '../packages/domain/tenancy';

const VALID_PROD_ENV: Record<string, string> = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://restaurantos_app:secret@db.internal:5432/restaurant_os_staging?sslmode=require',
  STAFF_AUTH_SECRET: 'production_strong_staff_secret_32_characters_minimum_hex_key',
  RESTAURANTOS_BASE_DOMAIN: 'staging.orbitox.io',
  RESTAURANTOS_CNAME_TARGET: 'cname.staging.orbitox.io',
  TRUSTED_PROXIES: '10.0.0.0/16',
  RESTAURANTOS_ALLOWED_ORIGINS: 'https://staging.orbitox.io,https://*.staging.orbitox.io',
  RESTAURANT_STATION_SECRETS: JSON.stringify({
    stn_sec_1234567890abcdef1234567890abcdef: { station: 'EXPO', branchId: 'staging-main', isPrivileged: true },
  }),
  ORBITOX_BRIDGE_KEYS: JSON.stringify({
    activeKeyId: 'k1',
    keys: { k1: 'bridge_secret_32_chars_minimum_length_hex_string' },
  }),
  ORBITOX_GRANT_PUBLIC_KEYS: JSON.stringify({
    k1: {
      publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA...spki...\n-----END PUBLIC KEY-----',
    },
  }),
};

describe('Phase 6F B0-8 / B0-9: RestaurantOS Production Startup Configuration & Security Invariants', () => {
  it('passes startup validation with complete valid production configuration', () => {
    assert.doesNotThrow(() => {
      assertRestaurantOsProductionConfig(VALID_PROD_ENV);
    });
  });

  it('B0-8: refuses startup when STAFF_AUTH_SECRET is missing or weak, and ignores legacy fallbacks in production', () => {
    // 1. Missing entirely
    const envMissing = { ...VALID_PROD_ENV };
    delete envMissing.STAFF_AUTH_SECRET;
    assert.throws(
      () => assertRestaurantOsProductionConfig(envMissing),
      /STAFF_AUTH_SECRET must be configured with at least 32 cryptographically strong characters/
    );

    // 2. Too short (< 32 chars)
    const envShort = { ...VALID_PROD_ENV, STAFF_AUTH_SECRET: 'short_key_under_32' };
    assert.throws(
      () => assertRestaurantOsProductionConfig(envShort),
      /STAFF_AUTH_SECRET must be configured with at least 32 cryptographically strong characters/
    );

    // 3. Test or default key
    const envTest = {
      ...VALID_PROD_ENV,
      STAFF_AUTH_SECRET: 'orbitox_hospitality_staff_vault_secret_key_v2_2026_test_only_0123456789abcdef',
    };
    assert.throws(
      () => assertRestaurantOsProductionConfig(envTest),
      /STAFF_AUTH_SECRET must be configured with at least 32 cryptographically strong characters/
    );

    // 4. In domain getStaffAuthSecret: legacy aliases (STAFF_JWT_SECRET, JWT_SECRET) are NOT accepted in production
    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.STAFF_AUTH_SECRET;
      process.env.STAFF_JWT_SECRET = 'a_legacy_jwt_secret_that_has_over_32_characters_1234567890';
      process.env.JWT_SECRET = 'another_legacy_jwt_secret_that_has_over_32_characters_1234567890';

      assert.throws(
        () => getStaffAuthSecret(),
        /STAFF_AUTH_SECRET must be configured with at least 32 cryptographically strong characters in production mode/
      );
    } finally {
      process.env = origEnv;
    }
  });

  it('B0-9: refuses startup and domain operations when RESTAURANTOS_BASE_DOMAIN is missing in production', async () => {
    const envNoBaseDomain = { ...VALID_PROD_ENV };
    delete envNoBaseDomain.RESTAURANTOS_BASE_DOMAIN;

    assert.throws(
      () => assertRestaurantOsProductionConfig(envNoBaseDomain),
      /RESTAURANTOS_BASE_DOMAIN is not set/
    );

    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.RESTAURANTOS_BASE_DOMAIN;

      // tenancy resolution throws
      await assert.rejects(
        async () => resolveTenantFromHost('tenant1.staging.orbitox.io'),
        /RESTAURANTOS_BASE_DOMAIN is required in production mode/
      );

      // provisioning service constructor throws
      assert.throws(
        () => new TenantProvisioningService({} as any),
        /RESTAURANTOS_BASE_DOMAIN is required in production mode/
      );
    } finally {
      process.env = origEnv;
    }
  });

  it('B0-9: refuses startup and domain manager when RESTAURANTOS_CNAME_TARGET is missing in production', () => {
    const envNoCname = { ...VALID_PROD_ENV };
    delete envNoCname.RESTAURANTOS_CNAME_TARGET;

    assert.throws(
      () => assertRestaurantOsProductionConfig(envNoCname),
      /RESTAURANTOS_CNAME_TARGET is not set/
    );

    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.RESTAURANTOS_CNAME_TARGET;

      assert.throws(
        () => new CustomDomainService({} as any),
        /RESTAURANTOS_CNAME_TARGET is required in production mode/
      );
    } finally {
      process.env = origEnv;
    }
  });

  it('B0-9: requires TRUSTED_PROXIES in production and correctly matches ALB VPC CIDR 10.0.0.0/16', () => {
    const envNoProxy = { ...VALID_PROD_ENV };
    delete envNoProxy.TRUSTED_PROXIES;

    assert.throws(
      () => assertRestaurantOsProductionConfig(envNoProxy),
      /TRUSTED_PROXIES is not set/
    );

    // Test CIDR matching logic
    assert.equal(isIpInCidr('10.0.1.25', '10.0.0.0/16'), true);
    assert.equal(isIpInCidr('10.0.254.1', '10.0.0.0/16'), true);
    assert.equal(isIpInCidr('192.168.1.1', '10.0.0.0/16'), false);
    assert.equal(isIpInCidr('172.31.0.5', '10.0.0.0/16'), false);

    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.TRUSTED_PROXIES;

      const mockReq = {
        socket: { remoteAddress: '10.0.1.100' },
        headers: { 'x-forwarded-for': '203.0.113.195' },
      } as any;

      assert.throws(
        () => resolveClientIp(mockReq),
        /TRUSTED_PROXIES must be configured in production mode/
      );

      // With TRUSTED_PROXIES set to 10.0.0.0/16, x-forwarded-for from ALB is accepted
      process.env.TRUSTED_PROXIES = '10.0.0.0/16';
      assert.equal(resolveClientIp(mockReq), '203.0.113.195');

      // Request from untrusted external IP ignores x-forwarded-for spoofing
      const untrustedReq = {
        socket: { remoteAddress: '198.51.100.5' },
        headers: { 'x-forwarded-for': '1.1.1.1' },
      } as any;
      assert.equal(resolveClientIp(untrustedReq), '198.51.100.5');
    } finally {
      process.env = origEnv;
    }
  });

  it('B0-9: requires RESTAURANTOS_ALLOWED_ORIGINS in production and matches wildcard origins', () => {
    const envNoOrigins = { ...VALID_PROD_ENV };
    delete envNoOrigins.RESTAURANTOS_ALLOWED_ORIGINS;

    assert.throws(
      () => assertRestaurantOsProductionConfig(envNoOrigins),
      /RESTAURANTOS_ALLOWED_ORIGINS is not set/
    );

    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.RESTAURANTOS_ALLOWED_ORIGINS;

      const mockReq = { headers: { origin: 'https://staging.orbitox.io' } } as any;
      assert.throws(
        () => resolveAllowedOrigin(mockReq),
        /RESTAURANTOS_ALLOWED_ORIGINS is required in production mode/
      );

      // When configured with wildcard staging origin
      process.env.RESTAURANTOS_ALLOWED_ORIGINS = 'https://staging.orbitox.io,https://*.staging.orbitox.io';
      assert.equal(
        resolveAllowedOrigin({ headers: { origin: 'https://staging.orbitox.io' } } as any),
        'https://staging.orbitox.io'
      );
      assert.equal(
        resolveAllowedOrigin({ headers: { origin: 'https://tenant-a.staging.orbitox.io' } } as any),
        'https://tenant-a.staging.orbitox.io'
      );
      assert.equal(
        resolveAllowedOrigin({ headers: { origin: 'https://malicious-site.example.com' } } as any),
        null
      );
    } finally {
      process.env = origEnv;
    }
  });

  it('B0-9: requires RESTAURANT_STATION_SECRETS in production and refuses unconfigured hardware stations', () => {
    const envNoStations = { ...VALID_PROD_ENV };
    delete envNoStations.RESTAURANT_STATION_SECRETS;

    assert.throws(
      () => assertRestaurantOsProductionConfig(envNoStations),
      /RESTAURANT_STATION_SECRETS is not set/
    );

    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.RESTAURANT_STATION_SECRETS;
      process.env.RELOAD_STATION_SECRETS = 'true';

      assert.throws(
        () => getRegisteredStationSecrets(),
        /RESTAURANT_STATION_SECRETS is required in production mode/
      );

      // Configured station secrets load correctly
      process.env.RESTAURANT_STATION_SECRETS = JSON.stringify({
        stn_sec_expo_123: { station: 'EXPO', branchId: 'staging-main', isPrivileged: true },
      });
      const loaded = getRegisteredStationSecrets();
      assert.ok(loaded['stn_sec_expo_123']);
      assert.equal(loaded['stn_sec_expo_123'].station, 'EXPO');
    } finally {
      process.env = origEnv;
    }
  });

  it('B0-11: does not require RESTAURANT_GSTIN in production environment variables (per-tenant data isolation)', () => {
    // RESTAURANT_GSTIN is per-tenant data in database brand settings, not container environment
    const prodEnv = { ...VALID_PROD_ENV };
    delete (prodEnv as any).RESTAURANT_GSTIN;
    assert.doesNotThrow(() => {
      assertRestaurantOsProductionConfig(prodEnv);
    });
  });
});

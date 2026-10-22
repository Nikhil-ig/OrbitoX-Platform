import { PlatformKeyEngine } from './platform-key-engine';
import { hasCapability, CAPABILITY_PRESETS } from './capabilities';

describe('PlatformKeyEngine (CSPRNG, HMAC-SHA-256 Verifier & Risk Engine)', () => {
  const TEST_PEPPER = 'test-server-pepper-orbitox-2026';

  describe('Key Generation & Cryptographic Verifiers', () => {
    it('should generate high-entropy CSPRNG keys with correct environment prefixes', () => {
      const prodKey = PlatformKeyEngine.generateKey('production', TEST_PEPPER);
      expect(prodKey.rawSecret.startsWith('orb_live_')).toBe(true);
      expect(prodKey.keyPrefix).toBe('orb_live_');
      expect(prodKey.rawSecret.length).toBeGreaterThan(40);
      expect(prodKey.maskedDisplay.startsWith('orb_live_')).toBe(true);
      expect(prodKey.maskedDisplay.includes('••••••••')).toBe(true);

      const stageKey = PlatformKeyEngine.generateKey('staging', TEST_PEPPER);
      expect(stageKey.rawSecret.startsWith('orb_stage_')).toBe(true);

      const devKey = PlatformKeyEngine.generateKey('development', TEST_PEPPER);
      expect(devKey.rawSecret.startsWith('orb_test_')).toBe(true);
    });

    it('should produce valid display fingerprints and authentication verifiers', () => {
      const key = PlatformKeyEngine.generateKey('production', TEST_PEPPER);

      expect(key.secretFingerprint.startsWith('SHA256: ')).toBe(true);
      expect(typeof key.authVerifier).toBe('string');
      expect(key.authVerifier.length).toBe(64); // 256-bit hex
    });

    it('should verify raw secrets against stored HMAC verifiers using constant-time comparison', () => {
      const key = PlatformKeyEngine.generateKey('production', TEST_PEPPER);

      // Positive match
      const isValid = PlatformKeyEngine.verifySecret(key.rawSecret, key.authVerifier, TEST_PEPPER);
      expect(isValid).toBe(true);

      // Tampered secret must fail
      const tamperedSecret = key.rawSecret + 'x';
      const isTamperedValid = PlatformKeyEngine.verifySecret(tamperedSecret, key.authVerifier, TEST_PEPPER);
      expect(isTamperedValid).toBe(false);

      // Wrong server pepper must fail
      const isWrongPepperValid = PlatformKeyEngine.verifySecret(key.rawSecret, key.authVerifier, 'wrong-pepper-value');
      expect(isWrongPepperValid).toBe(false);
    });
  });

  describe('Deterministic Risk Engine', () => {
    it('should evaluate low-risk keys accurately', () => {
      const evaluation = PlatformKeyEngine.calculateRiskScore({
        isProduction: false,
        capabilities: ['restaurant.orders.read'],
        expiresAt: new Date(Date.now() + 1000 * 3600 * 24 * 30).toISOString(),
        issuedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        ipAllowlist: ['192.168.1.1/32'],
      });

      expect(evaluation.score).toBeLessThan(35);
      expect(evaluation.level).toBe('LOW');
      expect(evaluation.factors.length).toBe(0);
    });

    it('should evaluate critical-risk keys accurately', () => {
      const evaluation = PlatformKeyEngine.calculateRiskScore({
        isProduction: true, // +15
        capabilities: ['*'], // +35 (wildcard)
        expiresAt: null, // +20 (no expiration)
        issuedAt: new Date(Date.now() - 1000 * 3600 * 24 * 200).toISOString(), // +15 (>180d old)
        lastUsedAt: new Date(Date.now() - 1000 * 3600 * 24 * 100).toISOString(), // +20 (stale >90d)
        ipAllowlist: [], // +10 (unconstrained)
      });

      expect(evaluation.score).toBeGreaterThanOrEqual(80);
      expect(evaluation.level).toBe('CRITICAL');
      expect(evaluation.factors.some((f) => f.code === 'WILDCARD_SCOPE')).toBe(true);
      expect(evaluation.factors.some((f) => f.code === 'PRODUCTION_ACCESS')).toBe(true);
      expect(evaluation.factors.some((f) => f.code === 'NO_EXPIRATION')).toBe(true);
      expect(evaluation.factors.some((f) => f.code === 'STALE_KEY')).toBe(true);
    });
  });

  describe('Typed Capability Matching', () => {
    it('should match exact capabilities', () => {
      expect(hasCapability(['restaurant.orders.read'], 'restaurant.orders.read')).toBe(true);
      expect(hasCapability(['restaurant.orders.read'], 'restaurant.orders.create')).toBe(false);
    });

    it('should match package wildcards without cross-package leakage', () => {
      expect(hasCapability(['restaurant.*'], 'restaurant.orders.read')).toBe(true);
      expect(hasCapability(['restaurant.*'], 'restaurant.tables.reserve')).toBe(true);
      // Cross-package isolation
      expect(hasCapability(['restaurant.*'], 'hms.patients.read')).toBe(false);
      expect(hasCapability(['restaurant.*'], 'commerce.checkout.initiate')).toBe(false);
    });

    it('should match root wildcard (*)', () => {
      expect(hasCapability(['*'], 'hms.triage.execute')).toBe(true);
      expect(hasCapability(['*'], 'platform.keys.revoke')).toBe(true);
    });

    it('should have well-defined presets', () => {
      const preset = CAPABILITY_PRESETS.restaurant_floor_operator;
      expect(preset).toBeDefined();
      expect(hasCapability(preset.capabilities, 'restaurant.orders.create')).toBe(true);
      expect(hasCapability(preset.capabilities, 'pos.drawer.open')).toBe(false);
    });
  });
});

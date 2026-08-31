import { CryptoSigner } from './crypto-signer';
import { IntegrityVerifier } from './integrity-verifier';
import { LicenseEnforcer } from './license-enforcer';
import { SandboxGuard } from './sandbox-guard';

describe('Security & IP Protection Engine', () => {
  let edKeyPair: { publicKey: string; privateKey: string };
  let rsaKeyPair: { publicKey: string; privateKey: string };

  beforeAll(() => {
    edKeyPair = CryptoSigner.generateSigningKeyPair('ed25519');
    rsaKeyPair = CryptoSigner.generateSigningKeyPair('rsa');
  });

  describe('CryptoSigner & IntegrityVerifier', () => {
    it('should generate valid Ed25519 keypair and sign/verify payload', () => {
      const payload = {
        pluginId: 'hospital-os',
        version: '1.2.0',
        permissions: ['hospital.patients.read'],
      };

      const signature = CryptoSigner.signPayload(payload, edKeyPair.privateKey);
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(10);

      const isValid = IntegrityVerifier.verifyPayloadSignature(
        payload,
        signature,
        edKeyPair.publicKey
      );
      expect(isValid).toBe(true);

      // Tampered payload must fail verification
      const tamperedPayload = { ...payload, version: '1.2.1-hacked' };
      const isTamperedValid = IntegrityVerifier.verifyPayloadSignature(
        tamperedPayload,
        signature,
        edKeyPair.publicKey
      );
      expect(isTamperedValid).toBe(false);
    });

    it('should generate valid RSA keypair and sign/verify payload', () => {
      const payload = { test: 'secure-runtime' };
      const signature = CryptoSigner.signPayload(payload, rsaKeyPair.privateKey);
      const isValid = IntegrityVerifier.verifyPayloadSignature(payload, signature, rsaKeyPair.publicKey);
      expect(isValid).toBe(true);
    });
  });

  describe('LicenseEnforcer', () => {
    it('should issue and verify enterprise license token', () => {
      const licenseToken = LicenseEnforcer.issueLicenseToken(
        {
          licenseId: 'lic_enterprise_123',
          issuedTo: 'Apollo Hospitals',
          allowedDomain: 'apollo.orbito.com',
          allowedTenants: 100,
          features: ['ai_diagnostics', 'telehealth'],
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
          tier: 'enterprise',
        },
        rsaKeyPair.privateKey
      );

      const result = LicenseEnforcer.verifyLicenseToken(licenseToken, rsaKeyPair.publicKey, {
        currentDomain: 'apollo.orbito.com',
        activeTenantsCount: 45,
        requiredFeature: 'ai_diagnostics',
      });

      expect(result.valid).toBe(true);
      expect(result.license?.issuedTo).toBe('Apollo Hospitals');
      expect(result.errors.length).toBe(0);
    });

    it('should reject expired licenses', () => {
      const expiredToken = LicenseEnforcer.issueLicenseToken(
        {
          licenseId: 'lic_expired',
          issuedTo: 'Test Corp',
          issuedAt: new Date(Date.now() - 100000).toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
        rsaKeyPair.privateKey
      );

      const result = LicenseEnforcer.verifyLicenseToken(expiredToken, rsaKeyPair.publicKey);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('expired'))).toBe(true);
    });

    it('should reject unauthorized domains', () => {
      const token = LicenseEnforcer.issueLicenseToken(
        {
          licenseId: 'lic_domain_locked',
          issuedTo: 'Test Corp',
          allowedDomain: 'secure.hospital.com',
          issuedAt: new Date().toISOString(),
        },
        rsaKeyPair.privateKey
      );

      const result = LicenseEnforcer.verifyLicenseToken(token, rsaKeyPair.publicKey, {
        currentDomain: 'hacker.pirated-domain.com',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Domain lock violation'))).toBe(true);
    });
  });

  describe('SandboxGuard', () => {
    it('should freeze facades preventing modification', () => {
      const facade = {
        security: { authorize: () => true },
        db: { query: () => [] },
      };

      SandboxGuard.freezeAllFacades(facade);
      expect(Object.isFrozen(facade)).toBe(true);
      expect(Object.isFrozen(facade.security)).toBe(true);
      expect(Object.isFrozen(facade.db)).toBe(true);

      expect(() => {
        (facade as any).newProp = 'hacked';
      }).toThrow();
    });

    it('should restrict unapproved access in SandboxedProxy', () => {
      const service = {
        publicMethod: () => 'hello',
        _privateSecret: 'db-password-123',
        adminMethod: () => 'sensitive-action',
      };

      const proxy = SandboxGuard.createSandboxedProxy(service, ['publicMethod']);
      expect(proxy.publicMethod()).toBe('hello');

      expect(() => {
        (proxy as any)._privateSecret;
      }).toThrow('Sandbox Security Alert');

      expect(() => {
        (proxy as any).adminMethod();
      }).toThrow('Sandbox Security Alert');
    });
  });
});

import { createOrbitoX } from './client';
import { CryptoSigner } from './security/crypto-signer';
import { LicenseEnforcer } from './security/license-enforcer';

describe('1-Line createOrbitoX() SDK Initializer', () => {
  let keypair: { publicKey: string; privateKey: string };
  let validLicense: string;

  beforeAll(() => {
    keypair = CryptoSigner.generateSigningKeyPair('rsa');
    validLicense = LicenseEnforcer.issueLicenseToken(
      {
        licenseId: 'lic_test_dx_01',
        issuedTo: 'Acme Health Corp',
        allowedDomain: 'acme.orbito.com',
        allowedTenants: 50,
        features: ['ai_diagnostics', 'telehealth'],
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        tier: 'enterprise',
      },
      keypair.privateKey
    );
  });

  it('should initialize cleanly in 1 line with zero config', async () => {
    const app = await createOrbitoX();
    expect(app).toBeDefined();
    expect(app.security.isVerified).toBe(false);
    expect(app.security.allowedFeatures).toContain('*');
  });

  it('should automatically verify RSA license and enforce domain bindings', async () => {
    const app = await createOrbitoX({
      license: validLicense,
      publicKey: keypair.publicKey,
      domain: 'acme.orbito.com',
      strictSecurity: true,
    });

    expect(app.security.isVerified).toBe(true);
    expect(app.security.license?.issuedTo).toBe('Acme Health Corp');
    expect(app.hasFeature('ai_diagnostics')).toBe(true);
    expect(app.hasFeature('unlicensed_feature')).toBe(false);
  });

  it('should reject pirated domain in strict security mode', async () => {
    await expect(
      createOrbitoX({
        license: validLicense,
        publicKey: keypair.publicKey,
        domain: 'hacker-pirated-site.com',
        strictSecurity: true,
      })
    ).rejects.toThrow('Domain lock violation');
  });

  it('should mount plugins and allow direct property access (app.crm)', async () => {
    const mockCrmPlugin = {
      id: 'crm',
      createLead: (data: any) => ({ id: 'lead_123', ...data }),
    };

    const app = await createOrbitoX({
      plugins: [mockCrmPlugin],
    });

    expect(app.crm).toBeDefined();
    const result = app.crm.createLead({ name: 'Dr. John' });
    expect(result.id).toBe('lead_123');
    expect(result.name).toBe('Dr. John');
  });
});

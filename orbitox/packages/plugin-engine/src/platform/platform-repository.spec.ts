import { PlatformRepository } from './platform-repository';
import { PlatformKeyEngine } from '../security/platform-key-engine';

describe('PlatformRepository (Normalized Domain Access & Cryptographic Binding)', () => {
  beforeAll(() => {
    PlatformRepository.initialize();
  });

  describe('Organization & Project Hierarchy', () => {
    it('should seed default organizations and projects', () => {
      const orgs = PlatformRepository.listOrganizations();
      expect(orgs.length).toBeGreaterThanOrEqual(3);

      const projects = PlatformRepository.listProjects();
      expect(projects.length).toBeGreaterThanOrEqual(3);
      expect(projects.some((p) => p.slug === 'omnideliver')).toBe(true);
      expect(projects.some((p) => p.slug === 'mednet-health')).toBe(true);
    });

    it('should provision a project with subordinate environments', () => {
      const org = PlatformRepository.listOrganizations()[0]!;
      const created = PlatformRepository.createProject({
        name: 'Nexus HyperScale Retail',
        slug: 'nexus-retail',
        organizationId: org.id,
        businessModel: 'FRANCHISE_RETAIL',
        planTier: 'enterprise',
        technicalLead: 'Elena Rostova',
        contactEmail: 'dev@nexus.io',
        initialPackages: ['@orbitox/pos', '@orbitox/inventory'],
      });

      expect(created.project.id.startsWith('proj_nexus-retail_')).toBe(true);
      expect(created.environments.length).toBe(3);

      const envSlugs = created.environments.map((e) => e.slug);
      expect(envSlugs).toContain('production');
      expect(envSlugs).toContain('staging');
      expect(envSlugs).toContain('development');

      // Verify package installations in production
      const prodEnv = created.environments.find((e) => e.slug === 'production')!;
      const installations = PlatformRepository.listInstallations(prodEnv.id);
      expect(installations.length).toBe(2);
      expect(installations.some((i) => i.packageId === '@orbitox/pos')).toBe(true);
    });
  });

  describe('Machine API Keys & Lifecycle', () => {
    it('should create a cryptographically secure key without persisting plaintext secret', () => {
      const project = PlatformRepository.listProjects()[0]!;
      const env = PlatformRepository.listEnvironments(project.id).find((e) => e.isProduction)!;

      const { keyRecord, rawSecret } = PlatformRepository.createApiKey({
        name: 'Automated Test Key',
        environmentId: env.id,
        projectId: project.id,
        capabilities: ['restaurant.orders.read', 'restaurant.orders.create'],
        createdBy: 'test-runner@orbitox.io',
      });

      // Raw secret is emitted once
      expect(rawSecret.startsWith('orb_live_')).toBe(true);
      // Key record contains verifier and fingerprint
      expect(keyRecord.authVerifier).toBeDefined();
      expect(keyRecord.authVerifier.length).toBe(64);
      expect(keyRecord.secretFingerprint.startsWith('SHA256: ')).toBe(true);
      expect(keyRecord.maskedDisplay.startsWith('orb_live_')).toBe(true);

      // Verify that findKeyByRawSecret finds the key via constant-time verifier
      const found = PlatformRepository.findKeyByRawSecret(rawSecret);
      expect(found).toBeDefined();
      expect(found?.id).toBe(keyRecord.id);

      // Verify risk score is calculated
      expect(keyRecord.riskScore).toBeDefined();
      expect(typeof keyRecord.riskScore).toBe('number');
    });

    it('should perform guided key rotation safely', () => {
      const project = PlatformRepository.listProjects()[0]!;
      const env = PlatformRepository.listEnvironments(project.id)[0]!;

      const { keyRecord: oldKey } = PlatformRepository.createApiKey({
        name: 'Key To Rotate',
        environmentId: env.id,
        projectId: project.id,
        capabilities: ['pos.checkout.process'],
        createdBy: 'admin@orbitox.io',
      });

      const rotated = PlatformRepository.rotateApiKey(oldKey.keyId, {
        graceWindowDays: 7,
        operatorEmail: 'secops@orbitox.io',
      });

      expect(rotated).toBeDefined();
      expect(rotated?.replacementKey.capabilities).toEqual(['pos.checkout.process']);
      expect(rotated?.replacementRawSecret.startsWith('orb_')).toBe(true);

      // Verify old key status has revokeReason attached
      const reloadedOldKey = PlatformRepository.getApiKey(oldKey.keyId)!;
      expect(reloadedOldKey.revokeReason).toContain('Rotated in favor of replacement');
    });
  });

  describe('Credential Vault & Envelope Encryption', () => {
    it('should store external secret as AES-256-GCM envelope and decrypt on authorized demand', () => {
      const project = PlatformRepository.listProjects()[0]!;
      const env = PlatformRepository.listEnvironments(project.id)[0]!;

      const plaintext = 'sk_test_51M087TestStripeSecretToken991244';
      const credential = PlatformRepository.createCredential({
        name: 'Stripe Payment Gateway',
        provider: 'stripe',
        environmentId: env.id,
        projectId: project.id,
        plaintextSecret: plaintext,
        ownerEmail: 'finance@orbitox.io',
      });

      expect(credential.envelope).toBeDefined();
      expect(credential.envelope.encryptedCiphertext).toBeDefined();
      expect(credential.maskedDisplay.startsWith('sk_test_')).toBe(true);
      expect(credential.secretFingerprint.startsWith('SHA256: ')).toBe(true);

      // Decrypt
      const decrypted = PlatformRepository.decryptCredential(credential.id);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Domains & Quotas', () => {
    it('should register domains and record quota utilization', () => {
      const env = PlatformRepository.listEnvironments()[0]!;
      const domain = PlatformRepository.registerDomain({
        environmentId: env.id,
        domainName: 'custom.test-shop.com',
      });

      expect(domain.domainName).toBe('custom.test-shop.com');
      expect(domain.verificationStatus).toBe('VERIFIED');

      const initialQuota = PlatformRepository.getQuotaPolicy(env.id);
      const initialCalls = initialQuota?.monthlyCallsUsed || 0;

      PlatformRepository.recordCall(env.id);
      const updatedQuota = PlatformRepository.getQuotaPolicy(env.id);
      expect(updatedQuota?.monthlyCallsUsed).toBe(initialCalls + 1);
    });
  });
});

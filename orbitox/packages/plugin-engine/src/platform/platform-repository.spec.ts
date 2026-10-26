import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PlatformRepository } from './platform-repository';
import { PlatformKeyEngine } from '../security/platform-key-engine';

describe('PlatformRepository (Normalized Domain Access & Cryptographic Binding)', () => {
  let suiteTempDir: string;

  beforeAll(() => {
    suiteTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-repo-suite-'));
    PlatformRepository.setDataDir(suiteTempDir);
    PlatformRepository.setPersistenceEnabled(true);
    PlatformRepository.initialize();
  });

  afterAll(() => {
    PlatformRepository.resetForTesting();
    PlatformRepository.setDataDir('');
    try {
      fs.rmSync(suiteTempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup
    }
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

  describe('Durable File Persistence & Restart Survivability (P0.1)', () => {
    let tempDir: string;

    beforeAll(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-repo-test-'));
      PlatformRepository.setDataDir(tempDir);
      PlatformRepository.setPersistenceEnabled(true);
      PlatformRepository.initialize();
    });

    afterAll(() => {
      PlatformRepository.setDataDir(suiteTempDir);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    });

    it('should durably persist projects, credentials, domains, and quotas to disk and reload on restart', () => {
      // 1. Provision a durable test organization
      const testOrg = PlatformRepository.createOrganization({
        name: 'Durable Enterprise Corp',
        slug: 'durable-corp',
        billingTier: 'ENTERPRISE',
        ownerEmail: 'founder@durable.io',
      });
      expect(testOrg.id).toBeDefined();

      // 2. Provision a durable project with environments
      const { project, environments } = PlatformRepository.createProject({
        name: 'Durable POS Fleet',
        slug: 'durable-pos-fleet',
        organizationId: testOrg.id,
        businessModel: 'HOSPITALITY_POS',
        planTier: 'enterprise',
        technicalLead: 'Lead Architect',
        contactEmail: 'pos@durable.io',
        initialPackages: ['@orbitox/pos'],
      });
      expect(project.id).toBeDefined();
      const prodEnv = environments.find((e) => e.isProduction)!;

      // 3. Issue an API key
      const { keyRecord, rawSecret } = PlatformRepository.createApiKey({
        name: 'Durable Terminal Key',
        environmentId: prodEnv.id,
        projectId: project.id,
        capabilities: ['pos.orders.write', 'pos.orders.read'],
        createdBy: 'admin@durable.io',
      });
      expect(rawSecret).toBeDefined();

      // 4. Store an envelope credential
      const cred = PlatformRepository.createCredential({
        name: 'Durable Payment Gateway',
        provider: 'stripe',
        environmentId: prodEnv.id,
        projectId: project.id,
        plaintextSecret: 'sk_live_durable_token_xyz987',
        ownerEmail: 'finance@durable.io',
      });
      expect(cred.id).toBeDefined();

      // 5. Register a custom domain
      const domain = PlatformRepository.registerDomain({
        environmentId: prodEnv.id,
        domainName: 'terminal.durable.io',
      });
      expect(domain.domainName).toBe('terminal.durable.io');

      // 6. Update quota policy
      const initialQuota = PlatformRepository.getQuotaPolicy(prodEnv.id);
      expect(initialQuota).toBeDefined();
      PlatformRepository.recordCall(prodEnv.id);
      PlatformRepository.updateQuotaPolicy(prodEnv.id, { monthlyCallsLimit: 500000 });

      // 7. Flush immediately to disk
      PlatformRepository.saveImmediate();

      const storeFilePath = PlatformRepository.getFilePath();
      expect(fs.existsSync(storeFilePath)).toBe(true);
      const fileRaw = fs.readFileSync(storeFilePath, 'utf-8');
      const storeJson = JSON.parse(fileRaw);
      expect(storeJson.projects.some((p: any) => p.id === project.id)).toBe(true);

      // 8. Simulate process restart by resetting in-memory state
      PlatformRepository.resetForTesting();

      // 9. Re-initialize from persisted store on disk
      PlatformRepository.initialize();

      // 10. Verify everything was recovered faithfully
      const reloadedProject = PlatformRepository.getProject(project.id);
      expect(reloadedProject).toBeDefined();
      expect(reloadedProject?.name).toBe('Durable POS Fleet');

      const reloadedOrg = PlatformRepository.getOrganization(testOrg.id);
      expect(reloadedOrg).toBeDefined();
      expect(reloadedOrg?.slug).toBe('durable-corp');

      const reloadedKey = PlatformRepository.getApiKey(keyRecord.keyId);
      expect(reloadedKey).toBeDefined();
      expect(reloadedKey?.authVerifier).toBe(keyRecord.authVerifier);
      expect(reloadedKey?.capabilities).toContain('pos.orders.write');

      // Verify that findKeyByRawSecret still works with cryptographic constant-time comparison
      const validatedKey = PlatformRepository.findKeyByRawSecret(rawSecret);
      expect(validatedKey).toBeDefined();
      expect(validatedKey?.keyId).toBe(keyRecord.keyId);

      // Verify credential envelope decryption survives restart
      const decryptedSecret = PlatformRepository.decryptCredential(cred.id);
      expect(decryptedSecret).toBe('sk_live_durable_token_xyz987');

      // Verify custom domain and quotas survived
      const reloadedDomains = PlatformRepository.listDomains(prodEnv.id);
      expect(reloadedDomains.some((d) => d.domainName === 'terminal.durable.io')).toBe(true);

      const reloadedQuota = PlatformRepository.getQuotaPolicy(prodEnv.id);
      expect(reloadedQuota?.monthlyCallsLimit).toBe(500000);
      expect(reloadedQuota?.monthlyCallsUsed).toBeGreaterThanOrEqual(1);

      // 11. Test mutation durability: update organization and delete project
      PlatformRepository.updateOrganization(testOrg.id, { name: 'Durable Enterprise Corp (Updated)' });
      PlatformRepository.deleteProject(project.id);
      PlatformRepository.removeDomain('terminal.durable.io');
      PlatformRepository.saveImmediate();

      PlatformRepository.resetForTesting();
      PlatformRepository.initialize();

      expect(PlatformRepository.getProject(project.id)).toBeUndefined();
      expect(PlatformRepository.getOrganization(testOrg.id)?.name).toBe('Durable Enterprise Corp (Updated)');
      expect(PlatformRepository.listDomains(prodEnv.id).some((d) => d.domainName === 'terminal.durable.io')).toBe(false);
    });
  });
});

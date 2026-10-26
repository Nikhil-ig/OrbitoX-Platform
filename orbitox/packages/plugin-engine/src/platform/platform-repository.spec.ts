import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
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

    it('generates unique slugs for repeated names and rejects case-insensitive collisions', () => {
      const org = PlatformRepository.listOrganizations()[0]!;
      const name = `Repeated Project ${Date.now()}`;
      const projectInput = {
        name,
        organizationId: org.id,
        businessModel: 'B2B',
        planTier: 'starter',
        technicalLead: 'Test Lead',
        contactEmail: 'test@orbitox.io',
      };

      const first = PlatformRepository.createProject(projectInput).project;
      const second = PlatformRepository.createProject(projectInput).project;

      expect(second.slug).toBe(`${first.slug}-2`);
      expect(() => PlatformRepository.createProject({ ...projectInput, slug: first.slug.toUpperCase() }))
        .toThrow(`Project slug "${first.slug}" is already in use.`);
      expect(() => PlatformRepository.updateProject(first.id, { slug: 'changed-project-slug' }))
        .toThrow('Project slug is immutable after creation.');
    });

    it('resets monthly project usage explicitly at the repository boundary', () => {
      const org = PlatformRepository.listOrganizations()[0]!;
      const project = PlatformRepository.createProject({
        name: `Monthly Reset ${Date.now()}`,
        organizationId: org.id,
        businessModel: 'B2B',
        planTier: 'starter',
        technicalLead: 'Test Lead',
        contactEmail: 'reset@orbitox.io',
      }).project;
      PlatformRepository.updateProject(project.id, { monthlyApiCalls: 9 });

      expect(PlatformRepository.resetMonthlyProjectUsage()).toBeGreaterThan(0);
      expect(PlatformRepository.getProject(project.id)?.monthlyApiCalls).toBe(0);
    });

    it('repairs legacy duplicate slugs and updates their persisted key scopes on load', () => {
      const project = PlatformRepository.listProjects()[0]!;
      const environment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
      const key = PlatformRepository.createApiKey({
        name: 'Legacy Duplicate Scope Key',
        environmentId: environment.id,
        projectId: project.id,
        capabilities: ['crm:read'],
        tenantScope: [project.slug],
        createdBy: 'test-suite',
      });
      (PlatformRepository as any).projects.push({
        ...project,
        id: `legacy-duplicate-${Date.now()}`,
        name: 'Legacy Duplicate Project',
      });
      const duplicate = (PlatformRepository as any).projects.at(-1);
      (PlatformRepository as any).apiKeys.push({
        ...key.keyRecord,
        id: `legacy-key-${Date.now()}`,
        projectId: duplicate.id,
        tenantScope: [project.slug],
      });
      PlatformRepository.saveImmediate();
      PlatformRepository.resetForTesting();
      PlatformRepository.initialize();

      const repaired = PlatformRepository.getProject(duplicate.id)!;
      expect(repaired.slug).toBe(`${project.slug}-2`);
      expect(PlatformRepository.getProject(project.slug)?.id).toBe(project.id);
      expect(PlatformRepository.listApiKeys({ projectId: duplicate.id })[0]?.tenantScope).toEqual([repaired.slug]);
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

    it('persists rotation and revocation through repository reinitialization', () => {
      const project = PlatformRepository.listProjects()[0]!;
      const environment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
      const original = PlatformRepository.createApiKey({
        name: 'Restart Lifecycle Key',
        environmentId: environment.id,
        projectId: project.id,
        capabilities: ['crm:read'],
        createdBy: 'test-suite',
      });
      const rotated = PlatformRepository.rotateApiKey(original.keyRecord.keyId, {
        operatorEmail: 'test-suite',
      })!;
      PlatformRepository.saveImmediate();
      PlatformRepository.resetForTesting();
      PlatformRepository.initialize();

      expect(PlatformRepository.findKeyByRawSecret(original.rawSecret)?.status).toBe('SUSPENDED');
      expect(PlatformRepository.findKeyByRawSecret(rotated.replacementRawSecret)?.status).toBe('ACTIVE');

      PlatformRepository.setKeyStatus(rotated.replacementKey.keyId, 'REVOKED');
      PlatformRepository.saveImmediate();
      PlatformRepository.resetForTesting();
      PlatformRepository.initialize();

      expect(PlatformRepository.findKeyByRawSecret(rotated.replacementRawSecret)?.status).toBe('REVOKED');
      expect(PlatformRepository.findKeyByRawSecret(original.rawSecret)?.status).toBe('SUSPENDED');
    });

    it('flushes an immediate revocation on SIGTERM before the debounce fires', () => {
      const originalDataDir = suiteTempDir;
      const shutdownDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-shutdown-flush-'));
      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(shutdownDataDir);
      PlatformRepository.initialize();

      const organization = PlatformRepository.listOrganizations()[0]!;
      const project = PlatformRepository.createProject({
        name: `Immediate Shutdown Revocation ${Date.now()}`,
        organizationId: organization.id,
        businessModel: 'B2B',
        planTier: 'starter',
        technicalLead: 'Shutdown Test',
        contactEmail: 'shutdown@orbitox.io',
        enabledServices: ['crm'],
      }).project;
      const environment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
      const key = PlatformRepository.createApiKey({
        name: 'Immediate Shutdown Revocation Key',
        environmentId: environment.id,
        projectId: project.id,
        capabilities: ['crm:read'],
        createdBy: 'test-suite',
      });
      PlatformRepository.saveImmediate();
      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(originalDataDir);
      PlatformRepository.initialize();

      const childScript = `
        const { PlatformRepository } = require('./dist/platform/platform-repository.js');
        PlatformRepository.setDataDir(${JSON.stringify(shutdownDataDir)});
        PlatformRepository.initialize();
        const keepAlive = setInterval(() => {}, 1000);
        process.on('SIGTERM', () => {
          clearInterval(keepAlive);
          process.exit(0);
        });
        PlatformRepository.setKeyStatus(${JSON.stringify(key.keyRecord.id)}, 'REVOKED');
        process.kill(process.pid, 'SIGTERM');
      `;
      const result = spawnSync(process.execPath, ['-e', childScript], {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          ORBITOX_DATA_DIR: shutdownDataDir,
          ORBITOX_SERVER_PEPPER: 'shutdown-test-pepper-32-characters-minimum',
        },
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);

      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(shutdownDataDir);
      PlatformRepository.initialize();
      expect(PlatformRepository.getApiKey(key.keyRecord.id)?.status).toBe('REVOKED');
      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(originalDataDir);
      PlatformRepository.initialize();
      fs.rmSync(shutdownDataDir, { recursive: true, force: true });
    });

    it('preserves revocation across 20 immediate SIGKILL/restart cycles', () => {
      const crashDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-sigkill-revoke-'));
      const repositoryCwd = path.resolve(__dirname, '../..');
      const childEnv = { ...process.env, ORBITOX_DATA_DIR: crashDataDir, NODE_ENV: 'test' };
      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(crashDataDir);
      PlatformRepository.initialize();

      try {
        const project = PlatformRepository.listProjects()[0]!;
        const environment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
        for (let iteration = 0; iteration < 20; iteration++) {
          const key = PlatformRepository.createApiKey({
            name: `SIGKILL Revoke ${iteration}`,
            environmentId: environment.id,
            projectId: project.id,
            capabilities: ['crm:read'],
            createdBy: 'test-suite',
          });
          const script = `
            const { PlatformRepository } = require('./dist/platform/platform-repository.js');
            PlatformRepository.setDataDir(${JSON.stringify(crashDataDir)});
            PlatformRepository.initialize();
            PlatformRepository.setKeyStatus(${JSON.stringify(key.keyRecord.keyId)}, 'REVOKED');
            process.kill(process.pid, 'SIGKILL');
          `;
          const result = spawnSync(process.execPath, ['-e', script], {
            cwd: repositoryCwd,
            encoding: 'utf8',
            env: childEnv,
          });
          expect(result.signal).toBe('SIGKILL');

          PlatformRepository.resetForTesting();
          PlatformRepository.setDataDir(crashDataDir);
          PlatformRepository.initialize();
          expect(PlatformRepository.getApiKey(key.keyRecord.keyId)?.status).toBe('REVOKED');
        }
      } finally {
        PlatformRepository.resetForTesting();
        PlatformRepository.setDataDir(suiteTempDir);
        PlatformRepository.initialize();
        fs.rmSync(crashDataDir, { recursive: true, force: true });
      }
    }, 30000);

    it('preserves atomic zero-grace rotation across 20 immediate SIGKILL/restart cycles', () => {
      const crashDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-sigkill-rotate-'));
      const repositoryCwd = path.resolve(__dirname, '../..');
      const childEnv = { ...process.env, ORBITOX_DATA_DIR: crashDataDir, NODE_ENV: 'test' };
      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(crashDataDir);
      PlatformRepository.initialize();

      try {
        const project = PlatformRepository.listProjects()[0]!;
        const environment = PlatformRepository.listEnvironments(project.id).find((item) => item.isProduction)!;
        for (let iteration = 0; iteration < 20; iteration++) {
          const original = PlatformRepository.createApiKey({
            name: `SIGKILL Rotate ${iteration}`,
            environmentId: environment.id,
            projectId: project.id,
            capabilities: ['crm:read'],
            createdBy: 'test-suite',
          });
          const script = `
            const fs = require('fs');
            const { PlatformRepository } = require('./dist/platform/platform-repository.js');
            PlatformRepository.setDataDir(${JSON.stringify(crashDataDir)});
            PlatformRepository.initialize();
            const rotated = PlatformRepository.rotateApiKey(${JSON.stringify(original.keyRecord.keyId)}, {
              graceWindowDays: 0,
              operatorEmail: 'test-suite',
            });
            fs.writeSync(1, rotated.replacementKey.keyId + '\\n');
            process.kill(process.pid, 'SIGKILL');
          `;
          const result = spawnSync(process.execPath, ['-e', script], {
            cwd: repositoryCwd,
            encoding: 'utf8',
            env: childEnv,
          });
          expect(result.signal).toBe('SIGKILL');
          const replacementKeyId = result.stdout.trim();
          expect(replacementKeyId).toBeTruthy();

          PlatformRepository.resetForTesting();
          PlatformRepository.setDataDir(crashDataDir);
          PlatformRepository.initialize();
          expect(PlatformRepository.getApiKey(original.keyRecord.keyId)?.status).toBe('SUSPENDED');
          expect(PlatformRepository.getApiKey(replacementKeyId)?.status).toBe('ACTIVE');
        }
      } finally {
        PlatformRepository.resetForTesting();
        PlatformRepository.setDataDir(suiteTempDir);
        PlatformRepository.initialize();
        fs.rmSync(crashDataDir, { recursive: true, force: true });
      }
    }, 30000);

    it('preserves project suspension across 20 immediate SIGKILL/restart cycles', () => {
      const crashDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-sigkill-project-'));
      const repositoryCwd = path.resolve(__dirname, '../..');
      const childEnv = { ...process.env, ORBITOX_DATA_DIR: crashDataDir, NODE_ENV: 'test' };
      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(crashDataDir);
      PlatformRepository.initialize();

      try {
        const project = PlatformRepository.listProjects()[0]!;
        for (let iteration = 0; iteration < 20; iteration++) {
          PlatformRepository.updateProject(project.id, { status: 'ACTIVE' });
          const script = `
            const { PlatformRepository } = require('./dist/platform/platform-repository.js');
            PlatformRepository.setDataDir(${JSON.stringify(crashDataDir)});
            PlatformRepository.initialize();
            PlatformRepository.updateProject(${JSON.stringify(project.id)}, { status: 'SUSPENDED' });
            process.kill(process.pid, 'SIGKILL');
          `;
          const result = spawnSync(process.execPath, ['-e', script], {
            cwd: repositoryCwd,
            encoding: 'utf8',
            env: childEnv,
          });
          expect(result.signal).toBe('SIGKILL');

          PlatformRepository.resetForTesting();
          PlatformRepository.setDataDir(crashDataDir);
          PlatformRepository.initialize();
          expect(PlatformRepository.getProject(project.id)?.status).toBe('SUSPENDED');
        }
      } finally {
        PlatformRepository.resetForTesting();
        PlatformRepository.setDataDir(suiteTempDir);
        PlatformRepository.initialize();
        fs.rmSync(crashDataDir, { recursive: true, force: true });
      }
    }, 30000);

    it('recovers a missing or corrupt store from its previous good copy and fails if both copies are lost', () => {
      const recoveryDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitox-store-recovery-'));
      PlatformRepository.resetForTesting();
      PlatformRepository.setDataDir(recoveryDataDir);
      PlatformRepository.initialize();
      const project = PlatformRepository.listProjects()[0]!;
      const filePath = PlatformRepository.getFilePath();
      const backupPath = `${filePath}.bak`;

      try {
        PlatformRepository.updateProject(project.id, { status: 'SUSPENDED' });
        expect(fs.existsSync(backupPath)).toBe(true);
        fs.writeFileSync(filePath, '{corrupt', 'utf8');
        PlatformRepository.resetForTesting();
        PlatformRepository.setDataDir(recoveryDataDir);
        PlatformRepository.initialize();
        expect(PlatformRepository.getProject(project.id)?.status).toBe('ACTIVE');

        fs.unlinkSync(filePath);
        PlatformRepository.resetForTesting();
        PlatformRepository.setDataDir(recoveryDataDir);
        PlatformRepository.initialize();
        expect(PlatformRepository.getProject(project.id)?.status).toBe('ACTIVE');

        fs.unlinkSync(filePath);
        fs.unlinkSync(backupPath);
        PlatformRepository.resetForTesting();
        PlatformRepository.setDataDir(recoveryDataDir);
        expect(() => PlatformRepository.initialize()).toThrow(/missing and no previous good copy/);
      } finally {
        PlatformRepository.resetForTesting();
        PlatformRepository.setDataDir(suiteTempDir);
        PlatformRepository.initialize();
        fs.rmSync(recoveryDataDir, { recursive: true, force: true });
      }
    });
  });

  describe('Credential Vault & Envelope Encryption', () => {
    it('should store external secret as AES-256-GCM envelope and decrypt on authorized demand', () => {
      const project = PlatformRepository.listProjects()[0]!;
      const env = PlatformRepository.listEnvironments(project.id)[0]!;

      const plaintext = 'sk_test_mock_key_9912';
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

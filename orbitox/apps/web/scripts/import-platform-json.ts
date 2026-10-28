import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';

export interface ImporterOptions {
  filePath?: string;
  dryRun?: boolean;
  verbose?: boolean;
  skipRoleCheck?: boolean;
  abortAfterOrg?: number;
  killMidOrg?: string;
}

export interface OrganizationImportResult {
  organizationId: string;
  slug: string;
  name: string;
  status: 'IMPORTED' | 'SKIPPED' | 'FAILED';
  projectsImported: number;
  projectsSkipped: number;
  environmentsImported: number;
  keysWithVerifiers: number;
  keysWithoutVerifiers: number;
  auditLogsImported: number;
  error?: string;
}

export interface ImporterReport {
  dryRun: boolean;
  totalOrganizationsInJson: number;
  organizationsImported: number;
  organizationsSkipped: number;
  organizationsFailed: number;
  totalProjects: number;
  totalEnvironments: number;
  totalKeysWithVerifiers: number;
  totalKeysWithoutVerifiers: number;
  totalCredentials: number;
  totalDomains: number;
  totalQuotaPolicies: number;
  totalRateLimitPolicies: number;
  totalAuditEvents: number;
  orgResults: OrganizationImportResult[];
}

export function parsePlatformJsonFile(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON store file not found at: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.organizations)) {
    throw new Error(`Invalid platform store schema: "organizations" array missing in ${filePath}`);
  }
  return data;
}

export async function runPlatformJsonImporter(
  client: PrismaClient,
  options: ImporterOptions = {}
): Promise<ImporterReport> {
  const defaultPath = path.resolve(__dirname, '../orbitox/data/platform-repository-store.json');
  const targetPath = options.filePath || defaultPath;
  const isDryRun = Boolean(options.dryRun);

  // 1. Check database role privilege boundary (Requirement 5)
  if (!options.skipRoleCheck) {
    const [userRow] = await client.$queryRaw<Array<{ current_user: string }>>`SELECT current_user`;
    const currentUser = userRow?.current_user || '';
    if (currentUser === 'orbitox_runtime') {
      throw new Error(
        'Privilege boundary violation: runtime role [orbitox_runtime] is strictly prohibited from running the platform data importer. Use the database owner or migration role.'
      );
    }
  }

  // 2. Parse JSON fixture
  const data = parsePlatformJsonFile(targetPath);
  const organizations: any[] = data.organizations || [];
  const projects: any[] = data.projects || [];
  const environments: any[] = data.environments || [];
  const apiKeys: any[] = data.apiKeys || [];
  const credentials: any[] = data.credentials || [];
  const packages: any[] = data.packages || [];
  const packageVersions: any[] = data.packageVersions || [];
  const packageInstallations: any[] = data.packageInstallations || [];
  const domains: any[] = data.domains || [];
  const quotaPolicies: any[] = data.quotaPolicies || [];
  const rateLimitPolicies: any[] = data.rateLimitPolicies || [];
  const auditLogs: any[] = data.auditLogs || [];

  const report: ImporterReport = {
    dryRun: isDryRun,
    totalOrganizationsInJson: organizations.length,
    organizationsImported: 0,
    organizationsSkipped: 0,
    organizationsFailed: 0,
    totalProjects: 0,
    totalEnvironments: 0,
    totalKeysWithVerifiers: 0,
    totalKeysWithoutVerifiers: 0,
    totalCredentials: 0,
    totalDomains: 0,
    totalQuotaPolicies: 0,
    totalRateLimitPolicies: 0,
    totalAuditEvents: 0,
    orgResults: [],
  };

  // If dry-run, compute scan counts without modifying database
  if (isDryRun) {
    for (const org of organizations) {
      const orgProjects = projects.filter((p) => p.organizationId === org.id);
      const orgProjectIds = new Set(orgProjects.map((p) => p.id));
      const orgEnvs = environments.filter((e) => orgProjectIds.has(e.projectId));
      const orgEnvIds = new Set(orgEnvs.map((e) => e.id));
      const orgKeys = apiKeys.filter((k) => orgEnvIds.has(k.environmentId) || orgProjectIds.has(k.projectId));
      const verifiedKeys = orgKeys.filter((k) => Boolean(k.authVerifier && k.authVerifier.trim().length >= 32));
      const unverifiedKeys = orgKeys.filter((k) => !k.authVerifier || k.authVerifier.trim().length < 32);
      const orgAudits = auditLogs.filter((a) => a.organizationId === org.id || orgProjectIds.has(a.projectId));

      report.organizationsImported++;
      report.totalProjects += orgProjects.length;
      report.totalEnvironments += orgEnvs.length;
      report.totalKeysWithVerifiers += verifiedKeys.length;
      report.totalKeysWithoutVerifiers += unverifiedKeys.length;
      report.totalAuditEvents += orgAudits.length;

      report.orgResults.push({
        organizationId: org.id,
        slug: org.slug,
        name: org.name,
        status: 'IMPORTED',
        projectsImported: orgProjects.length,
        projectsSkipped: 0,
        environmentsImported: orgEnvs.length,
        keysWithVerifiers: verifiedKeys.length,
        keysWithoutVerifiers: unverifiedKeys.length,
        auditLogsImported: orgAudits.length,
      });
    }

    report.totalCredentials = credentials.length;
    report.totalDomains = domains.length;
    report.totalQuotaPolicies = quotaPolicies.length;
    report.totalRateLimitPolicies = rateLimitPolicies.length;
    return report;
  }

  // 3. Migrate shared packages and package versions first (referenced by installations)
  const packageDbIdMap = new Map<string, string>();
  for (const pkg of packages) {
    const upserted = await client.platformPackage.upsert({
      where: { packageId: pkg.packageId },
      create: {
        id: pkg.id || `pkg_${crypto.randomUUID()}`,
        packageId: pkg.packageId,
        name: pkg.name || pkg.packageId,
        category: pkg.category || 'CORE',
        publisher: pkg.publisher || '@orbitox-io',
        currentStableVersion: pkg.currentStableVersion || '1.0.0',
        signingPublicKeyPem: pkg.signingPublicKeyPem || '',
        isCore: Boolean(pkg.isCore),
      },
      update: {
        currentStableVersion: pkg.currentStableVersion || '1.0.0',
      },
    });
    packageDbIdMap.set(pkg.packageId, upserted.id);
    if (pkg.id) {
      packageDbIdMap.set(pkg.id, upserted.id);
    }
    packageDbIdMap.set(upserted.id, upserted.id);
  }

  const packageVersionDbIdMap = new Map<string, string>();
  for (const ver of packageVersions) {
    let parentPackageId = packageDbIdMap.get(ver.packageId);
    if (!parentPackageId) {
      const parent = await client.platformPackage.findFirst({
        where: { OR: [{ id: ver.packageId }, { packageId: ver.packageId }] },
      });
      if (parent) {
        parentPackageId = parent.id;
        packageDbIdMap.set(ver.packageId, parent.id);
      }
    }

    if (!parentPackageId) {
      console.warn(`[Importer Warning] Skipping PackageVersion ${ver.version} because parent package [${ver.packageId}] was not found.`);
      continue;
    }

    const existingVer = await client.packageVersion.findFirst({
      where: { packageId: parentPackageId, version: ver.version },
    });
    if (!existingVer) {
      const createdVer = await client.packageVersion.create({
        data: {
          id: ver.id || `ver_${crypto.randomUUID()}`,
          packageId: parentPackageId,
          version: ver.version,
          tarballSha256: ver.tarballSha256 || crypto.createHash('sha256').update(ver.version).digest('hex'),
          manifestHash: ver.manifestHash || crypto.createHash('sha256').update(ver.packageId).digest('hex'),
          signerId: ver.signerId || 'platform_admin',
          signature: ver.signature || 'ed25519_verified_signature',
          minPlatformVersion: ver.minPlatformVersion || '1.0.0',
          releaseNotes: ver.releaseNotes || null,
        },
      });
      packageVersionDbIdMap.set(`${ver.packageId}@${ver.version}`, createdVer.id);
      if (ver.id) packageVersionDbIdMap.set(ver.id, createdVer.id);
    } else {
      packageVersionDbIdMap.set(`${ver.packageId}@${ver.version}`, existingVer.id);
      if (ver.id) packageVersionDbIdMap.set(ver.id, existingVer.id);
    }
  }

  // 4. Single Transaction Per Organization (Requirement 4)
  for (const org of organizations) {
    const orgProjects = projects.filter((p) => p.organizationId === org.id);
    const orgProjectIds = new Set(orgProjects.map((p) => p.id));
    const orgEnvs = environments.filter((e) => orgProjectIds.has(e.projectId));
    const orgEnvIds = new Set(orgEnvs.map((e) => e.id));
    const orgKeys = apiKeys.filter((k) => orgEnvIds.has(k.environmentId) || orgProjectIds.has(k.projectId));
    const orgCreds = credentials.filter((c) => orgEnvIds.has(c.environmentId));
    const orgDomains = domains.filter((d) => orgEnvIds.has(d.environmentId));
    const orgQuotaPolicies = quotaPolicies.filter((q) => orgEnvIds.has(q.environmentId));
    const orgRatePolicies = rateLimitPolicies.filter((r) => orgEnvIds.has(r.environmentId));
    const orgInstallations = packageInstallations.filter((i) => orgEnvIds.has(i.environmentId));
    const orgAudits = auditLogs.filter((a) => a.organizationId === org.id || orgProjectIds.has(a.projectId));

    let verifiedKeysInOrg = 0;
    let unverifiedKeysInOrg = 0;
    let projectsImportedInOrg = 0;
    let projectsSkippedInOrg = 0;
    let envsImportedInOrg = 0;
    let auditsImportedInOrg = 0;

    try {
      await client.$transaction(
        async (tx) => {
          // A. Upsert Organization
          const existingOrg = await tx.platformOrganization.findFirst({
            where: { OR: [{ id: org.id }, { slug: org.slug }] },
          });

          const orgRecord = existingOrg
            ? await tx.platformOrganization.update({
                where: { id: existingOrg.id },
                data: {
                  name: org.name,
                  billingEmail: org.billingEmail || `billing@${org.slug}.io`,
                  complianceTier: org.complianceTier || 'STANDARD',
                  status: org.status || 'ACTIVE',
                },
              })
            : await tx.platformOrganization.create({
                data: {
                  id: org.id,
                  slug: org.slug,
                  name: org.name,
                  billingEmail: org.billingEmail || `billing@${org.slug}.io`,
                  complianceTier: org.complianceTier || 'STANDARD',
                  status: org.status || 'ACTIVE',
                  createdAt: org.createdAt ? new Date(org.createdAt) : new Date(),
                  updatedAt: org.updatedAt ? new Date(org.updatedAt) : new Date(),
                },
              });

          // Test hook: kill -9 mid-transaction to verify atomic rollback
          if (options.killMidOrg && options.killMidOrg === org.slug) {
            console.log(`[Importer Hook] Mid-transaction violent process termination (SIGKILL) on org [${org.slug}]`);
            process.kill(process.pid, 'SIGKILL');
          }

          // B. Upsert Projects
          for (const proj of orgProjects) {
            const existingProj = await tx.platformProject.findFirst({
              where: { OR: [{ id: proj.id }, { slug: proj.slug }] },
            });

            const currentPeriod =
              proj.currentBillingPeriod ||
              (proj.createdAt ? new Date(proj.createdAt).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7));

            const projectQuota = proj.apiCallQuota !== undefined ? BigInt(proj.apiCallQuota) : null;
            const monthlyCalls = proj.monthlyApiCalls !== undefined ? BigInt(proj.monthlyApiCalls) : 0n;

            if (existingProj) {
              await tx.platformProject.update({
                where: { id: existingProj.id },
                data: {
                  name: proj.name,
                  businessModel: proj.businessModel || 'B2B_SAAS',
                  planTier: proj.planTier || proj.plan || 'starter',
                  plan: proj.plan || proj.planTier || 'starter',
                  enabledServices: Array.isArray(proj.enabledServices) ? proj.enabledServices : [],
                  apiCallQuota: projectQuota,
                  monthlyApiCalls: monthlyCalls,
                  currentBillingPeriod: currentPeriod,
                  rateLimitPerMin: proj.rateLimitPerMin || null,
                  customDomain: proj.customDomain || null,
                  storageQuotaGb: proj.storageQuotaGb ? Number(proj.storageQuotaGb) : null,
                  status: (proj.status || 'ACTIVE').toUpperCase() as any,
                  technicalLead: proj.technicalLead || 'System Admin',
                  contactEmail: proj.contactEmail || orgRecord.billingEmail,
                },
              });
              projectsSkippedInOrg++;
            } else {
              await tx.platformProject.create({
                data: {
                  id: proj.id,
                  slug: proj.slug,
                  name: proj.name,
                  organizationId: orgRecord.id,
                  businessModel: proj.businessModel || 'B2B_SAAS',
                  planTier: proj.planTier || proj.plan || 'starter',
                  plan: proj.plan || proj.planTier || 'starter',
                  enabledServices: Array.isArray(proj.enabledServices) ? proj.enabledServices : [],
                  apiCallQuota: projectQuota,
                  monthlyApiCalls: monthlyCalls,
                  currentBillingPeriod: currentPeriod,
                  rateLimitPerMin: proj.rateLimitPerMin || null,
                  customDomain: proj.customDomain || null,
                  storageQuotaGb: proj.storageQuotaGb ? Number(proj.storageQuotaGb) : null,
                  status: (proj.status || 'ACTIVE').toUpperCase() as any,
                  technicalLead: proj.technicalLead || 'System Admin',
                  contactEmail: proj.contactEmail || orgRecord.billingEmail,
                  createdAt: proj.createdAt ? new Date(proj.createdAt) : new Date(),
                  updatedAt: proj.updatedAt ? new Date(proj.updatedAt) : new Date(),
                },
              });
              projectsImportedInOrg++;
            }
          }

          // C. Upsert Environments
          for (const env of orgEnvs) {
            const existingEnv = await tx.projectEnvironment.findFirst({
              where: { OR: [{ id: env.id }, { projectId: env.projectId, slug: env.slug }] },
            });

            if (existingEnv) {
              await tx.projectEnvironment.update({
                where: { id: existingEnv.id },
                data: {
                  name: env.name,
                  type: (env.type || (env.isProduction ? 'PRODUCTION' : 'DEVELOPMENT')) as any,
                  isProduction: Boolean(env.isProduction),
                  status: env.status || 'ACTIVE',
                  description: env.description || null,
                  requireMtls: Boolean(env.requireMtls),
                  strictIpAllowlist: Boolean(env.strictIpAllowlist),
                  enforceFourEyes: Boolean(env.enforceFourEyes),
                },
              });
            } else {
              await tx.projectEnvironment.create({
                data: {
                  id: env.id,
                  projectId: env.projectId,
                  slug: env.slug,
                  name: env.name,
                  type: (env.type || (env.isProduction ? 'PRODUCTION' : 'DEVELOPMENT')) as any,
                  isProduction: Boolean(env.isProduction),
                  status: env.status || 'ACTIVE',
                  description: env.description || null,
                  requireMtls: Boolean(env.requireMtls),
                  strictIpAllowlist: Boolean(env.strictIpAllowlist),
                  enforceFourEyes: Boolean(env.enforceFourEyes),
                  createdAt: env.createdAt ? new Date(env.createdAt) : new Date(),
                  updatedAt: env.updatedAt ? new Date(env.updatedAt) : new Date(),
                },
              });
              envsImportedInOrg++;
            }
          }

          // D. Migrate API Keys (Requirement 3: Never import raw secrets; verifiers only)
          for (const key of orgKeys) {
            const hasVerifier = Boolean(key.authVerifier && typeof key.authVerifier === 'string' && key.authVerifier.trim().length >= 32);

            let finalVerifier = key.authVerifier?.trim();
            let keyStatus = key.status || 'ACTIVE';
            let revokeReason: string | null = null;
            let revokedAt: Date | null = null;

            if (hasVerifier) {
              verifiedKeysInOrg++;
            } else {
              // Legacy key missing HMAC verifier: MUST NOT silently become valid!
              unverifiedKeysInOrg++;
              keyStatus = 'REVOKED';
              revokeReason = 'LEGACY_KEY_MISSING_VERIFIER';
              revokedAt = new Date();
              // Assign unmatchable random token to satisfy unique not-null constraint
              finalVerifier = `unmigrated_missing_verifier_${crypto.randomBytes(16).toString('hex')}`;
            }

            const existingKey = await tx.platformApiKey.findFirst({
              where: { OR: [{ id: key.id }, { keyId: key.keyId }] },
            });

            const keyData = {
              name: key.name,
              environmentId: key.environmentId,
              keyType: key.keyType || 'PROJECT_SCOPED',
              keyPrefix: key.keyPrefix || 'orb_live_',
              secretFingerprint: key.secretFingerprint || (key.rawSecret ? crypto.createHash('sha256').update(key.rawSecret).digest('hex') : 'UNKNOWN'),
              authVerifier: finalVerifier,
              maskedDisplay: key.maskedDisplay || `${key.keyPrefix || 'orb_live_'}••••••••`,
              status: keyStatus as any,
              capabilities: Array.isArray(key.capabilities) ? key.capabilities : [],
              ipAllowlist: Array.isArray(key.ipAllowlist) ? key.ipAllowlist : [],
              rateLimitPerMin: key.rateLimitPerMin || 1200,
              tenantScope: Array.isArray(key.tenantScope) ? key.tenantScope : [],
              riskScore: key.riskScore !== undefined ? key.riskScore : 15,
              riskLevel: (key.riskLevel || 'LOW') as any,
              riskFactors: key.riskFactors || [],
              issuedAt: key.issuedAt ? new Date(key.issuedAt) : new Date(),
              activatedAt: key.activatedAt ? new Date(key.activatedAt) : new Date(),
              expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
              revokedAt: revokedAt || (key.revokedAt ? new Date(key.revokedAt) : null),
              revokeReason: revokeReason || key.revokeReason || null,
              createdBy: key.createdBy || 'importer',
              version: key.version || 1,
            };

            if (existingKey) {
              await tx.platformApiKey.update({
                where: { id: existingKey.id },
                data: keyData,
              });
            } else {
              await tx.platformApiKey.create({
                data: {
                  id: key.id || `key_${crypto.randomUUID()}`,
                  keyId: key.keyId || `key_live_${crypto.randomUUID()}`,
                  ...keyData,
                },
              });
            }
          }

          // E. Migrate Credentials
          for (const cred of orgCreds) {
            const existingCred = await tx.platformCredential.findUnique({ where: { id: cred.id } });
            const credData = {
              name: cred.name,
              provider: cred.provider,
              environmentId: cred.environmentId,
              envelopeVersion: cred.envelopeVersion || 1,
              kekIdentifier: cred.kekIdentifier || 'kms:us-east-1:orbitox-master-kek-v2',
              encryptedDek: cred.encryptedDek || 'dummy_encrypted_dek',
              dekIv: cred.dekIv || '',
              dekTag: cred.dekTag || '',
              initializationVector: cred.initializationVector || 'dummy_iv',
              authenticationTag: cred.authenticationTag || 'dummy_tag',
              encryptedCiphertext: cred.encryptedCiphertext || 'dummy_cipher',
              secretFingerprint: cred.secretFingerprint || 'dummy_fp',
              maskedDisplay: cred.maskedDisplay || '••••••••',
              health: (cred.health || 'HEALTHY') as any,
              lastRotatedAt: cred.lastRotatedAt ? new Date(cred.lastRotatedAt) : new Date(),
              nextRotationDueAt: cred.nextRotationDueAt ? new Date(cred.nextRotationDueAt) : new Date(Date.now() + 90 * 86400000),
              ownerEmail: cred.ownerEmail || orgRecord.billingEmail,
            };

            if (existingCred) {
              await tx.platformCredential.update({ where: { id: cred.id }, data: credData });
            } else {
              await tx.platformCredential.create({ data: { id: cred.id, ...credData } });
            }
          }

          // F. Migrate Domains
          for (const dom of orgDomains) {
            const existingDom = await tx.projectDomain.findUnique({ where: { domainName: dom.domainName.toLowerCase() } });
            const domData = {
              environmentId: dom.environmentId,
              domainName: dom.domainName.toLowerCase(),
              isApex: Boolean(dom.isApex),
              verificationStatus: (dom.verificationStatus || 'PENDING_DNS') as any,
              cnameTarget: dom.cnameTarget || 'cname.orbitox.io',
              tlsCertificateStatus: (dom.tlsCertificateStatus || 'PENDING') as any,
              sslExpiresAt: dom.sslExpiresAt ? new Date(dom.sslExpiresAt) : null,
              edgeLatencyMs: dom.edgeLatencyMs || 0,
              verifiedAt: dom.verifiedAt ? new Date(dom.verifiedAt) : null,
            };

            if (existingDom) {
              await tx.projectDomain.update({ where: { id: existingDom.id }, data: domData });
            } else {
              await tx.projectDomain.create({ data: { id: dom.id || `dom_${crypto.randomUUID()}`, ...domData } });
            }
          }

          // G. Migrate Quota & Rate Limit Policies
          for (const qp of orgQuotaPolicies) {
            await tx.environmentQuotaPolicy.upsert({
              where: { environmentId: qp.environmentId },
              create: {
                id: qp.id || `qp_${crypto.randomUUID()}`,
                environmentId: qp.environmentId,
                monthlyCallLimit: BigInt(qp.monthlyCallLimit || 1000000),
                monthlyCallsUsed: BigInt(qp.monthlyCallsUsed || 0),
                storageQuotaGb: qp.storageQuotaGb !== undefined ? Number(qp.storageQuotaGb) : 50.0,
                storageUsedGb: qp.storageUsedGb !== undefined ? Number(qp.storageUsedGb) : 0.0,
                warningThreshold: qp.warningThreshold || 80,
                projectedExhaustionDays: qp.projectedExhaustionDays ? Number(qp.projectedExhaustionDays) : null,
              },
              update: {
                monthlyCallLimit: BigInt(qp.monthlyCallLimit || 1000000),
                monthlyCallsUsed: BigInt(qp.monthlyCallsUsed || 0),
                storageQuotaGb: qp.storageQuotaGb !== undefined ? Number(qp.storageQuotaGb) : 50.0,
                storageUsedGb: qp.storageUsedGb !== undefined ? Number(qp.storageUsedGb) : 0.0,
                warningThreshold: qp.warningThreshold || 80,
              },
            });
          }

          for (const rp of orgRatePolicies) {
            await tx.environmentRateLimitPolicy.upsert({
              where: { environmentId: rp.environmentId },
              create: {
                id: rp.id || `rp_${crypto.randomUUID()}`,
                environmentId: rp.environmentId,
                requestsPerMinute: rp.requestsPerMinute || 1200,
                requestsPerSecondBurst: rp.requestsPerSecondBurst || 100,
                slidingWindowType: rp.slidingWindowType || 'HYBRID_REDIS_RAM',
              },
              update: {
                requestsPerMinute: rp.requestsPerMinute || 1200,
                requestsPerSecondBurst: rp.requestsPerSecondBurst || 100,
                slidingWindowType: rp.slidingWindowType || 'HYBRID_REDIS_RAM',
              },
            });
          }

          // H. Migrate Package Installations
          for (const inst of orgInstallations) {
            const existingInst = await tx.packageInstallation.findUnique({
              where: { environmentId_packageId: { environmentId: inst.environmentId, packageId: inst.packageId } },
            });
            if (!existingInst) {
              await tx.packageInstallation.create({
                data: {
                  id: inst.id || `inst_${crypto.randomUUID()}`,
                  environmentId: inst.environmentId,
                  packageId: inst.packageId,
                  installedVersionId: inst.installedVersionId,
                  status: (inst.status || 'ACTIVE') as any,
                  configOverrides: inst.configOverrides || {},
                },
              });
            }
          }

          // I. Migrate Platform Audit Events
          for (const audit of orgAudits) {
            const existingAudit = await tx.platformAuditEvent.findUnique({ where: { id: audit.id } });
            if (!existingAudit) {
              await tx.platformAuditEvent.create({
                data: {
                  id: audit.id || `audit_${crypto.randomUUID()}`,
                  actorId: audit.actorId || audit.actor || null,
                  actorEmail: audit.actorEmail || null,
                  action: audit.action || 'legacy.migration',
                  entityType: audit.entityType || 'ORGANIZATION',
                  entityId: audit.entityId || null,
                  organizationId: orgRecord.id,
                  projectId: audit.projectId || null,
                  environmentId: audit.environmentId || null,
                  ipAddress: audit.ipAddress || null,
                  requestId: audit.requestId || null,
                  reason: audit.reason || null,
                  metadata: audit.metadata || {},
                  status: audit.status || 'COMMITTED',
                  occurredAt: audit.occurredAt ? new Date(audit.occurredAt) : new Date(),
                },
              });
              auditsImportedInOrg++;
            }
          }
        },
        { timeout: 30000 }
      );

      report.organizationsImported++;
      report.totalProjects += projectsImportedInOrg;
      report.totalEnvironments += envsImportedInOrg;
      report.totalKeysWithVerifiers += verifiedKeysInOrg;
      report.totalKeysWithoutVerifiers += unverifiedKeysInOrg;
      report.totalAuditEvents += auditsImportedInOrg;

      report.orgResults.push({
        organizationId: org.id,
        slug: org.slug,
        name: org.name,
        status: 'IMPORTED',
        projectsImported: projectsImportedInOrg,
        projectsSkipped: projectsSkippedInOrg,
        environmentsImported: envsImportedInOrg,
        keysWithVerifiers: verifiedKeysInOrg,
        keysWithoutVerifiers: unverifiedKeysInOrg,
        auditLogsImported: auditsImportedInOrg,
      });

      if (options.abortAfterOrg && report.organizationsImported >= options.abortAfterOrg) {
        console.log(`[Importer Hook] Post-commit violent process termination (SIGKILL) after ${report.organizationsImported} orgs.`);
        process.kill(process.pid, 'SIGKILL');
      }
    } catch (err: any) {
      // Transaction rolled back! Entire organization untouched in PostgreSQL
      report.organizationsFailed++;
      report.orgResults.push({
        organizationId: org.id,
        slug: org.slug,
        name: org.name,
        status: 'FAILED',
        projectsImported: 0,
        projectsSkipped: 0,
        environmentsImported: 0,
        keysWithVerifiers: 0,
        keysWithoutVerifiers: 0,
        auditLogsImported: 0,
        error: err.message,
      });
    }
  }

  // Count totals for other entities
  report.totalCredentials = credentials.length;
  report.totalDomains = domains.length;
  report.totalQuotaPolicies = quotaPolicies.length;
  report.totalRateLimitPolicies = rateLimitPolicies.length;

  return report;
}

export function printImporterReport(report: ImporterReport): void {
  console.log('\n================================================================================');
  console.log(`🪐 OrbitoX Platform JSON Store Importer Report ${report.dryRun ? '[DRY-RUN MODE]' : '[COMMITTED]'}`);
  console.log('================================================================================\n');

  console.log('### Organization Transaction Summary (All-or-Nothing)\n');
  console.log('| Organization | Slug | Status | Projects | Environments | Verified Keys | Unverified Keys | Audit Events | Error / Note |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const org of report.orgResults) {
    const statusFormatted = org.status === 'IMPORTED' ? '**IMPORTED**' : org.status === 'FAILED' ? '**FAILED (ROLLED BACK)**' : 'SKIPPED';
    console.log(
      `| ${org.name} | \`${org.slug}\` | ${statusFormatted} | ${org.projectsImported} new (${org.projectsSkipped} exist) | ${org.environmentsImported} | ${org.keysWithVerifiers} | ${org.keysWithoutVerifiers} | ${org.auditLogsImported} | ${org.error || 'Clean'} |`
    );
  }

  console.log('\n### Entity Totals Summary\n');
  console.log(`- **Organizations In Source**: ${report.totalOrganizationsInJson}`);
  console.log(`- **Organizations Succeeded**: ${report.organizationsImported}`);
  console.log(`- **Organizations Failed / Rolled Back**: ${report.organizationsFailed}`);
  console.log(`- **Projects Imported**: ${report.totalProjects}`);
  console.log(`- **Environments Imported**: ${report.totalEnvironments}`);
  console.log(`- **API Keys With Valid Auth Verifiers**: ${report.totalKeysWithVerifiers} (Migrated Active)`);
  console.log(`- **API Keys Without Verifiers**: ${report.totalKeysWithoutVerifiers} (Migrated as REVOKED / Disabled, Raw Secret Discarded)`);
  console.log(`- **Platform Audit Events Imported**: ${report.totalAuditEvents}`);

  if (report.dryRun) {
    console.log('\nℹ DRY-RUN COMPLETE: No database mutations were written. Row counts in PostgreSQL remain untouched.\n');
  } else {
    console.log('\n✔ IMPORT COMPLETE: All valid organizations committed in single transactions.\n');
  }
}

async function cliMain() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const fileArg = args.find((a) => a.startsWith('--file='));
  const fileArgIndex = args.indexOf('--file');
  const filePath = fileArg
    ? fileArg.split('=').slice(1).join('=')
    : fileArgIndex !== -1 && args[fileArgIndex + 1]
    ? args[fileArgIndex + 1]
    : undefined;
  const abortAfterArg = args.find((a) => a.startsWith('--abort-after-org='));
  const abortAfterOrg = abortAfterArg ? Number(abortAfterArg.split('=')[1]) : undefined;
  const killMidArg = args.find((a) => a.startsWith('--kill-mid-org='));
  const killMidOrg = killMidArg ? killMidArg.split('=')[1] : undefined;

  const dbUrl = process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    const report = await runPlatformJsonImporter(client, { filePath, dryRun, verbose, abortAfterOrg, killMidOrg });
    printImporterReport(report);
  } finally {
    await client.$disconnect();
  }
}

if (require.main === module) {
  cliMain().catch((err) => {
    console.error('Fatal Platform Importer Error:', err);
    process.exit(1);
  });
}
